USE [CA]
GO
IF NOT EXISTS (SELECT 1 FROM SISConfiguracion WHERE ConfigKey = 'DBENTRADA')
BEGIN
    INSERT INTO SISConfiguracion (ConfigKey, ConfigValue, Descripcion)
    VALUES ('DBENTRADA', 'BMS', 'Nombre de la BD Externa para interfaz DE ENTRADA');
    PRINT 'Configuracion DBENTRADA agregada.';
END
ELSE
BEGIN
    PRINT 'Configuracion DBENTRADA ya existe.';
END
GO
