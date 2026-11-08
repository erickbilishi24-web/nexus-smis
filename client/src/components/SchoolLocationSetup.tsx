import { useEffect, useState } from "react";
import { LocateFixed, MapPin, Save } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { toUserError } from "@/lib/errorText";

type GradingRow = { code: string; label: string; min: number; max: number };
type ReportCardDisplay = { showLogo: boolean; showAddress: boolean; showPhone: boolean; showEmail: boolean; showMotto: boolean };

const DEFAULT_GRADING_SCALE: GradingRow[] = [
  { code: "EE1", label: "Exceeding Expectations 1", min: 90, max: 100 },
  { code: "EE2", label: "Exceeding Expectations 2", min: 75, max: 89 },
  { code: "ME1", label: "Meeting Expectations 1", min: 58, max: 74 },
  { code: "ME2", label: "Meeting Expectations 2", min: 41, max: 57 },
  { code: "AE1", label: "Approaching Expectations 1", min: 31, max: 40 },
  { code: "AE2", label: "Approaching Expectations 2", min: 21, max: 30 },
  { code: "BE1", label: "Below Expectations 1", min: 11, max: 20 },
  { code: "BE2", label: "Below Expectations 2", min: 0, max: 10 },
];
const DEFAULT_REPORT_CARD_DISPLAY: ReportCardDisplay = { showLogo: true, showAddress: true, showPhone: true, showEmail: true, showMotto: true };

export function SchoolLocationSetup() {
  const utils = trpc.useUtils();
  const setup = trpc.smis.clocking.status.useQuery();
  const settings = trpc.smis.settings.get.useQuery();
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [radius, setRadius] = useState("150");
  const [schoolName, setSchoolName] = useState("");
  const [motto, setMotto] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [logoPath, setLogoPath] = useState("");
  const [gradingScale, setGradingScale] = useState<GradingRow[]>(DEFAULT_GRADING_SCALE);
  const [assessmentCategories, setAssessmentCategories] = useState(["Mid-Term", "End-Term"]);
  const [competencyLevels, setCompetencyLevels] = useState(["Exceeding Expectations", "Meeting Expectations", "Approaching Expectations", "Below Expectations"]);
  const [reportCardDisplay, setReportCardDisplay] = useState<ReportCardDisplay>(DEFAULT_REPORT_CARD_DISPLAY);

  useEffect(() => {
    const value = settings.data;
    if (!value) return;
    setSchoolName(value.schoolName ?? ""); setMotto(value.motto ?? ""); setAddress(value.address ?? ""); setPhone(value.phone ?? ""); setEmail(value.email ?? ""); setLogoPath(value.logoPath ?? "");
    setGradingScale((value.gradingScale as GradingRow[] | undefined) ?? DEFAULT_GRADING_SCALE);
    setAssessmentCategories((value.assessmentCategories as string[] | undefined) ?? ["Mid-Term", "End-Term"]);
    setCompetencyLevels((value.competencyLevels as string[] | undefined) ?? ["Exceeding Expectations", "Meeting Expectations", "Approaching Expectations", "Below Expectations"]);
    setReportCardDisplay({ ...DEFAULT_REPORT_CARD_DISPLAY, ...(value.reportCardSettings as Partial<ReportCardDisplay> | undefined) });
  }, [settings.data?.id]);

  const saveLocation = trpc.smis.clocking.saveLocation.useMutation({ onSuccess: () => { toast.success("School coordinates saved"); void utils.smis.clocking.status.invalidate(); }, onError: e => toast.error(toUserError(e)) });
  const saveSettings = trpc.smis.settings.update.useMutation({ onSuccess: () => { toast.success("School profile and report-card settings saved"); void utils.smis.settings.get.invalidate(); }, onError: e => toast.error(toUserError(e)) });
  const capture = () => { if (!navigator.geolocation) return toast.error("Location services are unavailable"); navigator.geolocation.getCurrentPosition(p => { setLatitude(p.coords.latitude.toFixed(7)); setLongitude(p.coords.longitude.toFixed(7)); toast.success("Current school location captured"); }, () => toast.error("Allow location access to capture coordinates"), { enableHighAccuracy: true, timeout: 10000 }); };
  const saveProfile = () => {
    const current = settings.data;
    if (!current) return;
    if (!schoolName.trim()) return toast.error("School name is required");
    saveSettings.mutate({ schoolName: schoolName.trim(), motto: motto.trim() || null, currentTerm: current.currentTerm, academicYear: current.academicYear, includeFeesOnReportCard: Boolean(current.includeFeesOnReportCard), showPercentagesOnReportCard: Boolean(current.showPercentagesOnReportCard), address: address.trim() || null, phone: phone.trim() || null, email: email.trim() || null, logoPath: logoPath.trim() || null, subjectShortNames: current.subjectShortNames ?? {}, gradingScale, assessmentCategories: assessmentCategories.map(item => item.trim()).filter(Boolean), competencyLevels: competencyLevels.map(item => item.trim()).filter(Boolean), reportCardSettings: reportCardDisplay, themePrimaryColor: current.themePrimaryColor, themeAccentColor: current.themeAccentColor, themeSurfaceColor: current.themeSurfaceColor, themeMode: current.themeMode });
  };
  const field = "mt-1 w-full rounded-lg border border-[#d8ddd4] bg-[#fffefa] px-3 py-2 text-sm";

  return <div className="space-y-5">
    <section className="soft-card min-w-0 rounded-[1.1rem] p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="eyebrow">Clocking in setup</p><h2 className="mt-1 text-lg font-bold text-[#28483f]">School location and allowed radius</h2><p className="mt-1 text-xs leading-5 text-[#718077]">Staff can clock in once per day only when their device is within this radius. Coordinates are checked server-side.</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${setup.data?.configured ? "bg-[#e5f1e8] text-[#1d6a57]" : "bg-[#f9efd8] text-[#9a6c19]"}`}>{setup.data?.configured ? "Configured" : "Not configured"}</span></div><div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4"><label className="text-xs font-bold text-[#718077]">Latitude<input value={latitude || String(setup.data?.latitude ?? "")} onChange={e => setLatitude(e.target.value)} className={field} placeholder="-0.1234567" /></label><label className="text-xs font-bold text-[#718077]">Longitude<input value={longitude || String(setup.data?.longitude ?? "")} onChange={e => setLongitude(e.target.value)} className={field} placeholder="34.1234567" /></label><label className="text-xs font-bold text-[#718077]">Radius in metres<input type="number" min="25" max="1000" value={radius || String(setup.data?.radiusMeters ?? 150)} onChange={e => setRadius(e.target.value)} className={field} /></label><div className="flex items-end gap-2"><button type="button" className="quiet-button" onClick={capture}><LocateFixed size={14} />Capture location</button><button type="button" className="action-button" disabled={saveLocation.isPending} onClick={() => saveLocation.mutate({ latitude: Number(latitude || setup.data?.latitude), longitude: Number(longitude || setup.data?.longitude), radiusMeters: Number(radius || setup.data?.radiusMeters || 150) })}><MapPin size={14} />Save</button></div></div></section>

    <section className="soft-card min-w-0 rounded-[1.1rem] p-4 sm:p-5"><div><p className="eyebrow">Institutional identity and assessment rules</p><h2 className="mt-1 text-lg font-bold text-[#28483f]">School profile, grading and report-card settings</h2><p className="mt-1 text-xs leading-5 text-[#718077]">These saved values are used by official report cards. Grading bands must cover scores from 0 to 100 without changing the CBC code names.</p></div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><label className="text-xs font-bold text-[#718077]">School name<input className={field} value={schoolName} onChange={e => setSchoolName(e.target.value)} /></label><label className="text-xs font-bold text-[#718077]">Motto<input className={field} value={motto} onChange={e => setMotto(e.target.value)} /></label><label className="text-xs font-bold text-[#718077]">Address / P.O. Box<input className={field} value={address} onChange={e => setAddress(e.target.value)} placeholder="P.O. Box, town, county" /></label><label className="text-xs font-bold text-[#718077]">Official phone<input className={field} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+254..." /></label><label className="text-xs font-bold text-[#718077]">Official email<input type="email" className={field} value={email} onChange={e => setEmail(e.target.value)} placeholder="office@school.ac.ke" /></label><label className="text-xs font-bold text-[#718077]">Logo URL / storage path<input className={field} value={logoPath} onChange={e => setLogoPath(e.target.value)} placeholder="/manus-storage/..." /></label></div>
      <div className="mt-5 grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr]"><div><h3 className="text-sm font-bold text-[#28483f]">CBC grading scale</h3><div className="mt-2 overflow-x-auto rounded-lg border border-[#d8ddd4]"><table className="w-full text-xs"><thead className="bg-[#edf2ed]"><tr><th className="p-2 text-left">Code</th><th className="p-2 text-left">Label</th><th className="p-2">Min</th><th className="p-2">Max</th></tr></thead><tbody>{gradingScale.map((row, index) => <tr key={row.code} className="border-t border-[#eee9df]"><td className="p-2 font-bold">{row.code}</td><td className="p-2"><input className="w-full rounded border border-[#d8ddd4] px-2 py-1" value={row.label} onChange={e => setGradingScale(items => items.map((item, i) => i === index ? { ...item, label: e.target.value } : item))} /></td><td className="p-2"><input type="number" min="0" max="100" className="w-16 rounded border border-[#d8ddd4] px-2 py-1" value={row.min} onChange={e => setGradingScale(items => items.map((item, i) => i === index ? { ...item, min: Number(e.target.value) } : item))} /></td><td className="p-2"><input type="number" min="0" max="100" className="w-16 rounded border border-[#d8ddd4] px-2 py-1" value={row.max} onChange={e => setGradingScale(items => items.map((item, i) => i === index ? { ...item, max: Number(e.target.value) } : item))} /></td></tr>)}</tbody></table></div></div><div><h3 className="text-sm font-bold text-[#28483f]">Assessment categories</h3><p className="mt-1 text-[.68rem] text-[#718077]">One category per line.</p><textarea className={`${field} min-h-28`} value={assessmentCategories.join("\n")} onChange={e => setAssessmentCategories(e.target.value.split("\n"))} /></div><div><h3 className="text-sm font-bold text-[#28483f]">Competency levels</h3><p className="mt-1 text-[.68rem] text-[#718077]">One level per line.</p><textarea className={`${field} min-h-28`} value={competencyLevels.join("\n")} onChange={e => setCompetencyLevels(e.target.value.split("\n"))} /></div></div>
      <div className="mt-5 rounded-lg border border-[#d8ddd4] bg-[#fbfaf5] p-3"><h3 className="text-sm font-bold text-[#28483f]">Official document header</h3><div className="mt-2 flex flex-wrap gap-4 text-xs font-semibold text-[#53675d]">{(["showLogo", "showAddress", "showPhone", "showEmail", "showMotto"] as const).map(key => <label key={key} className="inline-flex items-center gap-2"><input type="checkbox" checked={reportCardDisplay[key]} onChange={e => setReportCardDisplay(current => ({ ...current, [key]: e.target.checked }))} className="accent-[#1d6a57]" />{key.replace("show", "Show ")}</label>)}</div></div><div className="mt-4 flex justify-end"><button type="button" className="action-button" disabled={saveSettings.isPending || !settings.data} onClick={saveProfile}><Save size={15} />{saveSettings.isPending ? "Saving settings…" : "Save school and report-card settings"}</button></div></section>
  </div>;
}
