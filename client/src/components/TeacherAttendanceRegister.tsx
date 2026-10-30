import { Download, Printer, UsersRound } from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toUserError } from "@/lib/errorText";
import { toast } from "sonner";

type Period = "daily" | "weekly" | "monthly" | "yearly";
const today = () => new Date().toISOString().slice(0, 10);
const dateText = (value: Date | string | null | undefined) => value ? new Date(value).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" }) : "—";

export function TeacherAttendanceRegister() {
  const [period, setPeriod] = useState<Period>("daily");
  const [anchorDate, setAnchorDate] = useState(today);
  const register = trpc.smis.clocking.teacherAttendance.useQuery({ period, anchorDate });
  const rows = register.data?.rows ?? [];
  const download = () => {
    const data = [["Teacher", "Role", "Attendance date", "Clocked in", "Clocked out", "Distance (m)"], ...rows.map(row => [row.teacherName, row.role, String(row.clockDate), dateText(row.clockedAt), dateText(row.clockedOutAt), String(row.distanceMeters)])];
    const csv = data.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `teachers-attendance-${period}-${anchorDate}.csv`; link.click(); URL.revokeObjectURL(url);
  };
  return <section className="teacher-attendance-register space-y-4 p-4 sm:p-6">
    <div className="flex flex-col gap-3 border-b border-[#e2e6dc] pb-4 lg:flex-row lg:items-end lg:justify-between">
      <div><p className="eyebrow">Administration · attendance records</p><h2 className="mt-1 flex items-center gap-2 font-editorial text-2xl text-[#28483f]"><UsersRound size={22} className="text-[#1d6a57]" />Teachers' attendance register</h2><p className="mt-1 text-xs leading-5 text-[#718077]">Clock-in and clock-out records from the current school are shown here. Access is restricted to Administration and Super Admin.</p></div>
      <div className="flex flex-wrap gap-2"><button type="button" className="quiet-button" onClick={() => window.print()}><Printer size={15} />Print / PDF</button><button type="button" className="quiet-button" disabled={!rows.length} onClick={download}><Download size={15} />Download CSV</button></div>
    </div>
    <div className="grid gap-3 rounded-xl border border-[#d8ddd4] bg-[#f8f7f1] p-3 sm:grid-cols-[12rem_12rem_1fr] sm:items-end">
      <label className="text-xs font-bold text-[#53675d]">Register period<select className="mt-1 w-full rounded-lg border border-[#d8ddd4] bg-white px-3 py-2 text-sm" value={period} onChange={e => setPeriod(e.target.value as Period)}><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option></select></label>
      <label className="text-xs font-bold text-[#53675d]">Reference date<input type="date" className="mt-1 w-full rounded-lg border border-[#d8ddd4] bg-white px-3 py-2 text-sm" value={anchorDate} onChange={e => setAnchorDate(e.target.value)} /></label>
      <div className="text-xs text-[#718077]">Showing <b className="text-[#28483f]">{register.data?.start ?? "—"}</b> to <b className="text-[#28483f]">{register.data?.end ?? "—"}</b> · <b className="text-[#28483f]">{rows.length}</b> clocking record{rows.length === 1 ? "" : "s"}</div>
    </div>
    {register.isError ? <p className="rounded-lg border border-[#e6c4bd] bg-[#fff8f6] p-4 text-sm text-[#a3382c]">{toUserError(register.error)}</p> : register.isLoading ? <p className="p-6 text-sm text-[#718077]">Loading teacher attendance…</p> : !rows.length ? <div className="rounded-xl border border-dashed border-[#cfd9cf] p-8 text-center text-sm text-[#718077]">No teacher clock-in records exist for this period.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-[#edf2ed] text-xs uppercase tracking-wide text-[#53675d]"><tr><th className="p-3">Teacher</th><th className="p-3">Role</th><th className="p-3">Date</th><th className="p-3">Clocked in</th><th className="p-3">Clocked out</th><th className="p-3">Distance</th></tr></thead><tbody>{rows.map(row => <tr key={String(row.id)} className="border-t border-[#eee9df]"><td className="p-3 font-semibold text-[#28483f]">{row.teacherName}</td><td className="p-3 capitalize">{row.role.replaceAll("_", " ")}</td><td className="p-3">{String(row.clockDate)}</td><td className="p-3">{dateText(row.clockedAt)}</td><td className="p-3">{row.clockedOutAt ? dateText(row.clockedOutAt) : <span className="font-semibold text-[#966615]">Not clocked out</span>}</td><td className="p-3">{Number(row.distanceMeters).toFixed(0)} m</td></tr>)}</tbody></table></div>}
  </section>;
}
