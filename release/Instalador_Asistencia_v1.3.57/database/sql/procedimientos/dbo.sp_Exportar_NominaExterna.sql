-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Exportar_NominaExterna]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.56
-- Compilado:           09/03/2026, 12:05:29
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

CREATE OR ALTER PROCEDURE [dbo].[sp_Exportar_NominaExterna]
    @FechaInicio DATE,
    @FechaFin DATE,
    @GrupoNominaId INT
AS
BEGIN
    SET NOCOUNT ON;

    -- ==========================================================================================
    -- NOTA DE DEBUG: BASE DE DATOS HARDCODEADA A: [ctA]
    -- ==========================================================================================

    DECLARE @IdPeriodo INT;
    
    -- ------------------------------------------------------------------------------------------
    -- 1. BUSCAR ID DEL PERIODO EN CONTPAQI (Tabla nom10002)
    -- ------------------------------------------------------------------------------------------
    
    -- Intento A: Match exacto de fechas
    SELECT TOP 1 @IdPeriodo = p.idperiodo
    FROM ctA.dbo.nom10002 p
    WHERE p.fechainicio = @FechaInicio 
      AND p.fechafin = @FechaFin;
    

    -- Intento B: Si no es exacta, buscar si la fecha de inicio cae dentro del rango
    IF @IdPeriodo IS NULL
    BEGIN
        SELECT TOP 1 @IdPeriodo = p.idperiodo
        FROM ctA.dbo.nom10002 p
        WHERE @FechaInicio BETWEEN p.fechainicio AND p.fechafin;
    END
		print @IdPeriodo 
    -- Validaci�n
    IF @IdPeriodo IS NULL
    BEGIN
        RAISERROR('ERROR DE DEBUG: No se encontr� el periodo en la tabla [ctA].[dbo].[nom10002] para las fechas dadas.', 16, 1);
        RETURN;
    END

    -- ------------------------------------------------------------------------------------------
    -- 2. INSERCI�N MASIVA EN TABLA DE MOVIMIENTOS (nom10010)
    -- ------------------------------------------------------------------------------------------
    
    INSERT INTO ctA.dbo.nom10010 (
        idperiodo,
        idempleado,
        idtipoincidencia,
        fecha,
        valor,
        timestamp
    )
    SELECT 
        @IdPeriodo,
        ce.idempleado,
        ci.idtipoincidencia,
        det.Fecha,
        det.Valor,
        GETDATE()
    FROM Prenomina p
    INNER JOIN PrenominaDetalle det ON p.Id = det.CabeceraId
    INNER JOIN Empleados e ON p.EmpleadoId = e.EmpleadoId
    INNER JOIN CatalogoConceptosNomina c ON det.ConceptoId = c.ConceptoId
    
    -- CRUCE 1: Empleados (Tu CodRef vs CONTPAQi codigoempleado)
    -- Usamos COLLATE Database_Default para evitar errores si las BD tienen idiomas distintos
    INNER JOIN ctA.dbo.nom10001 ce 
        ON e.CodRef = ce.codigoempleado COLLATE Database_Default
    
    -- CRUCE 2: Conceptos (Tu CodRef vs CONTPAQi idtipoincidencia)
    INNER JOIN ctA.dbo.nom10022 ci 
        ON c.CodRef = CAST(ci.idtipoincidencia AS VARCHAR(50)) COLLATE Database_Default

    WHERE p.GrupoNominaId = @GrupoNominaId
      AND p.FechaInicio = @FechaInicio
      AND p.FechaFin = @FechaFin
      AND det.Valor > 0 
      AND c.Activo = 1;




    -- ------------------------------------------------------------------------------------------
    -- 3. RESULTADO
    -- ------------------------------------------------------------------------------------------
    SELECT @@ROWCOUNT AS RegistrosExportados;
END
GO