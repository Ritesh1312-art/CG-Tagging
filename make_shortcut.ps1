$appDir = "C:\Users\Ritesh\.gemini\antigravity\scratch\tagging-app"
$launcher = "$appDir\Start_Tagging_App.bat"
$desktop = [System.Environment]::GetFolderPath("Desktop")
$shortcutPath = "$desktop\NCF Tagging Engine.lnk"

$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($shortcutPath)
$Shortcut.TargetPath = "cmd.exe"
$Shortcut.Arguments = "/c `"$launcher`""
$Shortcut.WorkingDirectory = $appDir
$Shortcut.Description = "NCF Tagging Engine - Double click to start"
$Shortcut.Save()

Write-Output "Desktop shortcut created at: $shortcutPath"
