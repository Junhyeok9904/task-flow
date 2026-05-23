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
set "prod_port=6000"

:PORT_CHECK_LOOP
netstat -ano | findstr /R /C:":%prod_port% " >nul 2>&1
if %errorlevel% equ 0 (
    echo [!] Port %prod_port% is in use. Trying next port...
    set /a prod_port+=1
    goto PORT_CHECK_LOOP
)

echo [O] Found available port for Production: %prod_port%
echo [!] Building Task-Flow...
call npm run build

echo [!] Starting Task-Flow Production Server on port %prod_port% in background...
start "Task-Flow Production Server" npx next start -p %prod_port%

echo [!] Waiting for server to initialize (5s)...
timeout /t 5 >nul

echo [!] Starting Cloudflare Tunnel automatically...
set "API_URL=http://localhost:%prod_port%/api/tunnel"
for /f "delims=" %%j in ('curl -s -X POST "%API_URL%" -H "Content-Type: application/json" -d "{\"action\":\"start\"}" 2^>nul') do set START_RESP=%%j

echo.
echo ===========================================
echo    Task-Flow Production URL and Tunnel Info
echo ===========================================
echo %START_RESP%
echo ===========================================
echo.
echo Press [Enter] at any time to stop the server and tunnel...
pause >nul

echo.
echo [!] Stopping Cloudflare Tunnel...
curl -s -X POST "%API_URL%" -H "Content-Type: application/json" -d "{\"action\":\"stop\"}" >nul 2>nul
echo [!] Stopping Next.js Server process...
taskkill /FI "WINDOWTITLE eq Task-Flow Production Server*" >nul 2>nul
echo [O] Cleanup complete.
goto END

:DEV_MODE
echo [!] Starting Task-Flow Development Server...
call npm run dev
goto END

:END
pause
