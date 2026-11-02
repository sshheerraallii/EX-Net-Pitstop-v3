# Pitstop v3 — setup

Runs on Windows and macOS. The stack is Node/Express + better-sqlite3 on the
back, React + Vite on the front; nothing in it is platform-specific.

## Requirements

- Node.js 18 or newer (`node -v`)
- The booth machine on the same network as the switch at `10.10.10.1`

On macOS, `better-sqlite3` is the only native module. It ships prebuilt
binaries for Apple Silicon and Intel, so `npm install` normally just works. If
it tries to compile instead, install the Xcode command line tools once with
`xcode-select --install` and run the install again.

## Running it

From the repo root:

```
node tools/start.mjs           # builds the frontend and serves the kiosk
node tools/start.mjs --dev     # dev server with hot reload
```

Installs dependencies on first run. Starts the backend and the frontend
together, prefixes their logs, and takes both down if either one dies.

- Kiosk: `http://localhost:4173`
- Spectator leaderboard: `http://localhost:4173/leaderboard`
- Check-in (hosted separately): `antiquewhite-jay-310571.hostingersite.com/checkin`

## Fullscreen at the booth

**Windows**

```
"C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk --autoplay-policy=no-user-gesture-required http://localhost:4173
```

**macOS**

```
open -a "Google Chrome" --args --kiosk --autoplay-policy=no-user-gesture-required http://localhost:4173
```

`--autoplay-policy=no-user-gesture-required` lets the background music start on
its own. Without it the first touch on the attract screen unlocks audio, which
is handled in code and works fine — the flag just makes the booth silent-to-
music transition invisible.

For the spectator screen, open a second Chrome window with the same flags
pointed at `/leaderboard`.

## Starting on boot

**Windows** — Task Scheduler, trigger "At log on", action
`node D:\path\to\pitstop-v3\tools\start.mjs`.

**macOS** — a LaunchAgent at `~/Library/LaunchAgents/com.wredd.pitstop.plist`
with `ProgramArguments` set to the node binary and the script path, and
`RunAtLoad` true. `launchctl load` it once.

## At the start of each show day

**Start a new session, or the leaderboard still shows yesterday's times.**
Restarting the server does not do this. Old runs are never deleted — they stay
in SQLite and stop displaying because they belong to a retired session.

Staff menu (corner of the kiosk screen) → the session reset item. That calls
`POST /api/admin/reset-leaderboard`.

## Switch configuration

`switchIP` and `community` are hardcoded near the top of
`real-game/backend/server2.js` (`10.10.10.1`, `public`). Change them there if
the booth switch differs. A non-default SNMP read community is worth asking the
client for.

If the switch is unreachable the game runs in keyboard mode: `1`–`9` toggle
ports 1–9 and `A`–`O` toggle 10–24, so the whole flow can be tested without
hardware on the same build that ships. A "Keyboard mode" pill appears bottom
left when that is active.

On first run with a real switch, watch the backend console — the port map
status and the per-scenario baseline capture both log there.
