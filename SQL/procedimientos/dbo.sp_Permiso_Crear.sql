-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Permiso_Crear]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.5.13
-- Compilado:           21/03/2026, 14:38:21
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