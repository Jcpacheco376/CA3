-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Roles_UpdateTokenVersion]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.6.12
-- Compilado:           07/04/2026, 11:26:15
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO
CREATE OR ALTER PROCEDURE [dbo].[sp_Roles_UpdateTokenVersion]
    @RoleId INT
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE u
    SET u.TokenVersion = u.TokenVersion + 1
    FROM dbo.Usuarios u
    JOIN dbo.UsuariosRoles ur ON u.UsuarioId = ur.UsuarioId
    WHERE ur.RoleId = @RoleId;

    PRINT 'TokenVersion actualizado para usuarios del rol ' + CAST(@RoleId AS NVARCHAR);
END
GO