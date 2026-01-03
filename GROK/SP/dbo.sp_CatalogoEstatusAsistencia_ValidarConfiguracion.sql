IF OBJECT_ID('dbo.sp_CatalogoEstatusAsistencia_ValidarConfiguracion') IS NOT NULL      DROP PROCEDURE dbo.sp_CatalogoEstatusAsistencia_ValidarConfiguracion;
GO

CREATE PROCEDURE [dbo].[sp_CatalogoEstatusAsistencia_ValidarConfiguracion]
    @DetenerSiHayError BIT = 0 -- 1 = Lanza RAISERROR si falla, 0 = Solo devuelve tabla
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Errores TABLE (
        Concepto VARCHAR(50),
        CantidadEncontrada INT,
        Mensaje VARCHAR(255)
    );

    DECLARE @Cnt INT;

    -- 1. VALIDAR ASISTENCIA
    SELECT @Cnt = COUNT(*) FROM dbo.CatalogoEstatusAsistencia 
    WHERE EsAsistencia = 1 AND Activo = 1 AND EsDefault = 1;
    
    IF @Cnt <> 1 
        INSERT INTO @Errores VALUES ('EsAsistencia', @Cnt, 
        CASE WHEN @Cnt = 0 THEN 'Falta definir un estatus Default para Asistencia.' ELSE 'Hay múltiples estatus Default para Asistencia.' END);

    -- 2. VALIDAR FALTA
    SELECT @Cnt = COUNT(*) FROM dbo.CatalogoEstatusAsistencia 
    WHERE EsFalta = 1 AND Activo = 1 AND EsDefault = 1;
    
    IF @Cnt <> 1 
        INSERT INTO @Errores VALUES ('EsFalta', @Cnt, 
        CASE WHEN @Cnt = 0 THEN 'Falta definir un estatus Default para Falta.' ELSE 'Hay múltiples estatus Default para Falta.' END);

    -- 3. VALIDAR RETARDO
    SELECT @Cnt = COUNT(*) FROM dbo.CatalogoEstatusAsistencia 
    WHERE EsRetardo = 1 AND Activo = 1 AND EsDefault = 1;
    
    IF @Cnt <> 1 
        INSERT INTO @Errores VALUES ('EsRetardo', @Cnt, 
        CASE WHEN @Cnt = 0 THEN 'Falta definir un estatus Default para Retardo.' ELSE 'Hay múltiples estatus Default para Retardo.' END);

    -- 4. VALIDAR DESCANSO
    SELECT @Cnt = COUNT(*) FROM dbo.CatalogoEstatusAsistencia 
    WHERE EsDescanso = 1 AND Activo = 1 AND EsDefault = 1;
    
    IF @Cnt <> 1 
        INSERT INTO @Errores VALUES ('EsDescanso', @Cnt, 
        CASE WHEN @Cnt = 0 THEN 'Falta definir un estatus Default para Descanso.' ELSE 'Hay múltiples estatus Default para Descanso.' END);

    -- 5. VALIDAR E/S INCOMPLETA
    SELECT @Cnt = COUNT(*) FROM dbo.CatalogoEstatusAsistencia 
    WHERE EsEntradaSalidaIncompleta = 1 AND Activo = 1 AND EsDefault = 1;
    
    IF @Cnt <> 1 
        INSERT INTO @Errores VALUES ('EsEntradaSalidaIncompleta', @Cnt, 
        CASE WHEN @Cnt = 0 THEN 'Falta definir un estatus Default para E/S Incompleta.' ELSE 'Hay múltiples estatus Default para E/S Incompleta.' END);

    -- 6. VALIDAR SIN HORARIO
    SELECT @Cnt = COUNT(*) FROM dbo.CatalogoEstatusAsistencia 
    WHERE SinHorario = 1 AND Activo = 1 AND EsDefault = 1;
    
    IF @Cnt <> 1 
        INSERT INTO @Errores VALUES ('SinHorario', @Cnt, 
        CASE WHEN @Cnt = 0 THEN 'Falta definir un estatus Default para Sin Horario.' ELSE 'Hay múltiples estatus Default para Sin Horario.' END);

    -- RESULTADO
    IF EXISTS (SELECT 1 FROM @Errores)
    BEGIN
        SELECT * FROM @Errores;
        
        IF @DetenerSiHayError = 1
        BEGIN
            RAISERROR('La configuración del Catálogo de Estatus es inválida. Revise la salida para más detalles.', 16, 1);
            RETURN;
        END
    END
    ELSE
    BEGIN
        -- Si se usa como consulta informativa y todo está bien, devuelve vacío o un mensaje de éxito opcional
        IF @DetenerSiHayError = 0 SELECT 'Configuración Correcta' as Estado, 'Todos los estatus críticos están correctamente definidos.' as Mensaje;
    END
END

