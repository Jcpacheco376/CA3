@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM ============================================================
REM  Lee variables de .env.deploy
REM ============================================================
if not exist ".env.deploy" (
  echo [ERROR] Falta el archivo .env.deploy en esta carpeta.
  exit /b 1
)

for /f "usebackq tokens=1,* delims==" %%A in (".env.deploy") do (
  if not "%%A"=="" set "%%A=%%B"
)

REM Validaciones basicas
if "%DEPLOY_HOST%"=="" echo [ERROR] Falta DEPLOY_HOST en .env.deploy & exit /b 1
if "%DEPLOY_USER%"=="" echo [ERROR] Falta DEPLOY_USER en .env.deploy & exit /b 1
if "%DEPLOY_PASSWORD%"=="" echo [ERROR] Falta DEPLOY_PASSWORD en .env.deploy & exit /b 1
if "%FRONTEND_PATH%"=="" echo [ERROR] Falta FRONTEND_PATH en .env.deploy & exit /b 1
if "%API_PATH%"=="" echo [ERROR] Falta API_PATH en .env.deploy & exit /b 1

REM Ruta local (en el servidor) para la API. Permite override via .env.deploy
if "%API_LOCAL_DIR%"=="" set "API_LOCAL_DIR=D:\CA\api-asistencia"

REM Ruta a PM2 en el servidor (usuario especifico)
set "PM2_CMD=C:\Users\%DEPLOY_USER%\AppData\Roaming\npm\pm2.cmd"

echo.
echo ==========================================
echo   INICIANDO DESPLIEGUE (FRONT + API)
echo ==========================================
echo Servidor: %DEPLOY_HOST%
echo Usuario : %DEPLOY_USER%
echo API dir : %API_LOCAL_DIR%
echo.

REM ============================================================
REM  1) Copiar FRONTEND (dist) y web.config
REM ============================================================
echo --- 1) Copiando Frontend ---
robocopy ".\CONTROL-DE-ASISTENCIA\dist" "\\%DEPLOY_HOST%%FRONTEND_PATH%" /E /PURGE >nul
if errorlevel 8 echo [ADVERTENCIA] Robocopy reporto codigos >=8 al copiar el FRONTEND.

copy /Y ".\CONTROL-DE-ASISTENCIA\web.config" "\\%DEPLOY_HOST%%FRONTEND_PATH%\web.config" >nul
if errorlevel 1 echo [ADVERTENCIA] No se pudo copiar web.config del Frontend (verifica ruta).

echo Frontend OK.
echo.

REM ============================================================
REM  2) Copiar API (dist, package.json, .env)
REM ============================================================
echo --- 2) Copiando API (dist, package.json, .env) ---
robocopy ".\CONTROL-DE-ASISTENCIA-API\dist" "\\%DEPLOY_HOST%%API_PATH%\dist" /E /PURGE >nul
if errorlevel 8 echo [ADVERTENCIA] Robocopy reporto codigos >=8 al copiar la carpeta dist de la API.

copy /Y ".\CONTROL-DE-ASISTENCIA-API\package.json" "\\%DEPLOY_HOST%%API_PATH%\package.json" >nul
if errorlevel 1 echo [ADVERTENCIA] No se pudo copiar package.json (verifica ruta).

REM Copia el archivo de entorno. Ajusta el origen segun tu repo (.env.production -> .env)
if exist ".\CONTROL-DE-ASISTENCIA-API\.env.production" (
  copy /Y ".\CONTROL-DE-ASISTENCIA-API\.env.production" "\\%DEPLOY_HOST%%API_PATH%\.env" >nul
) else if exist ".\CONTROL-DE-ASISTENCIA-API\.env" (
  copy /Y ".\CONTROL-DE-ASISTENCIA-API\.env" "\\%DEPLOY_HOST%%API_PATH%\.env" >nul
) else (
  echo [ADVERTENCIA] No encontre .env ni .env.production en CONTROL-DE-ASISTENCIA-API. Continua, pero valida tus variables.
)

echo API copiada.
echo.

REM ============================================================
REM  3) Instalar dependencias en el servidor
REM ============================================================
echo --- 3) Instalando dependencias en el servidor ---
psexec \\%DEPLOY_HOST% -u %DEPLOY_USER% -p %DEPLOY_PASSWORD% ^
  cmd /c "cd /d %API_LOCAL_DIR% && if exist package-lock.json (npm ci --omit=dev) else (npm install --production)"
if errorlevel 1 (
  echo [ERROR] Fallo 'npm install' remoto.
  exit /b 1
)
echo Dependencias instaladas.
echo.

REM ============================================================
REM  4) Levantar/Reiniciar con PM2 + guardar estado
REM ============================================================
echo --- 4) Levantando/Reiniciando API con PM2 ---
psexec \\%DEPLOY_HOST% -u %DEPLOY_USER% -p %DEPLOY_PASSWORD% ^
  cmd /c "cd /d %API_LOCAL_DIR% && ^"%PM2_CMD%^" restart CAAPI || ^"%PM2_CMD%^" start dist\index.js --name CAAPI"
if errorlevel 1 (
  echo [ERROR] No se pudo iniciar CAAPI con PM2.
  exit /b 1
)

REM Guardar lista de procesos para 'resurrect'
psexec \\%DEPLOY_HOST% -u %DEPLOY_USER% -p %DEPLOY_PASSWORD% ^
  cmd /c "^"%PM2_CMD%^" save"
echo PM2 guardado.
echo.

REM (Opcional) Mostrar estado
psexec \\%DEPLOY_HOST% -u %DEPLOY_USER% -p %DEPLOY_PASSWORD% ^
  cmd /c "^"%PM2_CMD%^" list"

echo.
echo ==========================================
echo   DESPLIEGUE COMPLETADO
echo ==========================================
exit /b 0
