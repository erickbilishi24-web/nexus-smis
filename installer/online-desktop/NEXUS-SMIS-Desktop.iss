[Setup]
AppId={{47E3B7E7-A4D2-4F69-8D9F-7A1D4C31C2F1}
AppName=NEXUS SMIS
AppVersion=1.0.0
AppPublisher=NEXUS SMIS
DefaultDirName={localappdata}\NEXUS-SMIS
DefaultGroupName=NEXUS SMIS
OutputBaseFilename=NEXUS-SMIS-Desktop-Setup
OutputDir=.
PrivilegesRequired=lowest
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
DisableProgramGroupPage=yes

[Files]
Source: "Install-NEXUS-Desktop.ps1"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{autodesktop}\NEXUS SMIS"; Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File \"{app}\Install-NEXUS-Desktop.ps1\""; WorkingDir: "{app}"
Name: "{group}\NEXUS SMIS"; Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File \"{app}\Install-NEXUS-Desktop.ps1\""; WorkingDir: "{app}"

[Run]
Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File \"{app}\Install-NEXUS-Desktop.ps1\""; WorkingDir: "{app}"; Flags: postinstall nowait
