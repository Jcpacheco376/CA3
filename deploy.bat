@echo off
echo Leyendo variables de configuracion...

REM Lee el archivo .env.deploy y establece las variables de entorno
for /f "tokens=1,* delims==" %%A in (.env.deploy) do (
    set "%%A=%%B"
)

echo.
echo =================================
echo  INICIANDO DESPLIEGUE LOCAL
echo =================================
echo Servidor destino: %DEPLOY_HOST%
echo.

echo --- 1. Copiando Frontend ---
robocopy .\CONTROL-DE-ASISTENCIA\dist \\%DEPLOY_HOST%\%FRONTEND_PATH% /E /PURGE
echo.

echo --- 2. Copiando API ---
robocopy .\CONTROL-DE-ASISTENCIA-API\dist \\%DEPLOY_HOST%\%API_PATH%\dist /E /PURGE
robocopy .\CONTROL-DE-ASISTENCIA-API\node_modules \\%DEPLOY_HOST%\%API_PATH%\node_modules /E /PURGE
copy .\CONTROL-DE-ASISTENCIA-API\package.json \\%DEPLOY_HOST%\%API_PATH%\package.json
copy .\CONTROL-DE-ASISTENCIA-API\.env.production \\%DEPLOY_HOST%\%API_PATH%\.env
echo.

echo --- 3. Reiniciando API en el servidor ---
psexec \\%DEPLOY_HOST% -u %DEPLOY_USER% -p %DEPLOY_PASSWORD% pm2 restart api-asistencia
echo.

echo =================================
echo  DESPLIEGUE COMPLETADO
echo =================================