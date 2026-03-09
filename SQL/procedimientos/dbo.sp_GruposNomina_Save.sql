-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_GruposNomina_Save]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.51
-- Compilado:           09/03/2026, 09:30:57
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

CREATE OR ALTER PROCEDURE [dbo].[sp_GruposNomina_Save]
    @GrupoNominaId NVARCHAR(50),
    @CodRef NVARCHAR(50),
    @Nombre NVARCHAR(100),
    @Abreviatura NVARCHAR(50),
    @Activo BIT
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY

        BEGIN TRANSACTION;

        IF EXISTS (SELECT 1 FROM dbo.CatalogoGruposNomina WHERE GrupoNominaId = @GrupoNominaId)
        BEGIN
            UPDATE dbo.CatalogoGruposNomina
            SET 
                CodRef = @CodRef,
                Nombre = @Nombre,
                Abreviatura = @Abreviatura,
                Activo = @Activo
            WHERE GrupoNominaId = @GrupoNominaId;
        END
        ELSE
        BEGIN
            INSERT INTO dbo.CatalogoGruposNomina (GrupoNominaId, CodRef, Nombre, Abreviatura, Activo)
            VALUES (@GrupoNominaId, @CodRef, @Nombre, @Abreviatura, @Activo);
        END
        
        PRINT 'Paso 1: Guardado local de GrupoNomina completado.';

        IF (SELECT ConfigValue FROM dbo.SISConfiguracion WHERE ConfigKey = 'SyncGruposNomina') = 'true'
        BEGIN
            PRINT 'Paso 2: Sincronizaci�n (PUSH) habilitada. Intentando...';
            
            DECLARE @Status CHAR(1) = CASE WHEN @Activo = 1 THEN 'V' ELSE 'C' END;
            
            EXEC [dbo].[sp_SyncToExternal_GrupoNomina]
                @CodRef = @CodRef,
                @Nombre = @Nombre,
                @Abreviatura = @Abreviatura,
                @Status = @Status;
                
            PRINT 'Paso 3: Llamada a sp_SyncToExternal_GrupoNomina finalizada.';
        END
        ELSE
        BEGIN
            PRINT 'Paso 2: Sincronizaci�n (PUSH) deshabilitada. Omitiendo.';
        END
        COMMIT TRANSACTION;
        PRINT 'Transacci�n local completada (COMMIT).';

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        
        PRINT 'Error en sp_GruposNomina_Save: ' + ERROR_MESSAGE();
        THROW; 
    END CATCH
END
GO