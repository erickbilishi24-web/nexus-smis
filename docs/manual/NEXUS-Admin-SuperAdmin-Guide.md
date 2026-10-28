# NEXUS Software — School Administrator and Platform Super Admin Guide

**Version:** 1.0 — 28 October 2026  
**Use:** onboarding schools, configuring academic operations, provisioning users and supporting accounts.  
**Scope:** current verified/source-audited implementation; unsupported controls are clearly marked.

## 1. Responsibility boundary

The Platform Super Admin operates the platform and school registry. The School Administrator/Principal operates the assigned school. The School Admin cannot silently enter another school's data; active school membership and server-side permissions are required.

## 2. School onboarding

### Create and activate a school

1. Sign in as Platform Super Admin.
2. Open **Administration → School Registry**.
3. Select **Create school**.
4. Enter a unique school code, school name and initial status.
5. Save and confirm the record.
6. Use **Edit**, **Activate**, **Suspend** or **Archive** only after confirming the business decision.
7. Select **Copy school login link** for an active school.

School codes are trimmed, uppercased and validated. Archive preserves history but disables login. The system does not provide public self-registration, a prospect CRM, automatic domain provisioning or a commercial subscription workflow.

### Activation checklist

- [ ] School code and legal/operating name confirmed.
- [ ] Status is correct.
- [ ] School Admin account is assigned to the correct school.
- [ ] Login link copied and delivered securely.
- [ ] Levels and curriculum offerings selected.
- [ ] Academic year and terms created.
- [ ] Classes/streams created.
- [ ] Staff and learners imported/entered.
- [ ] Allocations, attendance, timetable and report-card settings tested.
- [ ] Backup and support arrangements recorded outside NEXUS.

## 3. Curriculum and academic setup

Open **Administration → Curriculum Setup**. Select the level checkboxes: **ECDE**, **Lower Primary**, **Upper Primary**, **Junior School**, **Senior School**. Select applicable learning areas/pathways and click **Save curriculum**. Use **Save school levels** when enabling/disabling whole levels; the school-level save is Super Admin-only.

Open **Academic setup & progression** to enter year dates, rollover date and terms. Create destination classes before attempting rollover. Use **Preview rollover**, inspect ready/pending rows, **Exclude** approved exceptions and **Approve ready learners**. Grade 9 needs an approved Senior School destination. Rollover is manual, not scheduled.

**Tenant note:** current curriculum/settings source paths require additional school-scoping hardening before broad multi-school production rollout. Do not assume a setting saved in one school is isolated until the relevant test is complete.

## 4. Users and credentials

Open **Administration → User Administration → Users & Credentials**.

### Create a user

1. Select **Create user**.
2. Enter full name, username, staff/employee ID, department, email and phone as applicable.
3. Select the correct role and account status.
4. Select the school, class and subjects where required.
5. Enter an initial password only when authorised; otherwise use the single-use setup link.
6. Select **Create user**.
7. Give the one-time credential through a secure channel and instruct the user to change it immediately.

The credential dialog states that the value is shown once and cannot be retrieved later. Never record passwords in the manual, screenshots or shared spreadsheets.

### Edit, reset, deactivate and delete

Use **Edit** for profile/assignment changes. Use **More → Change role**, **Change assignment**, **Reset password**, **Activate account**, **Deactivate account**, **Lock account**, **Unlock account** or **View user activity**.

Prefer **Deactivate account** for staff who leave or transfer because it is reversible and preserves history. Permanent deletion requires typing the exact username and is protected for the signed-in account and Super Admin. Deletion removes login/session/reset/override records while retaining staff history where designed. Confirm the account owner before any destructive operation.

### Permission Matrix

Use **Permission Matrix** to review the effective capability, role grants and user-specific overrides. Give the least privilege required. An ordinary teacher should not receive `finance.view`, global People access or `administration.manage_permissions` merely because they teach a class.

## 5. School switching

A user with more than one active `school_memberships` record sees the school selector in the header. Select the authorised active school. NEXUS reloads the workspace and invalidates the school snapshot. Suspended or archived memberships cannot be selected.

## 6. Audit and account support

Use **Audit Trail** with User, Module, Action, From and To filters. Use **Account Deletions** to review deletion events. Audit entries contain actor, action, target, metadata and timestamp; secret-like fields are filtered. The current implementation does not establish immutable/WORM retention, external alerting or a formal retention schedule.

## 7. Password recovery support

The forgot-password endpoint creates a short-lived token but does not itself send email/SMS. If the provider is not configured, use Super Admin **Reset password** to issue a setup link. Do not reveal whether a username exists, and do not send a permanent password over an insecure channel. Administration reset throttling is process-local and should be strengthened before multi-instance deployment.

## 8. Readiness acceptance test

Use fictional data in a staging school:

1. Create two staging schools.
2. Create one administrator per school.
3. Verify each admin sees only their school and cannot switch without membership.
4. Create a learner, teacher and class in each school.
5. Test People, Attendance, Assessments, Finance and Reports with same-looking IDs.
6. Attempt cross-school numeric-ID access through the UI and server procedure; it must fail or return no record.
7. Deactivate one account and confirm login/session revocation.
8. Review audit entries.

This is a recommended test; it is not a claim that every legacy path has passed the test.

## 9. Escalation guide

- Login/reset issue: School Admin → Platform Super Admin; check provider configuration.
- Missing module: inspect permission matrix and school membership.
- Wrong learner/class: correct People source data first.
- Finance discrepancy: stop duplicate entries and reconcile payment reference/audit history.
- Curriculum cross-school concern: stop rollout and escalate for tenant-scope remediation.
- Backup/restore concern: use the operational runbook and a disposable database; never test on live production data.
