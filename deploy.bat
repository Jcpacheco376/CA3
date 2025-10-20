@echo off
<<<<<<< HEAD
echo Leyendo variables de configuracion...

REM Lee el archivo .env.deploy y establece las variables de entorno
for /f "tokens=1,* delims==" %%A in (.env.deploy) do (
=======
setlocal enabledelayedexpansion

echo Leyendo variables de configuracion...
for /f "usebackq tokens=1,* delims==" %%A in (".env.deploy") do (
>>>>>>> develop
    set "%%A=%%B"
)

echo.
echo =================================
echo  INICIANDO DESPLIEGUE LOCAL
echo =================================
echo Servidor destino: %DEPLOY_HOST%
echo.

echo --- 1. Copiando Frontend ---
<<<<<<< HEAD
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
=======
REM Paso 1A: Copia los archivos de la app (dist) y borra los viejos
robocopy ".\CONTROL-DE-ASISTENCIA\dist" "\\%DEPLOY_HOST%\%FRONTEND_PATH%" /E /PURGE
REM Paso 1B: Copia el web.config para que no sea borrado por PURGE
copy ".\CONTROL-DE-ASISTENCIA\web.config" "\\%DEPLOY_HOST%\%FRONTEND_PATH%\web.config"
echo Frontend copiado.
echo.

echo --- 2. Copiando API (Codigo y Configuracion) ---
robocopy ".\CONTROL-DE-ASISTENCIA-API\dist" "\\%DEPLOY_HOST%\%API_PATH%\dist" /E /PURGE
copy ".\CONTROL-DE-ASISTENCIA-API\package.json" "\\%DEPLOY_HOST%\%API_PATH%\package.json"
copy ".\CONTROL-DE-ASISTENCIA-API\.env.production" "\\%DEPLOY_HOST%\%API_PATH%\dist\.env"
echo API copiada.
echo.

echo --- 3. Instalando dependencias remotamente EN EL SERVIDOR ---
psexec \\%DEPLOY_HOST% -u %DEPLOY_USER% -p %DEPLOY_PASSWORD% cmd /c "cd /d D:\CA\api-asistencia && npm install --production"
echo Dependencias de API instaladas en el servidor.
echo.

echo --- 4. Iniciando/Reiniciando API en el servidor (Version Robusta) ---
set "PM2_PATH=C:\Users\%DEPLOY_USER%\AppData\Roaming\npm\pm2.cmd"
set "PM2_COMMAND=%PM2_PATH% restart CAAPI || %PM2_PATH% start dist/index.js --name CAAPI"
psexec \\%DEPLOY_HOST% -u %DEPLOY_USER% -p %DEPLOY_PASSWORD% cmd /c "cd /d D:\CA\api-asistencia && %PM2_COMMAND%"
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Falla al iniciar la API.
    goto :eof
)
echo API iniciada/reiniciada exitosamente.
>>>>>>> develop
echo.

echo =================================
echo  DESPLIEGUE COMPLETADO
echo =================================