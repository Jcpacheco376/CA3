-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Usuario_AsignarRol]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.5.13
-- Compilado:           21/03/2026, 14:38:21
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

CREATE OR ALTER PROCEDURE [dbo].[sp_Usuario_AsignarRol]
    @UsuarioId INT,
    @RoleId INT,
    @EsPrincipal BIT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        IF @EsPrincipal = 1
        BEGIN
            UPDATE dbo.UsuariosRoles 
            SET EsPrincipal = 0 
            WHERE UsuarioId = @UsuarioId;
        END


        MERGE dbo.UsuariosRoles AS target
        USING (SELECT @UsuarioId, @RoleId) AS source (UsuarioId, RoleId)
        ON (target.UsuarioId = source.UsuarioId AND target.RoleId = source.RoleId)
        
        WHEN MATCHED THEN
            UPDATE SET EsPrincipal = @EsPrincipal
            
        WHEN NOT MATCHED THEN
            INSERT (UsuarioId, RoleId, EsPrincipal)
            VALUES (@UsuarioId, @RoleId, @EsPrincipal);

        IF NOT EXISTS (SELECT 1 FROM dbo.UsuariosRoles WHERE UsuarioId = @UsuarioId AND EsPrincipal = 1)
        BEGIN
            UPDATE TOP (1) dbo.UsuariosRoles 
            SET EsPrincipal = 1 
            WHERE UsuarioId = @UsuarioId;
        END

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO