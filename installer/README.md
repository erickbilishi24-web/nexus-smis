# NEXUS SMIS Windows/XAMPP Installer and Updater

## Architecture audited

NEXUS is a React 19/Vite frontend, an Express 4 + tRPC 11 Node.js service, Drizzle ORM, and MySQL/MariaDB. XAMPP Apache serves the compiled frontend and reverse-proxies `/api` to Node.js. XAMPP MySQL/MariaDB stores the application database. PHP is required by phpMyAdmin/XAMPP tooling but is not the NEXUS application runtime. No Python service is present in the audited application.

## Release model

Create releases only from a tested commit:

```powershell
powershell -ExecutionPolicy Bypass -File .\installer\Make-Release.ps1 -Version 1.0.0
```

The builder runs type checking, all tests, and the production build, then creates an immutable versioned folder and ZIP with `manifest.json` SHA-256 checksums, source commit, migrations, compiled assets, and installer scripts. Do not distribute an untested working tree.

## Fresh installation

1. Install XAMPP with Apache and MySQL/MariaDB, Node.js LTS, and pnpm.
2. Start MySQL and create an empty database named `nexus_smis`.
3. Extract a release ZIP.
4. Run `Install-Nexus.bat` as Administrator, or run `Install-Nexus.ps1 -ReleaseDir <release-folder>`.
5. The installer detects Apache/PHP/MySQL/MariaDB/Node versions, checks required binaries, verifies every release checksum, copies application files, preserves secrets in `C:\NEXUS-SMIS\config\runtime.env`, installs dependencies, builds the frontend/server, applies ordered migrations, starts Node on port 3000, checks the public health procedure, and creates a desktop shortcut.
6. Copy `apache\nexus-smis-vhost.conf` into Apache vhosts, enable `proxy_module`, `proxy_http_module`, and `rewrite_module`, and add `127.0.0.1 nexus-smis.local` to the Windows hosts file.

## Safe update

Run `Update-Nexus.bat`, select the extracted release folder, or call `Update-Nexus.ps1`. The updater verifies the release, checks for application-file conflicts, backs up the database plus `data` and `config`, stages the new release, installs dependencies, builds, applies only unapplied migration hashes, starts the service, verifies health, and removes the old application only after success. If a step fails, application files are restored from the rollback directory and the database backup remains available for manual restore.

A pre-existing NEXUS installation that was not created by this manager must be baselined manually before its first managed update. The updater refuses ambiguous migration history rather than guessing.

## Data and secrets

`current` is application code. `data`, `config/runtime.env`, logs, uploaded files, and the MariaDB database are user/deployment state. Updates never intentionally delete these. Uninstall should be performed by removing application files only; preserve `data`, `config`, and database backups unless an administrator explicitly chooses otherwise. No credentials are bundled.

## Recovery

1. Stop the Node process.
2. Restore `C:\NEXUS-SMIS\current` from `rollback` or the last backup.
3. Restore the SQL dump using the XAMPP `mysql` client or phpMyAdmin only after confirming the target database.
4. Restore `data` and `config` from the timestamped backup.
5. Start the service and check `http://127.0.0.1:3000`.

## Verification status

The current Linux environment verified the release builder inputs with the project’s `pnpm check`, `pnpm test -- --run` (34 tests), and `pnpm build`. Windows XAMPP, Apache service registration, phpMyAdmin import, desktop shortcut creation, and PowerShell execution cannot be run in this Linux sandbox and are therefore not claimed as tested. The first Windows installation must exercise fresh install, repeat install refusal, update, forced failed-update rollback, missing dependency detection, custom configuration preservation, login, permissions, CRUD, reports, uploads, and major modules.
