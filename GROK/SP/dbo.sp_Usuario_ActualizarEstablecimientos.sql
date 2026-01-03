IF OBJECT_ID('dbo.sp_Usuario_ActualizarEstablecimientos') IS NOT NULL      DROP PROCEDURE dbo.sp_Usuario_ActualizarEstablecimientos;
GO

/* --- 7. SP para ACTUALIZAR Permisos de Establecimientos (Nuevo) --- */
CREATE PROCEDURE [dbo].[sp_Usuario_ActualizarEstablecimientos]
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

