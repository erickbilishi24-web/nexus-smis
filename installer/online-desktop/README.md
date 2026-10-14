# NEXUS SMIS Online Desktop Package

This is the recommended package for schools using the hosted NEXUS platform. It does **not** install XAMPP, PHP, MySQL, Node.js, or a local copy of school data.

## Use now

1. On Windows, double-click `Install-NEXUS-Desktop.bat`.
2. The script creates NEXUS SMIS shortcuts on the Desktop and Start Menu.
3. The hosted NEXUS site opens in the default browser.
4. In Chrome or Edge, choose **Install NEXUS SMIS** from the browser address bar/menu for a standalone app window and automatic online updates.

## Build the optional EXE

On a Windows build machine with Inno Setup 6 installed, open this folder and compile `NEXUS-SMIS-Desktop.iss`. It produces `NEXUS-SMIS-Desktop-Setup.exe`.

The Manus Linux sandbox cannot compile or execute Windows EXEs, so the repository includes the reproducible installer definition and the working one-click PowerShell launcher, but does not claim an EXE was built or tested here.

The desktop client requires internet access to reach the hosted service. Offline/self-hosted operation remains a separate XAMPP deployment option.
