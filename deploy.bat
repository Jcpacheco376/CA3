@echo off
setlocal enabledelayedexpansion

echo Leyendo variables de configuracion...

REM Lee el archivo .env.deploy de forma segura
for /f "usebackq tokens=1,* delims==" %%A in (".env.deploy") do (
    set "%%A=%%B"
)

echo.
echo =================================
echo  INICIANDO DESPLIEGUE LOCAL
echo =================================
echo Servidor destino: %DEPLOY_HOST%
echo.

echo --- 1. Copiando Frontend ---
robocopy ".\CONTROL-DE-ASISTENCIA\dist" "\\%DEPLOY_HOST%\%FRONTEND_PATH%" /E /PURGE
echo Frontend copiado.
echo.

echo --- 2. Copiando API ---
robocopy ".\CONTROL-DE-ASISTENCIA-API\dist" "\\%DEPLOY_HOST%\%API_PATH%\dist" /E /PURGE
robocopy ".\CONTROL-DE-ASISTENCIA-API\node_modules" "\\%DEPLOY_HOST%\%API_PATH%\node_modules" /E /PURGE
copy ".\CONTROL-DE-ASISTENCIA-API\package.json" "\\%DEPLOY_HOST%\%API_PATH%\package.json"
copy ".\CONTROL-DE-ASISTENCIA-API\.env.production" "\\%DEPLOY_HOST%\%API_PATH%\.env"
echo API copiada.
echo.

echo --- 3. Reiniciando API en el servidor ---
REM psexec se conecta y ejecuta el comando 'pm2 restart' dentro de un cmd remoto para asegurar que encuentre PM2
psexec \\%DEPLOY_HOST% -u %DEPLOY_USER% -p %DEPLOY_PASSWORD% cmd /c "pm2 restart CAAPI"
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Falla al reiniciar la API. Verifique sus credenciales, la ruta de red y que el proceso 'api-asistencia' exista en PM2.
    goto :eof
)
echo API reiniciada exitosamente.
echo.

echo =================================
echo  DESPLIEGUE COMPLETADO
echo =================================