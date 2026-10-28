# NEXUS Software — Quick-Reference Guides

## Principal / Head Teacher — one page

1. Sign in and confirm the school/year/term in the header.
2. Open **Dashboard** and trace important figures to **Attendance**, **Academics**, **Reports** or **Finance & Resources**.
3. Review **Teacher Allocations** and **Timetable Generator** before the school day.
4. Review attendance approval and academic marklist status.
5. Open **Reports** for permission-aware department reports and report cards.
6. Use **User Administration** to review active staff, not to share passwords.
7. Use **Audit Trail** for sensitive changes.
8. Escalate missing permissions, finance discrepancies and data-isolation concerns.

## Bursar / Accounts Officer — one page

1. Open **Finance & Resources → Fees**.
2. Locate the correct learner and verify the balance.
3. Select **Receive payment**, enter actual amount, method and unique reference.
4. Confirm the payment row and balance; do not promise an official receipt PDF unless separately configured.
5. Use **Finance** for supported expenditures and retain supporting documents.
6. Treat Procurement, Assets and Maintenance labels as partial unless the underlying workflow is confirmed.
7. In Payroll, separate preparer and approver; record external payment only after it occurred outside NEXUS.
8. In Transport, check capacity, billing period, reference and linked expenditure.
9. Use **Audit Trail** for reconciliation.

## Teacher — one page

1. Open **Dashboard** and check **Timetable Generator → Personal timetable**.
2. Use **Attendance** to view the permitted register; mark only if the role/class scope allows it.
3. Open **Academics → Teacher entry**.
4. Select allocated class/subject and **Mid-Term** or **End-Term**.
5. **Load learner roster**, enter scores/remarks, **Save**, then submit.
6. Blank means missing; zero is a valid score.
7. Use **Reports** only within permission; do not access Finance or People admission unless granted.
8. Escalate incorrect class/subject allocation to the administrator; do not create a duplicate allocation.

## School Administrator — one page

1. **Administration → School Registry**: confirm school status and login link.
2. **Curriculum Setup**: select enabled levels and learning areas; **Save curriculum**.
3. **Academic setup & progression**: save year/terms; preview rollover before approval.
4. **People**: create classes, learners and staff; validate imports before finalisation.
5. **User Administration**: create role-scoped users; credentials are shown once.
6. **Teacher Allocations**: assign subjects and one class teacher per class.
7. **Timetable Generator**: configure requirements, generate, review warnings, edit/save, print.
8. Review attendance approvals, assessments and report-card settings.
9. Deactivate staff instead of deleting history.

## Platform Super Admin — one page

1. **School Registry**: create, activate, suspend, archive and copy active login links.
2. Create school memberships and initial School Admin accounts.
3. Use **SchoolSwitcher** only among active authorised memberships.
4. Review **Permission Matrix**, **Audit Trail** and **Account Deletions**.
5. Use **Reset password** support only after confirming the user's identity.
6. Protect the Super Admin account; never publish its credentials.
7. Confirm backups, restore drills, provider secrets and support ownership outside the application.
8. Before adding a second production school, complete the two-school isolation acceptance test and remediate the gap report.

## Glossary

- **Allocation:** authoritative teacher–class–subject assignment.
- **CBC:** Competency-Based Curriculum.
- **Force-placed lesson:** timetable lesson inserted by recovery mode and visually flagged for review.
- **School membership:** authorised link between a user and a school workspace.
- **Marklist:** assessment score table for a selected class/subject/period.
- **Rollover:** controlled movement of learners to a new academic year/destination.
- **Resource Hub:** permission-controlled external-link directory.
- **Tenant:** one school’s isolated workspace and records.
- **Whole Class Marklist:** authorised consolidated view of all subjects for a class.

## Short assessment and answer key

1. **Where should a teacher's identity be corrected?** People, then verify allocations/timetable.  
2. **Does a blank mark mean zero?** No; blank means missing and zero is a valid score.  
3. **Can NEXUS claim SMS delivery from a queued message?** No; delivery provider is not verified.  
4. **Who can create a school?** Platform Super Admin.  
5. **What must happen before generating a timetable?** Curriculum, classes, active staff, allocations and weekly requirements must be checked.  
6. **Can a permanent password be recovered from the user table?** No; use the authorised reset/setup flow.  
7. **Is a browser print-to-PDF automatically an official signed record?** No.  
8. **Should an ordinary teacher see Finance?** Not by default; server permission must agree with the school policy.

## Onboarding checklists

### User onboarding

- [ ] Account created with correct school/role.
- [ ] Setup link or temporary credential delivered securely.
- [ ] User changed password.
- [ ] Scope/class/subjects confirmed.
- [ ] User can reach only the intended modules.

### School activation

- [ ] School record and code verified.
- [ ] Active status and login link tested.
- [ ] Curriculum, terms, classes and People records loaded.
- [ ] Allocation, attendance, assessment and report-card smoke test completed.
- [ ] Backup/support owner identified.

### Module training

- [ ] People and import validation.
- [ ] Curriculum/year/terms.
- [ ] Allocations/timetable.
- [ ] Attendance approval.
- [ ] Assessment/marklist/report card.
- [ ] Finance/operations limitations.
- [ ] User administration/audit.
- [ ] External links/AI disclosure.
