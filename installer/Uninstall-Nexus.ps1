param([string]$InstallRoot = 'C:\NEXUS-SMIS', [switch]$RemoveData, [switch]$RemoveDatabase)
. "$PSScriptRoot\Common.ps1"
Assert-Windows
$script:LogPath = Join-Path $InstallRoot "logs\uninstall-$(Get-Date -Format yyyyMMdd-HHmmss).log"
if (-not (Test-Path $InstallRoot)) { Write-Log 'NEXUS is not installed.'; exit 0 }
Write-Log 'Stopping NEXUS Node processes owned by this installation.'
Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | Where-Object { $_.CommandLine -like "*$InstallRoot*" } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
Remove-Item (Join-Path $InstallRoot 'current') -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item (Join-Path $InstallRoot 'rollback') -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item (Join-Path $InstallRoot 'staging') -Recurse -Force -ErrorAction SilentlyContinue
if ($RemoveData) { Remove-Item (Join-Path $InstallRoot 'data') -Recurse -Force -ErrorAction SilentlyContinue }
if ($RemoveDatabase) { Write-Log 'Database was not deleted automatically. Export and explicitly remove it with an administrator-approved database procedure.' 'WARN' }
Write-Log 'Application files removed. Data, configuration, logs, and database were preserved by default.'
