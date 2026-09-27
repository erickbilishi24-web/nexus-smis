import { useMemo, useState } from "react";
import { CalendarDays, Check, Save } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Checkbox } from "@/components/ui/checkbox";
import { attendanceGradeLevel, attendanceGradeLevels, type AttendanceGradeLevel, type AttendanceStatus } from "../../../shared/attendance";

const statusLabel: Record<AttendanceStatus, string> = { present: "Present", absent: "Absent", late: "Late", excused: "Excused" };
const statusStyle: Record<AttendanceStatus, string> = {
  present: "bg-[#e5f1e8] text-[#1d6a57] border-[#bed9c4]",
  absent: "bg-[#f8e8e5] text-[#9c4038] border-[#e8bcb6]",
  late: "bg-[#f9efd8] text-[#966615] border-[#ebd7a9]",
  excused: "bg-[#eaf0f5] text-[#526d83] border-[#d0dce5]",
};
const today = () => new Date().toISOString().slice(0, 10);

export function AttendanceWorkspace() {
  const [date, setDate] = useState(today);
  const [gradeLevel, setGradeLevel] = useState<AttendanceGradeLevel>(7);
  const [draft, setDraft] = useState<Record<number, AttendanceStatus | "">>({});
  const utils = trpc.useUtils();
  const roster = trpc.smis.attendance.register.useQuery({ date });
  const save = trpc.smis.attendance.saveBatch.useMutation({
    onSuccess: async result => {
      await Promise.all([utils.smis.attendance.register.invalidate(), utils.smis.snapshot.invalidate()]);
      setDraft(current => {
        const next = { ...current };
        visibleRows.forEach(row => { delete next[row.id]; });
        return next;
      });
      toast.success(`Attendance saved for ${result.savedCount} learners`);
    },
    onError: error => toast.error(error.message.replaceAll("_", " ")),
  });

  const rows = roster.data ?? [];
  const visibleRows = useMemo(
    () => rows.filter(row => attendanceGradeLevel(row.grade) === gradeLevel),
    [rows, gradeLevel],
  );
  const getStatus = (row: (typeof rows)[number]): AttendanceStatus | "" =>
    draft[row.id] ?? (row.attendanceStatus as AttendanceStatus | null) ?? "";
  const counts = visibleRows.reduce((acc, row) => {
    const status = getStatus(row);
    if (status) acc[status] += 1;
    return acc;
  }, { present: 0, absent: 0, late: 0, excused: 0 });
  const pendingRows = visibleRows.filter(row => getStatus(row) !== ((row.attendanceStatus as AttendanceStatus | null) ?? ""));
  const allPresentState: boolean | "indeterminate" = visibleRows.length > 0 && counts.present === visibleRows.length
    ? true
    : counts.present > 0 ? "indeterminate" : false;

  const setAllPresent = (checked: boolean | "indeterminate") => {
    setDraft(current => {
      const next = { ...current };
      visibleRows.forEach(row => {
        // Unchecking the group control restores saved statuses; it does not erase persisted records.
        next[row.id] = checked === true ? "present" : ((row.attendanceStatus as AttendanceStatus | null) ?? "");
      });
      return next;
    });
  };

  const saveRegister = () => {
    const entries = pendingRows.map(row => ({ learnerId: row.id, status: getStatus(row) })).filter(
      (entry): entry is { learnerId: number; status: AttendanceStatus } => entry.status !== "",
    );
    if (!entries.length) {
      toast.error("Mark at least one learner before saving");
      return;
    }
    save.mutate({ attendanceDate: date, entries });
  };

  return <div className="page-enter space-y-6">
    <header className="flex flex-col gap-4 border-b border-[#dfdbd1] pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="eyebrow">Daily register · persistent school records</p><h1 className="mt-1 font-editorial text-3xl text-[#193d32]">Learner attendance</h1><p className="mt-2 text-sm text-[#69796f]">Choose a grade, mark the whole class present, then adjust learners who are absent, late, or excused.</p></div>
      <label className="text-xs font-bold text-[#53675d]">Register date<div className="mt-1 flex items-center gap-2 rounded-lg border border-[#d8ded7] bg-white px-3"><CalendarDays size={15} className="text-[#1d6a57]" /><input type="date" disabled={save.isPending} value={date} onChange={event => { setDate(event.target.value); setDraft({}); }} className="py-2.5 text-sm outline-none disabled:opacity-60" /></div></label>
    </header>

    <section aria-label="Choose grade" className="grid grid-cols-3 gap-3">
      {attendanceGradeLevels.map(level => {
        const count = rows.filter(row => attendanceGradeLevel(row.grade) === level).length;
        const active = gradeLevel === level;
        return <button key={level} type="button" disabled={save.isPending} aria-pressed={active} onClick={() => setGradeLevel(level)} className={`rounded-xl border px-3 py-4 text-left transition active:scale-[.99] disabled:opacity-60 ${active ? "border-[#1d6a57] bg-[#e8f0e9] shadow-sm" : "border-[#e0ddd3] bg-[#fffefa] hover:border-[#a8c4b2]"}`}>
          <span className="block text-sm font-extrabold text-[#193d32]">Grade {level}</span>
          <span className="mt-1 block text-xs text-[#718077]">{count} {count === 1 ? "learner" : "learners"} in register</span>
        </button>;
      })}
    </section>

    <section className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {(["present", "absent", "late", "excused"] as const).map(status => <div key={status} className="soft-card rounded-xl p-4"><p className="text-xs font-bold text-[#718077]">{statusLabel[status]}</p><p className="mt-2 text-2xl font-bold text-[#193d32]">{counts[status]}</p></div>)}
      <div className="soft-card rounded-xl p-4"><p className="text-xs font-bold text-[#718077]">Not marked</p><p className="mt-2 text-2xl font-bold text-[#193d32]">{Math.max(visibleRows.length - counts.present - counts.absent - counts.late - counts.excused, 0)}</p></div>
    </section>

    <section className="overflow-hidden rounded-xl border border-[#e7e2d7] bg-[#fffefa]">
      <div className="flex flex-col gap-3 border-b border-[#e7e2d7] bg-[#f8f7f1] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Checkbox id="mark-grade-present" checked={allPresentState} disabled={roster.isLoading || save.isPending || visibleRows.length === 0} onCheckedChange={setAllPresent} className="mt-0.5" />
          <div><label htmlFor="mark-grade-present" className="cursor-pointer text-sm font-extrabold text-[#28483f]">Mark all Grade {gradeLevel} learners present</label><p className="mt-1 text-xs text-[#718077]">Then uncheck individual learners to mark them absent, or choose Late / Excused.</p></div>
        </div>
        <button type="button" disabled={save.isPending || pendingRows.length === 0} onClick={saveRegister} className="action-button disabled:cursor-not-allowed disabled:opacity-50"><Save size={15} />{save.isPending ? "Saving register…" : `Save register${pendingRows.length ? ` · ${pendingRows.length} change${pendingRows.length === 1 ? "" : "s"}` : ""}`}</button>
      </div>

      {roster.isLoading ? <p className="p-6 text-sm text-[#718077]">Loading assigned learner roster…</p> : visibleRows.length === 0 ? <div className="p-8 text-center"><h2 className="font-bold text-[#28483f]">No Grade {gradeLevel} learners available</h2><p className="mt-2 text-sm text-[#718077]">Add active learners to this grade in People, or ask an administrator to assign this grade to your account. Attendance for Grades 7–9 is available from the tabs above.</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-[#edf2ed] text-[.67rem] uppercase tracking-wider text-[#53675d]"><tr><th className="p-3">Admission No.</th><th className="p-3">Learner</th><th className="p-3">Class</th><th className="p-3">Saved status</th><th className="p-3 text-center">Present</th><th className="p-3">If not present</th></tr></thead><tbody>{visibleRows.map(learner => {
        const selected = getStatus(learner);
        const statusChoice = selected === "present" ? "" : selected;
        const actual = learner.attendanceStatus as AttendanceStatus | null;
        return <tr key={learner.id} className="border-t border-[#eee9df]">
          <td className="p-3 font-mono text-xs">{learner.admissionNumber}</td>
          <td className="p-3 font-semibold text-[#28483f]">{learner.fullName}</td>
          <td className="p-3 text-[#718077]">{learner.grade}</td>
          <td className="p-3">{actual ? <span className={`rounded-full border px-2 py-1 text-xs font-bold ${statusStyle[actual]}`}>{statusLabel[actual]}</span> : <span className="text-xs text-[#966615]">Not marked</span>}</td>
          <td className="p-3 text-center"><Checkbox disabled={save.isPending} aria-label={`Mark ${learner.fullName} present`} checked={selected === "present"} onCheckedChange={checked => setDraft(current => ({ ...current, [learner.id]: checked === true ? "present" : "absent" }))} /></td>
          <td className="p-3"><select disabled={save.isPending || selected === "present"} aria-label={`Status for ${learner.fullName} if not present`} value={statusChoice} onChange={event => setDraft(current => ({ ...current, [learner.id]: event.target.value as AttendanceStatus | "" }))} className="rounded-md border border-[#d8ded7] bg-white px-2 py-2 text-xs disabled:opacity-60"><option value="">Choose status</option><option value="absent">Absent</option><option value="late">Late</option><option value="excused">Excused</option></select></td>
        </tr>;
      })}</tbody></table></div>}
      <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-[#e7e2d7] px-4 py-3 text-xs text-[#718077]"><span className="inline-flex items-center gap-1"><Check size={13} className="text-[#1d6a57]" /> Present is selected per learner</span><span>Unchecking Present marks the learner absent</span><span>Use the status menu for Late or Excused</span></div>
    </section>
  </div>;
}
