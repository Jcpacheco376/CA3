-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Usuario_ActualizarEstablecimientos]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.56
-- Compilado:           09/03/2026, 12:05:29
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

/* --- 7. SP para ACTUALIZAR SISPermisos de Establecimientos (Nuevo) --- */
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