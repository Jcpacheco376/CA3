@echo off
setlocal
:: Asegurar que el directorio de trabajo sea donde reside el archivo .bat
cd /d "%~dp0"

:: ============================================================
::  CA3 - Instalador del Sistema (Modo EXE Protegido)
:: ============================================================
TITLE CA3 Control de Asistencia - Instalador

:: ── Verificar si ya hay permisos de Admin ─────────────────────────────
net session >nul 2>&1
if %errorlevel% equ 0 goto :ADMIN_OK

:: ── Solicitar elevacion UAC automaticamente ───────────────────────────
echo Solicitando permisos de administrador...
powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs -Wait"
exit /b

:ADMIN_OK
:: ── Lanzar asistente EXE ─────────────────────────────────────────────
echo Iniciando asistente de instalacion...

if exist "instalar.exe" (
  start "" "instalar.exe"
) else (
  echo [ERROR] No se encontro instalar.exe. 
  echo Verifique que su paquete este completo.
  pause
)

exit /b 0
