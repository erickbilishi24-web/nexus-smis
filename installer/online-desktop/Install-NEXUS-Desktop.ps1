param(
  [string]$InstallRoot = "$env:LOCALAPPDATA\NEXUS-SMIS",
  [string]$NexusUrl = ''
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$url = if ($NexusUrl) { $NexusUrl } else { 'https://kenyansmis-8jwcu8tn.manus.space/' }
$configFile = Join-Path $PSScriptRoot 'nexus-desktop.config.json'
if (-not $NexusUrl -and (Test-Path $configFile)) {
  $configured = (Get-Content -Raw -LiteralPath $configFile | ConvertFrom-Json).nexusUrl
  if ($configured) { $url = [string]$configured }
}
if ($url -notmatch '^https?://') { throw 'NEXUS URL must start with http:// or https://.' }
New-Item -ItemType Directory -Force -Path $InstallRoot | Out-Null
Set-Content -LiteralPath (Join-Path $InstallRoot 'hosted-url.txt') -Value $url -Encoding utf8
$desktop = [Environment]::GetFolderPath('Desktop')
$start = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs'
function New-NexusShortcut([string]$Path) {
  $shell = New-Object -ComObject WScript.Shell
  $shortcut = $shell.CreateShortcut($Path)
  $shortcut.TargetPath = $url
  $shortcut.Arguments = ''
  $shortcut.WorkingDirectory = $InstallRoot
  $shortcut.Description = 'Open NEXUS SMIS online'
  $shortcut.Save()
}
New-NexusShortcut (Join-Path $desktop 'NEXUS SMIS.lnk')
New-NexusShortcut (Join-Path $start 'NEXUS SMIS.lnk')
Start-Process $url
Write-Host "NEXUS SMIS desktop shortcut installed. No XAMPP or local database is required for the online version."
