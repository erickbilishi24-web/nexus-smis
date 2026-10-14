param([string]$InstallRoot = 'C:\NEXUS-SMIS')
. "$PSScriptRoot\Common.ps1"
Assert-Windows
$taskName = 'NEXUS SMIS Node Service'
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$InstallRoot\current\installer\Start-Nexus.ps1`" -InstallRoot `"$InstallRoot`""
$trigger = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -RunLevel Highest
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Force | Out-Null
Write-Log "Registered $taskName to start at Windows boot."
