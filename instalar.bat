@echo off
setlocal
:: Asegurar que el directorio de trabajo sea donde reside el archivo .bat
cd /d "%~dp0"

:: ============================================================
::  CA3 - Instalador del Sistema de Control de Asistencia
::  instalar.bat - Entrada principal del instalador
:: ============================================================
TITLE CA3 Control de Asistencia - Instalador

:: ── Verificar si ya hay permisos de Admin ─────────────────────────────
net session >nul 2>&1
if %errorlevel% equ 0 goto :ADMIN_OK

:: ── Solicitar elevación UAC automáticamente ───────────────────────────
echo Solicitando permisos de administrador...
powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs -Wait"
exit /b

:ADMIN_OK
:: ── Lanzar asistente (Deteccion Hibrida) ─────────────────────────────
echo Iniciando asistente de instalacion...

:: Buscamos instalar.exe en la raiz (Modo EXE)
if exist "instalar.exe" (
  echo [MODO] Binario Protegido (EXE)
  start "" "instalar.exe"
  goto :EOF
)

:: Si no esta en la raiz, buscamos el codigo fuente (Modo Script)
if exist "installer\server.js" (
  echo [MODO] Codigo Abierto (Node.js)
  
  :: Requerimos Node.js en el PATH para este modo
  where node >nul 2>&1
  if %errorlevel% equ 0 (
    start /min "" node "installer/server.js"
  ) else (
    echo [ERROR] No se encontro Node.js instalado. 
    echo Para ejecutar el instalador en modo script, por favor instale Node.js.
    pause
  )
  goto :EOF
)

:: Error final si no encuentra nada
echo [ERROR] No se encontro el asistente de instalacion.
echo Verifique que su paquete contiene 'instalar.exe' o la carpeta 'installer/'.
pause

:EOF
exit /b 0
