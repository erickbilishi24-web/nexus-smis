# NEXUS SMIS Installer Audit Checklist

Audit date: 2026-10-14  
Audited source: GitHub/main commit `4bce08d`  
Method: source inspection plus Linux application validation. No Windows/XAMPP execution was available.

## Results

| Requirement | Status | Evidence / limitation |
|---|---|---|
| One downloadable installer | PARTIAL | Inno Setup definition and build script exist; no `.exe` exists because Inno Setup/Windows are unavailable in the sandbox. |
| Bundle prerequisites where permitted | PARTIAL | Release contains application and installer code; Node/XAMPP are external and are checked, not bundled. |
| No manual Node/npm/pnpm/Git/XAMPP/database prerequisite | FAIL | Current release requires Node and XAMPP. Automating these requires a Windows bootstrapper and distributable installers that were not available or licensed in this environment. |
| User-friendly installation wizard | PARTIAL | `NEXUS-SMIS.iss` provides the wizard wrapper; it has not been compiled or executed on Windows. |
| Correct environment loading | PASS (source) | `Start-Nexus.ps1` loads `runtime.env` into the child process; runtime execution remains not tested on Windows. |
| Automatic database setup | PASS (source) | Installer creates the database with `utf8mb4` if absent and never drops it; live MySQL execution is not tested here. |
| Safe repeatable migrations | PASS (source) | Migration IDs and SHA-256 hashes are tracked; conflicts stop the update. Actual MySQL replay is pending Windows testing. |
| Windows-safe startup | PASS (source) | No Unix-style `NODE_ENV=production` command in the launcher; PowerShell sets the process environment and uses npm fallback. Runtime execution is pending. |
| Nullable timestamp compatibility | PARTIAL | Existing Drizzle migrations are preserved; no new timestamp rewrite was justified by source audit. Must be verified against the target MariaDB version. |
| Secure Super Admin provisioning | PARTIAL | Existing IAM uses hashed credentials and roles; installer does not create a universal password or a dedicated first-run credential wizard. Initial account setup remains an application/manual setup step. |
| Database credentials protected | PASS (source) | Credentials are passed as parameters/environment and no credentials are bundled; MySQL is not exposed by the Apache vhost. |
| LAN deployment and firewall | PARTIAL | Vhost, local hosts entry, LAN URL logging, and private/domain port 80 rule are implemented; multi-computer LAN access is not tested. |
| Automatic restart after Windows reboot | PARTIAL | SYSTEM scheduled task registration exists; Windows Task Scheduler execution is not tested. |
| Offline core operations | PARTIAL | Local Node/MySQL architecture supports local operation; internet-dependent OAuth, AI, storage, maps, messaging, and M-Pesa integrations are documented but offline behavior is not end-to-end tested. |
| Logs and health checks | PASS (source) | Installer/update logs, Node startup, and direct health check exist; Windows log rotation and runtime health remain pending. |
| Backup and restore | PARTIAL | `mysqldump`, data/config backups, and rollback are implemented; restore has not been executed in a Windows/MySQL environment. |
| Safe upgrade and uninstall | PASS (source) | Update stages files, detects conflicts, keeps backups, and restores application files on failure; database restore remains a manual recovery step. |
| Clean Windows installation | NOT TESTED | No Windows/XAMPP/PowerShell/Inno Setup environment is available in this sandbox. |
| Login, core modules, LAN, offline, restart, backup/restore, upgrade | NOT TESTED | Requires isolated clean Windows VM and at least one second LAN client. |
| Actual EXE exists, launches, installs | FAIL | No verified `NEXUS-SMIS-Setup.exe` can be produced in this Linux sandbox. |

## Confirmed corrections in this pass

- Apache document root points to `current/public`, which is where the release builder and installer place compiled `index.html` and assets.
- Fresh install creates the database before applying migrations.
- Installation registers automatic startup and configures a minimal HTTP firewall rule when Windows permits it.
- Runtime environment values are scoped to the Node child process.
- Startup falls back to `npm run start` if pnpm is not on PATH.
- An Inno Setup definition and build wrapper are included for a Windows build machine.

## Tests executed here

- `pnpm check`: passed.
- `pnpm test -- --run`: 34 tests passed.
- `pnpm build`: passed.
- `git diff --check`: passed.
- Installer text-file null-byte integrity check: passed.

## Explicitly pending

A clean Windows test must still execute the Inno Setup build, first-run wizard, database creation, migration replay, secure account setup, LAN access from another computer, offline core workflows, reboot recovery, backup restore, failed-update rollback, missing-dependency handling, and uninstall data preservation. These are not claimed as passed.
