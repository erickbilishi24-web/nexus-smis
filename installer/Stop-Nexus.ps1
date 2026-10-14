param([string]$InstallRoot = 'C:\NEXUS-SMIS')
Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | Where-Object { $_.CommandLine -like "*$InstallRoot*" } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
Write-Host 'NEXUS Node processes stopped.'
