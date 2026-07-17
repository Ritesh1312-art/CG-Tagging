@echo off
title NCF Tagging Engine
echo.
echo  ==========================================
echo   NCF Tagging Engine - Starting Server...
echo  ==========================================
echo.

set APP_DIR=%~dp0
set ELECTRON_RUN_AS_NODE=1

echo  Server folder: %APP_DIR%
echo  Starting server on http://localhost:3000
echo.

REM Start server using Antigravity's built-in Node engine
start "" /B "C:\Users\Ritesh\AppData\Local\Programs\Antigravity\Antigravity.exe" "%APP_DIR%server.js"

REM Wait 2 seconds for server to initialize
timeout /t 2 /nobreak > nul

REM Open browser automatically
echo  Opening browser...
start http://localhost:3000

echo.
echo  Server is running! Press any key to STOP the server.
echo  (Closing this window will also stop the server)
echo.
pause > nul

REM Kill the Antigravity node process running the server
taskkill /F /IM "Antigravity.exe" /FI "WINDOWTITLE eq NCF Tagging Engine*" > nul 2>&1
echo  Server stopped.
