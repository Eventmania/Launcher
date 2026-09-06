import { createContext, useContext } from "react";
import type {
  AppDef,
  PdFilm,
  TabId,
  TonightItem,
  TvShow,
  WikiFilm,
} from "../data";

export type Layer =
  | null
  | { type: "search"; seed?: string }
  | { type: "settings" }
  | { type: "help" }
  | { type: "film"; film: PdFilm }
  | { type: "show"; show: TvShow }
  | { type: "episode"; ep: TonightItem }
  | { type: "wiki"; wiki: WikiFilm }
  | { type: "player"; film: PdFilm }
  | { type: "appOptions"; app: AppDef }
  | { type: "addApp"; app?: AppDef }
  | { type: "launch"; app: AppDef }
  | { type: "miniapp"; app: AppDef };

export interface UIApi {
  tab: TabId;
  setTab: (t: TabId) => void;
  layer: Layer;
  setLayer: (l: Layer) => void;
  close: () => void;
  toast: (msg: string, icon?: string) => void;
  openApp: (a: AppDef) => void;
  openFilm: (f: PdFilm) => void;
  openShow: (s: TvShow) => void;
  openEpisode: (e: TonightItem) => void;
  openWiki: (w: WikiFilm) => void;
  playFilm: (f: PdFilm) => void;
  openSearch: (seed?: string) => void;
  openSettings: () => void;
  openAddApp: (a?: AppDef) => void;
  openAppOptions: (a: AppDef) => void;
}

export const UICtx = createContext<UIApi | null>(null);

export function useUI(): UIApi {
  const v = useContext(UICtx);
  if (!v) throw new Error("UICtx missing");
  return v;
}
