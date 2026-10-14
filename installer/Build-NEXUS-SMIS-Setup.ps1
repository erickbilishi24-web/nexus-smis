param(
  [Parameter(Mandatory=$true)][string]$ReleaseDir,
  [string]$OutputDir = ''
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if (-not $OutputDir) { $OutputDir = Join-Path (Split-Path $ReleaseDir -Parent) 'installer-output' }
$release = (Resolve-Path $ReleaseDir).Path
$iss = Join-Path $PSScriptRoot 'NEXUS-SMIS.iss'
$iscc = @(
  (Get-Command iscc.exe -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -ErrorAction SilentlyContinue),
  'C:\Program Files (x86)\Inno Setup 6\ISCC.exe',
  'C:\Program Files\Inno Setup 6\ISCC.exe'
) | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
if (-not $iscc) { throw 'Inno Setup 6 ISCC.exe was not found. Install Inno Setup on a Windows build machine; this sandbox cannot compile Windows EXEs.' }
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
& $iscc /DReleaseDir="$release" /DOutputDir="$OutputDir" $iss
if ($LASTEXITCODE -ne 0) { throw 'Inno Setup compilation failed.' }
Write-Host "Created $OutputDir\NEXUS-SMIS-Setup.exe"
