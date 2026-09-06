/* ------------------------------------------------------------------ */
/*  Static data + types. Live content (shows, tonight, films, search)  */
/*  comes from real sources via src/lib/catalog.tsx — TVMaze,          */
/*  archive.org (public-domain cinema) and Wikipedia.                  */
/* ------------------------------------------------------------------ */

export type TabId = "home" | "tonight" | "movies" | "shows" | "apps" | "library";

export const TABS: { id: TabId; label: string }[] = [
  { id: "home", label: "For You" },
  { id: "tonight", label: "Tonight" },
  { id: "movies", label: "Movies" },
  { id: "shows", label: "Shows" },
  { id: "apps", label: "Apps" },
  { id: "library", label: "Library" },
];

/* ------------------------------ regions ----------------------------- */

export interface Region {
  id: string;
  label: string;
  countries: string[]; // TVMaze schedule countries, in priority order
  cc: string; // iTunes country
  music: string[]; // iTunes search terms
  wikiExtra: string[]; // extra acclaimed films for this region
  indian: boolean; // surface Indian originals shelf
}

export const REGIONS: Region[] = [
  {
    id: "in",
    label: "India",
    countries: ["IN", "US", "GB"],
    cc: "IN",
    music: ["Arijit Singh", "A R Rahman", "Bollywood hits"],
    wikiExtra: ["Sholay", "Mughal-E-Azam", "3 Idiots", "Lagaan"],
    indian: true,
  },
  {
    id: "global",
    label: "Global",
    countries: ["US", "GB", "IN"],
    cc: "US",
    music: ["The Weeknd", "A R Rahman", "Coldplay"],
    wikiExtra: ["Parasite (2019 film)", "Spirited Away"],
    indian: false,
  },
  {
    id: "us",
    label: "United States",
    countries: ["US", "GB"],
    cc: "US",
    music: ["The Weeknd", "Taylor Swift", "Kendrick Lamar"],
    wikiExtra: [],
    indian: false,
  },
  {
    id: "gb",
    label: "United Kingdom",
    countries: ["GB", "US"],
    cc: "GB",
    music: ["Ed Sheeran", "Adele", "Arctic Monkeys"],
    wikiExtra: [],
    indian: false,
  },
];

/* Which streaming platform an added app recommends from (TVMaze channel names). */
export const PLATFORM_MAP: Record<string, string[]> = {
  netflix: ["Netflix"],
  prime: ["Amazon Prime Video", "Prime Video", "Amazon"],
  disney: ["Disney+", "Disney Plus"],
  hotstar: ["Hotstar", "Disney+ Hotstar"],
  jiocinema: ["JioCinema", "Jio Cinema"],
  sonyliv: ["SonyLIV", "Sony LIV"],
  youtube: ["YouTube"],
};

export const INDIAN_SHOWS = [
  "Sacred Games",
  "Mirzapur",
  "The Family Man",
  "Panchayat",
  "Scam 1992",
  "Farzi",
  "Rocket Boys",
  "Kota Factory",
  "Delhi Crime",
  "Gullak",
];

/* --------------------------- real YouTube --------------------------- */

export interface YtVideo {
  id: string; // real video id
  title: string;
  channel: string;
}

export const YOUTUBE_VIDEOS: YtVideo[] = [
  { id: "dQw4w9WgXcQ", title: "Never Gonna Give You Up", channel: "Rick Astley" },
  { id: "9bZkp7q19f0", title: "GANGNAM STYLE", channel: "officialpsy" },
  { id: "kJQP7kiw5F0", title: "Despacito", channel: "Luis Fonsi ft. Daddy Yankee" },
  { id: "JGwWNGJdvx8", title: "Shape of You", channel: "Ed Sheeran" },
  { id: "OPf0YbXqDm0", title: "Uptown Funk", channel: "Mark Ronson ft. Bruno Mars" },
  { id: "RgKAFK5djSk", title: "See You Again", channel: "Wiz Khalifa ft. Charlie Puth" },
  { id: "fJ9rUzIMcZQ", title: "Bohemian Rhapsody", channel: "Queen Official" },
  { id: "60ItHLz5WEA", title: "Faded", channel: "Alan Walker" },
];

export const ytThumb = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
export const ytWatch = (id: string) => `https://www.youtube.com/watch?v=${id}`;

/* ------------------------------ music ------------------------------- */

/** Real track from the iTunes Search API (artwork + 30s preview stream). */
export interface MusicTrack {
  id: string;
  track: string;
  artist: string;
  art: string;
  preview: string;
}

/** User-added network stream (NAS / Jellyfin / http share). */
export interface NetStream {
  id: string;
  name: string;
  url: string;
}

export const WALLS = [
  "images/wall-ember.jpg",
  "images/wall-forest.jpg",
  "images/wall-void.jpg",
];

/* --------------------------- real content --------------------------- */

/** Real, freely streamable public-domain / CC feature films on archive.org. */
export interface PdFilm {
  id: string;
  title: string;
  year: number;
  genres: string[];
  maturity: string;
  desc: string;
  item: string; // archive.org item id
  file: string; // best-known mp4 filename (verified at runtime when possible)
  runtimeMin: number;
  img: string;
}

export const PD_FILMS: PdFilm[] = [
  {
    id: "pd-night_of_the_living_dead",
    title: "Night of the Living Dead",
    year: 1968,
    genres: ["Horror", "Cult"],
    maturity: "18+",
    desc: "Romero's genre-defining nightmare: strangers barricade a Pennsylvania farmhouse while the dead rise outside. The film that invented the modern zombie.",
    item: "night_of_the_living_dead",
    file: "night_of_the_living_dead_512kb.mp4",
    runtimeMin: 96,
    img: "https://archive.org/services/img/night_of_the_living_dead",
  },
  {
    id: "pd-charade",
    title: "Charade",
    year: 1963,
    genres: ["Thriller", "Romance"],
    maturity: "12+",
    desc: "Audrey Hepburn and Cary Grant in Paris: a widow, a missing fortune, three dangerous men and one charming liar. Often called the best Hitchcock film Hitchcock never made.",
    item: "charade",
    file: "charade_512kb.mp4",
    runtimeMin: 113,
    img: "https://archive.org/services/img/charade",
  },
  {
    id: "pd-plan_9_from_outer_space",
    title: "Plan 9 from Outer Space",
    year: 1959,
    genres: ["Sci-Fi", "Cult"],
    maturity: "12+",
    desc: "Ed Wood's legendarily beloved disaster: aliens resurrect the dead to stop humanity from building a doomsday weapon. Flying saucers, hubcaps and pure sincerity.",
    item: "plan_9_from_outer_space",
    file: "plan_9_from_outer_space_512kb.mp4",
    runtimeMin: 79,
    img: "https://archive.org/services/img/plan_9_from_outer_space",
  },
  {
    id: "pd-the_stranger",
    title: "The Stranger",
    year: 1946,
    genres: ["Noir", "Thriller"],
    maturity: "12+",
    desc: "Orson Welles directs and stars as a Nazi war criminal hiding as a small-town professor, with a dogged investigator closing in.",
    item: "the_stranger",
    file: "the_stranger_512kb.mp4",
    runtimeMin: 95,
    img: "https://archive.org/services/img/the_stranger",
  },
  {
    id: "pd-detour",
    title: "Detour",
    year: 1945,
    genres: ["Noir", "Crime"],
    maturity: "12+",
    desc: "A hitchhiking pianist's ride to Los Angeles curdles into blackmail and murder in one of the bleakest, sharpest noirs ever shot on a shoestring.",
    item: "detour",
    file: "detour_512kb.mp4",
    runtimeMin: 68,
    img: "https://archive.org/services/img/detour",
  },
  {
    id: "pd-beat_the_devil",
    title: "Beat the Devil",
    year: 1953,
    genres: ["Comedy", "Crime"],
    maturity: "12+",
    desc: "Humphrey Bogart, Jennifer Jones and Peter Sellers ad-lib through this sly John Huston caper about crooks stranded in Italy chasing uranium claims.",
    item: "beat_the_devil",
    file: "beat_the_devil_512kb.mp4",
    runtimeMin: 89,
    img: "https://archive.org/services/img/beat_the_devil",
  },
  {
    id: "pd-mclintock",
    title: "McLintock!",
    year: 1963,
    genres: ["Western", "Comedy"],
    maturity: "PG",
    desc: "John Wayne at his most boisterous as a cattle baron squaring off with his estranged wife, his daughter and an entire territory.",
    item: "mclintock",
    file: "mclintock_512kb.mp4",
    runtimeMin: 127,
    img: "https://archive.org/services/img/mclintock",
  },
  {
    id: "pd-carnival_of_souls",
    title: "Carnival of Souls",
    year: 1962,
    genres: ["Horror", "Mystery"],
    maturity: "16+",
    desc: "After surviving a car crash, an organist drifts toward Salt Lake City, haunted by a pale stranger and the call of an abandoned lakeside pavilion.",
    item: "carnival_of_souls",
    file: "carnival_of_souls_512kb.mp4",
    runtimeMin: 78,
    img: "https://archive.org/services/img/carnival_of_souls",
  },
  {
    id: "pd-gullivers_travels",
    title: "Gulliver's Travels",
    year: 1939,
    genres: ["Animation", "Family"],
    maturity: "PG",
    desc: "Fleischer Studios' gorgeous Technicolor answer to Disney: shipwrecked Gulliver wakes up tied down in Lilliput, caught between two tiny warring kingdoms.",
    item: "gullivers_travels",
    file: "gullivers_travels_512kb.mp4",
    runtimeMin: 76,
    img: "https://archive.org/services/img/gullivers_travels",
  },
  {
    id: "pd-Sita_Sings_the_Blues",
    title: "Sita Sings the Blues",
    year: 2008,
    genres: ["Animation", "Musical"],
    maturity: "PG",
    desc: "Nina Paley's award-winning, freely-licensed animated feature weaving the Ramayana through 1920s jazz vocals. A modern classic, free by design.",
    item: "Sita_Sings_the_Blues",
    file: "Sita_Sings_the_Blues_720p_512kb.mp4",
    runtimeMin: 82,
    img: "https://archive.org/services/img/Sita_Sings_the_Blues",
  },
  {
    id: "pd-nosferatu",
    title: "Nosferatu",
    year: 1922,
    genres: ["Horror", "Silent"],
    maturity: "12+",
    desc: "Murnau's shadow-draped Dracula adaptation — Count Orlok's creeping dread still defines screen horror a century later.",
    item: "nosferatu",
    file: "nosferatu_512kb.mp4",
    runtimeMin: 94,
    img: "https://archive.org/services/img/nosferatu",
  },
];

/** Real TV shows fetched from the TVMaze API (posters, ratings, schedules). */
export interface TvShow {
  id: string;
  tvmazeId: number;
  name: string;
  year: number;
  genres: string[];
  runtime: number;
  rating: number | null;
  img: string | null;
  imgThumb: string | null;
  summary: string;
  network: string;
  status: string;
  site: string | null;
  schedule: string;
}

/** Real episodes from today's broadcast schedule (TVMaze /schedule). */
export interface TonightItem {
  id: string;
  time: string;
  show: string;
  episode: string;
  tag: string;
  network: string;
  img: string | null;
  genres: string[];
  site: string | null;
  tvmazeShow: number;
  summary: string;
}

/** Real acclaimed films via Wikipedia (metadata + stills + link). */
export interface WikiFilm {
  id: string;
  title: string;
  year: number | null;
  desc: string;
  extract: string;
  image: string | null;
  imageLg: string | null;
  url: string;
}

/* ------------------------------ apps ------------------------------- */

export type AppKind = "url" | "protocol" | "sim";

export interface AppDef {
  id: string;
  name: string;
  cat: string;
  icon: string;
  color: string;
  target: string;
  kind: AppKind;
  builtIn?: boolean;
  blurb: string;
}

export const DEFAULT_APPS: AppDef[] = [
  { id: "youtube", name: "YouTube", cat: "Entertainment", icon: "play", color: "#ff0033", target: "https://www.youtube.com", kind: "url", builtIn: true, blurb: "Videos, music and live streams" },
  { id: "netflix", name: "Netflix", cat: "Entertainment", icon: "film", color: "#e50914", target: "https://www.netflix.com", kind: "url", builtIn: true, blurb: "Series and films on Netflix" },
  { id: "prime", name: "Prime Video", cat: "Entertainment", icon: "film", color: "#00a8e1", target: "https://www.primevideo.com", kind: "url", builtIn: true, blurb: "Amazon's streaming library" },
  { id: "disney", name: "Disney+", cat: "Entertainment", icon: "spark", color: "#0e47ba", target: "https://www.disneyplus.com", kind: "url", builtIn: true, blurb: "Disney, Pixar, Marvel, Star Wars" },
  { id: "hotstar", name: "Disney+ Hotstar", cat: "Entertainment", icon: "play", color: "#1f80e0", target: "https://www.hotstar.com", kind: "url", builtIn: true, blurb: "Indian originals, cricket and more" },
  { id: "jiocinema", name: "JioCinema", cat: "Entertainment", icon: "film", color: "#e91e63", target: "https://www.jiocinema.com", kind: "url", builtIn: true, blurb: "Free movies, shows and live sport" },
  { id: "sonyliv", name: "SonyLIV", cat: "Entertainment", icon: "tv", color: "#0d47a1", target: "https://www.sonyliv.com", kind: "url", builtIn: true, blurb: "Sony shows, sport and originals" },
  { id: "twitch", name: "Twitch", cat: "Entertainment", icon: "tv", color: "#9146ff", target: "https://www.twitch.tv", kind: "url", builtIn: true, blurb: "Live gaming and IRL streams" },
  { id: "spotify", name: "Spotify", cat: "Music", icon: "music", color: "#1db954", target: "https://open.spotify.com", kind: "url", builtIn: true, blurb: "Music and podcasts in the browser" },
  { id: "steam", name: "Steam", cat: "Games", icon: "gamepad", color: "#2a475e", target: "steam://open/main", kind: "protocol", builtIn: true, blurb: "Launches the Steam client on this PC" },
  { id: "discord", name: "Discord", cat: "Social", icon: "chat", color: "#5865f2", target: "discord://", kind: "protocol", builtIn: true, blurb: "Launches the Discord desktop app" },
  { id: "vscode", name: "VS Code", cat: "Work", icon: "code", color: "#007acc", target: "vscode://", kind: "protocol", builtIn: true, blurb: "Launches Visual Studio Code" },
  { id: "reddit", name: "Reddit", cat: "Social", icon: "chat", color: "#ff4500", target: "https://www.reddit.com", kind: "url", builtIn: true, blurb: "The front page of the internet" },
  { id: "x", name: "X", cat: "Social", icon: "globe", color: "#1d9bf0", target: "https://x.com", kind: "url", builtIn: true, blurb: "What's happening right now" },
  { id: "whatsapp", name: "WhatsApp", cat: "Social", icon: "chat", color: "#25d366", target: "https://web.whatsapp.com", kind: "url", builtIn: true, blurb: "WhatsApp Web messaging" },
  { id: "gmail", name: "Gmail", cat: "Work", icon: "note", color: "#ea4335", target: "https://mail.google.com", kind: "url", builtIn: true, blurb: "Your inbox" },
  { id: "gmaps", name: "Google Maps", cat: "Utility", icon: "globe", color: "#34a853", target: "https://maps.google.com", kind: "url", builtIn: true, blurb: "Maps, traffic and directions" },
  { id: "win-store", name: "Microsoft Store", cat: "System", icon: "bag", color: "#0078d4", target: "ms-windows-store://home", kind: "protocol", builtIn: true, blurb: "Windows app store" },
  { id: "win-calc", name: "Calculator", cat: "Utility", icon: "calc", color: "#4cc2ff", target: "calculator:", kind: "protocol", builtIn: true, blurb: "Windows Calculator app" },
  { id: "win-paint", name: "Paint", cat: "Utility", icon: "pencil", color: "#ff7b00", target: "ms-paint:", kind: "protocol", builtIn: true, blurb: "Windows Paint" },
  { id: "win-photos", name: "Photos", cat: "Utility", icon: "camera", color: "#00b7c3", target: "ms-photos:", kind: "protocol", builtIn: true, blurb: "Windows Photos library" },
  { id: "win-clock", name: "Clock", cat: "Utility", icon: "clock", color: "#26a69a", target: "ms-clock:", kind: "protocol", builtIn: true, blurb: "Alarms, timer, world clock" },
  { id: "win-settings", name: "Windows Settings", cat: "System", icon: "gear", color: "#5c6bc0", target: "ms-settings:", kind: "protocol", builtIn: true, blurb: "System settings app" },
  { id: "win-xbox", name: "Xbox", cat: "Games", icon: "gamepad", color: "#107c10", target: "msxbox:", kind: "protocol", builtIn: true, blurb: "Xbox app & Game Pass" },
  { id: "win-gamebar", name: "Game Bar", cat: "Games", icon: "gamepad", color: "#3ddc84", target: "ms-gamebar:", kind: "protocol", builtIn: true, blurb: "Xbox Game Bar overlay" },
  { id: "win-terminal", name: "Terminal", cat: "System", icon: "terminal", color: "#4d4d4d", target: "ms-windows-terminal://", kind: "protocol", builtIn: true, blurb: "Windows Terminal" },
  { id: "win-maps", name: "Windows Maps", cat: "Utility", icon: "globe", color: "#008373", target: "bingmaps:", kind: "protocol", builtIn: true, blurb: "Bing Maps app" },
  { id: "win-mail", name: "Mail", cat: "Work", icon: "chat", color: "#0067c0", target: "mailto:", kind: "protocol", builtIn: true, blurb: "Open your mail client" },
  { id: "win-feedback", name: "Feedback Hub", cat: "System", icon: "chat", color: "#7b1fa2", target: "ms-windows-feedback:", kind: "protocol", builtIn: true, blurb: "Send feedback to Microsoft" },
  { id: "notepad", name: "Notepad", cat: "Work", icon: "note", color: "#f4c542", target: "", kind: "sim", builtIn: true, blurb: "Quick notes — saved on this PC, Esc returns to the launcher" },
];

export const CATEGORIES = ["All", "Entertainment", "Music", "Games", "Social", "Work", "Utility", "System"];

/* ------------------------------ utils ------------------------------ */

export function fmtDur(min: number): string {
  if (!min) return "—";
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h < 1) return `${m}m`;
  return `${h}h ${m ? m + "m" : ""}`.trim();
}

export function fmtClock(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function hashStr(s: string): number {
  let x = 2166136261;
  for (let i = 0; i < s.length; i++) {
    x ^= s.charCodeAt(i);
    x = Math.imul(x, 16777619);
  }
  return x >>> 0;
}

export function grad(hue: number): string {
  return `linear-gradient(150deg, hsl(${hue} 42% 26%) 0%, hsl(${(hue + 28) % 360} 45% 12%) 60%, #0a0f1a 100%)`;
}

export const ACCENTS = [
  { name: "Sky", hex: "#63b3ff" },
  { name: "Ember", hex: "#ff7a59" },
  { name: "Mint", hex: "#3ddc97" },
  { name: "Gold", hex: "#f4c542" },
];
