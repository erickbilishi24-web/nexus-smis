import { useState } from "react";
import { MessageSquareText, Star } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

import { toUserError } from "@/lib/errorText";
export function NexusFeedbackWorkspace({ isSuperAdmin = false }: { isSuperAdmin?: boolean }) {
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState("");
  const utils = trpc.useUtils();
  const submit = trpc.feedback.submit.useMutation({ onSuccess: () => { setMessage(""); toast.success("Feedback sent to the Super Admin"); void utils.feedback.list.invalidate(); }, onError: e => toast.error(toUserError(e)) });
  const reviews = trpc.feedback.list.useQuery(undefined, { enabled: isSuperAdmin });
  return <div className="page-enter space-y-6">
    <header className="border-b border-[#dfdbd1] pb-5"><p className="eyebrow">Nexus-smis · product feedback</p><h1 className="mt-1 font-editorial text-3xl text-[#193d32]">Feedback</h1><p className="mt-2 text-sm text-[#69796f]">Share your experience so the Super Admin can improve Nexus-smis.</p></header>
    <section className="soft-card rounded-[1.15rem] p-5"><div className="flex items-center gap-2"><MessageSquareText size={18} className="text-[#1d6a57]"/><h2 className="font-bold text-[#28483f]">Tell us what you think</h2></div><div className="mt-4 flex gap-1" aria-label="Rating">{[1,2,3,4,5].map(value => <button key={value} type="button" aria-label={`${value} stars`} onClick={() => setRating(value)} className={value <= rating ? "text-[#d99b3d]" : "text-[#cfd7d0]"}><Star size={22} fill="currentColor"/></button>)}</div><textarea value={message} onChange={e => setMessage(e.target.value)} maxLength={4000} placeholder="What is working well, and what should be improved?" className="mt-4 min-h-32 w-full rounded-lg border border-[#d8ded7] bg-[#fbfaf5] p-3 text-sm outline-none focus:border-[#1d6a57]"/><button type="button" disabled={submit.isPending || message.trim().length < 3} onClick={() => submit.mutate({ rating, message })} className="action-button mt-4 disabled:opacity-50">Send feedback</button></section>
    {isSuperAdmin && <section className="soft-card overflow-hidden rounded-[1.15rem] p-5"><h2 className="font-bold text-[#28483f]">User feedback received</h2><div className="mt-4 space-y-3">{reviews.data?.map(row => <article key={row.feedback.id} className="rounded-lg border border-[#e7e2d7] bg-[#fffefa] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><b className="text-sm text-[#28483f]">{row.user?.name ?? row.user?.username ?? row.user?.email ?? `User ${row.feedback.userId}`}</b><span className="text-[#d99b3d]">{"★".repeat(row.feedback.rating)}{"☆".repeat(5 - row.feedback.rating)}</span></div><p className="mt-2 text-sm leading-6 text-[#53675d]">{row.feedback.message}</p><p className="mt-2 text-xs text-[#87938b]">{new Date(row.feedback.createdAt).toLocaleString("en-KE")}</p></article>)}{!reviews.isLoading && !reviews.data?.length && <p className="text-sm text-[#718077]">No feedback has been submitted yet.</p>}</div></section>}
  </div>;
}
