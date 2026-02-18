IF OBJECT_ID('dbo.sp_Roles_Upsert') IS NOT NULL      DROP PROCEDURE dbo.sp_Roles_Upsert;
GO
-- =============================================
-- PROCEDIMIENTO ALMACENADO PARA GUARDAR ROLES (UPSERT)
-- =============================================
-- Este procedimiento centraliza la lógica para crear y actualizar roles,
-- incluyendo la asignación de sus permisos.
CREATE PROCEDURE [dbo].[sp_Roles_Upsert]
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
        
        -- Obtenemos el ID del rol recién creado
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

    -- Gestionar asignaciones de Permisos
    -- Primero eliminamos los permisos antiguos para evitar duplicados.
    DELETE FROM dbo.RolesPermisos WHERE RoleId = @RoleId;
    
    -- Insertamos los nuevos permisos desde el JSON.
    INSERT INTO dbo.RolesPermisos (RoleId, PermisoId)
    SELECT @RoleId, PermisoId
    FROM OPENJSON(@PermisosJSON) WITH (PermisoId INT '$.PermisoId');
    
    -- Devolvemos el ID del rol procesado
    SELECT @RoleId AS RoleId;
END

