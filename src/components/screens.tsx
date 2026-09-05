import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  CHANNELS,
  PROFILES,
  TABS,
  fmtClock,
  grad,
  hashStr,
  heroMedia,
  MEDIA,
  type AppDef,
  type MediaItem,
  type TabId,
} from "../data";
import { recallFocus, rememberFocus, useTvNav, type EdgeDir } from "../lib/keys";
import { sfx } from "../lib/sound";
import { useStore } from "../lib/store";
import { useUI, type UIApi } from "../lib/ui";
import {
  AddTile,
  AppBadge,
  AppTile,
  Cell,
  ChannelCard,
  Hero,
  Poster,
  ShelfRow,
  WideCard,
} from "./cards";
import { Chrome } from "./chrome";

interface Item {
  key: string;
  node: ReactNode;
  act: () => void;
  ctx?: () => void;
}

interface Shelf {
  title: string;
  kicker?: string;
  items: Item[];
}

const APP_COLS = 6;
const LIVE_COLS = 4;

/* ------------------------------------------------------------------ */
/*  Shared screen scaffolding: chrome rows (top bar + tabs) on top,    */
/*  content rows below. Rows 0/1 behave identically on every tab.      */
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
      const n = (s.profile + 1) % PROFILES.length;
      d({ type: "profile", n });
      ui.toast(`Switched to ${PROFILES[n].name}`, "spark");
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

  return { nav, focus, chrome, active, baseEnter };
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
  shelves: Shelf[];
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
        <ShelfRow key={sh.title} title={sh.title} kicker={sh.kicker} delay={ri * 70}>
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

function appBadgeItem(a: AppDef, ui: UIApi): Item {
  return {
    key: "ab-" + a.id,
    node: <AppBadge app={a} />,
    act: () => ui.openApp(a),
    ctx: () => ui.openAppOptions(a),
  };
}

function mediaItem(m: MediaItem, ui: UIApi): Item {
  return {
    key: "m-" + m.id,
    node: <Poster m={m} />,
    act: () => ui.openMedia(m),
  };
}

/* ------------------------------- HOME ------------------------------ */

export function HomeScreen() {
  const { s, d } = useStore();
  const ui = useUI();
  const [slide, setSlide] = useState(0);
  const heroes = heroMedia;

  const contMedia = Object.entries(s.mediaProgress)
    .map(([id, t]) => ({ m: MEDIA.find((x) => x.id === id), t }))
    .filter(
      (x): x is { m: MediaItem; t: number } =>
        !!x.m && x.t > 30 && x.t < x.m.duration * 60 * 0.95
    );
  const contApps = s.recents
    .map((r) => s.apps.find((a) => a.id === r.id))
    .filter((a): a is AppDef => !!a)
    .slice(0, 6);

  const continueItems: Item[] = [
    ...contMedia.map(({ m, t }) => ({
      key: "cm-" + m.id,
      node: (
        <WideCard
          title={m.title}
          sub={`Resume · ${fmtClock(t)} in`}
          bg={grad(m.hue)}
          img={m.backdrop}
          progress={(t / (m.duration * 60)) * 100}
        />
      ),
      act: () => ui.playMedia(m),
    })),
    ...contApps.map((a) => ({
      key: "ca-" + a.id,
      node: (
        <WideCard
          title={a.name}
          sub={`Resume · ${a.cat}`}
          bg={`linear-gradient(140deg, ${a.color}, #0c1220 85%)`}
          icon={a.icon}
          iconColor="#ffffff"
          progress={10 + (hashStr(a.id) % 78)}
        />
      ),
      act: () => ui.openApp(a),
      ctx: () => ui.openAppOptions(a),
    })),
  ];

  const topApps = [...s.apps]
    .sort(
      (a, b) =>
        (s.favApps.includes(b.id) ? 1 : 0) - (s.favApps.includes(a.id) ? 1 : 0) ||
        a.name.localeCompare(b.name)
    )
    .slice(0, 12);

  const shelves: Shelf[] = [
    { title: "Continue Watching", kicker: "Jump back in", items: continueItems },
    {
      title: "Top Apps",
      kicker: "Pinned & favorites",
      items: topApps.map((a) => appBadgeItem(a, ui)),
    },
    {
      title: "Entertainment",
      kicker: "Web · Games · Social",
      items: s.apps
        .filter((a) => ["Entertainment", "Games", "Social", "Web"].includes(a.cat))
        .map((a) => appBadgeItem(a, ui)),
    },
    {
      title: "Trending Movies",
      items: MEDIA.filter((m) => m.type === "movie").map((m) => mediaItem(m, ui)),
    },
    {
      title: "Binge-worthy Shows",
      items: MEDIA.filter((m) => m.type === "show").map((m) => mediaItem(m, ui)),
    },
    {
      title: "Your Apps",
      kicker: "Added by you",
      items: [
        ...s.apps.filter((a) => !a.builtIn).map((a) => appBadgeItem(a, ui)),
        { key: "add", node: <AddTile />, act: () => ui.openAddApp() },
      ],
    },
  ].filter((x) => x.items.length > 0);

  const scr = useScreen("home", {
    rows: 3 + shelves.length,
    cols: (r) =>
      r === 0 ? 3 : r === 1 ? TABS.length : r === 2 ? 2 : shelves[r - 3].items.length,
    enter: (r, c) => {
      if (scr.baseEnter(r, c)) return;
      if (r === 2) {
        const hero = heroes[slide];
        if (c === 0) {
          ui.playMedia(hero);
        } else {
          const listed = s.favMedia.includes(hero.id);
          d({ type: "favMedia", id: hero.id });
          ui.toast(
            listed ? `Removed ${hero.title} from Watchlist` : `Added ${hero.title} to Watchlist`,
            "star"
          );
        }
        return;
      }
      shelves[r - 3]?.items[c]?.act();
    },
    edge: (r, _c, dir) => {
      if (r === 2) {
        if (dir === "left") setSlide((v) => (v + heroes.length - 1) % heroes.length);
        if (dir === "right") setSlide((v) => (v + 1) % heroes.length);
        sfx("move");
      }
    },
    onMenu: (r, c) => {
      if (r >= 3) shelves[r - 3]?.items[c]?.ctx?.();
    },
  });

  const heroFocused = scr.active && scr.nav.r === 2;

  useEffect(() => {
    if (!scr.active || heroFocused) return;
    const t = setInterval(() => setSlide((v) => (v + 1) % heroes.length), 8000);
    return () => clearInterval(t);
  }, [scr.active, heroFocused, slide, heroes.length]);

  const listed = s.favMedia.includes(heroes[slide].id);

  return (
    <ScreenBody
      chrome={scr.chrome}
      shelves={shelves}
      focus={scr.focus}
      hover={scr.nav.set}
      rowOffset={3}
    >
      <Hero
        m={heroes[slide]}
        slide={slide}
        total={heroes.length}
        focus={scr.focus}
        hover={scr.nav.set}
        onPlay={() => ui.playMedia(heroes[slide])}
        onList={() => {
          d({ type: "favMedia", id: heroes[slide].id });
          ui.toast(listed ? "Removed from Watchlist" : "Added to Watchlist", "star");
        }}
        listed={listed}
        paused={heroFocused || !scr.active}
      />
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
  const nCells = ordered.length + 1; // + Add tile
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
    <ScreenBody
      chrome={scr.chrome}
      shelves={[]}
      focus={scr.focus}
      hover={scr.nav.set}
      rowOffset={2}
    >
      <div className="rise px-12 pt-1">
        <div className="mb-4 flex items-center gap-3">
          <span className="h-4 w-1 rounded-full" style={{ background: "var(--accent)" }} />
          <h2 className="font-display text-[1.05rem] font-bold tracking-wide text-slate-100">
            Your Apps
          </h2>
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
            {ordered.length} installed · Enter launches · ⇧M options
          </span>
        </div>
        <div
          className="grid gap-x-6 gap-y-7"
          style={{ gridTemplateColumns: `repeat(${APP_COLS}, minmax(0, 1fr))` }}
        >
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

/* ------------------------------- LIVE ------------------------------ */

export function LiveScreen() {
  const ui = useUI();
  const gridRows = Math.ceil(CHANNELS.length / LIVE_COLS);

  const scr = useScreen("live", {
    rows: 2 + gridRows,
    cols: (r) => {
      if (r === 0) return 3;
      if (r === 1) return TABS.length;
      return Math.max(1, Math.min(LIVE_COLS, CHANNELS.length - (r - 2) * LIVE_COLS));
    },
    enter: (r, c) => {
      if (scr.baseEnter(r, c)) return;
      const idx = (r - 2) * LIVE_COLS + c;
      if (CHANNELS[idx]) ui.playLive(CHANNELS[idx]);
    },
  });

  return (
    <ScreenBody
      chrome={scr.chrome}
      shelves={[]}
      focus={scr.focus}
      hover={scr.nav.set}
      rowOffset={2}
    >
      <div className="rise px-12 pt-1">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex items-center gap-2 rounded-md bg-red-600/90 px-2 py-1 text-[0.65rem] font-bold tracking-[0.18em] text-white">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-white" />
            LIVE
          </span>
          <h2 className="font-display text-[1.05rem] font-bold tracking-wide text-slate-100">
            Channels on now
          </h2>
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
            ← → surfs channels while watching
          </span>
        </div>
        <div
          className="grid gap-6"
          style={{ gridTemplateColumns: `repeat(${LIVE_COLS}, minmax(0, 1fr))` }}
        >
          {CHANNELS.map((ch, i) => (
            <Cell
              key={ch.id}
              r={2 + Math.floor(i / LIVE_COLS)}
              c={i % LIVE_COLS}
              focus={scr.focus}
              hover={scr.nav.set}
              onClick={() => ui.playLive(ch)}
              className="justify-self-start"
            >
              <ChannelCard ch={ch} />
            </Cell>
          ))}
        </div>
      </div>
    </ScreenBody>
  );
}

/* --------------------------- MOVIES / SHOWS ------------------------ */

function MediaScreen({ tab }: { tab: "movies" | "shows" }) {
  const ui = useUI();
  const { s } = useStore();
  const kind = tab === "movies" ? "movie" : "show";
  const all = MEDIA.filter((m) => m.type === kind);
  const featured = all.slice(0, 4);

  const shelves: Shelf[] = [
    {
      title: tab === "movies" ? "Featured Films" : "Spotlight Series",
      kicker: "In the spotlight",
      items: featured.map(
        (m): Item => ({
          key: "fw-" + m.id,
          node: <Poster m={m} wide />,
          act: () => ui.openMedia(m),
        })
      ),
    },
    {
      title: tab === "movies" ? "All Movies" : "All Shows",
      kicker: `${all.length} titles`,
      items: all.map((m) => mediaItem(m, ui)),
    },
    {
      title: "On Your Watchlist",
      items: all.filter((m) => s.favMedia.includes(m.id)).map((m) => mediaItem(m, ui)),
    },
  ].filter((x) => x.items.length > 0);

  const scr = useScreen(tab, {
    rows: 2 + shelves.length,
    cols: (r) =>
      r === 0 ? 3 : r === 1 ? TABS.length : shelves[r - 2].items.length,
    enter: (r, c) => {
      if (scr.baseEnter(r, c)) return;
      shelves[r - 2]?.items[c]?.act();
    },
  });

  return (
    <ScreenBody
      chrome={scr.chrome}
      shelves={shelves}
      focus={scr.focus}
      hover={scr.nav.set}
      rowOffset={2}
    />
  );
}

export function MoviesScreen() {
  return <MediaScreen tab="movies" />;
}
export function ShowsScreen() {
  return <MediaScreen tab="shows" />;
}

/* ------------------------------ LIBRARY ---------------------------- */

export function LibraryScreen() {
  const { s } = useStore();
  const ui = useUI();

  const favAppItems = s.favApps
    .map((id) => s.apps.find((a) => a.id === id))
    .filter((a): a is AppDef => !!a)
    .map((a) => appBadgeItem(a, ui));

  const watchItems = s.favMedia
    .map((id) => MEDIA.find((m) => m.id === id))
    .filter((m): m is MediaItem => !!m)
    .map((m) => mediaItem(m, ui));

  const recentItems: Item[] = s.recents
    .slice(0, 8)
    .map((r): Item | null => {
      const app = s.apps.find((a) => a.id === r.id);
      if (app)
        return {
          key: "rw-" + app.id + r.ts,
          node: (
            <WideCard
              title={app.name}
              sub={`${app.cat} · ${new Date(r.ts).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`}
              bg={`linear-gradient(140deg, ${app.color}, #0c1220 85%)`}
              icon={app.icon}
              iconColor="#ffffff"
            />
          ),
          act: () => ui.openApp(app),
          ctx: () => ui.openAppOptions(app),
        };
      const m = MEDIA.find((x) => x.id === r.id);
      if (m)
        return {
          key: "rw-" + m.id + r.ts,
          node: (
            <WideCard
              title={m.title}
              sub={`${m.genre} · ${m.year}`}
              bg={grad(m.hue)}
              img={m.backdrop}
              progress={
                s.mediaProgress[m.id]
                  ? (s.mediaProgress[m.id] / (m.duration * 60)) * 100
                  : undefined
              }
            />
          ),
          act: () => ui.playMedia(m),
        };
      return null;
    })
    .filter((x): x is Item => x !== null);

  const allAppItems: Item[] = [
    ...s.apps.map((a) => appBadgeItem(a, ui)),
    { key: "add", node: <AddTile />, act: () => ui.openAddApp() },
  ];

  const shelves: Shelf[] = [
    { title: "Favorite Apps", items: favAppItems },
    { title: "Watchlist", items: watchItems },
    { title: "Recently Opened", kicker: "Last 16 launches", items: recentItems },
    { title: "All Apps", kicker: `${s.apps.length} total`, items: allAppItems },
  ].filter((x) => x.items.length > 0);

  const scr = useScreen("library", {
    rows: 2 + shelves.length,
    cols: (r) =>
      r === 0 ? 3 : r === 1 ? TABS.length : shelves[r - 2].items.length,
    enter: (r, c) => {
      if (scr.baseEnter(r, c)) return;
      shelves[r - 2]?.items[c]?.act();
    },
    onMenu: (r, c) => {
      if (r >= 2) shelves[r - 2]?.items[c]?.ctx?.();
    },
  });

  return (
    <ScreenBody
      chrome={scr.chrome}
      shelves={shelves}
      focus={scr.focus}
      hover={scr.nav.set}
      rowOffset={2}
    />
  );
}
