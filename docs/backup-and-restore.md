# NEXUS Software backup and restore runbook

## Scope

The repository includes `ops/backup.sh`, `ops/restore.sh`, and `ops/backup.env.example`. The scripts are designed for a deployment host with MySQL/MariaDB client tools, OpenSSL, gzip, tar, `flock`, and optionally the AWS CLI for separate object storage.

Backups contain a compressed database dump, an optional uploads archive, a creation timestamp, and SHA-256 checksums. The resulting archive is encrypted with AES-256-CBC using PBKDF2 and a configured secret key. Passwords, encryption keys, tokens, and database dumps must never be committed to GitHub.

## Configuration

1. Copy `ops/backup.env.example` to a root-owned file such as `/etc/nexus/backup.env`.
2. Set permissions to `chmod 600 /etc/nexus/backup.env`.
3. Use a dedicated least-privilege MySQL backup account with consistent-read access to the NEXUS database. Do not use the application owner's password.
4. Generate the encryption key with `openssl rand -base64 32` and store it in a separate secrets manager or protected host file. Losing this key makes encrypted backups unrecoverable.
5. Set `NEXUS_UPLOADS_ROOT` only when uploaded files are stored on a mounted, trusted directory. Set `S3_URI` only after the separate bucket has private access, encryption, lifecycle retention, and restricted credentials.

## Scheduling

Run from a protected service account, for example daily at 02:00 UTC:

```cron
0 2 * * * NEXUS_BACKUP_ENV=/etc/nexus/backup.env /opt/nexus/ops/backup.sh >>/var/log/nexus-backup.log 2>&1
```

The script uses a lock, non-interactive failure exit, checksum sidecars, retention cleanup, and an optional failure alert command. Operators must monitor the exit status and storage capacity; a successful local write is not proof that a separate-storage upload or restore works.

## Restore procedure

Restore only into a maintenance window and never directly into production without a current backup and an approved change record:

```bash
NEXUS_BACKUP_ENV=/etc/nexus/backup.env /opt/nexus/ops/restore.sh /var/backups/nexus/nexus-YYYYMMDDTHHMMSSZ.tar.gz.enc
```

The script verifies the archive checksum, requires the operator to type `RESTORE NEXUS`, decrypts into a temporary directory, verifies the internal file manifest, and imports the SQL dump. Upload files require a separately approved file-store restore; the script does not silently overwrite them.

## Required staging test before commercial rollout

Create two disposable schools in an isolated staging database and verify: backup creation, separate-storage copy, checksum failure detection, restore into a clean database, login and permissions, learner import, report generation, file references, and preservation of both schools. Record the command output and recovery time. This test has not been run against the live production database in this environment.

## Recovery limitations

The scripts provide the operational primitive but do not create a cloud scheduler, secret-manager integration, object-storage bucket, or alert destination automatically. Those must be configured per deployment. The database migration journal remains the source of schema truth; take a backup before applying new migrations and retain the prior release for rollback.
