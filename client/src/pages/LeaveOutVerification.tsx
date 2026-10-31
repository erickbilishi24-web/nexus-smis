import { ShieldCheck, XCircle } from "lucide-react";
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";

const statusLabels: Record<string, string> = {
  pending_approval: "Pending approval",
  approved: "Approved",
  departed: "Learner departed",
  returned: "Learner returned",
  expired: "Expired",
};

const statusStyles: Record<string, { container: string; text: string; label: string }> = {
  pending_approval: { container: "border-[#f0d58a] bg-[#fff7df]", text: "text-[#8a651e]", label: "Awaiting approval" },
  approved: { container: "border-[#a9d6b5] bg-[#e9f7ec]", text: "text-[#17653d]", label: "VALID PASS · APPROVED" },
  departed: { container: "border-[#9fc8e7] bg-[#eaf5fd]", text: "text-[#1b5b87]", label: "VALID PASS · DEPARTED" },
  returned: { container: "border-[#a9d6b5] bg-[#e9f7ec]", text: "text-[#17653d]", label: "COMPLETED · RETURNED" },
  expired: { container: "border-[#efb1a9] bg-[#fff0ed]", text: "text-[#a33d32]", label: "EXPIRED · DO NOT AUTHORISE" },
};

function dateTime(value: string | Date | null | undefined) {
  if (!value) return "Not specified";
  return new Date(value).toLocaleString();
}

export default function LeaveOutVerification() {
  const [, params] = useRoute<{ passNumber: string }>("/leave-out/verify/:passNumber");
  const passNumber = params?.passNumber ?? "";
  const verification = trpc.leaveOutVerification.useQuery(
    { passNumber: decodeURIComponent(passNumber) },
    { enabled: Boolean(passNumber), retry: false },
  );
  const pass = verification.data;

  return (
    <main className="min-h-screen bg-[#f7f4ed] px-4 py-10 text-[#19342e]">
      <div className="mx-auto max-w-xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#102b52] text-xl font-black text-white">N</div>
          <div><p className="text-lg font-black tracking-tight">Nexus-smis</p><p className="text-xs text-[#718077]">School Management System</p></div>
        </div>
        <section className="rounded-3xl border border-[#d8ded7] bg-white p-6 shadow-[0_18px_50px_rgba(25,52,46,.10)] sm:p-8">
          {verification.isLoading && <p className="py-12 text-center text-sm text-[#718077]">Verifying leave-out pass…</p>}
          {!verification.isLoading && !pass && (
            <div className="py-8 text-center">
              <XCircle className="mx-auto h-12 w-12 text-[#a84a42]" />
              <h1 className="mt-4 text-xl font-black">Pass not found or no longer valid</h1>
              <p className="mt-2 text-sm leading-6 text-[#718077]">This QR code does not match an active NEXUS leave-out pass.</p>
            </div>
          )}
          {pass && (
            <>
              <div className="flex items-start justify-between gap-4 border-b border-[#e7e2d7] pb-5">
                <div className="flex min-w-0 items-center gap-3">
                  {pass.logoPath ? <img src={pass.logoPath} alt={`${pass.schoolName} logo`} className="h-16 w-16 shrink-0 rounded-2xl border border-[#d8ded7] object-contain p-1" /> : <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-[#102b52] text-2xl font-black text-white">N</div>}
                  <div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#718077]">Leave-out verification</p><h1 className="mt-2 text-2xl font-black">{pass.schoolName}</h1><p className="mt-1 text-xs text-[#718077]">School code: {pass.schoolCode}</p></div>
                </div>
                <ShieldCheck className="h-9 w-9 shrink-0 text-[#1d6a57]" />
              </div>
              {(() => { const style = statusStyles[pass.status] ?? statusStyles.pending_approval; return <div className={`mt-5 flex items-center justify-between gap-3 rounded-2xl border-2 p-5 ${style.container}`} role="status"><div><p className={`text-xs font-black uppercase tracking-[.14em] ${style.text}`}>{style.label}</p><p className={`mt-1 text-2xl font-black ${style.text}`}>{statusLabels[pass.status] ?? pass.status}</p></div><ShieldCheck className={`h-10 w-10 ${style.text}`} aria-hidden="true" /></div>; })()}
              <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                <div><dt className="text-[.65rem] font-bold uppercase tracking-[.12em] text-[#718077]">Pass number</dt><dd className="mt-1 font-bold">{pass.passNumber}</dd></div>
                <div><dt className="text-[.65rem] font-bold uppercase tracking-[.12em] text-[#718077]">Learner</dt><dd className="mt-1 font-bold">{pass.learnerName}</dd><dd className="text-xs text-[#718077]">{pass.admissionNumber}</dd></div>
                <div><dt className="text-[.65rem] font-bold uppercase tracking-[.12em] text-[#718077]">Reason</dt><dd className="mt-1 font-semibold">{pass.reason}</dd></div>
                <div><dt className="text-[.65rem] font-bold uppercase tracking-[.12em] text-[#718077]">Destination</dt><dd className="mt-1 font-semibold">{pass.destination || "Not specified"}</dd></div>
                <div><dt className="text-[.65rem] font-bold uppercase tracking-[.12em] text-[#718077]">Departure</dt><dd className="mt-1 font-semibold">{dateTime(pass.intendedDepartureAt)}</dd></div>
                <div><dt className="text-[.65rem] font-bold uppercase tracking-[.12em] text-[#718077]">Expected return</dt><dd className="mt-1 font-semibold">{dateTime(pass.expectedReturnAt)}</dd></div>
                {pass.departedAt && <div><dt className="text-[.65rem] font-bold uppercase tracking-[.12em] text-[#718077]">Actual departure</dt><dd className="mt-1 font-semibold">{dateTime(pass.departedAt)}</dd></div>}
                {pass.returnedAt && <div><dt className="text-[.65rem] font-bold uppercase tracking-[.12em] text-[#718077]">Actual return</dt><dd className="mt-1 font-semibold">{dateTime(pass.returnedAt)}</dd></div>}
              </dl>
              <p className="mt-8 border-t border-[#e7e2d7] pt-4 text-center text-xs text-[#718077]">Verified by Nexus-smis · Keep this page for pass verification.</p>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
