$DesktopPath = [Environment]::GetFolderPath("Desktop")
$ShortcutPath = Join-Path $DesktopPath "Rekcah Lab.lnk"
$TargetFile = "C:\Users\seo\.gemini\antigravity\scratch\SimRekcah\native\bin\Debug\net8.0-windows\SimRekcahNative.exe"
$WorkingDirectory = "C:\Users\seo\.gemini\antigravity\scratch\SimRekcah\native\bin\Debug\net8.0-windows"

$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = $TargetFile
$Shortcut.WorkingDirectory = $WorkingDirectory
$Shortcut.Description = "Launch Rekcah Lab Native"
$Shortcut.Save()

Write-Host "Desktop shortcut created successfully at $ShortcutPath"
