#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

CONFIG_FILE="${NEXUS_BACKUP_ENV:-/etc/nexus/backup.env}"
ARCHIVE="${1:-}"
if [[ -z "$ARCHIVE" || ! -r "$ARCHIVE" ]]; then echo "Usage: restore.sh /path/to/nexus-*.tar.gz.enc" >&2; exit 2; fi
[[ -r "$CONFIG_FILE" ]] || { echo "Backup configuration not found: $CONFIG_FILE" >&2; exit 2; }
# shellcheck disable=SC1090
source "$CONFIG_FILE"
: "${BACKUP_ENCRYPTION_KEY_B64:?BACKUP_ENCRYPTION_KEY_B64 is required}"
: "${MYSQL_DATABASE:?MYSQL_DATABASE is required}"
: "${MYSQL_USER:?MYSQL_USER is required}"
: "${MYSQL_HOST:?MYSQL_HOST is required}"
CHECKSUM="$ARCHIVE.sha256"
[[ -r "$CHECKSUM" ]] || { echo "Missing checksum file: $CHECKSUM" >&2; exit 3; }
sha256sum --check "$CHECKSUM"
read -r -p "This replaces data in ${MYSQL_DATABASE}@${MYSQL_HOST}. Type RESTORE NEXUS to continue: " confirmation
[[ "$confirmation" == "RESTORE NEXUS" ]] || { echo "Restore cancelled."; exit 4; }
WORK_DIR="$(mktemp -d)"
cleanup() { rm -rf "$WORK_DIR"; }
trap cleanup EXIT
export BACKUP_ENCRYPTION_KEY_B64
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -pass env:BACKUP_ENCRYPTION_KEY_B64 -in "$ARCHIVE" | tar -xzf - -C "$WORK_DIR"
sha256sum --check "$WORK_DIR/SHA256SUMS"
export MYSQL_PWD="${MYSQL_PASSWORD:-}"
gunzip -c "$WORK_DIR/database/nexus.sql.gz" | mysql --protocol=tcp --host="$MYSQL_HOST" --port="${MYSQL_PORT:-3306}" --user="$MYSQL_USER" "$MYSQL_DATABASE"
printf 'Database restore completed from %s. Upload restoration requires a separately approved file-store restore.\n' "$ARCHIVE"
