param([string]$Version = '', [string]$OutputRoot = '')
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$Repo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
if (-not $Version) { $Version = (git -C $Repo describe --tags --always --dirty).Trim() }
if (-not $OutputRoot) { $OutputRoot = Join-Path $Repo 'releases' }
$Release = Join-Path $OutputRoot "nexus-smis-$Version"
Remove-Item $Release -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path "$Release\app", "$Release\public", "$Release\database\migrations", "$Release\config", "$Release\installer" | Out-Null
Push-Location $Repo
try {
  pnpm check; if ($LASTEXITCODE -ne 0) { throw 'Type check failed.' }
  pnpm test -- --run; if ($LASTEXITCODE -ne 0) { throw 'Tests failed.' }
  pnpm build; if ($LASTEXITCODE -ne 0) { throw 'Build failed.' }
  git archive HEAD | tar -x -C "$Release\app"
  Copy-Item 'dist\public\*' "$Release\public" -Recurse -Force
  Copy-Item 'drizzle\*.sql' "$Release\database\migrations" -Force
  Copy-Item "$PSScriptRoot\apache\nexus-smis-vhost.conf" "$Release\config" -Force
  Copy-Item "$PSScriptRoot\runtime.env.template" "$Release\config" -Force
  Copy-Item "$PSScriptRoot\*.ps1", "$PSScriptRoot\*.bat" "$Release\installer" -Force
} finally { Pop-Location }
$files = Get-ChildItem $Release -File -Recurse | Where-Object { $_.Name -ne 'manifest.json' } | ForEach-Object { [pscustomobject]@{ path = $_.FullName.Substring($Release.Length + 1).Replace('\','/'); sha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $_.FullName).Hash.ToLowerInvariant() } }
$manifest = [ordered]@{ product = 'NEXUS SMIS'; version = $Version; createdUtc = (Get-Date).ToUniversalTime().ToString('o'); sourceCommit = (git -C $Repo rev-parse HEAD).Trim(); runtime = [ordered]@{ node = '22.x LTS'; database = 'MySQL 8 / MariaDB 10.6+'; web = 'Apache 2.4 via XAMPP' }; files = @($files) }
$manifest | ConvertTo-Json -Depth 8 | Set-Content -Encoding utf8 (Join-Path $Release 'manifest.json')
$zip = "$Release.zip"; Compress-Archive -Path "$Release\*" -DestinationPath $zip -Force
Write-Host "Created $zip"
