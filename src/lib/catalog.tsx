/* ------------------------------------------------------------------ */
/*  Live catalog: real data from public, key-less APIs.                */
/*   - TVMaze      → real shows (art, ratings, schedules) + search     */
/*   - TVMaze      → real episodes airing tonight (/schedule)          */
/*   - archive.org → real public-domain film streams + metadata        */
/*   - Wikipedia   → real acclaimed film metadata + stills             */
/*  Everything is cached in localStorage.                              */
/* ------------------------------------------------------------------ */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  PD_FILMS,
  type PdFilm,
  type TonightItem,
  type TvShow,
  type WikiFilm,
} from "../data";

const CACHE_KEY = "novadeck-catalog-v2";
const DAY = 86400_000;

const SHOW_QUERIES = [
  "Breaking Bad",
  "Game of Thrones",
  "Stranger Things",
  "The Office",
  "Friends",
  "Severance",
  "The Last of Us",
  "The Bear",
  "True Detective",
  "Westworld",
  "The Wire",
  "Better Call Saul",
  "The Mandalorian",
  "Dark",
  "Fleabag",
  "Succession",
  "Ted Lasso",
  "Andor",
];

const WIKI_TITLES = [
  "The Godfather",
  "The Shawshank Redemption",
  "The Dark Knight",
  "Pulp Fiction",
  "Inception",
  "Interstellar",
  "Parasite (2019 film)",
  "Spirited Away",
  "2001: A Space Odyssey",
  "Seven Samurai",
  "Casablanca",
  "Goodfellas",
];

function stripHtml(h: string): string {
  return (h || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

interface CacheShape {
  ts: number;
  shows: TvShow[];
  films: PdFilm[];
  acclaimed: WikiFilm[];
  tonight: TonightItem[];
  tonightDate: string;
}

function loadCache(): CacheShape | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CacheShape;
  } catch {
    return null;
  }
}

/* ------------------------------- shows ------------------------------ */

function toTvShow(s: Record<string, unknown>): TvShow {
  const sc = s as {
    id: number;
    name: string;
    premiered?: string;
    genres?: string[];
    runtime?: number;
    rating?: { average?: number | null };
    image?: { medium?: string; original?: string } | null;
    summary?: string;
    network?: { name?: string } | null;
    webChannel?: { name?: string } | null;
    status?: string;
    officialSite?: string | null;
    schedule?: { time?: string; days?: string[] };
  };
  const days = sc.schedule?.days?.length ? sc.schedule.days.join(" & ") + " at " : "";
  return {
    id: "tv-" + sc.id,
    tvmazeId: sc.id,
    name: sc.name,
    year: parseInt((sc.premiered || "").slice(0, 4), 10) || 0,
    genres: sc.genres ?? [],
    runtime: sc.runtime ?? 0,
    rating: sc.rating?.average ?? null,
    img: sc.image?.original ?? sc.image?.medium ?? null,
    imgThumb: sc.image?.medium ?? sc.image?.original ?? null,
    summary: stripHtml(sc.summary ?? ""),
    network: sc.network?.name || sc.webChannel?.name || "Streaming",
    status: sc.status ?? "",
    site: sc.officialSite || null,
    schedule: (days + (sc.schedule?.time || "")).trim(),
  };
}

async function fetchShows(): Promise<TvShow[]> {
  const res = await Promise.allSettled(
    SHOW_QUERIES.map(async (q) => {
      const r = await fetch(
        `https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(q)}`
      );
      if (!r.ok) throw new Error("bad status");
      return toTvShow((await r.json()) as Record<string, unknown>);
    })
  );
  const out: TvShow[] = [];
  const seen = new Set<string>();
  for (const x of res) {
    if (x.status === "fulfilled" && !seen.has(x.value.name)) {
      seen.add(x.value.name);
      out.push(x.value);
    }
  }
  return out;
}

/* ------------------------------ tonight ----------------------------- */

async function fetchTonight(): Promise<TonightItem[]> {
  const date = new Date().toISOString().slice(0, 10);
  for (const country of ["US", "GB"]) {
    try {
      const r = await fetch(
        `https://api.tvmaze.com/schedule?country=${country}&date=${date}`
      );
      if (!r.ok) continue;
      const arr = (await r.json()) as Array<{
        id: number;
        name: string;
        season: number;
        number: number;
        airtime: string;
        summary?: string;
        show: {
          id: number;
          name: string;
          genres: string[];
          image?: { medium?: string; original?: string } | null;
          network?: { name?: string } | null;
          webChannel?: { name?: string } | null;
          officialSite?: string | null;
        };
      }>;
      if (!arr.length) continue;
      const pad = (n: number) => String(n).padStart(2, "0");
      const seen = new Set<string>();
      const out: TonightItem[] = [];
      for (const e of arr) {
        const key = e.show.id + ":" + e.airtime;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({
          id: "ep-" + e.id,
          time: e.airtime,
          show: e.show.name,
          episode: e.name || "Episode",
          tag: `S${pad(e.season)}E${pad(e.number)}`,
          network:
            e.show.network?.name || e.show.webChannel?.name || "Broadcast",
          img: e.show.image?.medium || e.show.image?.original || null,
          genres: e.show.genres || [],
          site: e.show.officialSite || null,
          tvmazeShow: e.show.id,
          summary: stripHtml(e.summary ?? ""),
        });
        if (out.length >= 24) break;
      }
      if (out.length) return out;
    } catch {
      /* try next country */
    }
  }
  return [];
}

/* ------------------------------- films ------------------------------ */

function parseLen(len?: string): number | null {
  if (!len) return null;
  const parts = len.split(":").map(parseFloat);
  if (parts.length === 3) return Math.round(parts[0] * 60 + parts[1]);
  if (parts.length === 2) return Math.round(parts[0] + parts[1] / 60);
  return null;
}

async function resolveFilms(base: PdFilm[]): Promise<PdFilm[]> {
  const res = await Promise.allSettled(
    base.map(async (f) => {
      const r = await fetch(`https://archive.org/metadata/${f.item}`);
      if (!r.ok) return f; // offline — keep the baked-in guess
      const j = (await r.json()) as {
        files?: Array<{ name: string; format?: string; size?: string; length?: string }>;
      };
      const cands = (j.files ?? []).filter((x) => /\.mp4$/i.test(x.name));
      const pick =
        cands.find((x) => /512kb/i.test(x.name)) ||
        [...cands].sort(
          (a, b) => (parseInt(a.size ?? "0", 10) || 0) - (parseInt(b.size ?? "0", 10) || 0)
        )[0];
      if (!pick) return f;
      return {
        ...f,
        file: pick.name,
        runtimeMin: parseLen(pick.length) ?? f.runtimeMin,
      };
    })
  );
  return res.map((x, i) => (x.status === "fulfilled" ? x.value : base[i]));
}

export function streamCandidates(f: PdFilm): string[] {
  const base = `https://archive.org/download/${f.item}/`;
  const names = [
    f.file,
    `${f.item}_512kb.mp4`,
    `${f.item}.mp4`,
  ].filter((v, i, a) => a.indexOf(v) === i);
  return names.map((n) => base + encodeURIComponent(n));
}

export function archivePage(f: PdFilm): string {
  return `https://archive.org/details/${f.item}`;
}

/* ------------------------------ acclaimed --------------------------- */

async function fetchAcclaimed(): Promise<WikiFilm[]> {
  const res = await Promise.allSettled(
    WIKI_TITLES.map(async (t) => {
      const r = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(t)}`
      );
      if (!r.ok) throw new Error("bad status");
      const j = (await r.json()) as {
        title: string;
        extract?: string;
        description?: string;
        thumbnail?: { source: string } | null;
        originalimage?: { source: string } | null;
        content_urls?: { desktop?: { page?: string } };
      };
      const yr = j.description?.match(/\b(19|20)\d{2}\b/)?.[0];
      return {
        id: "wiki-" + j.title.replace(/\s+/g, "_"),
        title: j.title.replace(/\s*\(.*\)$/, ""),
        year: yr ? parseInt(yr, 10) : null,
        desc: j.description || "",
        extract: j.extract || "",
        image: j.thumbnail?.source || j.originalimage?.source || null,
        imageLg: j.originalimage?.source || j.thumbnail?.source || null,
        url:
          j.content_urls?.desktop?.page ||
          `https://en.wikipedia.org/wiki/${encodeURIComponent(j.title)}`,
      };
    })
  );
  return res
    .filter((x): x is PromiseFulfilledResult<WikiFilm> => x.status === "fulfilled")
    .map((x) => x.value);
}

/* ------------------------------ search ------------------------------ */

export async function searchShows(q: string): Promise<TvShow[]> {
  const r = await fetch(
    `https://api.tvmaze.com/search/shows?q=${encodeURIComponent(q)}`
  );
  if (!r.ok) return [];
  const arr = (await r.json()) as Array<{ show: Record<string, unknown> }>;
  return arr.slice(0, 10).map((x) => toTvShow(x.show));
}

export async function searchWiki(q: string): Promise<WikiFilm[]> {
  const r = await fetch(
    `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
      q + " film"
    )}&srnamespace=0&srlimit=6&format=json&origin=*`
  );
  if (!r.ok) return [];
  const j = (await r.json()) as {
    query?: { search?: Array<{ title: string; snippet?: string }> };
  };
  return (j.query?.search ?? []).map((x) => ({
    id: "wikis-" + x.title.replace(/\s+/g, "_"),
    title: x.title.replace(/\s*\(.*\)$/, ""),
    year: null,
    desc: stripHtml(x.snippet ?? ""),
    extract: "",
    image: null,
    imageLg: null,
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(x.title)}`,
  }));
}

export async function wikiSummary(title: string): Promise<WikiFilm | null> {
  try {
    const r = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
    );
    if (!r.ok) return null;
    const j = (await r.json()) as {
      title: string;
      extract?: string;
      description?: string;
      thumbnail?: { source: string } | null;
      originalimage?: { source: string } | null;
      content_urls?: { desktop?: { page?: string } };
    };
    const yr = j.description?.match(/\b(19|20)\d{2}\b/)?.[0];
    return {
      id: "wiki-" + j.title.replace(/\s+/g, "_"),
      title: j.title.replace(/\s*\(.*\)$/, ""),
      year: yr ? parseInt(yr, 10) : null,
      desc: j.description || "",
      extract: j.extract || "",
      image: j.thumbnail?.source || j.originalimage?.source || null,
      imageLg: j.originalimage?.source || j.thumbnail?.source || null,
      url:
        j.content_urls?.desktop?.page ||
        `https://en.wikipedia.org/wiki/${encodeURIComponent(j.title)}`,
    };
  } catch {
    return null;
  }
}

/* ------------------------------ context ----------------------------- */

export interface Catalog {
  shows: TvShow[];
  films: PdFilm[];
  tonight: TonightItem[];
  acclaimed: WikiFilm[];
  loading: boolean;
  empty: boolean;
  error: boolean;
  reload: () => void;
}

const CatCtx = createContext<Catalog | null>(null);

export function useCatalog(): Catalog {
  const v = useContext(CatCtx);
  if (!v) throw new Error("CatalogProvider missing");
  return v;
}

export function CatalogProvider({ children }: { children: ReactNode }) {
  const cache = useMemo(loadCache, []);
  const [shows, setShows] = useState<TvShow[]>(cache?.shows ?? []);
  const [films, setFilms] = useState<PdFilm[]>(cache?.films ?? PD_FILMS);
  const [tonight, setTonight] = useState<TonightItem[]>(cache?.tonight ?? []);
  const [acclaimed, setAcclaimed] = useState<WikiFilm[]>(cache?.acclaimed ?? []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const runId = useRef(0);

  const refresh = useCallback(async () => {
    const id = ++runId.current;
    setLoading(true);
    setError(false);
    const today = new Date().toISOString().slice(0, 10);
    const stale = cache ? Date.now() - cache.ts > 7 * DAY : true;
    const tonightStale = !cache || cache.tonightDate !== today;

    const jobs: Promise<void>[] = [];
    if (stale || !shows.length)
      jobs.push(
        fetchShows().then((v) => {
          if (runId.current === id && v.length) setShows(v);
        })
      );
    if (stale || !acclaimed.length)
      jobs.push(
        fetchAcclaimed().then((v) => {
          if (runId.current === id && v.length) setAcclaimed(v);
        })
      );
    if (tonightStale || !tonight.length)
      jobs.push(
        fetchTonight().then((v) => {
          if (runId.current === id && v.length) setTonight(v);
        })
      );
    jobs.push(
      resolveFilms(PD_FILMS).then((v) => {
        if (runId.current === id) setFilms(v);
      })
    );

    await Promise.allSettled(jobs);
    if (runId.current !== id) return;
    setLoading(false);
  }, [cache, shows.length, acclaimed.length, tonight.length]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (loading) return;
    try {
      const payload: CacheShape = {
        ts: Date.now(),
        shows,
        films,
        tonight,
        acclaimed,
        tonightDate: new Date().toISOString().slice(0, 10),
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
    } catch {
      /* storage unavailable */
    }
  }, [loading, shows, films, tonight, acclaimed]);

  const empty = !shows.length && !tonight.length && !acclaimed.length;
  const value: Catalog = {
    shows,
    films,
    tonight,
    acclaimed,
    loading,
    empty,
    error,
    reload: () => void refresh(),
  };
  return <CatCtx.Provider value={value}>{children}</CatCtx.Provider>;
}
