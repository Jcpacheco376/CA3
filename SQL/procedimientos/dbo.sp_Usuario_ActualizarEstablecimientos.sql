-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Usuario_ActualizarEstablecimientos]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.6.14
-- Compilado:           11/04/2026, 13:57:04
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO
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