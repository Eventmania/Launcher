import { useEffect, useRef, useState } from "react";
import { fmtClock, grad, hashStr, type AppDef, type PdFilm } from "../data";
import { archivePage, streamCandidates } from "../lib/catalog";
import { useTvKeys, useTvNav } from "../lib/keys";
import { useStore } from "../lib/store";
import { useUI } from "../lib/ui";
import { cx, fireProtocol } from "../lib/util";
import { Icon } from "../icons";
import { Cell } from "./cards";

export function PlayerLayer() {
  const ui = useUI();
  const l = ui.layer;
  if (l?.type === "player") return <FilmPlayer film={l.film} />;
  if (l?.type === "miniapp") return <MiniApp app={l.app} />;
  return null;
}

/* ------------------------- real film player ------------------------- */

function FilmPlayer({ film }: { film: PdFilm }) {
  const ui = useUI();
  const { s, d } = useStore();
  const candidates = streamCandidates(film);
  const [srcIdx, setSrcIdx] = useState(0);
  const [t, setT] = useState(() =>
    Math.min(s.mediaProgress[film.id] ?? 0, film.runtimeMin * 60 - 8)
  );
  const [dur, setDur] = useState(film.runtimeMin * 60);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const videoRef = useRef<HTMLVideoElement>(null);
  const tRef = useRef(t);
  tRef.current = t;
  const lastSave = useRef(0);

  const save = (sec: number) => d({ type: "mediaProgress", id: film.id, t: sec });

  const close = () => {
    const cur = Math.floor(tRef.current);
    if (cur > 30) {
      save(cur);
      ui.toast("Progress saved — resume anytime from For You", "check");
    }
    ui.close();
  };

  const seek = (delta: number) => {
    const v = videoRef.current;
    if (!v) return;
    const nt = Math.max(0, Math.min((v.duration || dur) - 0.5, v.currentTime + delta));
    v.currentTime = nt;
    setT(nt);
  };

  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      void v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  /* full capture: the player owns every key */
  useTvKeys("film-player", 90, (e) => {
    switch (e.key) {
      case "ArrowLeft":
        seek(-10);
        return true;
      case "ArrowRight":
        seek(10);
        return true;
      case "Enter":
      case " ":
        toggle();
        return true;
      case "m":
      case "M":
        setMuted((m) => {
          if (videoRef.current) videoRef.current.muted = !m;
          return !m;
        });
        return true;
      case "r":
      case "R":
        if (videoRef.current) {
          videoRef.current.currentTime = 0;
          setT(0);
          void videoRef.current.play();
          setPlaying(true);
        }
        return true;
      case "Escape":
        close();
        return true;
      default:
        return true; /* swallow everything else */
    }
  });

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.min(tRef.current, Math.max(0, (v.duration || dur) - 8));
    void v.play().catch(() => setPlaying(false));
    const onTime = () => {
      setT(v.currentTime);
      const now = Date.now();
      if (now - lastSave.current > 5000 && v.currentTime > 10) {
        lastSave.current = now;
        save(v.currentTime);
      }
    };
    const onMeta = () => {
      if (isFinite(v.duration) && v.duration > 0) setDur(v.duration);
      setPhase("ready");
    };
    const onEnd = () => {
      setPlaying(false);
      save(0); /* finished — clear resume point */
    };
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("ended", onEnd);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("ended", onEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [srcIdx]);

  const nav = useTvNav({
    id: "player-controls",
    prio: 89,
    rows: 1,
    cols: () => 6,
    onEnter: (_r, c) => {
      if (c === 0) seek(-10);
      else if (c === 1) toggle();
      else if (c === 2) seek(10);
      else if (c === 3)
        setMuted((m) => {
          if (videoRef.current) videoRef.current.muted = !m;
          return !m;
        });
      else if (c === 4) {
        if (videoRef.current) {
          videoRef.current.currentTime = 0;
          setT(0);
          void videoRef.current.play();
          setPlaying(true);
        }
      } else close();
    },
  });

  const pct = dur ? Math.min(100, (t / dur) * 100) : 0;
  const btns: { icon: string; label: string }[] = [
    { icon: "chevL", label: "Back 10s" },
    { icon: playing ? "pause" : "play", label: playing ? "Pause" : t >= dur - 1 ? "Replay" : "Play" },
    { icon: "chevR", label: "Fwd 10s" },
    { icon: "music", label: muted ? "Unmute" : "Mute" },
    { icon: "restart", label: "Restart" },
    { icon: "x", label: "Exit" },
  ];

  return (
    <div className="fade-in fixed inset-0 z-50 flex flex-col bg-black">
      <video
        ref={videoRef}
        src={candidates[srcIdx]}
        className="absolute inset-0 h-full w-full object-contain"
        muted={muted}
        playsInline
        onError={() => {
          if (srcIdx + 1 < candidates.length) {
            setPhase("loading");
            setSrcIdx(srcIdx + 1);
          } else setPhase("error");
        }}
        onWaiting={() => setPhase("loading")}
        onPlaying={() => setPhase("ready")}
      />

      {/* top bar */}
      <div className="relative z-10 flex items-center gap-4 bg-gradient-to-b from-black/85 to-transparent px-10 pb-10 pt-6">
        <button
          onClick={close}
          className="rounded-full bg-white/10 p-2.5 text-white transition hover:bg-white/25"
          aria-label="Back"
        >
          <Icon name="back" className="h-4 w-4" />
        </button>
        <div>
          <div className="font-display text-xl font-extrabold text-white">{film.title}</div>
          <div className="text-xs font-medium text-slate-400">
            {film.year} · {film.genres.join(" · ")} · free public-domain stream via archive.org
          </div>
        </div>
        <span
          className="ml-auto rounded-md px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-[0.16em] text-[#07101c]"
          style={{ background: "var(--accent)" }}
        >
          Real stream
        </span>
      </div>

      <div className="flex-1" />

      {/* error state */}
      {phase === "error" && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#05070d]/95">
          <div className="max-w-md rounded-2xl border border-white/10 bg-[#0b101b] p-8 text-center">
            <div
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-full"
              style={{ background: grad(hashStr(film.id) % 360) }}
            >
              <Icon name="info" className="h-7 w-7 text-white" />
            </div>
            <div className="mt-4 font-display text-lg font-bold text-white">
              Stream unavailable right now
            </div>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              archive.org didn't serve this file (network issue or the item moved). You can open
              the film's real archive page and watch it there — your launcher keeps running.
            </p>
            <div className="mt-5 flex justify-center gap-3">
              <button
                onClick={() => fireProtocol(archivePage(film))}
                className="rounded-full px-5 py-2.5 font-display text-sm font-bold text-[#07101c]"
                style={{ background: "var(--accent)" }}
              >
                Open on archive.org
              </button>
              <button
                onClick={close}
                className="rounded-full bg-white/10 px-5 py-2.5 font-display text-sm font-semibold text-white"
              >
                Back (Esc)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* buffering */}
      {phase === "loading" && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <span className="spin-slow h-14 w-14 rounded-full border-4 border-white/15 border-t-white" />
        </div>
      )}

      {/* controls */}
      <div className="relative z-10 bg-gradient-to-t from-black/90 to-transparent px-10 pb-7 pt-14">
        <div
          className="group mb-5 h-2 cursor-pointer rounded-full bg-white/15"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const ratio = (e.clientX - rect.left) / rect.width;
            const v = videoRef.current;
            if (v && dur) {
              v.currentTime = ratio * dur;
              setT(ratio * dur);
            }
          }}
        >
          <div
            className="relative h-full rounded-full transition-[width] duration-200"
            style={{ width: `${pct}%`, background: "var(--accent)" }}
          >
            <span className="absolute -right-1.5 -top-1 h-4 w-4 rounded-full bg-white shadow" />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            {btns.map((b, i) => (
              <Cell
                key={b.label}
                r={0}
                c={i}
                focus={[nav.r, nav.c]}
                hover={nav.set}
                onClick={() => nav && [seek(-10), toggle, () => seek(10)][0]}
                soft
                className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white"
              >
                <Icon name={b.icon} filled={b.icon === "play" || b.icon === "pause"} className="h-5 w-5" />
              </Cell>
            ))}
          </div>
          <div className="text-sm font-semibold text-slate-200">
            {fmtClock(t)} <span className="text-slate-500">/ {fmtClock(dur)}</span>
          </div>
        </div>
        <div className="mt-3 text-xs text-slate-500">
          ←/→ seek 10s · Enter play/pause · M mute · R restart · Esc exits and saves your position
        </div>
      </div>
    </div>
  );
}

/* --------------------------- mini app windows ------------------------ */

function MiniApp({ app }: { app: AppDef }) {
  const ui = useUI();
  if (app.id === "notepad") return <NotepadApp />;
  return (
    <GenericSandbox
      name={app.name}
      color={app.color}
      icon={app.icon}
      onClose={ui.close}
    />
  );
}

function GenericSandbox({
  name,
  color,
  icon,
  onClose,
}: {
  name: string;
  color: string;
  icon: string;
  onClose: () => void;
}) {
  const nav = useTvNav({
    id: "sandbox",
    prio: 90,
    rows: 1,
    cols: () => 1,
    onEnter: () => onClose(),
    extra: (e) => {
      if (e.key === "Escape") {
        onClose();
        return true;
      }
      return true;
    },
  });
  return (
    <div className="fade-in fixed inset-0 z-50 flex items-center justify-center bg-[#05070d]/95 p-10">
      <div className="pop-in w-full max-w-md rounded-2xl border border-white/10 bg-[#0b101b] p-8 text-center">
        <div
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{ background: color }}
        >
          <Icon name={icon} className="h-8 w-8 text-white" />
        </div>
        <div className="mt-4 font-display text-xl font-bold text-white">{name}</div>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          This tile runs inside NovaDeck. For a real desktop program, edit it (⇧M on the tile)
          and point the target at a protocol like <code className="font-mono text-emerald-300">myapp://</code> —
          the Help guide (?) shows the one-time registry snippet.
        </p>
        <Cell
          r={0}
          c={0}
          focus={[nav.r, nav.c]}
          hover={nav.set}
          onClick={onClose}
          soft
          className="mx-auto mt-6 flex items-center gap-2 rounded-full bg-white/10 px-6 py-2.5 font-display font-semibold text-white"
        >
          <Icon name="back" className="h-4 w-4" />
          Back to launcher (Esc)
        </Cell>
      </div>
    </div>
  );
}

function NotepadApp() {
  const ui = useUI();
  const KEY = "novadeck-notepad";
  const [text, setText] = useState(() => {
    try {
      return localStorage.getItem(KEY) ?? "";
    } catch {
      return "";
    }
  });
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    taRef.current?.focus();
  }, []);

  const close = () => {
    try {
      localStorage.setItem(KEY, text);
    } catch {
      /* full */
    }
    ui.toast("Note saved on this PC", "check");
    ui.close();
  };

  useTvKeys("notepad", 90, (e) => {
    const typing = document.activeElement === taRef.current;
    if (e.key === "Escape") {
      if (typing) {
        taRef.current?.blur();
        return true;
      }
      close();
      return true;
    }
    return typing; /* swallow nav keys while typing */
  });

  return (
    <div className="fade-in fixed inset-0 z-50 bg-[#0a0d14]">
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 border-b border-white/10 bg-[#0b101b] px-8 py-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f4c542]">
            <Icon name="note" className="h-5 w-5 text-[#3a2c05]" />
          </span>
          <div>
            <div className="font-display text-base font-bold text-white">Notepad</div>
            <div className="text-xs text-slate-500">
              Autosaves on this PC · Esc twice returns to the launcher
            </div>
          </div>
          <button
            onClick={close}
            className="ml-auto flex items-center gap-2 rounded-full bg-white/8 px-4 py-2 text-sm font-semibold text-slate-200 ring-1 ring-white/10 transition hover:bg-white/15"
          >
            <Icon name="back" className="h-4 w-4" />
            Back to launcher
          </button>
        </div>
        <textarea
          ref={taRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => {
            try {
              localStorage.setItem(KEY, text);
            } catch {
              /* noop */
            }
          }}
          spellCheck={false}
          placeholder="Start typing… your note is saved on this PC."
          className="flex-1 resize-none bg-transparent px-8 py-6 font-mono text-[0.95rem] leading-relaxed text-slate-200 placeholder-slate-600 outline-none"
        />
        <div className="border-t border-white/10 bg-[#0b101b] px-8 py-2 text-xs text-slate-500">
          {text.length} characters · Esc once leaves the editor, Esc again closes
        </div>
      </div>
    </div>
  );
}

export { cx as _cx };
