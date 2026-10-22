# NEXUS Software: multi-school readiness

## Implemented

- Added a `schools` registry with a unique school code, display name, lifecycle status, creator, and timestamps.
- Added nullable `users.schoolId` and backfilled all existing accounts to the original `Ebunangwe Junior School` tenant (`EBUNANGWE-JS`). Existing records and credentials are preserved.
- Added a Platform Super Admin-only **School Registry** in Administration for registering customer schools.
- Platform Super Admins can assign a newly created account to a registered school. School administrators automatically create users in their own assigned school and cannot select another school.
- Administration user lists, counts, and user-detail lookups are scoped to the signed-in administrator's school. Cross-school account management is rejected server-side.
- Replaced the administration password reset action with a Platform Super Admin-only, rate-limited temporary password flow. Active sessions are revoked, reset tokens are invalidated, the account is unlocked/activated, and the temporary password is shown only once in the UI. Passwords and temporary credentials are never written to audit metadata.
- Added a mandatory first-login password-change screen for temporary-password accounts.
- Added audit entries for school registration and temporary-password resets.

## Migration

`drizzle/0031_loud_bucky.sql` creates the `schools` table and adds `users.schoolId`. The active database was migrated safely and existing users were assigned to the original school. The migration is additive; it does not drop or rewrite learner, academic, finance, payroll, transport, or attendance records.

## Important rollout limitation

This release establishes tenant identity and secures Administration/IAM operations. Existing domain tables in this legacy single-school application do not yet all carry `schoolId`, so the application is **not yet a complete data-isolated multi-tenant SaaS**. Before onboarding a second school with production data, add `schoolId` plus indexed foreign-key/authorization filters to every domain table (learners, guardians, grades, subjects, allocations, attendance, assessments, reports, finance, library, payroll, transport, resources, audit and related tables), and add school-aware settings and file-storage prefixes. Until that migration is completed, the second-school registry should be treated as onboarding metadata rather than permission to share the existing domain dataset.

## Operational guidance

- Keep Platform Super Admin credentials separate from any school administrator account.
- Give each school a unique code and its own administrator account.
- Deliver a generated temporary password through a trusted private channel; it is not recoverable after the dialog is closed, so use the reset action again if it is lost.
- Back up the database before applying future domain-level tenant migrations.
