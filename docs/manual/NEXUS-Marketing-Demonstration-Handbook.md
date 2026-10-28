# NEXUS Software — Marketing and Live Demonstration Handbook

**Version:** 1.0 — 28 October 2026  
**Purpose:** present NEXUS accurately to Kenyan schools without inventing customers, savings, certifications, integrations or performance claims.

## 1. Three-minute elevator pitch

“NEXUS is a school-management workspace that connects the records a Kenyan school already depends on: learners, staff, CBC curriculum, classes, teacher allocations, attendance, assessments, report cards, fees, operations and school administration. Instead of copying the same learner or teacher details between paper registers and spreadsheets, staff use one permission-aware school record. Principals see operational and academic summaries; teachers work only within their allocations; class teachers manage their permitted registers; authorised finance users record payments and expenditures; and administrators retain an audit trail. NEXUS can print or export several working records, while clearly separating features that require external services—such as message delivery, payment callbacks, KICD synchronisation and Amal integration—from what is already in the platform.”

## 2. Ten-minute demonstration

**Audience:** principal and school administrator.  
**Objective:** show one connected learner-to-report workflow.

1. Sign in to a clearly labelled fictional school.
2. Show Dashboard and explain that figures come from persisted records.
3. Open People and search a fictional learner, “Brian Wafula”.
4. Show the class and guardian context.
5. Open Teacher Allocations and show the subject teacher.
6. Open Timetable Generator and show the generated master/personal view, warnings and edit/save controls.
7. Open Attendance and record a fictional morning session.
8. Open Academics and show an allocated subject mark entry/marklist.
9. Open Reports and select the same learner, year, term and assessment type.
10. Show Print/PDF, then explain that browser print is not a signed statutory artifact.
11. Return to Dashboard and point out the source-of-truth chain.

**Say:** “The value is not a decorative dashboard. Each view should be traced back to a learner, allocation, attendance session, assessment or payment record.”

## 3. Twenty-minute principal/owner demonstration

Add:

- School Registry creation, activation, suspension and login-link copy.
- Role/permission matrix and school switcher for a multi-school platform owner.
- Curriculum levels: ECDE, Lower Primary, Upper Primary, Junior School and Senior School.
- Academic year/term setup and manual rollover preview.
- Finance payment row and balance reconciliation.
- Payroll state machine and the explicit “does not transfer funds/file returns” limitation.
- Transport vehicle, route, learner allocation, payment and linked expenditure.
- Audit Trail and Account Deletions.

**Questions to ask the principal:** Which levels are offered? Who approves attendance? Which reports are official? Who reconciles payments? Who can create users? What backup and support policy will the school adopt?

## 4. Thirty-minute mixed-audience demonstration

| Time | Audience | Demonstration |
|---:|---|---|
| 0–3 | All | Login, school context and dashboard |
| 3–8 | Admin/ICT | School Registry, roles, users, audit |
| 8–14 | Teachers | People, allocations, timetable and attendance |
| 14–19 | Exam/academic | Assessments, marklists, report cards |
| 19–24 | Bursar | Payments, balance, payroll/transport boundaries |
| 24–27 | Operations | Stores/maintenance/procurement status and limitations |
| 27–30 | All | Resource Hub, Messages queue, NEXUS AI/Amal handoff, Q&A |

## 5. Fictional demonstration school

Use clearly labelled fictional data only:

- **School:** Ikumu Primary and Junior School
- **Code:** IKUMU-PJ
- **Principal:** Mrs. Achieng Otieno
- **Bursar:** Mr. Kamau Njoroge
- **Teachers:** Sarah Anupi, John Andera, Enock Amukhuma
- **Learners:** Brian Wafula, Amina Wekesa, Kevin Ochieng
- **Classes:** Grade 7 Blue, Grade 8 Blue, Grade 9 Blue
- **Assessment:** End-Term 2026, clearly labelled DEMO
- **Payment:** DEMO-REC-001, KSh 15,000, not a real transaction

Never use real learner identity, phone, fee or health information in a public demonstration.

## 6. Stakeholder benefits

| Stakeholder | Practical value |
|---|---|
| Principal/owner | One accountable view of academic, attendance, people, finance and operations records |
| School Admin | Controlled setup of users, classes, curriculum, terms and school identity |
| Teacher | Allocated classes/subjects, timetable, attendance/marks workflow and fewer duplicate registers |
| Class Teacher | Class-scoped attendance and report access where authorised |
| Exam Council | Whole-class marklist review without default mark-entry rights |
| Bursar/accounts | Learner payments, balances, expenditures, payroll/transport ledger links |
| Storekeeper | Stock movement records and low-stock visibility where enabled |
| Learner/guardian | More consistent records and printable reports through the school |
| Platform Super Admin | School lifecycle, memberships, role policy and support visibility |

## 7. Safe claims and claims to avoid

### Safe when the required data/configuration exists

- NEXUS provides permission-aware school workspaces.
- People, attendance, assessments, allocations and core timetable paths are database-backed.
- NEXUS supports school registry lifecycle controls and school-specific login links.
- Resource Hub is a controlled, audited external-link directory.
- Messages can select recipients, preview and queue records.
- Amal can be opened in a new tab from NEXUS.
- Payroll and transport have internal records and documented cross-module links.

### Do not promise without a separate live verification/configuration

- SMS, email or WhatsApp delivery.
- M-Pesa callback/payment confirmation.
- KEMIS/KNEC/TPAD API integration.
- Embedded Amal, Amal SSO or file exchange.
- Official statutory payroll filing or bank payment.
- Automatic scheduled backups, immutable audit retention or disaster recovery.
- Fully tested Windows/XAMPP installer and multi-school SaaS isolation across every legacy path.
- Customer numbers, savings percentages, certifications, testimonials or uptime guarantees.

## 8. Common buyer questions

**Why adopt NEXUS?** It connects records and permissions so schools can reduce repeated entry and make workflows more accountable. The school should verify that each required module is mature enough for its policy.

**How is it different from paper/spreadsheets?** It provides shared records, server-side permission checks, audit entries and connected academic workflows. It does not eliminate the need for school approval, reconciliation or backup policy.

**Who controls access?** Platform Super Admin controls the platform; school administrators manage assigned school operations; roles and server-side permissions restrict sensitive actions.

**Can the school manage users?** Yes, through User Administration within permission scope. Password reset delivery still needs a configured provider or Super Admin support.

**Can it support levels?** The curriculum catalogue includes ECDE, Lower Primary, Upper Primary, Junior School and Senior School. Confirm offered pathways and destination rules before rollout.

**How are report cards generated?** Select grade, learner, year, term and assessment type; verify marks/comments; print through the report-card workflow. Configure the school's production template first.

**What if internet fails?** The current product is server/database-backed. Offline operation was not verified and must not be promised.

**Can existing records migrate?** Learner/staff templates and validation workflows exist. A migration project should map fields, test duplicates, preserve history and use a staging database.

**What support is available?** Define the owner's support hours, response targets and escalation contacts separately. NEXUS itself does not create a commercial SLA.

**What does it cost?** Pricing, subscription terms, hosting ownership and commercial support remain decisions for the product owner; this audit did not verify any price.

## 9. Full-day onboarding suggestion

09:00 orientation and roles; 09:30 school setup; 10:30 People/import; 11:30 curriculum/terms/classes; 13:00 allocations/timetable; 14:00 attendance/assessments; 15:00 reports/finance; 16:00 security, backup and acceptance test; 16:45 questions and sign-off.

## 10. Demo close

End with three decisions: “Which records must be authoritative? Which roles approve each action? Which gaps must be completed before production?” Avoid claiming completion where the readiness report marks a gap.
