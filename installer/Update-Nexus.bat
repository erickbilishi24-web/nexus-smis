@echo off
setlocal
set /p RELEASE=Enter the extracted release folder path:
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Update-Nexus.ps1" -ReleaseDir "%RELEASE%"
if errorlevel 1 pause
