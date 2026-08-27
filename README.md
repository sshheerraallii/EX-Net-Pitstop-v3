# Extreme Networks Pitstop Challenge - v3

Three Electron apps that share one game concept: a kiosk booth game where
players resolve "Agent One" network scenarios by plugging the right ports
on a virtual switch.

## Layout

- eal-game/ - the kiosk game itself. Full source (React + Vite frontend,
  Node/Express + SQLite backend). This is the piece you can actually edit.
- leaderboard/ - backend source only. Its Electron frontend was delivered
  pre-built (dist/ only) - no source was provided for it.
- 	ools/switch-port-mapper/ - standalone dev utility for finding pixel
  coordinates of switch ports on a background image, used to build the
  equired_ports config for each scenario.
- docs/ - reference docs delivered with the v3 build (architecture, API,
  build guide).

## Known gaps (source not delivered by the client)

- **Admin app**: no backend folder exists in the delivery at all, and the
  frontend is compiled-only (dist/). Any change to Admin requires source
  from the client.
- **Leaderboard frontend**: same situation - compiled-only, no source.

## Known bug carried over from the delivered code

leaderboard/backend/package.json has "main" and the start/dev
scripts pointing at server.js, but the actual file is server2.js.

pm start will fail there until that's corrected.

## Running Real Game locally

\\\ash
cd real-game/backend && npm install && npm start      # http://localhost:3001
cd real-game/frontend && npm install && npm run dev   # http://localhost:5173
\\\

See \docs/QUICKSTART.md\ for the full walkthrough.
