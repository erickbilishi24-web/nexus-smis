# NEXUS-smis Multi-School Safety Audit

## Scope

This audit was performed under a restricted, non-destructive scope. It did not seed production schools, alter live records, apply schema migrations, publish code, or deploy. Existing tenant data and school registry entries were preserved.

## Verified baseline

- The repository already contains a school registry, school memberships, school-aware settings, school identifiers on the main academic/finance/health/boarding/library/payroll/transport tables, school-scoped storage helpers, and two-school acceptance tests.
- Live registry inspection confirmed the existing schools remain present, including Ebunangwe Junior School, MWANGAZA ACADEMY, and the two staging schools.
- Baseline and post-change validation passed TypeScript, production build, and the full Vitest suite.

## Corrections applied

1. **IAM school status enforcement**
   - Ordinary users now require an active school at login.
   - Existing IAM sessions are revalidated against the current school status on every authenticated request.
   - Sessions for ordinary users linked to suspended, archived, disabled, or missing schools are revoked.
   - Platform Super Admin accounts retain platform-level access for administration.

2. **Teacher allocation isolation**
   - Allocation creation now resolves the actor school first.
   - Teacher, grade, active-conflict, and existing-allocation lookups are restricted to that school.
   - New and updated allocations are written with the actor school ID.

3. **Attendance guardian alerts**
   - Alert source learners and attendance rows are school-scoped.
   - Duplicate checks and generated notifications are school-scoped and tagged with the school ID.

4. **Guardian and AI data isolation**
   - Guardian listing and creation now require the current user and school.
   - Guardian links reject learners from another school.
   - NEXUS AI attendance, finance, academic, and stock facts now query only the current school.

5. **People import undo isolation**
   - Import history discovery, dependency checks, and cleanup are restricted to the actor school.
   - Undo can no longer select another school’s import audit row or delete another school’s learner, staff, or user records by ID.

6. **IAM regression coverage**
   - Added a focused test for active-school enforcement.

## Validation

- TypeScript: passed
- Production build: passed
- Regression tests: **85 passed across 18 test files**
- `git diff --check`: passed

The build still reports the existing non-blocking bundle-size warning for chunks over 500 kB. This was not changed because it is a performance optimization rather than a tenant-isolation defect.

## Remaining follow-up risks

A broader codebase scan still identifies legacy service functions that should be migrated to explicit `(userId)` school-scoped signatures before any public deployment, especially older archive/report helpers and older bulk-import catalog paths. They were not changed in this pass because doing so would require a larger UI/router compatibility change. These should be treated as release-blocking follow-up items for a full production security review.

## Publication status

No GitHub push or deployment was performed under the restricted scope. The corrected working tree is checkpoint-ready for review.
