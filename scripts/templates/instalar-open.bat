@echo off
setlocal
:: Asegurar que el directorio de trabajo sea donde reside el archivo .bat
cd /d "%~dp0"

:: ============================================================
::  CA3 - Instalador del Sistema (Modo Codigo Abierto)
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
:: ── Verificar Node.js ─────────────────────────────────────────────────
node -v >nul 2>&1
if %errorlevel% neq 0 (
  echo.
  echo ============================================
  echo  ATENCION: Node.js no esta instalado
  echo ============================================
  echo.
  echo  Para instalar el sistema necesita Node.js.
  echo  Se abrira la pagina de descarga en su
  echo  navegador. Instale Node.js y luego vuelva
  echo  a ejecutar este archivo.
  echo.
  pause
  start https://nodejs.org/es/download
  exit /b 1
)

:: ── Instalar dependencias del wizard ──────────────────────────────────
echo.
echo Preparando el asistente de instalacion...
if exist "installer\server.js" (
  cd /d "installer"
  if not exist node_modules (
    echo Instalando dependencias necesarias...
    call npm install --production --silent
    if %errorlevel% neq 0 (
      echo [ERROR] No se pudieron instalar las dependencias del instalador.
      pause
      exit /b 1
    )
  )
  
  :: Lanzar wizard
  echo Iniciando asistente visual...
  start "" /B node server.js
) else (
  echo [ERROR] No se encontro la carpeta installer/server.js.
  pause
  exit /b 1
)

exit /b 0
