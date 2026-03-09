-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Incidencias_SolicitarAutorizacion]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.56
-- Compilado:           09/03/2026, 12:05:29
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

CREATE OR ALTER PROCEDURE [dbo].[sp_Incidencias_SolicitarAutorizacion]
    @IncidenciaId INT,
    @Comentario NVARCHAR(255),
    @UsuarioAccionId INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @NivelSeveridad VARCHAR(20);
        SELECT @NivelSeveridad = NivelSeveridad FROM dbo.Incidencias WHERE IncidenciaId = @IncidenciaId;

        -- 1. CALCULAR ApelacionId 
        DECLARE @NuevoApelacionId INT;
        SELECT @NuevoApelacionId = ISNULL(MAX(ApelacionId), 0) + 1 
        FROM dbo.IncidenciasBitacora 
        WHERE IncidenciaId = @IncidenciaId;

        -- 2. Detectar Roles Requeridos
        DECLARE @RolesRequeridos TABLE (RoleId INT);
        INSERT INTO @RolesRequeridos
        SELECT RoleId FROM dbo.CatalogoNivelesAutorizacion WHERE NivelSeveridad = @NivelSeveridad;

        IF NOT EXISTS (SELECT 1 FROM @RolesRequeridos)
        BEGIN
            INSERT INTO @RolesRequeridos
            SELECT TOP 1 RoleId FROM dbo.Roles WHERE NombreRol LIKE '%Admin%' OR NombreRol LIKE '%RH%';
        END

        -- 3. ARCHIVADO 
        UPDATE dbo.IncidenciasAutorizaciones
        SET Activo = 0
        WHERE IncidenciaId = @IncidenciaId AND Activo = 1;

        -- 4. Generar las NUEVAS Solicitudes con el ApelacionId
        INSERT INTO dbo.IncidenciasAutorizaciones (IncidenciaId, RolRequeridoId, Estatus, Activo, ApelacionId)
        SELECT @IncidenciaId, RoleId, 'Pendiente', 1, @NuevoApelacionId
        FROM @RolesRequeridos;

        -- 5. Actualizar Incidencia
        UPDATE dbo.Incidencias 
        SET Estado = 'PorAutorizar', RequiereAutorizacion = 1 
        WHERE IncidenciaId = @IncidenciaId;

        -- 6. Bit�cora 
        INSERT INTO dbo.IncidenciasBitacora (
            IncidenciaId, UsuarioId, Accion, Comentario, 
            EstadoNuevo, ApelacionId, FechaMovimiento
        )
        VALUES (
            @IncidenciaId, @UsuarioAccionId, 'SolicitarAutorizacion', @Comentario, 
            'PorAutorizar', @NuevoApelacionId, GETDATE()
        );

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO