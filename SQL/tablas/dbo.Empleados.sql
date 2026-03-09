-- ──────────────────────────────────────────────────────────────────────
-- Tabla: [dbo].[Empleados]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.51
-- Compilado:           09/03/2026, 09:30:57
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='Empleados' AND schema_id=SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[Empleados] (
    [EmpleadoId] int IDENTITY(1,1) NOT NULL,
    [CodRef] nvarchar(10) NOT NULL,
    [NombreCompleto] nvarchar(150) NOT NULL,
    [FechaNacimiento] date NULL,
    [FechaIngreso] date NULL,
    [DepartamentoId] int NULL,
    [GrupoNominaId] int NULL,
    [PuestoId] int NULL,
    [HorarioIdPredeterminado] int NULL,
    [Activo] bit NOT NULL CONSTRAINT [DF__Empleados__Activ__26CFC035] DEFAULT ((1)),
    [Sexo] nchar(1) NULL,
    [NSS] nvarchar(20) NULL,
    [CURP] nvarchar(20) NULL,
    [RFC] nvarchar(20) NULL,
    [Imagen] varbinary(MAX) NULL,
    [EstablecimientoId] int NULL,
    [Pim] int NULL,
    [AdminDisp] bit NOT NULL CONSTRAINT [DF__Empleados__Admin__04B07DB2] DEFAULT ((0)),
    [Nombres] nvarchar(100) NULL,
    [ApellidoPaterno] nvarchar(100) NULL,
    [ApellidoMaterno] nvarchar(100) NULL,
    CONSTRAINT [PK__Empleado__958BE910924FBBD4] PRIMARY KEY CLUSTERED ([EmpleadoId])
    );
END
GO