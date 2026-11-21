import { useState } from "react";
import {
  Download,
  ExternalLink,
  Gamepad2,
  Loader2,
  Play,
  ShieldCheck,
} from "lucide-react";

const GAME_BUNDLE =
  "/manus-storage/prince-of-persia-nexus-arcade-v4_5161fa17.jsdos";
const BROWSER_GAME_URL = "https://princejs.com/";

export default function NexusArcadeWorkspace() {
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  const playNow = () => {
    setError("");
    setLoaded(false);
    setLoading(true);
    setStarted(true);
  };

  const handleGameLoad = () => {
    setLoading(false);
    setLoaded(true);
  };

  const handleGameError = () => {
    setLoading(false);
    setError(
      "The browser player could not be loaded. Use Open in new tab or download the DOS bundle below."
    );
  };

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-[1.35rem] border border-[#d7e7dc] bg-gradient-to-br from-[#143e34] via-[#1d6a57] to-[#2f8a70] p-6 text-white shadow-sm sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[.14em] text-[#dff4e7]">
              <Gamepad2 size={15} /> NEXUS Arcade
            </div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
              Play Prince of Persia
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[#d7eee1]">
              Launch the playable HTML5 edition directly inside NEXUS. The
              original supplied DOS package remains available as a download
              fallback.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={playNow}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl bg-[#f1c96c] px-4 py-3 text-sm font-black text-[#173c32] shadow-lg transition hover:-translate-y-0.5 hover:bg-[#ffda82] disabled:cursor-wait disabled:opacity-70"
              >
                {loading ? (
                  <Loader2 size={17} className="animate-spin" />
                ) : (
                  <Play size={17} fill="currentColor" />
                )}
                {loading
                  ? "Loading game…"
                  : started
                    ? "Reload game"
                    : "Play now"}
              </button>
              <a
                href={GAME_BUNDLE}
                download
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/20"
              >
                <Download size={17} /> Download DOS bundle
              </a>
            </div>
          </div>
          <div className="grid max-w-xs gap-3 text-sm text-[#d7eee1] sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-xl border border-white/15 bg-black/10 p-3">
              <p className="font-bold text-white">
                {loaded ? "Browser game ready" : "HTML5 player"}
              </p>
              <p className="mt-1 text-xs">Runs inside this NEXUS screen</p>
            </div>
            <div className="rounded-xl border border-white/15 bg-black/10 p-3">
              <p className="font-bold text-white">Classic Prince of Persia</p>
              <p className="mt-1 text-xs">Keyboard controls supported</p>
            </div>
          </div>
        </div>
      </div>
      <div className="rounded-[1.2rem] border border-[#dcded5] bg-[#fffefa] p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="eyebrow">Arcade player</p>
            <h2 className="mt-1 text-xl font-black text-[#28483f]">
              Prince of Persia
            </h2>
          </div>
          {started && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e4f3e8] px-3 py-1.5 text-xs font-bold text-[#1d6a57]">
              <ShieldCheck size={14} /> {loaded ? "Playable" : "Loading"}
            </span>
          )}
        </div>
        <div
          className="overflow-hidden rounded-xl bg-[#101b20] shadow-inner"
          aria-label="Prince of Persia game player"
        >
          {started ? (
            <iframe
              key={BROWSER_GAME_URL}
              title="Prince of Persia HTML5 game"
              src={BROWSER_GAME_URL}
              onLoad={handleGameLoad}
              onError={handleGameError}
              allow="fullscreen; autoplay"
              className="block h-[min(70vh,560px)] min-h-[420px] w-full border-0 bg-black"
            />
          ) : (
            <div className="flex min-h-[420px] items-center justify-center p-6 text-center text-sm text-[#cbd8d2]">
              Press <strong className="mx-1 text-white">Play now</strong> to
              open the playable game here.
            </div>
          )}
        </div>
        {error && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#edc9c3] bg-[#fff4f1] px-3 py-2 text-xs font-semibold text-[#9f4239]">
            <span role="alert">{error}</span>
            <a
              className="inline-flex items-center gap-1 rounded-md border border-[#d99083] px-2 py-1 text-[#8b382f] hover:bg-white"
              href={BROWSER_GAME_URL}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink size={13} /> Open in new tab
            </a>
          </div>
        )}
        <p className="mt-3 text-xs leading-5 text-[#718077]">
          Click inside the game to focus it, then use the keyboard controls. Use
          the player’s own full-screen control when available.
        </p>
      </div>
    </section>
  );
}
