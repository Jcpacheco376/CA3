-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Usuario_ActualizarPuestos]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.46
-- Compilado:           06/03/2026, 16:18:09
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Usuario_ActualizarPuestos]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.44
-- Compilado:           06/03/2026, 15:57:03
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

/* --- 6. SP para ACTUALIZAR SISPermisos de Puestos (Nuevo) --- */
CREATE OR ALTER PROCEDURE [dbo].[sp_Usuario_ActualizarPuestos]
    @UsuarioId INT,
    @PuestosJSON NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    DELETE FROM dbo.UsuariosPuestos WHERE UsuarioId = @UsuarioId;
    INSERT INTO dbo.UsuariosPuestos (UsuarioId, PuestoId)
    SELECT @UsuarioId, PuestoId
    FROM OPENJSON(@PuestosJSON) WITH (PuestoId INT '$.PuestoId'); 
END
GO