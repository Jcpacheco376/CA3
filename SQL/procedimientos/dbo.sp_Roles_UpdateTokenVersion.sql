-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Roles_UpdateTokenVersion]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.58
-- Compilado:           09/03/2026, 14:09:33
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

CREATE OR ALTER PROCEDURE [dbo].[sp_Roles_UpdateTokenVersion]
    @RoleId INT
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Incrementa la versi�n del token para todos los usuarios que tienen este rol asignado.
    -- Esto invalidar� sus tokens JWT actuales en la pr�xima petici�n.
    UPDATE u
    SET u.TokenVersion = u.TokenVersion + 1
    FROM dbo.Usuarios u
    JOIN dbo.UsuariosRoles ur ON u.UsuarioId = ur.UsuarioId
    WHERE ur.RoleId = @RoleId;

    PRINT 'TokenVersion actualizado para usuarios del rol ' + CAST(@RoleId AS NVARCHAR);
END
GO