/* Persistent launcher state: apps, recents, watch progress, settings. */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import { DEFAULT_APPS, type AppDef } from "../data";
import { setSoundEnabled } from "./sound";

export interface Settings {
  wall: number;
  accent: number;
  clock24: boolean;
  sound: boolean;
}

export interface Recent {
  id: string;
  ts: number;
}

export interface AppState {
  apps: AppDef[];
  recents: Recent[];
  mediaProgress: Record<string, number>;
  favMedia: string[];
  favApps: string[];
  settings: Settings;
  profile: number;
}

const KEY = "novadeck-state-v2";

function defaults(): AppState {
  return {
    apps: DEFAULT_APPS,
    recents: [],
    mediaProgress: {},
    favMedia: [],
    favApps: [],
    settings: { wall: 0, accent: 0, clock24: true, sound: true },
    profile: 0,
  };
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    const p = JSON.parse(raw) as Partial<AppState>;
    const d = defaults();
    return {
      ...d,
      ...p,
      settings: { ...d.settings, ...(p.settings ?? {}) },
      apps: Array.isArray(p.apps) && p.apps.length ? p.apps : d.apps,
    };
  } catch {
    return defaults();
  }
}

export type Action =
  | { type: "launch"; id: string }
  | { type: "mediaProgress"; id: string; t: number }
  | { type: "favApp"; id: string }
  | { type: "favMedia"; id: string }
  | { type: "addApp"; app: AppDef }
  | { type: "updateApp"; app: AppDef }
  | { type: "removeApp"; id: string }
  | { type: "settings"; patch: Partial<Settings> }
  | { type: "profile"; n: number }
  | { type: "reset" };

function reducer(s: AppState, a: Action): AppState {
  switch (a.type) {
    case "launch":
      return {
        ...s,
        recents: [
          { id: a.id, ts: Date.now() },
          ...s.recents.filter((r) => r.id !== a.id),
        ].slice(0, 16),
      };
    case "mediaProgress": {
      const mp = { ...s.mediaProgress, [a.id]: Math.max(0, Math.round(a.t)) };
      if (mp[a.id] <= 0) delete mp[a.id];
      return { ...s, mediaProgress: mp };
    }
    case "favApp":
      return {
        ...s,
        favApps: s.favApps.includes(a.id)
          ? s.favApps.filter((x) => x !== a.id)
          : [...s.favApps, a.id],
      };
    case "favMedia":
      return {
        ...s,
        favMedia: s.favMedia.includes(a.id)
          ? s.favMedia.filter((x) => x !== a.id)
          : [...s.favMedia, a.id],
      };
    case "addApp":
      return { ...s, apps: [...s.apps, a.app] };
    case "updateApp":
      return {
        ...s,
        apps: s.apps.map((x) => (x.id === a.app.id ? a.app : x)),
      };
    case "removeApp":
      return {
        ...s,
        apps: s.apps.filter((x) => x.id !== a.id),
        favApps: s.favApps.filter((x) => x !== a.id),
        recents: s.recents.filter((x) => x.id !== a.id),
      };
    case "settings":
      return { ...s, settings: { ...s.settings, ...a.patch } };
    case "profile":
      return { ...s, profile: a.n };
    case "reset":
      try {
        localStorage.removeItem(KEY);
      } catch {
        /* noop */
      }
      return defaults();
    default:
      return s;
  }
}

interface Ctx {
  s: AppState;
  d: React.Dispatch<Action>;
}

const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [s, d] = useReducer(reducer, undefined, load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      /* storage full or unavailable */
    }
  }, [s]);

  useEffect(() => {
    setSoundEnabled(s.settings.sound);
  }, [s.settings.sound]);

  const value = useMemo(() => ({ s, d }), [s]);
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const v = useContext(StoreCtx);
  if (!v) throw new Error("StoreProvider missing");
  return v;
}
