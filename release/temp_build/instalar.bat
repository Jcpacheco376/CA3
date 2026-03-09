@echo off
:: ============================================================
::  CA3 — Instalador del Sistema de Control de Asistencia
::  instalar.bat — Entrada principal del instalador
:: ============================================================
TITLE CA3 Control de Asistencia — Instalador

:: ── Verificar si ya hay permisos de Admin ─────────────────────────────
net session >nul 2>&1
if %errorlevel% equ 0 goto :ADMIN_OK

:: ── Solicitar elevación UAC automáticamente ───────────────────────────
echo Solicitando permisos de administrador...
powershell -NoProfile -Command ^
  "Start-Process -FilePath '%~f0' -Verb RunAs -Wait"
exit /b

:ADMIN_OK
:: ── Verificar Node.js ─────────────────────────────────────────────────
node -v >nul 2>&1
if %errorlevel% neq 0 (
  echo.
  echo ============================================
  echo  ATENCION: Node.js no está instalado
  echo ============================================
  echo.
  echo  Para instalar el sistema necesita Node.js.
  echo  Se abrirá la página de descarga en su
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
cd /d "%~dp0installer"
if not exist node_modules (
  call npm install --production --silent
  if %errorlevel% neq 0 (
    echo [ERROR] No se pudieron instalar las dependencias del instalador.
    pause
    exit /b 1
  )
)

:: ── Lanzar wizard en background y abrir browser ───────────────────────
echo Iniciando asistente visual...
start "" /B node server.js
exit /b 0
