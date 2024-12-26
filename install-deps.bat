@echo off
:: Define o caminho do Node.js e do NPM para verificar se estão instalados
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Node.js nao encontrado. Por favor, instale o Node.js antes de continuar.
    pause
    exit /b
)

:: Inicializa o projeto Node.js, caso o package.json ainda não exista
if not exist package.json (
    echo Inicializando o projeto Node.js...
    npm init -y
)

:: Instalar as dependências do projeto
echo Instalando dependencias necessarias...
npm install express multer axios sqlite3 cors pdf-poppler pdfjs-dist exceljs tesseract.js canvas

:: Verifica o status da instalação
if %errorlevel% neq 0 (
    echo Ocorreu um erro durante a instalacao das dependencias.
    pause
    exit /b
)

echo Todas as dependencias foram instaladas com sucesso!
pause
