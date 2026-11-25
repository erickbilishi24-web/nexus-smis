import { useEffect, useRef, useState } from "react";
import {
  ChevronRight,
  Download,
  ExternalLink,
  Gamepad2,
  Lightbulb,
  Loader2,
  Maximize2,
  Minimize2,
  Play,
  ShieldCheck,
  X,
} from "lucide-react";

const GAME_BUNDLE =
  "/manus-storage/prince-of-persia-nexus-arcade-v4_5161fa17.jsdos";
const BROWSER_GAME_URL = "/arcade-prince/";
const GAME_HINTS = [
  {
    title: "Start moving",
    keys: "← / →",
    instruction: "Press the Left or Right Arrow key.",
    mission: "Find the safe route forward and move away from the starting platform.",
  },
  {
    title: "Cross a gap",
    keys: "↑",
    instruction: "Press Up as you approach a gap; combine it with a direction for a running jump.",
    mission: "Clear the floor gap or trap and land on the next platform.",
  },
  {
    title: "Reach a higher ledge",
    keys: "↑ near a ledge",
    instruction: "Stand close to the ledge and press Up to climb or pull yourself up.",
    mission: "Gain height so you can continue through the level instead of returning to the lower floor.",
  },
  {
    title: "Prepare for an enemy",
    keys: "Shift + direction",
    instruction: "Use Shift with a direction to run into position; use the sword control shown by the game when the guard is close.",
    mission: "Create space, face the guard, and survive the encounter before continuing toward the exit.",
  },
  { title: "Draw your sword", keys: "Shift", instruction: "Press Shift when a guard is near to draw your sword, then use Left and Right to face and engage.", mission: "Defend yourself instead of walking into the guard unarmed." },
  { title: "Duck under danger", keys: "↓", instruction: "Hold Down to crouch and avoid low traps, projectiles, or a guard's high swing.", mission: "Pass beneath an obstacle without losing health." },
  { title: "Use a potion", keys: "↑ near potion", instruction: "Walk close to a potion and press Up to pick it up; pause briefly to let its effect apply.", mission: "Restore health or gain the temporary ability needed for the next room." },
  { title: "Check loose floors", keys: "Walk carefully", instruction: "Approach suspicious floor tiles slowly. Stop, retreat, or jump if a tile begins to drop.", mission: "Avoid falling into a pit and preserve time for the level." },
  { title: "Open doors", keys: "↑ at door", instruction: "Stand directly in front of a door or pressure plate and press Up; some doors require a nearby switch first.", mission: "Unlock the route to the next section." },
  { title: "Climb safely", keys: "↑ + direction", instruction: "At a ledge, hold Up and tap the direction of the platform. Release once the Prince is standing securely.", mission: "Reach upper platforms while avoiding an accidental fall." },
  { title: "Keep moving", keys: "← / → + Shift", instruction: "Use a running start before a long jump. Do not stop at the edge unless you are lining up a climb.", mission: "Build momentum to cross wide gaps and keep the countdown moving." },
  { title: "Pause or restart", keys: "Esc / Enter", instruction: "Press Pause to stop and inspect the room. Use the game's restart option after a fall or failed attempt.", mission: "Recover quickly and try the room again without losing control." },
  { title: "Reach the exit", keys: "Explore + ↑", instruction: "Search each room for the exit door, keys, switches, and safe ledges; press Up at the exit when you reach it.", mission: "Escape the level before the timer expires." },
];

export default function NexusArcadeWorkspace() {
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [hintsOpen, setHintsOpen] = useState(false);
  const [selectedHint, setSelectedHint] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [touchCapable, setTouchCapable] = useState(false);
  const playerRef = useRef<HTMLDivElement>(null);
  const gameFrameRef = useRef<HTMLIFrameElement>(null);
  const touchRepeatRef = useRef<number | null>(null);
  const activeTouchKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const syncFullscreenState = () =>
      setIsFullscreen(document.fullscreenElement === playerRef.current);
    document.addEventListener("fullscreenchange", syncFullscreenState);
    return () => document.removeEventListener("fullscreenchange", syncFullscreenState);
  }, []);

  useEffect(() => {
    const coarse = window.matchMedia("(pointer: coarse)");
    const updateTouchCapability = () => setTouchCapable(navigator.maxTouchPoints > 0 || coarse.matches);
    updateTouchCapability();
    coarse.addEventListener?.("change", updateTouchCapability);
    return () => coarse.removeEventListener?.("change", updateTouchCapability);
  }, []);

  useEffect(() => {
    if (!started) return;
    const blockedKeys = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "Spacebar", "Enter", "Shift", "Escape"]);
    const relay = (event: KeyboardEvent, action: "down" | "up") => {
      if (!blockedKeys.has(event.key)) return;
      event.preventDefault();
      event.stopPropagation();
      const key = event.key === " " || event.key === "Spacebar" ? "Space" : event.key;
      gameFrameRef.current?.contentWindow?.postMessage({ type: "nexus-arcade-key", key, action }, window.location.origin);
    };
    const down = (event: KeyboardEvent) => relay(event, "down");
    const up = (event: KeyboardEvent) => relay(event, "up");
    window.addEventListener("keydown", down, { capture: true });
    window.addEventListener("keyup", up, { capture: true });
    return () => {
      window.removeEventListener("keydown", down, { capture: true });
      window.removeEventListener("keyup", up, { capture: true });
    };
  }, [started]);

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

  const sendTouchCommand = (key: string) => {
    gameFrameRef.current?.contentWindow?.postMessage({ type: "nexus-arcade-key", key, action: "down" }, window.location.origin);
    gameFrameRef.current?.focus();
  };
  const releaseTouchCommand = (key = activeTouchKeyRef.current) => {
    if (key) {
      gameFrameRef.current?.contentWindow?.postMessage({ type: "nexus-arcade-key", key, action: "up" }, window.location.origin);
    }
    activeTouchKeyRef.current = null;
  };
  const stopTouchCommand = () => {
    if (touchRepeatRef.current !== null) {
      window.clearInterval(touchRepeatRef.current);
      touchRepeatRef.current = null;
    }
    releaseTouchCommand();
  };
  const startTouchCommand = (key: string) => {
    stopTouchCommand();
    activeTouchKeyRef.current = key;
    sendTouchCommand(key);
    touchRepeatRef.current = window.setInterval(() => sendTouchCommand(key), 110);
  };
  const tapTouchCommand = (key: string) => {
    stopTouchCommand();
    activeTouchKeyRef.current = key;
    sendTouchCommand(key);
    window.setTimeout(() => releaseTouchCommand(key), 140);
  };
  useEffect(() => () => stopTouchCommand(), []);

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
              <button
                type="button"
                onClick={() => setHintsOpen(open => !open)}
                aria-expanded={hintsOpen}
                aria-controls="prince-of-persia-hints"
                className="inline-flex items-center gap-2 rounded-xl border border-[#f1c96c]/60 bg-[#f1c96c]/15 px-4 py-3 text-sm font-bold text-white transition hover:bg-[#f1c96c]/25"
              >
                <Lightbulb size={17} /> Hints
              </button>
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
          <div className="flex flex-wrap items-center gap-2">
            {started && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e4f3e8] px-3 py-1.5 text-xs font-bold text-[#1d6a57]">
                <ShieldCheck size={14} /> {loaded ? "Playable" : "Loading"}
              </span>
            )}
            {started && (
              <button
                type="button"
                onClick={() => {
                  if (document.fullscreenElement) {
                    void document.exitFullscreen();
                  } else {
                    void playerRef.current?.requestFullscreen();
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#cbded1] bg-white px-3 py-1.5 text-xs font-bold text-[#1d6a57] transition hover:bg-[#eef8f0]"
                aria-label={isFullscreen ? "Minimise game" : "View game fullscreen"}
                title={isFullscreen ? "Minimise game" : "Fullscreen"}
              >
                {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                {isFullscreen ? "Minimise game" : "Fullscreen"}
              </button>
            )}
          </div>
        </div>
        <div
          ref={playerRef}
          className={`${isFullscreen ? "h-screen rounded-none" : "rounded-xl"} overflow-hidden bg-[#101b20] shadow-inner`}
          aria-label="Prince of Persia game player"
        >
          {started ? (
            <iframe
              key={BROWSER_GAME_URL}
              ref={gameFrameRef}
              title="Prince of Persia HTML5 game"
              src={BROWSER_GAME_URL}
              onLoad={handleGameLoad}
              onError={handleGameError}
              allow="fullscreen; autoplay"
              className={`block w-full border-0 bg-black ${isFullscreen ? "h-screen" : "h-[min(70vh,560px)] min-h-[420px]"}`}
            />
          ) : (
            <div className="flex min-h-[420px] items-center justify-center p-6 text-center text-sm text-[#cbd8d2]">
              Press <strong className="mx-1 text-white">Play now</strong> to
              open the playable game here.
            </div>
          )}
        </div>
        {started && touchCapable && (
          <div className="mt-3 rounded-xl border border-[#cbded1] bg-[#eef8f0] p-3" aria-label="Touch controls">
            <p className="mb-2 text-center text-xs font-black uppercase tracking-[.12em] text-[#1d6a57]">Touch controls</p>
            <div className="grid grid-cols-4 gap-2 sm:max-w-xl sm:mx-auto">
              <span />
              <button type="button" onPointerDown={e => { e.preventDefault(); startTouchCommand("ArrowUp"); }} onPointerUp={stopTouchCommand} onPointerCancel={stopTouchCommand} onPointerLeave={stopTouchCommand} className="touch-none rounded-lg bg-[#1d6a57] px-3 py-3 text-lg font-black text-white active:scale-95" aria-label="Jump or climb">↑</button>
              <span />
              <button type="button" onPointerDown={e => { e.preventDefault(); tapTouchCommand("Enter"); }} className="touch-none rounded-lg bg-[#53675d] px-3 py-3 text-xs font-black text-white active:scale-95" aria-label="Start or confirm">START</button>
              <button type="button" onPointerDown={e => { e.preventDefault(); startTouchCommand("ArrowLeft"); }} onPointerUp={stopTouchCommand} onPointerCancel={stopTouchCommand} onPointerLeave={stopTouchCommand} className="touch-none rounded-lg bg-[#28483f] px-3 py-3 text-lg font-black text-white active:scale-95" aria-label="Move left">←</button>
              <button type="button" onPointerDown={e => { e.preventDefault(); startTouchCommand("ArrowDown"); }} onPointerUp={stopTouchCommand} onPointerCancel={stopTouchCommand} onPointerLeave={stopTouchCommand} className="touch-none rounded-lg bg-[#28483f] px-3 py-3 text-lg font-black text-white active:scale-95" aria-label="Duck">↓</button>
              <button type="button" onPointerDown={e => { e.preventDefault(); startTouchCommand("ArrowRight"); }} onPointerUp={stopTouchCommand} onPointerCancel={stopTouchCommand} onPointerLeave={stopTouchCommand} className="touch-none rounded-lg bg-[#28483f] px-3 py-3 text-lg font-black text-white active:scale-95" aria-label="Move right">→</button>
              <button type="button" onPointerDown={e => { e.preventDefault(); startTouchCommand("Shift"); }} onPointerUp={stopTouchCommand} onPointerCancel={stopTouchCommand} onPointerLeave={stopTouchCommand} className="col-span-2 touch-none rounded-lg bg-[#b58a25] px-3 py-2 text-xs font-black text-white active:scale-95" aria-label="Sword or run">SWORD / RUN</button>
              <button type="button" onPointerDown={e => { e.preventDefault(); tapTouchCommand("Space"); }} className="touch-none rounded-lg bg-[#53675d] px-3 py-2 text-xs font-black text-white active:scale-95" aria-label="Show timer">INFO</button>
              <button type="button" onPointerDown={e => { e.preventDefault(); tapTouchCommand("Escape"); }} className="touch-none rounded-lg bg-[#53675d] px-3 py-2 text-xs font-black text-white active:scale-95" aria-label="Pause or menu">PAUSE</button>
            </div>
            <p className="mt-2 text-center text-[.65rem] text-[#53675d]">Hold arrows to move, climb, jump, or duck. Hold SWORD / RUN for combat; START begins the game.</p>
          </div>
        )}
        {hintsOpen && (
          <div
            id="prince-of-persia-hints"
            className="mt-4 rounded-xl border border-[#eadcae] bg-[#fff9e6] p-4 text-[#4d4935]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-sm font-black text-[#655721]">
                  <Lightbulb size={16} /> Need a nudge?
                </p>
                <p className="mt-1 text-xs leading-5 text-[#746d51]">
                  Click a situation below, then click inside the game so it receives your keyboard input.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHintsOpen(false)}
                aria-label="Close hints"
                className="rounded-md p-1 text-[#746d51] transition hover:bg-[#f3e9bd] hover:text-[#4d4935]"
              >
                <X size={16} />
              </button>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {GAME_HINTS.map((hint, index) => (
                <button
                  key={hint.title}
                  type="button"
                  onClick={() => setSelectedHint(index)}
                  aria-pressed={selectedHint === index}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-xs font-bold transition ${selectedHint === index ? "border-[#b58a25] bg-[#f3e5a9] text-[#51440f]" : "border-[#eadcae] bg-white/70 text-[#6f653e] hover:bg-white"}`}
                >
                  {hint.title}
                  <ChevronRight size={14} />
                </button>
              ))}
            </div>
            <div className="mt-3 rounded-lg border border-[#eadcae] bg-white/75 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-[#263b35] px-2 py-1 font-mono text-xs font-bold text-white">
                  {GAME_HINTS[selectedHint].keys}
                </span>
                <p className="text-sm font-black text-[#4d4935]">
                  {GAME_HINTS[selectedHint].title}
                </p>
              </div>
              <p className="mt-2 text-sm leading-5 text-[#5e5841]">
                <strong>What to press:</strong> {GAME_HINTS[selectedHint].instruction}
              </p>
              <p className="mt-1 text-sm leading-5 text-[#5e5841]">
                <strong>Mission:</strong> {GAME_HINTS[selectedHint].mission}
              </p>
            </div>
          </div>
        )}
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
          On phones and tablets, use the touch controls below the game. On desktop,
          click inside the game and use the keyboard controls; arrow keys are captured by the player so the NEXUS page will not scroll.
        </p>
      </div>
    </section>
  );
}
