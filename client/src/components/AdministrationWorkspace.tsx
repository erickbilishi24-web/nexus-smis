import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ClipboardCopy, History, KeyRound, Lock, LockOpen, MoreHorizontal, Pencil, Plus, RefreshCw, Search, ShieldCheck, ReceiptText, ShieldOff, UserCheck, UserCog, UserPlus, Users, Trash2, Eye, School } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { WorkspaceBreadcrumbs } from "@/components/WorkspaceBreadcrumbs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ResourceHubWorkspace } from "@/components/ResourceHubWorkspace";
import { CommentBankAdminPanel } from "@/components/CommentBankAdminPanel";
import { TeacherAttendanceRegister } from "@/components/TeacherAttendanceRegister";
import { KENYA_COUNTIES, KENYA_LOCATIONS } from "@/data/kenyaLocations";

import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/routers";
type Out = inferRouterOutputs<AppRouter>["smis"]["administration"];
type Row = Out["list"][number];
type Catalog = Out["catalog"];
type Role = "super_admin" | "admin" | "teacher" | "senior_teacher" | "class_teacher" | "deputy_head" | "head_teacher" | "exam_council" | "finance" | "other";
type Alloc = { gradeId: number; subjectId: number };

const field = "mt-1 w-full rounded-lg border border-[#d8ddd4] bg-[#fffefa] px-3 py-2 text-sm text-[#28483f] outline-none focus:border-[#1d6a57]";
const label = "block text-xs font-bold uppercase tracking-wide text-[#718077]";
const ghost = "inline-flex items-center gap-1.5 rounded-lg border border-[#d8ddd4] bg-[#fffefa] px-3 py-2 text-xs font-bold text-[#28483f] hover:bg-[#f1f4ec]";
const fmt = (d?: Date | string | null, time = true) => !d ? "—" : new Date(d).toLocaleString("en-KE", time ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" });
const errText = (m: string) => m.replaceAll("_", " ").toLowerCase().replace(/^./, c => c.toUpperCase());
const STATUS: Record<string, string> = { active: "bg-[#e6f0e7] text-[#1d6a57]", suspended: "bg-[#f7ecd5] text-[#9a6c19]", locked: "bg-[#f6dfdb] text-[#a3382c]", pending: "bg-[#e8edf3] text-[#486074]" };

function StatusPill({ status }: { status: string }) { return <span className={`inline-flex rounded-full px-2.5 py-1 text-[0.68rem] font-bold capitalize ${STATUS[status]}`}>{status}</span>; }

function AllocationEditor({ value, onChange, catalog }: { value: Alloc[]; onChange: (v: Alloc[]) => void; catalog: Catalog }) {
  return <div className="space-y-2">
    {value.map((row, i) => <div key={i} className="flex gap-2">
      <select className={field} value={row.gradeId} onChange={e => onChange(value.map((r, j) => j === i ? { ...r, gradeId: Number(e.target.value) } : r))}>{catalog.grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
      <select className={field} value={row.subjectId} onChange={e => onChange(value.map((r, j) => j === i ? { ...r, subjectId: Number(e.target.value) } : r))}>{catalog.subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
      <button type="button" aria-label="Remove subject" className={ghost} onClick={() => onChange(value.filter((_, j) => j !== i))}><Trash2 size={14} /></button>
    </div>)}
    <button type="button" className={ghost} disabled={!catalog.grades.length || !catalog.subjects.length} onClick={() => onChange([...value, { gradeId: catalog.grades[0].id, subjectId: catalog.subjects[0].id }])}><Plus size={14} />Add subject and class</button>
  </div>;
}

function ClassesStreamsPanel({ catalog }: { catalog: Catalog }) {
  const utils = trpc.useUtils();
  const [name, setName] = useState("");
  const [stream, setStream] = useState("");
  const [editing, setEditing] = useState<number | null>(null);
  const refresh = () => { void utils.smis.administration.catalog.invalidate(); void utils.smis.people.catalog.invalidate(); void utils.smis.allocations.catalog.invalidate(); };
  const create = trpc.smis.settings.createGrade.useMutation({ onSuccess: () => { toast.success("Class and stream created"); setName(""); setStream(""); refresh(); }, onError: e => toast.error(errText(e.message)) });
  const update = trpc.smis.settings.updateGrade.useMutation({ onSuccess: () => { toast.success("Class and stream updated"); setEditing(null); setName(""); setStream(""); refresh(); }, onError: e => toast.error(errText(e.message)) });
  const remove = trpc.smis.settings.deleteGrade.useMutation({ onSuccess: () => { toast.success("Class deleted"); refresh(); }, onError: e => toast.error(errText(e.message)) });
  const submit = (event: React.FormEvent) => { event.preventDefault(); if (!name.trim()) return; const payload = { name: name.trim(), stream: stream.trim() || null }; if (editing) update.mutate({ id: editing, ...payload }); else create.mutate(payload); };
  return <div className="space-y-5 p-5">
    <div><p className="eyebrow">Academic structure</p><h2 className="mt-1 text-lg font-bold text-[#28483f]">Classes & Streams</h2><p className="mt-1 max-w-2xl text-xs leading-5 text-[#718077]">Create and maintain exact class options used by learner enrolment, imports, attendance, reports and teacher allocation.</p></div>
    <form onSubmit={submit} className="grid gap-3 rounded-xl border border-[#d8ddd4] bg-[#fbfaf5] p-4 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end"><label className={label}>Grade / class name<Input required value={name} onChange={e => setName(e.target.value)} placeholder="Grade 7" className="mt-1" /></label><label className={label}>Stream <span className="font-normal normal-case">(optional)</span><Input value={stream} onChange={e => setStream(e.target.value)} placeholder="Blue" className="mt-1" /></label><button className="action-button justify-center" disabled={create.isPending || update.isPending}><Plus size={15} />{editing ? "Save class" : "Create class"}</button>{editing && <button type="button" className={ghost} onClick={() => { setEditing(null); setName(""); setStream(""); }}>Cancel</button>}</form>
    <div><p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#718077]">Existing classes · {catalog.grades.length}</p><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{catalog.grades.map(g => <div key={g.id} className="flex items-center justify-between rounded-lg border border-[#d8ddd4] bg-[#fffefa] px-3 py-2"><span className="text-xs font-bold text-[#1d6a57]">{g.name}{g.stream ? ` · ${g.stream}` : ""}</span><span className="flex gap-1"><button type="button" className={ghost} aria-label={`Edit ${g.name} ${g.stream ?? ""}`} onClick={() => { setEditing(g.id); setName(g.baseName); setStream(g.stream ?? ""); }}><Pencil size={13} /></button><button type="button" className={`${ghost} text-[#9c4038]`} aria-label={`Delete ${g.name} ${g.stream ?? ""}`} onClick={() => { if (window.confirm(`Delete ${g.name}${g.stream ? ` ${g.stream}` : ""}? Classes with learners or linked records must be reassigned first.`)) remove.mutate({ id: g.id }); }} disabled={remove.isPending}><Trash2 size={13} /></button></span></div>)}</div></div>
  </div>;
}
export function SchoolRegistryPanel({ isSuper }: { isSuper: boolean }) {
  const utils = trpc.useUtils();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [county, setCounty] = useState("");
  const [subcounty, setSubcounty] = useState("");
  const [headInstitutionName, setHeadInstitutionName] = useState("");
  const [status, setStatus] = useState<"active" | "pending_activation">("active");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingCode, setEditingCode] = useState("");
  const [editingName, setEditingName] = useState("");
  const [editingCounty, setEditingCounty] = useState("");
  const [editingSubcounty, setEditingSubcounty] = useState("");
  const [editingHead, setEditingHead] = useState("");
  const [editingSnapshot, setEditingSnapshot] = useState("");
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const catalog = trpc.smis.administration.catalog.useQuery();
  const publicAppUrl = catalog.data?.publicAppUrl ?? window.location.origin;
  const schoolLoginUrl = (schoolCode: string) => `${publicAppUrl}/school/${encodeURIComponent(schoolCode)}/login`;
  const schools = trpc.smis.administration.schools.useQuery();
  const schoolTeachers = trpc.smis.administration.schoolTeachers.useQuery({ schoolId: editingId ?? 1 }, { enabled: Boolean(editingId) });
  const schoolCodeHistory = trpc.smis.administration.schoolCodeHistory.useQuery(undefined, { enabled: isSuper });
  const refreshSchools = async (showToast = true) => { await Promise.all([schools.refetch(), catalog.refetch()]); if (showToast) toast.success("School list and dropdown refreshed"); };
  const update = trpc.smis.administration.updateSchool.useMutation({ onSuccess: async (result) => { const newLoginLink = schoolLoginUrl(result.schoolCode); if (result.previousSchoolCode !== result.schoolCode) toast.success("School code updated", { action: { label: "Copy new login link", onClick: () => void navigator.clipboard.writeText(newLoginLink).then(() => toast.success("New school login link copied")) } }); else toast.success("School details updated"); setEditingId(null); void utils.smis.administration.invalidate(); void schoolCodeHistory.refetch(); await refreshSchools(false); }, onError: e => toast.error(errText(e.message)) });
  const lifecycle = trpc.smis.administration.setSchoolStatus.useMutation({ onSuccess: async result => { void utils.smis.administration.invalidate(); await refreshSchools(false); toast.success(`School ${result.status}`); }, onError: e => toast.error(errText(e.message)) });
  const create = trpc.smis.administration.createSchool.useMutation({
    onSuccess: async () => {
      setCode(""); setName(""); setCounty(""); setSubcounty(""); setHeadInstitutionName("");
      void utils.smis.administration.invalidate(); await refreshSchools(false);
      toast.success("School registered and added to the list");
    },
    onError: e => toast.error(errText(e.message)),
  });
  const beginEdit = (school: NonNullable<typeof schools.data>[number]) => {
    const values = { code: school.schoolCode, name: school.schoolName, county: school.county ?? "", subcounty: school.subcounty ?? "", head: school.headInstitutionName ?? "" };
    setEditingId(school.id); setEditingCode(values.code); setEditingName(values.name); setEditingCounty(values.county); setEditingSubcounty(values.subcounty); setEditingHead(values.head); setEditingSnapshot(JSON.stringify(values));
    window.setTimeout(() => document.getElementById("school-registry-editor")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };
  const editingIsDirty = Boolean(editingId) && editingSnapshot !== JSON.stringify({ code: editingCode, name: editingName, county: editingCounty, subcounty: editingSubcounty, head: editingHead });
  const requestCancelEdit = () => { if (!editingIsDirty || window.confirm("You have unsaved school changes. Cancel and discard them?")) { setEditingId(null); setConfirmSaveOpen(false); } };
  const saveEdit = (schoolId: number) => update.mutate({ schoolId, schoolCode: editingCode.trim().toUpperCase(), schoolName: editingName.trim(), county: editingCounty || null, subcounty: editingSubcounty || null, headInstitutionName: editingHead || null });
  useEffect(() => {
    if (!editingId) return;
    const warnBeforeLeave = (event: BeforeUnloadEvent) => { if (editingIsDirty) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", warnBeforeLeave);
    return () => window.removeEventListener("beforeunload", warnBeforeLeave);
  }, [editingId, editingIsDirty]);
  const schoolFields = (school: NonNullable<typeof schools.data>[number]) => <div className="space-y-1"><p className="font-semibold text-[#28483f]">{school.schoolName}</p><p className="text-xs text-[#718077]">{school.county || "County not set"} · {school.subcounty || "Subcounty not set"}</p><p className="text-xs text-[#718077]">Head: {school.headInstitutionName || "Not set"}</p></div>;

  return <div className="space-y-5 p-3 sm:p-5">
    <div>
      <p className="eyebrow">Platform tenancy</p><h2 className="mt-1 text-lg font-bold text-[#28483f]">School registry</h2>
      <p className="mt-1 max-w-2xl text-xs leading-5 text-[#718077]">{isSuper ? "Register and review customer schools. School administrators and their users are kept inside their assigned school; the Platform Super Admin remains cross-school." : "Review the school assigned to your account. School administrators cannot view or register other schools."}</p>
    </div>
    {isSuper && editingId && <form id="school-registry-editor" onSubmit={e => { e.preventDefault(); setConfirmSaveOpen(true); }} className="scroll-mt-4 space-y-4 rounded-xl border-2 border-[#1d6a57] bg-[#f3f8f3] p-3 shadow-sm sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="eyebrow">Editing school details</p><h3 className="mt-1 text-base font-bold text-[#28483f]">Update the selected school</h3><p className="mt-1 text-xs text-[#718077]">All school details are editable. Changing the code also changes the school login link, so confirm the new code carefully.</p></div><button type="button" className={ghost} onClick={requestCancelEdit}>Cancel editing</button></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><label className={label}>School code<Input required value={editingCode} onChange={e => setEditingCode(e.target.value.toUpperCase())} placeholder="SCHOOL-001" /></label><label className={label}>School name<Input required value={editingName} onChange={e => setEditingName(e.target.value)} placeholder="School name" /></label><label className={label}>County<select className={field} value={editingCounty} onChange={e => { setEditingCounty(e.target.value); setEditingSubcounty(""); }}><option value="">Select county</option>{KENYA_COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}</select></label><label className={label}>Subcounty<select className={field} value={editingSubcounty} onChange={e => setEditingSubcounty(e.target.value)} disabled={!editingCounty}><option value="">{editingCounty ? `Select subcounty in ${editingCounty}` : "Select county first"}</option>{(KENYA_LOCATIONS[editingCounty] ?? []).map(sc => <option key={sc} value={sc}>{sc}</option>)}</select></label><label className={label}>Head of Institution<input className={field} list={`school-teachers-${editingId}`} value={editingHead} onChange={e => setEditingHead(e.target.value)} placeholder="Type to search teachers" /><datalist id={`school-teachers-${editingId}`}>{schoolTeachers.data?.map(t => <option key={t.userId} value={t.name ?? t.username ?? ""}>{t.role}</option>)}</datalist></label></div>
      {!schoolTeachers.isLoading && !schoolTeachers.data?.length && <p className="text-xs text-[#9a6c19]">No active registered teachers were found for this school. Register staff under People first, then return here.</p>}
      <div className="flex justify-end border-t border-[#cbd8cc] pt-3"><button type="submit" className="action-button" disabled={update.isPending || !editingName.trim()}>{update.isPending ? "Saving…" : "Save changes"}</button></div>
    </form>}
    <Dialog open={confirmSaveOpen} onOpenChange={setConfirmSaveOpen}><DialogContent><DialogHeader><DialogTitle>Confirm school changes</DialogTitle><DialogDescription>Save the updated school details?</DialogDescription>{editingId && editingCode.trim().toUpperCase() !== (schools.data?.find(s => s.id === editingId)?.schoolCode ?? "") && <div className="rounded-lg border border-[#e5bd63] bg-[#fff7df] p-3 text-xs leading-5 text-[#765512]"><b>Warning: the school code is changing.</b><p className="mt-1">Old login: <span className="break-all">{schoolLoginUrl(schools.data?.find(s => s.id === editingId)?.schoolCode ?? "")}</span></p><p>New login: <span className="break-all">{schoolLoginUrl(editingCode.trim().toUpperCase())}</span></p></div>}</DialogHeader><DialogFooter><button type="button" className={ghost} onClick={() => setConfirmSaveOpen(false)}>Cancel</button><button type="button" className="action-button" onClick={() => { if (editingId) saveEdit(editingId); setConfirmSaveOpen(false); }}>Confirm and save</button></DialogFooter></DialogContent></Dialog>
    {isSuper ? <form onSubmit={e => { e.preventDefault(); create.mutate({ schoolCode: code, schoolName: name, county: county || null, subcounty: subcounty || null, headInstitutionName: headInstitutionName || null, status }); }} className="space-y-4 rounded-xl border border-[#d8ddd4] bg-[#fbfaf5] p-3 sm:p-4">
      <div className="border-b border-[#e4e8df] pb-3"><p className="text-xs font-bold uppercase tracking-wide text-[#28483f]">1. School identity</p><div className="mt-3 grid gap-3 sm:grid-cols-[minmax(12rem,.8fr)_minmax(16rem,1.5fr)_minmax(10rem,.7fr)]"><label className={label}>School code<Input required value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="SCHOOL-001" className="mt-1" /></label><label className={label}>School name<Input required value={name} onChange={e => setName(e.target.value)} placeholder="Ebunangwe Junior School" className="mt-1" /></label><label className={label}>Status<select className={field} value={status} onChange={e => setStatus(e.target.value as typeof status)}><option value="active">Active</option><option value="pending_activation">Pending</option></select></label></div></div>
      <div className="border-b border-[#e4e8df] pb-3"><p className="text-xs font-bold uppercase tracking-wide text-[#28483f]">2. School location</p><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className={label}>County<select className={field} value={county} onChange={e => { setCounty(e.target.value); setSubcounty(""); }}><option value="">Select county</option>{KENYA_COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}</select></label><label className={label}>Subcounty<select className={field} value={subcounty} onChange={e => setSubcounty(e.target.value)} disabled={!county}><option value="">{county ? `Select subcounty in ${county}` : "Select county first"}</option>{(KENYA_LOCATIONS[county] ?? []).map(sc => <option key={sc} value={sc}>{sc}</option>)}</select></label></div><p className="mt-2 text-[.7rem] text-[#718077]">Select a county first; the Subcounty list will then show only locations within <b>{county || "the selected county"}</b>.</p></div>
      <div><p className="text-xs font-bold uppercase tracking-wide text-[#28483f]">3. School leadership</p><div className="mt-3 grid gap-3 sm:grid-cols-[minmax(15rem,1fr)_minmax(15rem,1fr)]"><label className={label}>Head of Institution<select className={field} value={headInstitutionName} disabled><option value="">Select after registration</option></select></label><p className="self-end rounded-lg border border-dashed border-[#cbd8cc] bg-[#f5f8f2] p-3 text-[.7rem] leading-5 text-[#718077]">After registering this school, click <b>Edit</b> beside it to choose one of its registered teachers as Head of Institution.</p></div></div>
      <div className="flex flex-col gap-3 border-t border-[#e4e8df] pt-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-[.7rem] leading-5 text-[#718077]"><b>Required sequence:</b> identity → location → register → edit to select the registered Head of Institution.</p><button className="action-button justify-center" disabled={create.isPending}><Plus size={15} />Register school</button></div>
    </form> : <p role="note" className="rounded-xl border border-[#d8ddd4] bg-[#fbfaf5] p-4 text-xs leading-5 text-[#718077]">This view is limited to your assigned school. Only a Platform Super Administrator can register schools or view other schools.</p>}
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs font-bold uppercase tracking-wide text-[#718077]">Registered schools · {schools.data?.length ?? 0}</p><button type="button" className={ghost} onClick={() => void refreshSchools()} disabled={schools.isFetching} aria-label="Refresh school registry" title="Reload the latest school list"><RefreshCw size={14} className={schools.isFetching ? "animate-spin motion-reduce:animate-none" : ""} />{schools.isFetching ? "Refreshing…" : "Refresh"}</button></div>
    <div className="hidden overflow-x-auto lg:block"><table className="w-full min-w-[780px] text-left text-sm"><thead><tr className="border-b border-[#e2e6dc] text-[.68rem] uppercase tracking-wide text-[#718077]"><th className="px-3 py-3">Code</th><th className="px-3 py-3">School / location</th><th className="px-3 py-3">Head of Institution</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Login link</th><th className="px-3 py-3">Registered</th><th className="px-3 py-3">Actions</th></tr></thead><tbody>{schools.data?.map(s => <tr key={s.id} className="border-b border-[#eef0e8] align-top"><td className="px-3 py-3 font-mono text-xs text-[#1d6a57]">{s.schoolCode}</td><td className="max-w-[260px] px-3 py-3">{schoolFields(s)}</td><td className="px-3 py-3 text-xs text-[#718077]">{editingId === s.id ? "Editing above" : s.headInstitutionName || "Not set"}</td><td className="px-3 py-3"><StatusPill status={s.status === "pending_activation" ? "pending" : s.status} /></td><td className="px-3 py-3"><div className="flex min-w-[190px] items-center gap-2"><span className="truncate text-[.68rem] text-[#718077]">{schoolLoginUrl(s.schoolCode)}</span><button type="button" className={ghost} title="Copy school login link" aria-label={`Copy login link for ${s.schoolName}`} disabled={s.status !== "active"} onClick={() => navigator.clipboard.writeText(schoolLoginUrl(s.schoolCode)).then(() => toast.success("School login link copied"))}><ClipboardCopy size={13} /></button></div></td><td className="px-3 py-3 text-xs text-[#718077]">{fmt(s.createdAt)}</td><td className="sticky right-0 bg-[#fffefa] px-3 py-3 whitespace-nowrap"><div className="flex flex-wrap gap-1">{editingId === s.id ? <span className="inline-flex items-center rounded-lg border border-[#cbd8cc] bg-[#f3f8f3] px-2 py-2 text-[.68rem] font-bold text-[#1d6a57]">Editing above</span> : isSuper ? <><button type="button" className={ghost} onClick={() => beginEdit(s)}>Edit</button>{s.status !== "active" && s.status !== "archived" && <button type="button" className={ghost} onClick={() => lifecycle.mutate({ schoolId: s.id, status: "active" })}>Activate</button>}{s.status === "active" && <button type="button" className={`${ghost} text-[#8c651e]`} onClick={() => lifecycle.mutate({ schoolId: s.id, status: "suspended" })}>Suspend</button>}{s.status !== "archived" && <button type="button" className={`${ghost} text-[#9c4038]`} onClick={() => { if (window.confirm(`Archive ${s.schoolName}? Historical records will be retained and login disabled.`)) lifecycle.mutate({ schoolId: s.id, status: "archived" }); }}>Archive</button>}</> : null}</div></td></tr>)}</tbody></table></div>
    <div className="grid gap-3 lg:hidden">{schools.data?.map(s => <article key={s.id} className="rounded-xl border border-[#d8ddd4] bg-[#fffefa] p-3 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="font-mono text-xs font-bold text-[#1d6a57]">{s.schoolCode}</p>{schoolFields(s)}</div><StatusPill status={s.status === "pending_activation" ? "pending" : s.status} /></div><div className="mt-3 border-t border-[#eef0e8] pt-3"><p className="text-[.68rem] text-[#718077]">Login link</p><div className="mt-1 flex items-center gap-2"><span className="min-w-0 flex-1 truncate text-[.68rem] text-[#718077]">{schoolLoginUrl(s.schoolCode)}</span><button type="button" className={ghost} disabled={s.status !== "active"} onClick={() => navigator.clipboard.writeText(schoolLoginUrl(s.schoolCode)).then(() => toast.success("School login link copied"))}><ClipboardCopy size={13} /></button></div></div><div className="mt-3 flex flex-wrap gap-2">{editingId === s.id ? <span className="inline-flex items-center rounded-lg border border-[#cbd8cc] bg-[#f3f8f3] px-2 py-2 text-[.68rem] font-bold text-[#1d6a57]">Editing above</span> : isSuper && <button type="button" className={ghost} onClick={() => beginEdit(s)}>Edit school details</button>}</div></article>)}{!schools.isLoading && !schools.data?.length && <p className="rounded-xl border border-[#d8ddd4] p-6 text-center text-sm text-[#718077]">{isSuper ? "No schools registered." : "No school is assigned to this account."}</p>}</div>
    {isSuper && <section className="space-y-3 rounded-xl border border-[#d8ddd4] bg-[#fbfaf5] p-3 sm:p-4"><div><p className="eyebrow">Audit history</p><h3 className="mt-1 text-base font-bold text-[#28483f]">School-code changes</h3><p className="mt-1 text-xs text-[#718077]">Super Admin view of previous and current school codes.</p></div>{schoolCodeHistory.isLoading ? <p className="text-xs text-[#718077]">Loading code history…</p> : schoolCodeHistory.data?.length ? <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-xs"><thead><tr className="border-b border-[#e2e6dc] text-[.68rem] uppercase tracking-wide text-[#718077]"><th className="px-2 py-2">School</th><th className="px-2 py-2">Old code</th><th className="px-2 py-2">New code</th><th className="px-2 py-2">Changed by</th><th className="px-2 py-2">Date</th></tr></thead><tbody>{schoolCodeHistory.data.map(row => <tr key={row.id} className="border-b border-[#eef0e8]"><td className="px-2 py-2 font-semibold text-[#28483f]">{row.schoolName}</td><td className="px-2 py-2 font-mono text-[#9c4038]">{row.oldCode}</td><td className="px-2 py-2 font-mono text-[#1d6a57]">{row.newCode}</td><td className="px-2 py-2 text-[#718077]">{row.changedBy}</td><td className="px-2 py-2 text-[#718077]">{fmt(row.changedAt)}</td></tr>)}</tbody></table></div> : <p className="rounded-lg border border-dashed border-[#cbd8cc] p-3 text-xs text-[#718077]">No school-code changes have been recorded yet.</p>}</section>}
  </div>;
}
function CredentialDialog({ link, name, onClose }: { link: { setupToken?: string; expiresAt?: Date | string; temporaryPassword?: string } | null; name: string; onClose: () => void }) {
  const url = link?.setupToken ? `${window.location.origin}/?reset=${link.setupToken}` : "";
  const temporary = link?.temporaryPassword;
  return <Dialog open={!!link} onOpenChange={o => !o && onClose()}><DialogContent>
    <DialogHeader><DialogTitle>{temporary ? `Temporary password · ${name}` : `Password setup link for ${name}`}</DialogTitle><DialogDescription>{temporary ? "This password is shown once only. The user must change it immediately after signing in. It has not been written to the audit trail or logs." : `Share this single-use link through a trusted channel. It expires ${fmt(link?.expiresAt)} and cannot be shown again.`}</DialogDescription></DialogHeader>
    <input readOnly type={temporary ? "text" : "url"} value={temporary ?? url} onFocus={e => e.currentTarget.select()} className={field} />
    <DialogFooter><button className="action-button" onClick={() => { navigator.clipboard.writeText(temporary ?? url).then(() => toast.success(temporary ? "Temporary password copied" : "Setup link copied")); }}><ClipboardCopy size={15} />Copy</button></DialogFooter>
  </DialogContent></Dialog>;
}

function UserDialog({ mode, row, catalog, isSuper, onClose, onLink }: { mode: "create" | "edit" | null; row?: Row; catalog: Catalog; isSuper: boolean; onClose: () => void; onLink: (l: { setupToken: string; expiresAt: Date | string }, name: string) => void }) {
  const utils = trpc.useUtils();
  const [f, setF] = useState(() => ({ fullName: row?.fullName ?? "", username: row?.username ?? "", staffId: row?.staffId ?? "", role: (row?.role === "head_teacher" || row?.role === "deputy_head" ? "admin" : row?.role === "senior_teacher" ? "teacher" : row?.role === "storekeeper" ? "other" : row?.role ?? "teacher") as Role, department: row?.department ?? "", email: row?.email ?? "", phone: row?.phone ?? "", password: "", schoolId: catalog.schools[0]?.id ?? null, classGradeId: 0, subjects: [] as Alloc[], status: "pending_activation" as "active" | "pending_activation" | "disabled" }));
  const done = () => { utils.smis.administration.invalidate(); onClose(); };
  const onError = (e: { message: string }) => toast.error(errText(e.message));
  const create = trpc.smis.administration.create.useMutation({ onSuccess: r => { toast.success("User created with login credentials"); done(); if ("setupToken" in r) onLink(r, f.fullName); }, onError });
  const update = trpc.smis.administration.update.useMutation({ onSuccess: () => { toast.success("User updated"); done(); }, onError });
  const set = (k: string, v: unknown) => setF(p => ({ ...p, [k]: v }));
  const teaching = f.role === "teacher" || f.role === "class_teacher";
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const base = { fullName: f.fullName, username: f.username, staffId: f.staffId, department: f.department || null, email: f.email, phone: f.phone || null };
    if (mode === "edit" && row) update.mutate({ userId: row.userId, ...base, password: isSuper && f.password.trim() ? f.password : null });
    else create.mutate({ ...base, schoolId: isSuper ? f.schoolId : undefined, role: f.role, classGradeId: teaching && f.classGradeId ? f.classGradeId : null, subjectAllocations: teaching ? f.subjects : [], status: f.status, password: mode === "create" && isSuper && f.password ? f.password : null });
  };
  return <Dialog open={!!mode} onOpenChange={o => !o && onClose()}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
    <DialogHeader><DialogTitle>{mode === "edit" ? "Edit user" : "Create user"}</DialogTitle><DialogDescription>{mode === "edit" ? "Update identity and contact details. Role and assignments are changed separately." : isSuper ? "Create the username and password directly. The user must change this password at first login." : "A single-use setup link is generated so the user chooses their own password."}</DialogDescription></DialogHeader>
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2"><label className={label}>Full name</label><Input required value={f.fullName} onChange={e => set("fullName", e.target.value)} className="mt-1" /></div>
      <div><label className={label}>Username</label><Input required value={f.username} onChange={e => set("username", e.target.value.toLowerCase())} className="mt-1" autoComplete="off" /></div>
      {isSuper && <div><label className={label}>{mode === "create" ? "Initial password" : "New password (optional)"}</label><Input required={mode === "create"} minLength={10} type="password" value={f.password} onChange={e => set("password", e.target.value)} placeholder={mode === "create" ? "At least 10 characters with letters and numbers" : "Leave blank to keep the current password"} autoComplete="new-password" className="mt-1" /></div>}
      <div><label className={label}>Staff / Employee ID</label><Input required value={f.staffId} onChange={e => set("staffId", e.target.value)} className="mt-1" /></div>
      <div><label className={label}>Department</label><Input list="departments" value={f.department} onChange={e => set("department", e.target.value)} className="mt-1" /><datalist id="departments">{catalog.departments.map(d => <option key={d} value={d} />)}</datalist></div>
      <div><label className={label}>Email</label><Input type="email" value={f.email} onChange={e => set("email", e.target.value)} className="mt-1" /></div>
      <div><label className={label}>Phone</label><Input value={f.phone} onChange={e => set("phone", e.target.value)} className="mt-1" /></div>
      {mode === "create" && <>
        <div><label className={label}>Role</label><select className={field} value={f.role} onChange={e => set("role", e.target.value)}>{catalog.roles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}</select></div>
        <div><label className={label}>Account status</label><select className={field} value={f.status} onChange={e => set("status", e.target.value)}><option value="pending_activation">Pending (until password is set)</option><option value="active">Active</option><option value="disabled">Suspended</option></select></div>
        {isSuper && <div className="sm:col-span-2"><label className={label}>School</label><select className={field} required value={f.schoolId ?? ""} onChange={e => set("schoolId", e.target.value ? Number(e.target.value) : null)}><option value="">— Choose school —</option>{catalog.schools.map(s => <option key={s.id} value={s.id}>{s.schoolName} · {s.schoolCode}</option>)}</select></div>}
        {teaching && <div className="sm:col-span-2"><label className={label}>{f.role === "class_teacher" ? "Class (required)" : "Class teacher of (optional)"}</label><select className={field} value={f.classGradeId} onChange={e => set("classGradeId", Number(e.target.value))}><option value={0}>— None —</option>{catalog.grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></div>}
        {teaching && <div className="sm:col-span-2"><label className={label}>Subjects taught · {catalog.academicYear} {catalog.term}</label><div className="mt-1"><AllocationEditor value={f.subjects} onChange={v => set("subjects", v)} catalog={catalog} /></div></div>}
      </>}
      <DialogFooter className="sm:col-span-2"><button type="button" className={ghost} onClick={onClose}>Cancel</button><button className="action-button" disabled={create.isPending || update.isPending}>{mode === "edit" ? "Save changes" : "Create user"}</button></DialogFooter>
    </form>
  </DialogContent></Dialog>;
}

function RoleDialog({ row, catalog, onClose }: { row: Row | null; catalog: Catalog; onClose: () => void }) {
  const utils = trpc.useUtils(); const [roles, setRoles] = useState<Role[]>(() => (row?.roles ?? [row?.role ?? "teacher"]) as Role[]);
  const m = trpc.smis.administration.setRoles.useMutation({ onSuccess: () => { toast.success("Roles updated"); utils.smis.administration.invalidate(); onClose(); }, onError: e => toast.error(errText(e.message)) });
  const toggle = (role: Role) => setRoles(current => current.includes(role) ? current.filter(value => value !== role) : [...current, role]);
  return <Dialog open={!!row} onOpenChange={o => !o && onClose()}><DialogContent>
    <DialogHeader><DialogTitle>Manage roles · {row?.fullName}</DialogTitle><DialogDescription>Roles are additive. Job designation, class assignment and subject allocations remain separate. Access changes take effect on the user's next request.</DialogDescription></DialogHeader>
    <div className="grid gap-2">{catalog.roles.map(r => <label key={r.value} className="flex items-center gap-3 rounded-lg border border-[#d8ddd4] px-3 py-2 text-sm"><input type="checkbox" checked={roles.includes(r.value as Role)} onChange={() => toggle(r.value as Role)} />{r.label}</label>)}</div>
    <DialogFooter><button className={ghost} onClick={onClose}>Cancel</button><button className="action-button" disabled={m.isPending || !roles.length} onClick={() => row && m.mutate({ userId: row.userId, roles })}>Save roles</button></DialogFooter>
  </DialogContent></Dialog>;
}

function AssignmentDialog({ row, catalog, onClose }: { row: Row | null; catalog: Catalog; onClose: () => void }) {
  const utils = trpc.useUtils();
  const [cls, setCls] = useState(row?.classes[0]?.gradeId ?? 0);
  const [subs, setSubs] = useState<Alloc[]>(() => row?.subjects.map(s => ({ gradeId: s.gradeId, subjectId: catalog.subjects.find(x => s.name.startsWith(x.name))?.id ?? catalog.subjects[0]?.id ?? 0 })) ?? []);
  const m = trpc.smis.administration.changeAssignment.useMutation({ onSuccess: () => { toast.success("Assignment updated"); utils.smis.administration.invalidate(); onClose(); }, onError: e => toast.error(errText(e.message)) });
  return <Dialog open={!!row} onOpenChange={o => !o && onClose()}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
    <DialogHeader><DialogTitle>Change assignment · {row?.fullName}</DialogTitle><DialogDescription>Replaces this user's allocations for {catalog.academicYear} {catalog.term}. Marks and attendance access follow these allocations.</DialogDescription></DialogHeader>
    <label className={label}>Class teacher of</label><select className={field} value={cls} onChange={e => setCls(Number(e.target.value))}><option value={0}>— None —</option>{catalog.grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
    <label className={label}>Subjects taught</label><AllocationEditor value={subs} onChange={setSubs} catalog={catalog} />
    <DialogFooter><button className={ghost} onClick={onClose}>Cancel</button><button className="action-button" disabled={m.isPending} onClick={() => row && m.mutate({ userId: row.userId, classGradeId: cls || null, subjectAllocations: subs })}>Save assignment</button></DialogFooter>
  </DialogContent></Dialog>;
}

function AuditTable({ filters, page, onPage }: { filters: Record<string, unknown>; page: number; onPage: (n: number) => void }) {
  const q = trpc.smis.administration.audit.useQuery({ ...(filters as object), limit: 25, offset: page * 25 });
  if (q.error) return <p className="p-6 text-sm text-[#a3382c]">{errText(q.error.message)}</p>;
  const total = q.data?.total ?? 0;
  return <div>
    <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead><tr className="border-b border-[#e2e6dc] text-[0.68rem] uppercase tracking-wide text-[#718077]"><th className="px-4 py-3">Date / time</th><th>User</th><th>Action</th><th>Target</th><th>Details</th></tr></thead>
      <tbody>{q.data?.rows.map(r => <tr key={r.id} className="border-b border-[#eef0e8] align-top"><td className="whitespace-nowrap px-4 py-3 text-[#718077]">{fmt(r.at)}</td><td className="font-semibold text-[#28483f]">{r.actor}</td><td><span className="rounded-md bg-[#e6f0e7] px-2 py-1 font-mono text-xs text-[#1d6a57]">{r.action}</span></td><td className="text-[#718077]">{r.target ?? "—"}</td><td className="max-w-[320px] break-words pr-4 text-xs text-[#718077]">{Object.entries(r.details).map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`).join(" · ") || "—"}</td></tr>)}
        {!q.isLoading && !q.data?.rows.length && <tr><td colSpan={5} className="px-4 py-10 text-center text-[#718077]">No audit events match these filters.</td></tr>}</tbody></table></div>
    <div className="flex items-center justify-between px-4 py-3 text-xs text-[#718077]"><span>{total} event{total === 1 ? "" : "s"}</span><div className="flex gap-2"><button className={ghost} disabled={page === 0} onClick={() => onPage(page - 1)}>Previous</button><button className={ghost} disabled={(page + 1) * 25 >= total} onClick={() => onPage(page + 1)}>Next</button></div></div>
  </div>;
}

function AuditFilters({ value, onChange, withUser }: { value: Record<string, string>; onChange: (v: Record<string, string>) => void; withUser?: boolean }) {
  const users = trpc.smis.administration.list.useQuery(undefined, { enabled: !!withUser }); const modules = trpc.smis.administration.auditModules.useQuery();
  const set = (k: string, v: string) => onChange({ ...value, [k]: v });
  return <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
    {withUser && <div><label className={label}>User</label><select className={field} value={value.userId ?? ""} onChange={e => set("userId", e.target.value)}><option value="">All users</option>{users.data?.map(u => <option key={u.userId} value={u.userId}>{u.fullName}</option>)}</select></div>}
    <div><label className={label}>Module</label><select className={field} value={value.module ?? ""} onChange={e => set("module", e.target.value)}><option value="">All modules</option>{modules.data?.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}</select></div>
    <div><label className={label}>Action</label><Input value={value.action ?? ""} onChange={e => set("action", e.target.value)} placeholder="e.g. role.change" className="mt-1" /></div>
    <div><label className={label}>From</label><Input type="date" value={value.from ?? ""} onChange={e => set("from", e.target.value)} className="mt-1" /></div>
    <div><label className={label}>To</label><Input type="date" value={value.to ?? ""} onChange={e => set("to", e.target.value)} className="mt-1" /></div>
  </div>;
}
const toQuery = (v: Record<string, string>) => Object.fromEntries(Object.entries(v).filter(([, x]) => x).map(([k, x]) => [k, k === "userId" ? Number(x) : x]));

function ActivitySheet({ row, onClose }: { row: Row | null; onClose: () => void }) {
  const [f, setF] = useState<Record<string, string>>({}); const [page, setPage] = useState(0);
  return <Sheet open={!!row} onOpenChange={o => !o && onClose()}><SheetContent className="w-full overflow-y-auto sm:max-w-3xl">
    <SheetHeader><SheetTitle>Activity · {row?.fullName}</SheetTitle><SheetDescription>Actions performed by this user and administrative actions taken on their account.</SheetDescription></SheetHeader>
    {row && <><AuditFilters value={f} onChange={v => { setF(v); setPage(0); }} /><AuditTable filters={{ userId: row.userId, ...toQuery(f) }} page={page} onPage={setPage} /></>}
  </SheetContent></Sheet>;
}

function MatrixTab({ users, isSuper }: { users: Row[]; isSuper: boolean }) {
  const utils = trpc.useUtils(); const [subject, setSubject] = useState("role:teacher");
  const arg = subject.startsWith("user:") ? { userId: Number(subject.slice(5)) } : { role: subject.slice(5) };
  const q = trpc.smis.administration.matrix.useQuery(arg);
  const refresh = () => utils.smis.administration.matrix.invalidate();
  const onError = (e: { message: string }) => toast.error(errText(e.message));
  const roleSet = trpc.smis.administration.setRolePermission.useMutation({ onSuccess: refresh, onError });
  const userSet = trpc.smis.administration.setUserPermission.useMutation({ onSuccess: refresh, onError });
  const d = q.data; const granted = new Set(d?.granted); const inherited = new Set(d?.inherited);
  const toggle = (key: string) => {
    if (!d || d.subject.locked || !isSuper) return;
    const next = !granted.has(key);
    if (d.subject.type === "role") roleSet.mutate({ role: d.subject.role, permissionKey: key, allowed: next });
    else userSet.mutate({ userId: d.subject.userId, permissionKey: key, allowed: next === inherited.has(key) ? null : next });
  };
  const roleLabel = Object.fromEntries((d?.roles ?? []).map(r => [r.value, r.label]));
  return <div>
    <div className="flex flex-wrap items-end gap-4 p-4">
      <div className="min-w-[260px]"><label className={label}>Configure permissions for</label><select className={field} value={subject} onChange={e => setSubject(e.target.value)}>
        <optgroup label="Roles">{(d?.roles ?? [{ value: "teacher", label: "Teacher" }]).map(r => <option key={r.value} value={`role:${r.value}`}>{r.label}</option>)}</optgroup>
        <optgroup label="Individual users">{users.map(u => <option key={u.userId} value={`user:${u.userId}`}>{u.fullName} · {u.roleLabel}</option>)}</optgroup></select></div>
      <p className="max-w-xl text-xs leading-5 text-[#718077]">{!isSuper ? "Only a Super Administrator can change permissions. This matrix shows what is currently granted." : d?.subject.locked ? "Super Administrator access is fixed and always complete." : d?.subject.type === "role" ? `Changes apply to every ${roleLabel[d.subject.role] ?? "user"}. Scope (allocated classes and subjects) still limits what each person can reach.` : "Overrides apply to this user only, on top of their role. Click a cell to override; click again to return to the role default."}</p>
    </div>
    <div className="overflow-x-auto"><table className="w-full table-fixed text-xs sm:text-sm"><thead><tr className="border-y border-[#e2e6dc] text-[0.68rem] uppercase tracking-wide text-[#718077]"><th className="px-4 py-3 text-left">Module</th>{d?.actions.map(a => <th key={a} className="px-2 text-center">{a}</th>)}</tr></thead>
      <tbody>{d?.modules.map(m => <tr key={m.key} className="border-b border-[#eef0e8]"><td className="px-4 py-3 font-semibold text-[#28483f]">{m.label}</td>{d.actions.map(a => {
        const key = `${m.key}.${a}`; const on = granted.has(key); const overridden = d.subject.type === "user" && !d.subject.locked && on !== inherited.has(key);
        return <td key={a} className="px-2 text-center"><button role="switch" aria-checked={on} aria-label={`${m.label} ${a}`} disabled={!isSuper || d.subject.locked} onClick={() => toggle(key)} className={`h-6 w-11 rounded-full p-0.5 transition ${on ? "bg-[#1d6a57]" : "bg-[#cfd6cb]"} ${overridden ? "ring-2 ring-[#e7bd6d]" : ""} disabled:opacity-60`}><span className={`block h-5 w-5 rounded-full bg-white shadow transition ${on ? "translate-x-5" : ""}`} /></button></td>;
      })}</tr>)}</tbody></table></div>
  </div>;
}

function FeeStructuresPanel({ catalog }: { catalog: Catalog }) {
  const utils = trpc.useUtils();
  const fees = trpc.smis.administration.feeStructures.useQuery();
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState({ gradeId: catalog.grades[0]?.id ?? 0, term: "Term 3" as "Term 1" | "Term 2" | "Term 3", academicYear: catalog.academicYear, itemName: "", amount: "" });
  const save = trpc.smis.administration.saveFeeStructure.useMutation({ onSuccess: () => { toast.success(editing ? "Fee item updated" : "Fee item added"); setEditing(null); setForm({ gradeId: catalog.grades[0]?.id ?? 0, term: "Term 3", academicYear: catalog.academicYear, itemName: "", amount: "" }); void utils.smis.administration.feeStructures.invalidate(); }, onError: e => toast.error(errText(e.message)) });
  const remove = trpc.smis.administration.deleteFeeStructure.useMutation({ onSuccess: () => { toast.success("Fee item deleted"); void utils.smis.administration.feeStructures.invalidate(); }, onError: e => toast.error(errText(e.message)) });
  const submit = (e: React.FormEvent) => { e.preventDefault(); if (!form.gradeId || !form.itemName.trim() || Number(form.amount) <= 0) return toast.error("Choose a class and enter a valid fee amount"); save.mutate({ ...form, id: editing ?? undefined, amount: Number(form.amount) }); };
  const beginEdit = (row: any) => { setEditing(row.fee.id); setForm({ gradeId: row.fee.gradeId, term: row.fee.term, academicYear: row.fee.academicYear, itemName: row.fee.itemName, amount: String(row.fee.amount) }); };
  return <div className="space-y-5 p-5"><div><p className="eyebrow">Finance configuration</p><h2 className="mt-1 text-lg font-bold text-[#28483f]">Fee Structures</h2><p className="mt-1 max-w-2xl text-xs leading-5 text-[#718077]">Configure the fees used when generating learner invoices. Items are isolated to the current school.</p></div><form onSubmit={submit} className="grid gap-3 rounded-xl border border-[#d8ddd4] bg-[#fbfaf5] p-4 sm:grid-cols-2 lg:grid-cols-5 lg:items-end"><label className={label}>Class<select className={field} value={form.gradeId} onChange={e => setForm({ ...form, gradeId: Number(e.target.value) })}>{catalog.grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></label><label className={label}>Term<select className={field} value={form.term} onChange={e => setForm({ ...form, term: e.target.value as typeof form.term })}><option>Term 1</option><option>Term 2</option><option>Term 3</option></select></label><label className={label}>Academic year<Input type="number" min={2000} max={2100} value={form.academicYear} onChange={e => setForm({ ...form, academicYear: Number(e.target.value) })} /></label><label className={label}>Fee item<Input required value={form.itemName} onChange={e => setForm({ ...form, itemName: e.target.value })} placeholder="Tuition" /></label><label className={label}>Amount (KES)<Input required type="number" min="0.01" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="18000" /></label><div className="flex gap-2 lg:col-span-5"><button className="action-button" disabled={save.isPending}><Plus size={15} />{editing ? "Save changes" : "Add fee item"}</button>{editing && <button type="button" className={ghost} onClick={() => { setEditing(null); setForm({ ...form, itemName: "", amount: "" }); }}>Cancel</button>}</div></form><div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead><tr className="border-b border-[#e2e6dc] text-[.68rem] uppercase tracking-wide text-[#718077]"><th className="px-3 py-3">Class</th><th>Term</th><th>Year</th><th>Item</th><th>Amount</th><th>Actions</th></tr></thead><tbody>{fees.data?.map((row: any) => <tr key={row.fee.id} className="border-b border-[#eef0e8]"><td className="px-3 py-3 font-semibold text-[#28483f]">{row.grade ? `${row.grade.name}${row.grade.stream ? ` ${row.grade.stream}` : ""}` : "—"}</td><td>{row.fee.term}</td><td>{row.fee.academicYear}</td><td>{row.fee.itemName}</td><td>KES {Number(row.fee.amount).toLocaleString("en-KE", { minimumFractionDigits: 2 })}</td><td><div className="flex gap-2"><button type="button" className={ghost} onClick={() => beginEdit(row)}>Edit</button><button type="button" className={`${ghost} text-[#a3382c]`} onClick={() => window.confirm("Delete this fee item?") && remove.mutate({ feeId: row.fee.id })}>Delete</button></div></td></tr>)}{!fees.isLoading && !fees.data?.length && <tr><td colSpan={6} className="px-3 py-8 text-center text-[#718077]">No fee items configured yet.</td></tr>}</tbody></table></div></div>;
}

type Confirm = { row: Row; action: "activate" | "suspend" | "deactivate" | "lock" | "unlock" } | null;
const CONFIRM_TEXT = { activate: ["Activate account", "The user will be able to sign in again."], suspend: ["Suspend account", "The user is signed out immediately and cannot sign in until reactivated."], deactivate: ["Deactivate account", "The account will be disabled and can be restored later with Activate account. Existing school history is retained."], lock: ["Lock account", "The user is signed out immediately and cannot sign in until unlocked."], unlock: ["Unlock account", "Failed-login counters are cleared and the user can sign in."] } as const;

type AdministrationTab = "users" | "matrix" | "classes" | "comments" | "schools" | "feeStructures" | "audit" | "deletions" | "teacherAttendance";
export function AdministrationWorkspace({ initialTab = "users" }: { initialTab?: AdministrationTab } = {}) {
  const utils = trpc.useUtils();
  const authMe = trpc.auth.me.useQuery();
  const perms = trpc.smis.users.effectivePermissions.useQuery(); const catalogQ = trpc.smis.administration.catalog.useQuery();
  const [tab, setTab] = useState<AdministrationTab>(initialTab);
  const tabLabel = ({ users: "Users & Credentials", matrix: "Permission Matrix", classes: "Classes & Streams", comments: "Report Comments", schools: "School Registry", audit: "Audit Trail", deletions: "Account Deletions", teacherAttendance: "Teacher Attendance", feeStructures: "Fee Structures" } as const)[tab];
  const [f, setF] = useState({ search: "", role: "", status: "" });
  const list = trpc.smis.administration.list.useQuery({ search: f.search || undefined, role: f.role || undefined, status: (f.status || undefined) as any });
  const overview = trpc.smis.administration.overview.useQuery();
  const [dialog, setDialog] = useState<{ mode: "create" | "edit"; row?: Row } | null>(null);
  const [roleRow, setRoleRow] = useState<Row | null>(null); const [assignRow, setAssignRow] = useState<Row | null>(null); const [activityRow, setActivityRow] = useState<Row | null>(null);
  const [viewRow, setViewRow] = useState<Row | null>(null); const [confirm, setConfirm] = useState<Confirm>(null); const [reason, setReason] = useState("");
  const [deleteRow, setDeleteRow] = useState<Row | null>(null); const [deletePhrase, setDeletePhrase] = useState(""); const [deleteError, setDeleteError] = useState("");
  const [link, setLink] = useState<{ link: { setupToken?: string; expiresAt?: Date | string; temporaryPassword?: string }; name: string } | null>(null);
  const [auditF, setAuditF] = useState<Record<string, string>>({}); const [auditPage, setAuditPage] = useState(0);
  const setState = trpc.smis.administration.setState.useMutation({ onSuccess: () => { toast.success("Account updated"); utils.smis.administration.invalidate(); setConfirm(null); setReason(""); }, onError: e => toast.error(errText(e.message)) });
  const reset = trpc.smis.administration.resetPassword.useMutation({ onSuccess: (r, v) => { setLink({ link: r, name: list.data?.find(u => u.userId === v.userId)?.fullName ?? "user" }); toast.success("Temporary password issued; password change required at next login"); }, onError: e => toast.error(errText(e.message)) });
  const deleteUser = trpc.smis.administration.deleteUser.useMutation({ onSuccess: () => { toast.success("Account permanently deleted; school history retained"); void utils.smis.administration.invalidate(); setDeleteRow(null); setDeletePhrase(""); setDeleteError(""); }, onError: e => { const message = errText(e.message); setDeleteError(message); toast.error(message); } });
  const has = (k: string) => !!perms.data && (perms.data.includes("*") || perms.data.includes(k));
  const isSuper = has("administration.manage_permissions");
  const forbidden = list.error?.data?.code === "FORBIDDEN";
  const catalog = catalogQ.data;
  const stats = overview.data;
  const rows = list.data ?? [];
  const deleteIsSelf = !!deleteRow && authMe.data?.id === deleteRow.userId;
  const deleteIsProtected = deleteRow?.role === "super_admin";
  const deletePhraseMatches = !!deleteRow && !deleteIsSelf && !deleteIsProtected && deletePhrase.trim() === (deleteRow.username ?? String(deleteRow.userId));

  if (forbidden) return <div className="page-enter soft-card rounded-[1.1rem] p-10 text-center"><ShieldOff className="mx-auto text-[#a3382c]" size={30} /><h1 className="mt-4 font-editorial text-2xl text-[#28483f]">You do not have access to Administration</h1><p className="mx-auto mt-2 max-w-md text-sm text-[#718077]">Your role does not include user and credential management. Contact a Super Administrator if you believe this is a mistake.</p></div>;

  return <div className="page-enter space-y-6"><WorkspaceBreadcrumbs items={[{ label: "Administration" }, { label: tabLabel }]} />
    <section className="relative overflow-hidden rounded-[1.2rem] bg-[#1c5547] px-5 py-7 text-[#fffefa] sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-5"><div className="max-w-2xl"><p className="eyebrow !text-[#e7bd6d]">Access control</p><h1 className="mt-2 font-editorial text-[2.1rem] leading-[1.05]">Administration</h1><p className="mt-3 text-sm leading-6 text-[#d2e2d9]">Manage staff accounts, roles, permissions and class or subject scope. Every sensitive action is written to the audit trail.</p></div>
        {has("administration.create") && <button className="action-button bg-[#fffefa] text-[#1d6a57] shadow-none" onClick={() => setDialog({ mode: "create" })}><UserPlus size={15} />Create user</button>}</div>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">{[["Accounts", stats?.total], ["Active", stats?.active], ["Pending setup", stats?.pending], ["Suspended", stats?.suspended], ["Locked", stats?.locked]].map(([k, v]) => <div key={String(k)} className="rounded-xl bg-white/10 px-4 py-3"><p className="text-[0.66rem] font-bold uppercase tracking-wider text-[#d2e2d9]">{k}</p><p className="mt-1 text-2xl font-bold">{v ?? "—"}</p></div>)}</div>
    </section>

    <div className="flex flex-wrap gap-2 border-b border-[#d8ddd4]" role="tablist">{([["users", "Users & Credentials", Users], ["matrix", "Permission Matrix", ShieldCheck], ["teacherAttendance", "Teacher Attendance", History], ...(has("settings.edit") ? [["classes", "Classes & Streams", Plus] as const, ["comments", "Report Comments", Pencil] as const, ["feeStructures", "Fee Structures", ReceiptText] as const] : []), ["audit", "Audit Trail", History], ["deletions", "Account Deletions", Trash2]] as const).map(([k, t, Icon]) =>
      <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold ${tab === k ? "border-[#1d6a57] text-[#1d6a57]" : "border-transparent text-[#718077] hover:text-[#28483f]"}`}><Icon size={15} />{t}</button>)}</div>

    <section className="soft-card paper-noise rounded-[1.1rem]">
      {tab === "users" && <>
        <div className="flex flex-wrap gap-3 p-4"><div className="relative min-w-[220px] flex-1"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#718077]" /><Input aria-label="Search users" value={f.search} onChange={e => setF({ ...f, search: e.target.value })} placeholder="Search name, username, staff ID, department" className="pl-9" /></div>
          <select aria-label="Filter by role" className={`${field.replace("w-full", "")} !mt-0 w-auto`} value={f.role} onChange={e => setF({ ...f, role: e.target.value })}><option value="">All roles</option>{catalog?.roles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}</select>
          <select aria-label="Filter by status" className={`${field.replace("w-full", "")} !mt-0 w-auto`} value={f.status} onChange={e => setF({ ...f, status: e.target.value })}><option value="">All statuses</option><option value="active">Active</option><option value="pending">Pending setup</option><option value="suspended">Suspended</option><option value="locked">Locked</option></select></div>
        {isSuper && <p className="mx-4 mb-3 rounded-lg border border-[#d8e6dc] bg-[#f4f9f3] px-3 py-2 text-xs font-semibold text-[#386052]">Super Admin controls are in the Actions column: <b>Edit User</b> and <b className="text-[#a3382c]">Delete</b>. Password reset is inside the ⋯ menu.</p>}
        <div className="overflow-x-auto"><table className="admin-users-table w-full min-w-[1555px] table-fixed text-left text-xs sm:text-sm"><colgroup>{[70, 150, 110, 75, 100, 100, 100, 340, 85, 110, 120, 95, 100].map((width, index) => <col key={index} style={{ width }} />)}</colgroup><thead><tr className="border-y border-[#e2e6dc] text-[0.66rem] uppercase tracking-wide text-[#718077]">{["User ID", "Full name", "Username", "Staff ID", "Role", "Department", "Class", "Subjects", "Status", "Last login", "Password changed", "Created", "Actions"].map(h => <th key={h} className="px-2 py-3">{h}</th>)}</tr></thead>
          <tbody>{rows.map(u => <tr key={u.userId} className="border-b border-[#eef0e8] align-top hover:bg-[#f7f9f3]">
            <td data-label="User ID" className="px-3 py-3 font-mono text-xs text-[#718077]">#{u.userId}</td><td data-label="Full name" className="px-3 py-3 font-bold text-[#28483f]">{u.fullName}</td><td data-label="Username" className="px-3 py-3 text-[#718077]">{u.username ?? "—"}</td><td data-label="Staff ID" className="px-3 py-3 text-[#718077]">{u.staffId ?? "—"}</td>
            <td data-label="Role" className="px-3 py-3"><span className="rounded-md bg-[#f1f4ec] px-2 py-1 text-xs font-bold text-[#28483f]">{u.roleLabel}</span></td><td data-label="Department" className="px-3 py-3 text-[#718077]">{u.department ?? "—"}</td>
            <td data-label="Class" className="px-2 py-3 text-[#718077]">{u.classes.map(c => c.name).join(", ") || "—"}</td><td data-label="Subjects" className="max-w-none break-words px-2 py-3 text-xs text-[#718077]">{u.subjects.map(s => s.name).join(", ") || "—"}</td>
            <td data-label="Status" className="px-3 py-3"><StatusPill status={u.status} /></td><td data-label="Last login" className="whitespace-nowrap px-3 py-3 text-xs text-[#718077]">{u.lastLogin ? fmt(u.lastLogin) : "Never"}</td><td data-label="Password changed" className="whitespace-nowrap px-3 py-3 text-xs text-[#718077]">{u.passwordChangedAt ? fmt(u.passwordChangedAt) : "Not set"}</td><td data-label="Created" className="whitespace-nowrap px-3 py-3 text-xs text-[#718077]">{fmt(u.createdAt, false)}</td>
            <td data-label="Actions" className="admin-user-actions px-2 py-3"><div className="flex flex-wrap items-center justify-end gap-1.5">{<button type="button" onClick={() => setViewRow(u)} className={ghost} title={`View user ${u.fullName}`}><Eye size={14} />View</button>}{isSuper && u.status === "active" && u.role !== "super_admin" && <button type="button" aria-label={`Deactivate account for ${u.fullName}`} title="Reversible deactivation" onClick={() => { setConfirm({ row: u, action: "deactivate" }); setReason(""); }} className="inline-flex items-center gap-1 rounded-lg border border-[#ead9ae] bg-[#fff9ec] px-2 py-2 text-xs font-bold text-[#7b5a17] hover:bg-[#f7edce] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9a6c19]"><ShieldOff size={14} />Deactivate</button>}{isSuper && <button type="button" onClick={() => setDialog({ mode: "edit", row: u })} className={ghost} title={`Edit user ${u.fullName}`}><Pencil size={14} />Edit</button>}{isSuper && <button type="button" aria-label={`Permanently delete account for ${u.fullName}`} title={authMe.data?.id === u.userId ? "You cannot delete the signed-in account" : u.role === "super_admin" ? "Super Administrator accounts are protected" : "Permanently delete account"} disabled={deleteUser.isPending || authMe.data?.id === u.userId || u.role === "super_admin"} onClick={() => { setDeleteRow(u); setDeletePhrase(""); setDeleteError(""); }} className="inline-flex items-center gap-1 rounded-lg border border-[#e6c4bd] bg-[#fff8f6] px-2 py-2 text-xs font-bold text-[#a3382c] hover:bg-[#f6dfdb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a3382c] disabled:cursor-not-allowed disabled:opacity-50"><Trash2 size={14} />Delete</button>}<DropdownMenu><DropdownMenuTrigger asChild><button aria-label={`More actions for ${u.fullName}`} title="More actions" className={ghost}><MoreHorizontal size={15} /><span className="hidden sm:inline">More</span></button></DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56"><DropdownMenuLabel>{u.fullName}</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setViewRow(u)}><Eye size={14} />View</DropdownMenuItem>
                {isSuper && <><DropdownMenuItem onClick={() => setDialog({ mode: "edit", row: u })}><Pencil size={14} />Edit User</DropdownMenuItem><DropdownMenuItem onClick={() => setRoleRow(u)}><UserCog size={14} />Change role</DropdownMenuItem><DropdownMenuItem onClick={() => setAssignRow(u)}><Users size={14} />Change assignment</DropdownMenuItem><>{isSuper && <DropdownMenuItem onClick={() => { if (window.confirm(`Reset ${u.fullName}'s password and revoke all active sessions? The temporary password will be shown once.`)) reset.mutate({ userId: u.userId }); }}><KeyRound size={14} />Reset password</DropdownMenuItem>}</><DropdownMenuSeparator />
                  {(u.status === "suspended") && <DropdownMenuItem onClick={() => setConfirm({ row: u, action: "activate" })}><UserCheck size={14} />Activate account</DropdownMenuItem>}
                  {(u.status === "active" && u.role !== "super_admin") && <DropdownMenuItem onClick={() => setConfirm({ row: u, action: "deactivate" })}><ShieldOff size={14} />Deactivate account</DropdownMenuItem>}
                  {(u.status === "active" || u.status === "suspended") && <DropdownMenuItem onClick={() => setConfirm({ row: u, action: "lock" })}><Lock size={14} />Lock account</DropdownMenuItem>}
                  {u.status === "locked" && <DropdownMenuItem onClick={() => setConfirm({ row: u, action: "unlock" })}><LockOpen size={14} />Unlock account</DropdownMenuItem>}<DropdownMenuSeparator /></>}
                <DropdownMenuItem onClick={() => setActivityRow(u)}><History size={14} />View user activity</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div></td></tr>)}
            {!list.isLoading && !rows.length && <tr><td colSpan={13} className="px-4 py-12 text-center text-[#718077]">No users match your search.</td></tr>}</tbody></table></div></>}
      {tab === "matrix" && <MatrixTab users={rows} isSuper={isSuper} />}
      {tab === "teacherAttendance" && <TeacherAttendanceRegister />}
      {tab === "classes" && catalog && <ClassesStreamsPanel catalog={catalog} />}
      {tab === "comments" && has("settings.edit") && <CommentBankAdminPanel />}
      {tab === "feeStructures" && has("settings.edit") && catalog && <FeeStructuresPanel catalog={catalog} />}
      {tab === "schools" && <SchoolRegistryPanel isSuper={isSuper} />}
      {tab === "audit" && <><AuditFilters withUser value={auditF} onChange={v => { setAuditF(v); setAuditPage(0); }} /><AuditTable filters={toQuery(auditF)} page={auditPage} onPage={setAuditPage} /></>}
      {tab === "deletions" && <><div className="border-b border-[#e2e6dc] px-4 py-4"><h2 className="font-bold text-[#28483f]">Account-deletion audit log</h2><p className="mt-1 text-xs text-[#718077]">Permanent account deletions only. Each entry records the administrator, affected account and timestamp; staff history remains retained.</p></div><AuditTable filters={{ action: "admin.user.delete" }} page={auditPage} onPage={setAuditPage} /></>}
    </section>

    <section aria-label="Resource Hub link management" className="space-y-3"><div><p className="eyebrow">Super Admin configuration</p><h2 className="mt-1 text-lg font-bold text-[#28483f]">Resource Hub links</h2><p className="mt-1 text-xs text-[#718077]">Configure the external TPAD, school website, lesson, virtual lab, KEMIS and KNEC destinations used by your school.</p></div><ResourceHubWorkspace /></section>
    {catalog && dialog && <UserDialog key={dialog.row?.userId ?? "new"} mode={dialog.mode} row={dialog.row} catalog={catalog} isSuper={isSuper} onClose={() => setDialog(null)} onLink={(l, name) => setLink({ link: l, name })} />}
    {catalog && roleRow && <RoleDialog key={roleRow.userId} row={roleRow} catalog={catalog} onClose={() => setRoleRow(null)} />}
    {catalog && assignRow && <AssignmentDialog key={assignRow.userId} row={assignRow} catalog={catalog} onClose={() => setAssignRow(null)} />}
    <ActivitySheet row={activityRow} onClose={() => setActivityRow(null)} />
    <CredentialDialog link={link?.link ?? null} name={link?.name ?? ""} onClose={() => setLink(null)} />
    <Dialog open={!!confirm} onOpenChange={o => !o && setConfirm(null)}><DialogContent>{confirm && <><DialogHeader><DialogTitle>{CONFIRM_TEXT[confirm.action][0]} · {confirm.row.fullName}</DialogTitle><DialogDescription>{CONFIRM_TEXT[confirm.action][1]}</DialogDescription></DialogHeader>
      {(confirm.action === "suspend" || confirm.action === "deactivate" || confirm.action === "lock") && <div><label className={label}>Reason (recorded in the audit trail)</label><Input value={reason} onChange={e => setReason(e.target.value)} className="mt-1" /></div>}
      <DialogFooter><button className={ghost} onClick={() => setConfirm(null)}>Cancel</button><button className="action-button" disabled={setState.isPending} onClick={() => setState.mutate({ userId: confirm.row.userId, action: confirm.action, reason: reason || undefined })}>{CONFIRM_TEXT[confirm.action][0]}</button></DialogFooter></>}</DialogContent></Dialog>
    <Dialog open={!!deleteRow} onOpenChange={open => { if (!open) { setDeleteRow(null); setDeletePhrase(""); setDeleteError(""); } }}><DialogContent>{deleteRow && <><DialogHeader><DialogTitle>Permanently delete account?</DialogTitle><DialogDescription>This cannot be undone. The login account, active sessions, password-reset links, and user-specific permission overrides will be permanently removed. The staff profile and existing school records—including academic, attendance, payroll, finance, and audit history—will be retained; the staff profile will be marked disabled and active class or subject allocations deactivated.</DialogDescription></DialogHeader>
      {deleteIsSelf && <p role="alert" className="rounded-lg border border-[#e6c4bd] bg-[#fff8f6] px-3 py-2 text-sm font-semibold text-[#a3382c]">You cannot permanently delete the account currently signed in. Choose another user account.</p>}
      {deleteIsProtected && <p role="alert" className="rounded-lg border border-[#e7bd6d] bg-[#fff9ec] px-3 py-2 text-sm font-semibold text-[#7b5a17]">Super Administrator accounts are protected and cannot be permanently deleted. Use account management or role-transfer procedures instead.</p>}
      {deleteError && <p role="alert" className="rounded-lg border border-[#e6c4bd] bg-[#fff8f6] px-3 py-2 text-sm font-semibold text-[#a3382c]">Deletion was not completed: {deleteError}</p>}
      <div className="space-y-2"><p className="text-sm text-[#28483f]"><strong>{deleteRow.fullName}</strong> · {deleteRow.username ?? `User #${deleteRow.userId}`}</p><label className={label} htmlFor="delete-account-confirmation">Type the exact username <code>{deleteRow.username ?? deleteRow.userId}</code> to confirm</label><Input id="delete-account-confirmation" autoComplete="off" value={deletePhrase} onChange={e => { setDeletePhrase(e.target.value); setDeleteError(""); }} disabled={deleteIsSelf || deleteIsProtected} /></div>
      <DialogFooter><button className={ghost} onClick={() => { setDeleteRow(null); setDeletePhrase(""); }}>Cancel</button><button type="button" className="action-button !bg-[#a3382c] !text-white hover:!bg-[#862f27]" disabled={!deletePhraseMatches || deleteUser.isPending} onClick={() => deleteUser.mutate({ userId: deleteRow.userId })}>{deleteUser.isPending ? "Deleting…" : "Permanently delete account"}</button></DialogFooter></>}</DialogContent></Dialog>
    <Dialog open={!!viewRow} onOpenChange={o => !o && setViewRow(null)}><DialogContent>{viewRow && <><DialogHeader><DialogTitle>{viewRow.fullName}</DialogTitle><DialogDescription>{viewRow.roleLabel} · <StatusPill status={viewRow.status} /></DialogDescription></DialogHeader>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">{([["User ID", `#${viewRow.userId}`], ["Username", viewRow.username], ["Staff ID", viewRow.staffId], ["Department", viewRow.department], ["Email", viewRow.email], ["Phone", viewRow.phone], ["Class", viewRow.classes.map(c => c.name).join(", ")], ["Subjects", viewRow.subjects.map(s => s.name).join(", ")], ["Last login", viewRow.lastLogin ? fmt(viewRow.lastLogin) : "Never"], ["Password changed", viewRow.passwordChangedAt ? fmt(viewRow.passwordChangedAt) : "Not set"], ["Created", fmt(viewRow.createdAt)]] as [string, string | null][]).map(([k, v]) => <div key={k}><dt className={label}>{k}</dt><dd className="mt-0.5 text-[#28483f]">{v || "—"}</dd></div>)}</dl>
      <p className="text-xs text-[#718077]">Passwords are stored as one-way hashes and are never displayed.</p></>}</DialogContent></Dialog>
  </div>;
}
