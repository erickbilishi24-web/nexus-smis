import { useEffect, useState } from "react";
import { Check, Eye, Palette, Save, X } from "lucide-react";
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

const applyRuntimeTheme = (theme: Pick<ThemePreset, "primary" | "accent" | "surface" | "mode">) => {
  document.documentElement.style.setProperty("--nexus-primary", theme.primary);
  document.documentElement.style.setProperty("--nexus-accent", theme.accent);
  document.documentElement.style.setProperty("--nexus-surface", theme.surface);
  const dark = theme.mode === "dark" || (theme.mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.style.setProperty("--background", theme.surface);
  document.documentElement.style.setProperty("--foreground", dark ? "#f8fafc" : "#19342e");
  document.documentElement.style.setProperty("--card", dark ? "#132235" : "#fffefa");
  document.documentElement.style.setProperty("--card-foreground", dark ? "#f8fafc" : "#19342e");
  document.documentElement.style.setProperty("--popover", dark ? "#132235" : "#fffefa");
  document.documentElement.style.setProperty("--popover-foreground", dark ? "#f8fafc" : "#19342e");
  document.documentElement.style.setProperty("--primary", theme.primary);
  document.documentElement.style.setProperty("--primary-foreground", "#fffdf7");
  document.documentElement.style.setProperty("--secondary", dark ? "#183c52" : "#e7eee7");
  document.documentElement.style.setProperty("--secondary-foreground", dark ? "#dcecf0" : theme.primary);
  document.documentElement.style.setProperty("--muted", dark ? "#182b40" : "#efede5");
  document.documentElement.style.setProperty("--muted-foreground", dark ? "#b8c8d3" : "#67726c");
  document.documentElement.style.setProperty("--accent", dark ? "#183c52" : `color-mix(in srgb, ${theme.accent} 15%, white)`);
  document.documentElement.style.setProperty("--accent-foreground", dark ? "#a8e4dc" : theme.primary);
  document.documentElement.style.setProperty("--border", dark ? "#294056" : `color-mix(in srgb, ${theme.primary} 20%, #dedbd1)`);
  document.documentElement.style.setProperty("--input", dark ? "#294056" : `color-mix(in srgb, ${theme.primary} 20%, #dedbd1)`);
  document.documentElement.style.setProperty("--ring", theme.primary);
  document.documentElement.classList.toggle("dark", dark);
};

export function ThemeCustomizationWorkspace() {
  const settings = trpc.smis.settings.get.useQuery();
  const utils = trpc.useUtils();
  const [selectedId, setSelectedId] = useState("emerald-gold");
  const [previewing, setPreviewing] = useState(false);
  const selected = presets.find(theme => theme.id === selectedId) ?? presets[0];

  useEffect(() => {
    if (!settings.data) return;
    const match = presets.find(theme => theme.primary.toLowerCase() === (settings.data.themePrimaryColor ?? "").toLowerCase() && theme.accent.toLowerCase() === (settings.data.themeAccentColor ?? "").toLowerCase());
    setSelectedId(match?.id ?? presets[0].id);
    setPreviewing(false);
  }, [settings.data]);

  const applyPreview = (theme: ThemePreset) => {
    applyRuntimeTheme(theme);
    setSelectedId(theme.id);
    setPreviewing(true);
  };
  const cancelPreview = () => {
    if (!settings.data) return;
    applyRuntimeTheme({ primary: settings.data.themePrimaryColor ?? "#1d6a57", accent: settings.data.themeAccentColor ?? "#d99b3d", surface: settings.data.themeSurfaceColor ?? "#f7f4ed", mode: (settings.data.themeMode ?? "light") as ThemeMode });
    const saved = presets.find(theme => theme.primary.toLowerCase() === (settings.data.themePrimaryColor ?? "").toLowerCase() && theme.accent.toLowerCase() === (settings.data.themeAccentColor ?? "").toLowerCase());
    setSelectedId(saved?.id ?? presets[0].id);
    setPreviewing(false);
  };
  const save = trpc.smis.settings.update.useMutation({
    onSuccess: data => {
      applyRuntimeTheme({ primary: data.themePrimaryColor, accent: data.themeAccentColor, surface: data.themeSurfaceColor, mode: (data.themeMode ?? "light") as ThemeMode });
      setPreviewing(false);
      toast.success(`${selected.name} theme applied to this school`);
      void utils.smis.settings.get.invalidate();
    },
    onError: error => toast.error(error.message.replaceAll("_", " ")),
  });

  if (!settings.data) return null;
  return <section className="soft-card rounded-[1.1rem] p-5">
    <div className="flex items-start gap-3"><span className="rounded-xl bg-[#f7ecd5] p-3 text-[#9a6c19]"><Palette size={20}/></span><div><p className="eyebrow">School settings</p><h2 className="mt-1 text-lg font-bold text-[#28483f]">Ready-made themes</h2><p className="mt-1 text-xs leading-5 text-[#718077]">Choose one accessible NEXUS theme. Presets use strong contrast and readable text for staff with low vision; colors are stored per school tenant.</p></div></div>
    {previewing && <div className="mt-4 flex flex-col gap-3 rounded-xl border border-[#b9d8c7] bg-[#eef8f1] p-3 text-sm text-[#245442] sm:flex-row sm:items-center sm:justify-between"><p><b>Previewing {selected.name}.</b> This is temporary until you apply it.</p><div className="flex gap-2"><button type="button" className="quiet-button" onClick={cancelPreview}><X size={15}/>Cancel preview</button><button type="button" className="action-button" disabled={save.isPending} onClick={() => save.mutate({ schoolName: settings.data.schoolName, motto: settings.data.motto, currentTerm: settings.data.currentTerm, academicYear: settings.data.academicYear, includeFeesOnReportCard: Boolean(settings.data.includeFeesOnReportCard), showPercentagesOnReportCard: Boolean(settings.data.showPercentagesOnReportCard), subjectShortNames: settings.data.subjectShortNames ?? {}, themePrimaryColor: selected.primary, themeAccentColor: selected.accent, themeSurfaceColor: selected.surface, themeMode: selected.mode })}><Save size={15}/>{save.isPending ? "Applying…" : "Apply theme"}</button></div></div>}
    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{presets.map(theme => <button key={theme.id} type="button" onClick={() => applyPreview(theme)} className={`relative rounded-2xl border-2 p-3 text-left transition-transform hover:-translate-y-0.5 ${selected.id === theme.id ? "border-[#1d6a57] ring-2 ring-[#1d6a57]/20" : "border-[#d8ded7]"}`}><div className="flex items-center justify-between"><span className="font-bold" style={{ color: theme.sampleText }}>{theme.name}</span><span className="flex items-center gap-1 text-xs font-semibold text-[#64746b]">{selected.id === theme.id ? <Check size={18} className="text-[#1d6a57]" /> : <Eye size={15} />} Preview</span></div><div className="mt-3 flex h-10 overflow-hidden rounded-lg"><span className="flex-1" style={{ background: theme.primary }} /><span className="w-1/4" style={{ background: theme.accent }} /><span className="w-1/4" style={{ background: theme.surface }} /></div><p className="mt-2 text-xs leading-4 text-[#64746b]">{theme.description}</p></button>)}</div>
    {!previewing && <div className="mt-5 flex flex-wrap gap-2"><button className="action-button" disabled={save.isPending} onClick={() => applyPreview(selected)}><Eye size={15}/>Preview {selected.name}</button><button type="button" className="quiet-button" disabled={save.isPending} onClick={() => applyPreview(presets[0])}><Palette size={15}/>Restore default theme</button></div>}
  </section>;
}
