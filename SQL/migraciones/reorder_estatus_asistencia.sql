BEGIN TRANSACTION;
BEGIN TRY
    -- 0. Deshabilitar constraints temporalmente
    ALTER TABLE FichaAsistencia NOCHECK CONSTRAINT ALL;
    ALTER TABLE FichaAsistencia_Historial NOCHECK CONSTRAINT ALL;
    ALTER TABLE Incidencias NOCHECK CONSTRAINT ALL;
    ALTER TABLE IncidenciasBitacora NOCHECK CONSTRAINT ALL;
    ALTER TABLE ConfiguracionIncidencias NOCHECK CONSTRAINT ALL;

    -- 1. Crear tabla temporal con el nuevo mapeo
    CREATE TABLE #EstatusMapping (
        OldId INT,
        NewId INT,
        Abreviatura NVARCHAR(10),
        Descripcion NVARCHAR(100),
        ColorUI NVARCHAR(50),
        ValorNomina DECIMAL(3,2),
        VisibleSupervisor BIT,
        Activo BIT,
        DiasRegistroFuturo INT,
        PermiteComentario BIT,
        TipoCalculoId VARCHAR(20),
        CodRef NVARCHAR(20),
        ConceptoNominaId INT
    );

    -- Insertar datos actuales con sus nuevos IDs
    -- (Nota: Se asume que los datos actuales coinciden con la descripción previa)
    INSERT INTO #EstatusMapping (OldId, NewId, Abreviatura, Descripcion, ColorUI, ValorNomina, VisibleSupervisor, Activo, DiasRegistroFuturo, PermiteComentario, TipoCalculoId, CodRef, ConceptoNominaId)
    SELECT EstatusId, 
           CASE 
                WHEN EstatusId <= 11 THEN EstatusId
                WHEN EstatusId = 15 THEN 12
                WHEN EstatusId = 17 THEN 13
                WHEN EstatusId = 18 THEN 14
                WHEN EstatusId = 19 THEN 15
                WHEN EstatusId = 20 THEN 16
           END,
           Abreviatura, Descripcion, ColorUI, ValorNomina, VisibleSupervisor, Activo, DiasRegistroFuturo, PermiteComentario, TipoCalculoId, CodRef, ConceptoNominaId
    FROM CatalogoEstatusAsistencia;

    -- Si "DEFUNCIÓN" no existe (ID 17), lo insertamos manualmente para asegurar el ID 13
    IF NOT EXISTS (SELECT 1 FROM #EstatusMapping WHERE NewId = 13)
    BEGIN
        INSERT INTO #EstatusMapping (OldId, NewId, Abreviatura, Descripcion, ColorUI, ValorNomina, VisibleSupervisor, Activo, DiasRegistroFuturo, PermiteComentario, TipoCalculoId, CodRef, ConceptoNominaId)
        VALUES (NULL, 13, 'PPD', 'DEFUNCIÓN', 'slate', 1.00, 1, 1, 0, 1, 'NINGUNO', NULL, NULL);
    END

    -- 2. Actualizar tablas de referencia
    -- FichaAsistencia
    UPDATE FA SET FA.EstatusChecadorId = M.NewId
    FROM FichaAsistencia FA JOIN #EstatusMapping M ON FA.EstatusChecadorId = M.OldId WHERE M.OldId <> M.NewId;

    UPDATE FA SET FA.EstatusManualId = M.NewId
    FROM FichaAsistencia FA JOIN #EstatusMapping M ON FA.EstatusManualId = M.OldId WHERE M.OldId <> M.NewId;

    -- FichaAsistencia_Historial
    UPDATE FAH SET FAH.EstatusChecadorId = M.NewId
    FROM FichaAsistencia_Historial FAH JOIN #EstatusMapping M ON FAH.EstatusChecadorId = M.OldId WHERE M.OldId <> M.NewId;

    UPDATE FAH SET FAH.EstatusManualId = M.NewId
    FROM FichaAsistencia_Historial FAH JOIN #EstatusMapping M ON FAH.EstatusManualId = M.OldId WHERE M.OldId <> M.NewId;

    -- Incidencias
    UPDATE I SET I.EstatusChecadorId = M.NewId
    FROM Incidencias I JOIN #EstatusMapping M ON I.EstatusChecadorId = M.OldId WHERE M.OldId <> M.NewId;

    UPDATE I SET I.EstatusManualId = M.NewId
    FROM Incidencias I JOIN #EstatusMapping M ON I.EstatusManualId = M.OldId WHERE M.OldId <> M.NewId;

    -- IncidenciasBitacora
    UPDATE IB SET IB.EstatusManualId_Anterior = M.NewId FROM IncidenciasBitacora IB JOIN #EstatusMapping M ON IB.EstatusManualId_Anterior = M.OldId WHERE M.OldId <> M.NewId;
    UPDATE IB SET IB.EstatusManualId_Nuevo = M.NewId FROM IncidenciasBitacora IB JOIN #EstatusMapping M ON IB.EstatusManualId_Nuevo = M.OldId WHERE M.OldId <> M.NewId;
    UPDATE IB SET IB.EstatusChecadorId_Anterior = M.NewId FROM IncidenciasBitacora IB JOIN #EstatusMapping M ON IB.EstatusChecadorId_Anterior = M.OldId WHERE M.OldId <> M.NewId;
    UPDATE IB SET IB.EstatusChecadorId_Nuevo = M.NewId FROM IncidenciasBitacora IB JOIN #EstatusMapping M ON IB.EstatusChecadorId_Nuevo = M.OldId WHERE M.OldId <> M.NewId;

    -- ConfiguracionIncidencias
    UPDATE CI SET CI.EstatusSistemaId = M.NewId FROM ConfiguracionIncidencias CI JOIN #EstatusMapping M ON CI.EstatusSistemaId = M.OldId WHERE M.OldId <> M.NewId;
    UPDATE CI SET CI.EstatusManualId = M.NewId FROM ConfiguracionIncidencias CI JOIN #EstatusMapping M ON CI.EstatusManualId = M.OldId WHERE M.OldId <> M.NewId;

    -- 3. Reemplazar registros en CatalogoEstatusAsistencia
    DELETE FROM CatalogoEstatusAsistencia;

    SET IDENTITY_INSERT CatalogoEstatusAsistencia ON;
    
    INSERT INTO CatalogoEstatusAsistencia (EstatusId, Abreviatura, Descripcion, ColorUI, ValorNomina, VisibleSupervisor, Activo, DiasRegistroFuturo, PermiteComentario, TipoCalculoId, CodRef, ConceptoNominaId)
    SELECT NewId, Abreviatura, Descripcion, ColorUI, ValorNomina, VisibleSupervisor, Activo, DiasRegistroFuturo, PermiteComentario, TipoCalculoId, CodRef, ConceptoNominaId
    FROM #EstatusMapping;

    SET IDENTITY_INSERT CatalogoEstatusAsistencia OFF;

    -- 4. Reseed Identity
    DECLARE @MaxId INT = (SELECT MAX(EstatusId) FROM CatalogoEstatusAsistencia);
    DBCC CHECKIDENT ('CatalogoEstatusAsistencia', RESEED, @MaxId);

    -- 5. Re-habilitar constraints
    ALTER TABLE FichaAsistencia WITH CHECK CHECK CONSTRAINT ALL;
    ALTER TABLE FichaAsistencia_Historial WITH CHECK CHECK CONSTRAINT ALL;
    ALTER TABLE Incidencias WITH CHECK CHECK CONSTRAINT ALL;
    ALTER TABLE IncidenciasBitacora WITH CHECK CHECK CONSTRAINT ALL;
    ALTER TABLE ConfiguracionIncidencias WITH CHECK CHECK CONSTRAINT ALL;

    COMMIT TRANSACTION;
    PRINT 'Actualización completada con éxito.';
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    
    -- Asegurar que se re-habiliten si algo falla (aunque el ROLLBACK lo hará si son DDL persistentes,
    -- pero en SQL Server NOCHECK es persistente hasta que se cambie, y DDL entra en transacción).
    -- Sin embargo, es mejor ser explícito o confiar en el rollback si el esquema cambió.
    
    DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
    RAISERROR (@ErrorMessage, 16, 1);
END CATCH;

DROP TABLE #EstatusMapping;
