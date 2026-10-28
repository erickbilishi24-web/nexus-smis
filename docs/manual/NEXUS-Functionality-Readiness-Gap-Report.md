# NEXUS Software — Functionality and Readiness Gap Report

**Audit date:** 28 October 2026  
**Scope:** current repository, schema, routers, services, tests and existing verification logs.  
**Change policy:** no application-data or feature fixes were applied as part of this report. The only code-level change in this documentation batch is removal of an incompatible dependency override that broke Express startup.

## Executive assessment

NEXUS has a credible database-backed academic core: People, attendance, allocations, timetable generation/editing, assessment rules, permissions, authentication, school registry and audit services. Payroll and Transport have substantial service-level implementations. Several Finance & Resources screens are partial or presentational. Multi-school isolation has strong foundations and tests but is not yet SaaS-grade across every legacy path. External services are mostly links, queues or provider-ready infrastructure rather than live integrations.

## Status legend

- **Working/verified:** source and targeted tests/logs support the behavior.
- **Partially working:** some real persistence or workflow exists, but important stages are missing.
- **Unverified:** code exists, but a complete live/browser acceptance path was not evidenced.
- **Missing/placeholder:** UI language exists without a complete backing workflow.
- **External configuration:** requires provider, secrets, deployment or owner policy.

## Priority findings

| Priority | Module/submodule | Finding | Status | Evidence/verification | Expected behaviour | Impact | Recommended fix/dependency |
|---|---|---|---|---|---|---|---|
| Critical | Multi-school / Curriculum & settings | Some legacy reads/writes are not explicitly school-scoped; curriculum uses an unscoped settings limit and offerings query | Risk/partial | `server/curriculum.ts`; `docs/multi-school-security.md` | Every school-owned read/write uses authenticated school context | Cross-school configuration contamination | Add school predicates, composite uniqueness review and two-school DB acceptance tests before onboarding school B |
| Critical | Multi-school / Global keys | Some uniqueness is global rather than `(schoolId,key)` | Risk | `drizzle/schema.ts` subjects, admissions/payment references | School-local keys should not collide unless globally intended | Import/payment conflicts or denial of service between tenants | Decide business identity; migrate constraints/backfill safely |
| Critical | Account recovery | Forgot-password creates token but no mail/SMS delivery | External configuration | `server/iam.ts` source note | Secure reset delivery or support-assisted recovery | Users cannot self-recover; support burden | Configure provider, sender, expiry monitoring and abuse controls |
| High | Finance / Fees | Fee-item CRUD, invoices, discounts, arrears approval and official receipts not verified | Partial | Finance workspace/service audit | Complete fee lifecycle and reconciled official receipts | Financial accountability gaps | Build fee/invoice/receipt domain workflow and approval policy |
| High | Finance / Procurement | Purchase requests, quotations, POs, goods receipts and supplier invoices are UI descriptions/placeholders | Missing/placeholder | `ResourcesFinanceWorkspace.tsx`; no dedicated domain service found | One authoritative procurement transaction chain | Duplicate/off-system purchasing records | Implement procurement entities, approval states, supplier and ledger links |
| High | Finance / Assets | No full asset register/lifecycle/depreciation/custody workflow | Partial/placeholder | Assets reuses stock-style rows | Asset identity and custody should be auditable | Loss, valuation and disposal risk | Add asset register and controlled lifecycle |
| High | Finance / Maintenance | Maintenance form writes synthetic expenditure-like record, not work order | Partial/weak | Finance operations audit | Job assignment/status/estimated/actual cost/completion | Repairs not trackable operationally | Add maintenance work-order domain and expenditure link |
| High | Assessment / Report Cards | Demo fallback and hard-coded institution/contact/term content in report template | Risk | `IntegratedReportCardView.tsx` | Production output must use configured school identity | Incorrect official-looking reports | Replace fallback or watermark demo; make settings authoritative; browser-test output |
| High | Deployment | Windows/XAMPP installer and rollback/restore not executed end-to-end | Unverified | `installer/AUDIT-CHECKLIST.md` | Reproducible fresh install/update/rollback | Deployment failure at customer site | Execute clean Windows acceptance matrix before marketing |
| Medium | Attendance | UI explicitly exposes Grade 7–9 selectors | Partial scope | `AttendanceWorkspace.tsx` | All enabled school levels or documented scope | ECDE/primary cannot follow same workflow | Generalise selector or document supported scope |
| Medium | Academics | Assessment, report-card, archive and curriculum full browser acceptance logs are incomplete | Unverified | Unit tests exist; no equivalent live logs | End-to-end role workflow evidence | Training may overstate readiness | Run seeded staging browser acceptance and retain evidence |
| Medium | Archives/Alumni | Exit requires raw learner ID; no verified archive/alumni export | Partial | `ArchivesCounsellingWorkspace.tsx` | Search/select learner and export historical register | Input error and manual reporting burden | Add searchable selector, duplicate-exit guard and export |
| Medium | Finance / Reports | Many named finance reports are buttons/toasts, not dedicated reports | Partial/placeholder | Finance component/source audit | Filtered, reconciled reports with provenance | Management may rely on labels rather than data | Implement report query contracts or relabel as planned |
| Medium | Messaging | Messages queue records but no external delivery | Queue-only | `server/messages.ts` | Approved provider delivery and status | Users may assume parents were notified | Configure provider or clearly label queue-only |
| Medium | AI / Amal | Amal is new-tab link; no embedding/API/SSO/file exchange; document format selector not proof of files | External handoff/partial | `Home.tsx`, AI workspace audit | Verified integration or explicit handoff | Marketing/expectation risk | Keep disclosure and test provider separately |
| Medium | AI / M-Pesa | Ledger is callback-ready, live gateway not verified | External configuration | AI workspace source | Verified payment receipt before marking paid | Payment disputes | Integrate gateway callbacks, signature validation and reconciliation |
| Low | Dependencies | Automatic audit remediation updated many packages; Express 4 broke when path-to-regexp was forced to 9 | Fixed in this batch; residual audit remains | `pnpm why path-to-regexp`; tests passed after removal | Compatible dependency graph and recorded exceptions | Startup outage risk | Keep Express-compatible 0.1.x; audit upgrades individually; consider Express upgrade separately |
| Low | Audit trail | Application audit exists, but immutable retention/export/alerting not evidenced | Partial | `smis_audit_logs`, administration audit | Durable, reviewable, tamper-evident retention | Investigation and compliance limitations | Define retention, export, external sink and integrity controls |
| Low | Backup | Scripts/runbooks exist, but scheduling, object storage, alerts and restore drill are not configured/proven | Operational code only | `ops/`, `docs/backup-and-restore.md` | Tested, monitored, off-site recovery | Recovery uncertainty | Configure secrets/cron/object store and rehearse disposable restore |
| Low | XLSX import/export | Remaining `xlsx` advisory was not replaced in this scope | Residual risk | Dependency audit | Safe supported workbook parser | Malicious workbook risk | Evaluate maintained parser/sandboxing and upload limits |

## What was actually verified

- `pnpm check` passed after the safe dependency repair.
- `pnpm test -- --run` passed: 18 test files and 80 tests in the current source state.
- Source-backed authentication, permissions, tenant acceptance tests, Resource Hub tests, curriculum tests, academic tests, attendance tests, People import tests, payroll and transport tests exist and pass in the recorded run.
- The Express startup regression was reproduced by the deployment log (`pathRegexp is not a function`) and corrected by removing the incompatible `path-to-regexp` override; dependency resolution now returns Express 4 → `path-to-regexp 0.1.12`.
- No production database records were changed by this documentation batch.

## Features not to promise

Do not promise live SMS/email/WhatsApp, M-Pesa collection, bank transfer, statutory filing, KEMIS/KNEC/TPAD API integration, embedded Amal, offline operation, automatic backups, immutable audit, MFA, full production multi-school SaaS isolation or a tested Windows installer unless separately verified.

## Approval sequence

1. Owner reviews this report and approves the remediation priorities.
2. Security/tenant fixes are implemented and tested before adding schools.
3. Finance domain gaps are resolved before marketing fees/procurement/assets as complete.
4. Report-card template and external-provider disclosures are corrected.
5. Windows/XAMPP and disposable restore acceptance is executed.
6. Updated manuals are re-audited against the new labels and evidence.
