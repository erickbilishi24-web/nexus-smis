Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-Log([string]$Message, [string]$Level = 'INFO') {
  $line = "{0:u} [{1}] {2}" -f (Get-Date), $Level, $Message
  Write-Host $line
  if ($script:LogPath) { Add-Content -LiteralPath $script:LogPath -Value $line }
}
function Assert-Windows { if ($env:OS -ne 'Windows_NT') { throw 'This installer must run on Windows.' } }
function Require-Command([string]$Name, [string]$Hint) { if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) { throw "$Name was not found. $Hint" } }
function Find-XamppRoot([string]$Requested) {
  if ($Requested -and (Test-Path (Join-Path $Requested 'apache\bin\httpd.exe'))) { return (Resolve-Path $Requested).Path }
  $candidates = @($env:XAMPP_HOME, 'C:\xampp', 'D:\xampp', 'C:\Program Files\xampp') | Where-Object { $_ }
  foreach ($path in $candidates) { if (Test-Path (Join-Path $path 'apache\bin\httpd.exe')) { return (Resolve-Path $path).Path } }
  throw 'XAMPP Apache was not found. Install XAMPP or pass -XamppRoot.'
}
function Get-Version([string]$Command, [string[]]$Arguments = @('--version')) {
  try { return ((& $Command @Arguments 2>&1 | Select-Object -First 1).ToString()).Trim() } catch { return 'unavailable' }
}
function Assert-Prerequisites([string]$XamppRoot) {
  Require-Command 'node' 'Install Node.js LTS, then reopen PowerShell.'
  Require-Command 'npm' 'Install Node.js LTS, then reopen PowerShell.'
  Require-Command 'mysql' 'Add XAMPP mysql\bin to PATH or pass a release package with mysql tools.'
  Require-Command 'mysqldump' 'Add XAMPP mysql\bin to PATH so backups can be taken.'
  $apache = Join-Path $XamppRoot 'apache\bin\httpd.exe'
  $php = Join-Path $XamppRoot 'php\php.exe'
  $mysql = Join-Path $XamppRoot 'mysql\bin\mysql.exe'
  foreach ($file in @($apache, $php, $mysql)) { if (-not (Test-Path $file)) { throw "Missing XAMPP component: $file" } }
  Write-Log "Detected Apache: $(Get-Version $apache -Arguments @('-v'))"
  Write-Log "Detected PHP: $(Get-Version $php -Arguments @('-v'))"
  Write-Log "Detected MySQL/MariaDB client: $(Get-Version $mysql)"
  Write-Log "Detected Node: $(Get-Version 'node')"
}
function Install-AndBuild([string]$AppRoot) {
  Push-Location $AppRoot
  try {
    $pnpm = Get-Command pnpm -ErrorAction SilentlyContinue
    if ($pnpm) { & $pnpm.Source install --frozen-lockfile; if ($LASTEXITCODE -ne 0) { throw 'pnpm dependency installation failed.' }; & $pnpm.Source build }
    else { Write-Log 'pnpm not found; using npm install fallback.' 'WARN'; & npm install; if ($LASTEXITCODE -ne 0) { throw 'npm dependency installation failed.' }; & npm run build }
    if ($LASTEXITCODE -ne 0) { throw 'NEXUS production build failed.' }
  } finally { Pop-Location }
}
function Initialize-Database([string]$MysqlUser, [string]$MysqlPassword, [string]$DatabaseName) {
  $safeName = $DatabaseName -replace '[^A-Za-z0-9_]', ''
  if (-not $safeName) { throw 'Database name is empty or invalid.' }
  $env:MYSQL_PWD = $MysqlPassword
  try {
    & mysql -u $MysqlUser -e "CREATE DATABASE IF NOT EXISTS ``$safeName`` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    if ($LASTEXITCODE -ne 0) { throw "Unable to create or access database: $safeName" }
    Write-Log "Database ready: $safeName"
  } finally { Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue }
}
function Read-Manifest([string]$ReleaseDir) {
  $path = Join-Path $ReleaseDir 'manifest.json'
  if (-not (Test-Path $path)) { throw "Release manifest missing: $path" }
  return (Get-Content -Raw -LiteralPath $path | ConvertFrom-Json)
}
function Assert-ReleaseIntegrity([string]$ReleaseDir, $Manifest) {
  foreach ($entry in $Manifest.files) {
    $path = Join-Path $ReleaseDir $entry.path
    if (-not (Test-Path $path)) { throw "Release file missing: $($entry.path)" }
    $hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $path).Hash.ToLowerInvariant()
    if ($hash -ne $entry.sha256.ToLowerInvariant()) { throw "Checksum mismatch: $($entry.path)" }
  }
  Write-Log "Verified $($Manifest.files.Count) release file checksums."
}
function New-Backup([string]$InstallRoot, [string]$BackupRoot, [string]$MysqlUser, [string]$MysqlPassword, [string]$DatabaseName) {
  New-Item -ItemType Directory -Force -Path $BackupRoot | Out-Null
  $data = Join-Path $InstallRoot 'data'
  $config = Join-Path $InstallRoot 'config'
  if (Test-Path $data) { Copy-Item $data (Join-Path $BackupRoot 'data') -Recurse -Force }
  if (Test-Path $config) { Copy-Item $config (Join-Path $BackupRoot 'config') -Recurse -Force }
  $dump = Join-Path $BackupRoot "$DatabaseName.sql"
  $env:MYSQL_PWD = $MysqlPassword
  try { & mysqldump -u $MysqlUser --single-transaction --routines --events --triggers $DatabaseName | Out-File -Encoding utf8 -LiteralPath $dump } finally { Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue }
  Write-Log "Backup created at $BackupRoot"
}
function Invoke-Migrations([string]$MigrationDir, [string]$MysqlUser, [string]$MysqlPassword, [string]$DatabaseName) {
  $env:MYSQL_PWD = $MysqlPassword
  try {
    $create = 'CREATE TABLE IF NOT EXISTS nexus_deployment_migrations (id VARCHAR(80) PRIMARY KEY, sha256 CHAR(64) NOT NULL, applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP);'
    $create | & mysql -u $MysqlUser $DatabaseName
    foreach ($file in (Get-ChildItem -LiteralPath $MigrationDir -Filter '*.sql' | Sort-Object Name)) {
      $id = $file.BaseName
      $existing = (& mysql -N -B -u $MysqlUser $DatabaseName -e "SELECT sha256 FROM nexus_deployment_migrations WHERE id='$id' LIMIT 1;").Trim()
      $hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $file.FullName).Hash.ToLowerInvariant()
      if ($existing) { if ($existing -ne $hash) { throw "Migration hash conflict for $id; manual review required." }; Write-Log "Migration already applied: $id"; continue }
      Write-Log "Applying migration: $id"
      Get-Content -Raw -LiteralPath $file.FullName | & mysql -u $MysqlUser $DatabaseName
      if ($LASTEXITCODE -ne 0) { throw "Migration failed: $id" }
      & mysql -u $MysqlUser $DatabaseName -e "INSERT INTO nexus_deployment_migrations (id, sha256) VALUES ('$id', '$hash');"
    }
  } finally { Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue }
}
function Test-HttpHealth([int]$Port) {
  try { $response = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$Port/api/trpc/smis.health?input=%7B%7D" -TimeoutSec 15; return $response.StatusCode -eq 200 } catch { return $false }
}
function Configure-Apache([string]$XamppRoot, [string]$InstallRoot, [string]$ReleaseDir) {
  $extra = Join-Path $XamppRoot 'apache\conf\extra'
  $target = Join-Path $extra 'nexus-smis-vhost.conf'
  New-Item -ItemType Directory -Force -Path $extra | Out-Null
  $template = Join-Path $ReleaseDir 'config\nexus-smis-vhost.conf'
  if (-not (Test-Path $template)) { throw "Apache template missing: $template" }
  $content = (Get-Content -Raw -LiteralPath $template).Replace('C:/NEXUS-SMIS', $InstallRoot.Replace('\','/'))
  if ((Test-Path $target) -and ((Get-Content -Raw -LiteralPath $target) -ne $content)) { throw "Existing Apache configuration differs: $target. Review manually before updating." }
  Set-Content -Encoding ascii -LiteralPath $target -Value $content
  $httpd = Join-Path $XamppRoot 'apache\conf\httpd.conf'
  $include = 'Include conf/extra/nexus-smis-vhost.conf'
  if (-not (Select-String -LiteralPath $httpd -SimpleMatch $include -Quiet)) { Add-Content -LiteralPath $httpd -Value "`r`n# NEXUS SMIS managed include`r`n$include`r`n" }
  $hosts = Join-Path $env:WINDIR 'System32\drivers\etc\hosts'
  if (-not (Select-String -LiteralPath $hosts -Pattern '\bnexus-smis\.local\b' -Quiet)) { Add-Content -LiteralPath $hosts -Value "`r`n127.0.0.1 nexus-smis.local # NEXUS SMIS`r`n" }
  try {
    if (-not (Get-NetFirewallRule -DisplayName 'NEXUS SMIS HTTP' -ErrorAction SilentlyContinue)) { New-NetFirewallRule -DisplayName 'NEXUS SMIS HTTP' -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow -Profile Domain,Private | Out-Null }
  } catch { Write-Log "Firewall rule was not created automatically: $($_.Exception.Message)" 'WARN' }
  $lan = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } | Select-Object -First 1 -ExpandProperty IPAddress)
  if ($lan) { Write-Log "School LAN URL: http://$lan/ (ensure the network is Private and firewall permits Apache)" }
  Write-Log "Apache vhost prepared at $target; custom files were not overwritten."
}
