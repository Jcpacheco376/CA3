-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_CatalogoConceptosNomina_Upsert]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.56
-- Compilado:           09/03/2026, 12:05:29
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

CREATE OR ALTER PROCEDURE [dbo].[sp_CatalogoConceptosNomina_Upsert]
    @ConceptoId INT = NULL,
    @Nombre NVARCHAR(100),
    @CodRef NVARCHAR(50),
    @Activo BIT = 1
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (SELECT 1 FROM CatalogoConceptosNomina WHERE CodRef = @CodRef AND (@ConceptoId IS NULL OR ConceptoId <> @ConceptoId))
    BEGIN
        RAISERROR('Ya existe un concepto con el c�digo de referencia %s.', 16, 1, @CodRef);
        RETURN;
    END

    IF @ConceptoId IS NULL
    BEGIN
        INSERT INTO CatalogoConceptosNomina (Nombre, CodRef, Activo)
        VALUES (@Nombre, @CodRef, @Activo);
    END
    ELSE
    BEGIN
        UPDATE CatalogoConceptosNomina
        SET Nombre = @Nombre, CodRef = @CodRef, Activo = @Activo
        WHERE ConceptoId = @ConceptoId;
    END
END
GO