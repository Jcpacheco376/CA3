CREATE OR ALTER PROCEDURE [dbo].[sp_TiposEventoCalendario_GetAll]
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        t.TipoEventoId,
        t.Nombre,
        t.Descripcion,
        t.LogicaCalculo,
        t.EstatusAsistenciaId,
        ea.Descripcion AS EstatusNombre,
        ea.Abreviatura AS EstatusAbreviatura,
        t.PermiteMultiplesMismoDia,
        t.PermiteMultiplesAnio,
        t.ColorUI,
        t.Icono,
        t.EsSistema,
        t.Activo,
        t.esGeneral
    FROM dbo.TiposEventoCalendario t
    LEFT JOIN dbo.CatalogoEstatusAsistencia ea ON t.EstatusAsistenciaId = ea.EstatusId
    WHERE t.Activo = 1
    ORDER BY t.Nombre;
END
