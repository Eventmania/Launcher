import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  PROFILES,
  TABS,
  fmtClock,
  grad,
  hashStr,
  type AppDef,
  type PdFilm,
  type TabId,
  type TonightItem,
  type TvShow,
  type WikiFilm,
} from "../data";
import { useCatalog } from "../lib/catalog";
import { recallFocus, rememberFocus, useTvNav, type EdgeDir } from "../lib/keys";
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
  ShelfRow,
  ShelfSkeleton,
  ShowCard,
  WideCard,
  WikiCard,
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
const GRID_COLS = 4;

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
        <ShelfRow
          key={sh.title}
          title={sh.title}
          kicker={sh.kicker}
          delay={ri * 70}
        >
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

const filmItem = (f: PdFilm, ui: UIApi): Item => ({
  key: "fi-" + f.id,
  node: <FilmCard f={f} playable />,
  act: () => ui.openFilm(f),
});

const showItem = (x: TvShow, ui: UIApi): Item => ({
  key: "si-" + x.id,
  node: <ShowCard s={x} />,
  act: () => ui.openShow(x),
});

const episodeItem = (e: TonightItem, ui: UIApi): Item => ({
  key: "ei-" + e.id,
  node: <EpisodeCard ep={e} />,
  act: () => ui.openEpisode(e),
});

const wikiItem = (w: WikiFilm, ui: UIApi): Item => ({
  key: "wi-" + w.id,
  node: <WikiCard w={w} />,
  act: () => ui.openWiki(w),
});

function SectionHeader({ title, kicker, badge }: { title: string; kicker?: string; badge?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      {badge}
      <span className="h-4 w-1 rounded-full" style={{ background: "var(--accent)" }} />
      <h2 className="font-display text-[1.05rem] font-bold tracking-wide text-slate-100">
        {title}
      </h2>
      {kicker && (
        <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
          {kicker}
        </span>
      )}
    </div>
  );
}

function EmptyNote({ text }: { text: string }) {
  return (
    <div className="mx-12 mb-8 rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-5 text-sm text-slate-400">
      {text}
    </div>
  );
}

/* ------------------------------- HOME ------------------------------ */

export function HomeScreen() {
  const { s, d } = useStore();
  const ui = useUI();
  const cat = useCatalog();
  const [slide, setSlide] = useState(0);

  const topShows = [...cat.shows].sort(
    (a, b) => (b.rating ?? 0) - (a.rating ?? 0)
  );

  const heroes: HeroItem[] = [];
  for (let i = 0; i < 3; i++) {
    if (cat.films[i]) heroes.push({ kind: "film", film: cat.films[i] });
    if (topShows[i]) heroes.push({ kind: "show", show: topShows[i] });
  }

  const contFilms = Object.entries(s.mediaProgress)
    .map(([id, t]) => ({ f: cat.films.find((x) => x.id === id), t }))
    .filter(
      (x): x is { f: PdFilm; t: number } =>
        !!x.f && x.t > 30 && x.t < x.f.runtimeMin * 60 * 0.95
    );

  const contApps = s.recents
    .map((r) => s.apps.find((a) => a.id === r.id))
    .filter((a): a is AppDef => !!a)
    .slice(0, 6);

  const continueItems: Item[] = [
    ...contFilms.map(({ f, t }) => ({
      key: "cf-" + f.id,
      node: (
        <WideCard
          title={f.title}
          sub={`Resume · ${fmtClock(t)} watched`}
          bg={grad(hashStr(f.id) % 360)}
          img={f.img}
          progress={(t / (f.runtimeMin * 60)) * 100}
        />
      ),
      act: () => ui.playFilm(f),
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
        />
      ),
      act: () => ui.openApp(a),
      ctx: () => ui.openAppOptions(a),
    })),
  ];

  const shelves = [
    {
      title: "Continue Watching",
      kicker: "Real progress · saved on this PC",
      items: continueItems,
    },
    {
      title: "On Tonight",
      kicker: "Live schedule · TVMaze",
      items: cat.tonight.slice(0, 8).map((e) => episodeItem(e, ui)),
    },
    {
      title: "Real Cinema",
      kicker: "Public-domain classics · stream free",
      items: cat.films.map((f) => filmItem(f, ui)),
    },
    {
      title: "Acclaimed Films",
      kicker: "Real data · Wikipedia",
      items: cat.acclaimed.map((w) => wikiItem(w, ui)),
    },
    {
      title: "Top-Rated Shows",
      kicker: "Live data · TVMaze",
      items: topShows.slice(0, 12).map((x) => showItem(x, ui)),
    },
    {
      title: "Your Apps",
      kicker: "Launch real programs",
      items: [
        ...s.apps.slice(0, 10).map((a) => appBadgeItem(a, ui)),
        {
          key: "add",
          node: <AddTile />,
          act: () => ui.openAddApp(),
        } as Item,
      ],
    },
  ].filter((x) => x.items.length > 0);

  const scr = useScreen("home", {
    rows: 3 + shelves.length,
    cols: (r) =>
      r === 0
        ? 3
        : r === 1
          ? TABS.length
          : r === 2
            ? 2
            : shelves[r - 3].items.length,
    enter: (r, c) => {
      if (scr.baseEnter(r, c)) return;
      if (r === 2) {
        const h = heroes[Math.min(slide, heroes.length - 1)];
        if (!h) return;
        if (c === 0) {
          if (h.kind === "film") ui.playFilm(h.film);
          else ui.openShow(h.show);
        } else {
          const id = h.kind === "film" ? h.film.id : h.show.id;
          const title = h.kind === "film" ? h.film.title : h.show.name;
          const was = s.favMedia.includes(id);
          d({ type: "favMedia", id });
          ui.toast(was ? `Removed ${title} from Watchlist` : `Added ${title} to Watchlist`, "star");
        }
        return;
      }
      shelves[r - 3]?.items[c]?.act();
    },
    edge: (r, _c, dir) => {
      if (r === 2 && heroes.length > 1) {
        setSlide((v) =>
          dir === "left"
            ? (v + heroes.length - 1) % heroes.length
            : dir === "right"
              ? (v + 1) % heroes.length
              : v
        );
        if (dir === "left" || dir === "right") sfx("move");
      }
    },
    onMenu: (r, c) => {
      if (r >= 3) shelves[r - 3]?.items[c]?.ctx?.();
    },
  });

  const heroFocused = scr.active && scr.nav.r === 2;

  useEffect(() => {
    if (!scr.active || heroFocused || heroes.length < 2) return;
    const t = setInterval(
      () => setSlide((v) => (v + 1) % heroes.length),
      8000
    );
    return () => clearInterval(t);
  }, [scr.active, heroFocused, slide, heroes.length]);

  const hero = heroes[Math.min(slide, Math.max(0, heroes.length - 1))];
  const heroId = hero ? (hero.kind === "film" ? hero.film.id : hero.show.id) : "";

  return (
    <ScreenBody
      chrome={scr.chrome}
      shelves={shelves}
      focus={scr.focus}
      hover={scr.nav.set}
      rowOffset={3}
    >
      {hero ? (
        <Hero
          item={hero}
          slide={slide}
          total={heroes.length}
          focus={scr.focus}
          hover={scr.nav.set}
          onPrimary={() =>
            hero.kind === "film" ? ui.playFilm(hero.film) : ui.openShow(hero.show)
          }
          onList={() => {
            const id = hero.kind === "film" ? hero.film.id : hero.show.id;
            const was = s.favMedia.includes(id);
            d({ type: "favMedia", id });
            ui.toast(was ? "Removed from Watchlist" : "Added to Watchlist", "star");
          }}
          listed={s.favMedia.includes(heroId)}
          paused={heroFocused || !scr.active}
        />
      ) : (
        <div className="mx-12 mt-2 h-[24rem] overflow-hidden rounded-2xl ring-1 ring-white/10">
          <div className="shimmer h-full w-full" />
        </div>
      )}
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
    <ScreenBody
      chrome={scr.chrome}
      shelves={[]}
      focus={scr.focus}
      hover={scr.nav.set}
      rowOffset={2}
    >
      <div className="rise px-12 pt-1">
        <SectionHeader
          title="Your Apps"
          kicker={`${ordered.length} installed · Enter launches · ⇧M options`}
        />
        <div
          className="grid gap-x-6 gap-y-7"
          style={{
            gridTemplateColumns: `repeat(${APP_COLS}, minmax(0, 1fr))`,
          }}
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

/* ------------------------------ TONIGHT ---------------------------- */

export function TonightScreen() {
  const ui = useUI();
  const cat = useCatalog();
  const items = cat.tonight;
  const rows = items.length ? Math.ceil(items.length / GRID_COLS) : 0;

  const scr = useScreen("tonight", {
    rows: 2 + Math.max(rows, 1),
    cols: (r) => {
      if (r === 0) return 3;
      if (r === 1) return TABS.length;
      if (!rows) return 0;
      return Math.max(1, Math.min(GRID_COLS, items.length - (r - 2) * GRID_COLS));
    },
    enter: (r, c) => {
      if (scr.baseEnter(r, c)) return;
      const idx = (r - 2) * GRID_COLS + c;
      if (items[idx]) ui.openEpisode(items[idx]);
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
        <SectionHeader
          title="On Tonight"
          kicker={
            items.length
              ? `${items.length} real episodes airing today · TVMaze`
              : "Live broadcast schedule"
          }
          badge={
            <span className="flex items-center gap-1.5 rounded-md bg-red-600/90 px-2 py-1 text-[0.65rem] font-bold tracking-[0.18em] text-white">
              <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-white" />
              LIVE
            </span>
          }
        />
        {items.length > 0 ? (
          <div
            className="grid gap-6"
            style={{
              gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))`,
            }}
          >
            {items.map((ep, i) => (
              <Cell
                key={ep.id}
                r={2 + Math.floor(i / GRID_COLS)}
                c={i % GRID_COLS}
                focus={scr.focus}
                hover={scr.nav.set}
                onClick={() => ui.openEpisode(ep)}
                className="justify-self-start"
              >
                <EpisodeCard ep={ep} />
              </Cell>
            ))}
          </div>
        ) : cat.loading ? (
          <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))` }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="shimmer h-[12.5rem] rounded-xl" />
            ))}
          </div>
        ) : (
          <EmptyNote text="Tonight's schedule hasn't loaded — likely no network connection right now. Everything else (your apps, films, saved progress) still works. Press F5 or revisit to retry." />
        )}
      </div>
    </ScreenBody>
  );
}

/* --------------------------- MOVIES / SHOWS ------------------------ */

export function MoviesScreen() {
  const ui = useUI();
  const cat = useCatalog();

  const shelves = [
    {
      title: "Real Cinema — Stream Free",
      kicker: "Public-domain features · press Enter, then Play",
      items: cat.films.map((f) => filmItem(f, ui)),
    },
    {
      title: "Acclaimed Films",
      kicker: "Live metadata · Wikipedia",
      items: cat.acclaimed.map((w) => wikiItem(w, ui)),
    },
  ].filter((x) => x.items.length > 0);

  const scr = useScreen("movies", {
    rows: 2 + Math.max(shelves.length, 1),
    cols: (r) => {
      if (r === 0) return 3;
      if (r === 1) return TABS.length;
      const sh = shelves[r - 2];
      return sh ? sh.items.length : 0;
    },
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
    >
      {cat.loading && !shelves.length && (
        <div className="pt-2">
          <ShelfSkeleton />
          <ShelfSkeleton delay={120} />
        </div>
      )}
    </ScreenBody>
  );
}

export function ShowsScreen() {
  const ui = useUI();
  const cat = useCatalog();

  const byGenre = new Map<string, TvShow[]>();
  for (const x of cat.shows) {
    const g = x.genres[0] ?? "Series";
    byGenre.set(g, [...(byGenre.get(g) ?? []), x].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)));
  }
  const genres = [...byGenre.keys()].sort(
    (a, b) => (byGenre.get(b)?.length ?? 0) - (byGenre.get(a)?.length ?? 0)
  );

  const shelves = [
    ...genres.map((g) => ({
      title: g,
      kicker: `${byGenre.get(g)?.length ?? 0} shows`,
      items: (byGenre.get(g) ?? []).slice(0, 12).map((x) => showItem(x, ui)),
    })),
    {
      title: "All Shows",
      kicker: `${cat.shows.length} titles · live from TVMaze`,
      items: [...cat.shows]
        .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
        .map((x) => showItem(x, ui)),
    },
  ].filter((x) => x.items.length > 0);

  const scr = useScreen("shows", {
    rows: 2 + Math.max(shelves.length, 1),
    cols: (r) => {
      if (r === 0) return 3;
      if (r === 1) return TABS.length;
      const sh = shelves[r - 2];
      return sh ? sh.items.length : 0;
    },
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
    >
      {cat.loading && !shelves.length && (
        <div className="pt-2">
          <ShelfSkeleton />
          <ShelfSkeleton delay={120} />
        </div>
      )}
    </ScreenBody>
  );
}

/* ------------------------------ LIBRARY ---------------------------- */

export function LibraryScreen() {
  const { s } = useStore();
  const ui = useUI();
  const cat = useCatalog();

  const favAppItems = s.favApps
    .map((id) => s.apps.find((a) => a.id === id))
    .filter((a): a is AppDef => !!a)
    .map((a) => appBadgeItem(a, ui));

  const watchItems: Item[] = s.favMedia
    .map((id) => {
      const f = cat.films.find((x) => x.id === id);
      if (f) return filmItem(f, ui);
      const sh = cat.shows.find((x) => x.id === id);
      if (sh) return showItem(sh, ui);
      const w = cat.acclaimed.find((x) => x.id === id);
      if (w) return wikiItem(w, ui);
      return null;
    })
    .filter((x): x is Item => !!x);

  const recentItems: Item[] = s.recents
    .slice(0, 8)
    .map((r): Item | null => {
      const f = cat.films.find((x) => x.id === r.id);
      if (f) {
        const t = s.mediaProgress[f.id];
        return {
          key: "rw-" + f.id,
          node: (
            <WideCard
              title={f.title}
              sub={`Film · ${f.year}${t ? ` · ${Math.round((t / (f.runtimeMin * 60)) * 100)}% watched` : ""}`}
              bg={grad(hashStr(f.id) % 360)}
              img={f.img}
              progress={t ? (t / (f.runtimeMin * 60)) * 100 : undefined}
            />
          ),
          act: () => ui.playFilm(f),
        };
      }
      const app = s.apps.find((a) => a.id === r.id);
      if (app)
        return {
          key: "rw-" + app.id,
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
    {
      title: "Recently Opened",
      kicker: "Real launch history",
      items: recentItems,
    },
    {
      title: "All Apps",
      kicker: `${s.apps.length} total`,
      items: allAppItems,
    },
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

export { appTileItem };
