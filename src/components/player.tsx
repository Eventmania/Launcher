import { useEffect, useRef, useState } from "react";
import { fmtClock, grad, hashStr, type AppDef, type MusicTrack } from "../data";
import { Icon } from "../icons";
import { useTvKeys, useTvNav } from "../lib/keys";
import { useStore } from "../lib/store";
import { useUI } from "../lib/ui";
import { fireProtocol } from "../lib/util";
import { Cell, CloseBtn } from "./cards";

export function PlayerLayer() {
  const ui = useUI();
  const l = ui.layer;
  if (!l) return null;
  if (l.type === "player")
    return (
      <VideoPlayer
        title={l.title}
        sub={l.sub}
        progressKey={l.progressKey}
        sources={l.sources}
        poster={l.poster}
        external={l.external}
      />
    );
  if (l.type === "music") return <MusicPlayer index={l.index} tracks={l.tracks} />;
  if (l.type === "miniapp") return <MiniApp app={l.app} />;
  return null;
}

/* --------------------------- video player ---------------------------- */

function VideoPlayer({
  title,
  sub,
  progressKey,
  sources,
  poster,
  external,
}: {
  title: string;
  sub: string;
  progressKey: string;
  sources: string[];
  poster?: string | null;
  external?: { label: string; url: string };
}) {
  const ui = useUI();
  const { s, d } = useStore();
  const [srcIdx, setSrcIdx] = useState(0);
  const [t, setT] = useState(() => Math.max(0, s.mediaProgress[progressKey] ?? 0));
  const [dur, setDur] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const videoRef = useRef<HTMLVideoElement>(null);
  const tRef = useRef(t);
  tRef.current = t;
  const lastSave = useRef(0);

  const save = (sec: number) => d({ type: "mediaProgress", id: progressKey, t: sec });

  const close = () => {
    const cur = Math.floor(tRef.current);
    if (cur > 30) {
      save(cur);
      ui.toast("Progress saved — resume from For You", "check");
    }
    ui.close();
  };

  const seek = (delta: number) => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    const nt = Math.max(0, Math.min(v.duration - 0.5, v.currentTime + delta));
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

  useTvKeys("video-player", 90, (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return false;
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
        return true;
    }
  });

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const start = Math.min(tRef.current, Math.max(0, (v.duration || Infinity) - 8));
    if (isFinite(start)) v.currentTime = start;
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
      if (isFinite(v.duration) && v.duration > 0) {
        setDur(v.duration);
        const st = Math.min(tRef.current, v.duration - 8);
        if (st > 0) v.currentTime = st;
      }
      setPhase("ready");
    };
    const onEnd = () => {
      setPlaying(false);
      save(0);
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

  const nBtns = 6 + (external ? 1 : 0);
  const nav = useTvNav({
    id: "player-controls",
    prio: 89,
    rows: 1,
    cols: () => nBtns,
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
      } else if (external && c === 5) fireProtocol(external.url);
      else close();
    },
  });
  const focus: [number, number] = [nav.r, nav.c];

  const btns: { icon: string; label: string; filled?: boolean }[] = [
    { icon: "chevL", label: "Back 10s" },
    { icon: playing ? "pause" : "play", label: playing ? "Pause" : "Play", filled: true },
    { icon: "chevR", label: "Forward 10s" },
    { icon: "music", label: muted ? "Unmute (M)" : "Mute (M)" },
    { icon: "restart", label: "Restart (R)" },
    ...(external ? [{ icon: "external", label: external.label }] : []),
    { icon: "x", label: "Exit (Esc)" },
  ];

  const pct = dur ? Math.min(100, (t / dur) * 100) : 0;

  return (
    <div className="fade-in fixed inset-0 z-50 flex flex-col bg-black">
      <CloseBtn onClick={close} label="Exit player" />
      <video
        ref={videoRef}
        src={sources[srcIdx]}
        poster={poster ?? undefined}
        className="absolute inset-0 h-full w-full object-contain"
        muted={muted}
        playsInline
        onError={() => {
          if (srcIdx + 1 < sources.length) {
            setPhase("loading");
            setSrcIdx(srcIdx + 1);
          } else setPhase("error");
        }}
        onWaiting={() => setPhase("loading")}
        onPlaying={() => setPhase("ready")}
      />

      <div className="relative z-10 flex items-center gap-4 bg-gradient-to-b from-black/85 to-transparent px-10 pb-10 pt-6">
        <button
          onClick={close}
          className="rounded-full bg-white/10 p-2.5 text-white transition hover:bg-white/25"
          aria-label="Back"
        >
          <Icon name="back" className="h-4 w-4" />
        </button>
        <div>
          <div className="font-display text-xl font-extrabold text-white">{title}</div>
          <div className="text-xs font-medium text-slate-400">{sub}</div>
        </div>
      </div>

      <div className="flex-1" />

      {phase === "error" && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#05070d]/95">
          <div className="max-w-md rounded-2xl border border-white/10 bg-[#0b101b] p-8 text-center">
            <div
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-full"
              style={{ background: grad(hashStr(title) % 360) }}
            >
              <Icon name="info" className="h-7 w-7 text-white" />
            </div>
            <div className="mt-4 font-display text-lg font-bold text-white">This stream won't play</div>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              The source didn't respond (offline, CORS-blocked, or unsupported codec). For network
              shares, try the VLC button — it hands the same URL to VLC.
            </p>
            <div className="mt-5 flex justify-center gap-3">
              {external && (
                <button
                  onClick={() => fireProtocol(external.url)}
                  className="rounded-full px-5 py-2.5 font-display text-sm font-bold text-[#07101c]"
                  style={{ background: "var(--accent)" }}
                >
                  {external.label}
                </button>
              )}
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

      {phase === "loading" && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <span className="spin-slow h-14 w-14 rounded-full border-4 border-white/15 border-t-white" />
        </div>
      )}

      <div className="relative z-10 bg-gradient-to-t from-black/90 to-transparent px-10 pb-7 pt-14">
        <div
          className="mb-5 h-2 cursor-pointer rounded-full bg-white/15"
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
          <div className="flex items-center gap-5">
            {btns.map((b, i) => (
              <Cell
                key={b.label}
                r={0}
                c={i}
                focus={focus}
                hover={nav.set}
                soft
                className="group flex flex-col items-center gap-1"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition group-hover:bg-white/20">
                  <Icon name={b.icon} filled={b.filled} className="h-5 w-5" />
                </span>
                <span className="text-[0.6rem] font-semibold uppercase tracking-wider text-slate-500">
                  {b.label}
                </span>
              </Cell>
            ))}
          </div>
          <div className="text-sm font-semibold text-slate-200">
            {fmtClock(t)} {dur > 0 && <span className="text-slate-500">/ {fmtClock(dur)}</span>}
          </div>
        </div>
        <div className="mt-3 text-xs text-slate-500">
          ←/→ seek · Enter play/pause · M mute · R restart · Esc saves position and exits
        </div>
      </div>
    </div>
  );
}

/* --------------------------- music player ---------------------------- */

function MusicPlayer({ index, tracks }: { index: number; tracks: MusicTrack[] }) {
  const ui = useUI();
  const [i, setI] = useState(index);
  const [playing, setPlaying] = useState(true);
  const [t, setT] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const tr = tracks[i];

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    setT(0);
    void a.play().catch(() => setPlaying(false));
  }, [i]);

  useTvKeys("music-player", 90, (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return false;
    if (e.key === "Escape") {
      ui.close();
      return true;
    }
    if (e.key === "ArrowLeft") {
      const a = audioRef.current;
      if (a) a.currentTime = Math.max(0, a.currentTime - 5);
      return true;
    }
    if (e.key === "ArrowRight") {
      const a = audioRef.current;
      if (a) a.currentTime = Math.min((a.duration || 30) - 0.2, a.currentTime + 5);
      return true;
    }
    if (e.key === "Enter" || e.key === " ") {
      const a = audioRef.current;
      if (!a) return true;
      if (a.paused) {
        void a.play();
        setPlaying(true);
      } else {
        a.pause();
        setPlaying(false);
      }
      return true;
    }
    return true;
  });

  const nav = useTvNav({
    id: "music-controls",
    prio: 89,
    rows: 1,
    cols: () => 4,
    onEnter: (_r, c) => {
      if (c === 0) setI((v) => (v + tracks.length - 1) % tracks.length);
      else if (c === 1) {
        const a = audioRef.current;
        if (!a) return;
        if (a.paused) {
          void a.play();
          setPlaying(true);
        } else {
          a.pause();
          setPlaying(false);
        }
      } else if (c === 2) setI((v) => (v + 1) % tracks.length);
      else ui.close();
    },
  });
  const focus: [number, number] = [nav.r, nav.c];

  return (
    <div className="fade-in fixed inset-0 z-50 flex items-center justify-center bg-[#05070d]/97">
      <CloseBtn onClick={ui.close} />
      <audio
        ref={audioRef}
        src={tr.preview}
        onTimeUpdate={(e) => setT(e.currentTarget.currentTime)}
        onEnded={() => setI((v) => (v + 1) % tracks.length)}
      />
      <div className="pop-in w-full max-w-lg px-10 text-center">
        <div className="text-[0.68rem] font-bold uppercase tracking-[0.28em] text-slate-500">
          Real preview · iTunes · track {i + 1}/{tracks.length}
        </div>
        <div
          className="relative mx-auto mt-5 h-64 w-64 overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/10"
          style={{ background: grad(hashStr(tr.id) % 360) }}
        >
          {tr.art && <img src={tr.art} alt="" className="h-full w-full object-cover" />}
          <div className="absolute inset-x-4 bottom-3 flex h-1.5 items-end gap-1">
            {Array.from({ length: 24 }).map((_, k) => (
              <span
                key={k}
                className="eq-bar w-full rounded-sm bg-white/80"
                style={{
                  animationDelay: `${k * 55}ms`,
                  animationPlayState: playing ? "running" : "paused",
                  height: "100%",
                }}
              />
            ))}
          </div>
        </div>
        <div className="mt-5 font-display text-2xl font-extrabold text-white">{tr.track}</div>
        <div className="mt-1 text-sm font-medium text-slate-400">{tr.artist}</div>

        <div className="mx-auto mt-5 h-1.5 w-72 rounded-full bg-white/15">
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.min(100, (t / 30) * 100)}%`, background: "var(--accent)" }}
          />
        </div>

        <div className="mt-6 flex items-center justify-center gap-5">
          {(
            [
              { icon: "chevL", label: "Previous" },
              { icon: playing ? "pause" : "play", label: playing ? "Pause" : "Play", filled: true },
              { icon: "chevR", label: "Next" },
              { icon: "x", label: "Close" },
            ] as { icon: string; label: string; filled?: boolean }[]
          ).map((b, c) => (
            <Cell key={b.label} r={0} c={c} focus={focus} hover={nav.set} soft className="group flex flex-col items-center gap-1">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white">
                <Icon name={b.icon} filled={b.filled} className="h-5 w-5" />
              </span>
              <span className="text-[0.6rem] font-semibold uppercase tracking-wider text-slate-500">{b.label}</span>
            </Cell>
          ))}
        </div>
        <p className="mt-5 text-xs text-slate-600">
          ←/→ seek · Enter play/pause · arrows walk the controls · Esc closes. Full track: open Spotify from Your Apps.
        </p>
      </div>
    </div>
  );
}

/* ---------------------------- mini apps ------------------------------ */

function MiniApp({ app }: { app: AppDef }) {
  const ui = useUI();
  if (app.id === "notepad") return <NotepadApp />;
  return (
    <GenericSandbox name={app.name} color={app.color} icon={app.icon} onClose={ui.close} />
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
    onEnter: (_r, c) => {
      if (c === 0) onClose();
    },
    extra: (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return false;
      if (e.key === "Escape") {
        onClose();
        return true;
      }
      return true;
    },
  });
  const focus: [number, number] = [nav.r, nav.c];
  return (
    <div className="fade-in fixed inset-0 z-50 flex items-center justify-center bg-[#05070d]/95 p-10">
      <CloseBtn onClick={onClose} />
      <div className="pop-in w-full max-w-md rounded-2xl border border-white/10 bg-[#0b101b] p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: color }}>
          <Icon name={icon} className="h-8 w-8 text-white" />
        </div>
        <div className="mt-4 font-display text-xl font-bold text-white">{name}</div>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          This tile runs inside NovaDeck. To launch a real desktop program instead, edit it (⇧M on
          the tile) and point the target at a protocol — the Help guide (?) has the one-time
          registry snippet.
        </p>
        <div className="mt-6 flex items-center justify-center gap-4">
          <Cell r={0} c={0} focus={focus} hover={nav.set} onClick={onClose} soft
            className="flex items-center gap-2 rounded-full bg-white/10 px-6 py-2.5 font-display font-semibold text-white"
          >
            <Icon name="back" className="h-4 w-4" /> Back (Esc)
          </Cell>
        </div>
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
    if (e.ctrlKey || e.metaKey || e.altKey) return false;
    const typing = document.activeElement === taRef.current;
    if (e.key === "Escape") {
      if (typing) {
        taRef.current?.blur();
        return true;
      }
      close();
      return true;
    }
    return typing;
  });

  return (
    <div className="fade-in fixed inset-0 z-50 bg-[#0a0d14]">
      <CloseBtn onClick={close} label="Back to launcher" />
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 border-b border-white/10 bg-[#0b101b] px-8 py-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f4c542]">
            <Icon name="note" className="h-5 w-5 text-[#3a2c05]" />
          </span>
          <div>
            <div className="font-display text-base font-bold text-white">Notepad</div>
            <div className="text-xs text-slate-500">Autosaves on this PC · Esc twice returns to the launcher</div>
          </div>
          <button
            onClick={close}
            className="ml-auto mr-16 flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-slate-200 ring-1 ring-white/10 transition hover:bg-white/20"
          >
            <Icon name="back" className="h-4 w-4" /> Back to launcher
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
