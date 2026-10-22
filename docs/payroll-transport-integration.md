# NEXUS Software — Payroll and Transport & Fleet Integration

## Scope

The supplied payroll and transport source bundles are integrated into the existing NEXUS Finance & Resources workspace. They are not standalone applications and do not create a second database or duplicate finance ledger.

Finance & Resources now includes permission-aware `Payroll` and `Transport & Fleet` sections alongside Dashboard, Fees, Finance, Procurement, Stores, Assets, Maintenance, Reports and Audit trail.

## Reused NEXUS services

- Existing `staff_profiles` records are used for payroll employees and transport drivers.
- Existing `learners`, guardians and learner-guardian links are used for transport allocations.
- Existing `payments` records receive transport collections through a link table; transport payment retries are protected by school-scoped receipt/reference uniqueness.
- Existing `expenditures` records receive payroll employer costs and transport fuel/maintenance/repair costs; transport cost writes use an idempotency key.
- Existing authentication, effective permissions and audit logging are used by server procedures.
- Existing Stores, Procurement and Assets workspaces remain the source of truth for those workflows; no replacement ledgers were introduced.

## Database migration

The bundle contained a shared migration chain numbered 0020–0022 in both ZIP subdirectories. Those duplicate bundle files were not copied into the active migration chain. Instead, the host schema generated one migration:

- `drizzle/0030_wise_red_ghost.sql`

It creates the seven payroll tables and ten transport tables once, with uniqueness constraints for payroll periods, payroll staff items, transport learner allocation, transport charges, transport receipts and transport cost idempotency. It also seeds the documented 2026 payroll baseline and enables transport for configured school settings using idempotent statements.

The active project database was checked before application and contained no payroll or `transport_*` tables. After the schema operation, all 17 new tables were verified as present. Existing learner, staff, payments and expenditure records were not modified.

The original source migration files are retained for reference under `docs/payroll-transport-source-migrations/`; they are not part of the active migration chain.

## Permissions

New server/API permissions are available through the existing permission system:

- `payroll.view` — confidential payroll register access
- `payroll.edit` — compensation, adjustments, loans and payroll preparation
- `payroll.approve` — independent adjustment, loan and payroll approval
- `payroll.rules` — effective-dated statutory rule configuration
- `transport.view` — transport workspace access
- `transport.edit` — attendance, trips and incident operations
- `transport.manage` — vehicles, routes, assignments, module settings and incident resolution

The server procedures enforce these permissions; UI visibility is not the security boundary. The default administrator role receives the new permissions. Other roles require explicit permission assignment where appropriate.

## Verification

The following checks passed after integration:

- 14 Vitest files passed
- 57 tests passed
- TypeScript check passed
- Production Vite and server build passed
- `git diff --check` passed
- Database post-migration table audit passed

## Operational and legal limits

The payroll rules are configurable implementation defaults, not legal advice. Confirm current KRA, NSSF, SHIF, Affordable Housing Levy, pension and other employer obligations with a qualified Kenyan payroll professional before live payroll use. NEXUS does not file statutory returns, make bank payments, or connect to a payroll provider.

The current NEXUS project remains single-school scoped because its existing core schema has one school settings record and no authenticated multi-tenant membership model. The integration therefore does not claim multi-school isolation.

Before production payroll or transport operations, an authorized administrator should review statutory rules, assign payroll and transport permissions, configure staff compensation, register vehicles/routes, and test approval and ledger workflows with a controlled non-production record.
