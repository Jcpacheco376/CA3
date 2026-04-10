-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Roles_Upsert]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.6.12
-- Compilado:           07/04/2026, 11:26:15
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO
CREATE OR ALTER PROCEDURE [dbo].[sp_Roles_Upsert]
    @RoleId INT,
    @NombreRol NVARCHAR(50),
    @Descripcion NVARCHAR(255),
    @PermisosJSON NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;

    -- Si @RoleId es 0, es un nuevo rol.
    IF @RoleId = 0
    BEGIN
        INSERT INTO dbo.Roles (NombreRol, Descripcion)
        VALUES (@NombreRol, @Descripcion);
        
        SET @RoleId = SCOPE_IDENTITY();
    END
    ELSE
    BEGIN
        -- Es un rol existente, actualizamos sus datos.
        UPDATE dbo.Roles
        SET 
            NombreRol = @NombreRol,
            Descripcion = @Descripcion
        WHERE RoleId = @RoleId;
    END

    -- Gestionar asignaciones de SISPermisos
    DELETE FROM dbo.RolesPermisos WHERE RoleId = @RoleId;
    
    -- Insertamos los nuevos permisos desde el JSON.
    INSERT INTO dbo.RolesPermisos (RoleId, PermisoId)
    SELECT @RoleId, PermisoId
    FROM OPENJSON(@PermisosJSON) WITH (PermisoId INT '$.PermisoId');
    
    -- Devolvemos el ID del rol procesado
    SELECT @RoleId AS RoleId;
END
GO