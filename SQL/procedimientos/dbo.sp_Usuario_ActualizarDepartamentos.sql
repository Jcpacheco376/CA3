-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Usuario_ActualizarDepartamentos]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.5.16
-- Compilado:           24/03/2026, 16:29:51
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

CREATE OR ALTER PROCEDURE dbo.sp_Usuario_ActualizarDepartamentos
    @UsuarioId INT,
    @DepartamentosJSON NVARCHAR(MAX)
AS
BEGIN
    DELETE FROM dbo.UsuariosDepartamentos WHERE UsuarioId = @UsuarioId;
    INSERT INTO dbo.UsuariosDepartamentos (UsuarioId, DepartamentoId)
    SELECT @UsuarioId, DepartamentoId
    FROM OPENJSON(@DepartamentosJSON) WITH (DepartamentoId INT '$');
END
GO