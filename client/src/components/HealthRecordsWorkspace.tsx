import { useEffect, useState } from "react";
import { HeartPulse, Save, Plus } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { toUserError } from "@/lib/errorText";

const field = "mt-1 w-full rounded-lg border border-[#d8ded7] bg-[#fffefa] px-3 py-2 text-sm";
type ProfileState = { allergies: string; conditions: string; bloodGroup: string; emergencyContactName: string; emergencyContactPhone: string; providerNotes: string };
const emptyProfile: ProfileState = { allergies: "", conditions: "", bloodGroup: "", emergencyContactName: "", emergencyContactPhone: "", providerNotes: "" };

export function HealthRecordsWorkspace() {
  const learners = trpc.smis.learners.list.useQuery({});
  const records = trpc.smis.healthRecords.list.useQuery();
  const utils = trpc.useUtils();
  const [learnerId, setLearnerId] = useState("");
  const [notes, setNotes] = useState("");
  const [eventType, setEventType] = useState<"illness" | "injury" | "first_aid" | "clinic_visit" | "referral" | "follow_up">("first_aid");
  const [profile, setProfile] = useState<ProfileState>(emptyProfile);

  const selectedProfile = records.data?.profiles.find(row => row.profile.learnerId === Number(learnerId));
  useEffect(() => {
    if (!learnerId) {
      setProfile(emptyProfile);
      return;
    }
    const saved = records.data?.profiles.find(row => row.profile.learnerId === Number(learnerId))?.profile;
    setProfile(saved ? {
      allergies: saved.allergies ?? "",
      conditions: saved.conditions ?? "",
      bloodGroup: saved.bloodGroup ?? "",
      emergencyContactName: saved.emergencyContactName ?? "",
      emergencyContactPhone: saved.emergencyContactPhone ?? "",
      providerNotes: saved.providerNotes ?? "",
    } : emptyProfile);
  }, [learnerId, records.data?.profiles]);

  const saveProfile = trpc.smis.healthRecords.saveProfile.useMutation({
    onSuccess: () => { toast.success("Health profile saved"); void utils.smis.healthRecords.invalidate(); },
    onError: e => toast.error(toUserError(e)),
  });
  const recordEvent = trpc.smis.healthRecords.recordEvent.useMutation({
    onSuccess: () => { toast.success("Health event recorded"); setNotes(""); void utils.smis.healthRecords.invalidate(); },
    onError: e => toast.error(toUserError(e)),
  });

  return <div className="page-enter space-y-5">
    <section className="soft-card rounded-[1.1rem] p-5">
      <div className="flex items-start gap-3"><span className="rounded-xl bg-[#e5f1e8] p-3 text-[#1d6a57]"><HeartPulse size={20} /></span><div><p className="eyebrow">Restricted welfare records</p><h1 className="mt-1 font-editorial text-2xl text-[#193d32]">Health and Medical Records</h1><p className="mt-2 text-sm text-[#718077]">Profiles, first aid, clinic visits, referrals and follow-ups. Clinical access is restricted to authorised administrators.</p></div></div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <label className="text-xs font-bold text-[#53675d] md:col-span-2">Learner<select className={field} value={learnerId} onChange={e => setLearnerId(e.target.value)}><option value="">Select learner</option>{learners.data?.map(l => <option key={l.id} value={l.id}>{l.fullName} · {l.admissionNumber}</option>)}</select></label>
        {Object.entries(profile).map(([key, value]) => <label key={key} className="text-xs font-bold capitalize text-[#53675d]">{key.replace(/([A-Z])/g, " $1")}<input className={field} value={value} onChange={e => setProfile({ ...profile, [key]: e.target.value })} /></label>)}
        <button className="action-button" disabled={!learnerId || saveProfile.isPending} onClick={() => saveProfile.mutate({ learnerId: Number(learnerId), ...profile })}><Save size={15} />{selectedProfile ? "Update health profile" : "Save health profile"}</button>
      </div>
    </section>

    <section className="soft-card overflow-x-auto rounded-[1.1rem] p-5"><div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-bold text-[#28483f]">Saved learner health profiles</h2><p className="mt-1 text-xs text-[#718077]">Stored securely for this school and visible to authorised welfare users.</p></div><span className="rounded-full bg-[#e5f1e8] px-3 py-1 text-xs font-bold text-[#1d6a57]">{records.data?.profiles.length ?? 0} profile{records.data?.profiles.length === 1 ? "" : "s"}</span></div><table className="mt-3 w-full min-w-[900px] text-left text-xs"><thead><tr className="border-b border-[#e7e2d7] text-[#718077]"><th className="p-2">Learner</th><th className="p-2">Blood group</th><th className="p-2">Allergies</th><th className="p-2">Conditions</th><th className="p-2">Emergency contact</th><th className="p-2">Provider notes</th><th className="p-2">Updated</th></tr></thead><tbody>{records.data?.profiles.map(row => <tr key={row.profile.id} className={`border-b border-[#f0ede6] ${row.profile.learnerId === Number(learnerId) ? "bg-[#f1faf6]" : ""}`}><td className="p-2 font-semibold">{row.learner.fullName}<div className="text-[.68rem] font-normal text-[#718077]">{row.learner.admissionNumber}</div></td><td className="p-2">{row.profile.bloodGroup || "—"}</td><td className="max-w-[12rem] whitespace-pre-wrap p-2">{row.profile.allergies || "—"}</td><td className="max-w-[12rem] whitespace-pre-wrap p-2">{row.profile.conditions || "—"}</td><td className="p-2">{row.profile.emergencyContactName || "—"}{row.profile.emergencyContactPhone && <div>{row.profile.emergencyContactPhone}</div>}</td><td className="max-w-[16rem] whitespace-pre-wrap p-2">{row.profile.providerNotes || "—"}</td><td className="p-2">{row.profile.updatedAt ? new Date(row.profile.updatedAt).toLocaleString("en-KE") : "—"}</td></tr>)}{!records.data?.profiles.length && <tr><td colSpan={7} className="p-6 text-center text-sm text-[#718077]">No saved health profiles yet. Select a learner and save the profile above.</td></tr>}</tbody></table></section>

    <section className="soft-card rounded-[1.1rem] p-5"><h2 className="font-bold text-[#28483f]">Record illness, injury or clinic event</h2><div className="mt-3 grid gap-3 md:grid-cols-3"><select className={field} value={eventType} onChange={e => setEventType(e.target.value as typeof eventType)}><option value="first_aid">First aid</option><option value="illness">Illness</option><option value="injury">Injury</option><option value="clinic_visit">Clinic visit</option><option value="referral">Referral</option><option value="follow_up">Follow-up</option></select><input type="date" className={field} defaultValue={new Date().toISOString().slice(0, 10)} id="health-event-date" /><textarea className={`${field} md:col-span-3`} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Record factual observations, action taken, referral or medication..." /><button className="action-button" disabled={!learnerId || !notes.trim() || recordEvent.isPending} onClick={() => recordEvent.mutate({ learnerId: Number(learnerId), eventType, eventDate: (document.getElementById("health-event-date") as HTMLInputElement)?.value || new Date().toISOString().slice(0, 10), notes })}><Plus size={15} />Record event</button></div></section>

    <section className="soft-card overflow-x-auto rounded-[1.1rem] p-5"><h2 className="font-bold text-[#28483f]">Recent health events</h2><table className="mt-3 w-full min-w-[650px] text-left text-xs"><thead><tr className="border-b border-[#e7e2d7] text-[#718077]"><th className="p-2">Date</th><th className="p-2">Learner</th><th className="p-2">Type</th><th className="p-2">Notes</th></tr></thead><tbody>{records.data?.events.map(row => <tr key={row.event.id} className="border-b border-[#f0ede6]"><td className="p-2">{String(row.event.eventDate)}</td><td className="p-2">{row.learner.fullName}</td><td className="p-2 capitalize">{row.event.eventType.replaceAll("_", " ")}</td><td className="p-2">{row.event.notes}</td></tr>)}</tbody></table></section>
  </div>;
}
