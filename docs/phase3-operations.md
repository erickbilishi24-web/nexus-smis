# Phase 3 operational improvements

## Large-list pagination

The People registry, Finance expenditure register, Library catalogue, and Library loan/circulation views now use bounded server-side page queries. Search for Library books is performed in SQL before pagination. Each page is capped at 100 rows, and the UI exposes Previous/Next controls without changing the existing legacy endpoints used by exports and other screens. Finance and People indexes support school/name or school/date access patterns.

## Disposable staging acceptance

Run `ops/run-staging-acceptance.sh` only with a separate disposable `NEXUS_STAGING_DATABASE_URL` and `NEXUS_STAGING_CONFIRM=I_CONFIRM_DISPOSABLE_STAGING`. The script refuses to run when the staging URL equals `DATABASE_URL`. The code-level tenant boundary suite is runnable now; a full CRUD matrix with two synthetic schools must still be executed on a provisioned staging database before claiming production-grade multi-school acceptance.

## Backup monitoring and restore alerts

`ops/backup-monitor.sh` checks for the newest encrypted backup, verifies its checksum, and fails if it is older than `BACKUP_MAX_AGE_HOURS` (default 26). Configure `BACKUP_ALERT_COMMAND` to route failures to an approved email, webhook wrapper, or monitoring agent. `restore.sh` supports `RESTORE_ALERT_COMMAND` for failed restore notifications and retains explicit confirmation before replacing a database.

Recommended host scheduling:

```cron
# Daily encrypted backup at 01:15 UTC
15 1 * * * NEXUS_BACKUP_ENV=/etc/nexus/backup.env /opt/nexus/ops/backup.sh >>/var/log/nexus-backup.log 2>&1
# Monitor at 02:00 UTC and every six hours
0 2,8,14,20 * * * NEXUS_BACKUP_ENV=/etc/nexus/backup.env /opt/nexus/ops/backup-monitor.sh >>/var/log/nexus-backup-monitor.log 2>&1
```

Do not place real database credentials, encryption keys, alert tokens, or webhook URLs in GitHub. A real scheduled host, alert destination, and isolated restore rehearsal remain deployment responsibilities and were not executed in this sandbox.
