param(
  [string]$InstallRoot = "$env:LOCALAPPDATA\NEXUS-SMIS"
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$url = 'https://kenyansmis-8jwcu8tn.manus.space/'
New-Item -ItemType Directory -Force -Path $InstallRoot | Out-Null
Set-Content -LiteralPath (Join-Path $InstallRoot 'hosted-url.txt') -Value $url -Encoding utf8
$desktop = [Environment]::GetFolderPath('Desktop')
$start = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs'
function New-NexusShortcut([string]$Path) {
  $shell = New-Object -ComObject WScript.Shell
  $shortcut = $shell.CreateShortcut($Path)
  $shortcut.TargetPath = 'https://kenyansmis-8jwcu8tn.manus.space/'
  $shortcut.Arguments = ''
  $shortcut.WorkingDirectory = $InstallRoot
  $shortcut.Description = 'Open NEXUS SMIS online'
  $shortcut.Save()
}
New-NexusShortcut (Join-Path $desktop 'NEXUS SMIS.lnk')
New-NexusShortcut (Join-Path $start 'NEXUS SMIS.lnk')
Start-Process $url
Write-Host "NEXUS SMIS desktop shortcut installed. No XAMPP or local database is required for the online version."
