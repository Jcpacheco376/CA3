-- =============================================
-- SCRIPT GENERADOR DE INSERTS - VERSIÓN FINAL MEJORADA
-- Ejecutar en la BASE DE DATOS ORIGEN
-- =============================================

DECLARE @Script NVARCHAR(MAX) = '';

-- =============================================
-- TABLA: Permisos
-- =============================================
SET @Script = @Script + '-- =============================================' + CHAR(13) + CHAR(10);
SET @Script = @Script + '-- INSERTS PARA TABLA Permisos' + CHAR(13) + CHAR(10);
SET @Script = @Script + '-- =============================================' + CHAR(13) + CHAR(10) + CHAR(13) + CHAR(10);

SELECT @Script = @Script +
    'INSERT INTO [dbo].[Permisos] ([NombrePermiso], [Descripcion], [Activo])' + CHAR(13) + CHAR(10) +
    'SELECT ''' + REPLACE(ISNULL(NombrePermiso,''),'''','''''') + ''', ' +
    '''' + REPLACE(ISNULL(Descripcion,''),'''','''''') + ''', ' +
    CAST(Activo AS VARCHAR(1)) + CHAR(13) + CHAR(10) +
    'WHERE NOT EXISTS (' + CHAR(13) + CHAR(10) +
    '    SELECT 1 FROM [dbo].[Permisos] WHERE NombrePermiso = ''' + REPLACE(ISNULL(NombrePermiso,''),'''','''''') + '''' + CHAR(13) + CHAR(10) +
    ');' + CHAR(13) + CHAR(10) +
    'GO' + CHAR(13) + CHAR(10) + CHAR(13) + CHAR(10)
FROM [dbo].[Permisos]
ORDER BY PermisoId;

-- =============================================
-- TABLA: CatalogoTiposIncidencia
-- =============================================
SET @Script = @Script + '-- =============================================' + CHAR(13) + CHAR(10);
SET @Script = @Script + '-- INSERTS PARA TABLA CatalogoTiposIncidencia' + CHAR(13) + CHAR(10);
SET @Script = @Script + '-- =============================================' + CHAR(13) + CHAR(10) + CHAR(13) + CHAR(10);

SELECT @Script = @Script +
    'INSERT INTO [dbo].[CatalogoTiposIncidencia] ([Nombre], [Descripcion], [Activo], [Codigo])' + CHAR(13) + CHAR(10) +
    'SELECT ''' + REPLACE(Nombre,'''','''''') + ''', ' +
    '''' + REPLACE(ISNULL(Descripcion,''),'''','''''') + ''', ' +
    CAST(Activo AS VARCHAR(1)) + ', ' +
    '''' + Codigo + '''' + CHAR(13) + CHAR(10) +
    'WHERE NOT EXISTS (' + CHAR(13) + CHAR(10) +
    '    SELECT 1 FROM [dbo].[CatalogoTiposIncidencia] WHERE Codigo = ''' + Codigo + '''' + CHAR(13) + CHAR(10) +
    ');' + CHAR(13) + CHAR(10) +
    'GO' + CHAR(13) + CHAR(10) + CHAR(13) + CHAR(10)
FROM [dbo].[CatalogoTiposIncidencia]
ORDER BY TipoIncidenciaId;

-- =============================================
-- TABLA: ConfiguracionIncidencias (CLAVE COMPUESTA CORREGIDA)
-- =============================================
SET @Script = @Script + '-- =============================================' + CHAR(13) + CHAR(10);
SET @Script = @Script + '-- INSERTS PARA TABLA ConfiguracionIncidencias' + CHAR(13) + CHAR(10);
SET @Script = @Script + '-- Clave única: CodigoRegla + EstatusSistemaId + EstatusManualId' + CHAR(13) + CHAR(10);
SET @Script = @Script + '-- =============================================' + CHAR(13) + CHAR(10) + CHAR(13) + CHAR(10);

SELECT @Script = @Script +
    'INSERT INTO [dbo].[ConfiguracionIncidencias] (' +
    '[CodigoRegla], [EstatusSistemaId], [EstatusManualId], [NivelSeveridad], ' +
    '[RequiereAutorizacion], [MensajeError], [Activo], [TipoIncidenciaId])' + CHAR(13) + CHAR(10) +
    'SELECT ''' + CodigoRegla + ''', ' +
    ISNULL(CAST(EstatusSistemaId AS VARCHAR(10)), 'NULL') + ', ' +
    ISNULL(CAST(EstatusManualId AS VARCHAR(10)), 'NULL') + ', ' +
    '''' + NivelSeveridad + ''', ' +
    ISNULL(CAST(RequiereAutorizacion AS VARCHAR(1)), '0') + ', ' +
    '''' + REPLACE(ISNULL(MensajeError,''),'''','''''') + ''', ' +
    ISNULL(CAST(Activo AS VARCHAR(1)), '1') + ', ' +
    ISNULL(CAST(TipoIncidenciaId AS VARCHAR(10)), 'NULL') + CHAR(13) + CHAR(10) +
    'WHERE NOT EXISTS (' + CHAR(13) + CHAR(10) +
    '    SELECT 1 ' + CHAR(13) + CHAR(10) +
    '    FROM [dbo].[ConfiguracionIncidencias] ' + CHAR(13) + CHAR(10) +
    '    WHERE CodigoRegla = ''' + CodigoRegla + '''' + CHAR(13) + CHAR(10) +
    '      AND ISNULL(EstatusSistemaId, -1) = ' + ISNULL(CAST(EstatusSistemaId AS VARCHAR(10)), '-1') + CHAR(13) + CHAR(10) +
    '      AND ISNULL(EstatusManualId, -1) = ' + ISNULL(CAST(EstatusManualId AS VARCHAR(10)), '-1') + CHAR(13) + CHAR(10) +
    ');' + CHAR(13) + CHAR(10) +
    'GO' + CHAR(13) + CHAR(10) + CHAR(13) + CHAR(10)
FROM [dbo].[ConfiguracionIncidencias]
ORDER BY ConfigId;

-- =============================================
-- MOSTRAR SCRIPT COMPLETO
-- =============================================
SET @Script = @Script + '-- =============================================' + CHAR(13) + CHAR(10);
SET @Script = @Script + '-- FIN DE LOS INSERTS GENERADOS' + CHAR(13) + CHAR(10);
SET @Script = @Script + '-- =============================================' + CHAR(13) + CHAR(10);

SELECT @Script AS ScriptGenerado;