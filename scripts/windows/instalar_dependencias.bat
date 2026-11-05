@echo off
chcp 65001 > nul
color 0A
:: Garante que o script rode a partir da raiz do repositorio
cd /d "%~dp0\..\.."

echo ===================================================
echo      INSTALADOR AUTOMATICO - FCJA DOCS
echo ===================================================
echo.

echo [1/3] Localizando interpretador Python e Node.js...
set "PYTHON_BIN=python"
if exist "%LOCALAPPDATA%\Python\bin\python.exe" (
    set "PYTHON_BIN=%LOCALAPPDATA%\Python\bin\python.exe"
)

"%PYTHON_BIN%" --version >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo [X] ERRO: Python nao encontrado!
    echo Por favor, baixe em python.org e marque a caixa "Add Python to PATH".
    echo.
    pause
    exit /b
)

call npm --version >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo [X] ERRO: Node.js - npm nao encontrado!
    echo Por favor, baixe e instale a versao LTS em nodejs.org.
    echo.
    pause
    exit /b
)
echo [OK] Python (%PYTHON_BIN%) e Node.js encontrados!
echo.

echo [2/3] Instalando bibliotecas do Backend (Python)...
cd backend
"%PYTHON_BIN%" -m pip install --upgrade pip --no-warn-script-location >nul 2>&1
"%PYTHON_BIN%" -m pip install -r requirements.txt --no-warn-script-location
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
echo Voce ja pode ligar o sistema executando scripts\windows\Iniciar_FCJA.bat.
echo ===================================================
pause
