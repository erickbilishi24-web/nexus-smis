import { useEffect, useRef, useState } from "react";
import { Download, Gamepad2, Loader2, Play, ShieldCheck } from "lucide-react";

const GAME_BUNDLE = "/manus-storage/prince-of-persia-nexus-arcade_77baa9c5.jsdos";

declare global {
  interface Window {
    Dos?: (container: HTMLElement, options: { url: string }) => unknown;
  }
}

export default function NexusArcadeWorkspace() {
  const emulatorRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const cssId = "nexus-arcade-js-dos-css";
    if (!document.getElementById(cssId)) {
      const css = document.createElement("link");
      css.id = cssId;
      css.rel = "stylesheet";
      css.href = "https://v8.js-dos.com/latest/js-dos.css";
      document.head.appendChild(css);
    }
    const scriptId = "nexus-arcade-js-dos";
    const existing = document.getElementById(scriptId);
    if (existing) {
      setReady(Boolean(window.Dos));
      return;
    }
    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://v8.js-dos.com/latest/js-dos.js";
    script.async = true;
    script.onload = () => setReady(Boolean(window.Dos));
    script.onerror = () => setError("The browser game engine could not be loaded. Check your connection and try again.");
    document.body.appendChild(script);
  }, []);

  const playNow = () => {
    if (!emulatorRef.current || !window.Dos) {
      setError("The game engine is still loading. Please wait a moment and press Play now again.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      emulatorRef.current.innerHTML = "";
      window.Dos(emulatorRef.current, { url: GAME_BUNDLE });
      setStarted(true);
      setReady(true);
    } catch {
      setError("The game could not start. Please refresh the page and press Play now again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-[1.35rem] border border-[#d7e7dc] bg-gradient-to-br from-[#143e34] via-[#1d6a57] to-[#2f8a70] p-6 text-white shadow-sm sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[.14em] text-[#dff4e7]"><Gamepad2 size={15} /> NEXUS Arcade</div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Play Prince of Persia</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[#d7eee1]">Click Play now to launch the prepared classic directly inside NEXUS. No manual DOS setup is required.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button type="button" onClick={playNow} disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-[#f1c96c] px-4 py-3 text-sm font-black text-[#173c32] shadow-lg transition hover:-translate-y-0.5 hover:bg-[#ffda82] disabled:cursor-wait disabled:opacity-70">{loading ? <Loader2 size={17} className="animate-spin" /> : <Play size={17} fill="currentColor" />}{loading ? "Preparing game…" : "Play now"}</button>
              <a href={GAME_BUNDLE} download className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/20"><Download size={17} /> Download bundle</a>
            </div>
          </div>
          <div className="grid max-w-xs gap-3 text-sm text-[#d7eee1] sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-xl border border-white/15 bg-black/10 p-3"><p className="font-bold text-white">{ready ? "Engine ready" : "Loading engine"}</p><p className="mt-1 text-xs">Browser play enabled</p></div>
            <div className="rounded-xl border border-white/15 bg-black/10 p-3"><p className="font-bold text-white">Classic DOS edition</p><p className="mt-1 text-xs">Level 11 fixed package</p></div>
          </div>
        </div>
      </div>
      <div className="rounded-[1.2rem] border border-[#dcded5] bg-[#fffefa] p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><p className="eyebrow">Arcade player</p><h2 className="mt-1 text-xl font-black text-[#28483f]">Prince of Persia</h2></div>{started && <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e4f3e8] px-3 py-1.5 text-xs font-bold text-[#1d6a57]"><ShieldCheck size={14} /> Running</span>}</div>
        <div ref={emulatorRef} className="min-h-[420px] overflow-hidden rounded-xl bg-[#101b20] shadow-inner" aria-label="Prince of Persia game player"><div className="flex min-h-[420px] items-center justify-center p-6 text-center text-sm text-[#cbd8d2]">Press <strong className="mx-1 text-white">Play now</strong> to open the game here.</div></div>
        {error && <p role="alert" className="mt-3 rounded-lg border border-[#edc9c3] bg-[#fff4f1] px-3 py-2 text-xs font-semibold text-[#9f4239]">{error}</p>}
        <p className="mt-3 text-xs leading-5 text-[#718077]">Keyboard controls are available inside the player. Use its full-screen control for the best experience.</p>
      </div>
    </section>
  );
}
