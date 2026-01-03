IF OBJECT_ID('dbo.sp_Incidencias_SolicitarAutorizacion') IS NOT NULL      DROP PROCEDURE dbo.sp_Incidencias_SolicitarAutorizacion;
GO

CREATE PROCEDURE [dbo].[sp_Incidencias_SolicitarAutorizacion]
    @IncidenciaId INT,
    @Comentario NVARCHAR(255),
    @UsuarioAccionId INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @NivelSeveridad VARCHAR(20);
        SELECT @NivelSeveridad = NivelSeveridad FROM dbo.Incidencias WHERE IncidenciaId = @IncidenciaId;

        -- Obtener roles requeridos
        DECLARE @RolesRequeridos TABLE (RoleId INT);
        INSERT INTO @RolesRequeridos
        SELECT RoleId FROM dbo.CatalogoNivelesAutorizacion WHERE NivelSeveridad = @NivelSeveridad;

        -- Fallback si no hay configuración
        IF NOT EXISTS (SELECT 1 FROM @RolesRequeridos)
        BEGIN
            INSERT INTO @RolesRequeridos
            SELECT TOP 1 RoleId FROM dbo.Roles WHERE NombreRol LIKE '%Admin%' OR NombreRol LIKE '%RH%';
        END

        -- Insertar Solicitudes
        INSERT INTO dbo.IncidenciasAutorizaciones (IncidenciaId, RolRequeridoId, Estatus)
        SELECT @IncidenciaId, RoleId, 'Pendiente' FROM @RolesRequeridos;

        -- Actualizar Estado
        UPDATE dbo.Incidencias 
        SET Estado = 'PorAutorizar', RequiereAutorizacion = 1 
        WHERE IncidenciaId = @IncidenciaId;

        -- Bitácora
        INSERT INTO dbo.IncidenciasBitacora (IncidenciaId, UsuarioId, Accion, Comentario, EstadoNuevo, FechaMovimiento)
        VALUES (@IncidenciaId, @UsuarioAccionId, 'SolicitarAutorizacion', @Comentario, 'PorAutorizar', GETDATE());

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END

