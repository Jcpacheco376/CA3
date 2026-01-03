IF OBJECT_ID('dbo.sp_Usuario_AsignarRol') IS NOT NULL      DROP PROCEDURE dbo.sp_Usuario_AsignarRol;
GO

CREATE PROCEDURE [dbo].[sp_Usuario_AsignarRol]
    @UsuarioId INT,
    @RoleId INT,
    @EsPrincipal BIT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        -- 1. Si este será el principal, desmarcar cualquier otro principal existente
        IF @EsPrincipal = 1
        BEGIN
            UPDATE dbo.UsuariosRoles 
            SET EsPrincipal = 0 
            WHERE UsuarioId = @UsuarioId;
        END

        -- 2. Insertar o Actualizar la relación (MERGE)
        MERGE dbo.UsuariosRoles AS target
        USING (SELECT @UsuarioId, @RoleId) AS source (UsuarioId, RoleId)
        ON (target.UsuarioId = source.UsuarioId AND target.RoleId = source.RoleId)
        
        WHEN MATCHED THEN
            UPDATE SET EsPrincipal = @EsPrincipal
            
        WHEN NOT MATCHED THEN
            INSERT (UsuarioId, RoleId, EsPrincipal)
            VALUES (@UsuarioId, @RoleId, @EsPrincipal);

        -- 3. Validación de Seguridad (Self-Healing)
        -- Si el usuario no tiene ningún principal (ej. se insertó como false), forzar uno.
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

