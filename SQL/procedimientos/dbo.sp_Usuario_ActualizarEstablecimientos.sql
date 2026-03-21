-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Usuario_ActualizarEstablecimientos]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.5.13
-- Compilado:           21/03/2026, 14:38:21
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

CREATE OR ALTER PROCEDURE [dbo].[sp_Usuario_ActualizarEstablecimientos]
    @UsuarioId INT,
    @EstablecimientosJSON NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    DELETE FROM dbo.UsuariosEstablecimientos WHERE UsuarioId = @UsuarioId;
    INSERT INTO dbo.UsuariosEstablecimientos (UsuarioId, EstablecimientoId)
    SELECT @UsuarioId, EstablecimientoId
    FROM OPENJSON(@EstablecimientosJSON) WITH (EstablecimientoId INT '$.EstablecimientoId'); 
END
GO