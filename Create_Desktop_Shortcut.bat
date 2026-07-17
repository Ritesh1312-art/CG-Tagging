@echo off
REM This script creates a Desktop shortcut for the NCF Tagging App launcher
set APP_DIR=C:\Users\Ritesh\.gemini\antigravity\scratch\tagging-app
set SHORTCUT=%USERPROFILE%\Desktop\NCF Tagging Engine.lnk
set LAUNCHER=%APP_DIR%\Start_Tagging_App.bat

powershell -ExecutionPolicy Bypass -Command ^
  "$WshShell = New-Object -comObject WScript.Shell; " ^
  "$Shortcut = $WshShell.CreateShortcut('%SHORTCUT%'); " ^
  "$Shortcut.TargetPath = 'cmd.exe'; " ^
  "$Shortcut.Arguments = '/c \"%LAUNCHER%\"'; " ^
  "$Shortcut.WorkingDirectory = '%APP_DIR%'; " ^
  "$Shortcut.Description = 'NCF Tagging Engine - Double click to start'; " ^
  "$Shortcut.Save()"

echo.
echo  Desktop shortcut created: "NCF Tagging Engine"
echo  Double-click it anytime to start the app!
echo.
pause
