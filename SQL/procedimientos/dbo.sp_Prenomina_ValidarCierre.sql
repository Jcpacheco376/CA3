-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Prenomina_ValidarCierre]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.5.22
-- Compilado:           02/04/2026, 14:20:17
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

CREATE OR ALTER PROCEDURE [dbo].sp_Prenomina_ValidarCierre
    @FechaInicio DATE,
    @FechaFin DATE,
    @UsuarioId INT,
    @GrupoNominaId INT = 1
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @PeriodoCerrado BIT = 0;
	DECLARE @ReporteGenerado BIT = 0;
    DECLARE @FichasTotal INT = 0;
    DECLARE @FichasNoBloqueadas INT = 0;
    DECLARE @FichasSinHorario INT = 0;
    DECLARE @IncidenciasCriticas INT = 0;
    DECLARE @FechaGeneracion DATETIME = NULL;

    -- Variables de Salida
    DECLARE @EstadoSemaforo VARCHAR(20) = 'VERDE';
    DECLARE @MensajeValidacion NVARCHAR(255) = '';

    -- 1. Verificar Cierre
    IF EXISTS (
        SELECT 1 FROM CierresNomina c
        WHERE c.FechaInicio = @FechaInicio 
		AND c.FechaFin = @FechaFin AND c.Estado = 'COMPLETO'
		AND C.GrupoNominaId = @GrupoNominaId      
	)
    BEGIN
        SET @PeriodoCerrado = 1;
    END

	SELECT TOP 1 @ReporteGenerado = 1, @FechaGeneracion = FechaGeneracion
    FROM Prenomina 
    WHERE GrupoNominaId = @GrupoNominaId AND FechaInicio = @FechaInicio AND FechaFin = @FechaFin;

    -- 2. M�tricas de Fichas (Total, Sin Validar, Sin Horario)
    SELECT 
        @FichasTotal = COUNT(*),
		@IncidenciasCriticas = SUM(CASE WHEN f.IncidenciaActivaId is not null THEN 1 ELSE 0 END),
        @FichasNoBloqueadas = SUM(CASE WHEN F.Estado <> 'BLOQUEADO' THEN 1 ELSE 0 END),
        @FichasSinHorario = SUM(CASE WHEN F.Estado = 'SIN_HORARIO' THEN 1 ELSE 0 END)
    FROM FichaAsistencia f -- Singular correcto
    INNER JOIN Empleados e ON f.EmpleadoId = e.EmpleadoId
	LEFT JOIN Incidencias I ON F.IncidenciaActivaId=I.IncidenciaId AND I.TipoIncidenciaId='Critica'
    WHERE f.Fecha BETWEEN @FechaInicio AND @FechaFin 
	AND e.GrupoNominaId = @GrupoNominaId 
	AND e.Activo=1

    -- 3. Calcular Sem�foro y Mensaje (L�gica de Negocio)
    IF @PeriodoCerrado = 0
    BEGIN
        SET @EstadoSemaforo = 'ROJO';
        SET @MensajeValidacion = 'El periodo NO se encuentra cerrado en CierresNomina.';
    END
    ELSE IF @FichasNoBloqueadas > 0
    BEGIN
        SET @EstadoSemaforo = 'AMARILLO';
        SET @MensajeValidacion = 'Periodo cerrado, pero hay fichas sin bloquear.';
    END
    ELSE
    BEGIN
        SET @EstadoSemaforo = 'VERDE';
        SET @MensajeValidacion = 'Periodo validado y cerrado correctamente.';
    END

    -- 4. RETORNAR RESULTADO (Nombres exactos que espera PayrollGuardModal.tsx)
    SELECT 
        ISNULL(@FichasTotal, 0) AS TotalFichas,
        ISNULL(@FichasNoBloqueadas, 0) AS TotalPendientes,
        ISNULL(@IncidenciasCriticas, 0) AS CriticasPendientes, 
        ISNULL(@FichasNoBloqueadas, 0) AS FichasSinValidar,    
        ISNULL(@FichasSinHorario, 0) AS FichasSinHorario,
        @EstadoSemaforo AS EstadoSemaforo,
        @MensajeValidacion AS MensajeValidacion,
		@PeriodoCerrado AS IsClosed,
		@ReporteGenerado AS ReportExists,
		@FechaGeneracion AS LastGenerated
END
GO