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
:: ── Lanzar wizard EXE protegigo ───────────────────────────────────────
echo Iniciando asistente de instalacion...
if exist instalar.exe (
  start "" instalar.exe
) else (
  echo [ERROR] No se encontro instalar.exe. Verifique su paquete.
  pause
)
exit /b 0
