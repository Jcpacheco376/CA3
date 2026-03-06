-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Usuario_ActualizarGruposNomina]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.47
-- Compilado:           06/03/2026, 16:41:33
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

CREATE OR ALTER PROCEDURE dbo.sp_Usuario_ActualizarGruposNomina
    @UsuarioId INT,
    @GruposNominaJSON NVARCHAR(MAX)
AS
BEGIN
    DELETE FROM dbo.UsuariosGruposNomina WHERE UsuarioId = @UsuarioId;
    INSERT INTO dbo.UsuariosGruposNomina (UsuarioId, GrupoNominaId)
    SELECT @UsuarioId, GrupoNominaId
    FROM OPENJSON(@GruposNominaJSON) WITH (GrupoNominaId INT '$');
END
GO