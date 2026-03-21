-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Rol_Crear]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.5.13
-- Compilado:           21/03/2026, 14:38:21
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

CREATE OR ALTER PROCEDURE sp_Rol_Crear
    @NombreRol NVARCHAR(50),
    @Descripcion NVARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS (SELECT 1 FROM Roles WHERE NombreRol = @NombreRol)
    BEGIN
        INSERT INTO Roles (NombreRol, Descripcion)
        VALUES (@NombreRol, @Descripcion);
    END
    ELSE
    BEGIN
        RAISERROR ('El nombre del rol ya existe.', 16, 1);
        RETURN;
    END
END
GO