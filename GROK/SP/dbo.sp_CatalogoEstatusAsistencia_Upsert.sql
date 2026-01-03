IF OBJECT_ID('dbo.sp_CatalogoEstatusAsistencia_Upsert') IS NOT NULL      DROP PROCEDURE dbo.sp_CatalogoEstatusAsistencia_Upsert;
GO

CREATE   PROCEDURE [dbo].[sp_CatalogoEstatusAsistencia_Upsert]
    @EstatusId INT,
    @Abreviatura NVARCHAR(10),
    @Descripcion NVARCHAR(100),
    @ColorUI NVARCHAR(20),
    @ValorNomina DECIMAL(5,2),
    @VisibleSupervisor BIT,
    @Activo BIT,
    @Tipo NVARCHAR(50),
    @EsFalta BIT,
    @EsRetardo BIT,
	@EsDescanso BIT,
    @EsEntradaSalidaIncompleta BIT,
    @EsAsistencia BIT,
    @DiasRegistroFuturo INT,
    @PermiteComentario BIT,
    @Esdefault BIT,
	@SinHorario BIT
AS
BEGIN
    SET NOCOUNT ON;

    -- 1. LÓGICA DE PROTECCIÓN (No dejar huérfanos)
    IF @EstatusId > 0 AND @Esdefault = 0
    BEGIN
        IF EXISTS (SELECT 1 FROM dbo.CatalogoEstatusAsistencia 
                   WHERE EstatusId = @EstatusId AND Esdefault = 1)
        BEGIN
            SET @Esdefault = 1; 
        END
    END

    -- 2. INSERT O UPDATE
    MERGE dbo.CatalogoEstatusAsistencia AS target
    USING (SELECT @EstatusId AS EstatusId) AS source
    ON (target.EstatusId = source.EstatusId)
    
    WHEN MATCHED THEN
        UPDATE SET 
            Abreviatura = @Abreviatura,
            Descripcion = @Descripcion,
            ColorUI = @ColorUI,
            ValorNomina = @ValorNomina,
            VisibleSupervisor = @VisibleSupervisor,
            Activo = @Activo,
            Tipo = @Tipo,
            EsFalta = @EsFalta,
            EsRetardo = @EsRetardo,
            EsEntradaSalidaIncompleta = @EsEntradaSalidaIncompleta,
            EsAsistencia = @EsAsistencia,
            DiasRegistroFuturo = @DiasRegistroFuturo,
            PermiteComentario = @PermiteComentario,
            Esdefault = @Esdefault,
			SinHorario = @SinHorario  
            
    WHEN NOT MATCHED THEN
        INSERT (Abreviatura, Descripcion, ColorUI, ValorNomina, VisibleSupervisor, Activo, Tipo, EsFalta, EsRetardo, EsEntradaSalidaIncompleta, EsAsistencia, DiasRegistroFuturo, PermiteComentario, Esdefault, SinHorario)
        VALUES (@Abreviatura, @Descripcion, @ColorUI, @ValorNomina, @VisibleSupervisor, @Activo, @Tipo, @EsFalta, @EsRetardo, @EsEntradaSalidaIncompleta, @EsAsistencia, @DiasRegistroFuturo, @PermiteComentario, @Esdefault,@SinHorario);

    -- Capturar el ID (nuevo o existente)
    DECLARE @RealId INT = ISNULL(NULLIF(@EstatusId, 0), SCOPE_IDENTITY());

    IF @Esdefault = 1
    BEGIN
        IF @EsFalta = 1 
            UPDATE dbo.CatalogoEstatusAsistencia SET Esdefault = 0 WHERE EsFalta = 1 AND EstatusId <> @RealId;
            
        IF @EsAsistencia = 1 
            UPDATE dbo.CatalogoEstatusAsistencia SET Esdefault = 0 WHERE EsAsistencia = 1 AND EstatusId <> @RealId;
            
        IF @EsRetardo = 1 
            UPDATE dbo.CatalogoEstatusAsistencia SET Esdefault = 0 WHERE EsRetardo = 1 AND EstatusId <> @RealId;
            
        IF @EsEntradaSalidaIncompleta = 1 
            UPDATE dbo.CatalogoEstatusAsistencia SET Esdefault = 0 WHERE EsEntradaSalidaIncompleta = 1 AND EstatusId <> @RealId;
            
        IF @Esdescanso = 1
             UPDATE dbo.CatalogoEstatusAsistencia SET Esdefault = 0 WHERE EsDescanso = 1 AND EstatusId <> @RealId;
    END
END


