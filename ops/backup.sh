#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

CONFIG_FILE="${NEXUS_BACKUP_ENV:-/etc/nexus/backup.env}"
if [[ ! -r "$CONFIG_FILE" ]]; then
  echo "Backup configuration not found: $CONFIG_FILE" >&2
  exit 2
fi
# shellcheck disable=SC1090
source "$CONFIG_FILE"
: "${BACKUP_ROOT:?BACKUP_ROOT is required}"
: "${MYSQL_HOST:?MYSQL_HOST is required}"
: "${MYSQL_USER:?MYSQL_USER is required}"
: "${MYSQL_DATABASE:?MYSQL_DATABASE is required}"
: "${BACKUP_ENCRYPTION_KEY_B64:?BACKUP_ENCRYPTION_KEY_B64 is required}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
LOCK_FILE="$BACKUP_ROOT/.backup.lock"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
WORK_DIR="$BACKUP_ROOT/.work-$TIMESTAMP"
ARCHIVE="$BACKUP_ROOT/nexus-$TIMESTAMP.tar.gz.enc"

on_error() {
  local code=$?
  rm -rf "$WORK_DIR"
  if [[ -n "${FAILURE_ALERT_COMMAND:-}" ]]; then
    BACKUP_ERROR_CODE="$code" BACKUP_ERROR_TIMESTAMP="$TIMESTAMP" bash -lc "$FAILURE_ALERT_COMMAND" || true
  fi
  exit "$code"
}
trap on_error ERR INT TERM
mkdir -p "$BACKUP_ROOT"
exec 9>"$LOCK_FILE"
if ! flock -n 9; then echo "Another NEXUS backup is already running." >&2; exit 3; fi
mkdir -p "$WORK_DIR/database" "$WORK_DIR/files"

# DATABASE_URL is passed through mysql tools; no credentials are printed.
export MYSQL_PWD="${MYSQL_PASSWORD:-}"
mysqldump --single-transaction --routines --events --triggers --hex-blob --host="$MYSQL_HOST" --port="${MYSQL_PORT:-3306}" --user="$MYSQL_USER" "$MYSQL_DATABASE" | gzip -9 > "$WORK_DIR/database/nexus.sql.gz"
# The application can point this at a mounted upload directory or object-store sync source.
if [[ -n "${NEXUS_UPLOADS_ROOT:-}" && -d "$NEXUS_UPLOADS_ROOT" ]]; then
  tar --sort=name --mtime='UTC 1970-01-01' -czf "$WORK_DIR/files/uploads.tar.gz" -C "$NEXUS_UPLOADS_ROOT" .
else
  : > "$WORK_DIR/files/uploads-not-configured.txt"
fi
printf '%s\n' "$TIMESTAMP" > "$WORK_DIR/created-at.txt"
( cd "$WORK_DIR" && find . -type f -print0 | sort -z | xargs -0 sha256sum ) > "$WORK_DIR/SHA256SUMS"
export BACKUP_ENCRYPTION_KEY_B64
openssl enc -aes-256-cbc -salt -pbkdf2 -iter 200000 -pass env:BACKUP_ENCRYPTION_KEY_B64 -in <(tar -czf - -C "$WORK_DIR" .) -out "$ARCHIVE"
sha256sum "$ARCHIVE" > "$ARCHIVE.sha256"
rm -rf "$WORK_DIR"

if [[ -n "${S3_URI:-}" ]]; then
  command -v aws >/dev/null 2>&1 || { echo "S3_URI is configured but aws CLI is unavailable." >&2; exit 4; }
  aws s3 cp "$ARCHIVE" "$S3_URI/$(basename "$ARCHIVE")" --only-show-errors
  aws s3 cp "$ARCHIVE.sha256" "$S3_URI/$(basename "$ARCHIVE.sha256")" --only-show-errors
fi
find "$BACKUP_ROOT" -maxdepth 1 -type f -name 'nexus-*.tar.gz.enc*' -mtime "+$RETENTION_DAYS" -delete
printf 'Created encrypted backup: %s\n' "$ARCHIVE"
