@echo off
setlocal enabledelayedexpansion

echo Leyendo variables de configuracion...
for /f "usebackq tokens=1,* delims==" %%A in (".env.deploy") do (
    set "%%A=%%B"
)

echo.
echo =================================
echo  DESPLIEGUE A SERVIDOR (MODO HIBRIDO)
echo =================================
echo Servidor destino: %DEPLOY_HOST%
echo Rutas: %FRONTEND_PATH% y %API_PATH%
echo.

REM --- Validar rutas en .env.deploy ---
REM Asegúrate que en tu .env.deploy:
REM FRONTEND_PATH sea "CA\frontend-asistencia" (o similar)
REM API_PATH sea "CA\api-asistencia"

echo --- 1. Copiando Frontend (Archivos Estaticos) ---
REM Copiamos dist a la carpeta que el backend buscara (frontend-asistencia)
robocopy ".\CONTROL-DE-ASISTENCIA\dist" "\\%DEPLOY_HOST%\%FRONTEND_PATH%" /E /PURGE
echo Frontend actualizado.
echo.

echo --- 2. Copiando API (Codigo Compilado) ---
REM Copiamos el codigo compilado a la carpeta dist del servidor
robocopy ".\CONTROL-DE-ASISTENCIA-API\dist" "\\%DEPLOY_HOST%\%API_PATH%\dist" /E /PURGE
REM Copiamos package.json por si hubo cambios en dependencias
copy /Y ".\CONTROL-DE-ASISTENCIA-API\package.json" "\\%DEPLOY_HOST%\%API_PATH%\package.json"

REM --- NOTA IMPORTANTE ---
REM NO copiamos el .env para no sobrescribir la IP/Configuracion del servidor.
REM Si necesitas actualizar variables, hazlo manualmente en el servidor.
echo API actualizada (Codigo).
echo.

echo --- 3. Instalando dependencias remotamente ---
REM Usamos 'call npm install' para evitar problemas en scripts batch
psexec \\%DEPLOY_HOST% -u %DEPLOY_USER% -p %DEPLOY_PASSWORD% cmd /c "cd /d D:\CA\api-asistencia && npm install --production"
echo Dependencias actualizadas.
echo.

echo --- 4. Reiniciando Servicio PM2 ---
REM Asumimos que ya tienes un proceso PM2 corriendo llamado "CAAPI" o similar
set "PM2_PATH=C:\Users\%DEPLOY_USER%\AppData\Roaming\npm\pm2.cmd"

REM Reiniciar. Si no existe, iniciarlo apuntando al nuevo index.js
set "PM2_COMMAND=%PM2_PATH% restart CAAPI || %PM2_PATH% start dist/index.js --name CAAPI"

psexec \\%DEPLOY_HOST% -u %DEPLOY_USER% -p %DEPLOY_PASSWORD% cmd /c "cd /d D:\CA\api-asistencia && %PM2_COMMAND%"

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Falla al reiniciar el servicio en el servidor.
    goto :eof
)

echo.
echo =================================
echo  DESPLIEGUE EXITOSO
echo =================================
echo El sistema deberia estar accesible en: http://%DEPLOY_HOST%:3001
pause