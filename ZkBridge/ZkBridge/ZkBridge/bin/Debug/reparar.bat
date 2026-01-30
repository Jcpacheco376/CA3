@echo off
echo --- DETENIENDO PROCESOS ---
taskkill /f /im ZkBridge.exe >nul 2>&1
taskkill /f /im node.exe >nul 2>&1

echo.
echo --- LIMPIEZA DE REGISTRO ---
cd /d C:\Windows\SysWOW64
regsvr32 /u /s zkemkeeper.dll
echo Des-registro completado.

echo.
echo --- REGISTRO FORZADO ---
regsvr32 /s zkemkeeper.dll
if %errorlevel% equ 0 (
    echo EXITO: Libreria registrada correctamente.
) else (
    echo ERROR: No se pudo registrar. Ejecuta como Administrador.
)

pause