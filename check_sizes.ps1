$appDir = "C:\Users\Ritesh\.gemini\antigravity\scratch\tagging-app"
Get-ChildItem "$appDir\core_folders" -Recurse | Where-Object { -not $_.PSIsContainer } | ForEach-Object {
    Write-Output ("$($_.FullName.Replace($appDir,'')) | $([math]::Round($_.Length/1KB,1)) KB")
}
Write-Output "---FIXED---"
Get-ChildItem "$appDir\fixed" | Where-Object { -not $_.PSIsContainer } | ForEach-Object {
    Write-Output ("$($_.Name) | $([math]::Round($_.Length/1MB,2)) MB")
}
