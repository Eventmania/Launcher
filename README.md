# NovaDeck — Google TV-style launcher for Windows 10

A 10-foot, arrow-key-driven launcher. Built with React + Vite + Tailwind v4.

## Run it on your PC

**Prerequisite:** [Node.js LTS](https://nodejs.org) (20+). Verify with `node -v` in PowerShell.

### A · Dev mode (fastest)

```powershell
npm install
npm run dev
```

Open **http://localhost:3000** in Chrome/Edge.

### B · Production build

```powershell
npm install
npm run build
npx serve dist -l 4173
```

Open **http://localhost:4173**. (Do not double-click `dist/index.html` —
the build uses absolute asset paths, so it must be served over HTTP.)

### C · Full-screen TV mode

Open the URL, press **F11**, and use arrow keys + Enter + Esc.

## Use it like a TV

| Key | Action |
|---|---|
| ↑ ↓ ← → | Move focus |
| Enter / Space | Open / Launch |
| Esc | Back to launcher |
| ⇧M or right-click | App options (favorite / edit / remove) |
| Any letter | Instant search |
| ? | In-app help |

## Launch real Windows programs

Browsers cannot start `.exe` files directly, so NovaDeck uses **custom URI
protocols** (the same mechanism `steam://` and `vscode://` use).

1. **Apps → Add app** → choose **PC app (protocol)**.
2. Pick an existing protocol (`steam://`, `vscode://`, `spotify:`) **or**
   register your own, e.g. `novadeck-movies://`:

   1. Save this as `register-novadeck-movies.reg` (fix the path, escape `\` as `\\`):

      ```reg
      Windows Registry Editor Version 5.00

      [HKEY_CLASSES_ROOT\novadeck-movies]
      @="URL: NovaDeck Movies"
      "URL Protocol"=""

      [HKEY_CLASSES_ROOT\novadeck-movies\shell\open\command]
      @="\"C:\\Program Files\\VLC\\vlc.exe\" \"%1\""
      ```

   2. Double-click the file → Yes → Yes (needs admin once).
3. Add an app with target `novadeck-movies://play` and Enter opens the program.
   The launcher never closes — **Alt+Tab** back to it at any time.

## Persisted locally

Apps, favorites, watchlist, progress and settings live in `localStorage`
(`novadeck-state-v1`) — **Settings → Factory reset** clears everything.
