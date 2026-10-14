#define MyAppName "NEXUS SMIS"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "NEXUS SMIS"
#ifndef ReleaseDir
  #define ReleaseDir "."
#endif
#ifndef OutputDir
  #define OutputDir "."
#endif

[Setup]
AppId={{B9AB4A8D-5E4A-4DB0-9CF3-3D9D8A9B1D7E}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName=C:\NEXUS-SMIS
DefaultGroupName=NEXUS SMIS
OutputDir={#OutputDir}
OutputBaseFilename=NEXUS-SMIS-Setup
Compression=lzma2
SolidCompression=yes
PrivilegesRequired=admin
ArchitecturesInstallIn64BitMode=x64compatible
DisableProgramGroupPage=yes
WizardStyle=modern

[Files]
Source: "{#ReleaseDir}\*"; DestDir: "{tmp}\nexus-release"; Flags: recursesubdirs createallsubdirs ignoreversion

[Icons]
Name: "{autodesktop}\NEXUS SMIS Setup"; Filename: "{tmp}\nexus-release\installer\Install-Nexus.bat"; WorkingDir: "{tmp}\nexus-release"

[Run]
Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File \"{tmp}\nexus-release\installer\Install-Nexus.ps1\" -ReleaseDir \"{tmp}\nexus-release\""; WorkingDir: "{tmp}\nexus-release"; Verb: runas; Flags: waituntilterminated

[UninstallRun]
Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File \"{app}\current\installer\Uninstall-Nexus.ps1\" -InstallRoot \"{app}\""; Flags: waituntilterminated
