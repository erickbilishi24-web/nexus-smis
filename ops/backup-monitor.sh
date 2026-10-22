#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
CONFIG_FILE="${NEXUS_BACKUP_ENV:-/etc/nexus/backup.env}"
[[ -r "$CONFIG_FILE" ]] || { echo "Backup configuration not found: $CONFIG_FILE" >&2; exit 2; }
# shellcheck disable=SC1090
source "$CONFIG_FILE"
: "${BACKUP_ROOT:?BACKUP_ROOT is required}"
MAX_AGE_HOURS="${BACKUP_MAX_AGE_HOURS:-26}"
ALERT_COMMAND="${BACKUP_ALERT_COMMAND:-${FAILURE_ALERT_COMMAND:-}}"
fail() {
  local message="$1"
  echo "$message" >&2
  if [[ -n "$ALERT_COMMAND" ]]; then BACKUP_ALERT_MESSAGE="$message" bash -lc "$ALERT_COMMAND" || true; fi
  exit 1
}
latest="$(find "$BACKUP_ROOT" -maxdepth 1 -type f -name 'nexus-*.tar.gz.enc' -printf '%T@ %p\n' 2>/dev/null | sort -nr | head -1 | cut -d' ' -f2- || true)"
[[ -n "$latest" && -r "$latest" ]] || fail "NEXUS backup monitor: no encrypted backup found in $BACKUP_ROOT"
checksum="$latest.sha256"
[[ -r "$checksum" ]] || fail "NEXUS backup monitor: checksum missing for $latest"
sha256sum --check "$checksum" >/dev/null || fail "NEXUS backup monitor: checksum failed for $latest"
now="$(date +%s)"; modified="$(stat -c %Y "$latest")"; age=$((now - modified)); max_age=$((MAX_AGE_HOURS * 3600))
(( age <= max_age )) || fail "NEXUS backup monitor: latest backup is ${age}s old (maximum ${max_age}s)"
printf 'NEXUS backup monitor OK: %s (%ss old)\n' "$latest" "$age"
