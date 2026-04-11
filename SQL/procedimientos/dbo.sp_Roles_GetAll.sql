-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Roles_GetAll]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.6.14
-- Compilado:           11/04/2026, 13:57:04
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO
CREATE OR ALTER PROCEDURE sp_Roles_GetAll
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
        r.RoleId,
        r.NombreRol,
        r.Descripcion,
        (
            SELECT 
                p.PermisoId, 
                p.NombrePermiso, 
                p.Descripcion 
            FROM SISPermisos p
            INNER JOIN RolesPermisos rp ON p.PermisoId = rp.PermisoId
            WHERE rp.RoleId = r.RoleId
			and p.activo= 1
            FOR JSON PATH
        ) AS SISPermisos
    FROM Roles r;
END
GO