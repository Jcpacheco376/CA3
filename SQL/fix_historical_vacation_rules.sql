-- ─── REGLAS HISTÓRICAS DE VACACIONES (LEY FEDERAL DEL TRABAJO PRE-2023) ───────
-- Estas reglas aplican para periodos cuya vigencia inició antes de 2023.
-- NOTA: Se incluye la columna 'Esquema' necesaria para el sistema.

DECLARE @RuleDate DATE = '1900-01-01';
DECLARE @Esquema VARCHAR(50) = 'Pre-2023';

-- 1-4 años
IF NOT EXISTS (SELECT 1 FROM CatalogoReglasVacaciones WHERE AniosAntiguedad = 1 AND Esquema = @Esquema) INSERT INTO CatalogoReglasVacaciones (AniosAntiguedad, DiasOtorgados, FechaVigencia, Esquema) VALUES (1, 6, @RuleDate, @Esquema);
IF NOT EXISTS (SELECT 1 FROM CatalogoReglasVacaciones WHERE AniosAntiguedad = 2 AND Esquema = @Esquema) INSERT INTO CatalogoReglasVacaciones (AniosAntiguedad, DiasOtorgados, FechaVigencia, Esquema) VALUES (2, 8, @RuleDate, @Esquema);
IF NOT EXISTS (SELECT 1 FROM CatalogoReglasVacaciones WHERE AniosAntiguedad = 3 AND Esquema = @Esquema) INSERT INTO CatalogoReglasVacaciones (AniosAntiguedad, DiasOtorgados, FechaVigencia, Esquema) VALUES (3, 10, @RuleDate, @Esquema);
IF NOT EXISTS (SELECT 1 FROM CatalogoReglasVacaciones WHERE AniosAntiguedad = 4 AND Esquema = @Esquema) INSERT INTO CatalogoReglasVacaciones (AniosAntiguedad, DiasOtorgados, FechaVigencia, Esquema) VALUES (4, 12, @RuleDate, @Esquema);

-- 5-9 años (14 días)
DECLARE @i INT = 5;
WHILE @i <= 9 BEGIN
    IF NOT EXISTS (SELECT 1 FROM CatalogoReglasVacaciones WHERE AniosAntiguedad = @i AND Esquema = @Esquema) INSERT INTO CatalogoReglasVacaciones (AniosAntiguedad, DiasOtorgados, FechaVigencia, Esquema) VALUES (@i, 14, @RuleDate, @Esquema);
    SET @i = @i + 1;
END

-- 10-14 años (16 días)
SET @i = 10;
WHILE @i <= 14 BEGIN
    IF NOT EXISTS (SELECT 1 FROM CatalogoReglasVacaciones WHERE AniosAntiguedad = @i AND Esquema = @Esquema) INSERT INTO CatalogoReglasVacaciones (AniosAntiguedad, DiasOtorgados, FechaVigencia, Esquema) VALUES (@i, 16, @RuleDate, @Esquema);
    SET @i = @i + 1;
END

-- 15-19 años (18 días)
SET @i = 15;
WHILE @i <= 19 BEGIN
    IF NOT EXISTS (SELECT 1 FROM CatalogoReglasVacaciones WHERE AniosAntiguedad = @i AND Esquema = @Esquema) INSERT INTO CatalogoReglasVacaciones (AniosAntiguedad, DiasOtorgados, FechaVigencia, Esquema) VALUES (@i, 18, @RuleDate, @Esquema);
    SET @i = @i + 1;
END

-- 20-24 años (20 días)
SET @i = 20;
WHILE @i <= 24 BEGIN
    IF NOT EXISTS (SELECT 1 FROM CatalogoReglasVacaciones WHERE AniosAntiguedad = @i AND Esquema = @Esquema) INSERT INTO CatalogoReglasVacaciones (AniosAntiguedad, DiasOtorgados, FechaVigencia, Esquema) VALUES (@i, 20, @RuleDate, @Esquema);
    SET @i = @i + 1;
END

-- 25-29 años (22 días)
SET @i = 25;
WHILE @i <= 29 BEGIN
    IF NOT EXISTS (SELECT 1 FROM CatalogoReglasVacaciones WHERE AniosAntiguedad = @i AND Esquema = @Esquema) INSERT INTO CatalogoReglasVacaciones (AniosAntiguedad, DiasOtorgados, FechaVigencia, Esquema) VALUES (@i, 22, @RuleDate, @Esquema);
    SET @i = @i + 1;
END

-- 30-34 años (24 días)
SET @i = 30;
WHILE @i <= 34 BEGIN
    IF NOT EXISTS (SELECT 1 FROM CatalogoReglasVacaciones WHERE AniosAntiguedad = @i AND Esquema = @Esquema) INSERT INTO CatalogoReglasVacaciones (AniosAntiguedad, DiasOtorgados, FechaVigencia, Esquema) VALUES (@i, 24, @RuleDate, @Esquema);
    SET @i = @i + 1;
END

-- 35-39 años (26 días)
SET @i = 35;
WHILE @i <= 39 BEGIN
    IF NOT EXISTS (SELECT 1 FROM CatalogoReglasVacaciones WHERE AniosAntiguedad = @i AND Esquema = @Esquema) INSERT INTO CatalogoReglasVacaciones (AniosAntiguedad, DiasOtorgados, FechaVigencia, Esquema) VALUES (@i, 26, @RuleDate, @Esquema);
    SET @i = @i + 1;
END

-- 40-44 años (28 días)
SET @i = 40;
WHILE @i <= 44 BEGIN
    IF NOT EXISTS (SELECT 1 FROM CatalogoReglasVacaciones WHERE AniosAntiguedad = @i AND Esquema = @Esquema) INSERT INTO CatalogoReglasVacaciones (AniosAntiguedad, DiasOtorgados, FechaVigencia, Esquema) VALUES (@i, 28, @RuleDate, @Esquema);
    SET @i = @i + 1;
END

PRINT 'Reglas históricas de vacaciones (Ley anterior) cargadas exitosamente con columna Esquema.';
GO
