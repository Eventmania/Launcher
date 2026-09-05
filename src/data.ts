/* ------------------------------------------------------------------ */
/*  NovaDeck — data model + seed content                               */
/* ------------------------------------------------------------------ */

export type AppKind = "url" | "protocol" | "sim";

export interface AppDef {
  id: string;
  name: string;
  cat: string;
  target: string;
  kind: AppKind;
  icon: string;
  color: string;
  builtIn?: boolean;
  simId?: "notepad" | "calculator" | "clock" | "generic";
}

export interface MediaItem {
  id: string;
  title: string;
  type: "movie" | "show";
  year: number;
  genre: string;
  maturity: string;
  duration: number; // minutes
  desc: string;
  hue: [string, string];
  backdrop?: string;
}

export interface Channel {
  id: string;
  name: string;
  tag: string;
  color: string;
  now: string;
  next: string;
  progress: number;
}

export const HERO_IMG = {
  solar:
    "https://image.qwenlm.ai/generated-images/9b8748ec-f1da-49a0-829b-37eedb02b31f/_result.png",
  neon: "https://image.qwenlm.ai/generated-images/7407dd80-d292-4b1d-a7b0-2e7cafd13264/_result.png",
  cartographer:
    "https://image.qwenlm.ai/generated-images/ac9cf739-4a62-4622-94e1-2bd740886907/_result.png",
  static:
    "https://image.qwenlm.ai/generated-images/9b6534e9-0ff3-4a1a-b2ff-aaf1a05d7af1/_result.png",
};

export const WALLS = [
  "https://image.qwenlm.ai/generated-images/e0b6a299-b61b-4d7f-aeaf-a71913c3633b/_result.png",
  "https://image.qwenlm.ai/generated-images/499349b7-6de4-4835-80e6-1ce14d9fd258/_result.png",
  "https://image.qwenlm.ai/generated-images/3c3fff3c-808e-46ea-b836-3a84c1b54f6b/_result.png",
];

export const WALL_NAMES = ["Deep Tide", "Ember Field", "Night Pines"];

export const ACCENTS = ["#63b3ff", "#7ef0a8", "#ffc163", "#ff8fa3"];
export const ACCENT_NAMES = ["Sky", "Mint", "Amber", "Rose"];

export const PROFILES = [
  { name: "Ava", color: "#63b3ff" },
  { name: "Ben", color: "#7ef0a8" },
  { name: "Kids", color: "#ffc163" },
  { name: "Guest", color: "#ff8fa3" },
];

export type TabId = "home" | "live" | "movies" | "shows" | "apps" | "library";

export const TABS: { id: TabId; label: string }[] = [
  { id: "home", label: "For You" },
  { id: "live", label: "Live" },
  { id: "movies", label: "Movies" },
  { id: "shows", label: "Shows" },
  { id: "apps", label: "Apps" },
  { id: "library", label: "Library" },
];

/* ------------------------------- apps ------------------------------ */

export const DEFAULT_APPS: AppDef[] = [
  { id: "browser", name: "Web Browser", cat: "Web", target: "https://www.google.com", kind: "url", icon: "globe", color: "#4f8df9", builtIn: true },
  { id: "youtube", name: "YouTube", cat: "Entertainment", target: "https://www.youtube.com", kind: "url", icon: "play", color: "#ff4b4b", builtIn: true },
  { id: "netflix", name: "Netflix", cat: "Entertainment", target: "https://www.netflix.com", kind: "url", icon: "film", color: "#e50914", builtIn: true },
  { id: "spotify", name: "Spotify", cat: "Entertainment", target: "spotify:", kind: "protocol", icon: "music", color: "#1db954", builtIn: true },
  { id: "steam", name: "Steam", cat: "Games", target: "steam://open/main", kind: "protocol", icon: "gamepad", color: "#2a475e", builtIn: true },
  { id: "discord", name: "Discord", cat: "Social", target: "https://discord.com/app", kind: "url", icon: "chat", color: "#5865f2", builtIn: true },
  { id: "vscode", name: "VS Code", cat: "Productivity", target: "vscode://", kind: "protocol", icon: "code", color: "#2f81d4", builtIn: true },
  { id: "notepad", name: "Notepad", cat: "System", target: "", kind: "sim", icon: "note", color: "#d9a441", builtIn: true, simId: "notepad" },
  { id: "calculator", name: "Calculator", cat: "System", target: "", kind: "sim", icon: "calc", color: "#39c0c9", builtIn: true, simId: "calculator" },
  { id: "clock", name: "Clock", cat: "System", target: "", kind: "sim", icon: "clock", color: "#8fa3bd", builtIn: true, simId: "clock" },
  { id: "photos", name: "Photos", cat: "System", target: "", kind: "sim", icon: "camera", color: "#e57373", builtIn: true, simId: "generic" },
  { id: "store", name: "Store", cat: "System", target: "", kind: "sim", icon: "bag", color: "#4fb3ff", builtIn: true, simId: "generic" },
  { id: "files", name: "Files", cat: "System", target: "", kind: "sim", icon: "folder", color: "#f0b429", builtIn: true, simId: "generic" },
  { id: "terminal", name: "Terminal", cat: "System", target: "", kind: "sim", icon: "terminal", color: "#6ee7a0", builtIn: true, simId: "generic" },
];

export const ICON_CHOICES = [
  "globe", "play", "film", "music", "gamepad", "chat", "code", "note",
  "calc", "clock", "camera", "bag", "folder", "terminal", "tv", "spark",
];

export const TILE_COLORS = [
  "#4f8df9", "#ff5f56", "#1db954", "#5865f2", "#e5a33f",
  "#39c0c9", "#e57373", "#9b6df2", "#4fb3ff", "#f06595",
];

/* ------------------------------- media ----------------------------- */

export const MEDIA: MediaItem[] = [
  { id: "m1", title: "Solar Drift", type: "movie", year: 2025, genre: "Sci-Fi", maturity: "PG-13", duration: 128, desc: "A salvage pilot answers a distress call from a ship that vanished forty years ago — with its crew still aboard, and still counting the days.", hue: ["#0c3553", "#f4a259"], backdrop: HERO_IMG.solar },
  { id: "m2", title: "Neon Tide", type: "movie", year: 2024, genre: "Thriller", maturity: "R", duration: 112, desc: "On the rain-slick docks of a city that never dries, a harbor pilot smuggles one last passenger — the woman who erased his past.", hue: ["#101c3a", "#ff4f81"], backdrop: HERO_IMG.neon },
  { id: "m3", title: "The Last Cartographer", type: "movie", year: 2023, genre: "Adventure", maturity: "PG", duration: 141, desc: "With the maps of the old world burning, one explorer climbs beyond the cloud line to draw the edges of a country no empire claims.", hue: ["#12283a", "#ffb168"], backdrop: HERO_IMG.cartographer },
  { id: "m4", title: "Static", type: "movie", year: 2026, genre: "Mystery", maturity: "TV-14", duration: 96, desc: "A late-night radio engineer keeps receiving broadcasts from her own voice — dated three days from now, each one a warning.", hue: ["#151522", "#8ecae6"], backdrop: HERO_IMG.static },
  { id: "m5", title: "Ashfall Protocol", type: "movie", year: 2024, genre: "Action", maturity: "PG-13", duration: 118, desc: "When a dormant supervolcano wakes, a disgraced geologist has 72 hours to convince the world the countdown is already running.", hue: ["#2b1310", "#ff7849"] },
  { id: "m6", title: "The Quiet Sea", type: "movie", year: 2022, genre: "Drama", maturity: "PG", duration: 104, desc: "Two lighthouse keepers, one winter, and a silence between them that says more than the storms ever could.", hue: ["#0e2a33", "#9ad7c5"] },
  { id: "m7", title: "Redline 9", type: "movie", year: 2025, genre: "Action", maturity: "R", duration: 101, desc: "An illegal courier race across a frozen continent, where the cargo is breathing and the finish line keeps moving.", hue: ["#26060b", "#ff5c5c"] },
  { id: "m8", title: "Glasshouse", type: "movie", year: 2023, genre: "Drama", maturity: "TV-MA", duration: 122, desc: "A family reunion inside a transparent smart-home turns into a slow, beautiful implosion of everything left unsaid.", hue: ["#1d2430", "#b8c4d6"] },
  { id: "m9", title: "Paper Skies", type: "movie", year: 2021, genre: "Indie", maturity: "PG", duration: 89, desc: "A retired kite-maker rebuilds the dragon of his childhood for one final festival above the rooftops of the old town.", hue: ["#2a2415", "#ffd166"] },
  { id: "m10", title: "Orbital Decay", type: "movie", year: 2026, genre: "Sci-Fi", maturity: "PG-13", duration: 133, desc: "The last maintenance crew on a dying space elevator discovers their ride down was cancelled — decades ago.", hue: ["#081f2e", "#64d2ff"] },
  { id: "m11", title: "Midnight Freight", type: "movie", year: 2022, genre: "Crime", maturity: "R", duration: 109, desc: "A long-haul trucker realizes her sealed container is knocking back. Politely, at first.", hue: ["#171022", "#c77dff"] },
  { id: "m12", title: "Northlight", type: "movie", year: 2024, genre: "Mystery", maturity: "PG-13", duration: 116, desc: "In a town where the aurora never ends, a detective investigates a disappearance that the sky seems to be hiding.", hue: ["#0a2431", "#7bf1a8"] },
  { id: "s1", title: "Kingdom of Rust", type: "show", year: 2024, genre: "Drama", maturity: "TV-MA", duration: 52, desc: "Three generations of a scrapyard dynasty fight over an empire built from the wrecks of a dead industrial age.", hue: ["#241a10", "#e07a3f"] },
  { id: "s2", title: "The Long Static", type: "show", year: 2023, genre: "Sci-Fi", maturity: "TV-14", duration: 47, desc: "A radio telescope array starts answering its own questions. The grad students on night shift are the first to notice.", hue: ["#131327", "#7d8cff"] },
  { id: "s3", title: "Deep Field", type: "show", year: 2025, genre: "Docuseries", maturity: "TV-G", duration: 44, desc: "Cameras that can wait a decade capture the slow, astonishing lives of the creatures in the ocean's midnight zone.", hue: ["#04202c", "#3fb6c9"] },
  { id: "s4", title: "Circuit Breakers", type: "show", year: 2024, genre: "Comedy", maturity: "TV-14", duration: 28, desc: "The world's worst smart-home installers take on a mansion that has already fired three electricians.", hue: ["#20102a", "#ff9e64"] },
  { id: "s5", title: "Hollow Pines", type: "show", year: 2022, genre: "Horror", maturity: "TV-MA", duration: 55, desc: "A forestry crew maps a stand of trees that do not appear on any satellite image — and do not like being counted.", hue: ["#0d1f14", "#9ef01a"] },
  { id: "s6", title: "Signal Lost", type: "show", year: 2025, genre: "Thriller", maturity: "TV-14", duration: 41, desc: "Every flight recorder from a missing airliner returns its data at once — from seven different years.", hue: ["#101826", "#ffd23f"] },
  { id: "s7", title: "The Inheritance Code", type: "show", year: 2023, genre: "Drama", maturity: "TV-14", duration: 49, desc: "A cryptographer dies and leaves each of her four children a different key. Only one combination opens the will.", hue: ["#1a1424", "#e0aaff"] },
  { id: "s8", title: "Wavelength", type: "show", year: 2026, genre: "Music", maturity: "TV-PG", duration: 38, desc: "A behind-the-glass docuseries following five producers racing to finish an album before the studio's lease runs out.", hue: ["#251018", "#ff70a6"] },
];

export const HERO_IDS = ["m1", "m2", "m3", "m4"];

export const heroMedia = HERO_IDS.map(
  (id) => MEDIA.find((m) => m.id === id) as MediaItem
);

/* ------------------------------ channels --------------------------- */

export const CHANNELS: Channel[] = [
  { id: "c1", name: "Nova Sports", tag: "Sports", color: "#3ba55d", now: "Meridian FC vs Atlas United", next: "Post-Match Analysis", progress: 63 },
  { id: "c2", name: "CineVault", tag: "Movies", color: "#e50914", now: "Solar Drift", next: "Director's Commentary", progress: 34 },
  { id: "c3", name: "News 24", tag: "News", color: "#c8a951", now: "Evening Bulletin", next: "World Report", progress: 78 },
  { id: "c4", name: "Retro TV", tag: "Classics", color: "#9b6df2", now: "The Analog Hour", next: "Test Pattern Tales", progress: 51 },
  { id: "c5", name: "Pulse Music", tag: "Music", color: "#ff5c8a", now: "Top 40 Countdown", next: "Late Night Sessions", progress: 22 },
  { id: "c6", name: "Docu Earth", tag: "Nature", color: "#39c0c9", now: "Ocean Giants", next: "The Salt Forests", progress: 87 },
  { id: "c7", name: "Arena+", tag: "eSports", color: "#ff7849", now: "Grand Prix Qualifiers", next: "Pro League Finals", progress: 45 },
  { id: "c8", name: "Kids Zone", tag: "Kids", color: "#ffc163", now: "Robo Rangers", next: "Cloud Kingdom", progress: 69 },
];

/* ------------------------------ helpers ---------------------------- */

export function grad(hue: [string, string]) {
  return `linear-gradient(155deg, ${hue[0]} 0%, ${hue[1]} 130%)`;
}

export function hashStr(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function fmtDur(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

export function fmtClock(t: number) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function detectKind(target: string): AppKind {
  const t = target.trim();
  if (/^https?:\/\//i.test(t)) return "url";
  if (/^[a-z][a-z0-9+.-]*:/i.test(t)) return "protocol";
  return "sim";
}
