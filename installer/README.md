# NEXUS SMIS Windows/XAMPP Installer and Updater

## Architecture audited

NEXUS is a React 19/Vite frontend, an Express 4 + tRPC 11 Node.js service, Drizzle ORM, and MySQL/MariaDB. XAMPP Apache serves the compiled frontend and reverse-proxies `/api` to Node.js. XAMPP MySQL/MariaDB stores the application database. PHP is required by phpMyAdmin/XAMPP tooling but is not the NEXUS application runtime. No Python service is present in the audited application.

For schools using the hosted online NEXUS service, use `installer/online-desktop/`. It creates a lightweight Windows desktop shortcut and supports Chrome/Edge PWA installation; it does not require XAMPP or a local database. This XAMPP installer remains the optional package for offline or school-LAN hosting.

## Release model

Create releases only from a tested commit:

```powershell
powershell -ExecutionPolicy Bypass -File .\installer\Make-Release.ps1 -Version 1.0.0
```

The builder runs type checking, all tests, and the production build, then creates an immutable versioned folder and ZIP with `manifest.json` SHA-256 checksums, source commit, migrations, compiled assets, and installer scripts. Do not distribute an untested working tree.

## Fresh installation

1. On a PC that already has XAMPP/phpMyAdmin, start **Apache** and **MySQL** in the XAMPP Control Panel. Install Node.js LTS as the only additional runtime prerequisite; phpMyAdmin itself is not used by the installer. Node.js is required because NEXUS is a Node/tRPC service, not a PHP application.
2. The installer automatically discovers XAMPP's `mysql\bin` tools even when they are not on the Windows PATH. It creates the `nexus_smis` database if it does not exist, using `utf8mb4`; it never drops existing data. If MySQL is stopped or credentials are wrong, it stops with a retryable message.
3. Extract a release ZIP.
4. Run `Install-Nexus.bat` as Administrator, or run `Install-Nexus.ps1 -ReleaseDir <release-folder>`.
5. The installer detects Apache/PHP/MySQL/MariaDB/Node versions, checks required binaries, verifies every release checksum, copies application files, preserves secrets in `C:\NEXUS-SMIS\config\runtime.env`, installs dependencies, builds the frontend/server, applies ordered migrations, starts Node on port 3000, checks the public health procedure, and creates a desktop shortcut.
6. The installer configures the Apache vhost to serve `C:\NEXUS-SMIS\current\public` (the compiled `index.html` and assets), proxies `/api` to Node on port 3000, adds the local hosts entry, creates a private/domain TCP 80 firewall rule when permitted, and logs the detected LAN URL. `HOST=127.0.0.1` keeps the service local; `HOST=0.0.0.0` enables authorised school-LAN access. It does not expose MySQL to the LAN.
7. The installer registers a SYSTEM scheduled task for automatic Node startup and the launcher loads `config\runtime.env` into the child process environment. If `pnpm` is unavailable at runtime, the launcher falls back to `npm run start`. Fresh installs and upgrades stop with an actionable message if port 3000 is occupied rather than silently leaving Apache pointed at the wrong port.

## Safe update

Run `Update-Nexus.bat`, select the extracted release folder, or call `Update-Nexus.ps1`. The updater verifies the release, checks for application-file conflicts, backs up the database plus `data` and `config`, stages the new release, installs dependencies, builds, applies only unapplied migration hashes, starts the service, verifies health, and removes the old application only after success. If a step fails, application files are restored from the rollback directory and the database backup remains available for manual restore.

A pre-existing NEXUS installation that was not created by this manager must be baselined manually before its first managed update. The updater refuses ambiguous migration history rather than guessing.

## Single EXE build

The repository now includes `NEXUS-SMIS.iss` and `Build-NEXUS-SMIS-Setup.ps1` for Inno Setup 6. On a Windows build machine with Inno Setup installed, run:

```powershell
powershell -ExecutionPolicy Bypass -File .\installer\Build-NEXUS-SMIS-Setup.ps1 -ReleaseDir .\releases\nexus-smis-1.0.0
```

This produces `NEXUS-SMIS-Setup.exe`, which wraps the verified release and launches the existing elevated PowerShell installer. Inno Setup, Windows, XAMPP, and Node are not present in the Manus Linux sandbox, so an EXE has **not** been compiled or claimed as tested here. XAMPP/Node remain external prerequisites because bundling and licensing those products was not authorized or technically testable in this environment.

## Data and secrets

`current` is application code. `data`, `config/runtime.env`, logs, uploaded files, and the MariaDB database are user/deployment state. Updates never intentionally delete these. Uninstall should be performed by removing application files only; preserve `data`, `config`, and database backups unless an administrator explicitly chooses otherwise. No credentials are bundled.

## Recovery

1. Stop the Node process.
2. Restore `C:\NEXUS-SMIS\current` from `rollback` or the last backup.
3. Restore the SQL dump using the XAMPP `mysql` client or phpMyAdmin only after confirming the target database.
4. Restore `data` and `config` from the timestamped backup.
5. Start the service and check `http://127.0.0.1:3000`.

## Verification status

The current Linux environment verified the application with `pnpm check`, `pnpm test -- --run` (34 tests), and `pnpm build`. The corrected Apache document root, database creation path, LAN/firewall logic, startup registration, and Inno Setup definition were reviewed but not executed. Windows XAMPP, Apache service registration, phpMyAdmin import, desktop shortcut creation, firewall behavior, Inno Setup compilation, and PowerShell execution cannot be run in this Linux sandbox and are therefore not claimed as tested. The first Windows installation must exercise fresh install, repeat install refusal, update, forced failed-update rollback, missing dependency detection, custom configuration preservation, login, permissions, CRUD, reports, uploads, LAN access, restart, and major modules.
