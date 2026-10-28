# NEXUS Software Documentation Package

**Version:** 1.0 — 28 October 2026

This package documents the current NEXUS repository after a source, schema, router, service, test and existing-log audit. It intentionally separates verified functionality from partial, placeholder and externally configured capability. No application data was changed.

## Deliverables

1. [Master NEXUS User Manual](NEXUS-Master-User-Manual.md)
2. [School Administrator and Platform Super Admin Guide](NEXUS-Admin-SuperAdmin-Guide.md)
3. [Finance and Operations Guide](NEXUS-Finance-Operations-Guide.md)
4. [Teacher and Academic Operations Guide](NEXUS-Teacher-Academic-Operations-Guide.md)
5. [Marketing and Demonstration Handbook](NEXUS-Marketing-Demonstration-Handbook.md)
6. [Functionality and Readiness Gap Report](NEXUS-Functionality-Readiness-Gap-Report.md)
7. [Quick-reference guides](quick-reference/)

## Audit evidence

Primary evidence paths include `client/src/pages/Home.tsx`, `client/src/components/`, `server/routers.ts`, `server/access.ts`, `server/iam.ts`, `server/administration.ts`, `server/assessment.ts`, `server/smis.ts`, `server/payroll.ts`, `server/transport.ts`, `drizzle/schema.ts`, `server/*.test.ts`, `docs/test-logs/`, `docs/multi-school-security.md`, `docs/backup-and-restore.md`, and `installer/`.

## Verification boundary

The current run passed TypeScript checking and 18 test files/80 tests. The documentation is not a claim that every browser workflow, Windows installer path, external provider or legacy multi-school query has passed live acceptance. See the gap report.

## Maintenance rule

When NEXUS labels, permissions, routes or workflows change, update the master manual and the role guide, then rerun the applicable tests and record the verification date. Do not copy a placeholder UI label into a marketing claim without tracing the underlying router/service.
