-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Roles_Upsert]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.51
-- Compilado:           09/03/2026, 09:30:57
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

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
        
        -- Obtenemos el ID del rol reci�n creado
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
    -- Primero eliminamos los permisos antiguos para evitar duplicados.
    DELETE FROM dbo.RolesPermisos WHERE RoleId = @RoleId;
    
    -- Insertamos los nuevos permisos desde el JSON.
    INSERT INTO dbo.RolesPermisos (RoleId, PermisoId)
    SELECT @RoleId, PermisoId
    FROM OPENJSON(@PermisosJSON) WITH (PermisoId INT '$.PermisoId');
    
    -- Devolvemos el ID del rol procesado
    SELECT @RoleId AS RoleId;
END
GO