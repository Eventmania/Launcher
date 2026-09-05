import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ACCENTS,
  WALLS,
  type AppDef,
  type Channel,
  type MediaItem,
  type TabId,
} from "./data";
import { Icon } from "./icons";
import { StoreProvider, useStore } from "./lib/store";
import { UICtx, type Layer } from "./lib/ui";
import { fireProtocol } from "./lib/util";
import {
  AppsScreen,
  HomeScreen,
  LibraryScreen,
  LiveScreen,
  MoviesScreen,
  ShowsScreen,
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
import { LiveOverlay, MiniAppOverlay, PlayerOverlay } from "./components/player";

interface ToastT {
  id: number;
  msg: string;
  icon?: string;
}

function Shell() {
  const { s, d } = useStore();
  const [tab, setTab] = useState<TabId>("home");
  const [layer, setLayer] = useState<Layer>(null);
  const [toasts, setToasts] = useState<ToastT[]>([]);
  const [hint, setHint] = useState(true);
  const idRef = useRef(1);

  const toast = useCallback((msg: string, icon?: string) => {
    const id = idRef.current++;
    setToasts((t) => [...t.slice(-2), { id, msg, icon }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
  }, []);

  useEffect(() => {
    const h = () => setHint(false);
    window.addEventListener("keydown", h, { once: true, capture: true });
    const t = setTimeout(h, 14000);
    return () => {
      window.removeEventListener("keydown", h);
      clearTimeout(t);
    };
  }, []);

  const ui = useMemo(() => {
    const openApp = (app: AppDef) => {
      d({ type: "launch", id: app.id });
      if (app.kind === "url") {
        window.open(app.target, "_blank", "noopener");
        toast(`Opening ${app.name} in a new tab`, "external");
      } else if (app.kind === "protocol") {
        fireProtocol(app.target);
        setLayer({ type: "launch", app });
      } else {
        setLayer({ type: "miniapp", app });
      }
    };
    return {
      tab,
      setTab,
      layer,
      setLayer,
      close: () => setLayer(null),
      toast,
      openApp,
      openMedia: (m: MediaItem) => setLayer({ type: "details", media: m }),
      playMedia: (m: MediaItem) => {
        d({ type: "launch", id: m.id });
        setLayer({ type: "player", media: m });
      },
      playLive: (c: Channel) => setLayer({ type: "live", channel: c }),
      openSearch: (seed?: string) => setLayer({ type: "search", seed }),
      openSettings: () => setLayer({ type: "settings" }),
      openAddApp: (a?: AppDef) => setLayer({ type: "addApp", app: a }),
      openAppOptions: (a: AppDef) => setLayer({ type: "appOptions", app: a }),
    };
  }, [tab, layer, toast, d]);

  return (
    <UICtx.Provider value={ui}>
      <div
        className="font-body fixed inset-0 overflow-hidden text-slate-100"
        style={{ "--accent": ACCENTS[s.settings.accent] } as React.CSSProperties}
      >
        {/* ambient wallpaper */}
        <div key={s.settings.wall} className="fade-in absolute inset-0">
          <img
            src={WALLS[s.settings.wall]}
            alt=""
            className="animate-wall h-full w-full object-cover opacity-75"
            draggable={false}
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-[#05080f]/85 via-[#05080f]/55 to-[#05080f]" />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 90% at 50% 0%, transparent 42%, rgba(3,5,10,0.8) 100%)",
          }}
        />

        {/* stage */}
        <div className="no-scrollbar relative z-10 h-full overflow-y-auto overflow-x-hidden">
          {tab === "home" && <HomeScreen />}
          {tab === "live" && <LiveScreen />}
          {tab === "movies" && <MoviesScreen />}
          {tab === "shows" && <ShowsScreen />}
          {tab === "apps" && <AppsScreen />}
          {tab === "library" && <LibraryScreen />}
        </div>

        {/* overlays */}
        {layer && layer.type === "search" && <SearchOverlay seed={layer.seed} />}
        {layer && layer.type === "settings" && <SettingsOverlay />}
        {layer && layer.type === "help" && <HelpOverlay />}
        {layer && layer.type === "details" && <DetailsOverlay m={layer.media} />}
        {layer && layer.type === "player" && <PlayerOverlay m={layer.media} />}
        {layer && layer.type === "live" && <LiveOverlay ch={layer.channel} />}
        {layer && layer.type === "appOptions" && <AppOptionsOverlay app={layer.app} />}
        {layer && layer.type === "addApp" && <AddAppOverlay app={layer.app} />}
        {layer && layer.type === "launch" && <LaunchOverlay app={layer.app} />}
        {layer && layer.type === "miniapp" && <MiniAppOverlay app={layer.app} />}

        {/* toasts */}
        <div className="pointer-events-none fixed bottom-8 left-1/2 z-[70] flex -translate-x-1/2 flex-col items-center gap-2">
          {toasts.map((t) => (
            <div
              key={t.id}
              className="toast-in flex items-center gap-2.5 rounded-full bg-[#101a2b]/95 px-5 py-2.5 text-sm font-semibold text-slate-100 shadow-2xl ring-1 ring-white/15"
            >
              {t.icon && (
                <span style={{ color: "var(--accent)" }}>
                  <Icon name={t.icon} className="h-4 w-4" />
                </span>
              )}
              {t.msg}
            </div>
          ))}
        </div>

        {/* onboarding hint */}
        {hint && !layer && (
          <div className="toast-in fixed bottom-8 left-12 z-40 flex items-center gap-4 rounded-xl bg-[#0c1322]/90 px-5 py-3.5 text-[0.8rem] font-medium text-slate-300 shadow-2xl ring-1 ring-white/10">
            <span className="flex items-center gap-1.5">
              {["←", "↑", "↓", "→"].map((k) => (
                <kbd key={k} className="rounded border border-white/20 bg-white/[0.05] px-1.5 py-0.5 font-display text-xs font-bold text-slate-200">
                  {k}
                </kbd>
              ))}
              move
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="rounded border border-white/20 bg-white/[0.05] px-1.5 py-0.5 font-display text-xs font-bold text-slate-200">Enter</kbd>
              open
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="rounded border border-white/20 bg-white/[0.05] px-1.5 py-0.5 font-display text-xs font-bold text-slate-200">Esc</kbd>
              back
            </span>
            <span className="hidden items-center gap-1.5 md:flex">
              <kbd className="rounded border border-white/20 bg-white/[0.05] px-1.5 py-0.5 font-display text-xs font-bold text-slate-200">⇧M</kbd>
              app options
            </span>
            <span className="hidden text-slate-500 lg:inline">…or just start typing to search</span>
          </div>
        )}
      </div>
    </UICtx.Provider>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
