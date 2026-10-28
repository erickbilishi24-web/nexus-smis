# NEXUS Software — Master User Manual

**Product:** NEXUS School Management Information System (NEXUS SMIS)  
**Manual version:** 1.0 — 28 October 2026  
**Evidence basis:** Source audit of the current repository, schema, routers, services, automated tests, and existing verification logs.  
**Important:** This manual documents the system that exists. Labels and procedures marked **Verified** are supported by source and/or test evidence. Items marked **Partial**, **Unverified**, **Unavailable**, or **External configuration** must not be marketed as complete.

## Contents

1. NEXUS overview and data flow
2. Getting started, login and account security
3. Registering and onboarding a school
4. Roles, permissions and least privilege
5. Module and submodule guide
6. End-to-end school scenarios
7. Reports, printing and exports
8. Troubleshooting and frequently asked questions
9. Data security, privacy, backups and accountability
10. Demonstration and training reference
11. Feature-status register

## 1. NEXUS overview and data flow

NEXUS is a Kenyan school-management workspace for schools that enable ECDE, Lower Primary, Upper Primary, Junior School and/or Senior School. It brings learner records, staff, curriculum, attendance, assessments, report cards, finance, resources, timetables, communication and school administration into one permission-controlled system.

A typical information flow is:

```text
School Registry → School Settings/Curriculum → Classes & People
       ↓                    ↓                    ↓
Teacher Allocations → Timetable → Attendance / Assessments
       ↓                                      ↓
      Roles and permissions              Reports / Report Cards
       ↓                                      ↓
Finance, Transport and Payroll → Audit Trail and exports
```

People is the authoritative source for learner and staff identities. Teacher allocations are the authoritative source for who teaches a class and learning area. Assessments and marks feed marklists and report cards. Attendance is recorded by session and can be submitted for approval. Finance calculates balances from fee structures and payments where configured. Transport charges and payroll external-payment records connect to the central payments/expenditure tables.

### What NEXUS solves

NEXUS reduces duplicated registers, disconnected spreadsheets, handwritten calculations and unclear accountability. A school can search one learner record, see the assigned class, use the correct teacher allocation, record attendance, enter assessment marks and produce a report card without retyping the learner's identity in every module.

### Example transition from paper to NEXUS

Ikumu Primary and Junior School previously used a paper admission book, handwritten fee receipts, separate teacher spreadsheets and a wall timetable. The school first configures levels, classes and staff, then imports learners with the validation preview. The bursar records payments using the learner's NEXUS record and reference. Teachers enter attendance and marks only for assigned classes or subjects. The administrator reviews a permission-aware marklist, generates report cards and uses the audit trail to investigate changes. The school still needs a local policy for receipt issuance, approval of expenditure and backup operations because those are not all fully automated in the current product.

### Platform Super Admin versus School Admin

A **Platform Super Admin** operates the platform level: creates or activates schools, can switch among authorised school memberships, manages platform-wide user and permission controls, and has wildcard access. A **School Administrator/Principal** manages the assigned school's records and settings within server-enforced permissions. A school administrator cannot create or activate another school's production record or bypass school membership boundaries.

A **user account** is the login identity. A **role** is a reusable responsibility label such as Administrator, Teacher, Class Teacher, Accounts Officer, Deputy, Senior Teacher, Head of Department or Exam Council. A **permission** is a specific capability such as `finance.view`, `assessments.edit` or `reports.view`. Effective access is the union of assigned roles and permitted overrides, but server-side procedures—not hidden menu items—are the security boundary.

## 2. Getting started, login and security

### Sign in

1. Open the authorised NEXUS address or the school-specific login link copied from **Administration → School Registry → Copy school login link**.
2. Enter **Username** or email and **Password**.
3. Select **Sign in to Nexus-smis**.
4. If successful, NEXUS establishes a secure session and opens the school workspace. The header shows the current school and academic year/term.
5. If the account has `mustChangePassword`, complete the mandatory password-change screen before using other modules.

School-specific URLs are only valid for active schools. A non-Super Admin must have an active membership for the selected school.

### Incorrect credentials and lockout

An incorrect username or password returns an error without exposing account details. Ordinary accounts are locked after five failed attempts. The Platform Super Admin account is exempt from the ordinary lockout rule, but it must still be protected and used only by the owner or authorised platform operator.

### Temporary credentials and password changes

When an authorised administrator creates a user, the normal workflow issues a single-use setup link. The Platform Super Admin may set an initial password. A temporary password or setup link is shown once and cannot be retrieved from the administration screen later. Never place a permanent password in a manual, screenshot, email or chat message.

On first login, use **New password**, **Confirm new password** and **Save new password** when the mandatory-change screen appears. Use a long password that is unique to NEXUS. Administration-created passwords require at least ten characters with letters and digits; the in-app change endpoint requires at least ten characters.

### Forgotten password

1. Select **Forgot password?**.
2. Enter the username or email and request the reset.
3. The system intentionally returns an accepted response without confirming whether the account exists.
4. A reset token is created for 30 minutes, but the current repository does not itself deliver it by email or SMS. Delivery requires an external provider configuration.
5. If delivery is unavailable, the Platform Super Admin may use **User Administration → More → Reset password** to issue a secure setup link, subject to permission and rate limits.

Do not ask a user to send a password in plain text. Do not reset a different user's account without confirming identity and authorisation.

### Logout and account support

Select **Sign out** when leaving a shared computer. Account suspension, deactivation or lock revokes active IAM sessions. If an expected menu is missing, check the user's role, school membership, active status and permission matrix before escalating.

## 3. Registering and onboarding a new school

The current business process is Platform Super Admin-led. The code does not provide public self-registration or a prospect-to-school CRM.

### Ikumu onboarding checklist

| Step | Responsible person | Actual area/action | Expected result | Status |
|---|---|---|---|---|
| 1 | Platform owner | Receive enquiry outside NEXUS | Commercial record is created in the owner's process | External/manual |
| 2 | Platform Super Admin | **Administration → School Registry → Create school** | School code/name/status are saved | Implemented, source-verified |
| 3 | Platform Super Admin | Set status to **Active** when ready | School-specific login link can be copied | Implemented |
| 4 | Platform Super Admin | **Edit**, **Activate**, **Suspend**, **Archive** | Lifecycle changes are audited; archive retains history | Implemented |
| 5 | Platform Super Admin | **Copy school login link** | School-scoped login URL is available | Implemented |
| 6 | Platform Super Admin | Create initial School Admin in **User Administration** | Account is tied to the correct school/class scope | Implemented |
| 7 | School Admin | **Curriculum Setup** | Select levels and learning areas, then **Save curriculum** | Implemented; KICD source is external |
| 8 | School Admin | **Academic setup & progression** | Save academic year, rollover date and terms | Implemented; manual execution |
| 9 | School Admin | **People** and class/stream tools | Staff, learners and classes are available | Partially verified |
| 10 | School Admin | Configure allocations, timetable, attendance and assessment | Operational readiness can be checked | Depends on data and permissions |

Required school identity includes a unique uppercase school code, school name, status and assigned school membership. Configure motto, logo/signatures, current term, academic year and subject short names in school settings where available. Do not claim that NEXUS provisions a domain, sends credentials automatically or supplies a support contract; those are owner/deployment decisions.

### Sample activation record

```text
School name: Ikumu Primary and Junior School
School code: IKUMU-PJ
Initial status: pending_activation
Levels: Lower Primary, Upper Primary, Junior School
Initial School Admin: created by Platform Super Admin and tied to IKUMU-PJ
Activation check: school record, membership, login link, curriculum, academic year, classes, staff and backup plan reviewed
Approved by: Platform Super Admin
Date: [enter actual date]
```

## 4. Roles and permissions

The current role catalogue includes **Super Administrator**, **Administrator**, **Head of Department**, **Deputy**, **Teacher**, **Senior Teacher**, **Class Teacher**, **Exam Council**, **Accounts Officer**, **Storekeeper** and **Support Staff**. The UI sometimes displays Accounts Officer as Bursar in finance contexts. Do not add a role to a school's operating policy without confirming the current role catalogue.

### Practical role matrix

| Role | Typical view access | Typical create/edit/approve access | Restricted areas |
|---|---|---|---|
| Super Administrator | Wildcard platform access | School lifecycle, users, roles, settings and all authorised operations | Must protect account; never share credentials |
| Administrator / Principal | School dashboard, learners, academics, attendance, reports, finance and settings as granted | User support, settings, approvals and school operations | Other schools without membership |
| Deputy | Academic/administrative capabilities mapped to deputy policy | Depends on effective permissions | Finance or user management unless granted |
| Head of Department | Leadership/academic capabilities mapped to HOD policy | Depends on effective permissions | Sensitive finance and platform operations unless granted |
| Senior Teacher | Teacher capabilities with assigned leadership scope | Depends on effective permissions | Finance and global learner records by default |
| Class Teacher | Assigned class attendance and report access; reports permission | Attendance capture and class workflows where allocated | Fee changes, global People access and unrelated classes |
| Teacher | Assigned teaching/assessment access; attendance may be view-only | Enter marks for active allocations where permitted | Finance, People admission and unrelated classes |
| Exam Council | Assessment/marklist review | Whole-class marklist review; not assessment creation by default | Mark entry/assessment creation unless separately granted |
| Accounts Officer | Finance view/edit | Payments and finance records as granted | Academic records unless separately granted |
| Storekeeper | Store view/edit | Stock movement operations where implemented | Finance and learner records |
| Support Staff | Explicitly granted modules only | Only assigned actions | Default access is least privilege |

Permissions include module actions such as `view`, `create`, `edit`, `delete`, `approve` and `export`, plus specialised controls such as `administration.manage_permissions`. The permission matrix is authoritative. A hidden button is not a security control; every sensitive tRPC procedure must reject an unauthorised request.

## 5. Module and submodule guide

Each module below uses the actual navigation label. Status wording is deliberate.

### 5.1 Dashboard — Implemented, database-backed; broader live verification required

**Purpose:** Shows school summaries, academic activity, attendance/operations indicators, finance widgets when permitted, activity and timetable entry points.

**Access:** `Dashboard` under Workspace; requires `dashboard.view`. Widgets can be collapsed and role-specific widget preferences are stored in the browser.

**Procedure:** Sign in → select **Dashboard** → review learner, attendance, assessment, finance and operations cards → select a card/action to open the related module → verify the destination record rather than relying only on the displayed total.

**Scenario:** Principal Mrs. Achieng checks whether attendance follow-up and fee collection require attention before the morning briefing.

**Verification:** Open the linked module, apply the same date/term/class filters and reconcile the count. Do not present seeded/demo counts as live school performance.

**Status:** Implemented but not fully verified for every role and empty state.

### 5.2 People — Learners and Teachers & Staff — Implemented and verified

**Purpose:** Authoritative identity registry for learners and staff.

**Access:** **People** → `Learners` or `Teachers & Staff`. Exact controls include **Add learner**, **Edit learner record**, **Save learner**, **Update learner**, **Activate**, **Deactivate**, search by `name, admission or guardian`, class filters, **Download list**, **Learner template**, **Staff template**, validation preview and **Upload & finalize**.

**Learner procedure:**

1. Open **People → Learners**.
2. Select **Add learner** or download **Learner template**.
3. Enter the learner's identity, unique admission number, gender, grade/class/stream, guardian and status.
4. Save the individual record, or upload the workbook and inspect validation errors.
5. Resolve exact class values and duplicate admission numbers before **Upload & finalize**.
6. Confirm the learner appears in the roster and the class is available to allocations, attendance, marks and reports.

**Staff procedure:** Use **Teachers & Staff**, add/edit the staff profile, select the actual role and active status, set teacher code where authorised, and verify the person appears in allocation options. Deactivate staff instead of deleting historical identities.

**Status:** Implemented and verified in the dated People module log. XLSX import/export is subject to the residual `xlsx@0.18.5` dependency risk described in the gap report.

### 5.3 Classes & Streams — Partial / distributed

Class and stream records are used by People, academics, attendance, allocations and timetable. The code contains class/grade CRUD and import support, but a single complete Classes & Streams workspace and its full runtime workflow were not fully verified. Use exact Grade/Class values from the Add Learner list. Do not create duplicate streams to work around a spelling mismatch without administrator approval.

### 5.4 Curriculum Setup — Implemented, live save verification required

**Access:** **Administration → Curriculum Setup**. Exact labels: **CBC Curriculum Setup**, **Save curriculum**, **School levels in use**, **Save school levels**, **Super Admin only**, **ECDE**, **Lower Primary**, **Upper Primary**, **Junior School**, **Senior School**, **Search grade, pathway or learning area**, **Open KICD source**.

**Procedure:** Select enabled levels → select learning areas/pathways → click **Save curriculum**. To change levels, select/deselect and click **Save school levels**. When a level is disabled, its offerings are set to not offered. Senior School pathway combinations must be checked against current KICD designs; the link is a reference, not a synchronised KICD API.

**Status:** Implemented; source tests cover catalogue integrity, but tenant-scoped live save behavior requires remediation/verification.

### 5.5 Academic setup & progression — Implemented, manual and not fully verified

**Access:** **Curriculum Setup → Academic setup & progression**. Configure **Year**, **Starts**, **Ends**, **Rollover date**, terms and **End-of-year rollover**.

**Procedure:** Create destination classes and the next academic year → select **Preview rollover** → inspect ready and pending-action learners → use **Exclude** for approved exceptions → select **Approve ready learners** → verify new enrolments and historical records → use **Reverse** only after review.

Grades 1–8 have configured progression rules; ECDE progression is configured; Grade 9 requires an approved Senior School destination. Rollover is not an automatic scheduler. Preserve historical enrolments and report cards.

### 5.6 Teacher Allocations — Implemented and verified for core flow

**Access:** **Teacher Allocations** under School Operations. Use **Class Teacher and Grade Allocation**, **Select class teacher**, **Select grade / class**, **Academic year**, **Term**, **Save allocation**.

Allocate one active class teacher per class/stream, then allocate each learning area to the authoritative staff identity. Resolve **Subject already allocated**, teacher-code and class-teacher conflicts through the replacement/deactivation workflow. Confirm the active allocation list before generating a timetable.

### 5.7 Timetable Generator — Core implemented and verified; broader export/UI coverage incomplete

**Access:** **Timetable Generator**. Exact controls include **Personal timetable**, **Master timetable**, **Print**, **Save & regenerate timetable**, **Download unplaced lessons PDF**, **Timetable audit report**, **Validation & optimization report**, **Edit timetable**, **Save timetable**, **Download PDF**, **Download Excel**, **Warnings only**, and **Generate timetable**.

**Procedure:** Configure days, sessions, breaks, lunch, weekly lesson requirements, active teachers and allocations → click **Generate timetable** → review expected versus placed lessons, missing teacher allocations, hard conflicts and soft consecutive-teacher warnings → correct inputs or use the clearly labelled force-placement choice where policy permits → use edit/drag swap → **Save timetable** → validate → print/export.

A subject should not be placed twice in one day where the configured rule applies. Core subjects are prioritised before noon, English/Kiswahili adjacency is separated where possible, and horizontal teacher conflicts are checked. Force-placed cells are visually highlighted for review.

### 5.8 Attendance — Implemented and verified

**Access:** **Attendance → Learner attendance**. Exact controls: **Register date**, **Present Morning**, **Present Afternoon**, **Present**, **Absent**, **Late**, **Excused**, **Not marked**, **Mark all Grade N morning/afternoon present**, **Save session**, **Print / PDF**, **Download CSV**, **Submit for approval**, **Approve register**, **Reopen**, and summary periods **Weekly/Monthly/Termly/Yearly**.

**Procedure:** Select date and session → select authorised class → mark each learner or mark all present → correct absences/late/excused → **Save session** → repeat for the second session if required → submit/approve. The current UI is explicitly Grade 7–9; confirm scope before promising ECDE/primary attendance.

Ordinary teachers are view-only under the documented policy; authorised class teachers/administrators capture attendance for their permitted class scope.

### 5.9 Academics, assessments and marklists — Implemented, full live workflow not fully verified

**Access:** **Academics → Teacher entry** or **Whole Class Marklist (All Subjects)** where permitted. Exact selectors include **Allocated class & subject**, **Assessment type**, **Mid-Term**, **End-Term**, **Create New Assessment**, **Load learner roster**, **Save**, submit/finalise and correction actions.

Subject teachers enter marks only for active allocations. Blank means missing; zero is a valid score. Assessment creation is administrator-only. Exam Council can review whole-class marklists but cannot create assessments by default. Approved assessments can be locked; locked corrections require an administrator and reason. Marklists support Average and client-side Excel export.

### 5.10 Report Cards — Implemented, production template verification required

**Access:** **Reports → Learner report cards**. Select **Grade**, **Learner**, **Academic year**, **Term**, **Assessment type**. Verify learning areas, CBC levels, facilitator, comments and status. Use **Save comments** and **Print / PDF**.

Report cards use CBC performance-level codes where applicable and show facilitator/teacher information from allocations. Configure school identity, logo, signatures, motto and term dates first. The current source contains a demo fallback and hard-coded institution/contact/term text; verify and replace these before production marketing.

### 5.11 Finance & Resources — Partial overall; Payroll and Transport are stronger

The combined workspace contains **Dashboard**, **Fees**, **Finance**, **Procurement**, **Stores**, **Assets**, **Maintenance**, **Reports**, **Audit**, **Payroll** and **Transport** when the permission exists. See the separate Finance and Operations Guide for exact status.

### 5.12 Reports — Permission-aware, mixed output maturity

**Reports** shows Attendance department report, Finance department report when permitted, Academic performance report and learner report cards. Attendance CSV/print, marklist Excel/print, report-card print and timetable PDF/Excel/print exist. Many named finance reports are presentation placeholders or toast messages rather than dedicated report services. Browser print-to-PDF is not the same as a signed or immutable official PDF.

### 5.13 Academic Archives & Alumni — Implemented, exit workflow not fully verified

Tabs: **Academic Archives**, **Alumni Register**, **Learner Exit & Completion**. Search historical records and use **Process learner exit** with status, date, reason and optional destination. The current exit form asks for a learner ID; verify the ID before saving. Historical assessment/report data should remain preserved. No visible archive/alumni export was verified.

### 5.14 User Administration — Implemented and verified at source/test level

Tabs: **Users & Credentials**, **Permission Matrix**, **Classes & Streams**, **Report Comments**, **Audit Trail**, **Account Deletions**. Actions include **View**, **Deactivate**, **Edit**, **Delete**, **More**, **Edit User**, **Change role**, **Change assignment**, **Reset password**, **Activate account**, **Deactivate account**, **Lock account**, **Unlock account** and **View user activity**.

Create users with full name, username, initial/new password where authorised, employee ID, department, email, phone, role, status, school, class and subjects. Credentials are shown once. Account deletion requires exact username and protects Super Admin; prefer deactivation for reversible staff exit.

### 5.15 School Registry — Implemented for Platform Super Admin

Create, edit, activate, suspend, archive and copy school login links. School codes are uppercase/validated and unique. Archived schools retain history but login is disabled. Only active memberships may switch school workspaces. This is not public self-registration.

### 5.16 Resource Hub and Resource Links — Implemented and audited

**Resource Hub** is visible to signed-in users. **Resource Links** is the manager view. Default categories include TPAD, School Website, Video & Audio Lessons, Virtual Labs, KEMIS and KNEC. URLs are validated as HTTPS unless HTTP is explicitly permitted. Management is restricted to the configured platform owner/superadmin policy and actions are audited. These are external links, not proof of API integrations.

### 5.17 Library — Implemented in navigation; verify full runtime coverage

Library supports issued-book list workflows, learner selection and browser CSV/print output according to the current UI/source. Confirm exact stock and issue controls with a live librarian account before training a school on unverified actions.

### 5.18 Guidance & Counselling — Permission-aware; detailed runtime verification required

The safeguarding workspace is permission-filtered. Counselling records and follow-up procedures exist in the router/service layer. Use only authorised learner information, record factual notes and do not expose counselling details to ordinary staff without the required permission.

### 5.19 Messages — Queue-only, not delivery

**Messages** supports recipient selection, preview, channel selection and queue history. It records queued SMS/email/WhatsApp/in-app messages and audits the action, but no external delivery provider is configured or verified. Demonstrate queueing only, not delivery receipts.

### 5.20 NEXUS AI — Permission-aware assistant plus Amal handoff; external configuration required

The module includes **Ask NEXUS AI**, **Verified response**, **My AI documents**, **Saved drafts**, **Document preview**, **Print document**, **AI activity**, **Session audit trail**, **AI settings**, **Personal generation preferences**, and **M-Pesa ledger / Document payment history**. The assistant is constrained by user permissions and persisted school facts when the provider/database is available.

**Open Amal** opens `https://platform.amal.education/` in a new tab. This is a handoff, not an embedded Amal API or single sign-on integration. The document studio currently produces a draft/preview with print support; a format selector is not proof of a real DOCX/PDF export. M-Pesa ledger support is ready for verified callback records, but live gateway/callback collection is not proven.

### 5.21 Feedback — Super Admin destination

Feedback is shown in the Super Admin area for user experience feedback. Confirm operational routing and response ownership with the platform owner before promising service-level response times.

## 6. Connected end-to-end scenarios

### Scenario 1: Parent pays fees

The bursar opens **Finance & Resources → Fees**, locates Brian Wafula, selects the actual learner record, checks the displayed balance, enters an illustrative KSh 15,000 payment, selects M-Pesa/Bank/Cash and a unique reference, then selects **Receive payment**. The bursar confirms the payment row and refreshed balance. The displayed table is a payment record; do not claim an official receipt PDF or automatic M-Pesa confirmation unless configured. If the wrong learner or duplicate reference is selected, stop and escalate for an auditable correction rather than deleting the history.

### Scenario 2: New school joins

The Platform Super Admin creates Ikumu in School Registry, assigns status, creates the first School Admin, copies the school login link, then hands the onboarding checklist to the school. The School Admin configures levels, terms, classes, staff, learners, allocations and settings. No public self-registration or automatic credential delivery is claimed.

### Scenario 3: Principal generates a report card

The school completes allocations and assessments. The authorised reviewer opens **Reports**, selects Grade, learner, academic year, term and assessment type, verifies marks and CBC levels, enters comments, selects **Save comments**, then uses **Print / PDF**. Missing marks are corrected through the assessment workflow; do not edit the report output directly to conceal a missing mark.

### Scenario 4: Teacher takes attendance

The authorised class teacher opens **Attendance**, chooses the date and morning/afternoon session, selects the class, marks each learner and saves. The register is submitted for approval where configured. Ordinary teachers should not be granted capture rights merely because they can view the register.

### Scenario 5: Exam officer manages assessments

The administrator creates the assessment, subject teachers load their allocated roster and save marks, the Exam Council reviews the whole-class marklist, and an authorised administrator approves/locks. Corrections after lock require a reason and elevated permission.

### Scenario 6: School prepares a timetable

The administrator confirms classes, curriculum offerings, teacher allocations and weekly requirements, selects **Generate timetable**, reviews unplaced lessons/conflicts/warnings, edits or swaps cells if needed, saves and prints/exports. Force-placed lessons must be reviewed before publishing.

### Scenario 7: Principal manages staff

The administrator opens **User Administration**, selects **Create user**, assigns the exact role/class/subjects, and issues a single-use setup link or initial password. The staff member signs in and changes the password. On transfer, deactivate or adjust assignment; preserve historical allocations and audit records.

### Scenario 8: Inventory and purchases

The current system has partial Stores and placeholder Procurement. A safe demonstration shows stock movements where implemented, but must state that quotations, purchase orders, suppliers and goods-received workflows are not fully implemented. Do not duplicate a transaction in Finance and Procurement as if a full procurement integration exists.

### Scenario 9: School bus

Transport is substantially implemented: configure vehicle and route, allocate learner/guardian, bill the period, record payment, capture route attendance, record trips, record costs and incidents. Transport costs link to central expenditures. Confirm insurance/inspection and capacity before operation.

### Scenario 10: Payroll

Payroll supports rules, compensation, approved adjustments, loans, draft calculation, approval, external payment recording, expenditure linkage and exports. The system does not transfer funds or file statutory returns. Verify current PAYE, NSSF, SHIF, Affordable Housing Levy and other requirements against official guidance for the relevant payment period.

### Scenario 11: Learner progression

Create next-year destination classes, preview rollover, inspect pending Grade 9 destinations, exclude approved exceptions, approve ready learners and verify historical records. Reverse only a reviewed run. There is no automatic scheduler.

### Scenario 12: Principal reviews performance

Open Dashboard and Reports, review live cards, then verify each figure in its source module with matching filters. Use attendance summaries, assessment marklists, report cards and finance balances only when the principal's effective permissions allow them.

### Scenario 13: Forgotten password

Use **Forgot password?**. If external mail/SMS is not configured, the Super Admin issues a secure setup link through User Administration. Never disclose a permanent password or bypass the audit trail.

### Scenario 14: External resources and Amal

Open **Resource Hub**, select a configured HTTPS link and use the browser's return/navigation to come back to NEXUS. For AI, select **NEXUS AI → Open Amal**. Explain that the external service is not embedded or API-integrated unless separately verified.

## 7. Reports, printing and exports

- Attendance: browser **Print / PDF**, **Download CSV**, summary print/download.
- Assessments: browser **Print / PDF**, client-side **Excel** marklist.
- Report cards: browser **Print / PDF** after selecting learner/year/term/type.
- Timetable: **Print**, **Download PDF**, **Download Excel**, validation/audit reports and unplaced-lessons PDF.
- Finance: balances **Download CSV** and browser print; no verified official receipt PDF service.
- Payroll: CSV schedules and payslip print; not statutory returns.
- Library: issued-list CSV and print.
- Department reports: browser print and simple CSV summary.

For A4 output, use the application's landscape/print styling where provided, confirm school identity and filters, preview page breaks and verify the learner/class/term before handing out a report. A browser print-to-PDF is a local output, not automatically a signed official record.

## 8. Troubleshooting

| Symptom | Safe checks | Corrective action |
|---|---|---|
| Login fails | Check username, school code/link, account status and reset availability | Use approved reset path; escalate to Super Admin |
| Module missing | Check effective permission, role, school membership and active status | Administrator reviews permission matrix; never bypass server controls |
| Learner not found | Search admission/name; check class/status/school | Correct the People record or import validation; do not duplicate |
| Class not found during upload | Use exact Add Learner Grade/Class value | Correct workbook or create the class through authorised class tools |
| Duplicate learner | Compare admission number and school | Keep authoritative record; use controlled correction/deactivation |
| Mark missing | Blank is missing; confirm assessment, class, term and allocation | Teacher completes mark; reviewer checks scope; do not enter a fake zero |
| Report card wrong | Confirm learner/year/term/type and allocation facilitator | Correct source marks/comments/settings, regenerate/print again |
| Fee balance wrong | Confirm learner, fee structure, payment reference and school | Stop duplicate entry; reconcile central payment history |
| Save rejected | Read validation message and required permission | Correct input or ask authorised administrator; do not edit DB directly |
| Timetable conflict | Inspect teacher/class allocation, requirements, unplaced list and warning type | Fix allocation/requirements or review force placement |
| Export/print problem | Check browser print dialog, filters and popup/download permissions | Retry after confirming data; do not claim a file was generated if only print preview opened |
| External link fails | Confirm URL, HTTPS, school network and provider availability | Escalate to external provider; NEXUS cannot repair a third-party service |
| Slow loading | Check network, database/provider status and query scope | Retry; escalate with timestamp/user/module; do not repeat destructive submissions |

## 9. Security, privacy and accountability

NEXUS uses role-based permissions, school memberships, server-side procedures, bcrypt/scrypt password handling in different paths, secure session cookies, expiry checks, lockout for ordinary accounts, audit entries and school-prefixed storage helpers. This audit did not verify MFA, row-level database security, immutable audit storage, automatic backup scheduling, or a live email/SMS reset provider.

Handle learner, staff, counselling and financial information as confidential. Store printed reports securely, share only with authorised recipients, and follow the Kenyan Data Protection Act, 2019 and school policy. This manual is not legal advice.

Backups are supplied as operational scripts and runbooks, not as a configured guarantee. A deployment must configure protected credentials, encryption-key storage, retention, off-site copies, alerts and staging restore drills. Never test a restore on the live database.

## 10. Training and demonstration reference

Use the separate **Marketing and Demonstration Handbook** for presentation scripts and the quick-reference guides for role-based onboarding. A safe connected demo sequence is: sign in → Dashboard → People → Teacher Allocations → Timetable Generator → Attendance → Academics → Reports → Finance → Resource Hub → NEXUS AI. Use clearly labelled fictional data and disclose every external or placeholder capability.

## 11. Feature-status register

**Implemented and verified:** People core workflows, attendance capture/approval/exports, teacher allocation to timetable core path, Resource Hub URL safety/authorization tests, authentication/session tests, permissions tests, school switcher code path, payroll and transport service paths at source level, current TypeScript/tests/build evidence.

**Implemented but not fully verified:** Dashboard all widgets, curriculum saves and tenant scope, academic rollover live UI, assessment browser workflow, report-card production template, archives/alumni, library, counselling, finance detailed workflows, payroll/transport browser acceptance.

**Partial or placeholder:** Procurement, fee structures/invoices/official receipts, stores item CRUD/UI, asset register, maintenance work orders, many named finance reports, external message delivery, live M-Pesa callback, Amal API/SSO/file exchange.

**Requires external configuration:** Password reset mail/SMS, Forge/LLM provider, storage/object backups, maps/messaging/payment providers, KICD source availability, Windows/XAMPP deployment services.

**Not verified and not promised:** Full live two-school acceptance of every legacy path, installer end-to-end Windows tests, MFA, statutory filings, automated backups, immutable audit retention and service-level/commercial claims.
