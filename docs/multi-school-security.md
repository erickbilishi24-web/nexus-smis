# NEXUS Software: multi-school readiness

## Implemented

The application now has a `schools` registry with unique school codes, lifecycle status, creator, and timestamps. Existing accounts retain their credentials and are assigned to the original Ebunangwe Junior School tenant (`EBUNANGWE-JS`). Platform Super Admins can register schools and assign newly created accounts to a selected school; school administrators are limited to their own assigned school.

Administration user lists, counts, and user-detail lookups are scoped to the signed-in administrator's school. Cross-school account management is rejected server-side. Administration password reset is Platform Super Admin-only, rate-limited, revokes active sessions, invalidates reset tokens, activates/unlocks the account, and returns a temporary password once. The first login then requires a password change. Passwords and temporary credentials are not written to audit metadata.

The core academic, learner, attendance, finance, library, resource, communication, reporting, counselling, rollover, and audit tables now have nullable `schoolId` columns. Existing records were backfilled to `EBUNANGWE-JS` without deleting or rewriting business data. `school_settings.schoolId` is also populated, dashboard settings resolve against the signed-in user's school when available, and audit writes inherit the actor's school automatically. Reusable tenant-boundary helpers and `schools/{schoolId}/...` storage-key helpers are available for school logos, signatures, imports, and generated documents.

Phase 1 hardening now scopes dashboard aggregates, learner and staff registry reads, learner/staff mutations, and Resource Hub reads and management writes to the signed-in school. Resource Hub audit entries are school-owned. IAM sessions now persist a 30-day expiry, expired sessions are revoked on request, existing sessions were safely backfilled, and IAM audit entries carry school ownership.

## Migration

`drizzle/0031_loud_bucky.sql` creates the school registry and adds `users.schoolId`. `drizzle/0032_right_lady_bullseye.sql` adds the core domain `schoolId` columns and backfills the legacy tenant. `drizzle/0033_yielding_crusher_hogan.sql` links school settings to that tenant. `drizzle/0034_soft_microchip.sql` adds and backfills the 30-day IAM session expiry. The active database was migrated successfully; verification found zero unassigned rows in the sampled learners, grades, subjects, payments, attendance, audit, and resource tables. The migrations are additive and do not drop or rewrite existing learner, academic, finance, payroll, transport, or attendance records.

The latest verification passed `pnpm run check`, all 62 automated tests across 16 test files, `pnpm run build`, and `git diff --check`. A live two-school destructive/cross-school workflow was not run against production data; it remains a release gate for a disposable staging database.

Phase 2 adds an encrypted backup/restore foundation under `ops/`, with protected configuration, lock protection, retention cleanup, optional separate S3-compatible storage, archive and internal checksums, explicit restore confirmation, and a documented runbook. Shell syntax and an AES-256 encryption/decryption round-trip were tested locally. A real database dump, object-storage upload, and restore remain pending because this sandbox has no deployment credentials or disposable two-school staging database.

## Important rollout limitation

The remaining work is to update every domain read, write, update, and delete path to require the actor's `schoolId`, add school-aware composite indexes and uniqueness rules, and route all new uploads through the school-prefixed storage helpers. Because legacy modules still contain single-school query paths, the application is **not yet a complete data-isolated multi-tenant SaaS**. Do not onboard a second school's production records until those query-path changes and cross-school integration tests are complete.

## Operational guidance

Keep Platform Super Admin credentials separate from school administrator accounts. Give each school a unique code and its own administrator account. Deliver generated temporary passwords through a trusted private channel; a temporary password is not recoverable after the reset dialog closes, so issue a new reset if it is lost. Back up the database before applying future domain-level tenant migrations.
