# NEXUS Software academic structure and rollover

## Audit summary
NEXUS already had reusable `grades`, `subjects`, `learners`, teacher allocations, assessment, attendance, report-card, finance, and audit tables. This implementation adds only the missing academic-year, term, historical enrolment, and rollover workflow tables. Existing learner, mark, attendance, fee, allocation, and report-card records are not rewritten by the migration.

## Migration and recovery
Migration `drizzle/0026_glorious_barracuda.sql` is additive. It creates `academic_years`, `academic_terms`, `learner_enrolments`, `rollover_runs`, and `rollover_items`. The application uses `IF NOT EXISTS` SQL for the connected deployment. Before applying future production migrations, take a database dump and retain the dump with the deployment release. To recover from an application failure, restore the dump and roll back to the prior WebDev checkpoint; the rollover workflow itself supports reversal without deleting historical enrolments.

## Workflow and permissions
Academic setup and rollover procedures are server-protected with the existing administrator procedure. The Curriculum Setup screen now includes academic-year dates, rollover date, Term 1–3 configuration, rollover preview, approval, and reversal. Every preview, approval, and reversal writes to the existing audit log.

## Progression rules
Grades 1–8 advance one grade when a matching destination grade/stream exists. Grade 9 is deliberately marked `pending_action` because the school must configure and approve a Senior School destination. Missing years, grades, or streams are shown as actionable exceptions and are never silently skipped. Approval is transaction-based and idempotent through the learner/year uniqueness constraint. Previous-year enrolments remain intact.

## Manual configuration still required
Configure the academic years and terms in Curriculum Setup, create the destination classes/streams, and review Grade 9 placements before approval. Automated scheduled execution is not enabled because no scheduler has been configured; rollover is administrator-controlled.

## Verification performed
`pnpm run check`, the full Vitest suite (including academic progression tests), and `pnpm run build` must pass before release. The migration SQL should be reviewed and applied only in a safe connected environment.
