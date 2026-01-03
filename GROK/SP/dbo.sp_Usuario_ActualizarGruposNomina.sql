IF OBJECT_ID('dbo.sp_Usuario_ActualizarGruposNomina') IS NOT NULL      DROP PROCEDURE dbo.sp_Usuario_ActualizarGruposNomina;
GO
-- ------------------------------------------------------------------
-- sp_Usuario_ActualizarGruposNomina (Sin cambios)
-- ------------------------------------------------------------------
CREATE PROCEDURE dbo.sp_Usuario_ActualizarGruposNomina
    @UsuarioId INT,
    @GruposNominaJSON NVARCHAR(MAX)
AS
BEGIN
    DELETE FROM dbo.UsuariosGruposNomina WHERE UsuarioId = @UsuarioId;
    INSERT INTO dbo.UsuariosGruposNomina (UsuarioId, GrupoNominaId)
    SELECT @UsuarioId, GrupoNominaId
    FROM OPENJSON(@GruposNominaJSON) WITH (GrupoNominaId INT '$');
END

