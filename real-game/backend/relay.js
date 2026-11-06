// Kiosk side of the booth relay.
//
// Two jobs, both outbound-only so the booth machine never has to accept a
// connection from the internet:
//
//   1. Push every finished run up to the relay, so the public spectator
//      board can show it. Queued and retried on disk, because a dropped
//      venue connection must never stall or fail a player's run.
//   2. Poll the relay for a "start a new session" request from the admin
//      page, reset the local leaderboard when one appears, and acknowledge
//      it so staff can see the kiosk picked it up.
//
// Disabled entirely unless RELAY_BASE_URL and RELAY_API_KEY are set, so a
// build with no .env behaves exactly as it did before this existed.

const fs = require("fs");
const path = require("path");

const BASE_URL = (process.env.RELAY_BASE_URL || "").replace(/\/+$/, "");
const API_KEY = process.env.RELAY_API_KEY || "";

// Same resolution as db/database.js, so the queue lands beside the database
// rather than somewhere read-only in a packaged build.
const dataDir = process.env.PITSTOP_DATA_DIR || path.join(__dirname, "db");
const QUEUE_FILE = path.join(dataDir, "relay-queue.json");

const SESSION_POLL_MS = 15000;
const FLUSH_RETRY_MS = 10000;
const REQUEST_TIMEOUT_MS = 8000;
// A result nobody could deliver in two days is from a show that is over.
const MAX_QUEUE_AGE_MS = 48 * 60 * 60 * 1000;

const enabled = Boolean(BASE_URL && API_KEY);

let queue = [];
let flushing = false;
let flushTimer = null;

function loadQueue() {
  try {
    if (!fs.existsSync(QUEUE_FILE)) return [];
    const parsed = JSON.parse(fs.readFileSync(QUEUE_FILE, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("Relay: could not read queue, starting empty:", error.message);
    return [];
  }
}

function saveQueue() {
  try {
    fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue), "utf8");
  } catch (error) {
    // Losing the queue file is survivable; losing the run is not, and the
    // run itself is already safe in SQLite.
    console.warn("Relay: could not write queue:", error.message);
  }
}

async function post(endpoint, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${BASE_URL}/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Relay-Key": API_KEY },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await response.text();
    let data = null;
    try {
      data = JSON.parse(text);
    } catch (_) {
      /* non-JSON error page from the host */
    }
    return { ok: response.ok, status: response.status, data };
  } finally {
    clearTimeout(timer);
  }
}

async function get(endpoint) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${BASE_URL}/${endpoint}`, {
      headers: { "X-Relay-Key": API_KEY },
      signal: controller.signal,
    });
    const data = await response.json();
    return { ok: response.ok, data };
  } finally {
    clearTimeout(timer);
  }
}

function scheduleFlush(delay = FLUSH_RETRY_MS) {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flush();
  }, delay);
  if (flushTimer.unref) flushTimer.unref();
}

async function flush() {
  if (!enabled || flushing || queue.length === 0) return;
  flushing = true;

  try {
    while (queue.length) {
      const item = queue[0];

      if (Date.now() - item.queued_at > MAX_QUEUE_AGE_MS) {
        console.warn(`Relay: dropping stale result ${item.run_uid}`);
        queue.shift();
        saveQueue();
        continue;
      }

      let result;
      try {
        result = await post("result_submit.php", {
          run_uid: item.run_uid,
          name: item.name,
          country: item.country,
          time_ms: item.time_ms,
        });
      } catch (error) {
        // Network down or timed out. Keep the item and try again later.
        console.warn("Relay: push failed, will retry:", error.message);
        scheduleFlush();
        return;
      }

      if (result.ok) {
        queue.shift();
        saveQueue();
        continue;
      }

      // A wrong or missing key (401/403) and "no active session yet" (409)
      // are configuration states, not bad payloads - they get fixed and the
      // queued results should still land, so keep them. Only a genuinely
      // unacceptable request is dropped, because one of those at the head of
      // the queue would block everything behind it forever. The 48h age cap
      // stops the queue growing without bound if nobody ever fixes it.
      const retryable = result.status === 401 || result.status === 403 || result.status === 409;
      if (result.status >= 400 && result.status < 500 && !retryable) {
        console.warn(
          `Relay: rejected result ${item.run_uid} (${result.status}), dropping it`
        );
        queue.shift();
        saveQueue();
        continue;
      }

      if (result.status === 401 || result.status === 403) {
        console.warn(
          "Relay: the server refused our key (RELAY_API_KEY must match " +
            "booth-relay/api/config.php). Holding results until it matches."
        );
      }

      console.warn(`Relay: server returned ${result.status}, will retry`);
      scheduleFlush();
      return;
    }
  } finally {
    flushing = false;
  }
}

// Called when a run finishes. Never throws and never blocks the response -
// the player's result is already committed locally by this point.
function pushResult({ runId, name, country, timeMs }) {
  if (!enabled) return;
  if (!runId || !name || !timeMs) return;

  const runUid = String(runId);
  if (queue.some((item) => item.run_uid === runUid)) return;

  queue.push({
    run_uid: runUid,
    name: String(name).slice(0, 120),
    country: country ? String(country).slice(0, 120) : null,
    time_ms: Math.round(Number(timeMs)),
    queued_at: Date.now(),
  });
  saveQueue();
  flush();
}

// Polls for a reset requested from the admin page. `onResetRequested` should
// retire the local session; only once it returns without throwing do we
// acknowledge, so a failure here leaves the request pending and visible to
// staff rather than silently swallowed.
function startSessionWatch(onResetRequested) {
  if (!enabled) return;

  const tick = async () => {
    try {
      const { ok, data } = await get("session_pending.php");
      if (!ok || !data || !data.success || !data.session) return;
      if (!data.reset_requested) return;

      console.log(
        `Relay: session reset requested (${data.session.name}), resetting local leaderboard`
      );
      await onResetRequested(data.session);
      await post("session_ack.php", { session_id: data.session.id });
      console.log("Relay: session reset acknowledged");
    } catch (error) {
      // Expected whenever the venue connection drops. Next tick retries.
      console.warn("Relay: session poll failed:", error.message);
    }
  };

  const timer = setInterval(tick, SESSION_POLL_MS);
  if (timer.unref) timer.unref();
  tick();
}

function start(onResetRequested) {
  if (!enabled) {
    console.log("Relay: disabled (RELAY_BASE_URL / RELAY_API_KEY not set)");
    return;
  }
  if (typeof fetch !== "function") {
    console.warn("Relay: disabled, this Node build has no global fetch (needs Node 18+)");
    return;
  }

  queue = loadQueue();
  console.log(
    `Relay: enabled -> ${BASE_URL} (${queue.length} result${queue.length === 1 ? "" : "s"} queued)`
  );
  flush();
  startSessionWatch(onResetRequested);
}

module.exports = { start, pushResult, isEnabled: () => enabled };
