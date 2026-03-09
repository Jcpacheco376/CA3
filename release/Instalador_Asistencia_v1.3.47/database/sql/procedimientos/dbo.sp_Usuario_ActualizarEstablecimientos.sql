-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Usuario_ActualizarEstablecimientos]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.46
-- Compilado:           06/03/2026, 16:18:09
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Usuario_ActualizarEstablecimientos]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.44
-- Compilado:           06/03/2026, 15:57:03
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