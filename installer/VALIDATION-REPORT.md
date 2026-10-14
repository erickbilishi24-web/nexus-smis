# NEXUS Installer Validation Report

Date: 2026-10-14
Source commit: 18c3bcb4dd7a07499563d270775d14d62078b989

## Architecture audit — executed

- Frontend: React 19 + Vite + Tailwind CSS 4.
- Backend: Node.js + Express 4 + tRPC 11.
- Persistence: Drizzle ORM with MySQL2 against MySQL/MariaDB.
- Authentication: Manus OAuth plus the project IAM flows.
- File storage: storage proxy/S3-backed storage helpers; uploaded files are not part of the database dump.
- PHP: present only as an XAMPP/phpMyAdmin prerequisite, not as the NEXUS application runtime.
- Persistent Node service: **required** in a Windows deployment because Express/tRPC serves `/api/trpc` and Apache proxies `/api` to Node. Apache alone cannot run the backend.
- Installer service approach: PowerShell launcher plus optional Windows Task Scheduler registration. NSSM is documented as a later alternative, but is not bundled or falsely claimed as tested.

## Checks actually executed in the Linux sandbox

| Check | Result | Evidence |
|---|---|---|
| `pnpm check` | Passed | TypeScript completed with exit code 0 |
| `pnpm test -- --run` | Passed | 10 files, 34 tests passed |
| `pnpm build` | Passed | Vite frontend and esbuild Node bundle completed |
| `git diff --check` | Passed | No whitespace errors |
| Installer source packaging | Passed | Toolkit ZIP created and contents listed |
| GitHub synchronization | Passed | `main` updated to commit `18c3bcb` |
| PowerShell syntax execution | **Not executed** | `pwsh`, Windows PowerShell, Wine unavailable |
| XAMPP/Apache/MySQL Windows execution | **Not executed** | No Windows or XAMPP installation in sandbox |
| Fresh/repeat/update/rollback tests on Windows | **Pending** | Requires isolated Windows test machine |

## Tests that remain pending and must not be represented as passed

1. Fresh install on a clean Windows/XAMPP VM.
2. Repeat install refusal and idempotent rerun.
3. MySQL/MariaDB creation, ordered migration application, migration replay, and migration hash conflict.
4. Preservation and restoration of database, `data`, `config/runtime.env`, uploaded files, and custom Apache configuration.
5. Missing Node, pnpm, MySQL client, mysqldump, Apache, PHP, and XAMPP detection.
6. Failed update during dependency installation, build, migration, service start, and health check; verify application rollback and database backup restoration.
7. Apache proxy behavior, Node startup, automatic restart, log locations, login, permissions, CRUD, reports, uploads, and all major modules.
8. Authenticode signature verification for signed release packages.

## Required Windows acceptance procedure

Use a disposable Windows 10/11 VM, never the live installation or production database:

1. Install XAMPP Apache + MySQL/MariaDB and Node.js LTS. Keep the VM snapshot clean.
2. Create an empty `nexus_smis` database and run `Install-Nexus.bat` from a tested release ZIP.
3. Verify Apache vhost, `nexus-smis.local`, Node port 3000, `api/trpc` health, login, role permissions, CRUD, reports, uploads, and major modules.
4. Take the generated backup. Run the installer again and confirm it refuses rather than overwrites.
5. Create a new release with one additive SQL migration. Run `Update-Nexus.bat`; confirm only the new migration runs and school records remain.
6. Modify a managed application file and confirm the updater reports the conflict before swapping files.
7. Force a build/start/migration failure in a VM snapshot. Confirm the previous application is restored and the SQL/data backup remains usable.
8. Stop MySQL or remove Node from PATH and confirm prerequisite errors are clear and non-destructive.
9. Restore the backup into a second disposable database and verify counts, credentials, settings, and uploaded-file references.
10. Record command output, screenshots, Windows Event Viewer/Task Scheduler results, Apache logs, Node logs, and SHA-256 release hashes.

## Authenticode requirements

For production releases, obtain an organization/code-signing certificate, sign every `.ps1` and `.exe`/installer artifact with `Set-AuthenticodeSignature` or SignTool, timestamp with a trusted RFC 3161 timestamp service, publish the certificate chain, verify with `Get-AuthenticodeSignature`, and reject unsigned or invalid packages in the distribution process. Signing cannot be completed in this sandbox because no certificate/private key was supplied.
