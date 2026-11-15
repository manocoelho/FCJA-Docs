@echo off
chcp 65001 > NUL
cd /d "%~dp0\..\.."

echo ==========================================================
echo    SIGAD FCJA — ORQUESTRACAO VIA DOCKER COMPOSE
echo ==========================================================
echo.

where docker > NUL 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERRO] O Docker Desktop nao foi encontrado no PATH do sistema.
    echo Instale ou inicie o Docker Desktop antes de executar este script.
    pause
    exit /b 1
)

echo [1/3] Construindo imagens e iniciando os containers (db, backend, frontend, nginx)...
docker compose up -d --build
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERRO] Falha ao subir os containers. Verifique se o Docker Desktop esta aberto e em execucao.
    pause
    exit /b 1
)

echo.
echo [2/3] Status dos containers SIGAD FCJA:
docker compose ps

echo.
echo [3/3] Abrindo o sistema no navegador...
start http://localhost:8085

echo.
echo ==========================================================
echo    SISTEMA SIGAD FCJA RODANDO EM DOCKER COMPOSE!
echo ==========================================================
echo  - Gateway Unificado (Nginx): http://localhost:8085
echo  - Frontend Direto:           http://localhost:8080
echo  - API Backend (Swagger):     http://localhost:8000/docs
echo ==========================================================
echo.
pause
