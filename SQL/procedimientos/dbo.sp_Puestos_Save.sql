-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Puestos_Save]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.6.19
-- Compilado:           15/04/2026, 16:13:04
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO
CREATE OR ALTER PROCEDURE [dbo].[sp_Puestos_Save]
    @PuestoId INT, 
    @CodRef NVARCHAR(50),
    @Nombre NVARCHAR(100),
    @Activo BIT
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        BEGIN TRANSACTION;

        -- --- PASO 1: Guardado Local ---
        MERGE dbo.CatalogoPuestos AS Target
        USING (
            SELECT @PuestoId AS PuestoId
        ) AS Source ON Target.PuestoId = Source.PuestoId
        WHEN MATCHED THEN
            UPDATE SET 
                CodRef = @CodRef,
                Nombre = @Nombre,
                Activo = @Activo
        WHEN NOT MATCHED BY TARGET THEN
            INSERT (PuestoId, CodRef, Nombre, Activo)
            VALUES (@PuestoId, @CodRef, @Nombre, @Activo);
        
        PRINT 'Paso 1: Guardado local de Puesto completado.';

        -- --- PASO 2: Verificar Configuraci�n de Sincronizaci�n ---
        IF (SELECT ConfigValue FROM dbo.SISConfiguracion WHERE ConfigKey = 'SyncPuestos') = 'true'
        BEGIN
            PRINT 'Paso 2: Sincronizacion (PUSH) habilitada. Intentando...';
            
            -- --- PASO 3: Intentar el "Push" Externo ---
            DECLARE @Status CHAR(1) = CASE WHEN @Activo = 1 THEN 'V' ELSE 'C' END;
            
            EXEC [dbo].[sp_SyncToExternal_Puesto]
                @CodRef = @CodRef,
                @Nombre = @Nombre,
                @Status = @Status;
                
            PRINT 'Paso 3: Llamada a sp_SyncToExternal_Puesto finalizada.';
        END
        ELSE
        BEGIN
            PRINT 'Paso 2: Sincronizacion (PUSH) deshabilitada. Omitiendo.';
        END

        COMMIT TRANSACTION;
        PRINT 'Transaccion local completada (COMMIT).';

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;       
        PRINT 'Error en sp_Puestos_Save: ' + ERROR_MESSAGE();
        THROW;
    END CATCH
END
GO