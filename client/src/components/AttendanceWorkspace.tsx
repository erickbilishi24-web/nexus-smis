import { useMemo, useState } from "react";
import { CalendarDays, Save } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

type AttendanceStatus = "present" | "absent" | "late" | "excused";
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
  const [draft, setDraft] = useState<Record<number, AttendanceStatus | "">>({});
  const utils = trpc.useUtils();
  const roster = trpc.smis.attendance.register.useQuery({ date });
  const save = trpc.smis.attendance.save.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.smis.attendance.register.invalidate(), utils.smis.snapshot.invalidate()]);
    },
    onError: error => toast.error(error.message.replaceAll("_", " ")),
  });
  const rows = roster.data ?? [];
  const totals = rows.reduce((acc, row) => {
    const status = (draft[row.id] || row.attendanceStatus) as AttendanceStatus | undefined;
    if (status) acc[status] += 1;
    return acc;
  }, { present: 0, absent: 0, late: 0, excused: 0 });
  const handleSave = (learnerId: number) => {
    const status = draft[learnerId];
    if (!status) { toast.error("Choose an attendance status first"); return; }
    save.mutate({ learnerId, status, attendanceDate: date, note: null }, {
      onSuccess: () => {
        setDraft(current => { const next = { ...current }; delete next[learnerId]; return next; });
        toast.success("Attendance saved");
      },
    });
  };

  return <div className="page-enter space-y-6">
    <header className="flex flex-col gap-4 border-b border-[#dfdbd1] pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="eyebrow">Daily register · persistent school records</p><h1 className="mt-1 font-editorial text-3xl text-[#193d32]">Learner attendance</h1><p className="mt-2 text-sm text-[#69796f]">Register results save against the learner and class in the school database.</p></div>
      <label className="text-xs font-bold text-[#53675d]">Register date<div className="mt-1 flex items-center gap-2 rounded-lg border border-[#d8ded7] bg-white px-3"><CalendarDays size={15} className="text-[#1d6a57]" /><input type="date" value={date} onChange={event => { setDate(event.target.value); setDraft({}); }} className="py-2.5 text-sm outline-none" /></div></label>
    </header>
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {(["present", "absent", "late", "excused"] as const).map(status => <div key={status} className="soft-card rounded-xl p-4"><p className="text-xs font-bold text-[#718077]">{statusLabel[status]}</p><p className="mt-2 text-2xl font-bold text-[#193d32]">{totals[status]}</p></div>)}
    </section>
    {roster.isLoading ? <p className="text-sm text-[#718077]">Loading assigned learner roster…</p> : rows.length === 0 ? <div className="rounded-xl border border-dashed border-[#ccd8ce] bg-[#f7f8f3] p-8 text-center"><h2 className="font-bold text-[#28483f]">No learner records available</h2><p className="mt-2 text-sm text-[#718077]">Add a class and learner in People first, then create teacher allocations if you are entering attendance as a teacher. No sample learner records are shown.</p></div> : <div className="overflow-x-auto rounded-xl border border-[#e7e2d7] bg-[#fffefa]"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-[#edf2ed] text-[.67rem] uppercase tracking-wider text-[#53675d]"><tr><th className="p-3">Admission No.</th><th className="p-3">Learner</th><th className="p-3">Class</th><th className="p-3">Saved status</th><th className="p-3">Update attendance</th><th className="p-3">Action</th></tr></thead><tbody>{rows.map(learner => {
      const selected = draft[learner.id] ?? "";
      const actual = learner.attendanceStatus as AttendanceStatus | null;
      return <tr key={learner.id} className="border-t border-[#eee9df]"><td className="p-3 font-mono text-xs">{learner.admissionNumber}</td><td className="p-3 font-semibold text-[#28483f]">{learner.fullName}</td><td className="p-3 text-[#718077]">{learner.grade}</td><td className="p-3">{actual ? <span className={`rounded-full border px-2 py-1 text-xs font-bold ${statusStyle[actual]}`}>{statusLabel[actual]}</span> : <span className="text-xs text-[#966615]">Not marked</span>}</td><td className="p-3"><select aria-label={`Attendance for ${learner.fullName}`} value={selected} onChange={event => setDraft(current => ({ ...current, [learner.id]: event.target.value as AttendanceStatus | "" }))} className="rounded-md border border-[#d8ded7] bg-white px-2 py-2 text-xs"><option value="">Choose status</option>{Object.entries(statusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></td><td className="p-3"><button type="button" disabled={!selected || save.isPending} onClick={() => handleSave(learner.id)} className="quiet-button disabled:opacity-50"><Save size={14} />Save</button></td></tr>;
    })}</tbody></table></div>}
  </div>;
}
