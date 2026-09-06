import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ACCENTS,
  CATEGORIES,
  WALLS,
  fmtDur,
  type AppDef,
  type AppKind,
  type PdFilm,
  type TonightItem,
  type TvShow,
  type WikiFilm,
} from "../data";
import { archivePage, searchShows, searchWiki, wikiSummary } from "../lib/catalog";
import { useTvKeys, useTvNav } from "../lib/keys";
import { sfx } from "../lib/sound";
import { useStore } from "../lib/store";
import { useUI } from "../lib/ui";
import { cx, detectKind, fireProtocol, shade } from "../lib/util";
import { Icon, Logo } from "../icons";
import { Cell, FilmCard, ShowCard, WikiCard } from "./cards";

const ICON_CHOICES = [
  "globe", "play", "film", "music", "gamepad", "chat", "code", "note",
  "calc", "clock", "camera", "bag", "folder", "terminal", "tv", "spark",
];
const TILE_COLORS = [
  "#2563eb", "#7c3aed", "#db2777", "#dc2626", "#ea580c", "#d97706",
  "#16a34a", "#0d9488", "#0284c7", "#4f46e5", "#334155", "#0f766e",
];
const WALL_NAMES = ["Ember", "Forest", "Void"];
const KIND_LABEL: Record<AppKind, string> = {
  url: "Opens in a new browser tab",
  protocol: "Asks Windows to launch a program",
  sim: "Runs inside NovaDeck (Esc returns)",
};

function Shell({
  children,
  wide = false,
  onClose,
}: {
  children: ReactNode;
  wide?: boolean;
  onClose: () => void;
}) {
  useTvKeys("shell-esc", 55, (e) => {
    if (e.key === "Escape") {
      onClose();
      sfx("back");
      return true;
    }
    return false;
  });
  return (
    <div className="fade-in fixed inset-0 z-50 flex items-center justify-center bg-[#05070d]/85 p-10 backdrop-blur-md">
      <div
        className={cx(
          "pop-in max-h-full w-full overflow-y-auto no-scrollbar rounded-2xl border border-white/10 bg-[#0b101b] shadow-2xl",
          wide ? "max-w-5xl" : "max-w-3xl"
        )}
      >
        {children}
      </div>
    </div>
  );
}

function Head({ title, kicker, onClose }: { title: string; kicker?: string; onClose: () => void }) {
  return (
    <div className="flex items-start justify-between border-b border-white/10 px-8 py-5">
      <div>
        <div
          className="text-[0.65rem] font-bold uppercase tracking-[0.28em]"
          style={{ color: "var(--accent)" }}
        >
          {kicker ?? "NovaDeck"}
        </div>
        <h2 className="mt-1 font-display text-2xl font-extrabold text-white">{title}</h2>
      </div>
      <button
        onClick={onClose}
        className="rounded-full bg-white/5 p-2.5 text-slate-400 transition hover:bg-white/15 hover:text-white"
        aria-label="Close"
      >
        <Icon name="x" className="h-4 w-4" />
      </button>
    </div>
  );
}

/* --------------------------- DETAILS (film/show/episode/wiki) --------------------------- */

export function DetailsOverlay() {
  const ui = useUI();
  const { s, d } = useStore();
  const layer = ui.layer;
  if (
    !layer ||
    (layer.type !== "film" &&
      layer.type !== "show" &&
      layer.type !== "episode" &&
      layer.type !== "wiki")
  )
    return null;

  let art: string | null = null;
  let kicker = "";
  let title = "";
  let meta: string[] = [];
  let desc = "";
  const buttons: { label: string; icon: string; act: () => void; primary?: boolean }[] = [];

  if (layer.type === "film") {
    const f: PdFilm = layer.film;
    art = f.img;
    kicker = "Real Cinema · free public-domain stream";
    title = f.title;
    meta = [String(f.year), f.maturity, fmtDur(f.runtimeMin), f.genres.join(" · "), "archive.org"];
    desc = f.desc;
    const listed = s.favMedia.includes(f.id);
    buttons.push(
      {
        label: s.mediaProgress[f.id] ? "Resume" : "Play",
        icon: "play",
        primary: true,
        act: () => ui.playFilm(f),
      },
      {
        label: listed ? "On Watchlist" : "Watchlist",
        icon: listed ? "check" : "plus",
        act: () => {
          d({ type: "favMedia", id: f.id });
          ui.toast(listed ? "Removed from Watchlist" : "Added to Watchlist", "star");
        },
      },
      {
        label: "archive.org page",
        icon: "external",
        act: () => fireProtocol(archivePage(f)),
      }
    );
  } else if (layer.type === "show") {
    const x: TvShow = layer.show;
    art = x.img;
    kicker = `Series · ${x.network} · ${x.status}`;
    title = x.name;
    meta = [
      x.rating ? `★ ${x.rating.toFixed(1)}` : "Unrated",
      String(x.year || "—"),
      `${x.runtime}m episodes`,
      x.schedule || "—",
      x.genres.join(" · "),
    ];
    desc = x.summary;
    const listed = s.favMedia.includes(x.id);
    buttons.push({
      label: listed ? "On Watchlist" : "Watchlist",
      icon: listed ? "check" : "plus",
      primary: true,
      act: () => {
        d({ type: "favMedia", id: x.id });
        ui.toast(listed ? "Removed from Watchlist" : "Added to Watchlist", "star");
      },
    });
    if (x.site)
      buttons.push({
        label: `Watch on ${x.network}`,
        icon: "play",
        act: () => fireProtocol(x.site!),
      });
    buttons.push({
      label: "TVMaze page",
      icon: "external",
      act: () => fireProtocol(`https://www.tvmaze.com/shows/${x.tvmazeId}`),
    });
  } else if (layer.type === "episode") {
    const e: TonightItem = layer.ep;
    art = e.img;
    kicker = `Airing tonight · ${e.time} on ${e.network}`;
    title = e.show;
    meta = [e.tag, `“${e.episode}”`, e.network, e.genres.join(" · ") || "TV"];
    desc = e.summary || `${e.show} — ${e.tag} “${e.episode}” airs tonight at ${e.time} on ${e.network}.`;
    buttons.push({
      label: "Show on TVMaze",
      icon: "tv",
      primary: true,
      act: () => fireProtocol(`https://www.tvmaze.com/shows/${e.tvmazeShow}`),
    });
    if (e.site)
      buttons.push({
        label: "Official site",
        icon: "external",
        act: () => fireProtocol(e.site!),
      });
  } else {
    const w: WikiFilm = layer.wiki;
    art = w.imageLg || w.image;
    kicker = "Film · live data from Wikipedia";
    title = w.title;
    meta = [w.year ? String(w.year) : "Film", w.desc || "Feature film"];
    desc = w.extract || w.desc;
    const listed = s.favMedia.includes(w.id);
    buttons.push({
      label: "Read on Wikipedia",
      icon: "external",
      primary: true,
      act: () => fireProtocol(w.url),
    });
    buttons.push({
      label: listed ? "On Watchlist" : "Watchlist",
      icon: listed ? "check" : "plus",
      act: () => {
        d({ type: "favMedia", id: w.id });
        ui.toast(listed ? "Removed from Watchlist" : "Added to Watchlist", "star");
      },
    });
  }

  const nav = useTvNav({
    id: "details",
    prio: 70,
    rows: 1,
    cols: () => buttons.length,
    onEnter: (_r, c) => buttons[c]?.act(),
  });

  return (
    <Shell wide onClose={ui.close}>
      <div className="relative">
        <div className="grain relative h-72 overflow-hidden rounded-t-2xl" style={{ background: "#101724" }}>
          {art && (
            <img src={art} alt="" className="h-full w-full object-cover" draggable={false} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b101b] via-[#0b101b]/40 to-transparent" />
          <button
            onClick={ui.close}
            className="absolute right-5 top-5 rounded-full bg-black/45 p-2.5 text-slate-200 backdrop-blur transition hover:bg-black/70"
            aria-label="Back"
          >
            <Icon name="back" className="h-4 w-4" />
          </button>
        </div>
        <div className="-mt-20 px-8 pb-8">
          <div
            className="text-[0.68rem] font-bold uppercase tracking-[0.26em]"
            style={{ color: "var(--accent)" }}
          >
            {kicker}
          </div>
          <h2 className="mt-1 font-display text-4xl font-extrabold text-white">{title}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2.5 text-sm text-slate-300">
            {meta.map((m, i) => (
              <span
                key={i}
                className={cx(
                  "rounded-md px-2 py-0.5",
                  i === 0 ? "font-bold text-amber-300" : "bg-white/8"
                )}
              >
                {m}
              </span>
            ))}
          </div>
          <p className="mt-3 max-w-3xl text-[0.95rem] leading-relaxed text-slate-300">{desc}</p>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            {buttons.map((b, i) => (
              <Cell
                key={b.label}
                r={0}
                c={i}
                focus={[nav.r, nav.c]}
                hover={nav.set}
                onClick={b.act}
                soft
                className={cx(
                  "relative flex items-center gap-2.5 rounded-full px-7 py-3 font-display text-base font-semibold",
                  b.primary
                    ? "text-[#07101c]"
                    : "bg-white/10 text-slate-200"
                )}
              >
                {b.primary && (
                  <span className="absolute inset-0 rounded-full" style={{ background: "var(--accent)" }} />
                )}
                <span className="relative flex items-center gap-2.5">
                  <Icon name={b.icon} filled={b.icon === "play"} className="h-5 w-5" />
                  {b.label}
                </span>
              </Cell>
            ))}
          </div>
        </div>
      </div>
    </Shell>
  );
}

/* ------------------------------- SEARCH ------------------------------ */

type Result =
  | { kind: "app"; app: AppDef }
  | { kind: "show"; show: TvShow }
  | { kind: "wiki"; wiki: WikiFilm };

export function SearchOverlay() {
  const ui = useUI();
  const { s } = useStore();
  const seed = ui.layer?.type === "search" ? (ui.layer.seed ?? "") : "";
  const [q, setQ] = useState(seed);
  const [shows, setShows] = useState<TvShow[]>([]);
  const [wikis, setWikis] = useState<WikiFilm[]>([]);
  const [busy, setBusy] = useState(false);
  const [opening, setOpening] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const seq = useRef(0);

  useEffect(() => {
    if (!q.trim()) {
      setShows([]);
      setWikis([]);
      setBusy(false);
      return;
    }
    const id = ++seq.current;
    setBusy(true);
    const t = setTimeout(() => {
      const run = async () => {
        const [a, b] = await Promise.allSettled([
          searchShows(q.trim()),
          searchWiki(q.trim()),
        ]);
        if (seq.current !== id) return;
        if (a.status === "fulfilled") setShows(a.value);
        if (b.status === "fulfilled") setWikis(b.value);
        setBusy(false);
      };
      void run();
    }, 400);
    return () => clearTimeout(t);
  }, [q]);

  const apps = useMemo(
    () =>
      q.trim()
        ? s.apps.filter(
            (a) =>
              a.name.toLowerCase().includes(q.trim().toLowerCase()) ||
              a.cat.toLowerCase().includes(q.trim().toLowerCase())
          )
        : s.apps.slice(0, 6),
    [q, s.apps]
  );

  const results: Result[] = [
    ...apps.slice(0, 6).map((app) => ({ kind: "app", app }) as Result),
    ...shows.slice(0, 6).map((show) => ({ kind: "show", show }) as Result),
    ...wikis.slice(0, 4).map((wiki) => ({ kind: "wiki", wiki }) as Result),
  ];

  const activate = (res: Result) => {
    if (res.kind === "app") ui.openApp(res.app);
    else if (res.kind === "show") ui.openShow(res.show);
    else {
      const full = decodeURIComponent(res.wiki.url.split("/wiki/").pop() || res.wiki.title);
      setOpening(res.wiki.title);
      void wikiSummary(full).then((w) => {
        setOpening(null);
        if (w) ui.openWiki(w);
        else ui.toast("Couldn't load that page", "info");
      });
    }
  };

  useTvKeys("search-input", 72, (e) => {
    const typing = document.activeElement === inputRef.current;
    if (typing) {
      if (e.key === "Escape") {
        inputRef.current?.blur();
        return true;
      }
      if (e.key === "Enter") {
        inputRef.current?.blur();
        return true;
      }
      return false; // let the input handle its own typing
    }
    if (e.key === "Escape") return false; // shell closes
    return false;
  });

  const nav = useTvNav({
    id: "search-grid",
    prio: 71,
    rows: 2,
    cols: (r) => (r === 0 ? 1 : Math.max(1, results.length)),
    onEnter: (r, c) => {
      if (r === 0) inputRef.current?.focus();
      else if (results[c]) activate(results[c]);
    },
    onEdge: (r, _c, dir) => {
      if (r === 0 && dir === "down" && results.length) nav.move(1, 0);
    },
    extra: (e) => {
      const typing = document.activeElement === inputRef.current;
      if (typing) return false;
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        setQ((v) => v + e.key);
        sfx("move");
        return true;
      }
      if (e.key === "Backspace") {
        setQ((v) => v.slice(0, -1));
        return true;
      }
      return false;
    },
  });

  return (
    <Shell wide onClose={ui.close}>
      <div className="px-8 py-6">
        <div className="flex items-center gap-3">
          <Logo className="h-6 w-6" />
          <span className="font-display text-lg font-bold text-white">Search everything</span>
          <span className="ml-auto text-xs text-slate-500">
            Real results · TVMaze + Wikipedia + your apps
          </span>
        </div>
        <Cell
          r={0}
          c={0}
          focus={[nav.r, nav.c]}
          hover={nav.set}
          onClick={() => inputRef.current?.focus()}
          soft
          className="mt-4 flex w-full items-center gap-3 rounded-xl bg-white/6 px-5 py-4 ring-1 ring-white/10"
        >
          <Icon name="search" className="h-5 w-5 text-slate-400" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Type a show, film or app…"
            className="w-full bg-transparent text-lg text-white placeholder-slate-500 outline-none"
          />
          {busy && (
            <span className="spin-slow h-4 w-4 rounded-full border-2 border-white/20 border-t-white" />
          )}
        </Cell>

        {results.length === 0 && !busy && q.trim() && (
          <div className="mt-8 rounded-xl border border-dashed border-white/15 px-6 py-8 text-center text-sm text-slate-400">
            No matches for “{q}” — check the spelling, or press Esc to go back.
          </div>
        )}
        {results.length === 0 && !busy && !q.trim() && (
          <div className="mt-8 text-sm text-slate-500">
            Start typing to search real shows, films and your installed apps.
          </div>
        )}

        {results.length > 0 && (
          <div className="no-scrollbar mt-6 flex gap-4 overflow-x-auto pb-2">
            {results.map((res, i) => (
              <Cell
                key={
                  res.kind === "app"
                    ? "a-" + res.app.id
                    : res.kind === "show"
                      ? "s-" + res.show.id
                      : "w-" + res.wiki.id
                }
                r={1}
                c={i}
                focus={[nav.r, nav.c]}
                hover={nav.set}
                onClick={() => activate(res)}
                className="shrink-0"
              >
                {res.kind === "app" ? (
                  <div className="flex w-44 flex-col items-center gap-2">
                    <div
                      className="flex h-24 w-full items-center justify-center rounded-xl ring-1 ring-white/10"
                      style={{
                        background: `linear-gradient(140deg, ${res.app.color}, ${shade(res.app.color, 0.45)})`,
                      }}
                    >
                      <Icon name={res.app.icon} className="h-9 w-9 text-white" />
                    </div>
                    <div className="w-full truncate text-center text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      App · {res.app.name}
                    </div>
                  </div>
                ) : res.kind === "show" ? (
                  <div>
                    <ShowCard s={res.show} />
                    <div className="mt-1 text-center text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Show · TVMaze
                    </div>
                  </div>
                ) : (
                  <div>
                    <WikiCard w={res.wiki} />
                    <div className="mt-1 text-center text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {opening === res.wiki.title ? "Loading…" : "Film · Wikipedia"}
                    </div>
                  </div>
                )}
              </Cell>
            ))}
          </div>
        )}
      </div>
    </Shell>
  );
}

/* ------------------------------ SETTINGS ----------------------------- */

export function SettingsOverlay() {
  const ui = useUI();
  const { s, d } = useStore();
  const [armedReset, setArmedReset] = useState(false);

  useEffect(() => {
    if (!armedReset) return;
    const t = setTimeout(() => setArmedReset(false), 3000);
    return () => clearTimeout(t);
  }, [armedReset]);

  const toggleRows = [
    {
      label: `Clock: ${s.settings.clock24 ? "24-hour" : "12-hour"}`,
      icon: "clock",
      act: () => d({ type: "settings", patch: { clock24: !s.settings.clock24 } }),
    },
    {
      label: `Sounds: ${s.settings.sound ? "On" : "Off"}`,
      icon: "music",
      act: () => {
        d({ type: "settings", patch: { sound: !s.settings.sound } });
        ui.toast(s.settings.sound ? "Navigation sounds off" : "Navigation sounds on", "music");
      },
    },
    { label: "Help & keys", icon: "keyboard", act: () => ui.setLayer({ type: "help" }) },
    {
      label: armedReset ? "Enter again to wipe" : "Factory reset",
      icon: "restart",
      act: () => {
        if (!armedReset) {
          setArmedReset(true);
          sfx("error");
          return;
        }
        d({ type: "reset" });
        ui.toast("NovaDeck reset — fresh start", "restart");
        ui.close();
      },
    },
  ];

  const nav = useTvNav({
    id: "settings",
    prio: 70,
    rows: 3,
    cols: (r) => (r === 0 ? WALLS.length : r === 1 ? ACCENTS.length : toggleRows.length),
    onEnter: (r, c) => {
      if (r === 0) {
        d({ type: "settings", patch: { wall: c } });
        ui.toast(`Wallpaper: ${WALL_NAMES[c]}`, "spark");
      } else if (r === 1) {
        document.documentElement.style.setProperty("--accent", ACCENTS[c].hex);
        d({ type: "settings", patch: { accent: c } });
        ui.toast(`Accent: ${ACCENTS[c].name}`, "spark");
      } else toggleRows[c]?.act();
    },
  });
  const focus: [number, number] = [nav.r, nav.c];

  return (
    <Shell onClose={ui.close}>
      <Head title="Settings" kicker="NovaDeck" onClose={ui.close} />
      <div className="space-y-7 px-8 py-6">
        <div>
          <div className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
            Wallpaper
          </div>
          <div className="flex gap-4">
            {WALLS.map((w, i) => (
              <Cell
                key={w}
                r={0}
                c={i}
                focus={focus}
                hover={nav.set}
                onClick={() => {
                  d({ type: "settings", patch: { wall: i } });
                  ui.toast(`Wallpaper: ${WALL_NAMES[i]}`, "spark");
                }}
                className={cx(
                  "relative h-20 w-40 overflow-hidden rounded-xl ring-1",
                  s.settings.wall === i ? "ring-white/60" : "ring-white/10"
                )}
              >
                <img src={w} alt={WALL_NAMES[i]} className="h-full w-full object-cover" draggable={false} />
                <span className="absolute bottom-1 left-2 text-[0.68rem] font-bold text-white drop-shadow">
                  {WALL_NAMES[i]}
                </span>
                {s.settings.wall === i && (
                  <span className="absolute right-1.5 top-1.5 rounded-full bg-black/50 p-1 text-white">
                    <Icon name="check" className="h-3 w-3" />
                  </span>
                )}
              </Cell>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
            Accent color
          </div>
          <div className="flex gap-4">
            {ACCENTS.map((a, i) => (
              <Cell
                key={a.name}
                r={1}
                c={i}
                focus={focus}
                hover={nav.set}
                onClick={() => {
                  document.documentElement.style.setProperty("--accent", a.hex);
                  d({ type: "settings", patch: { accent: i } });
                  ui.toast(`Accent: ${a.name}`, "spark");
                }}
                className="flex items-center gap-2.5 rounded-xl bg-white/5 px-4 py-3 ring-1 ring-white/10"
              >
                <span className="h-5 w-5 rounded-full" style={{ background: a.hex }} />
                <span className="text-sm font-semibold text-slate-200">{a.name}</span>
                {s.settings.accent === i && <Icon name="check" className="h-4 w-4 text-white" />}
              </Cell>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
            System
          </div>
          <div className="flex flex-wrap gap-4">
            {toggleRows.map((t, i) => (
              <Cell
                key={t.label}
                r={2}
                c={i}
                focus={focus}
                hover={nav.set}
                onClick={t.act}
                soft
                className={cx(
                  "flex items-center gap-2.5 rounded-xl px-5 py-3 ring-1 ring-white/10",
                  armedReset && i === 3 ? "bg-red-600/25" : "bg-white/5"
                )}
              >
                <Icon name={t.icon} className="h-4.5 w-4.5 text-slate-300" />
                <span className="text-sm font-semibold text-slate-200">{t.label}</span>
              </Cell>
            ))}
          </div>
        </div>
        <p className="text-xs leading-relaxed text-slate-500">
          NovaDeck 2.0 · Live content: TVMaze (shows & tonight) · archive.org (public-domain
          cinema) · Wikipedia (film data). Your apps, progress and settings never leave this PC.
        </p>
      </div>
    </Shell>
  );
}

/* -------------------------------- HELP ------------------------------- */

export function HelpOverlay() {
  const ui = useUI();
  const rows: [string, string][] = [
    ["← ↑ → ↓", "Move focus — the white ring is your remote"],
    ["Enter", "Open / play / activate"],
    ["Esc", "Back — works from any screen, app window or player"],
    ["Any letter", "Jump straight into Search from anywhere"],
    ["⇧ M or right-click", "Options for the focused app (favorite / edit / remove)"],
    ["F11", "Full-screen TV mode (browser)"],
    ["Alt + Tab", "Return to NovaDeck after launching a Windows program"],
  ];
  return (
    <Shell onClose={ui.close}>
      <Head title="Keys & launching real programs" kicker="Guide" onClose={ui.close} />
      <div className="space-y-6 px-8 py-6">
        <div className="grid gap-2.5">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-center gap-4">
              <span className="w-44 shrink-0 rounded-lg bg-white/8 px-3 py-1.5 text-center font-display text-sm font-bold text-white ring-1 ring-white/10">
                {k}
              </span>
              <span className="text-sm text-slate-300">{v}</span>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <div className="font-display text-sm font-bold text-white">
            Launch any .exe on this PC from a tile
          </div>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-[0.82rem] leading-relaxed text-slate-300">
            <li>
              In Notepad, create <code className="rounded bg-black/40 px-1">novadeck-movies.reg</code> with:
              <pre className="mt-2 overflow-x-auto rounded-lg bg-black/50 p-3 text-[0.72rem] leading-relaxed text-emerald-300">{`Windows Registry Editor Version 5.00

[HKEY_CLASSES_ROOT\\novadeck-movies]
@="URL:NovaDeck Movies"
"URL Protocol"=""

[HKEY_CLASSES_ROOT\\novadeck-movies\\shell\\open\\command]
@="\\"C:\\\\Path\\\\To\\\\YourApp.exe\\""`}</pre>
            </li>
            <li>Double-click the .reg file to register the protocol (one time only).</li>
            <li>
              In NovaDeck: <b>Apps → Add app</b>, set the target to{" "}
              <code className="rounded bg-black/40 px-1">novadeck-movies://</code> — kind shows as{" "}
              <b>PC</b>. Enter on that tile now launches the real program; Windows may ask to
              confirm once.
            </li>
            <li>
              NovaDeck never closes while your program runs — <b>Alt + Tab</b> back, or press{" "}
              <b>Esc</b> inside NovaDeck quick windows.
            </li>
          </ol>
          <p className="mt-3 text-[0.75rem] text-slate-500">
            Built-in <b>PC</b> tiles already use real Windows protocols: Steam (steam://), VS Code
            (vscode://), Calculator, Paint, Photos, Settings, Xbox, Terminal, Microsoft Store and
            more.
          </p>
        </div>
      </div>
    </Shell>
  );
}

/* ---------------------------- APP OPTIONS ---------------------------- */

export function AppOptionsOverlay() {
  const ui = useUI();
  const { s, d } = useStore();
  const layer = ui.layer;
  const app = layer?.type === "appOptions" ? layer.app : null;
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);

  const options = useMemo(() => {
    if (!app) return [];
    const fav = s.favApps.includes(app.id);
    return [
      { label: "Launch", icon: "play", act: () => ui.openApp(app) },
      {
        label: fav ? "Remove from favorites" : "Add to favorites",
        icon: "star",
        act: () => {
          d({ type: "favApp", id: app.id });
          ui.toast(fav ? "Removed from favorites" : "Pinned to favorites", "star");
        },
      },
      { label: "Edit", icon: "pencil", act: () => ui.openAddApp(app) },
      {
        label: armed ? "Press Enter again to remove" : "Remove",
        icon: "trash",
        danger: true,
        act: () => {
          if (!armed) {
            setArmed(true);
            sfx("error");
            return;
          }
          d({ type: "removeApp", id: app.id });
          ui.toast(`${app.name} removed`, "trash");
          ui.close();
        },
      },
      { label: "Close", icon: "x", act: () => ui.close() },
    ];
  }, [app, s.favApps, armed, ui, d]);

  const nav = useTvNav({
    id: "app-opts",
    prio: 70,
    rows: 1,
    cols: () => options.length,
    onEnter: (_r, c) => options[c]?.act(),
  });

  if (!app) return null;
  return (
    <Shell onClose={ui.close}>
      <Head title={app.name} kicker={`${app.cat} · ${KIND_LABEL[app.kind]}`} onClose={ui.close} />
      <div className="px-8 py-6">
        <div className="flex items-center gap-5">
          <div
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl ring-1 ring-white/10"
            style={{ background: `linear-gradient(140deg, ${app.color}, ${shade(app.color, 0.45)})` }}
          >
            <Icon name={app.icon} className="h-10 w-10 text-white" />
          </div>
          <div className="min-w-0">
            <div className="truncate font-display text-lg font-bold text-white">{app.name}</div>
            <div className="mt-0.5 truncate text-sm text-slate-400">{app.blurb}</div>
            <div className="mt-1 truncate font-mono text-xs text-slate-500">
              {app.target || "(runs inside NovaDeck)"}
            </div>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3.5">
          {options.map((o, i) => (
            <Cell
              key={o.label}
              r={0}
              c={i}
              focus={[nav.r, nav.c]}
              hover={nav.set}
              onClick={o.act}
              soft
              className={cx(
                "flex items-center gap-2.5 rounded-full px-6 py-3 font-display text-[0.95rem] font-semibold ring-1 ring-white/10",
                "danger" in o && o.danger
                  ? armed
                    ? "bg-red-600/40 text-white"
                    : "bg-red-600/15 text-red-300"
                  : "bg-white/6 text-slate-200"
              )}
            >
              <Icon name={o.icon} className="h-4.5 w-4.5" />
              {o.label}
            </Cell>
          ))}
        </div>
      </div>
    </Shell>
  );
}

/* ------------------------------ ADD / EDIT APP ------------------------------ */

export function AddAppOverlay() {
  const ui = useUI();
  const { d } = useStore();
  const editing = ui.layer?.type === "addApp" ? ui.layer.app : undefined;

  const [name, setName] = useState(editing?.name ?? "");
  const [target, setTarget] = useState(editing?.target ?? "");
  const [cat, setCat] = useState(editing?.cat ?? "Entertainment");
  const [icon, setIcon] = useState(editing?.icon ?? "globe");
  const [color, setColor] = useState(editing?.color ?? "#2563eb");
  const [kind, setKind] = useState<AppKind | "auto">(editing?.kind ?? "auto");
  const nameRef = useRef<HTMLInputElement>(null);
  const targetRef = useRef<HTMLInputElement>(null);

  const detected = detectKind(target);
  const effKind: AppKind = kind === "auto" ? detected : kind;
  const kindOptions: { v: AppKind | "auto"; label: string }[] = [
    { v: "auto", label: `Auto · ${detected}` },
    { v: "url", label: "Web tab" },
    { v: "protocol", label: "PC program" },
    { v: "sim", label: "In-launcher" },
  ];

  const save = () => {
    const nm = name.trim();
    if (!nm) {
      ui.toast("Give the app a name first", "info");
      sfx("error");
      return;
    }
    const app: AppDef = {
      id: editing?.id ?? "app-" + Date.now().toString(36),
      name: nm,
      cat,
      icon,
      color,
      target: target.trim(),
      kind: effKind,
      builtIn: editing?.builtIn,
      blurb: editing?.blurb ?? KIND_LABEL[effKind],
    };
    if (editing) {
      d({ type: "updateApp", app });
      ui.toast(`${nm} updated`, "check");
    } else {
      d({ type: "addApp", app });
      ui.toast(`${nm} added to your apps`, "check");
    }
    ui.close();
  };

  const rows = 7;
  const nav = useTvNav({
    id: "add-app",
    prio: 70,
    rows,
    cols: (r) =>
      r === 0 || r === 1 ? 1 : r === 2 ? 1 : r === 3 ? ICON_CHOICES.length : r === 4 ? TILE_COLORS.length : r === 5 ? kindOptions.length : 2,
    onEnter: (r, c) => {
      if (r === 0) nameRef.current?.focus();
      else if (r === 1) targetRef.current?.focus();
      else if (r === 2) {
        const i = CATEGORIES.indexOf(cat);
        setCat(CATEGORIES[(i + 1) % CATEGORIES.length]);
        sfx("tab");
      } else if (r === 3) setIcon(ICON_CHOICES[c]);
      else if (r === 4) setColor(TILE_COLORS[c]);
      else if (r === 5) {
        setKind(kindOptions[c].v);
        sfx("tab");
      } else if (c === 0) save();
      else ui.close();
    },
    extra: (e) => {
      const typing =
        document.activeElement === nameRef.current ||
        document.activeElement === targetRef.current;
      if (!typing) return false;
      if (e.key === "Escape" || e.key === "Enter") {
        (document.activeElement as HTMLInputElement).blur();
        return true;
      }
      return false;
    },
  });
  const focus: [number, number] = [nav.r, nav.c];

  const field = (r: number, ref: React.RefObject<HTMLInputElement>, label: string, value: string, set: (v: string) => void, placeholder: string, mono = false) => (
    <div>
      <div className="mb-1.5 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">{label}</div>
      <Cell
        r={r}
        c={0}
        focus={focus}
        hover={nav.set}
        onClick={() => ref.current?.focus()}
        soft
        className="flex w-full items-center rounded-xl bg-white/6 px-4 py-3 ring-1 ring-white/10"
      >
        <input
          ref={ref}
          value={value}
          onChange={(e) => set(e.target.value)}
          placeholder={placeholder}
          className={cx(
            "w-full bg-transparent text-white placeholder-slate-500 outline-none",
            mono && "font-mono text-sm"
          )}
        />
      </Cell>
    </div>
  );

  return (
    <Shell wide onClose={ui.close}>
      <Head
        title={editing ? `Edit ${editing.name}` : "Add an app"}
        kicker="Launch anything from your launcher"
        onClose={ui.close}
      />
      <div className="grid gap-8 px-8 py-6 lg:grid-cols-[1fr_16rem]">
        <div className="space-y-5">
          {field(0, nameRef, "Name", name, setName, "e.g. My Movie Player")}
          {field(
            1,
            targetRef,
            "Launch target",
            target,
            setTarget,
            "https://… · steam:// · vscode:// · myapp:// · empty = in-launcher",
            true
          )}
          <div>
            <div className="mb-1.5 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
              Category — {cat} (Enter to cycle)
            </div>
            <Cell
              r={2}
              c={0}
              focus={focus}
              hover={nav.set}
              onClick={() => {
                const i = CATEGORIES.indexOf(cat);
                setCat(CATEGORIES[(i + 1) % CATEGORIES.length]);
              }}
              soft
              className="flex items-center gap-2 rounded-xl bg-white/6 px-4 py-3 ring-1 ring-white/10"
            >
              <Icon name="folder" className="h-4 w-4 text-slate-300" />
              <span className="font-semibold text-white">{cat}</span>
            </Cell>
          </div>
          <div>
            <div className="mb-1.5 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Icon</div>
            <div className="no-scrollbar flex gap-2 overflow-x-auto">
              {ICON_CHOICES.map((ic, i) => (
                <Cell
                  key={ic}
                  r={3}
                  c={i}
                  focus={focus}
                  hover={nav.set}
                  onClick={() => setIcon(ic)}
                  className={cx(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1",
                    icon === ic ? "bg-white/15 ring-white/50" : "bg-white/5 ring-white/10"
                  )}
                >
                  <Icon name={ic} className="h-5 w-5 text-slate-200" />
                </Cell>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1.5 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Tile color</div>
            <div className="flex flex-wrap gap-2">
              {TILE_COLORS.map((tc, i) => (
                <Cell
                  key={tc}
                  r={4}
                  c={i}
                  focus={focus}
                  hover={nav.set}
                  onClick={() => setColor(tc)}
                  className={cx(
                    "h-9 w-9 rounded-lg ring-1",
                    color === tc ? "ring-2 ring-white" : "ring-white/10"
                  )}
                >
                  <span className="block h-full w-full rounded-lg" style={{ background: tc }} />
                </Cell>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1.5 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
              Launch kind — {KIND_LABEL[effKind]}
            </div>
            <div className="flex flex-wrap gap-2.5">
              {kindOptions.map((k, i) => (
                <Cell
                  key={k.v}
                  r={5}
                  c={i}
                  focus={focus}
                  hover={nav.set}
                  onClick={() => setKind(k.v)}
                  soft
                  className={cx(
                    "rounded-full px-4 py-2 text-sm font-semibold ring-1",
                    kind === k.v ? "bg-white/15 text-white ring-white/40" : "bg-white/5 text-slate-300 ring-white/10"
                  )}
                >
                  {k.label}
                </Cell>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <Cell
              r={6}
              c={0}
              focus={focus}
              hover={nav.set}
              onClick={save}
              soft
              className="relative flex items-center gap-2 rounded-full px-7 py-2.5 font-display font-bold text-[#07101c]"
            >
              <span className="absolute inset-0 rounded-full" style={{ background: "var(--accent)" }} />
              <span className="relative flex items-center gap-2">
                <Icon name="check" className="h-4.5 w-4.5" />
                {editing ? "Save changes" : "Add app"}
              </span>
            </Cell>
            <Cell
              r={6}
              c={1}
              focus={focus}
              hover={nav.set}
              onClick={ui.close}
              soft
              className="flex items-center gap-2 rounded-full bg-white/8 px-7 py-2.5 font-display font-semibold text-slate-200"
            >
              <Icon name="x" className="h-4.5 w-4.5" />
              Cancel
            </Cell>
          </div>
        </div>
        <div>
          <div className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Preview</div>
          <div className="sticky top-0">
            <div
              className="flex h-28 items-center justify-center rounded-xl ring-1 ring-white/10"
              style={{ background: `linear-gradient(140deg, ${color}, ${shade(color, 0.45)})` }}
            >
              <Icon name={icon} className="h-12 w-12 text-white drop-shadow" />
            </div>
            <div className="mt-2 text-center text-sm font-semibold text-white">
              {name.trim() || "New app"}
            </div>
            <div className="mt-1 text-center text-xs text-slate-400">{cat} · {effKind.toUpperCase()}</div>
            <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-[0.72rem] leading-relaxed text-slate-400">
              <b className="text-slate-200">PC kind:</b> register any .exe once with a custom
              protocol (see Help, press ?) and enter it as the target — e.g.{" "}
              <code className="font-mono text-emerald-300">myplayer://</code>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

/* ------------------------------ LAUNCH ------------------------------- */

export function LaunchOverlay() {
  const ui = useUI();
  const app = ui.layer?.type === "launch" ? ui.layer.app : null;

  useEffect(() => {
    if (!app) return;
    if (app.kind === "url") window.open(app.target, "_blank", "noopener");
    else fireProtocol(app.target);
    const t = setTimeout(
      () => ui.toast(`${app.name} launched — Alt+Tab back anytime`, "external"),
      900
    );
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!app) return null;
  return (
    <div className="fade-in fixed inset-0 z-50 flex items-center justify-center bg-[#05070d]/92 backdrop-blur-md">
      <div className="pop-in flex flex-col items-center text-center">
        <div
          className="flex h-24 w-24 items-center justify-center rounded-2xl shadow-2xl"
          style={{ background: `linear-gradient(140deg, ${app.color}, ${shade(app.color, 0.45)})` }}
        >
          <Icon name={app.icon} className="h-12 w-12 text-white" />
        </div>
        <div className="mt-5 font-display text-2xl font-extrabold text-white">{app.name}</div>
        <div className="mt-1 max-w-md text-sm text-slate-400">
          {app.kind === "url"
            ? "Opening in a new browser tab — NovaDeck stays right here."
            : "Asking Windows to launch this program — NovaDeck stays open behind it."}
        </div>
        <div className="mt-6 flex items-center gap-2 text-slate-300">
          <span className="spin-slow h-5 w-5 rounded-full border-2 border-white/20 border-t-white" />
          <span className="text-sm font-medium">Launching…</span>
        </div>
        <div className="mt-8 rounded-full bg-white/6 px-5 py-2 text-xs font-semibold text-slate-300 ring-1 ring-white/10">
          Esc — back to NovaDeck · Alt+Tab — switch to the program
        </div>
      </div>
    </div>
  );
}
