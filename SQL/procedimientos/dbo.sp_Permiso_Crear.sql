-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Permiso_Crear]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.47
-- Compilado:           06/03/2026, 16:41:33
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

CREATE OR ALTER PROCEDURE sp_Permiso_Crear
    @NombrePermiso NVARCHAR(100),
    @Descripcion NVARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS (SELECT 1 FROM SISPermisos WHERE NombrePermiso = @NombrePermiso)
    BEGIN
        INSERT INTO SISPermisos (NombrePermiso, Descripcion)
        VALUES (@NombrePermiso, @Descripcion);
    END
    ELSE
    BEGIN
        RAISERROR ('El nombre del permiso ya existe.', 16, 1);
        RETURN;
    END
END
GO