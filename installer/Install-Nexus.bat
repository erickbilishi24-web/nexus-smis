@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Install-Nexus.ps1" -ReleaseDir "%~dp0.."
if errorlevel 1 pause
