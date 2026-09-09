# Extreme Agent One — desktop / kiosk build

Wraps the game **and** the spectator leaderboard into one Windows installer.
The installed app runs the Node backend itself and shows the UI full-screen,
so the kiosk PC needs nothing else installed (no Node, no separate web
server). Check-in stays where it is on Hostinger — it is not part of this.

```
desktop/
  main.js              Electron shell: starts the backend, opens the window
  preload.js           (empty bridge; keeps contextIsolation on)
  scripts/prepare.mjs  builds the frontend + stages a clean backend payload
  installer/installer.nsh   adds the "…- Leaderboard" shortcuts
  build/icon.ico       app / installer icon (replace with a brand asset)
```

## Build the installer

On a **Windows x64** machine (build where it will run):

```bat
cd real-game\desktop
npm install
npm run dist
```

`npm run dist` runs `scripts/prepare.mjs` first, which:

1. builds the React app → `../frontend/dist`
2. copies the backend → `build-staging/backend` (no dev DB, no `.env`)
3. installs its production dependencies there
4. rebuilds `better-sqlite3` in that copy for this Electron version

then `electron-builder` packages everything into:

```
release\Extreme-Agent-One-Setup-<version>.exe
```

That `.exe` is the one-click installer you give the client. It needs no admin
rights (installs per-user under `%LOCALAPPDATA%\Programs`).

> Your working `../backend` copy is left untouched — the native-module rebuild
> only happens inside `build-staging/`.

## What the installer does

- Installs the app per-user, no wizard, launches it when done.
- Desktop + Start-menu shortcuts:
  - **Extreme Agent One** → the game (`/`)
  - **Extreme Agent One - Leaderboard** → the spectator board (`/leaderboard`)
- Registers the app to **launch at login** (kiosk). Remove later via
  Task Manager → Startup, or by uninstalling.

## Runtime behaviour

- On launch the shell checks `http://localhost:3001/api/health`. If the
  backend is already up (a previous session, or the login auto-start) it just
  attaches; otherwise it starts it.
- SQLite DB + any uploaded rosters/intro videos live in
  `%APPDATA%\Extreme Agent One\data\` (the install dir is read-only). First
  run creates and seeds the DB automatically.
- Keys: **F11** toggle full-screen · **Ctrl+Shift+Q** quit.
- The second screen at the booth just opens the **Leaderboard** shortcut, or
  any browser on the LAN pointed at `http://<kiosk-ip>:3001/leaderboard`.

## Dev

`npm run dev` here only opens the Electron window — run the backend yourself
in another terminal (`cd ../backend && npm run dev`) and the frontend too if
you want HMR (`cd ../frontend && npm run dev`, then point the window at
`:5173` by editing `APP_URL` in `main.js`). Day-to-day UI work doesn't need
Electron at all.

## Updating the deployed kiosk

Rebuild the installer with a bumped `version` in `package.json` and run the
new `.exe` — it upgrades in place. The DB in `%APPDATA%` is kept.
