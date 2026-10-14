param([string]$Url = 'http://127.0.0.1:3000', [string]$Name = 'NEXUS SMIS')
$desktop = [Environment]::GetFolderPath('Desktop')
$shortcut = (New-Object -ComObject WScript.Shell).CreateShortcut((Join-Path $desktop "$Name.lnk"))
$shortcut.TargetPath = $Url
$shortcut.WorkingDirectory = $desktop
$shortcut.Description = 'Open NEXUS School Management System'
$shortcut.Save()
Write-Host "Created $Name shortcut on the desktop."
