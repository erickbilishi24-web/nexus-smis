param([string]$InstallRoot = 'C:\NEXUS-SMIS')
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$envFile = Join-Path $InstallRoot 'config\runtime.env'
if (-not (Test-Path $envFile)) { throw "Missing deployment environment file: $envFile" }
Get-Content -LiteralPath $envFile | Where-Object { $_ -match '^\s*[^#][^=]*=' } | ForEach-Object {
  $name, $value = $_ -split '=', 2
  [Environment]::SetEnvironmentVariable($name.Trim(), $value.Trim())
}
$env:NODE_ENV = 'production'
Set-Location (Join-Path $InstallRoot 'current')
& pnpm start
