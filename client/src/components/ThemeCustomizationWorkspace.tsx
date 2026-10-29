import { useEffect, useState } from "react";
import { Check, Palette, Save } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

type ThemeMode = "light" | "dark" | "system";
type ThemePreset = { id: string; name: string; description: string; primary: string; accent: string; surface: string; mode: ThemeMode; sampleText: string };

const presets: ThemePreset[] = [
  { id: "emerald-gold", name: "Emerald & Gold", description: "Warm, familiar school-green workspace with clear gold highlights.", primary: "#1d6a57", accent: "#d99b3d", surface: "#f7f4ed", mode: "light", sampleText: "#193d32" },
  { id: "ocean-coral", name: "Ocean & Coral", description: "Calm blue navigation with energetic coral actions.", primary: "#075985", accent: "#ea580c", surface: "#f0f9ff", mode: "light", sampleText: "#082f49" },
  { id: "royal-sun", name: "Royal & Sunshine", description: "High-visibility indigo with golden-yellow emphasis.", primary: "#3730a3", accent: "#ca8a04", surface: "#f5f7ff", mode: "light", sampleText: "#1e1b4b" },
  { id: "plum-mint", name: "Plum & Mint", description: "Distinctive purple identity balanced by a soft mint canvas.", primary: "#701a75", accent: "#0f766e", surface: "#f0fdfa", mode: "light", sampleText: "#3b0764" },
  { id: "charcoal-teal", name: "Charcoal & Teal", description: "A focused dark theme with readable teal interaction states.", primary: "#0f766e", accent: "#f59e0b", surface: "#17202a", mode: "dark", sampleText: "#f8fafc" },
  { id: "navy-berry", name: "Navy & Berry", description: "Professional navy surfaces with accessible berry accents.", primary: "#1e3a8a", accent: "#be185d", surface: "#f8fafc", mode: "light", sampleText: "#172554" },
];

export function ThemeCustomizationWorkspace() {
  const settings = trpc.smis.settings.get.useQuery();
  const utils = trpc.useUtils();
  const [selectedId, setSelectedId] = useState("emerald-gold");
  const selected = presets.find(theme => theme.id === selectedId) ?? presets[0];

  useEffect(() => {
    if (!settings.data) return;
    const match = presets.find(theme => theme.primary.toLowerCase() === (settings.data.themePrimaryColor ?? "").toLowerCase() && theme.accent.toLowerCase() === (settings.data.themeAccentColor ?? "").toLowerCase());
    setSelectedId(match?.id ?? presets[0].id);
  }, [settings.data]);

  const applyPreview = (theme: ThemePreset) => {
    document.documentElement.style.setProperty("--nexus-primary", theme.primary);
    document.documentElement.style.setProperty("--nexus-accent", theme.accent);
    document.documentElement.style.setProperty("--nexus-surface", theme.surface);
    setSelectedId(theme.id);
  };
  const save = trpc.smis.settings.update.useMutation({
    onSuccess: data => {
      document.documentElement.style.setProperty("--nexus-primary", data.themePrimaryColor);
      document.documentElement.style.setProperty("--nexus-accent", data.themeAccentColor);
      document.documentElement.style.setProperty("--nexus-surface", data.themeSurfaceColor);
      toast.success(`${selected.name} theme applied to this school`);
      void utils.smis.settings.get.invalidate();
    },
    onError: error => toast.error(error.message.replaceAll("_", " ")),
  });

  if (!settings.data) return null;
  return <section className="soft-card rounded-[1.1rem] p-5">
    <div className="flex items-start gap-3"><span className="rounded-xl bg-[#f7ecd5] p-3 text-[#9a6c19]"><Palette size={20}/></span><div><p className="eyebrow">School settings</p><h2 className="mt-1 text-lg font-bold text-[#28483f]">Ready-made themes</h2><p className="mt-1 text-xs leading-5 text-[#718077]">Choose one accessible NEXUS theme. Presets use strong contrast and readable text for staff with low vision; colors are stored per school tenant.</p></div></div>
    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{presets.map(theme => <button key={theme.id} type="button" onClick={() => applyPreview(theme)} className={`relative rounded-2xl border-2 p-3 text-left transition-transform hover:-translate-y-0.5 ${selected.id === theme.id ? "border-[#1d6a57] ring-2 ring-[#1d6a57]/20" : "border-[#d8ded7]"}`}><div className="flex items-center justify-between"><span className="font-bold" style={{ color: theme.sampleText }}>{theme.name}</span>{selected.id === theme.id && <Check size={18} className="text-[#1d6a57]" />}</div><div className="mt-3 flex h-10 overflow-hidden rounded-lg"><span className="flex-1" style={{ background: theme.primary }} /><span className="w-1/4" style={{ background: theme.accent }} /><span className="w-1/4" style={{ background: theme.surface }} /></div><p className="mt-2 text-xs leading-4 text-[#64746b]">{theme.description}</p></button>)}</div>
    <button className="action-button mt-5" disabled={save.isPending} onClick={() => save.mutate({ schoolName: settings.data.schoolName, motto: settings.data.motto, currentTerm: settings.data.currentTerm, academicYear: settings.data.academicYear, includeFeesOnReportCard: Boolean(settings.data.includeFeesOnReportCard), showPercentagesOnReportCard: Boolean(settings.data.showPercentagesOnReportCard), subjectShortNames: settings.data.subjectShortNames ?? {}, themePrimaryColor: selected.primary, themeAccentColor: selected.accent, themeSurfaceColor: selected.surface, themeMode: selected.mode })}><Save size={15}/>{save.isPending ? "Saving…" : `Save ${selected.name}`}</button>
  </section>;
}
