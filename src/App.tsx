import { useEffect, useMemo, useRef, useState } from "react";
import { WALLS, type AppDef, type PdFilm, type TabId, type TonightItem, type TvShow, type WikiFilm } from "./data";
import { CatalogProvider, useCatalog } from "./lib/catalog";
import { useStore, StoreProvider } from "./lib/store";
import { UICtx, type Layer, type UIApi } from "./lib/ui";
import {
  AppsScreen,
  HomeScreen,
  LibraryScreen,
  MoviesScreen,
  ShowsScreen,
  TonightScreen,
} from "./components/screens";
import {
  AddAppOverlay,
  AppOptionsOverlay,
  DetailsOverlay,
  HelpOverlay,
  LaunchOverlay,
  SearchOverlay,
  SettingsOverlay,
} from "./components/overlays";
import { PlayerLayer } from "./components/player";
import { Logo } from "./icons";
import { setSoundEnabled } from "./lib/sound";

interface Toast {
  id: number;
  msg: string;
  icon?: string;
}

function Wallpaper() {
  const { s } = useStore();
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-[#05080f]">
      <img
        key={s.settings.wall}
        src={WALLS[s.settings.wall]}
        alt=""
        className="animate-wall h-full w-full object-cover opacity-55"
        draggable={false}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#05080f]/72 via-[#05080f]/45 to-[#05080f]/92" />
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_-10%,transparent_30%,#05080f_100%)]" />
    </div>
  );
}

function HintBar() {
  const keys: [string, string][] = [
    ["← → ↑ ↓", "Navigate"],
    ["Enter", "Open"],
    ["Esc", "Back"],
    ["Type", "Search"],
    ["⇧M", "App options"],
    ["?", "Help"],
  ];
  return (
    <div className="fixed bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-4 rounded-full border border-white/10 bg-[#0a0f1a]/85 px-6 py-2.5 shadow-xl backdrop-blur">
      {keys.map(([k, v], i) => (
        <span key={k} className="flex items-center gap-2 text-xs text-slate-400">
          {i > 0 && <span className="h-3 w-px bg-white/10" />}
          <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-display text-[0.68rem] font-semibold text-slate-200">
            {k}
          </kbd>
          {v}
        </span>
      ))}
    </div>
  );
}

function Toasts({ list }: { list: Toast[] }) {
  return (
    <div className="pointer-events-none fixed bottom-20 right-10 z-[60] flex flex-col gap-2">
      {list.map((t) => (
        <div
          key={t.id}
          className="toast-in flex items-center gap-3 rounded-xl border border-white/10 bg-[#0c1220]/95 px-4 py-3 shadow-2xl backdrop-blur"
        >
          {t.icon && (
            <span
              className="flex h-7 w-7 items-center justify-center rounded-lg"
              style={{ background: "color-mix(in srgb, var(--accent) 22%, transparent)" }}
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="var(--accent)"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </span>
          )}
          <span className="text-sm font-medium text-slate-100">{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-6 px-10 text-center">
      <div className="flex items-center gap-3">
        <Logo className="h-10 w-10 drop-shadow-[0_0_18px_var(--accent)]" />
        <span className="font-display text-3xl font-extrabold text-white">
          Nova<span style={{ color: "var(--accent)" }}>Deck</span>
        </span>
      </div>
      <div className="flex items-center gap-2.5 text-slate-400">
        <span className="spin-slow h-4 w-4 rounded-full border-2 border-white/20 border-t-white" />
        <span className="text-sm font-medium">
          Loading real shows, tonight's schedule and free cinema…
        </span>
      </div>
      <div className="grid w-full max-w-3xl grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="shimmer h-40 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

function ErrorScreen({ retry }: { retry: () => void }) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-5 px-10 text-center">
      <Logo className="h-10 w-10" />
      <div className="font-display text-2xl font-extrabold text-white">
        Couldn't reach the live catalog
      </div>
      <p className="max-w-md text-sm leading-relaxed text-slate-400">
        TVMaze, archive.org and Wikipedia didn't respond. Check your network connection and try
        again — your installed apps and saved progress are still here.
      </p>
      <button
        onClick={retry}
        className="rounded-full px-7 py-3 font-display text-sm font-bold text-[#07101c]"
        style={{ background: "var(--accent)" }}
      >
        Retry
      </button>
    </div>
  );
}

function Shell() {
  const { s, d } = useStore();
  const cat = useCatalog();
  const [tab, setTab] = useState<TabId>("home");
  const [layer, setLayer] = useState<Layer>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--accent",
      ["#63b3ff", "#ff7a59", "#3ddc97", "#f4c542"][s.settings.accent] ?? "#63b3ff"
    );
    setSoundEnabled(s.settings.sound);
  }, [s.settings.accent, s.settings.sound]);

  const toast = (msg: string, icon?: string) => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-2), { id, msg, icon }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  };

  const ui = useMemo<UIApi>(() => {
    const close = () => setLayer(null);
    return {
      tab,
      setTab,
      layer,
      setLayer,
      close,
      toast,
      openApp: (a: AppDef) => {
        d({ type: "launch", id: a.id });
        if (a.kind === "sim") setLayer({ type: "miniapp", app: a });
        else setLayer({ type: "launch", app: a });
      },
      openFilm: (f: PdFilm) => setLayer({ type: "film", film: f }),
      openShow: (x: TvShow) => setLayer({ type: "show", show: x }),
      openEpisode: (e: TonightItem) => setLayer({ type: "episode", ep: e }),
      openWiki: (w: WikiFilm) => setLayer({ type: "wiki", wiki: w }),
      playFilm: (f: PdFilm) => {
        d({ type: "launch", id: f.id });
        setLayer({ type: "player", film: f });
      },
      openSearch: (seed?: string) => setLayer({ type: "search", seed }),
      openSettings: () => setLayer({ type: "settings" }),
      openAddApp: (a?: AppDef) => setLayer({ type: "addApp", app: a }),
      openAppOptions: (a: AppDef) => setLayer({ type: "appOptions", app: a }),
    };
  }, [tab, layer, d]);

  return (
    <UICtx.Provider value={ui}>
      <Wallpaper />
      <div className="grain relative min-h-screen overflow-x-hidden text-slate-100">
        {cat.loading && cat.empty ? (
          <LoadingScreen />
        ) : cat.error && cat.empty ? (
          <ErrorScreen retry={cat.reload} />
        ) : (
          <>
            {tab === "home" && <HomeScreen />}
            {tab === "tonight" && <TonightScreen />}
            {tab === "movies" && <MoviesScreen />}
            {tab === "shows" && <ShowsScreen />}
            {tab === "apps" && <AppsScreen />}
            {tab === "library" && <LibraryScreen />}
          </>
        )}

        {layer?.type === "search" && <SearchOverlay />}
        {(layer?.type === "film" ||
          layer?.type === "show" ||
          layer?.type === "episode" ||
          layer?.type === "wiki") && <DetailsOverlay />}
        {layer?.type === "settings" && <SettingsOverlay />}
        {layer?.type === "help" && <HelpOverlay />}
        {layer?.type === "appOptions" && <AppOptionsOverlay />}
        {layer?.type === "addApp" && <AddAppOverlay />}
        {layer?.type === "launch" && <LaunchOverlay />}
        <PlayerLayer />

        {layer === null && !(cat.loading && cat.empty) && <HintBar />}
      </div>
      <Toasts list={toasts} />
    </UICtx.Provider>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <CatalogProvider>
        <Shell />
      </CatalogProvider>
    </StoreProvider>
  );
}
