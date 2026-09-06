import { useEffect, useMemo, useRef, useState } from "react";
import {
  ACCENTS,
  CATEGORIES,
  REGIONS,
  WALLS,
  fmtDur,
  type AppDef,
  type AppKind,
  type MusicTrack,
  type PdFilm,
  type TonightItem,
  type TvShow,
  type WikiFilm,
} from "../data";
import { Icon } from "../icons";
import {
  archivePage,
  searchMusic,
  searchShows,
  searchWiki,
  wikiSummary,
} from "../lib/catalog";
import { useFocusScroll, useTvKeys, useTvNav } from "../lib/keys";
import {
  listFolders,
  pickFolder,
  removeFolder,
  type FolderState,
} from "../lib/local";
import { sfx } from "../lib/sound";
import { useStore } from "../lib/store";
import { useUI } from "../lib/ui";
import { cx, detectKind, fireProtocol } from "../lib/util";
import {
  Cell,
  CloseBtn,
  FilmCard,
  ShowCard,
  TrackCard,
  WikiCard,
} from "./cards";

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
  protocol: "Asks Windows to launch a program (steam://, vscode://, custom myapp://)",
  sim: "Runs inside NovaDeck — Esc returns to the launcher",
};

function OverlayShell({
  children,
  onClose,
  wide,
}: {
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <div className="fade-in fixed inset-0 z-[60] overflow-y-auto no-scrollbar bg-[#05070d]/92 backdrop-blur-md">
      <div
        className={cx(
          "pop-in relative mx-auto my-10 rounded-2xl border border-white/10 bg-[#0b101b] shadow-2xl",
          wide ? "max-w-5xl" : "max-w-3xl"
        )}
      >
        <CloseBtn onClick={onClose} />
        {children}
      </div>
    </div>
  );
}

function ActionBtn({
  r,
  c,
  focus,
  hover,
  onClick,
  primary,
  children,
}: {
  r: number;
  c: number;
  focus: [number, number];
  hover: (r: number, c: number) => void;
  onClick: () => void;
  primary?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Cell
      r={r}
      c={c}
      focus={focus}
      hover={hover}
      onClick={onClick}
      soft
      className={cx(
        "relative flex items-center gap-2.5 rounded-full px-7 py-3 font-display text-[0.95rem] font-bold",
        primary ? "text-[#07101c]" : "bg-white/10 text-white ring-1 ring-white/10"
      )}
    >
      {primary && (
        <span className="absolute inset-0 rounded-full" style={{ background: "var(--accent)" }} />
      )}
      <span className="relative flex items-center gap-2.5">{children}</span>
    </Cell>
  );
}

/* ================================ ROOT =============================== */

export function OverlayRoot() {
  const ui = useUI();
  const l = ui.layer;
  if (!l) return null;
  switch (l.type) {
    case "search":
      return <SearchOverlay seed={l.seed} />;
    case "settings":
      return <SettingsOverlay />;
    case "help":
      return <HelpOverlay />;
    case "film":
      return <FilmOverlay film={l.film} />;
    case "show":
      return <ShowOverlay show={l.show} />;
    case "episode":
      return <EpisodeOverlay ep={l.ep} />;
    case "wiki":
      return <WikiOverlay wiki={l.wiki} />;
    case "appOptions":
      return <AppOptionsOverlay app={l.app} />;
    case "addApp":
      return <AddAppOverlay app={l.app} />;
    case "launch":
      return <LaunchBridge app={l.app} />;
    default:
      return null;
  }
}

/* =============================== SEARCH ============================== */

function SearchOverlay({ seed }: { seed?: string }) {
  const ui = useUI();
  const { s } = useStore();
  const region = REGIONS.find((r) => r.id === s.settings.region) ?? REGIONS[0];
  const [q, setQ] = useState(seed ?? "");
  const [shows, setShows] = useState<TvShow[]>([]);
  const [wikis, setWikis] = useState<WikiFilm[]>([]);
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setShows([]);
      setWikis([]);
      setTracks([]);
      return;
    }
    setBusy(true);
    const t = setTimeout(() => {
      void Promise.allSettled([
        searchShows(term).then(setShows),
        searchWiki(term).then(setWikis),
        searchMusic(term, region.cc).then(setTracks),
      ]).then(() => setBusy(false));
    }, 320);
    return () => clearTimeout(t);
  }, [q, region.cc]);

  const appHits = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return s.apps.slice(0, 8);
    return s.apps.filter((a) => a.name.toLowerCase().includes(term)).slice(0, 8);
  }, [q, s.apps]);

  const rows = [
    appHits.length ? appHits.length : 0,
    shows.length,
    tracks.length,
    wikis.length,
  ];
  const visible = rows.filter((n) => n > 0);
  const nav = useTvNav({
    id: "search-grid",
    prio: 80,
    rows: Math.max(1, visible.length),
    cols: (r) => visible[r] ?? 1,
    onEnter: (r, c) => {
      const kind = rows.map((n, i) => ({ n, i })).filter((x) => x.n > 0)[r]?.i;
      if (kind === 0 && appHits[c]) ui.openApp(appHits[c]);
      else if (kind === 1 && shows[c]) ui.openShow(shows[c]);
      else if (kind === 2 && tracks[c])
        ui.setLayer({ type: "music", index: c, tracks });
      else if (kind === 3 && wikis[c]) ui.openWiki(wikis[c]);
    },
  });
  useFocusScroll(nav.r, nav.c);

  const typing = () => document.activeElement === inputRef.current;
  useTvKeys("search-input", 81, (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return false;
    if (e.key === "Escape") {
      if (typing()) {
        inputRef.current?.blur();
        return true;
      }
      ui.close();
      return true;
    }
    if (typing()) return true;
    if (/^[a-zA-Z0-9 ]$/.test(e.key) || e.key === "Backspace") {
      inputRef.current?.focus();
      return false; // let the input handle it
    }
    return false;
  });

  let visRow = -1;
  const bump = (n: number) => (n > 0 ? ++visRow : -1);
  const rApps = bump(appHits.length);
  const rShows = bump(shows.length);
  const rTracks = bump(tracks.length);
  const rWikis = bump(wikis.length);

  return (
    <OverlayShell onClose={ui.close} wide>
      <div className="p-10">
        <div className="flex items-center gap-4">
          <Icon name="search" className="h-6 w-6 text-slate-400" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search apps, real shows, films, music…"
            className="flex-1 bg-transparent font-display text-2xl font-bold text-white placeholder-slate-600 outline-none"
          />
          {busy && <span className="spin-slow h-5 w-5 rounded-full border-2 border-white/20 border-t-white" />}
        </div>
        <div className="mt-2 text-xs text-slate-500">
          Live sources: TVMaze · Wikipedia · iTunes ({region.label}) · your apps. Esc once leaves the box, Esc again closes.
        </div>

        {q.trim().length < 2 && (
          <div className="mt-8 text-sm text-slate-500">
            Type at least 2 characters — results are fetched live.
          </div>
        )}

        {rApps >= 0 && appHits.length > 0 && (
          <Section title="Your Apps">
            {appHits.map((a, i) => (
              <Cell key={a.id} r={rApps} c={i} focus={[nav.r, nav.c]} hover={nav.set} onClick={() => ui.openApp(a)} className="w-28">
                <div className="flex flex-col items-center gap-2">
                  <span
                    className="flex h-16 w-16 items-center justify-center rounded-xl ring-1 ring-white/10"
                    style={{ background: a.color }}
                  >
                    <Icon name={a.icon} className="h-7 w-7 text-white" />
                  </span>
                  <span className="w-full truncate text-center text-xs text-slate-300">{a.name}</span>
                </div>
              </Cell>
            ))}
          </Section>
        )}
        {rShows >= 0 && shows.length > 0 && (
          <Section title="Shows · TVMaze">
            {shows.map((sh, i) => (
              <Cell key={sh.id} r={rShows} c={i} focus={[nav.r, nav.c]} hover={nav.set} onClick={() => ui.openShow(sh)}>
                <ShowCard s={sh} />
              </Cell>
            ))}
          </Section>
        )}
        {rTracks >= 0 && tracks.length > 0 && (
          <Section title="Music · real previews">
            {tracks.map((t, i) => (
              <Cell key={t.id} r={rTracks} c={i} focus={[nav.r, nav.c]} hover={nav.set} onClick={() => ui.setLayer({ type: "music", index: i, tracks })}>
                <TrackCard t={t} />
              </Cell>
            ))}
          </Section>
        )}
        {rWikis >= 0 && wikis.length > 0 && (
          <Section title="Films · Wikipedia">
            {wikis.map((w, i) => (
              <Cell key={w.id} r={rWikis} c={i} focus={[nav.r, nav.c]} hover={nav.set} onClick={() => ui.openWiki(w)}>
                <WikiCard w={w} />
              </Cell>
            ))}
          </Section>
        )}
        {q.trim().length >= 2 && !busy && visible.length === 0 && (
          <div className="mt-8 text-sm text-slate-500">No live results for “{q}”.</div>
        )}
      </div>
    </OverlayShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-7">
      <div className="mb-3 font-display text-sm font-bold uppercase tracking-[0.18em] text-slate-400">
        {title}
      </div>
      <div className="no-scrollbar flex gap-5 overflow-x-auto pb-2">{children}</div>
    </div>
  );
}

/* ============================== SETTINGS ============================= */

function SettingsOverlay() {
  const ui = useUI();
  const { s, d } = useStore();
  const [folders, setFolders] = useState<FolderState[]>([]);
  const [stName, setStName] = useState("");
  const [stUrl, setStUrl] = useState("");

  useEffect(() => {
    let on = true;
    listFolders().then((f) => on && setFolders(f));
    return () => {
      on = false;
    };
  }, []);

  /* rows: region(4) wall(3) accent(4) clock(2) sound(2) addstream(2) streams(n) folders(n+1) reset(2) */
  const streamRows = s.netStreams.length;
  const folderRows = folders.length + 1;
  const rows = [4, 3, 4, 2, 2, 2, streamRows, folderRows, 2];
  const nav = useTvNav({
    id: "settings",
    prio: 80,
    rows: rows.length,
    cols: (r) => Math.max(1, rows[r]),
    onEnter: (r, c) => {
      if (r === 0) {
        d({ type: "settings", patch: { region: REGIONS[c].id } });
        ui.toast(`Region: ${REGIONS[c].label} — catalogue refreshing`, "globe");
      } else if (r === 1) {
        d({ type: "settings", patch: { wall: c } });
      } else if (r === 2) {
        d({ type: "settings", patch: { accent: c } });
      } else if (r === 3) {
        d({ type: "settings", patch: { clock24: c === 0 } });
      } else if (r === 4) {
        d({ type: "settings", patch: { sound: c === 0 } });
      } else if (r === 5) {
        if (c === 0) {
          if (!stName.trim() || !/^https?:\/\//i.test(stUrl.trim())) {
            ui.toast("Enter a name and an http(s):// stream URL", "info");
            return;
          }
          d({
            type: "addStream",
            stream: { id: "st-" + Date.now(), name: stName.trim(), url: stUrl.trim() },
          });
          setStName("");
          setStUrl("");
          ui.toast("Network stream added to For You", "check");
        }
      } else if (r === 6) {
        const st = s.netStreams[c];
        if (st) {
          d({ type: "removeStream", id: st.id });
          ui.toast(`Removed ${st.name}`, "trash");
        }
      } else if (r === 7) {
        if (c === folders.length) {
          void pickFolder().then((f) => {
            if (f) {
              setFolders((old) => [...old.filter((x) => x.id !== f.id), f]);
              ui.toast(`Folder "${f.name}" added — ${f.files.length} media files`, "folder");
            }
          });
        } else {
          const fo = folders[c];
          void removeFolder(fo.id).then(() => {
            setFolders((old) => old.filter((x) => x.id !== fo.id));
            ui.toast(`Removed folder ${fo.name}`, "trash");
          });
        }
      } else if (r === 8) {
        if (c === 0) {
          d({ type: "reset" });
          ui.toast("Factory reset — defaults restored", "restart");
        } else ui.close();
      }
    },
  });
  useFocusScroll(nav.r, nav.c);
  const focus: [number, number] = [nav.r, nav.c];
  const hover = nav.set;

  const toggle = (on: boolean, i: number) => (
    <Cell
      r={i === 3 ? 3 : 4}
      c={on ? 0 : 1}
      focus={focus}
      hover={hover}
      onClick={() => {}}
      soft
      className={cx(
        "rounded-full px-6 py-2.5 font-display text-sm font-bold",
        (i === 3 ? s.settings.clock24 : s.settings.sound) === on
          ? "text-[#07101c]"
          : "bg-white/8 text-slate-300 ring-1 ring-white/10"
      )}
    >
      <span className="relative flex items-center gap-2">
        {(i === 3 ? s.settings.clock24 : s.settings.sound) === on && (
          <span className="absolute -inset-x-6 -inset-y-2.5 -z-0 rounded-full" style={{ background: "var(--accent)" }} />
        )}
        <span className="relative">{on ? (i === 3 ? "24-hour" : "On") : i === 3 ? "12-hour" : "Off"}</span>
      </span>
    </Cell>
  );

  return (
    <OverlayShell onClose={ui.close} wide>
      <div className="p-10">
        <h2 className="font-display text-2xl font-extrabold text-white">Settings</h2>
        <p className="mt-1 text-sm text-slate-500">All choices save instantly on this PC.</p>

        <Row label="Content region" hint="Drives tonight's schedule, music and Indian originals">
          {REGIONS.map((rg, i) => (
            <Cell key={rg.id} r={0} c={i} focus={focus} hover={hover} soft
              className={cx(
                "rounded-full px-5 py-2.5 font-display text-sm font-bold",
                s.settings.region === rg.id ? "text-[#07101c]" : "bg-white/8 text-slate-300 ring-1 ring-white/10"
              )}
            >
              <span className="relative">
                {s.settings.region === rg.id && (
                  <span className="absolute -inset-x-5 -inset-y-2.5 rounded-full" style={{ background: "var(--accent)" }} />
                )}
                <span className="relative">{rg.label}</span>
              </span>
            </Cell>
          ))}
        </Row>

        <Row label="Wallpaper">
          {WALLS.map((w, i) => (
            <Cell key={w} r={1} c={i} focus={focus} hover={hover} soft className="relative">
              <span
                className={cx(
                  "block h-16 w-28 rounded-lg bg-cover bg-center ring-1",
                  s.settings.wall === i ? "ring-white" : "ring-white/15"
                )}
                style={{ backgroundImage: `url(${w})` }}
              />
              <span className="mt-1 block text-center text-xs text-slate-400">{WALL_NAMES[i]}</span>
            </Cell>
          ))}
        </Row>

        <Row label="Accent colour">
          {ACCENTS.map((a, i) => (
            <Cell key={a.hex} r={2} c={i} focus={focus} hover={hover} soft className="flex flex-col items-center gap-1">
              <span
                className={cx("h-10 w-10 rounded-full", s.settings.accent === i && "ring-2 ring-white ring-offset-2 ring-offset-[#0b101b]")}
                style={{ background: a.hex }}
              />
              <span className="text-xs text-slate-400">{a.name}</span>
            </Cell>
          ))}
        </Row>

        <Row label="Clock">{toggle(true, 3)}{toggle(false, 3)}</Row>
        <Row label="Navigation sounds">{toggle(true, 4)}{toggle(false, 4)}</Row>

        <Row label="Network stream (NAS / shared)" hint="Enter a name, then an http(s) URL — plays here and hands off to VLC">
          <input
            value={stName}
            onChange={(e) => setStName(e.target.value)}
            placeholder="Name, e.g. NAS Movies"
            className="w-52 rounded-lg bg-white/8 px-4 py-2.5 text-sm text-white ring-1 ring-white/10 outline-none placeholder:text-slate-600"
          />
          <input
            value={stUrl}
            onChange={(e) => setStUrl(e.target.value)}
            placeholder="http://192.168.1.10/movies/night.mp4"
            className="w-80 rounded-lg bg-white/8 px-4 py-2.5 text-sm text-white ring-1 ring-white/10 outline-none placeholder:text-slate-600"
          />
          <Cell r={5} c={0} focus={focus} hover={hover} onClick={() => {}} soft
            className="relative rounded-full px-6 py-2.5 font-display text-sm font-bold text-[#07101c]"
          >
            <span className="absolute inset-0 rounded-full" style={{ background: "var(--accent)" }} />
            <span className="relative flex items-center gap-2">
              <Icon name="plus" className="h-4 w-4" /> Add
            </span>
          </Cell>
        </Row>

        {s.netStreams.length > 0 && (
          <Row label="Saved streams" hint="Enter removes">
            {s.netStreams.map((st, i) => (
              <Cell key={st.id} r={6} c={i} focus={focus} hover={hover} soft
                className="flex items-center gap-3 rounded-xl bg-white/6 px-4 py-3 ring-1 ring-white/10"
              >
                <Icon name="globe" className="h-5 w-5 text-emerald-300" />
                <span>
                  <span className="block max-w-48 truncate text-sm font-bold text-white">{st.name}</span>
                  <span className="block max-w-48 truncate text-xs text-slate-500">{st.url}</span>
                </span>
                <Icon name="trash" className="h-4 w-4 text-slate-500" />
              </Cell>
            ))}
          </Row>
        )}

        <Row label="Local folders" hint="Videos & music folders on this PC — scanned and playable here">
          {folders.map((fo, i) => (
            <Cell key={fo.id} r={7} c={i} focus={focus} hover={hover} soft
              className="flex items-center gap-3 rounded-xl bg-white/6 px-4 py-3 ring-1 ring-white/10"
            >
              <Icon name="folder" className="h-5 w-5 text-sky-300" />
              <span>
                <span className="block text-sm font-bold text-white">{fo.name}</span>
                <span className="block text-xs text-slate-500">
                  {fo.files.length} files · {fo.perm === "granted" ? "connected" : fo.perm === "prompt" ? "needs re-grant on Home" : "session only"}
                </span>
              </span>
              <Icon name="trash" className="h-4 w-4 text-slate-500" />
            </Cell>
          ))}
          <Cell r={7} c={folders.length} focus={focus} hover={hover} soft
            className="flex items-center gap-3 rounded-xl border-2 border-dashed border-white/25 px-4 py-3"
          >
            <Icon name="plus" className="h-5 w-5 text-slate-300" />
            <span className="text-sm font-bold text-slate-200">Add folder</span>
          </Cell>
        </Row>

        <Row label="Danger zone">
          <Cell r={8} c={0} focus={focus} hover={hover} soft
            className="rounded-full bg-red-500/15 px-6 py-2.5 font-display text-sm font-bold text-red-300 ring-1 ring-red-400/30"
          >
            Factory reset
          </Cell>
          <Cell r={8} c={1} focus={focus} hover={hover} onClick={ui.close} soft
            className="rounded-full bg-white/10 px-6 py-2.5 font-display text-sm font-bold text-white"
          >
            Close (Esc)
          </Cell>
        </Row>
      </div>
    </OverlayShell>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-7">
      <div className="font-display text-sm font-bold uppercase tracking-[0.18em] text-slate-400">{label}</div>
      {hint && <div className="mt-0.5 text-xs text-slate-600">{hint}</div>}
      <div className="mt-3 flex flex-wrap items-center gap-4">{children}</div>
    </div>
  );
}

/* ================================ HELP =============================== */

function HelpOverlay() {
  const ui = useUI();
  useTvKeys("help", 80, (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return false;
    if (e.key === "Escape") {
      ui.close();
      return true;
    }
    return true;
  });
  const keys: [string, string][] = [
    ["← ↑ → ↓", "Move the white focus ring"],
    ["Enter", "Open / play / activate"],
    ["Esc", "Back from any screen, player or window"],
    ["Ctrl+Shift+H", "Close the current app view and jump to Home"],
    ["Any letter", "Jump straight into Search"],
    ["⇧M or right-click", "Options for the focused app"],
    ["In player ← / →", "Seek 10 seconds"],
    ["In player M / R", "Mute / restart"],
    ["F11", "Full-screen TV mode"],
  ];
  return (
    <OverlayShell onClose={ui.close} wide>
      <div className="p-10">
        <h2 className="font-display text-2xl font-extrabold text-white">Help & keys</h2>
        <div className="mt-5 grid grid-cols-2 gap-x-10 gap-y-2.5">
          {keys.map(([k, v]) => (
            <div key={k} className="flex items-center gap-3">
              <kbd className="rounded-md bg-white/10 px-2.5 py-1 font-mono text-xs font-bold text-white ring-1 ring-white/15">
                {k}
              </kbd>
              <span className="text-sm text-slate-400">{v}</span>
            </div>
          ))}
        </div>

        <h3 className="mt-8 font-display text-base font-bold text-white">
          Launch any Windows program from a tile
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          Browsers can't start an arbitrary .exe directly, but Windows protocols can. Register one
          per program, once — then Enter on the tile launches the real app and NovaDeck stays open
          (Alt+Tab back, or Ctrl+Shift+H).
        </p>
        <pre className="mt-3 overflow-x-auto rounded-xl bg-black/50 p-4 font-mono text-xs leading-relaxed text-emerald-200 ring-1 ring-white/10">
{`Windows Registry Editor Version 5.00

[HKEY_CLASSES_ROOT\\novadeck-movies]
@="URL:NovaDeck Movies"
"URL Protocol"=""

[HKEY_CLASSES_ROOT\\novadeck-movies\\shell\\open\\command]
@="\\"C:\\\\Path\\\\To\\\\YourApp.exe\\""

Then add an app in NovaDeck with target:  novadeck-movies://`}
        </pre>
        <p className="mt-3 text-sm text-slate-500">
          Many programs already register protocols: <code className="text-emerald-300">steam://</code>,{" "}
          <code className="text-emerald-300">vscode://</code>, <code className="text-emerald-300">discord://</code>, and
          Windows built-ins like <code className="text-emerald-300">calculator:</code>,{" "}
          <code className="text-emerald-300">ms-paint:</code>, <code className="text-emerald-300">ms-settings:</code>.
        </p>

        <h3 className="mt-8 font-display text-base font-bold text-white">Watching in VLC</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          Network streams you add (NAS, Jellyfin, an <code className="text-emerald-300">http://</code> share) play
          right here and also offer <span className="font-bold text-white">Open in VLC</span> — VLC ships with the{" "}
          <code className="text-emerald-300">vlc://</code> protocol, so it receives the same stream URL. Local
          folders play inside NovaDeck, since browsers can't hand file paths to other apps.
        </p>

        <div className="mt-8 flex justify-end">
          <button
            onClick={ui.close}
            className="rounded-full bg-white/10 px-6 py-2.5 font-display text-sm font-bold text-white transition hover:bg-white/20"
          >
            Close (Esc)
          </button>
        </div>
      </div>
    </OverlayShell>
  );
}

/* ============================== DETAILS ============================== */

function DetailShell({
  art,
  onClose,
  children,
}: {
  art: string | null;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fade-in fixed inset-0 z-[60] overflow-y-auto no-scrollbar bg-[#05070d]/95">
      <CloseBtn onClick={onClose} />
      <div className="relative mx-auto max-w-5xl">
        <div className="relative h-[24rem] overflow-hidden rounded-b-3xl">
          {art ? (
            <img src={art} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-[#16233c] to-[#0a0f1a]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b101b] via-[#0b101b]/35 to-transparent" />
        </div>
        <div className="pop-in -mt-24 px-12 pb-16">{children}</div>
      </div>
    </div>
  );
}

function FilmOverlay({ film }: { film: PdFilm }) {
  const ui = useUI();
  const { s, d } = useStore();
  const prog = s.mediaProgress[film.id] ?? 0;
  const listed = s.favMedia.includes(film.id);
  const nav = useTvNav({
    id: "film-detail",
    prio: 80,
    rows: 1,
    cols: () => 3,
    onEnter: (_r, c) => {
      if (c === 0) ui.playFilm(film);
      else if (c === 1) {
        d({ type: "favMedia", id: film.id });
        ui.toast(listed ? "Removed from Watchlist" : "Added to Watchlist", "star");
      } else window.open(archivePage(film), "_blank", "noopener");
    },
  });
  const focus: [number, number] = [nav.r, nav.c];
  return (
    <DetailShell art={film.img} onClose={ui.close}>
      <div className="text-[0.7rem] font-bold uppercase tracking-[0.3em]" style={{ color: "var(--accent)" }}>
        Real Cinema · free public-domain stream
      </div>
      <h2 className="mt-2 font-display text-5xl font-extrabold text-white">{film.title}</h2>
      <div className="mt-3 flex items-center gap-3 text-sm font-medium text-slate-300">
        <span>{film.year}</span>
        <span className="rounded border border-white/30 px-1.5 py-px text-xs">{film.maturity}</span>
        <span>{fmtDur(film.runtimeMin)}</span>
        <span className="rounded bg-white/10 px-1.5 py-px text-xs">{film.genres.join(" · ")}</span>
        {prog > 60 && (
          <span className="rounded bg-white/10 px-1.5 py-px text-xs">Resume at {fmtClockShort(prog)}</span>
        )}
      </div>
      <p className="mt-4 max-w-2xl leading-relaxed text-slate-300">{film.desc}</p>
      <div className="mt-7 flex items-center gap-4">
        <ActionBtn r={0} c={0} focus={focus} hover={nav.set} primary onClick={() => ui.playFilm(film)}>
          <Icon name="play" filled className="h-5 w-5" /> {prog > 60 ? "Resume" : "Play"}
        </ActionBtn>
        <ActionBtn
          r={0}
          c={1}
          focus={focus}
          hover={nav.set}
          onClick={() => {
            d({ type: "favMedia", id: film.id });
            ui.toast(listed ? "Removed from Watchlist" : "Added to Watchlist", "star");
          }}
        >
          <Icon name={listed ? "check" : "plus"} className="h-5 w-5" /> {listed ? "On Watchlist" : "Watchlist"}
        </ActionBtn>
        <ActionBtn r={0} c={2} focus={focus} hover={nav.set} onClick={() => window.open(archivePage(film), "_blank", "noopener")}>
          <Icon name="external" className="h-5 w-5" /> archive.org
        </ActionBtn>
      </div>
      <p className="mt-5 text-xs text-slate-600">
        Streams real video from archive.org · Esc returns · progress saves automatically
      </p>
    </DetailShell>
  );
}

function fmtClockShort(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m}m`;
}

function ShowOverlay({ show }: { show: TvShow }) {
  const ui = useUI();
  const { s, d } = useStore();
  const listed = s.favMedia.includes(show.id);
  const cols = 2 + (show.site ? 1 : 0) + 1;
  const nav = useTvNav({
    id: "show-detail",
    prio: 80,
    rows: 1,
    cols: () => cols,
    onEnter: (_r, c) => {
      if (c === 0) {
        d({ type: "favMedia", id: show.id });
        ui.toast(listed ? "Removed from Watchlist" : "Added to Watchlist", "star");
      } else if (c === 1) window.open(`https://www.tvmaze.com/shows/${show.tvmazeId}`, "_blank", "noopener");
      else if (c === 2 && show.site) window.open(show.site, "_blank", "noopener");
      else window.open(`https://www.tvmaze.com/shows/${show.tvmazeId}`, "_blank", "noopener");
    },
  });
  const focus: [number, number] = [nav.r, nav.c];
  return (
    <DetailShell art={show.img} onClose={ui.close}>
      <div className="text-[0.7rem] font-bold uppercase tracking-[0.3em]" style={{ color: "var(--accent)" }}>
        Series · {show.network}
      </div>
      <h2 className="mt-2 font-display text-5xl font-extrabold text-white">{show.name}</h2>
      <div className="mt-3 flex items-center gap-3 text-sm font-medium text-slate-300">
        <span className="flex items-center gap-1 font-bold text-amber-300">
          <Icon name="star" filled className="h-4 w-4" /> {show.rating ? show.rating.toFixed(1) : "—"}
        </span>
        <span>{show.year || "—"}</span>
        <span className="rounded border border-white/30 px-1.5 py-px text-xs">{show.status}</span>
        <span>{show.runtime}m episodes</span>
        {show.schedule && <span className="rounded bg-white/10 px-1.5 py-px text-xs">{show.schedule}</span>}
      </div>
      <p className="mt-4 max-w-2xl leading-relaxed text-slate-300">{show.summary || "No synopsis yet."}</p>
      <div className="mt-7 flex items-center gap-4">
        <ActionBtn
          r={0}
          c={0}
          focus={focus}
          hover={nav.set}
          primary
          onClick={() => {
            d({ type: "favMedia", id: show.id });
            ui.toast(listed ? "Removed from Watchlist" : "Added to Watchlist", "star");
          }}
        >
          <Icon name={listed ? "check" : "plus"} className="h-5 w-5" /> {listed ? "On Watchlist" : "Watchlist"}
        </ActionBtn>
        <ActionBtn r={0} c={1} focus={focus} hover={nav.set} onClick={() => window.open(`https://www.tvmaze.com/shows/${show.tvmazeId}`, "_blank", "noopener")}>
          <Icon name="external" className="h-5 w-5" /> TVMaze
        </ActionBtn>
        {show.site && (
          <ActionBtn r={0} c={2} focus={focus} hover={nav.set} onClick={() => window.open(show.site!, "_blank", "noopener")}>
            <Icon name="globe" className="h-5 w-5" /> Official site
          </ActionBtn>
        )}
      </div>
      <p className="mt-5 text-xs text-slate-600">
        Where to stream: search “{show.name}” on your added apps (Netflix, Prime, Hotstar…) — Enter opens them full-screen.
      </p>
    </DetailShell>
  );
}

function EpisodeOverlay({ ep }: { ep: TonightItem }) {
  const ui = useUI();
  const { s, d } = useStore();
  const listed = s.favMedia.includes(ep.id);
  const nav = useTvNav({
    id: "ep-detail",
    prio: 80,
    rows: 1,
    cols: () => 3,
    onEnter: (_r, c) => {
      if (c === 0) {
        d({ type: "favMedia", id: ep.id });
        ui.toast(listed ? "Removed from Watchlist" : "Added to Watchlist", "star");
      } else if (c === 1) window.open(`https://www.tvmaze.com/shows/${ep.tvmazeShow}`, "_blank", "noopener");
      else if (ep.site) window.open(ep.site, "_blank", "noopener");
      else window.open(`https://www.tvmaze.com/shows/${ep.tvmazeShow}`, "_blank", "noopener");
    },
  });
  const focus: [number, number] = [nav.r, nav.c];
  return (
    <DetailShell art={ep.img} onClose={ui.close}>
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5 rounded-md bg-red-600/90 px-2 py-1 text-[0.65rem] font-bold tracking-[0.18em] text-white">
          <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-white" /> AIRS TONIGHT
        </span>
        <span className="font-display text-sm font-bold text-slate-300">
          {ep.time} · {ep.network}
        </span>
      </div>
      <h2 className="mt-3 font-display text-5xl font-extrabold text-white">{ep.show}</h2>
      <div className="mt-2 font-display text-lg font-semibold text-slate-300">
        {ep.tag} · “{ep.episode}”
      </div>
      <div className="mt-2 text-sm text-slate-500">{ep.genres.join(" · ")}</div>
      {ep.summary && <p className="mt-4 max-w-2xl leading-relaxed text-slate-300">{ep.summary}</p>}
      <div className="mt-7 flex items-center gap-4">
        <ActionBtn
          r={0}
          c={0}
          focus={focus}
          hover={nav.set}
          primary
          onClick={() => {
            d({ type: "favMedia", id: ep.id });
            ui.toast(listed ? "Removed from Watchlist" : "Added to Watchlist", "star");
          }}
        >
          <Icon name={listed ? "check" : "plus"} className="h-5 w-5" /> {listed ? "On Watchlist" : "Watchlist"}
        </ActionBtn>
        <ActionBtn r={0} c={1} focus={focus} hover={nav.set} onClick={() => window.open(`https://www.tvmaze.com/shows/${ep.tvmazeShow}`, "_blank", "noopener")}>
          <Icon name="tv" className="h-5 w-5" /> Show page
        </ActionBtn>
        {ep.site && (
          <ActionBtn r={0} c={2} focus={focus} hover={nav.set} onClick={() => window.open(ep.site!, "_blank", "noopener")}>
            <Icon name="globe" className="h-5 w-5" /> Official site
          </ActionBtn>
        )}
      </div>
    </DetailShell>
  );
}

function WikiOverlay({ wiki }: { wiki: WikiFilm }) {
  const ui = useUI();
  const [full, setFull] = useState<WikiFilm>(wiki);
  useEffect(() => {
    let on = true;
    void wikiSummary(wiki.title).then((w) => {
      if (on && w) setFull(w);
    });
    return () => {
      on = false;
    };
  }, [wiki]);
  const nav = useTvNav({
    id: "wiki-detail",
    prio: 80,
    rows: 1,
    cols: () => 1,
    onEnter: () => window.open(full.url, "_blank", "noopener"),
  });
  const focus: [number, number] = [nav.r, nav.c];
  return (
    <DetailShell art={full.imageLg ?? full.image} onClose={ui.close}>
      <div className="text-[0.7rem] font-bold uppercase tracking-[0.3em]" style={{ color: "var(--accent)" }}>
        Acclaimed film · Wikipedia
      </div>
      <h2 className="mt-2 font-display text-5xl font-extrabold text-white">{full.title}</h2>
      {full.year && <div className="mt-2 text-sm font-semibold text-slate-400">{full.year} · {full.desc}</div>}
      <p className="mt-4 max-w-2xl leading-relaxed text-slate-300">
        {full.extract || full.desc || "Loading summary…"}
      </p>
      <div className="mt-7 flex items-center gap-4">
        <ActionBtn r={0} c={0} focus={focus} hover={nav.set} primary onClick={() => window.open(full.url, "_blank", "noopener")}>
          <Icon name="external" className="h-5 w-5" /> Open Wikipedia
        </ActionBtn>
      </div>
    </DetailShell>
  );
}

/* ============================= APP OPTIONS =========================== */

function AppOptionsOverlay({ app }: { app: AppDef }) {
  const ui = useUI();
  const { s, d } = useStore();
  const fav = s.favApps.includes(app.id);
  const nav = useTvNav({
    id: "app-options",
    prio: 80,
    rows: 1,
    cols: () => 4,
    onEnter: (_r, c) => {
      if (c === 0) {
        ui.close();
        setTimeout(() => ui.openApp(app), 60);
      } else if (c === 1) {
        d({ type: "favApp", id: app.id });
        ui.toast(fav ? `Unpinned ${app.name}` : `Pinned ${app.name} to favorites`, "star");
      } else if (c === 2) {
        ui.setLayer({ type: "addApp", app });
      } else {
        d({ type: "removeApp", id: app.id });
        ui.toast(`Removed ${app.name} — its shelf is gone too`, "trash");
        ui.close();
      }
    },
  });
  const focus: [number, number] = [nav.r, nav.c];
  return (
    <OverlayShell onClose={ui.close}>
      <div className="p-10">
        <div className="flex items-center gap-5">
          <span
            className="flex h-16 w-16 items-center justify-center rounded-2xl ring-1 ring-white/10"
            style={{ background: app.color }}
          >
            <Icon name={app.icon} className="h-8 w-8 text-white" />
          </span>
          <div>
            <div className="font-display text-2xl font-extrabold text-white">{app.name}</div>
            <div className="mt-0.5 text-sm text-slate-500">
              {app.cat} · {KIND_LABEL[app.kind]}
            </div>
          </div>
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <ActionBtn r={0} c={0} focus={focus} hover={nav.set} primary onClick={() => {}}>
            <Icon name="play" filled className="h-5 w-5" /> Open
          </ActionBtn>
          <ActionBtn r={0} c={1} focus={focus} hover={nav.set} onClick={() => {}}>
            <Icon name="star" filled={fav} className={fav ? "h-5 w-5 text-amber-300" : "h-5 w-5"} />
            {fav ? "Unpin" : "Pin"}
          </ActionBtn>
          <ActionBtn r={0} c={2} focus={focus} hover={nav.set} onClick={() => {}}>
            <Icon name="pencil" className="h-5 w-5" /> Edit
          </ActionBtn>
          <ActionBtn r={0} c={3} focus={focus} hover={nav.set} onClick={() => {}}>
            <Icon name="trash" className="h-5 w-5" /> Remove
          </ActionBtn>
        </div>
        {app.target && (
          <div className="mt-6 rounded-xl bg-black/40 px-4 py-3 font-mono text-xs text-emerald-200 ring-1 ring-white/10">
            {app.target}
          </div>
        )}
      </div>
    </OverlayShell>
  );
}

/* =============================== ADD APP ============================= */

function AddAppOverlay({ app }: { app?: AppDef }) {
  const ui = useUI();
  const { d } = useStore();
  const [name, setName] = useState(app?.name ?? "");
  const [target, setTarget] = useState(app?.target ?? "");
  const [cat, setCat] = useState(app?.cat ?? "Entertainment");
  const [icon, setIcon] = useState(app?.icon ?? "globe");
  const [color, setColor] = useState(app?.color ?? TILE_COLORS[0]);
  const nameRef = useRef<HTMLInputElement>(null);
  const targetRef = useRef<HTMLInputElement>(null);
  const editing = !!app;

  const kind = detectKind(target);
  const rows = [1, 1, CATEGORIES.length - 1, ICON_CHOICES.length, TILE_COLORS.length, 2];
  const nav = useTvNav({
    id: "add-app",
    prio: 80,
    rows: rows.length,
    cols: (r) => Math.max(1, rows[r]),
    onEnter: (r, c) => {
      if (r === 0) nameRef.current?.focus();
      else if (r === 1) targetRef.current?.focus();
      else if (r === 2) setCat(CATEGORIES[c + 1]);
      else if (r === 3) setIcon(ICON_CHOICES[c]);
      else if (r === 4) setColor(TILE_COLORS[c]);
      else if (r === 5) {
        if (c === 0) save();
        else ui.close();
      }
    },
  });
  useFocusScroll(nav.r, nav.c);
  const focus: [number, number] = [nav.r, nav.c];

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const typing = () =>
    document.activeElement === nameRef.current || document.activeElement === targetRef.current;

  useTvKeys("add-app-input", 81, (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return false;
    if (e.key === "Escape") {
      if (typing()) {
        (document.activeElement as HTMLElement | null)?.blur();
        return true;
      }
      ui.close();
      return true;
    }
    if (e.key === "Enter" && typing()) {
      (document.activeElement as HTMLElement | null)?.blur();
      return true;
    }
    return typing();
  });

  const save = () => {
    if (!name.trim()) {
      ui.toast("Give the app a name first", "info");
      nameRef.current?.focus();
      return;
    }
    const def: AppDef = {
      id: app?.id ?? "app-" + Date.now(),
      name: name.trim(),
      cat,
      icon,
      color,
      target: target.trim(),
      kind,
      builtIn: app?.builtIn,
      blurb: app?.blurb ?? (kind === "protocol" ? "Launches a Windows program" : kind === "url" ? "Opens in a new tab" : "Runs inside NovaDeck"),
    };
    d({ type: editing ? "updateApp" : "addApp", app: def });
    ui.toast(editing ? `${def.name} updated` : `${def.name} added to Your Apps`, "check");
    ui.close();
  };

  return (
    <OverlayShell onClose={ui.close} wide>
      <div className="p-10">
        <h2 className="font-display text-2xl font-extrabold text-white">
          {editing ? `Edit ${app.name}` : "Add an app"}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Launch anything: a website, a Windows program via protocol, or an in-launcher tool.
        </p>

        <div className="mt-7 grid grid-cols-[16rem_1fr] gap-10">
          {/* live preview */}
          <div className="flex flex-col items-center gap-3 pt-2">
            <span
              className="relative flex h-28 w-28 items-center justify-center rounded-2xl ring-1 ring-white/10 transition-all"
              style={{ background: color }}
            >
              <Icon name={icon} className="h-12 w-12 text-white drop-shadow" />
            </span>
            <div className="font-display text-base font-bold text-white">{name || "App name"}</div>
            <span
              className={cx(
                "rounded-full px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.16em]",
                kind === "url" && "bg-sky-400/15 text-sky-300",
                kind === "protocol" && "bg-emerald-400/15 text-emerald-300",
                kind === "sim" && "bg-amber-400/15 text-amber-300"
              )}
            >
              {kind === "url" ? "Web app" : kind === "protocol" ? "Windows program" : "In-launcher"}
            </span>
            <div className="text-center text-xs text-slate-600">{KIND_LABEL[kind]}</div>
          </div>

          <div>
            <Field label="Name">
              <Cell r={0} c={0} focus={focus} hover={nav.set} soft className="flex-1">
                <input
                  ref={nameRef}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. VLC, Plex, My Game"
                  className="w-full rounded-lg bg-white/8 px-4 py-3 text-sm text-white ring-1 ring-white/10 outline-none placeholder:text-slate-600 focus:ring-white/40"
                />
              </Cell>
            </Field>
            <Field label="Launch target" hint="https://… · steam:// · vscode:// · myapp:// (registry, see Help) · empty = in-launcher">
              <Cell r={1} c={0} focus={focus} hover={nav.set} soft className="flex-1">
                <input
                  ref={targetRef}
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder="https:// or protocol://"
                  className="w-full rounded-lg bg-white/8 px-4 py-3 font-mono text-sm text-white ring-1 ring-white/10 outline-none placeholder:text-slate-600 focus:ring-white/40"
                />
              </Cell>
            </Field>
            <Field label="Category">
              {CATEGORIES.slice(1).map((cc, i) => (
                <Cell key={cc} r={2} c={i} focus={focus} hover={nav.set} soft
                  className={cx(
                    "rounded-full px-4 py-2 text-sm font-semibold",
                    cat === cc ? "text-[#07101c]" : "bg-white/8 text-slate-300 ring-1 ring-white/10"
                  )}
                >
                  <span className="relative">
                    {cat === cc && (
                      <span className="absolute -inset-x-4 -inset-y-2 rounded-full" style={{ background: "var(--accent)" }} />
                    )}
                    <span className="relative">{cc}</span>
                  </span>
                </Cell>
              ))}
            </Field>
            <Field label="Icon">
              {ICON_CHOICES.map((ic, i) => (
                <Cell key={ic} r={3} c={i} focus={focus} hover={nav.set} soft
                  className={cx(
                    "flex h-11 w-11 items-center justify-center rounded-xl ring-1",
                    icon === ic ? "ring-2 ring-white bg-white/15" : "ring-white/10 bg-white/5"
                  )}
                >
                  <Icon name={ic} className="h-5 w-5 text-slate-200" />
                </Cell>
              ))}
            </Field>
            <Field label="Tile colour">
              {TILE_COLORS.map((cl, i) => (
                <Cell key={cl} r={4} c={i} focus={focus} hover={nav.set} soft
                  className={cx("h-10 w-10 rounded-full", color === cl && "ring-2 ring-white ring-offset-2 ring-offset-[#0b101b]")}
                >
                  <span className="block h-full w-full rounded-full" style={{ background: cl }} />
                </Cell>
              ))}
            </Field>
            <div className="mt-7 flex items-center gap-4">
              <ActionBtn r={5} c={0} focus={focus} hover={nav.set} primary onClick={save}>
                <Icon name="check" className="h-5 w-5" /> {editing ? "Save changes" : "Add to launcher"}
              </ActionBtn>
              <ActionBtn r={5} c={1} focus={focus} hover={nav.set} onClick={ui.close}>
                Cancel (Esc)
              </ActionBtn>
            </div>
            <p className="mt-4 text-xs text-slate-600">
              Esc leaves a text field · Esc again closes · arrows move the rest — the form scrolls with you.
            </p>
          </div>
        </div>
      </div>
    </OverlayShell>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <div className="font-display text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{label}</div>
      {hint && <div className="mt-0.5 text-xs text-slate-600">{hint}</div>}
      <div className="mt-2 flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

/* ============================ LAUNCH BRIDGE ========================== */

function LaunchBridge({ app }: { app: AppDef }) {
  const ui = useUI();
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    if (app.kind === "url") window.open(app.target, "_blank", "noopener");
    else if (app.kind === "protocol") fireProtocol(app.target);
    const t = setTimeout(() => ui.close(), 6500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useTvKeys("launch-bridge", 95, (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return false;
    if (e.key === "Escape") {
      ui.close();
      return true;
    }
    return true;
  });
  const nav = useTvNav({
    id: "launch-actions",
    prio: 94,
    rows: 1,
    cols: () => 2,
    onEnter: (_r, c) => {
      if (c === 0) {
        if (app.kind === "url") window.open(app.target, "_blank", "noopener");
        else fireProtocol(app.target);
      } else ui.close();
    },
  });
  const focus: [number, number] = [nav.r, nav.c];
  return (
    <div className="fade-in fixed inset-0 z-[70] flex items-center justify-center bg-[#05070d]/96">
      <CloseBtn onClick={ui.close} />
      <div className="pop-in w-full max-w-md px-10 text-center">
        <span
          className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl shadow-2xl"
          style={{ background: app.color }}
        >
          <Icon name={app.icon} className="h-10 w-10 text-white" />
        </span>
        <div className="mt-5 font-display text-2xl font-extrabold text-white">Launching {app.name}…</div>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          {app.kind === "url"
            ? "Opened in a new tab. NovaDeck stays right here — Alt+Tab back, or Ctrl+Shift+H to jump Home."
            : "Windows is starting the program. NovaDeck never closes — Alt+Tab back, or Ctrl+Shift+H to jump Home."}
        </p>
        <div className="mt-7 flex items-center justify-center gap-4">
          <ActionBtn r={0} c={0} focus={focus} hover={nav.set} onClick={() => {}}>
            <Icon name="restart" className="h-5 w-5" /> Launch again
          </ActionBtn>
          <ActionBtn r={0} c={1} focus={focus} hover={nav.set} onClick={ui.close}>
            <Icon name="back" className="h-5 w-5" /> Back (Esc)
          </ActionBtn>
        </div>
      </div>
    </div>
  );
}
