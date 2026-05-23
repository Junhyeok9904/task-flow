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
set "prod_port=6001"

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

set "START_RESP_ENV=%START_RESP%"
for /f "tokens=*" %%u in ('node -e "try { console.log(JSON.parse(process.env.START_RESP_ENV).url || ''); } catch(e) { console.log(''); }"') do set TUNNEL_URL=%%u
for /f "tokens=*" %%s in ('node -e "try { console.log(JSON.parse(process.env.START_RESP_ENV).status || ''); } catch(e) { console.log(''); }"') do set TUNNEL_STATUS=%%s
for /f "tokens=*" %%e in ('node -e "try { console.log(JSON.parse(process.env.START_RESP_ENV).error || ''); } catch(e) { console.log(''); }"') do set TUNNEL_ERR=%%e

echo.
echo ===========================================
echo    Task-Flow Production URL and Tunnel Info
echo ===========================================
if not "%TUNNEL_URL%"=="" (
    echo  [O] Status: %TUNNEL_STATUS%
    echo  [O] Public URL: %TUNNEL_URL%
    echo  [O] Local URL:  http://localhost:%prod_port%
) else (
    echo  [X] Status: Error
    if not "%TUNNEL_ERR%"=="" (
        echo  [X] Error Details: %TUNNEL_ERR%
    ) else (
        echo  [X] Could not start or parse tunnel info.
    )
)
echo ===========================================

if "%TUNNEL_URL%"=="" goto SHARE_SKIP

echo.
echo Select tunnel URL sharing option:
echo 1) Open URL in Brave Browser (PC) to use Brave Sync/Send-to-device
echo 2) Open QR Code image in Browser (Scan with Mobile Camera)
echo 3) Send directly to connected Android Mobile (via ADB)
echo 4) Skip sharing [Default: 4]
set /p share_choice="Enter choice (1-4): "

if "%share_choice%"=="1" goto SHARE_BRAVE
if "%share_choice%"=="2" goto SHARE_QR
if "%share_choice%"=="3" goto SHARE_ADB
goto SHARE_SKIP

:SHARE_BRAVE
set "BRAVE_PATH="
if exist "C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe" set "BRAVE_PATH=C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe"
if not defined BRAVE_PATH if exist "C:\Program Files (x86)\BraveSoftware\Brave-Browser\Application\brave.exe" set "BRAVE_PATH=C:\Program Files (x86)\BraveSoftware\Brave-Browser\Application\brave.exe"
if not defined BRAVE_PATH if exist "%LocalAppData%\BraveSoftware\Brave-Browser\Application\brave.exe" set "BRAVE_PATH=%LocalAppData%\BraveSoftware\Brave-Browser\Application\brave.exe"

if defined BRAVE_PATH (
    echo [!] Opening Brave Browser with tunnel URL...
    start "" "%BRAVE_PATH%" "%TUNNEL_URL%"
    echo [!] Triggering Brave keyboard macro to auto-send tab to mobile...
    start /b powershell.exe -ExecutionPolicy Bypass -File "%~dp0scripts\auto-send.ps1"
) else (
    echo [!] Brave Browser not found in standard paths. Opening in default browser...
    start "" "%TUNNEL_URL%"
)
goto SHARE_SKIP

:SHARE_QR
set "BRAVE_PATH="
if exist "C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe" set "BRAVE_PATH=C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe"
if not defined BRAVE_PATH if exist "C:\Program Files (x86)\BraveSoftware\Brave-Browser\Application\brave.exe" set "BRAVE_PATH=C:\Program Files (x86)\BraveSoftware\Brave-Browser\Application\brave.exe"
if not defined BRAVE_PATH if exist "%LocalAppData%\BraveSoftware\Brave-Browser\Application\brave.exe" set "BRAVE_PATH=%LocalAppData%\BraveSoftware\Brave-Browser\Application\brave.exe"

if defined BRAVE_PATH (
    echo [!] Opening QR Code in Brave Browser...
    start "" "%BRAVE_PATH%" "https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=%TUNNEL_URL%"
) else (
    echo [!] Opening QR Code in default browser...
    start "" "https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=%TUNNEL_URL%"
)
goto SHARE_SKIP

:SHARE_ADB
where adb >nul 2>nul
if %errorlevel% neq 0 (
    echo [X] ADB command not found in PATH. Please install Android SDK platform-tools or add it to PATH.
    pause
) else (
    echo [!] Attempting to send URL to mobile via ADB...
    adb shell am start -a android.intent.action.VIEW -d "%TUNNEL_URL%"
)
goto SHARE_SKIP

:SHARE_SKIP
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
