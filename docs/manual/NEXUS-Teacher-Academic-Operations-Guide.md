# NEXUS Software — Teacher and Academic Operations Guide

**Version:** 1.0 — 28 October 2026  
**Audience:** teachers, class teachers, senior teachers, HODs, deputy/principal, Exam Council and academic administrators.

## 1. Academic source-of-truth rules

- **People** owns learner and staff identity.
- **Classes/Streams** owns the class values used by admissions, assessment and timetable.
- **Teacher Allocations** owns who teaches which subject/class/term.
- **Curriculum Setup** owns enabled levels and learning areas.
- **Timetable Generator** schedules allocated teaching requirements.
- **Attendance** owns morning/afternoon register sessions.
- **Assessments** owns assessment and mark records.
- **Reports** reads marks and allocations to produce report cards.

If two screens disagree, stop and correct the upstream source; do not type a different name or code into the downstream output.

## 2. Learners and staff

Open **People**. Search by learner name, admission or guardian. Confirm the grade/class/stream before attendance or marks entry. For staff, open **Teachers & Staff**, maintain role, active status and teacher code, and use **Deactivate** instead of deletion when historical records exist.

For bulk import, download **Learner template**, use exact Grade/Class values from the Add Learner selector, upload, inspect the validation preview/error report and select **Upload & finalize** only after the valid/error counts are understood.

## 3. Curriculum and classes

Open **Curriculum Setup**, enable only the levels the school offers, select learning areas/pathways and click **Save curriculum**. Save school levels separately. Confirm that the offered list matches the classes and streams before allocations.

Senior School combinations must be checked against current KICD designs. NEXUS links to KICD reference material; it is not a synchronised KICD API.

## 4. Teacher Allocations

1. Open **Teacher Allocations**.
2. Select academic year and term.
3. Select the grade/class and learning area.
4. Select the active teacher from People.
5. Save and confirm the active allocation list.
6. Configure one active class teacher per class/stream through the class-teacher panel.
7. Resolve subject-already-allocated or class-teacher conflicts using the replacement/deactivation action and confirm the new active row.

Ordinary teachers should not access allocation administration. The allocation must exist before the teacher can enter subject marks and before the timetable can reliably map codes to names.

## 5. Timetable Generator

### Prepare

Confirm enabled curriculum, class streams, active staff, teacher allocations, day/session times, breaks/lunch, weekly requirements and no duplicate active subject allocation.

### Generate and review

Open **Timetable Generator** → enter or review lesson requirements → click **Generate timetable**. Review the expected/placed summary, unplaced lessons, missing teacher warnings, horizontal conflicts and consecutive-code warnings. Core subjects are prioritised before noon where possible. Breaks/lunch/games are not treated as adjacent teaching lessons for warning purposes.

If the scheduler reports a non-blocking soft recommendation, use the documented apply-anyway choice only after review. Force-placed cells are highlighted so the administrator can inspect them. Do not publish until all required lessons, teacher identity and class conflicts are reconciled.

### Manual adjustment

Select **Edit timetable**, drag a lesson cell to another compatible slot or swap two lesson cells, then select **Save timetable**. Validate again after every manual swap. A manual move can create a teacher/class conflict; the warning must be resolved or explicitly approved under school policy.

### Publish

Use **Download PDF**, **Download Excel** or **Print** after confirming the selected version, school, class, term, day and teacher-code legend. Personal timetable views are for authorised users; master timetable access is permission-controlled.

## 6. Attendance

Open **Attendance** → select **Register date** and **Present Morning** or **Present Afternoon** → select the authorised class → mark each learner or use **Mark all Grade N morning/afternoon present** → correct exceptions → **Save session**. Repeat for the other session when required. Use **Submit for approval**, **Approve register** or **Reopen** according to role.

Ordinary teachers may view but not mark where the current policy applies. Class teachers and authorised administrators mark only their permitted class scope. The current UI explicitly exposes Grade 7–9 selectors; confirm wider grade support before training ECDE/primary staff.

## 7. Assessments and marklists

### Teacher entry

1. Open **Academics → Teacher entry**.
2. Select the allocated class and subject.
3. Select **Mid-Term** or **End-Term**.
4. Select **Create New Assessment** when authorised, or load an existing assessment.
5. Select **Load learner roster**.
6. Enter scores and remarks; leave a score blank only when it is genuinely missing. Zero is a valid mark.
7. Select **Save**, complete the roster and submit.

Assessment creation is administrator-only in the current permission model. Teachers are limited to active allocations. Exam Council can use **Whole Class Marklist (All Subjects)** for review but cannot create assessments by default.

### Review/lock

Reviewer/admin checks the consolidated marklist, Average, missing marks and ranking/tie behavior, then approves/locks. A locked correction requires an authorised administrator and reason. Export the client-side Excel marklist only after checking the selected class, term and assessment type.

## 8. Report cards

Open **Reports** → learner report card → choose Grade, Learner, Academic year, Term and Assessment type. Check learning areas, marks, CBC performance levels, facilitator and comments. Use **Save comments**, then **Print / PDF**.

Before the first production report, configure school name, logo, motto, signatures and term dates. The current source contains demo fallback/hard-coded template content that must be replaced or verified for the school.

## 9. Progression, archives and alumni

At year end, create next-year classes and destination streams, open **Academic setup & progression**, select **Preview rollover**, inspect ready/pending records, use **Exclude** for approved exceptions and **Approve ready learners**. Grade 9 needs an approved Senior School destination. Use **Reverse** only for a reviewed mistake.

Open **Academic Archives & Alumni** to search historical records. Use **Learner Exit & Completion → Process learner exit** with the correct learner ID, status, date and reason. Preserve historical assessment/report data. The archive/alumni export path was not verified.

## 10. Teacher quick troubleshooting

| Problem | First check | Escalate when |
|---|---|---|
| Learner missing | People search, class and active status | Record exists in another school/class |
| Subject unavailable | Curriculum offering and active allocation | Allocation is duplicated or inactive |
| Cannot mark attendance | Role, class-teacher allocation, session/date | Permission looks correct but server rejects |
| Cannot enter marks | Active teacher allocation, term, assessment state | Assessment is locked or roster is wrong |
| Timetable teacher code wrong | People code and active allocation | Source allocation and timetable disagree after refresh |
| Blank report-card subject | Marks not entered or wrong assessment type | Source marks exist but report remains wrong |
| Print does not fit | Landscape, browser scale, selected filters | Data is missing or columns remain unreadable |
