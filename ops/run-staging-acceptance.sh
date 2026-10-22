#!/usr/bin/env bash
set -Eeuo pipefail
# This runner is intentionally opt-in: it must never use the live database.
: "${NEXUS_STAGING_DATABASE_URL:?Set NEXUS_STAGING_DATABASE_URL to a disposable staging database URL}"
if [[ -n "${DATABASE_URL:-}" && "$NEXUS_STAGING_DATABASE_URL" == "$DATABASE_URL" ]]; then
  echo "Refusing to run staging acceptance against DATABASE_URL; use a separate disposable database." >&2
  exit 3
fi
if [[ "${NEXUS_STAGING_CONFIRM:-}" != "I_CONFIRM_DISPOSABLE_STAGING" ]]; then
  echo "Set NEXUS_STAGING_CONFIRM=I_CONFIRM_DISPOSABLE_STAGING after verifying this database is disposable." >&2
  exit 4
fi
export DATABASE_URL="$NEXUS_STAGING_DATABASE_URL"
echo "Running code-level two-school acceptance checks against an isolated configuration."
pnpm test -- --run server/two-school.acceptance.test.ts server/tenant.security.test.ts server/pagination.test.ts
cat <<'EOF'
Database-backed CRUD workflow coverage is intentionally a separate rollout step. Before adding it, provision two disposable schools and seed only synthetic records; never point this runner at production.
EOF
