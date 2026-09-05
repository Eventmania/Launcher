import { useCallback, useEffect, useRef, useState } from "react";
import {
  CHANNELS,
  fmtClock,
  grad,
  type AppDef,
  type Channel,
  type MediaItem,
} from "../data";
import { Icon } from "../icons";
import { useTvKeys, useTvNav } from "../lib/keys";
import { sfx } from "../lib/sound";
import { useStore } from "../lib/store";
import { useUI } from "../lib/ui";
import { cx, shade } from "../lib/util";
import { Cell } from "./cards";

/* --------------------------- MEDIA PLAYER -------------------------- */

export function PlayerOverlay({ m }: { m: MediaItem }) {
  const ui = useUI();
  const { s, d } = useStore();
  const dur = m.duration * 60;
  const [t, setT] = useState(() => Math.min(s.mediaProgress[m.id] ?? 0, dur - 10));
  const [playing, setPlaying] = useState(true);
  const [btn, setBtn] = useState(0);
  const tRef = useRef(t);
  tRef.current = t;

  useEffect(() => {
    if (!playing) return;
    const iv = setInterval(() => setT((v) => Math.min(dur, v + 0.5)), 500);
    return () => clearInterval(iv);
  }, [playing, dur]);

  useEffect(() => {
    if (t >= dur) setPlaying(false);
  }, [t, dur]);

  const closeAndSave = useCallback(() => {
    const v = tRef.current;
    if (v > 45 && v < dur * 0.97) {
      d({ type: "mediaProgress", id: m.id, t: v });
      ui.toast("Progress saved to Continue Watching", "check");
    } else {
      d({ type: "mediaProgress", id: m.id, t: 0 });
    }
    sfx("back");
    ui.close();
  }, [d, dur, m.id, ui]);

  useTvKeys("player", 100, (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return false;
    switch (e.key) {
      case "Escape":
        closeAndSave();
        return true;
      case "ArrowLeft":
        setT((v) => Math.max(0, v - 10));
        sfx("move");
        return true;
      case "ArrowRight":
        setT((v) => Math.min(dur, v + 10));
        sfx("move");
        return true;
      case "ArrowUp":
      case "ArrowDown":
        setBtn((b) => (b + (e.key === "ArrowDown" ? 1 : 2)) % 3);
        sfx("move");
        return true;
      case " ":
        setPlaying((p) => !p);
        sfx("select");
        return true;
      case "Enter":
        sfx("select");
        if (btn === 0) setPlaying((p) => !p);
        else if (btn === 1) {
          setT(0);
          setPlaying(true);
        } else {
          const listed = s.favMedia.includes(m.id);
          d({ type: "favMedia", id: m.id });
          ui.toast(listed ? "Removed from Watchlist" : "Added to Watchlist", "star");
        }
        return true;
      default:
        return true;
    }
  });

  const focus: [number, number] = [0, btn];
  const listed = s.favMedia.includes(m.id);
  const pct = (t / dur) * 100;

  return (
    <div className="fade-in fixed inset-0 z-50 overflow-hidden bg-black">
      {m.backdrop ? (
        <img src={m.backdrop} alt="" className="animate-kb h-full w-full object-cover" draggable={false} />
      ) : (
        <div className="h-full w-full" style={{ background: grad(m.hue) }} />
      )}
      <div className="absolute inset-0 bg-black/25" />
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/80 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black/95 via-black/60 to-transparent" />
      <div className="grain absolute inset-0" />

      {!playing && (
        <div className="fade-in absolute inset-0 flex items-center justify-center">
          <span
            className="flex h-24 w-24 items-center justify-center rounded-full shadow-2xl"
            style={{ background: "var(--accent)" }}
          >
            <Icon name={t >= dur ? "restart" : "play"} filled className="ml-1 h-11 w-11 text-[#07101c]" />
          </span>
        </div>
      )}

      <div className="absolute left-10 top-8 flex items-center gap-4">
        <span className="flex items-center gap-2 rounded-full bg-black/55 px-4 py-2 text-sm font-semibold text-slate-200 ring-1 ring-white/15 backdrop-blur-sm">
          <Icon name="back" className="h-4 w-4" />
          Esc — back to NovaDeck
        </span>
      </div>
      <div className="absolute right-10 top-8 flex items-center gap-3 rounded-full bg-black/55 px-4 py-2 ring-1 ring-white/15 backdrop-blur-sm">
        <span className="flex h-4 items-end gap-[3px]">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className="eq-bar w-[3px] rounded-full"
              style={{
                background: "var(--accent)",
                height: `${8 + (i % 2) * 6}px`,
                animationDelay: `${i * 0.12}s`,
                animationPlayState: playing ? "running" : "paused",
              }}
            />
          ))}
        </span>
        <span className="text-sm font-semibold text-slate-200">Now Playing</span>
      </div>

      <div className="absolute inset-x-0 bottom-0 px-16 pb-10">
        <div className="text-[0.7rem] font-bold uppercase tracking-[0.3em]" style={{ color: "var(--accent)" }}>
          {m.genre} · {m.year}
        </div>
        <h2 className="mt-1 font-display text-4xl font-extrabold text-white">{m.title}</h2>
        <div className="mt-4 flex items-center gap-4">
          <span className="font-mono text-sm tabular-nums text-slate-300">{fmtClock(t)}</span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full transition-[width] duration-300 ease-linear"
              style={{ width: `${pct}%`, background: "var(--accent)" }}
            />
          </div>
          <span className="font-mono text-sm tabular-nums text-slate-400">{fmtClock(dur)}</span>
        </div>
        <div className="mt-6 flex items-center gap-4">
          <Cell r={0} c={0} focus={focus} hover={(r, c) => setBtn(c)} soft
            onClick={() => setPlaying((p) => !p)}
            className="relative flex items-center gap-2.5 rounded-full px-7 py-2.5 font-display text-[0.95rem] font-bold text-[#07101c]"
          >
            <span className="absolute inset-0 rounded-full" style={{ background: "var(--accent)" }} />
            <span className="relative flex items-center gap-2.5">
              <Icon name={playing ? "pause" : "play"} filled className="h-4.5 w-4.5" />
              {playing ? "Pause" : t >= dur ? "Replay" : "Play"}
            </span>
          </Cell>
          <Cell r={0} c={1} focus={focus} hover={(r, c) => setBtn(c)} soft
            onClick={() => {
              setT(0);
              setPlaying(true);
            }}
            className="flex items-center gap-2.5 rounded-full bg-white/10 px-6 py-2.5 font-display text-[0.95rem] font-semibold text-slate-200"
          >
            <Icon name="restart" className="h-4.5 w-4.5" />
            Restart
          </Cell>
          <Cell r={0} c={2} focus={focus} hover={(r, c) => setBtn(c)} soft
            onClick={() => {
              d({ type: "favMedia", id: m.id });
              ui.toast(!listed ? "Added to Watchlist" : "Removed from Watchlist", "star");
            }}
            className={cx(
              "flex items-center gap-2.5 rounded-full px-6 py-2.5 font-display text-[0.95rem] font-semibold",
              listed ? "bg-white/20 text-white" : "bg-white/10 text-slate-200"
            )}
          >
            <Icon name={listed ? "check" : "plus"} className="h-4.5 w-4.5" />
            Watchlist
          </Cell>
          <span className="ml-auto text-xs text-slate-500">
            ◀ ▶ seek 10s · ▲ ▼ buttons · Space play/pause · Esc saves & returns
          </span>
        </div>
      </div>
    </div>
  );
}

/* --------------------------- LIVE PLAYER --------------------------- */

export function LiveOverlay({ ch }: { ch: Channel }) {
  const ui = useUI();
  const [paused, setPaused] = useState(false);

  useTvKeys("liveplayer", 100, (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return false;
    switch (e.key) {
      case "Escape":
        sfx("back");
        ui.close();
        return true;
      case "ArrowLeft":
      case "ArrowRight": {
        const i = CHANNELS.findIndex((c) => c.id === ch.id);
        const n = CHANNELS[(i + (e.key === "ArrowRight" ? 1 : CHANNELS.length - 1)) % CHANNELS.length];
        sfx("tab");
        ui.setLayer({ type: "live", channel: n });
        return true;
      }
      case " ":
      case "Enter":
        setPaused((p) => !p);
        sfx("select");
        return true;
      default:
        return true;
    }
  });

  return (
    <div className="fade-in fixed inset-0 z-50 overflow-hidden bg-black">
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(90% 90% at 50% 40%, ${ch.color}44 0%, transparent 60%), radial-gradient(60% 60% at 80% 90%, ${ch.color}22 0%, transparent 60%), #05070d`,
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.16]"
        style={{ background: "repeating-linear-gradient(0deg, transparent 0 2px, rgba(255,255,255,0.05) 2px 4px)" }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="font-display text-[22rem] font-extrabold leading-none opacity-[0.07]"
          style={{ color: ch.color }}
        >
          {ch.name[0]}
        </span>
      </div>
      <div className="grain absolute inset-0" />

      {paused && (
        <div className="fade-in absolute inset-0 flex items-center justify-center bg-black/60">
          <div className="text-center">
            <div className="font-display text-6xl font-extrabold tracking-widest text-white">PAUSED</div>
            <div className="mt-3 text-slate-400">Live stream buffered · Space or Enter to resume</div>
          </div>
        </div>
      )}

      <div className="absolute left-10 top-8 flex items-center gap-4">
        <span className="flex items-center gap-2.5 rounded-full bg-black/55 px-4 py-2 ring-1 ring-white/15 backdrop-blur-sm">
          <span className="h-3 w-3 rounded-full" style={{ background: ch.color }} />
          <span className="font-display text-sm font-bold text-white">{ch.name}</span>
          <span className="flex items-center gap-1.5 rounded bg-red-600 px-2 py-0.5 text-[0.6rem] font-bold tracking-[0.16em] text-white">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-white" />
            LIVE
          </span>
        </span>
        <span className="flex items-center gap-2 rounded-full bg-black/55 px-4 py-2 text-sm font-semibold text-slate-200 ring-1 ring-white/15 backdrop-blur-sm">
          <Icon name="back" className="h-4 w-4" />
          Esc — back to NovaDeck
        </span>
      </div>

      <div className="absolute inset-x-0 bottom-0 px-16 pb-12">
        <div className="text-[0.7rem] font-bold uppercase tracking-[0.3em] text-slate-400">On now</div>
        <h2 className="mt-1 font-display text-5xl font-extrabold text-white">{ch.now}</h2>
        <div className="mt-2 text-sm text-slate-400">
          Up next · <span className="text-slate-300">{ch.next}</span>
        </div>
        <div className="mt-5 flex items-center gap-4">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/15">
            <div className="h-full rounded-full" style={{ width: `${ch.progress}%`, background: ch.color }} />
          </div>
          <span className="font-mono text-xs tabular-nums text-slate-400">{ch.progress}% of broadcast</span>
        </div>
        <p className="mt-5 text-xs text-slate-500">
          ◀ ▶ surf channels · Space pause/resume · Esc returns to the launcher
        </p>
      </div>
    </div>
  );
}

/* ----------------------------- MINI APPS --------------------------- */

export function MiniAppOverlay({ app }: { app: AppDef }) {
  const ui = useUI();
  const sim = app.simId ?? "generic";

  useTvKeys("miniapp", 100, (e) => {
    if (e.key === "Escape") {
      sfx("back");
      ui.toast(
        sim === "notepad" ? "Note saved on this PC" : `Returned to NovaDeck from ${app.name}`,
        "home"
      );
      ui.close();
      return true;
    }
    return false;
  });

  return (
    <div className="fade-in fixed inset-0 z-50 flex items-center justify-center bg-[#04060c]/90 p-8 backdrop-blur-md">
      <div className="pop-in flex h-[38rem] max-h-[88vh] w-[56rem] max-w-[95vw] flex-col overflow-hidden rounded-xl bg-[#0c1322] shadow-2xl ring-1 ring-white/15">
        <div className="flex h-12 shrink-0 items-center gap-3 border-b border-white/[0.06] bg-[#111a2c] px-5">
          <span
            className="flex h-6 w-6 items-center justify-center rounded-md"
            style={{ background: `linear-gradient(140deg, ${app.color}, ${shade(app.color, 0.45)})` }}
          >
            <Icon name={app.icon} className="h-3.5 w-3.5 text-white" />
          </span>
          <span className="font-display text-sm font-bold text-slate-100">{app.name}</span>
          <span className="rounded-full border border-white/10 px-2.5 py-0.5 text-[0.62rem] font-semibold tracking-wide text-slate-500">
            Sandboxed · Esc returns to launcher
          </span>
          <span className="ml-auto flex items-center gap-2">
            {["─", "□"].map((g) => (
              <span key={g} className="flex h-7 w-9 cursor-default items-center justify-center rounded text-xs text-slate-500 hover:bg-white/[0.07]">
                {g}
              </span>
            ))}
            <span
              onClick={() => {
                sfx("back");
                ui.close();
              }}
              className="flex h-7 w-9 cursor-pointer items-center justify-center rounded text-xs text-slate-400 hover:bg-red-600 hover:text-white"
            >
              ✕
            </span>
          </span>
        </div>
        <div className="min-h-0 flex-1">
          {sim === "calculator" && <Calculator />}
          {sim === "notepad" && <Notepad />}
          {sim === "clock" && <ClockFace />}
          {sim === "generic" && <GenericApp app={app} />}
        </div>
      </div>
    </div>
  );
}

function Calculator() {
  const KEYS = ["C", "±", "%", "÷", "7", "8", "9", "×", "4", "5", "6", "−", "1", "2", "3", "+", "0", ".", "=", "⌫"];
  const [disp, setDisp] = useState("0");
  const [acc, setAcc] = useState<number | null>(null);
  const [op, setOp] = useState<string | null>(null);
  const [fresh, setFresh] = useState(true);

  const nav = useTvNav({
    id: "calc",
    prio: 106,
    rows: 5,
    cols: () => 4,
    initial: [4, 3],
    onEnter: (r, c) => press(KEYS[r * 4 + c]),
  });

  const fmt = (n: number) => {
    if (!isFinite(n) || isNaN(n)) return "Error";
    const r = Math.round(n * 1e8) / 1e8;
    const str = String(r);
    return str.length > 13 ? n.toExponential(5) : str;
  };
  const compute = (a: number, b: number, o: string) =>
    o === "+" ? a + b : o === "−" ? a - b : o === "×" ? a * b : b === 0 ? NaN : a / b;

  const press = (k: string) => {
    sfx("move");
    if (k === "C") {
      setDisp("0");
      setAcc(null);
      setOp(null);
      setFresh(true);
      return;
    }
    if (k === "⌫") {
      if (!fresh) setDisp((v) => (v.length > 1 ? v.slice(0, -1) : "0"));
      return;
    }
    if (k === "±") {
      setDisp((v) => (v.startsWith("-") ? v.slice(1) : v === "0" ? v : "-" + v));
      return;
    }
    if (k === "%") {
      setDisp((v) => fmt(parseFloat(v) / 100));
      return;
    }
    if (/^[0-9]$/.test(k)) {
      setDisp((v) => (fresh ? k : v === "0" ? k : v.length < 13 ? v + k : v));
      setFresh(false);
      return;
    }
    if (k === ".") {
      if (fresh) {
        setDisp("0.");
        setFresh(false);
      } else setDisp((v) => (v.includes(".") ? v : v + "."));
      return;
    }
    if (["÷", "×", "−", "+"].includes(k)) {
      const v = parseFloat(disp);
      if (acc !== null && op && !fresh) {
        const r = compute(acc, v, op);
        setAcc(isNaN(r) ? null : r);
        setDisp(fmt(r));
      } else {
        setAcc(isNaN(v) ? null : v);
      }
      setOp(k);
      setFresh(true);
      return;
    }
    if (k === "=") {
      if (acc !== null && op) {
        const r = compute(acc, parseFloat(disp), op);
        setDisp(fmt(r));
      }
      setAcc(null);
      setOp(null);
      setFresh(true);
    }
  };

  const focus: [number, number] = [nav.r, nav.c];

  return (
    <div className="flex h-full">
      <div className="flex flex-1 flex-col justify-end p-10">
        <div className="mb-2 text-right font-mono text-lg text-slate-500">
          {acc !== null ? `${fmt(acc)} ${op ?? ""}` : " "}
        </div>
        <div
          className="break-all text-right font-display text-7xl font-extrabold tabular-nums tracking-tight text-white"
          style={disp === "Error" ? { color: "#ff7b72" } : undefined}
        >
          {disp}
        </div>
        <p className="mt-6 text-right text-xs text-slate-600">Arrows move · Enter presses · Esc returns</p>
      </div>
      <div className="grid w-[26rem] shrink-0 grid-cols-4 gap-2.5 border-l border-white/[0.06] bg-[#0a101d] p-6">
        {KEYS.map((k, i) => {
          const isOp = ["÷", "×", "−", "+", "="].includes(k);
          const isFn = ["C", "±", "%", "⌫"].includes(k);
          return (
            <Cell
              key={k}
              r={Math.floor(i / 4)}
              c={i % 4}
              focus={focus}
              hover={nav.set}
              onClick={() => press(k)}
              soft
              className={cx(
                "flex h-16 items-center justify-center rounded-xl font-display text-2xl font-bold",
                k === "=" ? "text-[#07101c]" : isOp ? "text-slate-100" : isFn ? "text-slate-300" : "text-white",
                !isOp && !isFn && k !== "=" && "bg-white/[0.07]",
                isFn && "bg-white/[0.03]"
              )}
            >
              {k === "=" && (
                <span className="absolute inset-0 rounded-xl" style={{ background: "var(--accent)" }} />
              )}
              {isOp && k !== "=" && (
                <span className="absolute inset-0 rounded-xl opacity-25" style={{ background: "var(--accent)" }} />
              )}
              <span className="relative">{k}</span>
            </Cell>
          );
        })}
      </div>
    </div>
  );
}

function Notepad() {
  const [txt, setTxt] = useState(() => {
    try {
      return (
        localStorage.getItem("novadeck-notepad") ??
        "Welcome to NovaDeck Notepad.\n\nType anything — it autosaves on this PC, and Esc snaps you straight back to the launcher."
      );
    } catch {
      return "";
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("novadeck-notepad", txt);
    } catch {
      /* storage unavailable */
    }
  }, [txt]);
  return (
    <div className="flex h-full flex-col">
      <textarea
        autoFocus
        value={txt}
        onChange={(e) => setTxt(e.target.value)}
        spellCheck={false}
        placeholder="Start typing…"
        className="no-scrollbar h-full w-full flex-1 resize-none bg-transparent p-8 font-body text-lg leading-relaxed text-slate-200 outline-none"
      />
      <div className="flex items-center justify-between border-t border-white/[0.06] px-8 py-2.5 text-xs text-slate-500">
        <span>{txt.length} characters · autosaved on this PC</span>
        <span>Esc — save & return to launcher</span>
      </div>
    </div>
  );
}

function ClockFace() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const h = now.getHours() % 12;
  const m = now.getMinutes();
  const sec = now.getSeconds();
  const hDeg = h * 30 + m * 0.5;
  const mDeg = m * 6;
  const sDeg = sec * 6;
  return (
    <div className="flex h-full items-center justify-center gap-20">
      <svg viewBox="0 0 100 100" className="h-64 w-64">
        <circle cx="50" cy="50" r="48" fill="#0a101d" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
        {Array.from({ length: 12 }).map((_, i) => (
          <line
            key={i}
            x1="50"
            y1="6"
            x2="50"
            y2={i % 3 === 0 ? "13" : "10"}
            stroke={i % 3 === 0 ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.25)"}
            strokeWidth={i % 3 === 0 ? 2 : 1}
            transform={`rotate(${i * 30} 50 50)`}
          />
        ))}
        <line x1="50" y1="50" x2="50" y2="27" stroke="#e8eef7" strokeWidth="3.5" strokeLinecap="round" transform={`rotate(${hDeg} 50 50)`} />
        <line x1="50" y1="50" x2="50" y2="17" stroke="#e8eef7" strokeWidth="2.5" strokeLinecap="round" transform={`rotate(${mDeg} 50 50)`} />
        <line x1="50" y1="54" x2="50" y2="14" stroke="var(--accent)" strokeWidth="1.2" strokeLinecap="round" transform={`rotate(${sDeg} 50 50)`} />
        <circle cx="50" cy="50" r="2.4" fill="var(--accent)" />
      </svg>
      <div>
        <div className="font-display text-8xl font-extrabold tabular-nums tracking-tight text-white">
          {now.getHours().toString().padStart(2, "0")}:{now.getMinutes().toString().padStart(2, "0")}
          <span className="text-4xl text-slate-500">:{sec.toString().padStart(2, "0")}</span>
        </div>
        <div className="mt-3 text-lg text-slate-400">
          {now.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </div>
        <div className="mt-1 text-sm text-slate-600">
          {Intl.DateTimeFormat().resolvedOptions().timeZone} · Esc returns to the deck
        </div>
      </div>
    </div>
  );
}

function GenericApp({ app }: { app: AppDef }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 p-10 text-center">
      <span
        className="flex h-24 w-24 items-center justify-center rounded-xl shadow-xl"
        style={{ background: `linear-gradient(140deg, ${app.color}, ${shade(app.color, 0.45)})` }}
      >
        <Icon name={app.icon} className="h-12 w-12 text-white" />
      </span>
      <div>
        <div className="font-display text-3xl font-extrabold text-white">{app.name} is running</div>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-400">
          This is a NovaDeck quick window — a safe sandbox preview. To launch the real Windows program
          instead, point its target at a URI protocol.
        </p>
      </div>
      <div className="w-96 space-y-2.5">
        <div className="shimmer h-9 rounded-lg" />
        <div className="shimmer h-9 w-4/5 rounded-lg" />
        <div className="shimmer h-9 w-3/5 rounded-lg" />
      </div>
      <span className="rounded-full bg-white/[0.05] px-4 py-2 text-xs font-medium text-slate-500 ring-1 ring-white/10">
        Settings → Link real Windows apps · or press ? on the home screen
      </span>
    </div>
  );
}
