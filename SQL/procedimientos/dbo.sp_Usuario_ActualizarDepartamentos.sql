IF OBJECT_ID('dbo.sp_Usuario_ActualizarDepartamentos') IS NOT NULL      DROP PROCEDURE dbo.sp_Usuario_ActualizarDepartamentos;
GO

-- ------------------------------------------------------------------
-- sp_Usuario_ActualizarDepartamentos (Sin cambios)
-- ------------------------------------------------------------------
CREATE PROCEDURE dbo.sp_Usuario_ActualizarDepartamentos
    @UsuarioId INT,
    @DepartamentosJSON NVARCHAR(MAX)
AS
BEGIN
    DELETE FROM dbo.UsuariosDepartamentos WHERE UsuarioId = @UsuarioId;
    INSERT INTO dbo.UsuariosDepartamentos (UsuarioId, DepartamentoId)
    SELECT @UsuarioId, DepartamentoId
    FROM OPENJSON(@DepartamentosJSON) WITH (DepartamentoId INT '$');
END

