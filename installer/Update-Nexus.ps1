param(
  [Parameter(Mandatory=$true)][string]$ReleaseDir,
  [string]$InstallRoot = 'C:\NEXUS-SMIS',
  [string]$XamppRoot = '',
  [string]$DatabaseName = 'nexus_smis',
  [string]$MysqlUser = 'root',
  [string]$MysqlPassword = ''
)
. "$PSScriptRoot\Common.ps1"
Assert-Windows
$ReleaseDir = (Resolve-Path $ReleaseDir).Path
$logDir = Join-Path $InstallRoot 'logs'; New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$script:LogPath = Join-Path $logDir "update-$(Get-Date -Format yyyyMMdd-HHmmss).log"
$backup = Join-Path $InstallRoot "backups\$(Get-Date -Format yyyyMMdd-HHmmss)"
$stage = Join-Path $InstallRoot 'staging'
$old = Join-Path $InstallRoot 'rollback'
try {
  if (-not (Test-Path "$InstallRoot\current\package.json")) { throw 'No existing NEXUS installation found.' }
  $manifest = Read-Manifest $ReleaseDir; Assert-ReleaseIntegrity $ReleaseDir $manifest
  $xampp = Find-XamppRoot $XamppRoot; Assert-Prerequisites $xampp
  Configure-Apache $xampp $InstallRoot $ReleaseDir
  New-Backup $InstallRoot $backup $MysqlUser $MysqlPassword $DatabaseName
  if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }; New-Item -ItemType Directory -Force -Path $stage | Out-Null
  Copy-Item "$ReleaseDir\app\*" $stage -Recurse -Force; Copy-Item "$ReleaseDir\public" $stage -Recurse -Force; Copy-Item "$ReleaseDir\installer" $stage -Recurse -Force
  $managed = Get-ChildItem "$InstallRoot\current" -File -Recurse | ForEach-Object { $_.FullName.Substring((Resolve-Path "$InstallRoot\current").Path.Length + 1) }
  $conflicts = foreach ($relative in $managed) { $oldFile = Join-Path "$InstallRoot\current" $relative; $newFile = Join-Path $stage $relative; if ((Test-Path $newFile) -and ((Get-FileHash $oldFile).Hash -ne (Get-FileHash $newFile).Hash) -and $relative -notmatch '^(dist|node_modules)') { $relative } }
  $configConflicts = $conflicts | Where-Object { $_ -notmatch '^(client|server|shared|drizzle|package|pnpm-lock|vite|tsconfig|public)' }
  if ($configConflicts) { throw "Modified-file conflicts detected; update stopped: $($configConflicts -join ', ')" }
  if (Test-Path $old) { Remove-Item $old -Recurse -Force }; Rename-Item "$InstallRoot\current" rollback
  Rename-Item $stage current
  Install-AndBuild "$InstallRoot\current"
  Invoke-Migrations (Join-Path $ReleaseDir 'database\migrations') $MysqlUser $MysqlPassword $DatabaseName
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$InstallRoot\current\installer\Register-NexusTask.ps1" -InstallRoot $InstallRoot
  if ($LASTEXITCODE -ne 0) { throw 'Unable to refresh automatic NEXUS startup registration.' }
  Start-Process -FilePath 'powershell.exe' -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-File',"$InstallRoot\current\installer\Start-Nexus.ps1",'-InstallRoot',$InstallRoot -WorkingDirectory "$InstallRoot\current" -WindowStyle Hidden
  Start-Sleep -Seconds 4
  if (-not (Test-HttpHealth 3000)) { throw 'Health check failed; rolling back application files.' }
  Remove-Item $old -Recurse -Force
  Write-Log "Update completed: NEXUS $($manifest.version); backup retained at $backup"
} catch {
  Write-Log $_.Exception.Message 'ERROR'
  if (Test-Path "$InstallRoot\rollback") { if (Test-Path "$InstallRoot\current") { Remove-Item "$InstallRoot\current" -Recurse -Force }; Rename-Item "$InstallRoot\rollback" current; Write-Log 'Application files rolled back. Database backup is available for manual restore.' 'WARN' }
  throw
}
