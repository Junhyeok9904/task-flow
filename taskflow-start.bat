@echo off
title Task-Flow Portable
echo ===========================================
echo    Task-Flow Portable Startup Script (Windows)  
echo ===========================================

:: Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [X] Error: Node.js is not installed. Please install Node.js v18 or higher.
    echo Download from: https://nodejs.org/
    pause
    exit /b
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VER=%%i
echo [O] Node.js detected: %NODE_VER%

:: Install dependencies if node_modules doesn't exist
if not exist "node_modules\" (
    echo [!] Installing dependencies...
    call npm install
) else (
    echo [O] Dependencies already installed.
)

echo.
echo Select mode:
echo 1) Production Mode (Faster performance, requires build)
echo 2) Development Mode (Instant start, live reload)
set /p mode="Enter 1 or 2 [Default: 2]: "

if "%mode%"=="1" goto PROD_MODE
goto DEV_MODE

:PROD_MODE
set "prod_port=4000"
set /p input_port="Enter port for Production [Default: 4000]: "
if not "%input_port%"=="" set "prod_port=%input_port%"
echo [!] Building Task-Flow...
call npm run build
echo [!] Starting Task-Flow Production Server on port %prod_port%...
call npx next start -p %prod_port%
goto END

:DEV_MODE
echo [!] Starting Task-Flow Development Server...
call npm run dev
goto END

:END
pause
