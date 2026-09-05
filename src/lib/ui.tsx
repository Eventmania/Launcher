import { createContext, useContext } from "react";
import type { AppDef, Channel, MediaItem, TabId } from "../data";

export type Layer =
  | null
  | { type: "search"; seed?: string }
  | { type: "settings" }
  | { type: "help" }
  | { type: "details"; media: MediaItem }
  | { type: "player"; media: MediaItem }
  | { type: "live"; channel: Channel }
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
  openMedia: (m: MediaItem) => void;
  playMedia: (m: MediaItem) => void;
  playLive: (c: Channel) => void;
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
