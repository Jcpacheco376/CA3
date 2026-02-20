CREATE TABLE [dbo].[TiposEventoCalendario] (
    [TipoEventoId]             VARCHAR(30)    NOT NULL,
    [Nombre]                   NVARCHAR(100)  NOT NULL,
    [Descripcion]              NVARCHAR(500)  NULL,
    [LogicaCalculo]            VARCHAR(30)    NOT NULL,  -- OMISION_CHECADAS, IGNORAR_SALIDA, IGNORAR_RETARDO, NINGUNO
    [EstatusAsistenciaId]      INT            NULL,      -- Estatus a aplicar cuando LogicaCalculo lo requiere
    [PermiteMultiplesMismoDia] BIT            NOT NULL DEFAULT(0),
    [PermiteMultiplesAnio]     BIT            NOT NULL DEFAULT(1),
    [ColorUI]                  NVARCHAR(30)   NOT NULL DEFAULT('slate'),
    [Icono]                    NVARCHAR(50)   NULL,
    [EsSistema]                BIT            NOT NULL DEFAULT(0),
    [Activo]                   BIT            NOT NULL DEFAULT(1),
    CONSTRAINT [PK_TiposEventoCalendario] PRIMARY KEY CLUSTERED ([TipoEventoId] ASC)
) ON [PRIMARY]
GO

ALTER TABLE [dbo].[TiposEventoCalendario] ADD CONSTRAINT [FK_TiposEvento_Estatus]
    FOREIGN KEY ([EstatusAsistenciaId]) REFERENCES [dbo].[CatalogoEstatusAsistencia]([EstatusId]);
GO

ALTER TABLE [dbo].[TiposEventoCalendario] ADD CONSTRAINT [CK_TiposEvento_LogicaCalculo]
    CHECK ([LogicaCalculo] IN ('OMISION_CHECADAS', 'IGNORAR_SALIDA', 'IGNORAR_RETARDO', 'NINGUNO'));
GO

-- ═══════════════════════════════════════════════════
-- Datos iniciales
-- ═══════════════════════════════════════════════════
INSERT INTO [dbo].[TiposEventoCalendario]
    ([TipoEventoId], [Nombre], [Descripcion], [LogicaCalculo], [EstatusAsistenciaId], [PermiteMultiplesMismoDia], [PermiteMultiplesAnio], [ColorUI], [Icono], [EsSistema])
VALUES
    ('DIA_FERIADO',       'Día Feriado',        'Día no laborable oficial. Reemplaza faltas por el estatus configurado.',                       'OMISION_CHECADAS',  NULL, 0, 1, 'red',    'calendar-off',    1),
    ('SALIDA_ANTICIPADA', 'Salida Anticipada',  'Permite salida temprana sin generar incidencia de jornada incompleta.',                        'IGNORAR_SALIDA',    NULL, 0, 1, 'amber',  'clock-arrow-down', 1),
    ('ENTRADA_FLEXIBLE',  'Entrada Flexible',   'Ignora retardos en la entrada. No genera incidencia de retardo.',                              'IGNORAR_RETARDO',   NULL, 0, 1, 'sky',    'clock-arrow-up',  1),
    ('INFORMATIVO',       'Informativo',        'Evento visual/informativo. No afecta el cálculo automático de asistencia.',                    'NINGUNO',           NULL, 1, 1, 'indigo', 'info',            1);
GO
