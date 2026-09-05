@echo off
chcp 65001 > nul
color 0A
echo ===================================================
echo      INSTALADOR AUTOMATICO - FCJA DOCS
echo ===================================================
echo.

echo [1/3] Verificando ferramentas base...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo [X] ERRO: Python nao encontrado! 
    echo Por favor, baixe em python.org e lembre-se de marcar a caixa "Add Python to PATH" na instalacao.
    echo.
    pause
    exit /b
)

npm --version >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo [X] ERRO: Node.js (npm) nao encontrado! 
    echo Por favor, baixe e instale a versao LTS em nodejs.org.
    echo.
    pause
    exit /b
)
echo [OK] Python e Node.js encontrados!
echo.

echo [2/3] Instalando bibliotecas do Backend (Python)...
cd backend
python -m pip install --upgrade pip >nul 2>&1
pip install fastapi uvicorn python-multipart pydantic
cd ..
echo [OK] Backend configurado!
echo.

echo [3/3] Instalando bibliotecas do Frontend (React)...
cd frontend
call npm install
cd ..
echo [OK] Frontend configurado!
echo.

echo ===================================================
echo SUCESSO! O ambiente foi montado perfeitamente.
echo Voce ja pode ligar o sistema no seu .bat principal.
echo ===================================================
pause