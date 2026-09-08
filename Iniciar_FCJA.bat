@echo off
chcp 65001 > NUL
:: Garante que o script rode a partir da pasta onde ele esta salvo
cd /d "%~dp0"

echo ==========================================
echo    PREPARANDO O SISTEMA GED - FCJA
echo ==========================================
echo.
echo 1/4 - Verificando e limpando sessoes antigas...
taskkill /FI "WINDOWTITLE eq FCJA_Backend*" /T /F > NUL 2>&1
taskkill /IM node.exe /T /F > NUL 2>&1
taskkill /FI "WINDOWTITLE eq FCJA_Frontend*" /T /F > NUL 2>&1

echo 2/4 - Limpando o cache temporario...
if exist "frontend\.vinxi" rmdir /s /q "frontend\.vinxi"

echo 3/4 - Ligando os motores de forma limpa...
start "FCJA_Backend" /MIN cmd /c "title FCJA_Backend && cd backend && python -m uvicorn main:app"
start "FCJA_Frontend" /MIN cmd /c "title FCJA_Frontend && cd frontend && npm run dev"

echo Aguardando inicializacao dos modulos (6 segundos)...
timeout /t 6 /nobreak > NUL

echo 4/4 - Abrindo o navegador...
start http://localhost:8080

echo.
echo ==========================================
echo   O SISTEMA ESTA RODANDO NO NAVEGADOR!
echo ==========================================
echo.
echo Quando voce terminar de usar o sistema,
echo volte aqui e APERTE QUALQUER TECLA para
echo desligar tudo de forma segura.
echo.
pause

echo.
echo Desligando os motores e limpando a memoria...
taskkill /FI "WINDOWTITLE eq FCJA_Backend*" /T /F > NUL 2>&1
taskkill /IM node.exe /T /F > NUL 2>&1
taskkill /FI "WINDOWTITLE eq FCJA_Frontend*" /T /F > NUL 2>&1

echo Sistema desligado com sucesso!
timeout /t 2 > NUL
exit