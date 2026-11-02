# Booth relay — spectator leaderboard + session control

The game's results live in SQLite on the booth machine, which nothing on the
internet can reach. This is the tablet check-in relay run in reverse: the
kiosk **pushes** finished runs up here, the public board reads them from here,
and the session admin page leaves a message the kiosk picks up on its own.

The booth machine never accepts an inbound connection.

```
kiosk ──push results──▶  Hostinger (MySQL)  ◀──read──  spectator board
kiosk ──poll reset───▶                      ◀──write── session admin page
```

## What goes where

Three folders, three destinations under `public_html/` on Hostinger:

| Local folder   | Upload to                | URL |
|----------------|--------------------------|-----|
| `api/`         | `public_html/booth-api/` | `…/booth-api/*.php` |
| `leaderboard/` | `public_html/leaderboard/` | `…/leaderboard/` |
| `sessions/`    | `public_html/sessions/`  | `…/sessions/` |

`/checkin` is untouched and keeps working exactly as it does now.

`relay.js` is **not** uploaded — it belongs in `real-game/backend/` on the
booth machine and is already in the repo there.

## Setup

1. **Database.** Reuse the MySQL database the check-in relay already uses, or
   make a new one in hPanel → Databases → MySQL Databases. In phpMyAdmin →
   SQL tab, paste `api/schema.sql` and run it. No table name clashes with
   `checkins`.

2. **`api/config.php`** — fill in `DB_NAME`, `DB_USER`, `DB_PASS`, and set
   `RELAY_API_KEY` to a long random string of your own.

3. **`sessions/config.js`** — set `apiKey` to that same string, and `apiBase`
   to your `…/booth-api` URL.

4. **`leaderboard/config.js`** — set `apiBase` only. The board deliberately
   has no key: it is read-only, and a key in a page anyone can view-source is
   security theatre.

5. **Kiosk.** Create `real-game/backend/.env`:

   ```
   RELAY_BASE_URL=https://antiquewhite-jay-310571.hostingersite.com/booth-api
   RELAY_API_KEY=the-same-long-random-string
   ```

   Without both, the relay silently disables itself and the game behaves
   exactly as it did before. That is the intended fallback, not a failure.

## How a show day runs

1. Staff open `…/sessions/` and start a new session, naming it if they like.
2. The public board clears immediately.
3. Within ~15s the kiosk polls, sees the request, resets its own local
   leaderboard, and acknowledges. The admin page switches from "Waiting for
   the kiosk" to "Kiosk is in sync."
4. Players play. Each finished run is pushed up and appears on the board
   within ~8s.

If the kiosk never acknowledges, it is offline or the key is wrong — the
admin page keeps saying "Waiting", which is the point. A silent failure here
would mean the booth screen and the web board disagree all day.

## Failure behaviour, on purpose

- **Venue connection drops mid-run.** Results queue to
  `real-game/backend/db/relay-queue.json` and push when it returns. Gameplay
  is never blocked or delayed by the relay.
- **Push times out after the server already saved it.** Retries are
  idempotent: `run_uid` is unique, so a repeat updates the row instead of
  adding a duplicate to the board.
- **A result is rejected 4xx.** Dropped rather than retried forever, because
  a permanently bad payload at the head of the queue would block every result
  behind it.
- **Nobody ever resets the session.** Rows older than `RELAY_MAX_AGE_HOURS`
  (36h) stop appearing, so day two never silently shows day one's times.
- **Relay unreachable at boot.** The kiosk logs it once and carries on; the
  local leaderboard and result screen are unaffected.

## Not done yet

The kiosk's own `/leaderboard` route still reads the local SQLite board. That
is correct for a screen at the booth. This relay is for the off-site case —
the two can run side by side.
