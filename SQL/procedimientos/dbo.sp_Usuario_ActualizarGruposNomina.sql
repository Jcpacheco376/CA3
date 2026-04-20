-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Usuario_ActualizarGruposNomina]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.6.19
-- Compilado:           15/04/2026, 16:13:04
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO
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