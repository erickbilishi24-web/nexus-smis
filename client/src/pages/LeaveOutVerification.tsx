import { ShieldCheck, XCircle } from "lucide-react";
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";

const statusLabels: Record<string, string> = {
  pending_approval: "Pending approval",
  approved: "Approved",
  departed: "Learner departed",
  returned: "Learner returned",
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
                <div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#718077]">Leave-out verification</p><h1 className="mt-2 text-2xl font-black">{pass.schoolName}</h1><p className="mt-1 text-xs text-[#718077]">School code: {pass.schoolCode}</p></div>
                <ShieldCheck className="h-9 w-9 shrink-0 text-[#1d6a57]" />
              </div>
              <div className="mt-5 rounded-2xl bg-[#edf5ed] p-4"><p className="text-[.65rem] font-bold uppercase tracking-[.12em] text-[#53675d]">Current status</p><p className="mt-1 text-lg font-black text-[#1d6a57]">{statusLabels[pass.status] ?? pass.status}</p></div>
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
