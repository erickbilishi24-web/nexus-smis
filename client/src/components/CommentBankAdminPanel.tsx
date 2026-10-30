import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

import { toUserError } from "@/lib/errorText";
const field = "mt-1 w-full rounded-lg border border-[#d8ddd4] bg-[#fffefa] px-3 py-2 text-sm text-[#28483f] outline-none focus:border-[#1d6a57]";
const categories = [["BE", "B.E — Below Expectation"], ["AE", "A.E — Approaching Expectation"], ["ME", "M.E — Meeting Expectation"], ["EE", "E.E — Exceeding Expectation"]] as const;

export function CommentBankAdminPanel() {
  const utils = trpc.useUtils();
  const bank = trpc.smis.reports.commentBankAdmin.useQuery();
  const [role, setRole] = useState<"class_teacher" | "principal">("class_teacher");
  const [category, setCategory] = useState<"BE" | "AE" | "ME" | "EE">("BE");
  const [text, setText] = useState("");
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const refresh = () => void utils.smis.reports.commentBankAdmin.invalidate();
  const create = trpc.smis.reports.createCommentBankEntry.useMutation({ onSuccess: () => { toast.success("Comment added"); setText(""); refresh(); }, onError: e => toast.error(toUserError(e)) });
  const update = trpc.smis.reports.updateCommentBankEntry.useMutation({ onSuccess: () => { toast.success("Comment updated"); setEditing(null); refresh(); }, onError: e => toast.error(toUserError(e)) });
  const rows = bank.data ?? [];
  return <div className="space-y-5 p-5">
    <div><p className="eyebrow">Report-card configuration</p><h2 className="mt-1 text-lg font-bold text-[#28483f]">Standardised Comment Bank</h2><p className="mt-1 max-w-3xl text-xs leading-5 text-[#718077]">The seeded bank contains 80 comments: 10 for each ability category and role. Class Teachers see academic comments; authorised administrators and principals see the separate conduct and development bank. Historical report cards keep their saved text.</p></div>
    <form onSubmit={e => { e.preventDefault(); if (text.trim()) create.mutate({ role, category, text: text.trim() }); }} className="grid gap-3 rounded-xl border border-[#d8ddd4] bg-[#fbfaf5] p-4 sm:grid-cols-[11rem_14rem_1fr_auto] sm:items-end"><label className="text-xs font-bold text-[#53675d]">Role<select className={field} value={role} onChange={e => setRole(e.target.value as typeof role)}><option value="class_teacher">Class Teacher</option><option value="principal">Head of Institution (PRINCIPAL)</option></select></label><label className="text-xs font-bold text-[#53675d]">Category<select className={field} value={category} onChange={e => setCategory(e.target.value as typeof category)}>{categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="text-xs font-bold text-[#53675d]">New comment<textarea required minLength={10} maxLength={1000} value={text} onChange={e => setText(e.target.value)} className={`${field} min-h-10`} placeholder="Enter a reusable report-card comment" /></label><button className="action-button justify-center" disabled={create.isPending}>Add comment</button></form>
    <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead><tr className="border-b border-[#e2e6dc] text-[0.66rem] uppercase tracking-wide text-[#718077]"><th className="px-3 py-3">Role</th><th>Category</th><th className="w-[55%]">Comment</th><th>Status</th><th /></tr></thead><tbody>{rows.map(row => <tr key={row.id} className="border-b border-[#eef0e8] align-top"><td className="px-3 py-3 font-bold">{row.role === "principal" ? "Principal" : "Class Teacher"}</td><td className="px-3 py-3">{categories.find(([value]) => value === row.category)?.[1] ?? row.category}</td><td className="px-3 py-3">{editing === row.id ? <textarea className={`${field} mt-0 min-h-16`} value={draft} onChange={e => setDraft(e.target.value)} /> : row.text}</td><td className="px-3 py-3">{row.active ? "Active" : "Inactive"}</td><td className="px-3 py-3"><div className="flex gap-2"><button className="rounded border px-2 py-1 font-bold" onClick={() => { setEditing(row.id); setDraft(row.text); }}>{editing === row.id ? "Editing" : "Edit"}</button>{editing === row.id && <button className="rounded bg-[#1d6a57] px-2 py-1 font-bold text-white" onClick={() => update.mutate({ id: row.id, text: draft })}>Save</button>}<button className="rounded border px-2 py-1 font-bold" onClick={() => update.mutate({ id: row.id, active: !row.active })}>{row.active ? "Deactivate" : "Activate"}</button></div></td></tr>)}{!bank.isLoading && !rows.length && <tr><td colSpan={5} className="p-8 text-center text-[#718077]">Comment bank unavailable or you do not have configuration permission.</td></tr>}</tbody></table></div>
  </div>;
}
