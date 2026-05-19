@echo off
chcp 65001 >nul 2>nul
title Task-Flow Tunnel Checker

:: ==========================================
::  Task-Flow Tunnel Status Checker (Windows)
:: ==========================================

set PORT=%1
if "%PORT%"=="" set PORT=3000
set API_URL=http://localhost:%PORT%/api/tunnel

echo.
echo ==========================================
echo    Task-Flow Tunnel Status Checker
echo ==========================================
echo.

:: Check tunnel status
echo Checking tunnel status...
for /f "delims=" %%i in ('curl -s -X POST "%API_URL%" -H "Content-Type: application/json" -d "{\"action\":\"status\"}" 2^>nul') do set RESPONSE=%%i

if "%RESPONSE%"=="" (
    echo [X] Task-Flow server is not responding at http://localhost:%PORT%
    echo     Start the server first: taskflow-start.bat
    goto :end
)

echo %RESPONSE% | findstr /C:"running" >nul 2>nul
if %errorlevel% equ 0 (
    echo [O] Tunnel is ACTIVE!
    echo.
    echo %RESPONSE%
    echo.
    echo Copy the URL above to share your app!
    echo.
    set /p choice="Stop the tunnel? (y/N): "
    if /i "%choice%"=="y" (
        echo Stopping tunnel...
        curl -s -X POST "%API_URL%" -H "Content-Type: application/json" -d "{\"action\":\"stop\"}" >nul 2>nul
        echo [O] Tunnel stopped.
    )
) else (
    echo [ ] Tunnel is OFFLINE.
    echo.
    set /p choice="Start the tunnel? (Y/n): "
    if /i not "%choice%"=="n" (
        echo Starting tunnel... (this may take up to 15 seconds)
        for /f "delims=" %%j in ('curl -s -X POST "%API_URL%" -H "Content-Type: application/json" -d "{\"action\":\"start\"}" 2^>nul') do set START_RESP=%%j
        echo.
        echo %START_RESP%
        echo.
    )
)

:end
echo.
echo Done.
pause
