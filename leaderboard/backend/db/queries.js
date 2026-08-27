const XLSX = require("xlsx");
const db = require("./database");

// -------------------------
// GENERIC DB COMPAT HELPERS
// Supports both:
// 1) better-sqlite3 style (prepare/get/all/run)
// 2) sqlite3 style (get/all/run callbacks)
// -------------------------
function isBetterSqliteDatabase(database) {
  return !!database && typeof database.prepare === "function";
}

function selectOne(database, sql, params = []) {
  return new Promise((resolve, reject) => {
    try {
      if (isBetterSqliteDatabase(database)) {
        const row = database.prepare(sql).get(...params);
        resolve(row || null);
        return;
      }

      if (typeof database.get === "function") {
        database.get(sql, params, (err, row) => {
          if (err) return reject(err);
          resolve(row || null);
        });
        return;
      }

      reject(new Error("Unsupported database instance for selectOne"));
    } catch (error) {
      reject(error);
    }
  });
}

function selectAll(database, sql, params = []) {
  return new Promise((resolve, reject) => {
    try {
      if (isBetterSqliteDatabase(database)) {
        const rows = database.prepare(sql).all(...params);
        resolve(rows || []);
        return;
      }

      if (typeof database.all === "function") {
        database.all(sql, params, (err, rows) => {
          if (err) return reject(err);
          resolve(rows || []);
        });
        return;
      }

      reject(new Error("Unsupported database instance for selectAll"));
    } catch (error) {
      reject(error);
    }
  });
}

function executeRun(database, sql, params = []) {
  return new Promise((resolve, reject) => {
    try {
      if (isBetterSqliteDatabase(database)) {
        const info = database.prepare(sql).run(...params);
        resolve(info);
        return;
      }

      if (typeof database.run === "function") {
        database.run(sql, params, function (err) {
          if (err) return reject(err);
          resolve({
            changes: this?.changes ?? 0,
            lastInsertRowid: this?.lastID ?? null,
          });
        });
        return;
      }

      reject(new Error("Unsupported database instance for executeRun"));
    } catch (error) {
      reject(error);
    }
  });
}

// -------------------------
// HELPERS
// -------------------------
function normalizeConfirmationNumber(value) {
  return String(value || "").trim().toUpperCase();
}

function normalizeHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/_/g, " ");
}

function getCell(row, possibleHeaders) {
  const keys = Object.keys(row || {});

  for (const key of keys) {
    const normalizedKey = normalizeHeader(key);
    if (possibleHeaders.includes(normalizedKey)) {
      return row[key];
    }
  }

  return "";
}

function cleanValue(value) {
  return String(value ?? "").trim();
}

// -------------------------
// PLAYER SCORING
// -------------------------
function getBestRuns(limit = 10) {
  const activeSession = getOrCreateActiveSession();

  const stmt = db.prepare(`
    SELECT
      p.id AS player_id,
      p.name,
      p.country,
      MIN(r.time_ms) AS best_time_ms
    FROM runs r
    INNER JOIN players p ON p.id = r.player_id
    WHERE r.completed = 1
      AND r.time_ms IS NOT NULL
      AND r.session_id = ?
    GROUP BY p.id, p.name, p.country
    ORDER BY best_time_ms ASC
    LIMIT ?
  `);

  return stmt.all(activeSession.id, limit);
}

// -------------------------
// SESSION HELPERS
// -------------------------
function getActiveSession() {
  return db
    .prepare(
      `SELECT * FROM sessions WHERE is_active = 1 ORDER BY id DESC LIMIT 1`
    )
    .get();
}

function createSession(name = "Default Event Session") {
  const stmt = db.prepare(`
    INSERT INTO sessions (name, is_active)
    VALUES (?, 1)
  `);

  const info = stmt.run(name);

  return db
    .prepare(`SELECT * FROM sessions WHERE id = ?`)
    .get(info.lastInsertRowid);
}

function getOrCreateActiveSession() {
  let session = getActiveSession();

  if (!session) {
    session = createSession();
  }

  return session;
}

function resetLeaderboardSession(name = null)  {
  const deactivateStmt = db.prepare(`
    UPDATE sessions
    SET is_active = 0
    WHERE is_active = 1
  `);

  const createStmt = db.prepare(`
    INSERT INTO sessions (name, is_active)
    VALUES (?, 1)
  `);

  const getSessionStmt = db.prepare(`
    SELECT id, name, is_active, created_at
    FROM sessions
    WHERE id = ?
  `);

  const transaction = db.transaction(() => {
    deactivateStmt.run();

const sessionName = cleanValue(name) || `Session ${new Date().toISOString()}`;    const result = createStmt.run(sessionName);

    return getSessionStmt.get(result.lastInsertRowid);
  });

  return transaction();
}

function clearLeaderboardDisplay() {
  db.prepare(`UPDATE sessions SET is_active = 0 WHERE is_active = 1`).run();
  return createSession(`Session ${new Date().toISOString()}`);
}

// -------------------------
// PLAYER HELPERS
// -------------------------
function createManualPlayer({ name, country }) {
  const stmt = db.prepare(`
    INSERT INTO players (name, country, source)
    VALUES (?, ?, 'manual')
  `);

  const info = stmt.run(name, country || null);

  return db
    .prepare(`SELECT * FROM players WHERE id = ?`)
    .get(info.lastInsertRowid);
}

function createManualAdminPlayer(name, country) {
  const cleanName = String(name || "").trim();
  const cleanCountry = String(country || "").trim();

  if (!cleanName) {
    return {
      success: false,
      message: "name is required",
    };
  }

  const stmt = db.prepare(`
    INSERT INTO players (name, country, confirmation_number, source)
    VALUES (?, ?, NULL, 'manual')
  `);

  const result = stmt.run(cleanName, cleanCountry || null);

  const player = db
    .prepare(`
      SELECT id, name, country, confirmation_number, source, created_at
      FROM players
      WHERE id = ?
    `)
    .get(result.lastInsertRowid);

  return {
    success: true,
    message: "Manual player created successfully",
    player,
  };
}

// -------------------------
// STEP 4 - SCAN PLAYER FROM QR / CONFIRMATION NUMBER
// -------------------------
function findRosterByConfirmationNumber(confirmationNumber) {
  const normalized = normalizeConfirmationNumber(confirmationNumber);

  return db
    .prepare(`
      SELECT *
      FROM roster
      WHERE UPPER(TRIM(confirmation_number)) = ?
      LIMIT 1
    `)
    .get(normalized);
}

function findPlayerByConfirmationNumber(confirmationNumber) {
  const normalized = normalizeConfirmationNumber(confirmationNumber);

  return db
    .prepare(`
      SELECT *
      FROM players
      WHERE UPPER(TRIM(confirmation_number)) = ?
      LIMIT 1
    `)
    .get(normalized);
}

function createQrPlayerFromRoster(rosterRow) {
  const fullName = `${rosterRow.first_name || ""} ${rosterRow.last_name || ""}`.trim();

  const insert = db.prepare(`
    INSERT INTO players (
      name,
      country,
      confirmation_number,
      source
    )
    VALUES (?, ?, ?, ?)
  `);

  const result = insert.run(
    fullName || "Unknown Player",
    rosterRow.country || null,
    rosterRow.confirmation_number || "",
    "qr"
  );

  return db
    .prepare(`SELECT * FROM players WHERE id = ?`)
    .get(result.lastInsertRowid);
}

function getOrCreatePlayerFromQR(confirmationNumber) {
  const normalized = normalizeConfirmationNumber(confirmationNumber);

  if (!normalized) {
    return {
      success: false,
      message: "confirmation_number is required",
      player: null,
      roster: null,
    };
  }

  const rosterRow = findRosterByConfirmationNumber(normalized);

  if (!rosterRow) {
    return {
      success: false,
      message: "Player not found in roster",
      player: null,
      roster: null,
    };
  }

  let player = findPlayerByConfirmationNumber(normalized);

  if (!player) {
    player = createQrPlayerFromRoster(rosterRow);
  }

  return {
    success: true,
    message: "Player identified successfully",
    player: {
      id: player.id,
      name: player.name,
      country: player.country,
      confirmation_number: player.confirmation_number,
      source: player.source,
    },
    roster: {
      first_name: rosterRow.first_name,
      last_name: rosterRow.last_name,
      email: rosterRow.email,
      invitee_status: rosterRow.invitee_status,
      country: rosterRow.country,
      confirmation_number: rosterRow.confirmation_number,
    },
  };
}

// -------------------------
// STEP 5 - ROSTER UPLOAD FROM EXCEL
// -------------------------
function uploadRosterFromExcel(fileBuffer) {
  try {
    const workbook = XLSX.read(fileBuffer, { type: "buffer" });

    if (!workbook.SheetNames || !workbook.SheetNames.length) {
      return {
        success: false,
        message: "Excel file has no sheets",
      };
    }

    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];

    const rows = XLSX.utils.sheet_to_json(sheet, {
      defval: "",
      raw: false,
    });

    if (!rows.length) {
      return {
        success: false,
        message: "Excel sheet is empty",
      };
    }

    const parsedRows = [];

    for (const row of rows) {
      const firstName = cleanValue(
        getCell(row, ["first name", "firstname", "first_name"])
      );

      const lastName = cleanValue(
        getCell(row, ["last name", "lastname", "last_name"])
      );

      const email = cleanValue(
        getCell(row, ["email", "email address", "email_address"])
      );

      const inviteeStatus = cleanValue(
        getCell(row, ["invitee status", "invitee_status", "status"])
      );

      const country = cleanValue(getCell(row, ["country", "country name"]));

      const confirmationNumber = cleanValue(
        getCell(row, [
          "confirmation #",
          "confirmation#",
          "confirmation number",
          "confirmation_number",
          "confirmation no",
          "confirmation",
        ])
      );

      const isBlank =
        !firstName &&
        !lastName &&
        !email &&
        !inviteeStatus &&
        !country &&
        !confirmationNumber;

      if (isBlank) continue;
      if (!confirmationNumber) continue;

      parsedRows.push({
        first_name: firstName,
        last_name: lastName,
        email,
        invitee_status: inviteeStatus,
        country,
        confirmation_number: confirmationNumber,
      });
    }

    if (!parsedRows.length) {
      return {
        success: false,
        message:
          "No valid roster rows found. Confirmation number column may be missing.",
      };
    }

    const clearRoster = db.prepare(`DELETE FROM roster`);

    const insertRoster = db.prepare(`
      INSERT INTO roster (
        first_name,
        last_name,
        email,
        invitee_status,
        country,
        confirmation_number
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction((rowsToInsert) => {
      clearRoster.run();

      for (const row of rowsToInsert) {
        insertRoster.run(
          row.first_name,
          row.last_name,
          row.email,
          row.invitee_status,
          row.country,
          row.confirmation_number
        );
      }
    });

    transaction(parsedRows);

    return {
      success: true,
      message: "Roster uploaded successfully",
      totalImported: parsedRows.length,
      sheetName: firstSheetName,
    };
  } catch (error) {
    return {
      success: false,
      message: error.message || "Failed to upload roster",
    };
  }
}

// -------------------------
// RUN HELPERS
// -------------------------
function startRun(playerId) {
  try {
    const cleanPlayerId = Number(playerId);

    if (!cleanPlayerId || Number.isNaN(cleanPlayerId)) {
      return {
        success: false,
        message: "Valid player_id is required",
      };
    }

    const player = db
      .prepare(`
        SELECT id, name, country, confirmation_number, source
        FROM players
        WHERE id = ?
      `)
      .get(cleanPlayerId);

    if (!player) {
      return {
        success: false,
        message: "Player not found",
      };
    }

    const session = getOrCreateActiveSession();

    const result = db
      .prepare(`
        INSERT INTO runs (
          player_id,
          session_id,
          time_ms,
          completed
        )
        VALUES (?, ?, NULL, 0)
      `)
      .run(cleanPlayerId, session.id);

    const run = db
      .prepare(`
        SELECT
          id,
          player_id,
          session_id,
          time_ms,
          completed,
          created_at
        FROM runs
        WHERE id = ?
      `)
      .get(result.lastInsertRowid);

    return {
      success: true,
      message: "Run started successfully",
      run,
      player,
      session,
    };
  } catch (error) {
    return {
      success: false,
      message: error.message || "Failed to start run",
    };
  }
}

function completeRun(runId, timeMs) {
  const run = db
    .prepare(`
      SELECT *
      FROM runs
      WHERE id = ?
    `)
    .get(runId);

  if (!run) {
    return {
      success: false,
      message: "Run not found",
    };
  }

  if (Number(run.completed) === 1) {
    return {
      success: false,
      message: "Run already completed",
    };
  }

  db.prepare(`
    UPDATE runs
    SET time_ms = ?, completed = 1
    WHERE id = ?
  `).run(timeMs, runId);

  const updatedRun = db
    .prepare(`
      SELECT *
      FROM runs
      WHERE id = ?
    `)
    .get(runId);

  return {
    success: true,
    message: "Run completed successfully",
    run: updatedRun,
  };
}

function saveRun({ playerId, sessionId, timeMs, completed }) {
  const stmt = db.prepare(`
    INSERT INTO runs (player_id, session_id, time_ms, completed)
    VALUES (?, ?, ?, ?)
  `);

  const info = stmt.run(
    playerId || null,
    sessionId || null,
    timeMs || null,
    completed ? 1 : 0
  );

  return db
    .prepare(`SELECT * FROM runs WHERE id = ?`)
    .get(info.lastInsertRowid);
}

function getLeaderboard(sessionId) {
  return db
    .prepare(`
      SELECT
        p.id AS player_id,
        p.name,
        p.country,
        MIN(r.time_ms) AS best_time_ms
      FROM runs r
      INNER JOIN players p ON p.id = r.player_id
      WHERE r.completed = 1
        AND r.session_id = ?
      GROUP BY p.id, p.name, p.country
      ORDER BY best_time_ms ASC
    `)
    .all(sessionId);
}

function getPlayerResultSummary(playerId) {
  const session = getOrCreateActiveSession();

  const rows = db
    .prepare(`
      SELECT
        best_scores.player_id,
        players.name,
        players.country,
        best_scores.best_time_ms
      FROM (
        SELECT
          runs.player_id,
          MIN(runs.time_ms) AS best_time_ms
        FROM runs
        WHERE runs.session_id = ?
          AND runs.completed = 1
          AND runs.time_ms IS NOT NULL
        GROUP BY runs.player_id
      ) AS best_scores
      INNER JOIN players
        ON players.id = best_scores.player_id
      ORDER BY best_scores.best_time_ms ASC, best_scores.player_id ASC
    `)
    .all(session.id);

  const ranked = rows.map((row, index) => ({
    ...row,
    rank: index + 1,
  }));

  const playerRow = ranked.find(
    (row) => Number(row.player_id) === Number(playerId)
  );

  return {
    session,
    player: playerRow || null,
    leaderboard: ranked.slice(0, 10),
    totalRankedPlayers: ranked.length,
  };
}

// -------------------------
// STEP 18B - ADMIN HELPERS
// -------------------------
async function getAdminStatus(database = db) {
  const result = {
    activeSession: null,
    totalPlayers: 0,
    totalRuns: 0,
    completedRuns: 0,
    topPlayer: null,
  };

  result.activeSession = await selectOne(
    database,
    `SELECT id, name, is_active, created_at
     FROM sessions
     WHERE is_active = 1
     ORDER BY id DESC
     LIMIT 1`
  );

  const playersCount = await selectOne(
    database,
    `SELECT COUNT(*) AS count FROM players`
  );
  result.totalPlayers = playersCount?.count || 0;

  const runsCount = await selectOne(
    database,
    `SELECT COUNT(*) AS count FROM runs`
  );
  result.totalRuns = runsCount?.count || 0;

  const completedRunsCount = await selectOne(
    database,
    `SELECT COUNT(*) AS count FROM runs WHERE completed = 1`
  );
  result.completedRuns = completedRunsCount?.count || 0;

  result.topPlayer = await selectOne(
    database,
    `SELECT p.id, p.name, p.country, MIN(r.time_ms) AS best_time_ms
     FROM runs r
     JOIN players p ON p.id = r.player_id
     JOIN sessions s ON s.id = r.session_id
     WHERE r.completed = 1
       AND s.is_active = 1
     GROUP BY p.id, p.name, p.country
     ORDER BY best_time_ms ASC
     LIMIT 1`
  );

  return result;
}

async function getAllSessions(database = db) {
  return await selectAll(
    database,
    `SELECT
       s.id,
       s.name,
       s.is_active,
       s.created_at,
       COUNT(r.id) AS run_count
     FROM sessions s
     LEFT JOIN runs r ON r.session_id = s.id
     GROUP BY s.id
     ORDER BY s.id DESC`
  );
}

async function getAdminPlayers(database = db) {
  return await selectAll(
    database,
    `SELECT
       p.id,
       p.name,
       p.country,
       p.confirmation_number,
       p.source,
       p.created_at,
       COUNT(r.id) AS total_runs,
       MIN(CASE WHEN r.completed = 1 THEN r.time_ms END) AS best_time_ms
     FROM players p
     LEFT JOIN runs r ON r.player_id = p.id
     GROUP BY p.id
     ORDER BY p.id DESC`
  );
}

async function getAdminRuns(database = db) {
  return await selectAll(
    database,
    `SELECT
       r.id,
       r.player_id,
       p.name AS player_name,
       p.country,
       r.session_id,
       r.time_ms,
       r.completed,
       r.created_at
     FROM runs r
     JOIN players p ON p.id = r.player_id
     ORDER BY r.id DESC`
  );
}

async function updatePlayerAdmin(id, { name, country }, database = db) {
  const cleanId = Number(id);
  const cleanName = String(name ?? "").trim();
  const cleanCountry = String(country ?? "").trim();

  if (!cleanId || !cleanName) {
    return null;
  }

  const info = await executeRun(
    database,
    `UPDATE players
     SET name = ?, country = ?
     WHERE id = ?`,
    [cleanName, cleanCountry || null, cleanId]
  );

  if (!info?.changes) {
    return null;
  }

  return await selectOne(
    database,
    `SELECT
       id,
       name,
       country,
       confirmation_number,
       source,
       created_at
     FROM players
     WHERE id = ?`,
    [cleanId]
  );
}

async function updateRunTimeAdmin(id, timeMs, database = db) {
  const cleanId = Number(id);
  const cleanTimeMs = Number(timeMs);

  if (!cleanId || !Number.isFinite(cleanTimeMs) || cleanTimeMs <= 0) {
    return null;
  }

  const info = await executeRun(
    database,
    `UPDATE runs
     SET time_ms = ?, completed = 1
     WHERE id = ?`,
    [Math.round(cleanTimeMs), cleanId]
  );

  if (!info?.changes) {
    return null;
  }

  return await selectOne(
    database,
    `SELECT
       r.id,
       r.player_id,
       p.name AS player_name,
       p.country,
       r.session_id,
       r.time_ms,
       r.completed,
       r.created_at
     FROM runs r
     JOIN players p ON p.id = r.player_id
     WHERE r.id = ?`,
    [cleanId]
  );
}

module.exports = {
  getActiveSession,
  createSession,
  getOrCreateActiveSession,
  resetLeaderboardSession,
  clearLeaderboardDisplay,

  createManualPlayer,
  createManualAdminPlayer,

  findRosterByConfirmationNumber,
  findPlayerByConfirmationNumber,
  createQrPlayerFromRoster,
  getOrCreatePlayerFromQR,

  uploadRosterFromExcel,

  startRun,
  completeRun,
  saveRun,

  getLeaderboard,
  getBestRuns,
  getPlayerResultSummary,

  getAdminStatus,
  getAllSessions,
  getAdminPlayers,
  getAdminRuns,
  updatePlayerAdmin,
  updateRunTimeAdmin,
};