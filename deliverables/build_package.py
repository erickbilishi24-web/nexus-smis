from pathlib import Path
from datetime import date
import random
from openpyxl import Workbook, load_workbook
from openpyxl.styles import Font, PatternFill, Border, Side, Alignment
from openpyxl.formatting.rule import CellIsRule, FormulaRule
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.table import Table, TableStyleInfo

OUT = Path('/home/ubuntu/kenyan-smis-permanent/deliverables')
OUT.mkdir(parents=True, exist_ok=True)
random.seed(2027)

school = 'MWANGAZA ACADEMY'
code = 'MAK2027'
grades = [
    ('PP1','A',20),('PP2','A',22),('Grade 1','A',22),('Grade 1','B',22),
    ('Grade 2','A',23),('Grade 2','B',23),('Grade 3','A',24),('Grade 3','B',24),
    ('Grade 4','A',26),('Grade 4','B',26),('Grade 5','A',27),('Grade 5','B',27),
    ('Grade 6','A',28),('Grade 6','B',28),('Grade 7','A',30),('Grade 7','B',30),
    ('Grade 8','A',20),('Grade 8','B',20),('Grade 9','A',19),('Grade 9','B',19),
]
# The operational guide totals 480; the live read-only audit found 110 current learners in stream A only.
# Workbook rows are explicitly marked fictional supplemental to avoid misrepresenting live data.
first_names = ['Amani','Baraka','Brian','Cynthia','Daisy','Elvis','Faith','Gift','Hellen','Ian','Jabali','Joy','Kevin','Linet','Mercy','Nadia','Oscar','Pendo','Quincy','Rita']
last_names = ['Andayi','Akinyi','Barasa','Bilishi','Wekesa','Anupi','Abisai','Ndula','Amukhuma','Atieno','Otieno','Omondi','Njeri','Wanjiku','Kiptoo','Chebet','Moraa','Mutua','Muli','Were']
areas = [
    ('ENG','English'),('KISW','Kiswahili'),('MAT','Mathematics'),('SCI','Integrated Science'),
    ('SST','Social Studies'),('AGR','Agriculture'),('CA','Creative Arts'),('PTS','Pre-Technical Studies'),
    ('RE','Religious Education'),('LSE','Life Skills Education')
]
teachers = [
    ('Erick Bilishi','School Administrator / Super Administrator'),('Peter Wekesa','Head of Institution / Principal'),
    ('Grace Akinyi','Deputy Principal'),('Daniel Barasa','Examination Council Chair'),('Sarah Anupi','Class Teacher / Subject Teacher'),
    ('Julius Abisai','Class Teacher / Subject Teacher'),('John Andera','Subject Teacher'),('Harida Ndula','Subject Teacher'),
    ('Enock Amukhuma','Subject Teacher'),('Mary Atieno','Accounts Officer')
]
assessment_titles = ['Opening Assessment','Baseline Assessment','Continuous Assessment Test 1','Continuous Assessment Test 2','Practical Assessment','Project Assessment','Mid-Term Assessment','End-Term Assessment']
terms = [('Term 1','2027-01-06','2027-04-02'),('Term 2','2027-04-27','2027-08-06'),('Term 3','2027-08-30','2027-11-30')]

# ---------- Markdown guide ----------
def md_table(headers, rows):
    out = ['| ' + ' | '.join(headers) + ' |', '| ' + ' | '.join(['---']*len(headers)) + ' |']
    out += ['| ' + ' | '.join(str(x).replace('|','/') for x in row) + ' |' for row in rows]
    return '\n'.join(out)

def scenario_section(prefix, title, scenarios):
    lines = [f'## {title}', f'The scenarios below are executable tests. For every case, capture the user role, school badge, selected year/term, screen state, timestamp, screenshots, and resulting record identifier.', '']
    for i, (name, steps, expected, evidence) in enumerate(scenarios, 1):
        lines += [f'### {prefix}{i:02d} — {name}', f'**Steps.** {steps}', f'**Expected result.** {expected}', f'**Evidence.** {evidence}', '']
    return '\n'.join(lines)

academic_scenarios = [
('Create a custom assessment title','As Erick Bilishi, open Academics → Assessments, select 2027, Term 1, Grade 7 and one allocated learning area; enter “Opening Assessment”; save.','Only an authorized administrator can create it; the title, year, term, grade, subject, creator and timestamp persist.','Screenshot of form and saved record; audit event ID.'),
('Create a second custom title','Create “Continuous Assessment Test 1” for the same period but a different configured assessment slot.','The system accepts a distinct title without changing the first record.','Two record IDs and an audit comparison.'),
('Reject a duplicate assessment','Attempt to create the same title, period, grade and learning area twice.','A clear duplicate message appears and no second authoritative assessment is created.','Before/after record count and message.'),
('Wrong academic year','Select 2026 while the test dataset is 2027 and try to create an assessment.','The wrong-year record is blocked or clearly marked as historical; no 2027 result is overwritten.','Selected filters and server response.'),
('Wrong term isolation','Open a Term 1 assessment while Term 2 is active as a teacher.','The teacher is blocked; an authorized administrator sees the inactive-term confirmation before proceeding.','Warning text and audit event if overridden.'),
('Maximum marks policy','Create or open an assessment with the approved maximum mark configured by the school.','The maximum is visible to the marker and is used consistently in percentage calculations.','Configuration screenshot and calculated example.'),
('Unauthorized assessment creation','Sign in as Sarah Anupi or an ordinary subject teacher and look for Create New Assessment.','The control is hidden or disabled and the server rejects a direct request.','Role, UI state and rejected request.'),
('Edit assessment metadata','As an administrator, change a title without changing its year, term, grade or subject.','The title changes while existing marks retain their assessment ID and history.','Before/after title and mark count.'),
('Edit assessment with marks','Attempt to change a marked assessment’s learning area or class.','The system requires a safe correction workflow or blocks the destructive change; marks remain traceable.','Prompt, audit entry, and unchanged mark IDs.'),
('Deactivate an assessment','Deactivate a test assessment that has no production marks.','It becomes unavailable for new entry but remains visible in history.','Status before/after and list filter.'),
('Allocated subject scope','As John Andera, open only learning areas and classes assigned to him.','Only active school-scoped allocations appear; another teacher’s scope is rejected server-side.','Scope list and attempted unauthorized URL/API result.'),
('Correct grade and stream','Use a teacher assigned to Grade 7 Blue or the configured equivalent.','The roster matches the selected grade/stream and does not include another stream.','Roster count and class label.'),
('Save an ordinary mark','Enter 59 for Adrian Andayi in Kiswahili and save.','The mark persists and is available to the marklist and report-card read path.','Saved row, refresh result, and mark audit.'),
('Save zero','Enter 0 for a learner who completed the assessment with zero.','Zero is treated as a valid score, not as missing.','Row status and exported value.'),
('Save maximum','Enter 100 for a learner.','100 is accepted, competency calculation is consistent, and no rounding changes it.','Marklist and report-card value.'),
('Save decimal mark','Enter 59.5 where decimal marks are approved.','The system either preserves the supported precision or gives a clear validation message; it must not silently truncate.','Input, stored value, and message.'),
('Reject above maximum','Enter 101 or a value above the configured maximum.','Inline/server validation rejects it and no invalid mark is stored.','Validation message and unchanged database count.'),
('Leave a mark blank','Clear one learner’s mark and save.','Blank remains missing, never zero; missing count increases.','Marklist missing badge and export.'),
('Duplicate save','Submit the same learner row twice from two browser tabs.','The authoritative row is updated safely; duplicate records are not created.','Two request timestamps and one final mark row.'),
('Missing learner detection','Compare the roster to saved marks after omitting one learner.','The whole-class marklist identifies the learner as missing.','Roster-to-mark reconciliation.'),
('Stream transfer','Move a clearly identified test learner between configured streams using the approved workflow.','Historical marks remain intact and new entry follows the new class without cross-stream leakage.','Transfer history and before/after reports.'),
('Post-submission edit','Submit a subject assessment, then try to edit as the subject teacher.','Teacher editing is blocked after submission; authorized correction follows the review workflow.','Status transition and rejected edit.'),
('Concurrent teacher edits','Open the same assessment as two authorized users and save different values.','The final state is deterministic and the audit trail identifies both attempts/changes.','Audit records and final reconciliation.'),
('Refresh persistence','Save marks, refresh the browser, sign out and sign back in.','Saved marks remain identical and are loaded from the database, not local UI state.','Before/after screenshots and query result.'),
('Whole-class access — Super Administrator','Open Whole Class Marklist as Erick Bilishi.','The complete configured class period appears with all active learning areas, learners, missing indicators and exports.','Role badge, full table, export files.'),
('Whole-class access — Administrator','Open the same view as the configured Administrator.','Administrator access is equivalent for authorized school records and remains school-scoped.','Role badge and cross-school negative test.'),
('Whole-class access — Examination Council','Open the view as Daniel Barasa.','Examination Council can review authorized whole-class data without gaining unrelated configuration privileges.','Review screen and denied settings action.'),
('Whole-class filter by term','Select Term 1, Term 2 and Term 3 in separate checks.','Only the selected term’s records appear; no mixed-term columns or scores are shown.','Three exports with term labels.'),
('Whole-class filter by stream','Filter to one configured stream.','Only that stream’s learners and learning areas appear.','Filtered count and sample admission numbers.'),
('Whole-class export and print','Sort by learner name, admission number and average; export/print after each sort.','Output preserves the visible order and includes school identity, term, class, learning areas and missing indicators.','PDF/print preview and workbook row order.'),
('Reconcile subject and whole-class marks','Compare one subject marklist with the corresponding whole-class cells.','Every entered value matches by learner ID/admission number and term.','Reconciliation sheet and discrepancy count.'),
('Examination Council unusual score review','Use a test set containing 0, 1, 59, 79.5 and 100.','Review workflow highlights unusual or missing values without changing them automatically.','Review notes and unchanged mark rows.'),
('Moderation correction','Council flags a wrong submitted mark; administrator confirms a correction.','Corrected value is stored, original value remains traceable, and teacher is notified where configured.','Correction reason, audit chain, notification.'),
('Approved result protection','Approve or lock an assessment and attempt a normal teacher edit.','Edit is blocked; only the designated correction function can change it.','Status, error message, audit record.'),
('Percentage grading boundaries','Test illustrative boundary values 0, 10, 20, 21, 30, 31, 40, 41, 57, 58, 74, 75, 89 and 90.','Each maps to the configured sample scale consistently; the guide does not claim official KICD thresholds.','Boundary matrix export.'),
('CBC competency display','Verify BE1, BE2, AE1, AE2, ME1, ME2, EE1 and EE2 across marklist and reports.','Labels and descriptions are consistent and missing remains blank.','Marklist/report screenshots.'),
('Equal scores','Give two learners the same score.','They receive the same percentage and competency; sorting uses a stable tie-breaker.','Sorted rows and calculations.'),
('Assessment with incomplete records','Generate analysis while some marks are blank.','Missing values are excluded from averages according to policy and clearly disclosed.','Analysis summary and missing count.'),
('Learning-area exclusion','Use a learning area not offered to the selected grade.','It cannot be entered or silently added to the class marklist.','Configuration evidence and rejected attempt.'),
('Historical retrieval','Open an earlier completed assessment after creating a newer one.','Historical records remain readable and are not replaced by the newest assessment.','Assessment IDs and report snapshots.'),
('Audit completeness','Review mark create, save, submit, return, approve, correct and override events.','Each sensitive transition identifies actor, school, entity, timestamp and reason where applicable.','Audit-log extract and coverage checklist.'),
]

report_scenarios = [
('Select one assessment','As Sarah Anupi, select one approved assessment for a configured class and generate one learner report.','Only the selected assessment appears and its marks match the approved source.','Generated PDF and source marklist.'),
('Select multiple assessments','Select Mid-Term and End-Term for one learner.','The report distinguishes assessment periods and does not blend terms.','Report headings and reconciliation.'),
('Select all relevant assessments','Select all approved assessments for a term.','Only same-year, same-term assessments appear; duplicates are prevented.','Selection list and report.'),
('Change selected assessments','Remove one assessment and regenerate.','Removed results disappear without deleting the source assessment.','Before/after PDFs.'),
('Wrong-year selection','Attempt to combine 2026 and 2027 assessments.','The report generator blocks the mix or clearly separates historical context; no silent merge occurs.','Validation message.'),
('Wrong-term selection','Attempt to combine Term 1 and Term 2 in one term report.','The term filter prevents the mix.','Selected filters and rejected generation.'),
('Missing selection','Generate without selecting an assessment.','A clear actionable message appears and no misleading blank report is published.','Message and no-output evidence.'),
('Marks flow through','Generate Adrian Andayi’s report after saving Kiswahili 59, RE 44 and Creative Arts 44 in the test environment.','All relevant approved subjects appear with the exact values and competencies.','Source-to-report reconciliation.'),
('BE1/BE2 display','Use illustrative scores in the BE range.','BE1 and BE2 display with correct descriptions, without claiming official thresholds.','Report page and grading sheet.'),
('AE1/AE2 display','Use illustrative scores in the AE range.','AE1 and AE2 are distinct and consistently described.','Report page.'),
('ME1/ME2 display','Use illustrative scores in the ME range.','ME1 and ME2 are distinct and consistently described.','Report page.'),
('EE1/EE2 display','Use illustrative scores in the EE range.','EE1 and EE2 are distinct and consistently described.','Report page.'),
('No mixed grading modes','Generate a percentage-based report and a CBC report using their intended settings.','The report does not show a percentage as a competency label or vice versa.','Two reports and settings.'),
('Class-teacher comment selection','As a class teacher, select a predefined academic comment by category.','The comment is selected from the bank; arbitrary free typing is not required.','Selected comment and comment ID.'),
('Class-teacher comment independence','Select a comment in Grade 4 and inspect the principal-comment field.','Principal comments remain unchanged and independently selectable.','Two field values.'),
('Principal comment selection','As Peter Wekesa, select a conduct/development comment.','Principal comment bank is separate from academic comments and is recorded distinctly.','Role, comment category and saved report.'),
('Comment category validation','Try to assign an EE comment to a BE learner without confirmation.','The system warns or requires an authorized choice; it must not silently mislabel the learner.','Validation message.'),
('Missing comment handling','Generate a report with no class-teacher or principal comment.','The report identifies the missing section and follows the publication policy.','Draft report and warning.'),
('Individual report','Generate one learner report by admission number.','The learner identity, grade, stream, year and term are correct.','PDF identity checklist.'),
('Selected learners','Select a small group of learners and generate in one batch.','Only selected learners appear, each on the correct report.','Batch count and PDFs.'),
('Whole-class reports','Generate the complete configured class.','Every learner appears once and no learner from another class is included.','Roster-to-PDF count.'),
('Whole-grade reports','Generate a whole-grade report across the configured streams.','The output groups or labels streams correctly and preserves school scope.','Stream reconciliation.'),
('Bulk PDF generation','Generate a single PDF for a selected class.','All pages render, page breaks are clean, and each report has correct identity.','PDF page count and sampled pages.'),
('Bulk printing','Use print preview for a multi-learner batch.','The print layout is readable on A4 and does not truncate learning areas or comments.','Print preview screenshot.'),
('Regenerate after correction','Correct one approved mark through the authorized workflow and regenerate.','Only the corrected value and dependent competency change; unrelated values remain unchanged.','Before/after report diff.'),
('Incomplete marks','Generate a report with one missing subject mark.','The report states incomplete/missing status and does not convert blank to zero.','Report and source mark.'),
('Transferred learner','Generate a report for a learner transferred between streams.','Historical report uses the correct historical class context and current records remain isolated.','Transfer history and report.'),
('Historical report retrieval','Open a prior term report after a new term is active.','The prior term remains available and is not overwritten.','Term-labelled report.'),
('School identity','Inspect report header/footer.','MWANGAZA ACADEMY, code MAK2027, approved school details and logo/settings appear where configured.','Header screenshot.'),
('Learner identity fields','Inspect name, admission number, grade and stream.','All identity fields match the authoritative learner record.','Source row and report.'),
('Approval information','Inspect draft, reviewed, approved and published states.','The report status and approver identity are visible according to permission policy.','Workflow history.'),
('Teacher review','As a class teacher, review a draft report.','Review is allowed only for assigned class/role and does not grant unrelated admin rights.','Role test and access result.'),
('Principal review','As Peter Wekesa, review an authorized report.','Principal can select principal comments and approve only where policy permits.','Role test and audit event.'),
('Unauthorized publication','Attempt publication as an ordinary subject teacher.','Server rejects the action even if the UI is manipulated.','Rejected request and no status change.'),
('Correction after approval','Attempt an ordinary edit after publication.','The system blocks it and provides a controlled correction path.','Message and unchanged report.'),
('Confidentiality','Request a different learner’s report by changing an ID in the URL/request.','School and role checks prevent unauthorized access and no data is returned.','Rejected response.'),
('No cross-learner leakage','Generate two adjacent reports and compare all identity/mark sections.','Each page contains only its own learner’s data.','Page-by-page checklist.'),
('Export consistency','Compare on-screen, PDF and print outputs.','Marks, competency, comments, term and identity are identical across outputs.','Three-way reconciliation.'),
('Performance summary','Generate class/whole-school subject-level summaries.','Totals, averages, missing counts and competency distributions reconcile to approved marks.','Summary export and formulas.'),
('Refresh/sign-in persistence','Save a report comment, refresh, sign out and return.','The saved comment and status persist from database records.','Before/after evidence.'),
]

negative_cases = [
('N01','Teacher creates assessment','Subject teacher clicks or calls create endpoint','Creation hidden/rejected; no record created.'),('N02','Wrong school assessment access','Change school or entity identifier','Forbidden/not found; no data leakage.'),('N03','Above maximum mark','Enter 101','Inline/server validation; no save.'),('N04','Negative mark','Enter -1','Validation; no save.'),('N05','Malformed score','Enter text or NaN','Clear invalid-score message.'),('N06','Unauthorized subject','Teacher chooses unallocated subject','Scope rejected.'),('N07','Unauthorized class','Teacher chooses another stream','Scope rejected.'),('N08','Inactive-term teacher save','Teacher saves Term 1 while Term 2 active','Blocked with active-term warning.'),('N09','Inactive-term admin without confirmation','Admin saves past-term marks without confirmation flag','Confirmation-required error.'),('N10','Inactive-term override by Council','Examination Council attempts override','Rejected unless explicitly authorized.'),('N11','Duplicate assessment','Same period/class/subject/title','Duplicate prevention.'),('N12','Duplicate learner rows','Upload same learner twice','Upload rejected or duplicate row clearly reported.'),('N13','Unknown admission number','Typed upload has unknown learner','Row-level error; no partial silent match.'),('N14','Wrong assessment type','Upload End-Term file to Mid-Term','File validation or explicit mapping required.'),('N15','Wrong term upload','Term 1 file selected for Term 3','Blocked with term mismatch.'),('N16','Blank required key','Admission and assessment number blank','Row-level required-key message.'),('N17','Approved mark edit','Teacher edits approved record','Blocked; correction workflow required.'),('N18','Locked mark edit','Normal save against locked record','Blocked and audited.'),('N19','Missing mark as zero','Blank cell uploaded','Remains missing, never zero.'),('N20','Wrong learner report ID','Alter report learner ID','Forbidden/not found.'),('N21','Cross-school report ID','Use a report card from another school','Forbidden/not found.'),('N22','Mixed-year report','Select 2026 and 2027','Blocked or explicitly historical-separated.'),('N23','Mixed-term report','Select Term 1 and Term 2','Blocked for single-term report.'),('N24','Publish without approval','Teacher publishes draft','Rejected.'),('N25','Principal comment as teacher','Teacher edits principal field','Rejected or field hidden.'),('N26','Wrong comment category','BE learner receives EE-only selection','Warning/validation.'),('N27','Report with no assessments','Generate empty selection','Actionable warning; no misleading output.'),('N28','Duplicate learning area','Two entries for same subject','Prevent duplicate column or flag defect.'),('N29','Concurrent conflicting save','Two users save different values','Deterministic result and audit trail.'),('N30','Delete marked assessment','Delete assessment with marks','Blocked or archival only; no data loss.'),('N31','Tamper export order','Change sort after export begins','Output either preserves captured order or reports state.'),('N32','Unauthenticated endpoint','Call assessment/report API without session','Authentication required.'),('N33','Cross-role admin matrix','Ordinary admin invokes restricted super-admin action','Permission denied.'),('N34','Invalid competency code','Inject unsupported code','Validation rejects and does not persist.'),('N35','Comment injection/overlong text','Paste script or overlong content','Sanitized/length-limited; no script execution.'),]

comments = {
'BE': [
'Is beginning to develop understanding and benefits from guided practice.',
'Needs regular support to connect classroom ideas with practical tasks.',
'Participates with encouragement and is developing confidence in communication.',
'Can identify simple patterns when supported with examples and prompts.',
'Is working towards greater independence in completing learning activities.',
'Shows willingness to learn and should continue practising core skills consistently.',
'Benefits from step-by-step instruction and frequent opportunities to explain thinking.',
'Is developing collaboration skills and responds positively to constructive feedback.',
'Needs continued reinforcement to apply knowledge beyond familiar examples.',
'Has made early progress; targeted support will help consolidate learning outcomes.'
],
'AE': [
'Is approaching the expected outcome and can apply learning in familiar situations.',
'Shows improving understanding and is beginning to explain solutions with clarity.',
'Participates well and should continue building consistency across learning tasks.',
'Uses practical skills with support and is developing greater independence.',
'Can solve routine problems and is ready for more challenging applications.',
'Communicates ideas increasingly clearly and benefits from constructive discussion.',
'Demonstrates creativity in activities and should take more initiative in refining work.',
'Works cooperatively and is learning to use feedback to improve performance.',
'Is making steady improvement in knowledge, application and confidence.',
'Would benefit from regular revision to strengthen transfer of learning.'
],
'ME': [
'Meets the expected outcome and applies knowledge accurately in most tasks.',
'Demonstrates sound understanding, practical competence and responsible participation.',
'Communicates ideas clearly and contributes positively to collaborative activities.',
'Solves routine problems independently and explains methods appropriately.',
'Produces consistent work and responds constructively to feedback.',
'Applies learning to practical contexts with confidence and care.',
'Shows good creativity and is willing to explore alternative solutions.',
'Works independently, manages tasks well and meets agreed expectations.',
'Participates actively and demonstrates dependable progress across the term.',
'Has achieved the expected learning outcomes and should maintain this consistency.'
],
'EE': [
'Exceeds the expected outcome and applies learning confidently in new situations.',
'Demonstrates excellent understanding, practical skill and purposeful communication.',
'Solves complex problems independently and explains reasoning with precision.',
'Consistently produces high-quality work and uses feedback to extend learning.',
'Shows exceptional creativity and develops thoughtful, original solutions.',
'Leads collaborative tasks responsibly while valuing the ideas of others.',
'Applies knowledge with initiative, accuracy and strong attention to detail.',
'Communicates clearly, listens respectfully and contributes maturely to discussions.',
'Demonstrates sustained excellence, independence and commitment to improvement.',
'Has exceeded the expected learning outcomes and is ready for enriched challenges.'
]}
principal_comments = [
'Conducts self with respect and demonstrates positive personal development.',
'Shows responsibility and should continue strengthening punctuality and preparedness.',
'Participates positively in school life and cooperates well with others.',
'Demonstrates growing leadership and uses influence responsibly.',
'Is respectful, dependable and contributes to an orderly learning environment.',
'Shows good discipline and responds positively to guidance.',
'Works well with peers and demonstrates consideration for the school community.',
'Is developing confidence, initiative and a stronger sense of responsibility.',
'Participates in co-curricular activities with enthusiasm and commitment.',
'Continues to mature positively and should sustain these good habits.'
]

# Markdown content
lines = [
'# MWANGAZA ACADEMY – NEXUS SMIS ADVANCED ACADEMICS AND LEARNER REPORT CARDS TESTING GUIDE – 2027',
'**Version:** 1.0 · **Prepared for:** administrators, teachers, examination officers and QA testers · **School code:** MAK2027',
'',
'> **Use this guide as a controlled test plan, not as an instruction to recreate or overwrite school data.** It covers only Academics—Assessments and Examination Management and Learner Report Cards.',
'',
'## Executive purpose',
'This continuation package tests whether the existing NEXUS SMIS installation can protect, calculate, review, approve, publish and reconcile Kenyan CBC assessment results and learner report cards. It deliberately separates configuration inspection from execution. A page that loads is not a pass: every result must be traced to an authoritative school-scoped record.',
'',
'## Environment preservation and live audit note',
md_table(['Item','Guide expectation','Read-only live audit / test instruction'], [
['School','MWANGAZA ACADEMY · MAK2027','Confirmed in the database: MWANGAZA ACADEMY, Kakamega, Lurambi, active.'],
['Academic year','2027','Verify in Curriculum Setup before running any test; do not reset it.'],
['Terms','Term 1: 6 Jan–2 Apr; Term 2: 27 Apr–6 Aug; Term 3: 30 Aug–30 Nov','Confirm dates and active-term badge in the live school; use the configured term as authoritative.'],
['Learners','480 across PP1–Grade 9','Read-only audit found 110 current learners, 10 per grade, and only stream A records. Treat this as a configuration difference/defect to document, not something to silently repair in this test package.'],
['Staff','24 teaching + 8 non-teaching','Read-only audit found 10 staff profiles for schoolId 60001. Reconcile identities before assigning test responsibility.'],
['Curriculum and allocations','Existing learning areas and teacher allocations','Read-only audit returned 0 school-scoped subjects and 0 active allocations. Do not import or create them from this workbook without approved remediation.'],
['Assessment and reports','Use existing records','Read-only audit returned 0 assessments, 0 marks and 0 report cards for the audited school scope. Record the exact timestamp and query evidence.'],
])
]
lines += ['', '**Interpretation labels:** `Working` means tested and reconciled; `Configured—untested` means visible but not exercised; `Partially functional` means some paths work; `Missing` means no authoritative record or control exists; `Defective` means behaviour contradicts the acceptance rule. The live audit above is evidence for triage only.', '']
lines += ['## Operating rules before every test',
'1. Confirm the current-school badge reads MWANGAZA ACADEMY / MAK2027 and record a screenshot.',
'2. Confirm year, term and active-term badge; never infer a term from a browser URL or an old export.',
'3. Use a test learner or a clearly approved record. Do not overwrite existing production marks.',
'4. Download the latest NEXUS import template before any upload. The workbook delivered with this guide is a test dataset, not a claim that its headings are the current live importer contract.',
'5. Start with one learner, one learning area and one assessment; reconcile before expanding.',
'6. Capture actor, role, school, timestamp, selected filters, request result, record ID and screenshot for every pass or failure.',
'7. If a test needs new data, stop and obtain approval. Label the record `QA-2027-SUPPLEMENTAL` and never use it to disguise a live configuration gap.',
'8. Never directly manipulate the production database to simulate normal operations.',
'']
lines += ['## Section A — Pre-testing audit checklist', md_table(['Audit item','Inspect','Where','Expected evidence','Status decision / response'], [
['Assessment categories and titles','Names, maximum marks, status, dates, year and term','Academics → Assessments; live query/read-only export','Screenshot + IDs + export','If absent, mark Missing; do not recreate without approval.'],
['Academic year and terms','2027 and three date ranges; active term','Administration → Curriculum Setup','Year/term table + active badge','If dates overlap, raise High defect.'],
['Grades, streams and enrolments','Actual names, streams, counts, learner IDs','People → Learners; Curriculum Setup','Roster export + counts','If guide differs, document difference and use live names.'],
['CBC learning areas','Offered status, codes, max marks by grade','Curriculum Setup → Learning Areas','Subject list + grade mapping','Do not add unconfigured areas from the workbook.'],
['Teacher allocations','Active teacher, class, subject, term and year','Allocation Register','Filtered register + teacher codes','Inactive/replaced records must not authorize current entry.'],
['Teacher accounts and roles','Admin, Deputy, Council, class and subject roles','Administration → Users','Role/access screenshots','Test server denial as well as hidden controls.'],
['Grading scales','Percentage and CBC modes; sample boundaries','Curriculum Setup → Grading','Scale export + policy approval','Label boundaries illustrative unless approved by school.'],
['Mark-entry records','Existing assessment/mark IDs, status and last changer','Assessments → Marklists','Counts + sample IDs','Do not reset or bulk-replace existing rows.'],
['Report settings','Layout, logo, signatures, school identity and output options','Administration → Report Card Settings','Preview + saved settings','Missing identity fields are Medium/High depending on publication risk.'],
['Comment banks','BE/AE/ME/EE and class/principal roles','Administration → Comment Settings','40-comment or configured-bank export','Class and Principal banks must remain distinct.'],
['Approval workflow','Submit, return, approve, lock, publish and correction','Assessments / Reports','Status transition log','Any bypass of approval is Critical.'],
['Permissions and privacy','School scope, role scope, report confidentiality','Users, API response and direct URL checks','Role matrix + denied response','Any cross-school data is Critical and blocks acceptance.'],
])
]
lines += ['', '## Section B — Academics: advanced test scenarios', scenario_section('A', '40 executable Academics and Examination Management scenarios', academic_scenarios)]
lines += ['', scenario_section('R', '40 executable Learner Report Card scenarios', report_scenarios)]
lines += ['', '## Section D — Integrated 20-day practical testing timetable', md_table(['Day','Lead role','Assignment','Expected output / evidence'], [
['1','Administrator + QA','Freeze read-only configuration snapshot and school badge evidence.','Audit checklist, counts, screenshots, no mutations.'],
['2','Administrator','Confirm academic year, term dates and active-term workflow.','Term table, active-term screenshot, defect entries.'],
['3','Examination Officer','Reconcile grades, streams, learner rosters and admission numbers.','Roster counts and mismatch list.'],
['4','Curriculum lead','Reconcile offered learning areas and grading settings.','Learning-area matrix; no unauthorized additions.'],
['5','Administrator','Reconcile staff roles, teacher codes and allocations.','Allocation register and permission matrix.'],
['6','Subject teacher','Run A11–A20 for one approved test learner and one area.','Saved marks, validations, refresh evidence.'],
['7','Subject teacher','Run A21–A24: transfer, submission, persistence and concurrency.','Workflow screenshots and audit IDs.'],
['8','Administrator','Run A01–A10 assessment lifecycle tests in a QA-approved scope.','Assessment records and duplicate checks.'],
['9','Examination Council','Run A25–A33 whole-class review, filters, export and moderation.','Whole-class export and reconciliation.'],
['10','QA + Developer','Run A34–A40 grading, incomplete, historical and audit tests.','Boundary matrix and audit coverage.'],
['11','Class Teacher','Run R01–R10 selection, term isolation and mark flow.','One learner report and source trace.'],
['12','Class Teacher','Run R11–R18 CBC and comment-bank tests.','Comment selections and competency examples.'],
['13','Principal','Run R15–R18 and R31–R35 principal review/security tests.','Principal comment and approval evidence.'],
['14','Administrator','Run R19–R28 individual, selected, class, grade and bulk outputs.','PDF/print batch with page count.'],
['15','QA','Run R29–R40 identity, privacy, regeneration and reconciliation.','Three-way output reconciliation.'],
['16','QA + all roles','Run negative tests N01–N12.','Failure log and defect IDs.'],
['17','QA + all roles','Run negative tests N13–N24.','Failure log and role-denial evidence.'],
['18','QA + Developer','Run negative tests N25–N35; classify severity.','Defect register with owners.'],
['19','Administrator + QA','Retest corrected High/Critical defects; verify no data loss.','Retest results, updated defect register.'],
['20','Acceptance panel','Review acceptance checklist and sign only if all blocking defects are closed.','Signed acceptance record and evidence index.'],
])
]
lines += ['', '## Section E — Deliberate failure tests', 'Run the following cases only against approved QA records. The expected response must be specific, user-readable and backed by a server-side denial.', md_table(['ID','Failure case','Test action','Expected behaviour'], negative_cases)]
lines += ['', '## Section F — Defect register template', md_table(['Field','Required entry'], [[x,'Complete during execution'] for x in ['Defect ID','Module','Test ID','Description','Severity: Critical / High / Medium / Low','Steps to reproduce','Expected result','Actual result','Evidence links / filenames','Assigned developer','Status','Retest result']]), '', '**Blocking rule:** Critical security, data-loss, cross-school leakage, wrong learner identity, wrong term mixing or examination-result corruption blocks acceptance until fixed and retested.']
lines += ['', '## Section G — Final acceptance checklist', md_table(['Acceptance control','Pass condition','Evidence'], [
['Marks accuracy','Every sampled mark reconciles to the authoritative assessment row.','Sample reconciliation sheet.'],
['CBC grading','All eight sample subcategories render consistently; approved school scale is used.','Boundary matrix + report samples.'],
['Report calculations','Percentages, averages, missing values and competencies are reproducible.','Formula/output comparison.'],
['Assessment selection','Only selected, same-year and same-term assessments are included.','Filter screenshots + reports.'],
['Comments','Class Teacher and Principal banks remain separate and selected values persist.','Comment IDs + reports.'],
['Permissions','Create, edit, approve, publish and override controls match role policy server-side.','Role test matrix.'],
['Privacy','No learner or school data crosses scope; direct ID tampering is denied.','Denied requests.'],
['History','Corrections and inactive-term overrides identify actor, time, school, entity and reason.','Audit export.'],
['Bulk outputs','Class/grade batches contain correct learners once, readable on A4 and downloadable.','PDF and print evidence.'],
	['Reliability','Refresh, sign-out/sign-in and concurrent use preserve correct data.','Persistence/concurrency evidence.'],
	])
]
lines += ['', '## Appendix A — 40 predefined Class Teacher comments', md_table(['Category','Subcategory','Comment'], [[cat, f'{cat}{(i%2)+1}', text] for cat, texts in comments.items() for i, text in enumerate(texts)]), '', '## Appendix B — 10 predefined Principal comments', md_table(['ID','Role','Comment'], [[f'P{i:02d}','Head of Institution / Principal', text] for i, text in enumerate(principal_comments,1)]), '', '## Appendix C — How to use the PDF and workbook together', 'Use the PDF for execution order, roles, expected outcomes and acceptance decisions. Use the Excel workbook as a controlled reference/test dataset only. First compare its IDs and headings with the live NEXUS template; then copy a small approved subset into a QA-only workflow. The workbook intentionally labels supplemental fictional records because the read-only live audit does not contain the 480-learner configuration described in the operational guide. Never import the workbook wholesale into the existing school without approval.', '']

(OUT/'MWANGAZA_ACADEMY_ADVANCED_ACADEMICS_REPORT_CARDS_TESTING_GUIDE_2027.md').write_text('\n'.join(lines), encoding='utf-8')

# ---------- Excel workbook ----------
wb = Workbook()
wb.remove(wb.active)
navy = '173F5F'; teal = '0F766E'; gold = 'D99A2B'; pale = 'EAF4F2'; red = 'FDECEC'; gray = 'F4F6F8'
thin = Side(style='thin', color='D6DEE5')
header_fill = PatternFill('solid', fgColor=navy)
sub_fill = PatternFill('solid', fgColor=pale)
warning_fill = PatternFill('solid', fgColor='FFF4D6')

def setup(ws, headers, widths=None, freeze='A2', filter=True):
    ws.freeze_panes = freeze
    ws.sheet_view.showGridLines = False
    for c, h in enumerate(headers,1):
        cell = ws.cell(1,c,h); cell.font = Font(bold=True,color='FFFFFF'); cell.fill = header_fill; cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True); cell.border = Border(bottom=thin)
    ws.row_dimensions[1].height = 34
    if widths:
        for i,w in enumerate(widths,1): ws.column_dimensions[get_column_letter(i)].width = w
    if filter: ws.auto_filter.ref = f'A1:{get_column_letter(len(headers))}1'

def add_table(ws, name, max_col, max_row):
    ref = f'A1:{get_column_letter(max_col)}{max_row}'
    tab = Table(displayName=name, ref=ref); tab.tableStyleInfo = TableStyleInfo(name='TableStyleMedium2', showFirstColumn=False, showLastColumn=False, showRowStripes=True, showColumnStripes=False); ws.add_table(tab)

def style_body(ws):
    for row in ws.iter_rows(min_row=2):
        for cell in row:
            cell.alignment = Alignment(vertical='top', wrap_text=True)
            cell.border = Border(bottom=thin)

# Sheet 1
ws = wb.create_sheet('Existing Learner Register')
headers = ['Learner ID','Admission number','First name','Middle name','Surname','Gender','Grade','Stream','Enrollment status','Record source']
setup(ws, headers, [16,20,15,15,18,12,14,12,20,28])
rows=[]; idx=1
for grade, stream, count in grades:
    for n in range(1,count+1):
        fn=first_names[(idx-1)%len(first_names)]; ln=last_names[(idx*3)%len(last_names)]
        rows.append([f'SUP-2027-{idx:04d}',f'SUP{idx:06d}',fn,f'QA{(idx%7)+1}',ln,'Female' if idx%2==0 else 'Male',grade,stream,'Active','Fictional supplemental test record — not live'])
        idx += 1
for r in rows: ws.append(r)
style_body(ws); add_table(ws,'LearnerRegister',len(headers),ws.max_row)
ws['A1'].comment = None
ws['A1'].fill = header_fill

# Sheet 2
ws = wb.create_sheet('Assessment Configuration')
headers=['Assessment ID','Title','Date','Academic year','Term','Grade','Stream','Learning area code','Maximum marks','Status','Record source']
setup(ws,headers,[18,30,14,15,12,14,10,20,16,15,28])
assessment_rows=[]; aid=1
for term, start, end in terms:
    for title in assessment_titles:
        for grade in ['Grade 7','Grade 8','Grade 9']:
            assessment_rows.append([f'SUP-ASSESS-{aid:03d}',title,start,2027,term,grade,'A','ENG',100,'QA test only','Fictional supplemental test configuration'])
            aid+=1
for r in assessment_rows: ws.append(r)
style_body(ws); add_table(ws,'AssessmentConfig',len(headers),ws.max_row)

# Sheet 3
ws = wb.create_sheet('CBC Learning Areas')
headers=['Grade','Stream','Learning area code','Learning area','Offered status','Maximum marks','Verification note']
setup(ws,headers,[16,10,20,28,24,16,35])
for grade, stream, _ in grades:
    for code_, name in areas:
        ws.append([grade,stream,code_,name,'Illustrative — verify live',100,'Do not import unless confirmed in NEXUS for this grade/stream'])
style_body(ws); add_table(ws,'LearningAreas',len(headers),ws.max_row)

# Sheet 4
ws = wb.create_sheet('Teacher Allocation')
headers=['Teacher ID','Teacher name','Teacher code','Assigned grade','Stream','Learning area','Learning area code','Role','Allocation status','Record source']
setup(ws,headers,[16,24,16,16,10,28,20,28,20,28])
for i,(name,role) in enumerate(teachers,1):
    ws.append([f'SUP-T-{i:02d}',name,'VERIFY-LIVE','Grade 7' if i%2 else 'Grade 8','A',areas[i%len(areas)][1],areas[i%len(areas)][0],role,'Verify live allocation','Identity supplied in prompt; allocation must be checked live'])
style_body(ws); add_table(ws,'TeacherAllocations',len(headers),ws.max_row)

# Sheet 5
ws = wb.create_sheet('Mark Entry Dataset')
headers=['Learner ID','Admission number','Learner name','Grade','Stream','Assessment ID','Assessment title','Learning area','Maximum mark','Score','Percentage','CBC competency','Teacher','Submission status','Verification status','Record source']
setup(ws,headers,[18,18,25,14,10,20,28,24,15,12,14,18,24,18,18,30])
for i in range(1,481):
    g,stream,_ = grades[(i-1)%len(grades)]
    learner_id=f'SUP-2027-{i:04d}'; adm=f'SUP{i:06d}'; name=f'{first_names[(i-1)%len(first_names)]} {last_names[(i*3)%len(last_names)]}'
    score = '' if i%17==0 else (0 if i%29==0 else round(25 + ((i*13)%76) + (0.5 if i%11==0 else 0),1))
    assessment_id=f'SUP-ASSESS-{((i-1)%len(assessment_rows))+1:03d}'
    teacher=teachers[(i-1)%len(teachers)][0]
    row=i+1
    ws.append([learner_id,adm,name,g,stream,assessment_id,'End-Term Assessment','English',100,score,f'=IFERROR(J{row}/I{row},"")',f'=IF(J{row}="","",IF(J{row}<21,"BE1",IF(J{row}<31,"BE2",IF(J{row}<41,"AE1",IF(J{row}<51,"AE2",IF(J{row}<61,"ME1",IF(J{row}<76,"ME2",IF(J{row}<91,"EE1","EE2"))))))))',teacher,'Submitted' if score!='' else 'Draft','Illustrative only','Fictional supplemental test record'])
style_body(ws); add_table(ws,'MarkEntryDataset',len(headers),ws.max_row)
for cell in ws['K'][1:]: cell.number_format='0.0%'
ws.conditional_formatting.add(f'J2:J{ws.max_row}', CellIsRule(operator='greaterThan', formula=['100'], fill=PatternFill('solid',fgColor='FFC7CE')))
ws.conditional_formatting.add(f'J2:J{ws.max_row}', CellIsRule(operator='lessThan', formula=['0'], fill=PatternFill('solid',fgColor='FFC7CE')))

# Sheet 6
ws = wb.create_sheet('Whole-Class Marklist')
headers=['Learner ID','Admission number','Learner name','Grade','Stream'] + [a[1] for a in areas[:6]] + ['Average','Missing count','Reconciliation status']
setup(ws,headers,[18,18,24,14,10]+[20]*6+[14,14,24])
for i in range(1,41):
    g,stream,_=grades[(i-1)%len(grades)]
    row=i+1
    values=[f'SUP-2027-{i:04d}',f'SUP{i:06d}',f'{first_names[(i-1)%20]} {last_names[(i*3)%20]}',g,stream]
    for col in range(6,12):
        values.append('' if (i+col)%13==0 else round(30+((i*col*7)%71),1))
    first_col=get_column_letter(6); last_col=get_column_letter(11)
    values += [f'=IFERROR(AVERAGE(F{row}:K{row}),"")',f'=COUNTBLANK(F{row}:K{row})',f'=IF(L{row}="","Pending",IF(M{row}=0,"Complete","Missing marks"))']
    ws.append(values)
style_body(ws); add_table(ws,'WholeClassMarklist',len(headers),ws.max_row)
for cell in ws['L'][1:]: cell.number_format='0.0'
ws.conditional_formatting.add(f'N2:N{ws.max_row}', FormulaRule(formula=['$N2="Missing marks"'], fill=warning_fill))

# Sheet 7
ws = wb.create_sheet('CBC Grading Scale')
headers=['Code','Band','Illustrative lower bound','Illustrative upper bound','Description','Official policy verified?']
setup(ws,headers,[14,26,24,24,60,24])
scale=[('BE1','Beginning to Emerge',0,20,'Beginning to emerge — substantial guided support may be needed'),('BE2','Beginning to Emerge',21,30,'Beginning to emerge — developing foundational understanding'),('AE1','Approaching Expectation',31,40,'Approaching expectation — applies learning with support'),('AE2','Approaching Expectation',41,50,'Approaching expectation — increasingly independent application'),('ME1','Meeting Expectation',51,60,'Meeting expectation — meets routine learning outcomes'),('ME2','Meeting Expectation',61,75,'Meeting expectation — consistent and confident application'),('EE1','Exceeding Expectation',76,90,'Exceeding expectation — applies learning beyond routine contexts'),('EE2','Exceeding Expectation',91,100,'Exceeding expectation — exceptional independence and transfer')]
for r in scale: ws.append(list(r)+['No — illustrative test values; confirm approved school policy'])
style_body(ws); add_table(ws,'CBCScale',len(headers),ws.max_row)

# Sheet 8
ws = wb.create_sheet('Predefined Comments')
headers=['Comment ID','Category','Subcategory','Intended role','Comment','Source / use note']
setup(ws,headers,[16,14,16,30,90,35])
ci=1
for cat,texts in comments.items():
    for i,text in enumerate(texts,1):
        ws.append([f'C{ci:03d}',cat,f'{cat}{1 if i%2 else 2}','Class Teacher',text,'Professional illustrative comment; confirm live comment bank'])
        ci+=1
for i,text in enumerate(principal_comments,1): ws.append([f'P{i:03d}','Principal','General','Head of Institution / Principal',text,'Separate principal comment bank; confirm live settings'])
style_body(ws); add_table(ws,'PredefinedComments',len(headers),ws.max_row)

# Sheet 9
ws = wb.create_sheet('Report Card Test Records')
headers=['Report test ID','Learner ID','Admission number','Learner name','Grade','Stream','Academic year','Term','Selected assessments','Learning area','Score','Percentage','CBC competency','Class Teacher comment ID','Principal comment ID','Approval status','Record source']
setup(ws,headers,[18,18,18,24,14,10,15,12,28,24,12,14,18,22,22,18,30])
for i in range(1,61):
    g,stream,_=grades[(i-1)%len(grades)]; score='' if i%19==0 else (40+(i*7)%61)
    row=i+1
    ws.append([f'REPORT-QA-{i:03d}',f'SUP-2027-{i:04d}',f'SUP{i:06d}',f'{first_names[(i-1)%20]} {last_names[(i*3)%20]}',g,stream,2027,'Term 3','End-Term Assessment','English',score,f'=IFERROR(K{row}/100,"")',f'=IF(K{row}="","",IF(K{row}<21,"BE1",IF(K{row}<31,"BE2",IF(K{row}<41,"AE1",IF(K{row}<51,"AE2",IF(K{row}<61,"ME1",IF(K{row}<76,"ME2",IF(K{row}<91,"EE1","EE2"))))))))',f'C{((i-1)%40)+1:03d}',f'P{((i-1)%10)+1:03d}','Draft','Fictional supplemental test record'])
style_body(ws); add_table(ws,'ReportCardRecords',len(headers),ws.max_row)
for cell in ws['L'][1:]: cell.number_format='0.0%'

# Sheet 10
ws = wb.create_sheet('Negative Test Cases')
headers=['Test ID','Module','Negative case','Test action','Expected system behaviour','Severity if it fails','Evidence','Execution result']
setup(ws,headers,[14,24,32,55,70,20,28,20])
for r in negative_cases: ws.append([r[0],'Academics / Report Cards',r[1],r[2],r[3],'High','Attach screenshot/API response','Not run'])
style_body(ws); add_table(ws,'NegativeTests',len(headers),ws.max_row)

# Sheet 11
ws = wb.create_sheet('Test Execution Register')
headers=['Test ID','Module','Test description','Responsible tester','Date','Expected result','Actual result','Pass/Fail/Partial','Defect ID','Remarks']
setup(ws,headers,[14,26,55,24,14,65,65,20,18,40])
for prefix, count, module in [('A',40,'Academics'),('R',40,'Report Cards')]:
    for i in range(1,count+1): ws.append([f'{prefix}{i:02d}',module,'Complete from PDF scenario','Assign before execution','', 'See PDF scenario','', 'Not run','', ''])
for i in range(1,36): ws.append([f'N{i:02d}','Negative test','Complete from Negative Test Cases','Assign before execution','', 'See PDF negative case','', 'Not run','', ''])
style_body(ws); add_table(ws,'TestExecution',len(headers),ws.max_row)
for row in range(2,ws.max_row+1):
    ws.cell(row,8).fill = warning_fill

# Sheet 12
ws = wb.create_sheet('Data Reconciliation')
headers=['Reconciliation ID','Learner ID','Admission number','Assessment ID','Learning area','Marks entered','Marks submitted','Marks approved','Marks on report card','Missing mark?','Competency consistent?','Comment correct?','Reconciliation result','Notes']
setup(ws,headers,[20,18,18,20,24,16,18,18,22,16,22,18,24,45])
for i in range(1,81):
    row=i+1
    ws.append([f'RECON-{i:03d}',f'SUP-2027-{i:04d}',f'SUP{i:06d}',f'SUP-ASSESS-{((i-1)%len(assessment_rows))+1:03d}','English',f"='Mark Entry Dataset'!J{((i-1)%480)+2}",f'=F{row}',f'=G{row}',f"='Report Card Test Records'!K{((i-1)%60)+2}",f'=IF(F{row}="","Yes","No")',f'=IF(OR(F{row}="",I{row}=""),"Review",IF(ROUND(F{row}/100,4)=ROUND(I{row}/100,4),"Yes","No"))',f'=IF(A{row}="","Review","Review")',f'=IF(AND(K{row}="Yes",J{row}="No"),"Match","Investigate")','Fictional supplemental test reconciliation'])
style_body(ws); add_table(ws,'Reconciliation',len(headers),ws.max_row)
ws.conditional_formatting.add(f'M2:M{ws.max_row}', FormulaRule(formula=['$M2="Investigate"'], fill=PatternFill('solid',fgColor='FFC7CE')))

# Validations and global workbook metadata
for ws in wb.worksheets:
    ws.sheet_properties.pageSetUpPr.fitToPage = True
    ws.page_setup.fitToWidth = 1; ws.page_setup.fitToHeight = 0
    ws.page_margins.left=0.25; ws.page_margins.right=0.25; ws.page_margins.top=0.5; ws.page_margins.bottom=0.5
    for row in ws.iter_rows(min_row=2):
        for cell in row:
            if cell.value is not None and cell.alignment == Alignment(): cell.alignment = Alignment(vertical='top', wrap_text=True)
# Status validations
ws = wb['Test Execution Register']
dv = DataValidation(type='list', formula1='"Not run,Pass,Fail,Partial,Blocked"', allow_blank=True); ws.add_data_validation(dv); dv.add(f'H2:H{ws.max_row}')
ws = wb['Existing Learner Register']
dv2 = DataValidation(type='list', formula1='"Active,Transferred,Inactive,Test only"', allow_blank=False); ws.add_data_validation(dv2); dv2.add(f'I2:I{ws.max_row}')
wb.properties.title = 'MWANGAZA ACADEMY Advanced Academics and Learner Report Cards Test Data 2027'
wb.properties.subject = 'NEXUS SMIS controlled testing workbook'
wb.properties.creator = 'NEXUS SMIS QA'
workbook_path = OUT/'MWANGAZA_ACADEMY_ADVANCED_ACADEMICS_REPORT_CARDS_TEST_DATA_2027.xlsx'
wb.save(workbook_path)
print('Wrote', workbook_path)
print('Wrote', OUT/'MWANGAZA_ACADEMY_ADVANCED_ACADEMICS_REPORT_CARDS_TESTING_GUIDE_2027.md')
