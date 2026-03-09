-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Departamentos_Save]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.51
-- Compilado:           09/03/2026, 09:30:57
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

CREATE OR ALTER PROCEDURE [dbo].[sp_Departamentos_Save]
    @DepartamentoId NVARCHAR(50), 
    @CodRef NVARCHAR(50),
    @Nombre NVARCHAR(100),
    @Abreviatura NVARCHAR(50),
    @Activo BIT
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        IF EXISTS (SELECT 1 FROM dbo.CatalogoDepartamentos WHERE DepartamentoId = @DepartamentoId)
        BEGIN
            UPDATE dbo.CatalogoDepartamentos
            SET 
                CodRef = @CodRef,
                Nombre = @Nombre,
                Abreviatura = @Abreviatura,
                Activo = @Activo
            WHERE DepartamentoId = @DepartamentoId;
        END
        ELSE
        BEGIN
            INSERT INTO dbo.CatalogoDepartamentos (DepartamentoId, CodRef, Nombre, Abreviatura, Activo)
            VALUES (@DepartamentoId, @CodRef, @Nombre, @Abreviatura, @Activo);
        END
        
        PRINT 'Paso 1: Guardado local completado.';

        IF (SELECT ConfigValue FROM dbo.SISConfiguracion WHERE ConfigKey = 'SyncDepartamentos') = 'true'
        BEGIN
            PRINT 'Paso 2: Sincronizaci�n (PUSH) habilitada. Intentando...';
                        
            DECLARE @Status CHAR(1) = CASE WHEN @Activo = 1 THEN 'V' ELSE 'B' END;
            
            EXEC [dbo].[sp_SyncToExternal_Departamento]
                @CodRef = @CodRef,
                @Nombre = @Nombre,
                @Abreviatura = @Abreviatura,
                @Status = @Status;
                
            PRINT 'Paso 3: Llamada a sp_SyncToExternal_Departamento finalizada.';
        END
        ELSE
        BEGIN
            PRINT 'Paso 2: Sincronizaci�n (PUSH) deshabilitada. Omitiendo.';
        END
        PRINT 'Transacci�n local completada (COMMIT).';

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0    
        PRINT 'Error en sp_Departamentos_Save: ' + ERROR_MESSAGE();
        THROW; 
    END CATCH
END
GO