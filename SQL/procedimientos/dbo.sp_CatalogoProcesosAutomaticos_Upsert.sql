-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_CatalogoProcesosAutomaticos_Upsert]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.6.19
-- Compilado:           15/04/2026, 16:13:04
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO
CREATE OR ALTER PROCEDURE [dbo].[sp_CatalogoProcesosAutomaticos_Upsert]
    @ProcesoId INT = NULL OUTPUT,
    @Nombre NVARCHAR(100),
    @KeyInterna NVARCHAR(50),
    @Descripcion NVARCHAR(500) = NULL,
    @CronExpression NVARCHAR(50),
    @Activo BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    
    IF @ProcesoId IS NULL OR @ProcesoId <= 0
    BEGIN
        INSERT INTO dbo.CatalogoProcesosAutomaticos (
            Nombre, KeyInterna, Descripcion, CronExpression, Activo
        )
        VALUES (
            @Nombre, @KeyInterna, @Descripcion, @CronExpression, @Activo
        );
        
        SET @ProcesoId = SCOPE_IDENTITY();
    END
    ELSE
    BEGIN
        UPDATE dbo.CatalogoProcesosAutomaticos
        SET 
            Nombre = @Nombre,
            KeyInterna = @KeyInterna,
            Descripcion = @Descripcion,
            CronExpression = @CronExpression,
            Activo = @Activo
        WHERE ProcesoId = @ProcesoId;
    END

    -- Return the inserted/updated ID
    SELECT @ProcesoId AS ProcesoId;
END
GO