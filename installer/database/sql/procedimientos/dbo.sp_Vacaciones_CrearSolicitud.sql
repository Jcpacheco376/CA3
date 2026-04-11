-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Vacaciones_CrearSolicitud]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.6.12
-- Compilado:           07/04/2026, 11:26:15
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO
CREATE OR ALTER PROCEDURE sp_Vacaciones_CrearSolicitud
    @EmpleadoId          INT,
    @FechaInicio         DATE,
    @FechaFin            DATE,
    @Comentarios         NVARCHAR(MAX),
    @UsuarioSolicitanteId INT
AS
BEGIN
    SET NOCOUNT ON;
    -- ── 0. Validaciones de Reglas de Negocio ──────────────────────────────────
    
    -- A. No se permiten vacaciones retroactivas (desde ayer hacia atrás)
    IF @FechaInicio < CAST(GETDATE() AS DATE)
    BEGIN
        RAISERROR('No se pueden solicitar vacaciones con fecha anterior a hoy.', 16, 1);
        RETURN;
    END
    -- B. No se permiten traslapes con otras solicitudes vigentes (Pendientes o Aprobadas)
    IF EXISTS (
        SELECT 1 FROM SolicitudesVacaciones 
        WHERE EmpleadoId = @EmpleadoId 
          AND Estatus IN ('Pendiente', 'Aprobado', 'PendienteHorario')
          AND (
            (@FechaInicio BETWEEN FechaInicio AND FechaFin) OR
            (@FechaFin BETWEEN FechaInicio AND FechaFin) OR
            (FechaInicio BETWEEN @FechaInicio AND @FechaFin)
          )
    )
    BEGIN
        RAISERROR('El periodo seleccionado coincide con otra solicitud de vacaciones activa para este empleado.', 16, 1);
        RETURN;
    END
    -- ── 1. Verificar saldo disponible ─────────────────────────────────────────
    DECLARE @DiasRestantes DECIMAL(10,2);
    SELECT @DiasRestantes = SUM(ISNULL(DiasOtorgados, 0) - ISNULL(DiasDisfrutados, 0))
    FROM VacacionesSaldos
    WHERE EmpleadoId = @EmpleadoId;
    -- ── 2. Calcular días usando la función fuente de verdad ───────────────────
    DECLARE @DiasNaturales    INT = DATEDIFF(DAY, @FechaInicio, @FechaFin) + 1;
    DECLARE @DiasDescanso     INT;
    DECLARE @DiasFeriados     INT;
    DECLARE @DiasSinHorario   INT;
    DECLARE @DiasSolicitados  INT;
    SELECT
        @DiasSolicitados = SUM(CASE WHEN TipoDia = 'LABORAL'      THEN 1 ELSE 0 END),
        @DiasDescanso    = SUM(CASE WHEN TipoDia = 'DESCANSO'     THEN 1 ELSE 0 END),
        @DiasFeriados    = SUM(CASE WHEN TipoDia = 'FERIADO'      THEN 1 ELSE 0 END),
        @DiasSinHorario  = SUM(CASE WHEN TipoDia = 'SIN_HORARIO'  THEN 1 ELSE 0 END)
    FROM dbo.fn_Empleados_GetCalendarioDias(@EmpleadoId, @FechaInicio, @FechaFin);
    -- Defaults seguros
    SET @DiasSolicitados = ISNULL(@DiasSolicitados, 0);
    SET @DiasDescanso    = ISNULL(@DiasDescanso, 0);
    SET @DiasFeriados    = ISNULL(@DiasFeriados, 0);
    SET @DiasSinHorario  = ISNULL(@DiasSinHorario, 0);
    -- ── 3. Determinar estatus inicial ─────────────────────────────────────────
    DECLARE @EstatusInicial VARCHAR(20);
    IF @DiasSinHorario > 0
        SET @EstatusInicial = 'PendienteHorario';
    ELSE
        SET @EstatusInicial = 'Pendiente';
    -- ── 4. Validar saldo (solo si hay horario completo) ───────────────────────
    IF @EstatusInicial = 'Pendiente'
    BEGIN
        IF @DiasRestantes IS NULL OR @DiasRestantes < @DiasSolicitados
        BEGIN
            DECLARE @ErrMsg VARCHAR(500) =
                'El empleado no tiene suficientes dias de vacaciones. '
                + 'Disponible: ' + ISNULL(CAST(CAST(@DiasRestantes AS INT) AS VARCHAR(20)), '0')
                + ', Solicitados: ' + CAST(@DiasSolicitados AS VARCHAR(20)) + '.';
            RAISERROR(@ErrMsg, 16, 1);
            RETURN;
        END
    END
    -- ── 5. Insertar la solicitud ──────────────────────────────────────────────
    DECLARE @NuevoSolicitudId INT;
    INSERT INTO SolicitudesVacaciones (
        EmpleadoId, FechaInicio, FechaFin,
        DiasNaturales, DiasSolicitados, DiasFeriados,
        Comentarios, Estatus, FechaSolicitud, UsuarioSolicitanteId
    )
    VALUES (
        @EmpleadoId, @FechaInicio, @FechaFin,
        @DiasNaturales, @DiasSolicitados, @DiasFeriados,
        @Comentarios, @EstatusInicial, GETDATE(), @UsuarioSolicitanteId
    );
    SET @NuevoSolicitudId = SCOPE_IDENTITY();
    -- ── 6. Insertar firmas (autofirma si el solicitante tiene el rol) ─────────
    INSERT INTO SolicitudesVacacionesFirmas (
        SolicitudId, ConfigId, EstatusFirma, UsuarioFirmaId, FechaFirma
    )
    SELECT
        @NuevoSolicitudId,
        c.ConfigId,
        -- Autofirma: si el solicitante tiene el rol requerido por esta etapa
        CASE WHEN EXISTS (
                SELECT 1 FROM UsuariosRoles ur
                WHERE ur.UsuarioId = @UsuarioSolicitanteId AND ur.RoleId = c.RoleId)
             THEN 'Aprobado' ELSE 'Pendiente' END,
        CASE WHEN EXISTS (
                SELECT 1 FROM UsuariosRoles ur
                WHERE ur.UsuarioId = @UsuarioSolicitanteId AND ur.RoleId = c.RoleId)
             THEN @UsuarioSolicitanteId ELSE NULL END,
        CASE WHEN EXISTS (
                SELECT 1 FROM UsuariosRoles ur
                WHERE ur.UsuarioId = @UsuarioSolicitanteId AND ur.RoleId = c.RoleId)
             THEN GETDATE() ELSE NULL END
    FROM VacacionesAprobadoresConfig c
    WHERE c.EsObligatorio = 1;
    -- ── 7. Verificar si todas las firmas ya se auto-aprobaron ─────────────────
    DECLARE @TotalFirmas    INT;
    DECLARE @FirmasAprobadas INT;
    SELECT @TotalFirmas    = COUNT(*) FROM SolicitudesVacacionesFirmas WHERE SolicitudId = @NuevoSolicitudId;
    SELECT @FirmasAprobadas = COUNT(*) FROM SolicitudesVacacionesFirmas WHERE SolicitudId = @NuevoSolicitudId AND EstatusFirma = 'Aprobado';
    IF @TotalFirmas = @FirmasAprobadas AND @TotalFirmas > 0 AND @EstatusInicial <> 'PendienteHorario'
    BEGIN
        UPDATE SolicitudesVacaciones SET Estatus = 'Aprobado' WHERE SolicitudId = @NuevoSolicitudId;
    END
    -- ── 8. Retornar resultado ─────────────────────────────────────────────────
    SELECT
        @NuevoSolicitudId  AS SolicitudId,
        @EstatusInicial    AS Estatus,
        @DiasNaturales     AS DiasNaturales,
        @DiasSolicitados   AS DiasSolicitados,
        @DiasFeriados      AS DiasFeriados,
        @DiasDescanso      AS DiasDescanso,
        @DiasSinHorario    AS DiasSinHorario;
END
GO