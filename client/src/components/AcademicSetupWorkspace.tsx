import { useEffect, useState } from "react";
import { CheckCircle2, RotateCcw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { toUserError } from "@/lib/errorText";

const input = "w-full rounded-lg border border-[#d8ded7] bg-[#fbfaf5] px-3 py-2 text-sm";

export function AcademicSetupWorkspace() {
  const structure = trpc.smis.academic.structure.useQuery();
  const utils = trpc.useUtils();
  const [year, setYear] = useState(new Date().getFullYear() + 1);
  const [editingYearId, setEditingYearId] = useState<number | null>(null);
  const [termYearId, setTermYearId] = useState(0);
  const [editingTermId, setEditingTermId] = useState<number | null>(null);
  const [termName, setTermName] = useState<"Term 1" | "Term 2" | "Term 3">("Term 1");
  const [termActive, setTermActive] = useState(true);
  const [termStarts, setTermStarts] = useState("");
  const [termEnds, setTermEnds] = useState("");
  const [fromYear, setFromYear] = useState(new Date().getFullYear());
  const [toYear, setToYear] = useState(new Date().getFullYear() + 1);
  const [startsOn, setStartsOn] = useState(`${year}-01-06`);
  const [endsOn, setEndsOn] = useState(`${year}-11-30`);
  const [rolloverOn, setRolloverOn] = useState(`${year}-11-30`);
  const [runId, setRunId] = useState<number | null>(null);
  const [approvedRun, setApprovedRun] = useState(false);

  const saveTerm = trpc.smis.academic.saveTerm.useMutation({
    onSuccess: () => { toast.success(editingTermId ? "Term updated" : "Term saved"); setEditingTermId(null); setTermYearId(0); setTermStarts(""); setTermEnds(""); setTermActive(true); void utils.smis.academic.structure.invalidate(); },
    onError: e => toast.error(toUserError(e)),
  });
  const deleteTerm = trpc.smis.academic.deleteTerm.useMutation({
    onSuccess: () => { toast.success("Term deleted"); void utils.smis.academic.structure.invalidate(); },
    onError: e => toast.error(toUserError(e)),
  });
  const saveYear = trpc.smis.academic.saveYear.useMutation({
    onSuccess: () => { toast.success(editingYearId ? "Academic year updated" : "Academic year saved"); setEditingYearId(null); void utils.smis.academic.structure.invalidate(); },
    onError: e => toast.error(toUserError(e)),
  });
  const deleteYear = trpc.smis.academic.deleteYear.useMutation({
    onSuccess: () => { toast.success("Academic year deleted"); void utils.smis.academic.structure.invalidate(); },
    onError: e => toast.error(toUserError(e)),
  });
  const preview = trpc.smis.academic.previewRollover.useMutation({
    onSuccess: r => { setRunId(r.runId); setApprovedRun(false); toast.success(`Preview ready: ${r.items.length} learners reviewed`); },
    onError: e => toast.error(toUserError(e)),
  });
  const items = trpc.smis.academic.items.useQuery({ runId: runId! }, { enabled: !!runId });
  const approve = trpc.smis.academic.approveRollover.useMutation({
    onSuccess: r => { setApprovedRun(true); toast.success(`${r.approved} learners progressed; ${r.pending} require action`); void utils.smis.academic.structure.invalidate(); void items.refetch(); },
    onError: e => toast.error(toUserError(e)),
  });
  const reverse = trpc.smis.academic.reverseRollover.useMutation({
    onSuccess: () => { toast.success("Rollover reversed and current learner grades restored"); void items.refetch(); },
    onError: e => toast.error(toUserError(e)),
  });
  const exclude = trpc.smis.academic.excludeRolloverItem.useMutation({
    onSuccess: () => { toast.success("Learner excluded from this rollover"); void items.refetch(); },
    onError: e => toast.error(toUserError(e)),
  });

  const years = structure.data?.years ?? [];
  useEffect(() => { const current = years.find(row => row.isCurrent); if (current) setFromYear(current.year); }, [structure.data?.years]);
  const yearForTerm = (academicYearId: number) => years.find(row => row.id === academicYearId)?.year ?? "—";
  const yearBadge = (row: { year: number; isCurrent: number | boolean }) => row.isCurrent ? { label: "Current active", className: "bg-[#d9f3e7] text-[#176345]" } : row.year < new Date().getFullYear() ? { label: "Past", className: "bg-[#eceff1] text-[#53616a]" } : { label: "Upcoming", className: "bg-[#fff0c7] text-[#806019]" };

  return <div className="page-enter space-y-6">
    <header className="border-b border-[#dfdbd1] pb-5">
      <p className="eyebrow">Administration · academic structure</p>
      <h1 className="mt-1 font-editorial text-3xl text-[#193d32]">Academic setup & progression</h1>
      <p className="mt-2 text-sm text-[#69796f]">Configure years and terms, then preview and approve a traceable, repeat-safe learner rollover. Historical records remain unchanged.</p>
    </header>

    <section className="soft-card rounded-[1.15rem] p-5">
      <div className="flex items-center gap-2"><ShieldCheck size={18} className="text-[#1d6a57]"/><h2 className="font-bold text-[#28483f]">Academic years</h2></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="text-xs font-bold text-[#53675d]">Year<input type="number" value={year} onChange={e => setYear(Number(e.target.value))} className={input}/></label>
        <label className="text-xs font-bold text-[#53675d]">Starts<input type="date" value={startsOn} onChange={e => setStartsOn(e.target.value)} className={input}/></label>
        <label className="text-xs font-bold text-[#53675d]">Ends<input type="date" value={endsOn} onChange={e => setEndsOn(e.target.value)} className={input}/></label>
        <label className="text-xs font-bold text-[#53675d]">Rollover date<input type="date" value={rolloverOn} onChange={e => setRolloverOn(e.target.value)} className={input}/></label>
        <div className="flex gap-2 self-end"><button className="action-button justify-center" onClick={() => saveYear.mutate({ id: editingYearId ?? undefined, year, startsOn, endsOn, rolloverOn, isCurrent: true })}>{saveYear.isPending ? "Saving…" : editingYearId ? "Save changes" : "Save year"}</button>{editingYearId && <button type="button" className="quiet-button" onClick={() => setEditingYearId(null)}>Cancel</button>}</div>
      </div>
      <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[620px] text-left text-xs"><thead className="bg-[#edf2ed]"><tr><th className="p-2">Year</th><th className="p-2">Dates</th><th className="p-2">Rollover</th><th className="p-2">Status</th><th className="p-2">Actions</th></tr></thead><tbody>{structure.data?.years.map(row => { const badge = yearBadge(row); return <tr key={row.id} className="border-t border-[#eee9df]"><td className="p-2 font-bold"><div className="flex flex-wrap items-center gap-2"><span>{row.year}</span><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${badge.className}`}>{badge.label}</span></div></td><td className="p-2">{String(row.startsOn).slice(0, 10)} – {String(row.endsOn).slice(0, 10)}</td><td className="p-2">{row.rolloverOn ? String(row.rolloverOn).slice(0, 10) : "Not set"}</td><td className="p-2 capitalize">{row.status}</td><td className="p-2"><div className="flex gap-2"><button type="button" className="quiet-button" onClick={() => { setEditingYearId(row.id); setYear(row.year); setStartsOn(String(row.startsOn).slice(0, 10)); setEndsOn(String(row.endsOn).slice(0, 10)); setRolloverOn(row.rolloverOn ? String(row.rolloverOn).slice(0, 10) : ""); }}>Edit</button><button type="button" className="quiet-button text-[#9c4038]" disabled={Boolean(row.isCurrent) || deleteYear.isPending} title={row.isCurrent ? "The current academic year cannot be deleted" : "Delete academic year"} onClick={() => window.confirm(`Delete academic year ${row.year}?`) && deleteYear.mutate({ yearId: row.id })}>Delete</button></div></td></tr>; })}</tbody></table></div>
    </section>

    <section className="soft-card rounded-[1.15rem] p-5">
      <h2 className="font-bold text-[#28483f]">Terms</h2>
      <p className="mt-2 text-sm text-[#718077]">Terms are stored against an academic year and can be edited without changing historical marks.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <label className="text-xs font-bold text-[#53675d]">Academic year<select value={termYearId} onChange={e => setTermYearId(Number(e.target.value))} className={input}><option value={0}>Select year</option>{years.map(row => <option key={row.id} value={row.id}>{row.year}</option>)}</select></label>
        <label className="text-xs font-bold text-[#53675d]">Term<select value={termName} onChange={e => setTermName(e.target.value as typeof termName)} className={input}><option>Term 1</option><option>Term 2</option><option>Term 3</option></select></label>
        <label className="text-xs font-bold text-[#53675d]">Starts<input type="date" value={termStarts} onChange={e => setTermStarts(e.target.value)} className={input}/></label>
        <label className="text-xs font-bold text-[#53675d]">Ends<input type="date" value={termEnds} onChange={e => setTermEnds(e.target.value)} className={input}/></label>
        <label className="flex items-center gap-2 self-end rounded-lg border border-[#d8ded7] bg-[#fbfaf5] px-3 py-2 text-xs font-bold text-[#53675d]"><input type="checkbox" checked={termActive} onChange={e => setTermActive(e.target.checked)}/>Active term</label>
        <div className="flex gap-2 self-end"><button className="action-button justify-center" disabled={!termYearId || !termStarts || !termEnds || saveTerm.isPending} onClick={() => saveTerm.mutate({ id: editingTermId ?? undefined, academicYearId: termYearId, name: termName, startsOn: termStarts, endsOn: termEnds, isActive: termActive })}>{editingTermId ? "Save changes" : "Save term"}</button>{editingTermId && <button type="button" className="quiet-button" onClick={() => { setEditingTermId(null); setTermYearId(0); setTermStarts(""); setTermEnds(""); }}>Cancel</button>}</div>
      </div>
      <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[620px] text-left text-xs"><thead className="bg-[#edf2ed]"><tr><th className="p-2">Term</th><th className="p-2">Academic year</th><th className="p-2">Dates</th><th className="p-2">Status</th><th className="p-2">Actions</th></tr></thead><tbody>{structure.data?.terms.map(row => <tr key={row.id} className="border-t border-[#eee9df]"><td className="p-2 font-bold">{row.name}</td><td className="p-2">{yearForTerm(row.academicYearId)}</td><td className="p-2">{String(row.startsOn).slice(0, 10)} – {String(row.endsOn).slice(0, 10)}</td><td className="p-2">{row.isActive ? "Active" : "Inactive"}</td><td className="p-2"><div className="flex gap-2"><button type="button" className="quiet-button" onClick={() => { setEditingTermId(row.id); setTermYearId(row.academicYearId); setTermName(row.name as typeof termName); setTermStarts(String(row.startsOn).slice(0, 10)); setTermEnds(String(row.endsOn).slice(0, 10)); setTermActive(Boolean(row.isActive)); }}>Edit</button><button type="button" className="quiet-button text-[#9c4038]" disabled={deleteTerm.isPending} onClick={() => window.confirm(`Delete ${row.name} for ${yearForTerm(row.academicYearId)}?`) && deleteTerm.mutate({ termId: row.id })}>Delete</button></div></td></tr>)}</tbody></table>{!structure.isLoading && !structure.data?.terms.length && <p className="mt-3 rounded-lg border border-dashed border-[#cbd8cc] p-3 text-xs text-[#718077]">No terms created yet.</p>}</div>
    </section>

    <section className="soft-card rounded-[1.15rem] p-5">
      <h2 className="font-bold text-[#28483f]">End-of-year rollover</h2>
      <p className="mt-2 text-sm leading-6 text-[#718077]">ECDE progresses PP1 → PP2 → Grade 1. Grades 1–8 advance one grade. Grade 9 is held as pending action until the school configures an approved Senior School destination. Missing grades or streams never create invalid enrolments.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <label className="text-xs font-bold text-[#53675d]">From year<select value={fromYear} onChange={e => setFromYear(Number(e.target.value))} className={input}><option value="">Select year</option>{years.map(row => <option key={row.id} value={row.year}>{row.year}{row.isCurrent ? " · Current" : ""}</option>)}</select></label>
        <label className="text-xs font-bold text-[#53675d]">To year<select value={toYear} onChange={e => setToYear(Number(e.target.value))} className={input}><option value="">Select year</option>{years.map(row => <option key={row.id} value={row.year}>{row.year}</option>)}</select></label>
        <button className="action-button self-end justify-center" disabled={!fromYear || !toYear || preview.isPending} onClick={() => preview.mutate({ fromYear, toYear })}>{preview.isPending ? "Preparing…" : "Preview rollover"}</button>
      </div>
      {runId && <div className="mt-5 rounded-xl border border-[#d8ded7] bg-[#fffefa] p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-bold text-[#28483f]">Preview run #{runId}</p><p className="text-xs text-[#718077]">Review exceptions before approving. Approval is idempotent and reversible.</p></div><div className="flex gap-2"><button disabled={approve.isPending || approvedRun} className="action-button" onClick={() => approve.mutate({ runId })}><CheckCircle2 size={15}/>Approve ready learners</button><button disabled={!approvedRun || reverse.isPending} className="quiet-button" onClick={() => reverse.mutate({ runId })}><RotateCcw size={15}/>Reverse</button></div></div><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead className="bg-[#edf2ed]"><tr><th className="p-2">Learner</th><th className="p-2">Current grade</th><th className="p-2">Destination</th><th className="p-2">Status</th><th className="p-2">Reason</th><th className="p-2">Action</th></tr></thead><tbody>{items.data?.map(row => <tr key={row.item.id} className="border-t border-[#eee9df]"><td className="p-2 font-semibold">{row.learner.fullName}</td><td className="p-2">{row.fromGrade.name}</td><td className="p-2">{row.toGrade?.name ?? "—"}</td><td className="p-2 capitalize">{row.item.status.replaceAll("_", " ")}</td><td className="p-2 text-[#9c4038]">{row.item.reason ?? "Ready"}</td><td className="p-2">{row.item.status === "pending_action" && <button className="quiet-button whitespace-nowrap" disabled={exclude.isPending || approvedRun} onClick={() => exclude.mutate({ runId, itemId: row.item.id, reason: "Excluded during rollover review" })}>Exclude</button>}</td></tr>)}</tbody></table></div></div>}
    </section>
  </div>;
}
