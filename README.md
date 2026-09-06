# NovaDeck — Google TV-style launcher for Windows 10

A full-screen, remote-control-first launcher. Runs on a Windows 10 PC in Chrome/Edge
(press **F11** for TV mode), driven entirely by **arrows / Enter / Esc** — with **real**
apps, **real** movies you can actually watch, **real** show data and a **real** tonight
schedule. No demo content: anything shown comes from live public APIs or your own activity.

## Run it

Requires [Node.js LTS](https://nodejs.org). From this folder in PowerShell:

```powershell
npm install
npm run dev                 # → http://localhost:3000
```

Production build:

```powershell
npm run build
npx serve dist -l 4173      # → http://localhost:4173
```

Open the URL in Chrome or Edge, press **F11**. The app must be served over HTTP —
don't double-click `dist/index.html` (assets use absolute paths).

## Where the real data comes from

| What you see                | Source (key-less, public API)                     |
| --------------------------- | ------------------------------------------------- |
| Shows tab, hero, search     | **TVMaze** — real posters, ratings, schedules      |
| "Tonight" tab               | **TVMaze `/schedule`** — real episodes airing today (US, then GB) |
| Real Cinema (playable!)     | **archive.org** — public-domain feature films (Night of the Living Dead, Charade, Plan 9, Nosferatu, Sita Sings the Blues…) streamed as real MP4s; runtime verified via the metadata API |
| Acclaimed Films             | **Wikipedia REST** — real synopses, stills, links  |
| Continue Watching / Resume  | Your **actual playback position**, saved locally, resumes to the second |
| Recently Opened             | Your **actual launch history**                     |

Everything is cached in `localStorage` (shows/films ~7 days, tonight's schedule per day).
If you're offline, NovaDeck says so honestly and your apps still work.

## Launching real Windows programs

Tiles support three kinds, detected from the target you enter (Apps → Add app):

- **WEB** — `https://…` opens in a new tab; the launcher stays exactly where it was.
- **PC** — a URI protocol asks Windows to start a program. Preinstalled tiles already
  use real ones: `steam://`, `vscode://`, `discord://`, and Windows built-ins
  (`calculator:`, `ms-paint:`, `ms-photos:`, `ms-settings:`, `ms-clock:`, `msxbox:`,
  `ms-gamebar:`, `ms-windows-terminal://`, `ms-windows-store://`, `bingmaps:`, `mailto:`…).
- **In-launcher** — runs inside NovaDeck (e.g. the autosaving Notepad); **Esc** returns
  to the launcher instantly.

To launch **any .exe**, register a custom protocol once (press `?` in the app for the
exact `.reg` template):

```reg
Windows Registry Editor Version 5.00

[HKEY_CLASSES_ROOT\novadeck-movies]
@="URL:NovaDeck Movies"
"URL Protocol"=""

[HKEY_CLASSES_ROOT\novadeck-movies\shell\open\command]
@="\"C:\\Path\\To\\YourApp.exe\""
```

Then add an app with target `novadeck-movies://` — Enter on that tile launches the real
program. NovaDeck never closes while it runs: **Alt+Tab** back, or **Esc** from any
quick window.

## Keys

| Key | Action |
| --- | ------ |
| ← ↑ → ↓ | Move the white focus ring |
| Enter | Open / play / activate |
| Esc | Back — from any screen, player or window |
| Any letter | Jump into Search |
| ⇧M / right-click | Options for the focused app |
| In player: ←/→, Enter, M, R | Seek 10s, play/pause, mute, restart |
| F11 | Full-screen TV mode |

## Notes

- State (apps, watchlist, favorites, progress, settings) lives only on this PC in
  `localStorage`. **Settings → Factory reset** starts fresh.
- Settings: 3 wallpapers, 4 accent colors, 12/24h clock, navigation sounds.
