IF OBJECT_ID('dbo.sp_Usuarios_Upsert') IS NOT NULL      DROP PROCEDURE dbo.sp_Usuarios_Upsert;
GO

CREATE PROCEDURE [dbo].[sp_Usuarios_Upsert]
    @UsuarioId INT,
    @NombreCompleto NVARCHAR(100),
    @NombreUsuario NVARCHAR(50),
    @Email NVARCHAR(100),
    @Password NVARCHAR(100),
    @EstaActivo BIT,
    @RolesJSON NVARCHAR(MAX),
    @DepartamentosJSON NVARCHAR(MAX),
    @GruposNominaJSON NVARCHAR(MAX),
    @PuestosJSON NVARCHAR(MAX),         
    @EstablecimientosJSON NVARCHAR(MAX) 
AS
BEGIN
    SET NOCOUNT ON;
    
    -- 1. Validaciones de Usuario Único
    IF EXISTS (SELECT 1 FROM dbo.Usuarios WHERE NombreUsuario = @NombreUsuario AND UsuarioId != @UsuarioId)
    BEGIN
        RAISERROR ('El nombre de usuario ''%s'' ya está en uso.', 16, 1, @NombreUsuario);
        RETURN;
    END

    -- 2. Upsert en Tabla Usuarios
    IF EXISTS (SELECT 1 FROM dbo.Usuarios WHERE UsuarioId = @UsuarioId)
    BEGIN
        UPDATE dbo.Usuarios
        SET NombreCompleto = @NombreCompleto, Email = @Email, EstaActivo = @EstaActivo, NombreUsuario = @NombreUsuario
        WHERE UsuarioId = @UsuarioId;

        IF @Password IS NOT NULL AND @Password != ''
        BEGIN
            UPDATE dbo.Usuarios SET PasswordHash = PWDENCRYPT(@Password), DebeCambiarPassword = 1 WHERE UsuarioId = @UsuarioId;
        END
    END
    ELSE
    BEGIN
        INSERT INTO dbo.Usuarios (UsuarioId, NombreUsuario, PasswordHash, NombreCompleto, Email, EstaActivo)
        VALUES (@UsuarioId, @NombreUsuario, PWDENCRYPT(@Password), @NombreCompleto, @Email, @EstaActivo);
    END
   
    -- 3. Actualización de Relaciones (Aquí el cambio importante)
    DELETE FROM dbo.UsuariosRoles WHERE UsuarioId = @UsuarioId;
    
    INSERT INTO dbo.UsuariosRoles (UsuarioId, RoleId, EsPrincipal) 
    SELECT 
        @UsuarioId, 
        RoleId, 
        ISNULL(EsPrincipal, 0) -- Leemos la propiedad explícita
    FROM OPENJSON(@RolesJSON) 
    WITH (
        RoleId INT '$.RoleId', 
        EsPrincipal BIT '$.EsPrincipal'
    );
        
    -- (El resto de las relaciones se mantienen igual)
    DELETE FROM dbo.UsuariosDepartamentos WHERE UsuarioId = @UsuarioId;
    INSERT INTO dbo.UsuariosDepartamentos (UsuarioId, DepartamentoId) SELECT @UsuarioId, DepartamentoId FROM OPENJSON(@DepartamentosJSON) WITH (DepartamentoId INT '$.DepartamentoId');

    DELETE FROM dbo.UsuariosGruposNomina WHERE UsuarioId = @UsuarioId;
    INSERT INTO dbo.UsuariosGruposNomina (UsuarioId, GrupoNominaId) SELECT @UsuarioId, GrupoNominaId FROM OPENJSON(@GruposNominaJSON) WITH (GrupoNominaId INT '$.GrupoNominaId');
    
    DELETE FROM dbo.UsuariosPuestos WHERE UsuarioId = @UsuarioId;
    INSERT INTO dbo.UsuariosPuestos (UsuarioId, PuestoId) SELECT @UsuarioId, PuestoId FROM OPENJSON(@PuestosJSON) WITH (PuestoId INT '$.PuestoId');

    DELETE FROM dbo.UsuariosEstablecimientos WHERE UsuarioId = @UsuarioId;
    INSERT INTO dbo.UsuariosEstablecimientos (UsuarioId, EstablecimientoId) SELECT @UsuarioId, EstablecimientoId FROM OPENJSON(@EstablecimientosJSON) WITH (EstablecimientoId INT '$.EstablecimientoId');
    
    SELECT UsuarioId, NombreCompleto FROM dbo.Usuarios WHERE UsuarioId = @UsuarioId;
END
