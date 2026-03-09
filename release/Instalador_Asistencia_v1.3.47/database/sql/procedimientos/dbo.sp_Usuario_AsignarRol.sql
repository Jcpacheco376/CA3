-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Usuario_AsignarRol]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.46
-- Compilado:           06/03/2026, 16:18:09
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Usuario_AsignarRol]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.44
-- Compilado:           06/03/2026, 15:57:03
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

        -- 1. Si este ser� el principal, desmarcar cualquier otro principal existente
        IF @EsPrincipal = 1
        BEGIN
            UPDATE dbo.UsuariosRoles 
            SET EsPrincipal = 0 
            WHERE UsuarioId = @UsuarioId;
        END

        -- 2. Insertar o Actualizar la relaci�n (MERGE)
        MERGE dbo.UsuariosRoles AS target
        USING (SELECT @UsuarioId, @RoleId) AS source (UsuarioId, RoleId)
        ON (target.UsuarioId = source.UsuarioId AND target.RoleId = source.RoleId)
        
        WHEN MATCHED THEN
            UPDATE SET EsPrincipal = @EsPrincipal
            
        WHEN NOT MATCHED THEN
            INSERT (UsuarioId, RoleId, EsPrincipal)
            VALUES (@UsuarioId, @RoleId, @EsPrincipal);

        -- 3. Validaci�n de Seguridad (Self-Healing)
        -- Si el usuario no tiene ning�n principal (ej. se insert� como false), forzar uno.
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