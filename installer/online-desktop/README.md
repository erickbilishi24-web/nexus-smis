# NEXUS SMIS Online Desktop Package

This is the recommended client package for schools using the hosted NEXUS platform. It does **not** install XAMPP, PHP, MySQL, Node.js, or a local copy of school data. The hosted backend must enforce school/tenant isolation; this client does not create tenants or security boundaries.

## Use now

1. Set the hosted school URL in `nexus-desktop.config.json` if this deployment uses a different NEXUS domain. The default is the current hosted NEXUS URL.
2. On Windows, double-click `Install-NEXUS-Desktop.bat`.
3. The script creates NEXUS SMIS shortcuts on the Desktop and Start Menu.
4. The hosted NEXUS site opens in the default browser.
5. In Chrome or Edge, choose **Install NEXUS SMIS** from the browser address bar/menu for a standalone app window and automatic online updates.

## Build the optional EXE

On a Windows build machine with Inno Setup 6 installed, open this folder and compile `NEXUS-SMIS-Desktop.iss`. It produces `NEXUS-SMIS-Desktop-Setup.exe`.

The Manus Linux sandbox cannot compile or execute Windows EXEs, so the repository includes the reproducible installer definition and the working one-click PowerShell launcher, but does not claim an EXE was built or tested here.

The desktop client requires internet access to reach the hosted service. Offline/self-hosted operation remains a separate XAMPP deployment option.
