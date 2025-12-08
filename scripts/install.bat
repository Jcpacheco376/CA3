@echo off
TITLE Instalador Sistema Asistencia
CLS
ECHO Verificando Node.js...
node -v >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    ECHO [ERROR] Necesitas instalar Node.js para continuar.
    PAUSE
    EXIT
)

ECHO Iniciando asistente...
node setup.js