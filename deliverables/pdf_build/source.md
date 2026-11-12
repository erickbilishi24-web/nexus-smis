# MWANGAZA ACADEMY – NEXUS SMIS ADVANCED ACADEMICS AND LEARNER REPORT CARDS TESTING GUIDE – 2027
**Version:** 1.0 · **Prepared for:** administrators, teachers, examination officers and QA testers · **School code:** MAK2027

> **Use this guide as a controlled test plan, not as an instruction to recreate or overwrite school data.** It covers only Academics—Assessments and Examination Management and Learner Report Cards.

## Executive purpose
This continuation package tests whether the existing NEXUS SMIS installation can protect, calculate, review, approve, publish and reconcile Kenyan CBC assessment results and learner report cards. It deliberately separates configuration inspection from execution. A page that loads is not a pass: every result must be traced to an authoritative school-scoped record.

## Environment preservation and live audit note
| Item | Guide expectation | Read-only live audit / test instruction |
| --- | --- | --- |
| School | MWANGAZA ACADEMY · MAK2027 | Confirmed in the database: MWANGAZA ACADEMY, Kakamega, Lurambi, active. |
| Academic year | 2027 | Verify in Curriculum Setup before running any test; do not reset it. |
| Terms | Term 1: 6 Jan–2 Apr; Term 2: 27 Apr–6 Aug; Term 3: 30 Aug–30 Nov | Confirm dates and active-term badge in the live school; use the configured term as authoritative. |
| Learners | 480 across PP1–Grade 9 | Read-only audit found 110 current learners, 10 per grade, and only stream A records. Treat this as a configuration difference/defect to document, not something to silently repair in this test package. |
| Staff | 24 teaching + 8 non-teaching | Read-only audit found 10 staff profiles for schoolId 60001. Reconcile identities before assigning test responsibility. |
| Curriculum and allocations | Existing learning areas and teacher allocations | Read-only audit returned 0 school-scoped subjects and 0 active allocations. Do not import or create them from this workbook without approved remediation. |
| Assessment and reports | Use existing records | Read-only audit returned 0 assessments, 0 marks and 0 report cards for the audited school scope. Record the exact timestamp and query evidence. |

**Interpretation labels:** `Working` means tested and reconciled; `Configured—untested` means visible but not exercised; `Partially functional` means some paths work; `Missing` means no authoritative record or control exists; `Defective` means behaviour contradicts the acceptance rule. The live audit above is evidence for triage only.

## Operating rules before every test
1. Confirm the current-school badge reads MWANGAZA ACADEMY / MAK2027 and record a screenshot.
2. Confirm year, term and active-term badge; never infer a term from a browser URL or an old export.
3. Use a test learner or a clearly approved record. Do not overwrite existing production marks.
4. Download the latest NEXUS import template before any upload. The workbook delivered with this guide is a test dataset, not a claim that its headings are the current live importer contract.
5. Start with one learner, one learning area and one assessment; reconcile before expanding.
6. Capture actor, role, school, timestamp, selected filters, request result, record ID and screenshot for every pass or failure.
7. If a test needs new data, stop and obtain approval. Label the record `QA-2027-SUPPLEMENTAL` and never use it to disguise a live configuration gap.
8. Never directly manipulate the production database to simulate normal operations.

## Section A — Pre-testing audit checklist
| Audit item | Inspect | Where | Expected evidence | Status decision / response |
| --- | --- | --- | --- | --- |
| Assessment categories and titles | Names, maximum marks, status, dates, year and term | Academics → Assessments; live query/read-only export | Screenshot + IDs + export | If absent, mark Missing; do not recreate without approval. |
| Academic year and terms | 2027 and three date ranges; active term | Administration → Curriculum Setup | Year/term table + active badge | If dates overlap, raise High defect. |
| Grades, streams and enrolments | Actual names, streams, counts, learner IDs | People → Learners; Curriculum Setup | Roster export + counts | If guide differs, document difference and use live names. |
| CBC learning areas | Offered status, codes, max marks by grade | Curriculum Setup → Learning Areas | Subject list + grade mapping | Do not add unconfigured areas from the workbook. |
| Teacher allocations | Active teacher, class, subject, term and year | Allocation Register | Filtered register + teacher codes | Inactive/replaced records must not authorize current entry. |
| Teacher accounts and roles | Admin, Deputy, Council, class and subject roles | Administration → Users | Role/access screenshots | Test server denial as well as hidden controls. |
| Grading scales | Percentage and CBC modes; sample boundaries | Curriculum Setup → Grading | Scale export + policy approval | Label boundaries illustrative unless approved by school. |
| Mark-entry records | Existing assessment/mark IDs, status and last changer | Assessments → Marklists | Counts + sample IDs | Do not reset or bulk-replace existing rows. |
| Report settings | Layout, logo, signatures, school identity and output options | Administration → Report Card Settings | Preview + saved settings | Missing identity fields are Medium/High depending on publication risk. |
| Comment banks | BE/AE/ME/EE and class/principal roles | Administration → Comment Settings | 40-comment or configured-bank export | Class and Principal banks must remain distinct. |
| Approval workflow | Submit, return, approve, lock, publish and correction | Assessments / Reports | Status transition log | Any bypass of approval is Critical. |
| Permissions and privacy | School scope, role scope, report confidentiality | Users, API response and direct URL checks | Role matrix + denied response | Any cross-school data is Critical and blocks acceptance. |

## Section B — Academics: advanced test scenarios
## 40 executable Academics and Examination Management scenarios
The scenarios below are executable tests. For every case, capture the user role, school badge, selected year/term, screen state, timestamp, screenshots, and resulting record identifier.

### A01 — Create a custom assessment title
**Steps.** As Erick Bilishi, open Academics → Assessments, select 2027, Term 1, Grade 7 and one allocated learning area; enter “Opening Assessment”; save.
**Expected result.** Only an authorized administrator can create it; the title, year, term, grade, subject, creator and timestamp persist.
**Evidence.** Screenshot of form and saved record; audit event ID.

### A02 — Create a second custom title
**Steps.** Create “Continuous Assessment Test 1” for the same period but a different configured assessment slot.
**Expected result.** The system accepts a distinct title without changing the first record.
**Evidence.** Two record IDs and an audit comparison.

### A03 — Reject a duplicate assessment
**Steps.** Attempt to create the same title, period, grade and learning area twice.
**Expected result.** A clear duplicate message appears and no second authoritative assessment is created.
**Evidence.** Before/after record count and message.

### A04 — Wrong academic year
**Steps.** Select 2026 while the test dataset is 2027 and try to create an assessment.
**Expected result.** The wrong-year record is blocked or clearly marked as historical; no 2027 result is overwritten.
**Evidence.** Selected filters and server response.

### A05 — Wrong term isolation
**Steps.** Open a Term 1 assessment while Term 2 is active as a teacher.
**Expected result.** The teacher is blocked; an authorized administrator sees the inactive-term confirmation before proceeding.
**Evidence.** Warning text and audit event if overridden.

### A06 — Maximum marks policy
**Steps.** Create or open an assessment with the approved maximum mark configured by the school.
**Expected result.** The maximum is visible to the marker and is used consistently in percentage calculations.
**Evidence.** Configuration screenshot and calculated example.

### A07 — Unauthorized assessment creation
**Steps.** Sign in as Sarah Anupi or an ordinary subject teacher and look for Create New Assessment.
**Expected result.** The control is hidden or disabled and the server rejects a direct request.
**Evidence.** Role, UI state and rejected request.

### A08 — Edit assessment metadata
**Steps.** As an administrator, change a title without changing its year, term, grade or subject.
**Expected result.** The title changes while existing marks retain their assessment ID and history.
**Evidence.** Before/after title and mark count.

### A09 — Edit assessment with marks
**Steps.** Attempt to change a marked assessment’s learning area or class.
**Expected result.** The system requires a safe correction workflow or blocks the destructive change; marks remain traceable.
**Evidence.** Prompt, audit entry, and unchanged mark IDs.

### A10 — Deactivate an assessment
**Steps.** Deactivate a test assessment that has no production marks.
**Expected result.** It becomes unavailable for new entry but remains visible in history.
**Evidence.** Status before/after and list filter.

### A11 — Allocated subject scope
**Steps.** As John Andera, open only learning areas and classes assigned to him.
**Expected result.** Only active school-scoped allocations appear; another teacher’s scope is rejected server-side.
**Evidence.** Scope list and attempted unauthorized URL/API result.

### A12 — Correct grade and stream
**Steps.** Use a teacher assigned to Grade 7 Blue or the configured equivalent.
**Expected result.** The roster matches the selected grade/stream and does not include another stream.
**Evidence.** Roster count and class label.

### A13 — Save an ordinary mark
**Steps.** Enter 59 for Adrian Andayi in Kiswahili and save.
**Expected result.** The mark persists and is available to the marklist and report-card read path.
**Evidence.** Saved row, refresh result, and mark audit.

### A14 — Save zero
**Steps.** Enter 0 for a learner who completed the assessment with zero.
**Expected result.** Zero is treated as a valid score, not as missing.
**Evidence.** Row status and exported value.

### A15 — Save maximum
**Steps.** Enter 100 for a learner.
**Expected result.** 100 is accepted, competency calculation is consistent, and no rounding changes it.
**Evidence.** Marklist and report-card value.

### A16 — Save decimal mark
**Steps.** Enter 59.5 where decimal marks are approved.
**Expected result.** The system either preserves the supported precision or gives a clear validation message; it must not silently truncate.
**Evidence.** Input, stored value, and message.

### A17 — Reject above maximum
**Steps.** Enter 101 or a value above the configured maximum.
**Expected result.** Inline/server validation rejects it and no invalid mark is stored.
**Evidence.** Validation message and unchanged database count.

### A18 — Leave a mark blank
**Steps.** Clear one learner’s mark and save.
**Expected result.** Blank remains missing, never zero; missing count increases.
**Evidence.** Marklist missing badge and export.

### A19 — Duplicate save
**Steps.** Submit the same learner row twice from two browser tabs.
**Expected result.** The authoritative row is updated safely; duplicate records are not created.
**Evidence.** Two request timestamps and one final mark row.

### A20 — Missing learner detection
**Steps.** Compare the roster to saved marks after omitting one learner.
**Expected result.** The whole-class marklist identifies the learner as missing.
**Evidence.** Roster-to-mark reconciliation.

### A21 — Stream transfer
**Steps.** Move a clearly identified test learner between configured streams using the approved workflow.
**Expected result.** Historical marks remain intact and new entry follows the new class without cross-stream leakage.
**Evidence.** Transfer history and before/after reports.

### A22 — Post-submission edit
**Steps.** Submit a subject assessment, then try to edit as the subject teacher.
**Expected result.** Teacher editing is blocked after submission; authorized correction follows the review workflow.
**Evidence.** Status transition and rejected edit.

### A23 — Concurrent teacher edits
**Steps.** Open the same assessment as two authorized users and save different values.
**Expected result.** The final state is deterministic and the audit trail identifies both attempts/changes.
**Evidence.** Audit records and final reconciliation.

### A24 — Refresh persistence
**Steps.** Save marks, refresh the browser, sign out and sign back in.
**Expected result.** Saved marks remain identical and are loaded from the database, not local UI state.
**Evidence.** Before/after screenshots and query result.

### A25 — Whole-class access — Super Administrator
**Steps.** Open Whole Class Marklist as Erick Bilishi.
**Expected result.** The complete configured class period appears with all active learning areas, learners, missing indicators and exports.
**Evidence.** Role badge, full table, export files.

### A26 — Whole-class access — Administrator
**Steps.** Open the same view as the configured Administrator.
**Expected result.** Administrator access is equivalent for authorized school records and remains school-scoped.
**Evidence.** Role badge and cross-school negative test.

### A27 — Whole-class access — Examination Council
**Steps.** Open the view as Daniel Barasa.
**Expected result.** Examination Council can review authorized whole-class data without gaining unrelated configuration privileges.
**Evidence.** Review screen and denied settings action.

### A28 — Whole-class filter by term
**Steps.** Select Term 1, Term 2 and Term 3 in separate checks.
**Expected result.** Only the selected term’s records appear; no mixed-term columns or scores are shown.
**Evidence.** Three exports with term labels.

### A29 — Whole-class filter by stream
**Steps.** Filter to one configured stream.
**Expected result.** Only that stream’s learners and learning areas appear.
**Evidence.** Filtered count and sample admission numbers.

### A30 — Whole-class export and print
**Steps.** Sort by learner name, admission number and average; export/print after each sort.
**Expected result.** Output preserves the visible order and includes school identity, term, class, learning areas and missing indicators.
**Evidence.** PDF/print preview and workbook row order.

### A31 — Reconcile subject and whole-class marks
**Steps.** Compare one subject marklist with the corresponding whole-class cells.
**Expected result.** Every entered value matches by learner ID/admission number and term.
**Evidence.** Reconciliation sheet and discrepancy count.

### A32 — Examination Council unusual score review
**Steps.** Use a test set containing 0, 1, 59, 79.5 and 100.
**Expected result.** Review workflow highlights unusual or missing values without changing them automatically.
**Evidence.** Review notes and unchanged mark rows.

### A33 — Moderation correction
**Steps.** Council flags a wrong submitted mark; administrator confirms a correction.
**Expected result.** Corrected value is stored, original value remains traceable, and teacher is notified where configured.
**Evidence.** Correction reason, audit chain, notification.

### A34 — Approved result protection
**Steps.** Approve or lock an assessment and attempt a normal teacher edit.
**Expected result.** Edit is blocked; only the designated correction function can change it.
**Evidence.** Status, error message, audit record.

### A35 — Percentage grading boundaries
**Steps.** Test illustrative boundary values 0, 10, 20, 21, 30, 31, 40, 41, 57, 58, 74, 75, 89 and 90.
**Expected result.** Each maps to the configured sample scale consistently; the guide does not claim official KICD thresholds.
**Evidence.** Boundary matrix export.

### A36 — CBC competency display
**Steps.** Verify BE1, BE2, AE1, AE2, ME1, ME2, EE1 and EE2 across marklist and reports.
**Expected result.** Labels and descriptions are consistent and missing remains blank.
**Evidence.** Marklist/report screenshots.

### A37 — Equal scores
**Steps.** Give two learners the same score.
**Expected result.** They receive the same percentage and competency; sorting uses a stable tie-breaker.
**Evidence.** Sorted rows and calculations.

### A38 — Assessment with incomplete records
**Steps.** Generate analysis while some marks are blank.
**Expected result.** Missing values are excluded from averages according to policy and clearly disclosed.
**Evidence.** Analysis summary and missing count.

### A39 — Learning-area exclusion
**Steps.** Use a learning area not offered to the selected grade.
**Expected result.** It cannot be entered or silently added to the class marklist.
**Evidence.** Configuration evidence and rejected attempt.

### A40 — Historical retrieval
**Steps.** Open an earlier completed assessment after creating a newer one.
**Expected result.** Historical records remain readable and are not replaced by the newest assessment.
**Evidence.** Assessment IDs and report snapshots.

### A41 — Audit completeness
**Steps.** Review mark create, save, submit, return, approve, correct and override events.
**Expected result.** Each sensitive transition identifies actor, school, entity, timestamp and reason where applicable.
**Evidence.** Audit-log extract and coverage checklist.


## 40 executable Learner Report Card scenarios
The scenarios below are executable tests. For every case, capture the user role, school badge, selected year/term, screen state, timestamp, screenshots, and resulting record identifier.

### R01 — Select one assessment
**Steps.** As Sarah Anupi, select one approved assessment for a configured class and generate one learner report.
**Expected result.** Only the selected assessment appears and its marks match the approved source.
**Evidence.** Generated PDF and source marklist.

### R02 — Select multiple assessments
**Steps.** Select Mid-Term and End-Term for one learner.
**Expected result.** The report distinguishes assessment periods and does not blend terms.
**Evidence.** Report headings and reconciliation.

### R03 — Select all relevant assessments
**Steps.** Select all approved assessments for a term.
**Expected result.** Only same-year, same-term assessments appear; duplicates are prevented.
**Evidence.** Selection list and report.

### R04 — Change selected assessments
**Steps.** Remove one assessment and regenerate.
**Expected result.** Removed results disappear without deleting the source assessment.
**Evidence.** Before/after PDFs.

### R05 — Wrong-year selection
**Steps.** Attempt to combine 2026 and 2027 assessments.
**Expected result.** The report generator blocks the mix or clearly separates historical context; no silent merge occurs.
**Evidence.** Validation message.

### R06 — Wrong-term selection
**Steps.** Attempt to combine Term 1 and Term 2 in one term report.
**Expected result.** The term filter prevents the mix.
**Evidence.** Selected filters and rejected generation.

### R07 — Missing selection
**Steps.** Generate without selecting an assessment.
**Expected result.** A clear actionable message appears and no misleading blank report is published.
**Evidence.** Message and no-output evidence.

### R08 — Marks flow through
**Steps.** Generate Adrian Andayi’s report after saving Kiswahili 59, RE 44 and Creative Arts 44 in the test environment.
**Expected result.** All relevant approved subjects appear with the exact values and competencies.
**Evidence.** Source-to-report reconciliation.

### R09 — BE1/BE2 display
**Steps.** Use illustrative scores in the BE range.
**Expected result.** BE1 and BE2 display with correct descriptions, without claiming official thresholds.
**Evidence.** Report page and grading sheet.

### R10 — AE1/AE2 display
**Steps.** Use illustrative scores in the AE range.
**Expected result.** AE1 and AE2 are distinct and consistently described.
**Evidence.** Report page.

### R11 — ME1/ME2 display
**Steps.** Use illustrative scores in the ME range.
**Expected result.** ME1 and ME2 are distinct and consistently described.
**Evidence.** Report page.

### R12 — EE1/EE2 display
**Steps.** Use illustrative scores in the EE range.
**Expected result.** EE1 and EE2 are distinct and consistently described.
**Evidence.** Report page.

### R13 — No mixed grading modes
**Steps.** Generate a percentage-based report and a CBC report using their intended settings.
**Expected result.** The report does not show a percentage as a competency label or vice versa.
**Evidence.** Two reports and settings.

### R14 — Class-teacher comment selection
**Steps.** As a class teacher, select a predefined academic comment by category.
**Expected result.** The comment is selected from the bank; arbitrary free typing is not required.
**Evidence.** Selected comment and comment ID.

### R15 — Class-teacher comment independence
**Steps.** Select a comment in Grade 4 and inspect the principal-comment field.
**Expected result.** Principal comments remain unchanged and independently selectable.
**Evidence.** Two field values.

### R16 — Principal comment selection
**Steps.** As Peter Wekesa, select a conduct/development comment.
**Expected result.** Principal comment bank is separate from academic comments and is recorded distinctly.
**Evidence.** Role, comment category and saved report.

### R17 — Comment category validation
**Steps.** Try to assign an EE comment to a BE learner without confirmation.
**Expected result.** The system warns or requires an authorized choice; it must not silently mislabel the learner.
**Evidence.** Validation message.

### R18 — Missing comment handling
**Steps.** Generate a report with no class-teacher or principal comment.
**Expected result.** The report identifies the missing section and follows the publication policy.
**Evidence.** Draft report and warning.

### R19 — Individual report
**Steps.** Generate one learner report by admission number.
**Expected result.** The learner identity, grade, stream, year and term are correct.
**Evidence.** PDF identity checklist.

### R20 — Selected learners
**Steps.** Select a small group of learners and generate in one batch.
**Expected result.** Only selected learners appear, each on the correct report.
**Evidence.** Batch count and PDFs.

### R21 — Whole-class reports
**Steps.** Generate the complete configured class.
**Expected result.** Every learner appears once and no learner from another class is included.
**Evidence.** Roster-to-PDF count.

### R22 — Whole-grade reports
**Steps.** Generate a whole-grade report across the configured streams.
**Expected result.** The output groups or labels streams correctly and preserves school scope.
**Evidence.** Stream reconciliation.

### R23 — Bulk PDF generation
**Steps.** Generate a single PDF for a selected class.
**Expected result.** All pages render, page breaks are clean, and each report has correct identity.
**Evidence.** PDF page count and sampled pages.

### R24 — Bulk printing
**Steps.** Use print preview for a multi-learner batch.
**Expected result.** The print layout is readable on A4 and does not truncate learning areas or comments.
**Evidence.** Print preview screenshot.

### R25 — Regenerate after correction
**Steps.** Correct one approved mark through the authorized workflow and regenerate.
**Expected result.** Only the corrected value and dependent competency change; unrelated values remain unchanged.
**Evidence.** Before/after report diff.

### R26 — Incomplete marks
**Steps.** Generate a report with one missing subject mark.
**Expected result.** The report states incomplete/missing status and does not convert blank to zero.
**Evidence.** Report and source mark.

### R27 — Transferred learner
**Steps.** Generate a report for a learner transferred between streams.
**Expected result.** Historical report uses the correct historical class context and current records remain isolated.
**Evidence.** Transfer history and report.

### R28 — Historical report retrieval
**Steps.** Open a prior term report after a new term is active.
**Expected result.** The prior term remains available and is not overwritten.
**Evidence.** Term-labelled report.

### R29 — School identity
**Steps.** Inspect report header/footer.
**Expected result.** MWANGAZA ACADEMY, code MAK2027, approved school details and logo/settings appear where configured.
**Evidence.** Header screenshot.

### R30 — Learner identity fields
**Steps.** Inspect name, admission number, grade and stream.
**Expected result.** All identity fields match the authoritative learner record.
**Evidence.** Source row and report.

### R31 — Approval information
**Steps.** Inspect draft, reviewed, approved and published states.
**Expected result.** The report status and approver identity are visible according to permission policy.
**Evidence.** Workflow history.

### R32 — Teacher review
**Steps.** As a class teacher, review a draft report.
**Expected result.** Review is allowed only for assigned class/role and does not grant unrelated admin rights.
**Evidence.** Role test and access result.

### R33 — Principal review
**Steps.** As Peter Wekesa, review an authorized report.
**Expected result.** Principal can select principal comments and approve only where policy permits.
**Evidence.** Role test and audit event.

### R34 — Unauthorized publication
**Steps.** Attempt publication as an ordinary subject teacher.
**Expected result.** Server rejects the action even if the UI is manipulated.
**Evidence.** Rejected request and no status change.

### R35 — Correction after approval
**Steps.** Attempt an ordinary edit after publication.
**Expected result.** The system blocks it and provides a controlled correction path.
**Evidence.** Message and unchanged report.

### R36 — Confidentiality
**Steps.** Request a different learner’s report by changing an ID in the URL/request.
**Expected result.** School and role checks prevent unauthorized access and no data is returned.
**Evidence.** Rejected response.

### R37 — No cross-learner leakage
**Steps.** Generate two adjacent reports and compare all identity/mark sections.
**Expected result.** Each page contains only its own learner’s data.
**Evidence.** Page-by-page checklist.

### R38 — Export consistency
**Steps.** Compare on-screen, PDF and print outputs.
**Expected result.** Marks, competency, comments, term and identity are identical across outputs.
**Evidence.** Three-way reconciliation.

### R39 — Performance summary
**Steps.** Generate class/whole-school subject-level summaries.
**Expected result.** Totals, averages, missing counts and competency distributions reconcile to approved marks.
**Evidence.** Summary export and formulas.

### R40 — Refresh/sign-in persistence
**Steps.** Save a report comment, refresh, sign out and return.
**Expected result.** The saved comment and status persist from database records.
**Evidence.** Before/after evidence.


## Section D — Integrated 20-day practical testing timetable
| Day | Lead role | Assignment | Expected output / evidence |
| --- | --- | --- | --- |
| 1 | Administrator + QA | Freeze read-only configuration snapshot and school badge evidence. | Audit checklist, counts, screenshots, no mutations. |
| 2 | Administrator | Confirm academic year, term dates and active-term workflow. | Term table, active-term screenshot, defect entries. |
| 3 | Examination Officer | Reconcile grades, streams, learner rosters and admission numbers. | Roster counts and mismatch list. |
| 4 | Curriculum lead | Reconcile offered learning areas and grading settings. | Learning-area matrix; no unauthorized additions. |
| 5 | Administrator | Reconcile staff roles, teacher codes and allocations. | Allocation register and permission matrix. |
| 6 | Subject teacher | Run A11–A20 for one approved test learner and one area. | Saved marks, validations, refresh evidence. |
| 7 | Subject teacher | Run A21–A24: transfer, submission, persistence and concurrency. | Workflow screenshots and audit IDs. |
| 8 | Administrator | Run A01–A10 assessment lifecycle tests in a QA-approved scope. | Assessment records and duplicate checks. |
| 9 | Examination Council | Run A25–A33 whole-class review, filters, export and moderation. | Whole-class export and reconciliation. |
| 10 | QA + Developer | Run A34–A40 grading, incomplete, historical and audit tests. | Boundary matrix and audit coverage. |
| 11 | Class Teacher | Run R01–R10 selection, term isolation and mark flow. | One learner report and source trace. |
| 12 | Class Teacher | Run R11–R18 CBC and comment-bank tests. | Comment selections and competency examples. |
| 13 | Principal | Run R15–R18 and R31–R35 principal review/security tests. | Principal comment and approval evidence. |
| 14 | Administrator | Run R19–R28 individual, selected, class, grade and bulk outputs. | PDF/print batch with page count. |
| 15 | QA | Run R29–R40 identity, privacy, regeneration and reconciliation. | Three-way output reconciliation. |
| 16 | QA + all roles | Run negative tests N01–N12. | Failure log and defect IDs. |
| 17 | QA + all roles | Run negative tests N13–N24. | Failure log and role-denial evidence. |
| 18 | QA + Developer | Run negative tests N25–N35; classify severity. | Defect register with owners. |
| 19 | Administrator + QA | Retest corrected High/Critical defects; verify no data loss. | Retest results, updated defect register. |
| 20 | Acceptance panel | Review acceptance checklist and sign only if all blocking defects are closed. | Signed acceptance record and evidence index. |

## Section E — Deliberate failure tests
Run the following cases only against approved QA records. The expected response must be specific, user-readable and backed by a server-side denial.
| ID | Failure case | Test action | Expected behaviour |
| --- | --- | --- | --- |
| N01 | Teacher creates assessment | Subject teacher clicks or calls create endpoint | Creation hidden/rejected; no record created. |
| N02 | Wrong school assessment access | Change school or entity identifier | Forbidden/not found; no data leakage. |
| N03 | Above maximum mark | Enter 101 | Inline/server validation; no save. |
| N04 | Negative mark | Enter -1 | Validation; no save. |
| N05 | Malformed score | Enter text or NaN | Clear invalid-score message. |
| N06 | Unauthorized subject | Teacher chooses unallocated subject | Scope rejected. |
| N07 | Unauthorized class | Teacher chooses another stream | Scope rejected. |
| N08 | Inactive-term teacher save | Teacher saves Term 1 while Term 2 active | Blocked with active-term warning. |
| N09 | Inactive-term admin without confirmation | Admin saves past-term marks without confirmation flag | Confirmation-required error. |
| N10 | Inactive-term override by Council | Examination Council attempts override | Rejected unless explicitly authorized. |
| N11 | Duplicate assessment | Same period/class/subject/title | Duplicate prevention. |
| N12 | Duplicate learner rows | Upload same learner twice | Upload rejected or duplicate row clearly reported. |
| N13 | Unknown admission number | Typed upload has unknown learner | Row-level error; no partial silent match. |
| N14 | Wrong assessment type | Upload End-Term file to Mid-Term | File validation or explicit mapping required. |
| N15 | Wrong term upload | Term 1 file selected for Term 3 | Blocked with term mismatch. |
| N16 | Blank required key | Admission and assessment number blank | Row-level required-key message. |
| N17 | Approved mark edit | Teacher edits approved record | Blocked; correction workflow required. |
| N18 | Locked mark edit | Normal save against locked record | Blocked and audited. |
| N19 | Missing mark as zero | Blank cell uploaded | Remains missing, never zero. |
| N20 | Wrong learner report ID | Alter report learner ID | Forbidden/not found. |
| N21 | Cross-school report ID | Use a report card from another school | Forbidden/not found. |
| N22 | Mixed-year report | Select 2026 and 2027 | Blocked or explicitly historical-separated. |
| N23 | Mixed-term report | Select Term 1 and Term 2 | Blocked for single-term report. |
| N24 | Publish without approval | Teacher publishes draft | Rejected. |
| N25 | Principal comment as teacher | Teacher edits principal field | Rejected or field hidden. |
| N26 | Wrong comment category | BE learner receives EE-only selection | Warning/validation. |
| N27 | Report with no assessments | Generate empty selection | Actionable warning; no misleading output. |
| N28 | Duplicate learning area | Two entries for same subject | Prevent duplicate column or flag defect. |
| N29 | Concurrent conflicting save | Two users save different values | Deterministic result and audit trail. |
| N30 | Delete marked assessment | Delete assessment with marks | Blocked or archival only; no data loss. |
| N31 | Tamper export order | Change sort after export begins | Output either preserves captured order or reports state. |
| N32 | Unauthenticated endpoint | Call assessment/report API without session | Authentication required. |
| N33 | Cross-role admin matrix | Ordinary admin invokes restricted super-admin action | Permission denied. |
| N34 | Invalid competency code | Inject unsupported code | Validation rejects and does not persist. |
| N35 | Comment injection/overlong text | Paste script or overlong content | Sanitized/length-limited; no script execution. |

## Section F — Defect register template
| Field | Required entry |
| --- | --- |
| Defect ID | Complete during execution |
| Module | Complete during execution |
| Test ID | Complete during execution |
| Description | Complete during execution |
| Severity: Critical / High / Medium / Low | Complete during execution |
| Steps to reproduce | Complete during execution |
| Expected result | Complete during execution |
| Actual result | Complete during execution |
| Evidence links / filenames | Complete during execution |
| Assigned developer | Complete during execution |
| Status | Complete during execution |
| Retest result | Complete during execution |

**Blocking rule:** Critical security, data-loss, cross-school leakage, wrong learner identity, wrong term mixing or examination-result corruption blocks acceptance until fixed and retested.

## Section G — Final acceptance checklist
| Acceptance control | Pass condition | Evidence |
| --- | --- | --- |
| Marks accuracy | Every sampled mark reconciles to the authoritative assessment row. | Sample reconciliation sheet. |
| CBC grading | All eight sample subcategories render consistently; approved school scale is used. | Boundary matrix + report samples. |
| Report calculations | Percentages, averages, missing values and competencies are reproducible. | Formula/output comparison. |
| Assessment selection | Only selected, same-year and same-term assessments are included. | Filter screenshots + reports. |
| Comments | Class Teacher and Principal banks remain separate and selected values persist. | Comment IDs + reports. |
| Permissions | Create, edit, approve, publish and override controls match role policy server-side. | Role test matrix. |
| Privacy | No learner or school data crosses scope; direct ID tampering is denied. | Denied requests. |
| History | Corrections and inactive-term overrides identify actor, time, school, entity and reason. | Audit export. |
| Bulk outputs | Class/grade batches contain correct learners once, readable on A4 and downloadable. | PDF and print evidence. |
| Reliability | Refresh, sign-out/sign-in and concurrent use preserve correct data. | Persistence/concurrency evidence. |

## Appendix A — 40 predefined Class Teacher comments
| Category | Subcategory | Comment |
| --- | --- | --- |
| BE | BE1 | Is beginning to develop understanding and benefits from guided practice. |
| BE | BE2 | Needs regular support to connect classroom ideas with practical tasks. |
| BE | BE1 | Participates with encouragement and is developing confidence in communication. |
| BE | BE2 | Can identify simple patterns when supported with examples and prompts. |
| BE | BE1 | Is working towards greater independence in completing learning activities. |
| BE | BE2 | Shows willingness to learn and should continue practising core skills consistently. |
| BE | BE1 | Benefits from step-by-step instruction and frequent opportunities to explain thinking. |
| BE | BE2 | Is developing collaboration skills and responds positively to constructive feedback. |
| BE | BE1 | Needs continued reinforcement to apply knowledge beyond familiar examples. |
| BE | BE2 | Has made early progress; targeted support will help consolidate learning outcomes. |
| AE | AE1 | Is approaching the expected outcome and can apply learning in familiar situations. |
| AE | AE2 | Shows improving understanding and is beginning to explain solutions with clarity. |
| AE | AE1 | Participates well and should continue building consistency across learning tasks. |
| AE | AE2 | Uses practical skills with support and is developing greater independence. |
| AE | AE1 | Can solve routine problems and is ready for more challenging applications. |
| AE | AE2 | Communicates ideas increasingly clearly and benefits from constructive discussion. |
| AE | AE1 | Demonstrates creativity in activities and should take more initiative in refining work. |
| AE | AE2 | Works cooperatively and is learning to use feedback to improve performance. |
| AE | AE1 | Is making steady improvement in knowledge, application and confidence. |
| AE | AE2 | Would benefit from regular revision to strengthen transfer of learning. |
| ME | ME1 | Meets the expected outcome and applies knowledge accurately in most tasks. |
| ME | ME2 | Demonstrates sound understanding, practical competence and responsible participation. |
| ME | ME1 | Communicates ideas clearly and contributes positively to collaborative activities. |
| ME | ME2 | Solves routine problems independently and explains methods appropriately. |
| ME | ME1 | Produces consistent work and responds constructively to feedback. |
| ME | ME2 | Applies learning to practical contexts with confidence and care. |
| ME | ME1 | Shows good creativity and is willing to explore alternative solutions. |
| ME | ME2 | Works independently, manages tasks well and meets agreed expectations. |
| ME | ME1 | Participates actively and demonstrates dependable progress across the term. |
| ME | ME2 | Has achieved the expected learning outcomes and should maintain this consistency. |
| EE | EE1 | Exceeds the expected outcome and applies learning confidently in new situations. |
| EE | EE2 | Demonstrates excellent understanding, practical skill and purposeful communication. |
| EE | EE1 | Solves complex problems independently and explains reasoning with precision. |
| EE | EE2 | Consistently produces high-quality work and uses feedback to extend learning. |
| EE | EE1 | Shows exceptional creativity and develops thoughtful, original solutions. |
| EE | EE2 | Leads collaborative tasks responsibly while valuing the ideas of others. |
| EE | EE1 | Applies knowledge with initiative, accuracy and strong attention to detail. |
| EE | EE2 | Communicates clearly, listens respectfully and contributes maturely to discussions. |
| EE | EE1 | Demonstrates sustained excellence, independence and commitment to improvement. |
| EE | EE2 | Has exceeded the expected learning outcomes and is ready for enriched challenges. |

## Appendix B — 10 predefined Principal comments
| ID | Role | Comment |
| --- | --- | --- |
| P01 | Head of Institution / Principal | Conducts self with respect and demonstrates positive personal development. |
| P02 | Head of Institution / Principal | Shows responsibility and should continue strengthening punctuality and preparedness. |
| P03 | Head of Institution / Principal | Participates positively in school life and cooperates well with others. |
| P04 | Head of Institution / Principal | Demonstrates growing leadership and uses influence responsibly. |
| P05 | Head of Institution / Principal | Is respectful, dependable and contributes to an orderly learning environment. |
| P06 | Head of Institution / Principal | Shows good discipline and responds positively to guidance. |
| P07 | Head of Institution / Principal | Works well with peers and demonstrates consideration for the school community. |
| P08 | Head of Institution / Principal | Is developing confidence, initiative and a stronger sense of responsibility. |
| P09 | Head of Institution / Principal | Participates in co-curricular activities with enthusiasm and commitment. |
| P10 | Head of Institution / Principal | Continues to mature positively and should sustain these good habits. |

## Appendix C — How to use the PDF and workbook together
Use the PDF for execution order, roles, expected outcomes and acceptance decisions. Use the Excel workbook as a controlled reference/test dataset only. First compare its IDs and headings with the live NEXUS template; then copy a small approved subset into a QA-only workflow. The workbook intentionally labels supplemental fictional records because the read-only live audit does not contain the 480-learner configuration described in the operational guide. Never import the workbook wholesale into the existing school without approval.
