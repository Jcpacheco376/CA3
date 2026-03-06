-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_CatalogoEstatusAsistencia_Upsert]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.47
-- Compilado:           06/03/2026, 16:41:33
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

CREATE OR ALTER PROCEDURE [dbo].[sp_CatalogoEstatusAsistencia_Upsert]
    @EstatusId INT = NULL,
    @Abreviatura NVARCHAR(20),
    @Descripcion NVARCHAR(200),
    @ColorUI NVARCHAR(100),
    @ValorNomina DECIMAL(5,2) = 0,
    @VisibleSupervisor BIT = 1,
    @DiasRegistroFuturo INT = 0,
    @PermiteComentario BIT = 0,
    @Activo BIT = 1,
    @TipoCalculoId VARCHAR(20),
	@ConceptoNominaId INT = NULL,
    @UsuarioId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    -- Validar que TipoCalculoId sea obligatorio
    IF @TipoCalculoId IS NULL OR LTRIM(RTRIM(@TipoCalculoId)) = ''
    BEGIN
        RAISERROR('El Tipo de C�lculo es obligatorio.', 16, 1);
        RETURN;
    END

    -- Validar que el tipo de c�lculo exista en la tabla de referencia
    IF NOT EXISTS (SELECT 1 FROM SISTiposCalculo WHERE TipoCalculoId = @TipoCalculoId)
    BEGIN
        RAISERROR('El tipo de c�lculo especificado (%s) no existe en el sistema.', 16, 1, @TipoCalculoId);
        RETURN;
    END


    -- Asegurar unicidad: solo un estatus puede tener este TipoCalculoId a la vez.
    -- Si otro estatus lo tiene asignado, se lo quitamos (lo dejamos en blanco).
    UPDATE CatalogoEstatusAsistencia
    SET TipoCalculoId = 'NINGUNO'
    WHERE TipoCalculoId = @TipoCalculoId
      AND (@EstatusId IS NULL OR EstatusId <> @EstatusId);

    -- INSERT (nuevo registro)
    IF @EstatusId IS NULL
    BEGIN
        INSERT INTO CatalogoEstatusAsistencia (
            Abreviatura,
            Descripcion,
            ColorUI,
            ValorNomina,
            VisibleSupervisor,
            Activo,
            DiasRegistroFuturo,
            PermiteComentario,
            TipoCalculoId,
			ConceptoNominaId
        )
        VALUES (
            @Abreviatura,
            @Descripcion,
            @ColorUI,
            @ValorNomina,
            @VisibleSupervisor,
            @Activo,
            @DiasRegistroFuturo,
            @PermiteComentario,
            @TipoCalculoId,
			@ConceptoNominaId
        );
    END
    -- UPDATE (edici�n de registro existente)
    ELSE
    BEGIN
        UPDATE CatalogoEstatusAsistencia
        SET
            Abreviatura = @Abreviatura,
            Descripcion = @Descripcion,
            ColorUI = @ColorUI,
            ValorNomina = @ValorNomina,
            VisibleSupervisor = @VisibleSupervisor,
            Activo = @Activo,
            DiasRegistroFuturo = @DiasRegistroFuturo,
            PermiteComentario = @PermiteComentario,
            TipoCalculoId = @TipoCalculoId,
			ConceptoNominaId = @ConceptoNominaId
        WHERE EstatusId = @EstatusId;
    END
END
GO