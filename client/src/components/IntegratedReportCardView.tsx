import { useEffect, useMemo, useState } from "react";
import { Printer } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

type AssessmentType = "mid_term" | "end_term";
const label = (type: AssessmentType) => type === "mid_term" ? "Mid-Term" : "End-Term";

export function IntegratedReportCardView({ canReview = false }: { canReview?: boolean }) {
  const settings = trpc.smis.settings.get.useQuery();
  const commentAccess = trpc.smis.assessments.commentAccess.useQuery();
  const mayComment = canReview || commentAccess.data === true;
  const learners = trpc.smis.learners.list.useQuery({});
  const catalog = trpc.smis.people.catalog.useQuery();
  const [learnerId, setLearnerId] = useState<number | null>(null);
  const [gradeId, setGradeId] = useState<number | null>(null);
  const [academicYear, setAcademicYear] = useState(new Date().getFullYear());
  const [term, setTerm] = useState("Term 1");
  const [assessmentType, setAssessmentType] = useState<AssessmentType>("mid_term");
  const [classTeacherComment, setClassTeacherComment] = useState("");
  const [headTeacherComment, setHeadTeacherComment] = useState("");
  const utils = trpc.useUtils();
  useEffect(() => {
    if (!settings.data) return;
    setAcademicYear(settings.data.academicYear);
    setTerm(settings.data.currentTerm);
  }, [settings.data?.academicYear, settings.data?.currentTerm]);
  useEffect(() => {
    if (gradeId || !catalog.data?.grades.length) return;
    setGradeId(catalog.data.grades[0].id);
  }, [catalog.data?.grades, gradeId]);
  const gradeLearners = useMemo(() => (learners.data ?? []).filter(row => !gradeId || row.gradeId === gradeId), [learners.data, gradeId]);
  useEffect(() => {
    if (!gradeLearners.length) { setLearnerId(null); return; }
    if (!learnerId || !gradeLearners.some(row => row.id === learnerId)) setLearnerId(gradeLearners[0].id);
  }, [gradeLearners, learnerId]);

  const report = trpc.smis.reports.reportCard.useQuery({
    learnerId: learnerId ?? 0,
    academicYear,
    term,
    assessmentType,
  }, { enabled: learnerId !== null });
  const saveComments = trpc.smis.reports.saveReportCardComments.useMutation({
    onSuccess: async () => {
      toast.success("Report-card comments saved");
      await utils.smis.reports.reportCard.invalidate();
    },
    onError: error => toast.error(error.message.replaceAll("_", " ")),
  });
  const result = report.data;
  const marks = result?.marksheet ?? [];
  const scored = marks.filter(row => row.score !== null);
  const total = scored.reduce((sum, row) => sum + (row.score ?? 0), 0);
  const average = scored.length ? Math.round((total / scored.length) * 100) / 100 : null;
  const status = result?.assessmentStatus ?? "draft";

  return <div className="page-enter space-y-5">
    <header className="flex flex-col gap-4 border-b border-[#dfdbd1] pb-5"><div><p className="eyebrow">Reports · same assessment records</p><h1 className="mt-1 font-editorial text-3xl text-[#193d32]">Integrated learner report card</h1><p className="mt-2 text-sm text-[#69796f]">A report is generated from the centrally stored marks for the selected year, term and assessment type.</p></div></header>
    <section className="grid gap-3 rounded-xl border border-[#e7e2d7] bg-[#fffefa] p-4 sm:grid-cols-2 lg:grid-cols-5">
      <label className="text-xs font-bold text-[#53675d]">Grade<select value={gradeId ?? ""} onChange={event => setGradeId(Number(event.target.value))} className="mt-2 w-full rounded-lg border border-[#d8ded7] bg-white px-3 py-2.5 text-sm"><option value="" disabled>Select Grade</option>{catalog.data?.grades.map((row: { id: number; name: string; stream?: string | null }) => <option key={row.id} value={row.id}>{row.name}{row.stream ? ` ${row.stream}` : ""}</option>)}</select></label>
      <label className="text-xs font-bold text-[#53675d]">Learner<select value={learnerId ?? ""} onChange={event => setLearnerId(Number(event.target.value))} className="mt-2 w-full rounded-lg border border-[#d8ded7] bg-white px-3 py-2.5 text-sm"><option value="" disabled>Select learner</option>{gradeLearners.map(row => <option key={row.id} value={row.id}>{row.admissionNumber} · {row.fullName}</option>)}</select></label>
      <label className="text-xs font-bold text-[#53675d]">Academic year<input type="number" min="2000" max="2100" value={academicYear} onChange={event => setAcademicYear(Number(event.target.value))} className="mt-2 w-full rounded-lg border border-[#d8ded7] bg-white px-3 py-2.5 text-sm" /></label>
      <label className="text-xs font-bold text-[#53675d]">Term<input value={term} onChange={event => setTerm(event.target.value)} className="mt-2 w-full rounded-lg border border-[#d8ded7] bg-white px-3 py-2.5 text-sm" /></label>
      <label className="text-xs font-bold text-[#53675d]">Assessment type<select value={assessmentType} onChange={event => setAssessmentType(event.target.value as AssessmentType)} className="mt-2 w-full rounded-lg border border-[#d8ded7] bg-white px-3 py-2.5 text-sm"><option value="mid_term">Mid-Term</option><option value="end_term">End-Term</option></select></label>
    </section>
    {report.isLoading && <p className="text-sm text-[#718077]">Loading the report from current assessment records…</p>}
    {!result && !report.isLoading && <SampleReportCard schoolName={settings.data?.schoolName ?? "Ebunangwe Junior School"} gradeName={catalog.data?.grades.find((row: { id: number; name: string }) => row.id === gradeId)?.name ?? "Grade 7"} />}
    {result && <article className="report-card-print mx-auto max-w-5xl rounded-xl border border-[#d8ded7] bg-white p-5 text-[#19342e] shadow-sm sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-[#1d6a57] pb-4"><div><p className="text-xs font-bold uppercase tracking-[.12em] text-[#1d6a57]">{result.settings.schoolName}</p><h2 className="mt-1 text-2xl font-bold">Learner Assessment Report</h2><p className="mt-1 text-sm">{label(assessmentType)} · {term} {academicYear} · {result.grade?.name ?? "Class"}{result.grade?.stream ? ` ${result.grade.stream}` : ""}</p></div><div className="flex items-center gap-2 print:hidden"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${status === "approved" || status === "locked" ? "bg-[#e7f0e7] text-[#1d6a57]" : "bg-[#f9efd8] text-[#966615]"}`}>{status}</span><button type="button" onClick={() => window.print()} className="quiet-button"><Printer size={15} />Print / PDF</button></div></div>
      <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3"><p><b>Learner:</b> {result.learner.fullName}</p><p><b>Admission No.:</b> {result.learner.admissionNumber}</p><p><b>Assessment:</b> {label(assessmentType)}</p></div>
      <div className="mt-5 overflow-x-auto"><table className="w-full border-collapse text-sm"><thead><tr className="bg-[#edf2ed]"><th className="border border-[#d8ded7] p-2 text-left">Subject / Learning Area</th><th className="border border-[#d8ded7] p-2">Mark / 100</th><th className="border border-[#d8ded7] p-2">CBC Level</th><th className="border border-[#d8ded7] p-2 text-left">Teacher remark</th></tr></thead><tbody>{marks.map(row => <tr key={row.subject.id}><td className="border border-[#e5e1d8] p-2 font-semibold">{row.subject.name}</td><td className="border border-[#e5e1d8] p-2 text-center">{row.score ?? <span className="font-bold text-[#a76316]">-</span>}</td><td className="border border-[#e5e1d8] p-2 text-center">{row.cbcLevel ?? "-"}</td><td className="border border-[#e5e1d8] p-2">{row.teacherRemark ?? "-"}</td></tr>)}</tbody></table></div>
      {result.missingCount > 0 && <p className="mt-3 rounded-lg bg-[#fbf5e5] p-3 text-sm font-semibold text-[#76591d]">{result.missingCount} subject mark(s) are missing or not yet approved. Missing marks are not treated as zero.</p>}
      <div className="mt-4 grid gap-2 border-y border-[#d8ded7] py-3 text-sm sm:grid-cols-3"><p><b>Total of entered marks:</b> {total}</p><p><b>Average of entered marks:</b> {result.settings.showPercentagesOnReportCard ? (average === null ? "—" : `${average}%`) : "—"}</p><p><b>Assessment status:</b> {status}</p></div>
      <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2"><p><b>Class teacher:</b> {result.classTeacher ?? "Not assigned"}</p><p><b>Attendance:</b> {result.attendance.present} present · {result.attendance.absent} absent</p></div>
      {mayComment && <div className="mt-5 grid gap-3 print:hidden sm:grid-cols-2"><label className="text-xs font-bold">Class teacher comment<textarea value={classTeacherComment || result.report?.classTeacherComment || ""} onChange={event => setClassTeacherComment(event.target.value)} className="mt-1 min-h-20 w-full rounded border p-2 text-sm" /></label><label className="text-xs font-bold">Head teacher comment<textarea value={headTeacherComment || result.report?.headTeacherComment || ""} onChange={event => setHeadTeacherComment(event.target.value)} className="mt-1 min-h-20 w-full rounded border p-2 text-sm" /></label><button type="button" onClick={() => saveComments.mutate({ learnerId: result.learner.id, academicYear, term, assessmentType, classTeacherComment: classTeacherComment || null, headTeacherComment: headTeacherComment || null })} className="action-button sm:col-span-2">Save comments</button></div>}
      <footer className="mt-6 border-t border-[#d8ded7] pt-3 text-xs text-[#718077]">Generated from NEXUS Assessment records · {term} {academicYear} · {label(assessmentType)}.</footer>
    </article>}
    {report.error && <p className="rounded-lg bg-[#fbf5e5] p-3 text-sm text-[#76591d]">{report.error.message.replaceAll("_", " ")}</p>}
  </div>;
}

function SampleReportCard({ schoolName, gradeName }: { schoolName: string; gradeName: string }) {
  const rows = ["English", "Mathematics", "Integrated Science", "Social Studies"];
  return <article className="report-card-print mx-auto max-w-5xl rounded-xl border-2 border-dashed border-[#b8cbbd] bg-white p-5 text-[#19342e] shadow-sm sm:p-8"><div className="border-b-2 border-[#1d6a57] pb-4 text-center"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#1d6a57]">{schoolName}</p><h2 className="mt-1 text-2xl font-bold">Learner Assessment Report</h2><p className="mt-1 text-sm">Sample template · Term 2 2026 · {gradeName}</p></div><div className="mt-4 grid gap-2 text-sm sm:grid-cols-3"><p><b>Learner:</b> Amina Mwende</p><p><b>Admission No.:</b> G8-024</p><p><b>Class:</b> {gradeName}</p></div><div className="mt-5 overflow-x-auto"><table className="w-full border-collapse text-sm"><thead><tr className="bg-[#edf2ed]"><th className="border border-[#d8ded7] p-2 text-left">Subject / Learning Area</th><th className="border border-[#d8ded7] p-2">Mark / 100</th><th className="border border-[#d8ded7] p-2">CBC Level</th><th className="border border-[#d8ded7] p-2 text-left">Teacher remark</th></tr></thead><tbody>{rows.map(row => <tr key={row}><td className="border border-[#e5e1d8] p-2 font-semibold">{row}</td><td className="border border-[#e5e1d8] p-2 text-center font-bold text-[#a76316]">-</td><td className="border border-[#e5e1d8] p-2 text-center">-</td><td className="border border-[#e5e1d8] p-2">-</td></tr>)}</tbody></table></div><div className="mt-4 grid gap-2 border-y border-[#d8ded7] py-3 text-sm sm:grid-cols-3"><p><b>Total:</b> -</p><p><b>Average:</b> -</p><p><b>Attendance:</b> - present · - absent</p></div><div className="mt-5 grid gap-4 text-sm sm:grid-cols-2"><p className="border-t border-[#9aaba0] pt-2">Class teacher comment: -</p><p className="border-t border-[#9aaba0] pt-2">Head teacher comment: -</p></div><p className="mt-5 rounded-lg bg-[#fbf5e5] p-3 text-xs font-semibold text-[#76591d]">Sample layout preview. Select a Grade and learner to load the live report card.</p></article>;
}
