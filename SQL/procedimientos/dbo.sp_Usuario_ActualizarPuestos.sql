-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Usuario_ActualizarPuestos]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.6.14
-- Compilado:           11/04/2026, 13:57:04
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO
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