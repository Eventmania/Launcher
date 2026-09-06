import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { OverlayRoot } from "./components/overlays";
import { PlayerLayer } from "./components/player";
import {
  AppsScreen,
  HomeScreen,
  LibraryScreen,
  MoviesScreen,
  ShowsScreen,
  TonightScreen,
} from "./components/screens";
import {
  ACCENTS,
  WALLS,
  type AppDef,
  type NetStream,
  type PdFilm,
  type TabId,
  type TonightItem,
  type TvShow,
  type WikiFilm,
} from "./data";
import { Icon } from "./icons";
import { CatalogProvider, streamCandidates } from "./lib/catalog";
import { fileUrl, type LocalFile } from "./lib/local";
import { sfx } from "./lib/sound";
import { StoreProvider, useStore } from "./lib/store";
import { UICtx, type Layer, type UIApi } from "./lib/ui";
import { fireProtocol } from "./lib/util";

export default function App() {
  return (
    <StoreProvider>
      <Root />
    </StoreProvider>
  );
}

function Root() {
  const { s } = useStore();
  return (
    <CatalogProvider regionId={s.settings.region}>
      <Shell />
    </CatalogProvider>
  );
}

interface ToastMsg {
  id: number;
  msg: string;
  icon?: string;
}

function goFullscreen() {
  try {
    const el = document.documentElement;
    if (!document.fullscreenElement && el.requestFullscreen) {
      void el.requestFullscreen().catch(() => {
        /* browsers may refuse without a pointer gesture — F11 still works */
      });
    }
  } catch {
    /* fullscreen unsupported */
  }
}

function Shell() {
  const { s, d } = useStore();
  const [tab, setTab] = useState<TabId>("home");
  const [layer, setLayer] = useState<Layer>(null);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [hint, setHint] = useState(true);
  const toastId = useRef(0);

  const toast = useCallback((msg: string, icon?: string) => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-2), { id, msg, icon }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3400);
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--accent",
      ACCENTS[s.settings.accent]?.hex ?? ACCENTS[0].hex
    );
  }, [s.settings.accent]);

  /* Ctrl+Shift+H — close the current app view, straight back to Home */
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "h") {
        e.preventDefault();
        e.stopPropagation();
        setLayer(null);
        setTab("home");
        sfx("back");
        toast("Back to Home", "home");
      }
    };
    window.addEventListener("keydown", h, true);
    return () => window.removeEventListener("keydown", h, true);
  }, [toast]);

  /* dismiss the onboarding hint on first interaction */
  useEffect(() => {
    if (!hint) return;
    const off = () => setHint(false);
    window.addEventListener("keydown", off, { once: true });
    window.addEventListener("pointerdown", off, { once: true });
    return () => {
      window.removeEventListener("keydown", off);
      window.removeEventListener("pointerdown", off);
    };
  }, [hint]);

  const close = useCallback(() => setLayer(null), []);

  const launchApp = useCallback(
    (a: AppDef) => {
      d({ type: "launch", id: a.id });
      goFullscreen();
      if (a.kind === "url") {
        window.open(a.target, "_blank", "noopener");
        setLayer({ type: "launch", app: a });
      } else if (a.kind === "protocol") {
        fireProtocol(a.target);
        setLayer({ type: "launch", app: a });
      } else {
        setLayer({ type: "miniapp", app: a });
      }
    },
    [d]
  );

  const playFilm = useCallback((f: PdFilm) => {
    goFullscreen();
    setLayer({
      type: "player",
      title: f.title,
      sub: `${f.year} · real public-domain stream via archive.org`,
      progressKey: f.id,
      sources: streamCandidates(f),
      poster: f.img,
      external: { label: "Play in VLC", url: "vlc://" + streamCandidates(f)[0] },
    });
    d({ type: "launch", id: f.id });
  }, [d]);

  const playLocal = useCallback(
    (f: LocalFile) => {
      void fileUrl(f).then((url) => {
        if (!url) {
          toast("Can't read that file — re-grant folder access on Home", "info");
          return;
        }
        goFullscreen();
        setLayer({
          type: "player",
          title: f.name,
          sub: `${f.folderName} / ${f.relPath} · local file`,
          progressKey: "loc:" + f.key,
          sources: [url],
        });
        d({ type: "launch", id: "loc:" + f.key });
      });
    },
    [d, toast]
  );

  const playStream = useCallback(
    (st: NetStream) => {
      goFullscreen();
      setLayer({
        type: "player",
        title: st.name,
        sub: st.url + " · network stream",
        progressKey: "net:" + st.id,
        sources: [st.url],
        external: { label: "Open in VLC", url: "vlc://" + st.url },
      });
      d({ type: "launch", id: "net:" + st.id });
    },
    [d]
  );

  const ui: UIApi = useMemo(
    () => ({
      tab,
      setTab,
      layer,
      setLayer,
      close,
      toast,
      openApp: launchApp,
      openFilm: (f: PdFilm) => setLayer({ type: "film", film: f }),
      openShow: (sh: TvShow) => setLayer({ type: "show", show: sh }),
      openEpisode: (ep: TonightItem) => setLayer({ type: "episode", ep }),
      openWiki: (w: WikiFilm) => setLayer({ type: "wiki", wiki: w }),
      playFilm,
      playLocal,
      playStream,
      openSearch: (seed?: string) => setLayer({ type: "search", seed }),
      openSettings: () => setLayer({ type: "settings" }),
      openAddApp: (a?: AppDef) => setLayer({ type: "addApp", app: a }),
      openAppOptions: (a: AppDef) => setLayer({ type: "appOptions", app: a }),
    }),
    [tab, layer, close, toast, launchApp, playFilm, playLocal, playStream]
  );

  return (
    <UICtx.Provider value={ui}>
      <div className="relative min-h-screen overflow-x-hidden font-body text-slate-100">
        {/* ambient wallpaper */}
        <div className="fixed inset-0 -z-10 bg-[#070b13]">
          <img
            key={s.settings.wall}
            src={WALLS[s.settings.wall]}
            alt=""
            className="animate-wall h-full w-full object-cover opacity-60"
            draggable={false}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#070b13]/70 via-[#070b13]/45 to-[#070b13]" />
        </div>

        <Screen tab={tab} />

        {/* overlays & players */}
        <OverlayRoot />
        <PlayerLayer />

        {/* toasts */}
        <div className="pointer-events-none fixed bottom-8 left-1/2 z-[90] flex -translate-x-1/2 flex-col items-center gap-2">
          {toasts.map((t) => (
            <div
              key={t.id}
              className="toast-in flex items-center gap-3 rounded-full bg-[#0d1420]/95 px-5 py-3 text-sm font-semibold text-white shadow-2xl ring-1 ring-white/15 backdrop-blur"
            >
              {t.icon && <Icon name={t.icon} className="h-4 w-4" />}
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: "var(--accent)" }}
              />
              {t.msg}
            </div>
          ))}
        </div>

        {/* onboarding hint */}
        {hint && layer === null && (
          <div className="fade-in pointer-events-none fixed bottom-6 left-1/2 z-[85] -translate-x-1/2">
            <div className="flex items-center gap-4 rounded-full bg-[#0d1420]/90 px-6 py-3 text-[0.8rem] font-medium text-slate-300 shadow-2xl ring-1 ring-white/12 backdrop-blur">
              <span className="flex items-center gap-1.5">
                <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[0.68rem] font-bold text-white">↑↓←→</kbd>
                navigate
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[0.68rem] font-bold text-white">Enter</kbd>
                open
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[0.68rem] font-bold text-white">Esc</kbd>
                back
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[0.68rem] font-bold text-white">F11</kbd>
                TV mode
              </span>
            </div>
          </div>
        )}
      </div>
    </UICtx.Provider>
  );
}

function Screen({ tab }: { tab: TabId }) {
  switch (tab) {
    case "home":
      return <HomeScreen />;
    case "tonight":
      return <TonightScreen />;
    case "movies":
      return <MoviesScreen />;
    case "shows":
      return <ShowsScreen />;
    case "apps":
      return <AppsScreen />;
    case "library":
      return <LibraryScreen />;
    default:
      return <HomeScreen />;
  }
}


