# NovaDeck — Google TV-style launcher for Windows 10

A full-screen, remote-control-first launcher for Windows 10 PCs (Chrome/Edge, **F11** for TV
mode), driven entirely by **arrows / Enter / Esc**. Everything on screen is real: recommendations
come from the apps you've added, films genuinely stream, and your watch history is your own.

## Run it

Requires [Node.js LTS](https://nodejs.org). From this folder in PowerShell:

```powershell
npm install
npm run dev                 # → http://localhost:3000
```

Production:

```powershell
npm run build
npx serve dist -l 4173      # → http://localhost:4173
```

Serve over HTTP — don't double-click `dist/index.html`.

## 1 · Recommendations follow your apps

The For You page only recommends from apps present in **Your Apps**:

- **Netflix / Prime / Hotstar / Disney+ / JioCinema / SonyLIV** → "Top on …" shelves with real
  series (posters, ratings) bucketed per platform from TVMaze. Remove the app → its shelf disappears.
- **YouTube** → real trending videos; Enter opens the actual video in a tab.
- **Spotify** → real music picks (iTunes Search) with playable 30-second previews, arrow-navigable.
- **Free-to-watch**: *Real Cinema* (public-domain features streaming from archive.org — Enter
  plays the real film), *Acclaimed Films* (Wikipedia), and *On Tonight* (real broadcast schedule).

## 2 · Local & shared media → VLC

- **Settings → Add folder** (or the tile on For You): pick any folder on this PC or a mounted NAS
  share. Videos/music are scanned and playable right in the launcher; progress is saved. Folder
  access persists via Chrome/Edge's File System Access API (one re-grant click after a restart).
- **Settings → Network stream**: add `http://` URLs (Jellyfin, Plex direct, `python -m http.server`
  on a share, IP cameras…). They play in the launcher **and** offer **Open in VLC** — VLC's
  built-in `vlc://` protocol receives the same URL, so VLC starts playing it on your PC.

## 3 · Launching apps

Enter on a tile launches **full-screen**:

- `https://…` → new tab, launcher stays put.
- `steam://`, `vscode://`, `discord://`, `calculator:`, `ms-paint:`, … → Windows starts the real
  program; NovaDeck never closes.
- Any `.exe`: register a protocol once (press `?` for the `.reg` template), then add an app with
  target `myapp://`.
- In-launcher tools (Notepad) → **Esc** snaps straight back.

## Keys

| Key | Action |
| --- | ------ |
| ← ↑ → ↓ | Move the white focus ring (works in every screen, player and window) |
| Enter | Open / play / activate |
| Esc | Back from anywhere — every popup also has an on-screen close button |
| **Ctrl+Shift+H** | **Close the current app and return to the Home launcher** |
| Any letter | Jump into Search |
| ⇧M / right-click | Options for the focused app |
| In player: ←/→ · Enter · M · R | Seek 10s · play/pause · mute · restart |
| F11 | Full-screen TV mode |

## Region

Top-right pill (or **Settings → Content region**): **India** (default — Indian originals,
Arijit Singh/A.R. Rahman music picks, IN-first tonight schedule), **Global**, **US**, **UK**.
Catalogues are cached per region (7 days; tonight refreshes daily).

## Data sources (key-less public APIs)

TVMaze (shows, platform buckets, tonight, search) · archive.org (film streams + metadata) ·
iTunes Search (music previews) · Wikipedia (acclaimed films) · YouTube thumbnails. Offline,
NovaDeck tells you and your apps/local media keep working.

State lives only on this PC (`localStorage` + IndexedDB for folder handles). **Settings →
Factory reset** starts fresh.
