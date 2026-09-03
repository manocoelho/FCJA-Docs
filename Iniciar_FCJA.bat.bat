@echo off
chcp 65001 > NUL
:: Garante que o script rode a partir da pasta onde ele esta salvo
cd /d "%~dp0"

echo ==========================================
echo    SISTEMA GED - FCJA EM EXECUCAO
echo ==========================================
echo.
echo Ligando os motores em segundo plano...

:: Inicia os motores com nomes de janela especificos para podermos acha-los depois
start "FCJA_Backend" /MIN cmd /c "cd backend && python -m uvicorn main:app"
start "FCJA_Frontend" /MIN cmd /c "cd frontend && bun run dev"

echo Aguardando inicializacao...
timeout /t 4 /nobreak > NUL

echo Abrindo o navegador...
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

:: Procura as janelas pelo nome que demos e forca o encerramento dos processos
taskkill /FI "WINDOWTITLE eq FCJA_Backend*" /T /F > NUL 2>&1
taskkill /FI "WINDOWTITLE eq FCJA_Frontend*" /T /F > NUL 2>&1

echo Sistema desligado com sucesso!
timeout /t 2 > NUL
exit