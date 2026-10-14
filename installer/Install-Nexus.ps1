param(
  [Parameter(Mandatory=$true)][string]$ReleaseDir,
  [string]$InstallRoot = 'C:\NEXUS-SMIS',
  [string]$XamppRoot = '',
  [string]$DatabaseName = 'nexus_smis',
  [string]$MysqlUser = 'root',
  [string]$MysqlPassword = '',
  [switch]$SkipShortcut
)
. "$PSScriptRoot\Common.ps1"
Assert-Windows
$ReleaseDir = (Resolve-Path $ReleaseDir).Path
$logDir = Join-Path $InstallRoot 'logs'; New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$script:LogPath = Join-Path $logDir "install-$(Get-Date -Format yyyyMMdd-HHmmss).log"
try {
  $manifest = Read-Manifest $ReleaseDir
  Assert-ReleaseIntegrity $ReleaseDir $manifest
  $xampp = Find-XamppRoot $XamppRoot
  Assert-Prerequisites $xampp
  Configure-Apache $xampp $InstallRoot $ReleaseDir
  if (Test-Path $InstallRoot) { if (Get-ChildItem $InstallRoot -Force | Where-Object { $_.Name -notin @('data','config','logs') }) { throw "InstallRoot already contains an installation. Use Update-Nexus.ps1 instead." } }
  New-Item -ItemType Directory -Force -Path $InstallRoot, "$InstallRoot\current", "$InstallRoot\data", "$InstallRoot\config", "$InstallRoot\logs" | Out-Null
  Copy-Item "$ReleaseDir\app\*" "$InstallRoot\current" -Recurse -Force
  Copy-Item "$ReleaseDir\public" "$InstallRoot\current" -Recurse -Force
  Copy-Item "$ReleaseDir\installer" "$InstallRoot\current" -Recurse -Force
  Copy-Item "$ReleaseDir\config\*" "$InstallRoot\config" -Recurse -Force
  if (-not (Test-Path "$InstallRoot\config\runtime.env")) { Copy-Item "$PSScriptRoot\runtime.env.template" "$InstallRoot\config\runtime.env" }
  Push-Location "$InstallRoot\current"
  try { npm install --global pnpm; pnpm install --frozen-lockfile; pnpm build } finally { Pop-Location }
  Invoke-Migrations (Join-Path $ReleaseDir 'database\migrations') $MysqlUser $MysqlPassword $DatabaseName
  $port = 3000
  Start-Process -FilePath 'powershell.exe' -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-File',"$InstallRoot\current\installer\Start-Nexus.ps1",'-InstallRoot',$InstallRoot -WorkingDirectory "$InstallRoot\current" -WindowStyle Hidden
  Start-Sleep -Seconds 4
  if (-not (Test-HttpHealth $port)) { throw 'NEXUS health check failed after installation.' }
  if (-not $SkipShortcut) {
    $desktop = [Environment]::GetFolderPath('Desktop'); $shortcut = (New-Object -ComObject WScript.Shell).CreateShortcut((Join-Path $desktop 'NEXUS SMIS.lnk')); $shortcut.TargetPath = 'http://127.0.0.1:3000'; $shortcut.Save()
  }
  Write-Log "Install completed: NEXUS $($manifest.version)"
} catch { Write-Log $_.Exception.Message 'ERROR'; throw }
