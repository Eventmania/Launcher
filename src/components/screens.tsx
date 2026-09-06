import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  REGIONS,
  TABS,
  YOUTUBE_VIDEOS,
  fmtClock,
  grad,
  hashStr,
  ytWatch,
  type AppDef,
  type PdFilm,
  type TabId,
  type TvShow,
} from "../data";
import { useCatalog } from "../lib/catalog";
import { recallFocus, rememberFocus, useTvNav, type EdgeDir } from "../lib/keys";
import {
  fileUrl,
  listFolders,
  pickFolder,
  refreshFolder,
  type FolderState,
  type LocalFile,
} from "../lib/local";
import { sfx } from "../lib/sound";
import { useStore } from "../lib/store";
import { useUI, type UIApi } from "../lib/ui";
import {
  AddTile,
  AppBadge,
  AppTile,
  Cell,
  EpisodeCard,
  FilmCard,
  Hero,
  LocalCard,
  ShelfRow,
  ShelfSkeleton,
  ShowCard,
  StreamCard,
  TrackCard,
  VideoCard,
  WikiCard,
  WideCard,
  type HeroItem,
} from "./cards";
import { Chrome } from "./chrome";

interface Item {
  key: string;
  node: ReactNode;
  act: () => void;
  ctx?: () => void;
}

const APP_COLS = 6;
const TONIGHT_COLS = 4;

/* ------------------------------------------------------------------ */
/*  Shared screen scaffolding: chrome rows (top bar + tabs) on top,    */
/*  content rows below. Rows 0/1 are identical on every tab.           */
/* ------------------------------------------------------------------ */

function useScreen(
  tab: TabId,
  opts: {
    rows: number;
    cols: (r: number) => number;
    enter: (r: number, c: number) => void;
    edge?: (r: number, c: number, dir: EdgeDir) => void;
    onMenu?: (r: number, c: number) => void;
  }
) {
  const ui = useUI();
  const { s, d } = useStore();
  const active = ui.layer === null;

  const nav = useTvNav({
    id: "screen-" + tab,
    prio: 50,
    active,
    rows: opts.rows,
    cols: opts.cols,
    initial: recallFocus(tab),
    onEnter: opts.enter,
    onEdge: opts.edge,
    extra: (e, r, c) => {
      if ((e.key === "M" && e.shiftKey) || e.key === "ContextMenu") {
        if (r >= 2) opts.onMenu?.(r, c);
        return true;
      }
      if (e.key === "?" || e.key === "F1") {
        ui.setLayer({ type: "help" });
        return true;
      }
      if (/^[a-zA-Z0-9]$/.test(e.key)) {
        ui.openSearch(e.key);
        return true;
      }
      if (e.key === "Escape") return true;
      return false;
    },
  });

  useEffect(() => {
    rememberFocus(tab, nav.r, nav.c);
  }, [tab, nav.r, nav.c]);

  const firstScroll = useRef(true);
  useEffect(() => {
    const el = document.querySelector(`[data-cell="${nav.r}:${nav.c}"]`);
    el?.scrollIntoView({
      behavior: firstScroll.current ? "auto" : "smooth",
      inline: "center",
      block: "nearest",
    });
    firstScroll.current = false;
  }, [nav.r, nav.c]);

  const focus: [number, number] = [nav.r, nav.c];

  const topAction = (i: number) => {
    if (i === 0) ui.openSearch();
    else if (i === 1) ui.openSettings();
    else {
      const cur = REGIONS.findIndex((r) => r.id === s.settings.region);
      const next = REGIONS[(cur + 1) % REGIONS.length];
      d({ type: "settings", patch: { region: next.id } });
      ui.toast(`Region: ${next.label} — refreshing catalogue`, "globe");
    }
  };

  const baseEnter = (r: number, c: number): boolean => {
    if (r === 0) {
      topAction(c);
      return true;
    }
    if (r === 1) {
      const t = TABS[c].id;
      if (t !== tab) {
        ui.setTab(t);
        sfx("tab");
      }
      return true;
    }
    return false;
  };

  const chrome = (
    <Chrome
      tab={tab}
      focus={focus}
      hover={nav.set}
      onTab={(t) => {
        if (t !== tab) {
          ui.setTab(t);
          sfx("tab");
        }
      }}
      onTop={topAction}
    />
  );

  return { nav, focus, chrome, active, ui, baseEnter };
}

function ScreenBody({
  chrome,
  shelves,
  focus,
  hover,
  rowOffset,
  children,
}: {
  chrome: ReactNode;
  shelves: { title: string; kicker?: string; items: Item[] }[];
  focus: [number, number];
  hover: (r: number, c: number) => void;
  rowOffset: number;
  children?: ReactNode;
}) {
  return (
    <div className="min-h-full pb-28">
      {chrome}
      {children}
      {shelves.map((sh, ri) => (
        <ShelfRow key={sh.title + ri} title={sh.title} kicker={sh.kicker} delay={ri * 60}>
          {sh.items.map((it, ci) => (
            <Cell
              key={it.key}
              r={ri + rowOffset}
              c={ci}
              focus={focus}
              hover={hover}
              onClick={it.act}
              onCtx={it.ctx}
            >
              {it.node}
            </Cell>
          ))}
        </ShelfRow>
      ))}
    </div>
  );
}

/* ------------------------------ helpers ---------------------------- */

function appTileItem(a: AppDef, ui: UIApi, fav: boolean): Item {
  return {
    key: "at-" + a.id,
    node: <AppTile app={a} fav={fav} />,
    act: () => ui.openApp(a),
    ctx: () => ui.openAppOptions(a),
  };
}

function appBadgeItem(a: AppDef, ui: UIApi): Item {
  return {
    key: "ab-" + a.id,
    node: <AppBadge app={a} />,
    act: () => ui.openApp(a),
    ctx: () => ui.openAppOptions(a),
  };
}

function showItem(sh: TvShow, ui: UIApi, key: string): Item {
  return { key: key + sh.id, node: <ShowCard s={sh} />, act: () => ui.openShow(sh) };
}

function filmItem(f: PdFilm, ui: UIApi): Item {
  return { key: "f-" + f.id, node: <FilmCard f={f} />, act: () => ui.openFilm(f) };
}

/* ------------------------------- HOME ------------------------------ */

const PLATFORM_ORDER = ["netflix", "prime", "hotstar", "disney", "jiocinema", "sonyliv"];

export function HomeScreen() {
  const { s, d } = useStore();
  const ui = useUI();
  const cat = useCatalog();
  const region = REGIONS.find((r) => r.id === s.settings.region) ?? REGIONS[0];
  const [slide, setSlide] = useState(0);
  const [folders, setFolders] = useState<FolderState[] | null>(null);

  useEffect(() => {
    let on = true;
    listFolders().then((f) => {
      if (on) setFolders(f);
    });
    return () => {
      on = false;
    };
  }, []);

  const addFolder = useCallback(async () => {
    const f = await pickFolder((n) =>
      ui.toast(`${n} media files added for this session`, "folder")
    );
    if (f) {
      setFolders((old) => [...(old ?? []).filter((x) => x.id !== f.id), f]);
      ui.toast(`Folder "${f.name}" added — ${f.files.length} media files found`, "folder");
    }
  }, [ui]);

  const grantFolder = useCallback(
    async (id: string) => {
      const f = await refreshFolder(id);
      if (f) {
        setFolders((old) => (old ?? []).map((x) => (x.id === id ? f : x)));
        ui.toast(`Access granted — ${f.files.length} media files`, "check");
      }
    },
    [ui]
  );

  const playLocal = useCallback(
    async (f: LocalFile) => {
      const url = await fileUrl(f);
      if (!url) {
        ui.toast("Can't read that file — re-grant folder access", "info");
        return;
      }
      ui.setLayer({
        type: "player",
        title: f.name,
        sub: `${f.folderName} / ${f.relPath} · local file`,
        progressKey: "loc:" + f.key,
        sources: [url],
        external: undefined,
      });
      d({ type: "launch", id: "loc:" + f.key });
    },
    [ui, d]
  );

  /* ----- hero mix: real films + top real shows ----- */
  const heroItems: HeroItem[] = [
    { kind: "film", film: cat.films[0] },
    ...(cat.top[0] ? [{ kind: "show", show: cat.top[0] } as HeroItem] : []),
    { kind: "film", film: cat.films[1] ?? cat.films[0] },
    ...(cat.top[1] ? [{ kind: "show", show: cat.top[1] } as HeroItem] : []),
  ];

  /* ----- continue watching: built only from real progress ----- */
  const localFiles = (folders ?? []).flatMap((fo) => fo.files);
  const continueItems: Item[] = Object.entries(s.mediaProgress)
    .map(([key, t]): Item | null => {
      if (key.startsWith("pd-")) {
        const f = cat.films.find((x) => x.id === key);
        if (!f || t < 30 || t > f.runtimeMin * 60 * 0.97) return null;
        return {
          key: "cw-" + key,
          node: (
            <WideCard
              title={f.title}
              sub={`Resume film · at ${fmtClock(t)}`}
              bg={grad(hashStr(key) % 360)}
              img={f.img}
              progress={(t / (f.runtimeMin * 60)) * 100}
            />
          ),
          act: () => ui.playFilm(f),
        };
      }
      if (key.startsWith("loc:")) {
        const f = localFiles.find((x) => "loc:" + x.key === key);
        if (!f || t < 15) return null;
        return {
          key: "cw-" + key,
          node: (
            <WideCard
              title={f.name}
              sub={`Resume · local · at ${fmtClock(t)}`}
              bg="linear-gradient(140deg,#12314f,#0c1220 85%)"
              icon={f.video ? "film" : "music"}
              iconColor="#9ecbff"
            />
          ),
          act: () => void playLocal(f),
        };
      }
      if (key.startsWith("net:")) {
        const st = s.netStreams.find((x) => "net:" + x.id === key);
        if (!st || t < 15) return null;
        return {
          key: "cw-" + key,
          node: (
            <WideCard
              title={st.name}
              sub={`Resume · network · at ${fmtClock(t)}`}
              bg="linear-gradient(140deg,#123a2e,#0c1220 85%)"
              icon="globe"
              iconColor="#6ee7b7"
            />
          ),
          act: () => ui.playStream(st),
        };
      }
      return null;
    })
    .filter((x): x is Item => !!x)
    .slice(0, 8);

  /* ----- local & network shelves ----- */
  const localItems: Item[] = [
    ...(folders ?? []).flatMap((fo) =>
      fo.perm === "prompt"
        ? [
            {
              key: "grant-" + fo.id,
              node: (
                <div className="flex h-[5.5rem] w-[19rem] items-center gap-3 rounded-xl border-2 border-dashed border-white/25 bg-white/[0.03] px-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
                    <img src="" alt="" className="hidden" />
                    <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-300" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    </svg>
                  </span>
                  <div>
                    <div className="font-display text-sm font-bold text-white">{fo.name}</div>
                    <div className="text-xs text-slate-400">Select to grant access again</div>
                  </div>
                </div>
              ),
              act: () => void grantFolder(fo.id),
            } as Item,
          ]
        : fo.files.slice(0, 8).map(
            (f) =>
              ({
                key: "lf-" + f.key,
                node: <LocalCard f={f} />,
                act: () => void playLocal(f),
              }) as Item
          )
    ),
    {
      key: "addfolder",
      node: (
        <div className="flex h-[5.5rem] w-[19rem] items-center gap-3 rounded-xl border-2 border-dashed border-white/25 bg-white/[0.03] px-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-300" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </span>
          <div>
            <div className="font-display text-sm font-bold text-white">Add local folder</div>
            <div className="text-xs text-slate-400">Videos & music on this PC or NAS mount</div>
          </div>
        </div>
      ),
      act: () => void addFolder(),
    },
  ];

  const netItems: Item[] = s.netStreams.map((st) => ({
    key: "ns-" + st.id,
    node: <StreamCard st={st} />,
    act: () => ui.playStream(st),
  }));

  /* ----- per-app recommendation shelves ----- */
  const hasApp = (id: string) => s.apps.some((a) => a.id === id);
  const appShelves: { title: string; kicker?: string; items: Item[] }[] = [];

  if (region.indian && cat.indian.length) {
    appShelves.push({
      title: "Indian Originals",
      kicker: "Top desi series",
      items: cat.indian.map((sh) => showItem(sh, ui, "in-")),
    });
  }
  for (const appId of PLATFORM_ORDER) {
    if (!hasApp(appId)) continue;
    const list = cat.platforms[appId];
    if (!list?.length) continue;
    const app = s.apps.find((a) => a.id === appId);
    appShelves.push({
      title: `Top on ${app?.name ?? appId}`,
      kicker: "Because this app is added",
      items: list.map((sh) => showItem(sh, ui, appId + "-")),
    });
  }
  if (hasApp("youtube")) {
    appShelves.push({
      title: "Top on YouTube",
      kicker: "Opens the real video",
      items: YOUTUBE_VIDEOS.map((v) => ({
        key: "yt-" + v.id,
        node: <VideoCard v={v} />,
        act: () => {
          window.open(ytWatch(v.id), "_blank", "noopener");
          d({ type: "launch", id: "youtube" });
        },
      })),
    });
  }
  if (hasApp("spotify") && cat.music.length) {
    appShelves.push({
      title: "Music Picks",
      kicker: "Real 30s previews · Enter plays",
      items: cat.music.map((t, i) => ({
        key: "mu-" + t.id,
        node: <TrackCard t={t} />,
        act: () => ui.setLayer({ type: "music", index: i, tracks: cat.music }),
      })),
    });
  }

  const shelves: { title: string; kicker?: string; items: Item[] }[] = [
    { title: "Continue Watching", kicker: "Your real progress", items: continueItems },
    { title: "Local Media", kicker: "Folders you added", items: localItems },
    { title: "Network Streams", kicker: "NAS / shared · VLC ready", items: netItems },
    {
      title: "On Tonight",
      kicker: `Real schedule · ${region.label}`,
      items: cat.tonight.slice(0, 12).map((ep) => ({
        key: "tn-" + ep.id,
        node: <EpisodeCard ep={ep} />,
        act: () => ui.openEpisode(ep),
      })),
    },
    ...appShelves,
    {
      title: "Real Cinema",
      kicker: "Free public-domain streams",
      items: cat.films.map((f) => filmItem(f, ui)),
    },
    {
      title: "Acclaimed Films",
      kicker: "Via Wikipedia",
      items: cat.acclaimed.map((w) => ({
        key: "w-" + w.id,
        node: <WikiCard w={w} />,
        act: () => ui.openWiki(w),
      })),
    },
    {
      title: "Your Apps",
      kicker: "Quick launch",
      items: [...s.apps.slice(0, 10).map((a) => appBadgeItem(a, ui))],
    },
  ].filter((x) => x.items.length > 0);

  const scr = useScreen("home", {
    rows: 3 + shelves.length,
    cols: (r) =>
      r === 0 ? 3 : r === 1 ? TABS.length : r === 2 ? 2 : shelves[r - 3]?.items.length ?? 1,
    enter: (r, c) => {
      if (scrRef.current.baseEnter(r, c)) return;
      if (r === 2) {
        const item = heroItems[slide];
        if (!item) return;
        if (c === 0) {
          if (item.kind === "film") ui.playFilm(item.film);
          else ui.openShow(item.show);
        } else {
          const id = item.kind === "film" ? item.film.id : item.show.id;
          const listed = s.favMedia.includes(id);
          d({ type: "favMedia", id });
          ui.toast(listed ? "Removed from Watchlist" : "Added to Watchlist", "star");
        }
        return;
      }
      shelves[r - 3]?.items[c]?.act();
    },
    edge: (_r, _c, dir) => {
      if (_r === 2) {
        if (dir === "left") setSlide((v) => (v + heroItems.length - 1) % heroItems.length);
        if (dir === "right") setSlide((v) => (v + 1) % heroItems.length);
        sfx("move");
      }
    },
    onMenu: (r, c) => {
      if (r >= 3) shelves[r - 3]?.items[c]?.ctx?.();
    },
  });
  const scrRef = useRef(scr);
  scrRef.current = scr;

  const heroFocused = scr.active && scr.nav.r === 2;
  useEffect(() => {
    if (!scr.active || heroFocused) return;
    const t = setInterval(() => setSlide((v) => (v + 1) % heroItems.length), 8000);
    return () => clearInterval(t);
  }, [scr.active, heroFocused, heroItems.length]);

  const hero = heroItems[slide] ?? heroItems[0];

  return (
    <ScreenBody
      chrome={scr.chrome}
      shelves={shelves}
      focus={scr.focus}
      hover={scr.nav.set}
      rowOffset={3}
    >
      {hero && (
        <Hero
          item={hero}
          slide={slide}
          total={heroItems.length}
          focus={scr.focus}
          hover={scr.nav.set}
          onPrimary={() => {
            if (hero.kind === "film") ui.playFilm(hero.film);
            else ui.openShow(hero.show);
          }}
          onList={() => {
            const id = hero.kind === "film" ? hero.film.id : hero.show.id;
            const listed = s.favMedia.includes(id);
            d({ type: "favMedia", id });
            ui.toast(listed ? "Removed from Watchlist" : "Added to Watchlist", "star");
          }}
          listed={hero ? s.favMedia.includes(hero.kind === "film" ? hero.film.id : hero.show.id) : false}
          paused={heroFocused || !scr.active}
        />
      )}
      {cat.loading && !shelves.some((x) => x.items.length > 1) && (
        <>
          <ShelfSkeleton delay={80} />
          <ShelfSkeleton delay={160} />
        </>
      )}
      {!cat.loading && cat.empty && (
        <div className="mx-12 mt-6 rounded-2xl border border-amber-400/25 bg-amber-400/[0.06] p-6">
          <div className="font-display text-lg font-bold text-amber-200">
            Live catalogue couldn't load (offline?)
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Recommendations come from real sources — TVMaze, archive.org, iTunes and Wikipedia.
            Your apps and local media still work. Reconnect and press Retry.
          </p>
          <button
            onClick={cat.reload}
            className="mt-4 rounded-full px-6 py-2.5 font-display text-sm font-bold text-[#07101c]"
            style={{ background: "var(--accent)" }}
          >
            Retry
          </button>
        </div>
      )}
    </ScreenBody>
  );
}

/* ------------------------------ TONIGHT ---------------------------- */

export function TonightScreen() {
  const ui = useUI();
  const cat = useCatalog();
  const { s } = useStore();
  const region = REGIONS.find((r) => r.id === s.settings.region) ?? REGIONS[0];
  const eps = cat.tonight;
  const rows = Math.max(1, Math.ceil(eps.length / TONIGHT_COLS));

  const scr = useScreen("tonight", {
    rows: 2 + Math.max(1, rows),
    cols: (r) => {
      if (r === 0) return 3;
      if (r === 1) return TABS.length;
      return Math.max(1, Math.min(TONIGHT_COLS, eps.length - (r - 2) * TONIGHT_COLS));
    },
    enter: (r, c) => {
      if (scr.baseEnter(r, c)) return;
      const ep = eps[(r - 2) * TONIGHT_COLS + c];
      if (ep) ui.openEpisode(ep);
    },
  });

  return (
    <ScreenBody chrome={scr.chrome} shelves={[]} focus={scr.focus} hover={scr.nav.set} rowOffset={2}>
      <div className="rise px-12 pt-1">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex items-center gap-2 rounded-md bg-red-600/90 px-2 py-1 text-[0.65rem] font-bold tracking-[0.18em] text-white">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-white" />
            TONIGHT
          </span>
          <h2 className="font-display text-[1.05rem] font-bold tracking-wide text-slate-100">
            Real broadcast schedule · {region.label}
          </h2>
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
            {new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
          </span>
        </div>
        {eps.length === 0 && cat.loading && (
          <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${TONIGHT_COLS}, minmax(0,1fr))` }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="shimmer h-[12.5rem] rounded-xl" />
            ))}
          </div>
        )}
        {eps.length === 0 && !cat.loading && (
          <p className="text-slate-400">No schedule data for this region today — try another region (top-right).</p>
        )}
        <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${TONIGHT_COLS}, minmax(0,1fr))` }}>
          {eps.map((ep, i) => (
            <Cell
              key={ep.id}
              r={2 + Math.floor(i / TONIGHT_COLS)}
              c={i % TONIGHT_COLS}
              focus={scr.focus}
              hover={scr.nav.set}
              onClick={() => ui.openEpisode(ep)}
              className="justify-self-start"
            >
              <EpisodeCard ep={ep} />
            </Cell>
          ))}
        </div>
      </div>
    </ScreenBody>
  );
}

/* ------------------------------- APPS ------------------------------ */

export function AppsScreen() {
  const { s } = useStore();
  const ui = useUI();

  const ordered = [...s.apps].sort((a, b) => {
    const fa = s.favApps.includes(a.id) ? 0 : 1;
    const fb = s.favApps.includes(b.id) ? 0 : 1;
    if (fa !== fb) return fa - fb;
    const ca = a.builtIn ? 1 : 0;
    const cb = b.builtIn ? 1 : 0;
    if (ca !== cb) return ca - cb;
    return a.name.localeCompare(b.name);
  });
  const nCells = ordered.length + 1;
  const gridRows = Math.ceil(nCells / APP_COLS);

  const scr = useScreen("apps", {
    rows: 2 + gridRows,
    cols: (r) => {
      if (r === 0) return 3;
      if (r === 1) return TABS.length;
      return Math.max(1, Math.min(APP_COLS, nCells - (r - 2) * APP_COLS));
    },
    enter: (r, c) => {
      if (scr.baseEnter(r, c)) return;
      const idx = (r - 2) * APP_COLS + c;
      if (idx === ordered.length) ui.openAddApp();
      else if (idx < ordered.length) ui.openApp(ordered[idx]);
    },
    onMenu: (r, c) => {
      if (r < 2) return;
      const idx = (r - 2) * APP_COLS + c;
      if (idx < ordered.length) ui.openAppOptions(ordered[idx]);
    },
  });

  return (
    <ScreenBody chrome={scr.chrome} shelves={[]} focus={scr.focus} hover={scr.nav.set} rowOffset={2}>
      <div className="rise px-12 pt-1">
        <div className="mb-4 flex items-center gap-3">
          <span className="h-4 w-1 rounded-full" style={{ background: "var(--accent)" }} />
          <h2 className="font-display text-[1.05rem] font-bold tracking-wide text-slate-100">
            Your Apps
          </h2>
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
            {ordered.length} installed · Enter launches full-screen · ⇧M options
          </span>
        </div>
        <div className="grid gap-x-6 gap-y-7" style={{ gridTemplateColumns: `repeat(${APP_COLS}, minmax(0, 1fr))` }}>
          {ordered.map((a, i) => (
            <Cell
              key={a.id}
              r={2 + Math.floor(i / APP_COLS)}
              c={i % APP_COLS}
              focus={scr.focus}
              hover={scr.nav.set}
              onClick={() => ui.openApp(a)}
              onCtx={() => ui.openAppOptions(a)}
              className="justify-self-start"
            >
              <AppTile app={a} fav={s.favApps.includes(a.id)} />
            </Cell>
          ))}
          <Cell
            r={2 + Math.floor(ordered.length / APP_COLS)}
            c={ordered.length % APP_COLS}
            focus={scr.focus}
            hover={scr.nav.set}
            onClick={() => ui.openAddApp()}
            className="justify-self-start"
          >
            <AddTile />
          </Cell>
        </div>
      </div>
    </ScreenBody>
  );
}

/* ------------------------------ MOVIES ------------------------------ */

export function MoviesScreen() {
  const ui = useUI();
  const cat = useCatalog();

  const shelves = [
    {
      title: "Real Cinema",
      kicker: "Free streams · public domain",
      items: cat.films.map((f) => filmItem(f, ui)),
    },
    {
      title: "Acclaimed Films",
      kicker: "Real data via Wikipedia",
      items: cat.acclaimed.map((w) => ({
        key: "w-" + w.id,
        node: <WikiCard w={w} />,
        act: () => ui.openWiki(w),
      })),
    },
  ].filter((x) => x.items.length > 0);

  const scr = useScreen("movies", {
    rows: 2 + Math.max(1, shelves.length),
    cols: (r) => (r === 0 ? 3 : r === 1 ? TABS.length : shelves[r - 2]?.items.length ?? 1),
    enter: (r, c) => {
      if (scr.baseEnter(r, c)) return;
      shelves[r - 2]?.items[c]?.act();
    },
  });

  return (
    <ScreenBody chrome={scr.chrome} shelves={shelves} focus={scr.focus} hover={scr.nav.set} rowOffset={2}>
      {cat.loading && shelves.length === 0 && <ShelfSkeleton />}
    </ScreenBody>
  );
}

/* ------------------------------- SHOWS ------------------------------ */

export function ShowsScreen() {
  const ui = useUI();
  const cat = useCatalog();
  const { s } = useStore();
  const region = REGIONS.find((r) => r.id === s.settings.region) ?? REGIONS[0];

  const shelves = [
    ...(region.indian && cat.indian.length
      ? [{ title: "Indian Originals", kicker: "Real series data", items: cat.indian.map((sh) => showItem(sh, ui, "in-")) }]
      : []),
    {
      title: "Top Rated Worldwide",
      kicker: "Via TVMaze",
      items: cat.top.map((sh) => showItem(sh, ui, "top-")),
    },
    ...Object.entries(cat.platforms)
      .filter(([, v]) => v.length)
      .map(([appId, list]) => ({
        title: `On ${s.apps.find((a) => a.id === appId)?.name ?? appId}`,
        items: list.map((sh) => showItem(sh, ui, appId + "-")),
      })),
  ].filter((x) => x.items.length > 0);

  const scr = useScreen("shows", {
    rows: 2 + Math.max(1, shelves.length),
    cols: (r) => (r === 0 ? 3 : r === 1 ? TABS.length : shelves[r - 2]?.items.length ?? 1),
    enter: (r, c) => {
      if (scr.baseEnter(r, c)) return;
      shelves[r - 2]?.items[c]?.act();
    },
  });

  return (
    <ScreenBody chrome={scr.chrome} shelves={shelves} focus={scr.focus} hover={scr.nav.set} rowOffset={2}>
      {cat.loading && shelves.length === 0 && <ShelfSkeleton />}
    </ScreenBody>
  );
}

/* ------------------------------ LIBRARY ----------------------------- */

export function LibraryScreen() {
  const { s } = useStore();
  const ui = useUI();
  const cat = useCatalog();

  const favAppItems = s.favApps
    .map((id) => s.apps.find((a) => a.id === id))
    .filter((a): a is AppDef => !!a)
    .map((a) => appBadgeItem(a, ui));

  const watchItems: Item[] = s.favMedia.flatMap((id) => {
    if (id.startsWith("pd-")) {
      const f = cat.films.find((x) => x.id === id);
      return f ? [filmItem(f, ui)] : [];
    }
    if (id.startsWith("tv-")) {
      const sh =
        cat.top.find((x) => x.id === id) ||
        cat.indian.find((x) => x.id === id) ||
        Object.values(cat.platforms).flat().find((x) => x.id === id);
      return sh ? [showItem(sh, ui, "wl-")] : [];
    }
    return [];
  });

  const recentItems: Item[] = s.recents
    .slice(0, 8)
    .map((r): Item | null => {
      const app = s.apps.find((a) => a.id === r.id);
      const date = new Date(r.ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
      if (app)
        return {
          key: "rw-" + app.id,
          node: (
            <WideCard
              title={app.name}
              sub={`${app.cat} · ${date}`}
              bg={`linear-gradient(140deg, ${app.color}, #0c1220 85%)`}
              icon={app.icon}
              iconColor="#ffffff"
            />
          ),
          act: () => ui.openApp(app),
          ctx: () => ui.openAppOptions(app),
        };
      if (r.id.startsWith("pd-")) {
        const f = cat.films.find((x) => x.id === r.id);
        if (f)
          return {
            key: "rw-" + f.id,
            node: (
              <WideCard
                title={f.title}
                sub={`Film · ${date}`}
                bg={grad(hashStr(f.id) % 360)}
                img={f.img}
                progress={s.mediaProgress[f.id] ? (s.mediaProgress[f.id] / (f.runtimeMin * 60)) * 100 : undefined}
              />
            ),
            act: () => ui.playFilm(f),
          };
      }
      return null;
    })
    .filter((x): x is Item => !!x);

  const allAppItems: Item[] = [
    ...s.apps.map((a) => appBadgeItem(a, ui)),
    { key: "add", node: <AddTile />, act: () => ui.openAddApp() },
  ];

  const shelves = [
    { title: "Favorite Apps", items: favAppItems },
    { title: "Watchlist", items: watchItems },
    { title: "Recently Opened", kicker: "Real history", items: recentItems },
    { title: "All Apps", kicker: `${s.apps.length} total`, items: allAppItems },
  ].filter((x) => x.items.length > 0);

  const scr = useScreen("library", {
    rows: 2 + shelves.length,
    cols: (r) => (r === 0 ? 3 : r === 1 ? TABS.length : shelves[r - 2]?.items.length ?? 1),
    enter: (r, c) => {
      if (scr.baseEnter(r, c)) return;
      shelves[r - 2]?.items[c]?.act();
    },
    onMenu: (r, c) => {
      if (r >= 2) shelves[r - 2]?.items[c]?.ctx?.();
    },
  });

  return (
    <ScreenBody chrome={scr.chrome} shelves={shelves} focus={scr.focus} hover={scr.nav.set} rowOffset={2} />
  );
}
