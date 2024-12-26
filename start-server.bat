@echo off
:: Configura o título da janela
title Inicialização do Servidor Node.js

:: Verifica se o Node.js está instalado
echo Verificando se o Node.js está instalado...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo Node.js não está instalado. Execute o arquivo install-dependencies.bat primeiro.
    pause
    exit /b 1
)

:: Inicia o servidor Node.js
echo Iniciando o servidor...
start "" cmd /k "node express.mjs"

:: Mantém a janela aberta após iniciar
echo Servidor iniciado. Logs estão sendo exibidos em uma nova janela.
pause