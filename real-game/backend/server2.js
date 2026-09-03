const db = require("./db/database");
const { seedScenarios } = require("./db/seed-scenarios");

const express = require("express");
const cors = require("cors");
const snmp = require("net-snmp");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const {
getAdminStatus,
getAllSessions,
getAdminPlayers,
getAdminRuns,
updatePlayerAdmin,
updateRunTimeAdmin,
getOrCreateActiveSession,
clearLeaderboardDisplay,
createManualPlayer,
createManualAdminPlayer,
getOrCreatePlayerFromQR,
getLeaderboard,
uploadRosterFromExcel,
startRun,
completeRun,
getBestRuns,
resetLeaderboardSession,
getPlayerResultSummary,
getRandomScenariosByCategory,
getScenarioById,
createScenarioRun,
completeScenarioRun,
getScenarioRunsByRunId,
updateRunWithPenalty,
} = require("./db/queries");

const app = express();
const port = process.env.PORT || 3001;

// -------------------------
// MIDDLEWARE
// -------------------------
app.use(cors());
app.use(express.json());
app.use(express.static("public"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// -------------------------
// MULTER SETUP
// -------------------------
const upload = multer({ storage: multer.memoryStorage() });
const ADMIN_UPLOAD_DIR = path.join(__dirname, "uploads");
const ADMIN_ROSTER_DIR = path.join(ADMIN_UPLOAD_DIR, "roster");
const ADMIN_VIDEO_DIR = path.join(ADMIN_UPLOAD_DIR, "intro");

if (!fs.existsSync(ADMIN_UPLOAD_DIR)) fs.mkdirSync(ADMIN_UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(ADMIN_ROSTER_DIR)) fs.mkdirSync(ADMIN_ROSTER_DIR, { recursive: true });
if (!fs.existsSync(ADMIN_VIDEO_DIR)) fs.mkdirSync(ADMIN_VIDEO_DIR, { recursive: true });

const adminRosterUpload = multer({
  dest: ADMIN_ROSTER_DIR,
});

const adminVideoUpload = multer({
  storage: multer.diskStorage({
    destination: (_, __, cb) => cb(null, ADMIN_VIDEO_DIR),
    filename: (_, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `intro-current${ext}`);
    },
  }),
  fileFilter: (_, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === ".mp4" || ext === ".webm") {
      cb(null, true);
    } else {
      cb(new Error("Only mp4 or webm files are allowed"));
    }
  },
});










// -------------------------
// SNMP CONFIG
// -------------------------
const switchIP = "10.10.10.1";
const community = "public";
const options = { version: snmp.Version2c };
const ifDescrOid = "1.3.6.1.2.1.2.2.1.2";
const ifOperStatusBaseOid = "1.3.6.1.2.1.2.2.1.8";

const snmpSession = snmp.createSession(switchIP, community, options);

// -------------------------
// HELPERS
// -------------------------
function extractPortNumberFromXOS(ifName) {
  const match = String(ifName || "").match(/Port\s+(\d{1,2})/i);

  if (!match) {
    return NaN;
  }

  const portNum = parseInt(match[1], 10);

  if (portNum >= 1 && portNum <= 24) {
    return portNum;
  }

  return NaN;
}

function buildPortMap() {
  return new Promise((resolve, reject) => {
    const portMap = new Map();

    snmpSession.subtree(
      ifDescrOid,
      (varbinds) => {
        for (const varbind of varbinds) {
          const ifIndex = parseInt(String(varbind.oid).split(".").pop(), 10);
          const ifName = String(varbind.value || "");
          const portNum = extractPortNumberFromXOS(ifName);

          if (!Number.isNaN(portNum)) {
            portMap.set(portNum, ifIndex);
          }
        }
      },
      (error) => {
        if (error) {
          return reject(error);
        }

        return resolve(portMap);
      }
    );
  });
}

// -------------------------
// GAME SESSION
// -------------------------
class GameSession {
  constructor() {
    this.currentSession = null;
    this.portStates = new Map();
    this.activePorts = new Set();
    this.gameStartTime = null;
    this.gameEndTime = null;
    this.isGameActive = false;

    for (let i = 1; i <= 24; i += 1) {
      this.portStates.set(i, {
        status: "down",
        timestamp: new Date(),
      });
    }
  }

  startNewGame(targetPorts) {
    this.currentSession = Date.now().toString();
    this.activePorts = new Set(targetPorts);
    this.gameStartTime = new Date();
    this.gameEndTime = null;
    this.isGameActive = true;

    for (let i = 1; i <= 24; i += 1) {
      this.portStates.set(i, {
        status: "down",
        timestamp: new Date(),
      });
    }

    console.log(
      `🎮 New game started with target ports: ${Array.from(this.activePorts).join(", ")}`
    );

    return this.currentSession;
  }

  async refreshPortStates(portMap) {
    const ports = Array.from(portMap.keys());
    const oids = ports
      .map((port) => portMap.get(port))
      .filter((ifIndex) => Boolean(ifIndex))
      .map((ifIndex) => `${ifOperStatusBaseOid}.${ifIndex}`);

    if (oids.length === 0) {
      throw new Error("No SNMP OIDs available to query port statuses");
    }

    return new Promise((resolve, reject) => {
      snmpSession.get(oids, (error, varbinds) => {
        if (error) {
          return reject(error);
        }

        const statusMap = {
          1: "up",
          2: "down",
          3: "testing",
          4: "unknown",
          5: "dormant",
          6: "notPresent",
          7: "lowerLayerDown",
        };

        varbinds.forEach((varbind, index) => {
          if (snmp.isVarbindError(varbind)) {
            console.warn(`SNMP varbind error at index ${index}`);
            return;
          }

          const port = ports[index];
          const statusCode = Number(varbind.value);
          const status = statusMap[statusCode] || "unknown";

          this.portStates.set(port, {
            status,
            timestamp: new Date(),
          });
        });

        return resolve();
      });
    });
  }

  togglePort(portNumber) {
    if (!this.portStates.has(portNumber)) {
      throw new Error(`Invalid port number: ${portNumber}`);
    }

    const currentState = this.portStates.get(portNumber);
    const newStatus = currentState.status === "up" ? "down" : "up";

    this.portStates.set(portNumber, {
      status: newStatus,
      timestamp: new Date(),
    });

    if (this.isGameActive && this.checkGameComplete()) {
      this.endGame();
    }

    return {
      port: portNumber,
      status: newStatus,
      timestamp: this.portStates.get(portNumber).timestamp,
    };
  }

  setPortStatus(portNumber, targetStatus) {
    if (!this.portStates.has(portNumber)) {
      throw new Error(`Invalid port number: ${portNumber}`);
    }

    const currentState = this.portStates.get(portNumber);

    if (currentState.status === targetStatus) {
      return {
        port: portNumber,
        status: currentState.status,
        timestamp: currentState.timestamp,
        changed: false,
      };
    }

    this.portStates.set(portNumber, {
      status: targetStatus,
      timestamp: new Date(),
    });

    if (this.isGameActive && this.checkGameComplete()) {
      this.endGame();
    }

    return {
      port: portNumber,
      status: targetStatus,
      timestamp: this.portStates.get(portNumber).timestamp,
      changed: true,
    };
  }

  checkGameComplete() {
    if (!this.isGameActive || this.activePorts.size === 0) {
      return false;
    }

    for (const port of this.activePorts) {
      const state = this.portStates.get(port);

      if (!state || state.status !== "up") {
        return false;
      }
    }

    return true;
  }

  endGame() {
    if (!this.isGameActive) {
      return null;
    }

    this.gameEndTime = new Date();
    this.isGameActive = false;
    const duration = this.gameEndTime - this.gameStartTime;

    console.log(`🏁 Game completed in ${duration} ms`);

    return {
      sessionId: this.currentSession,
      startTime: this.gameStartTime,
      endTime: this.gameEndTime,
      duration,
      completedPorts: Array.from(this.activePorts),
    };
  }

  reset() {
    this.currentSession = null;
    this.activePorts = new Set();
    this.gameStartTime = null;
    this.gameEndTime = null;
    this.isGameActive = false;

    for (let i = 1; i <= 24; i += 1) {
      this.portStates.set(i, {
        status: "down",
        timestamp: new Date(),
      });
    }
  }

  getGameState() {
    const ports = [];

    for (let i = 1; i <= 24; i += 1) {
      const portState = this.portStates.get(i);

      ports.push({
        port: i,
        status: portState.status,
        isTarget: this.activePorts.has(i),
        timestamp: portState.timestamp,
      });
    }

    return {
      sessionId: this.currentSession,
      isGameActive: this.isGameActive,
      startTime: this.gameStartTime,
      endTime: this.gameEndTime,
      targetPorts: Array.from(this.activePorts),
      ports,
      completedTargets: Array.from(this.activePorts).filter((port) => {
        const state = this.portStates.get(port);
        return state && state.status === "up";
      }).length,
      totalTargets: this.activePorts.size,
    };
  }
}

const gameSession = new GameSession();
let portMapGlobal = new Map();

let latestLeaderboardTakeover = null;
let currentIntroVideo = "/intovideo.mp4";
let previousIntroVideo = "/intovideo.mp4";



function buildTakeoverFromSummary(summary, run) {
  if (!summary?.player || summary.player.rank > 10) {
    return null;
  }

  return {
    eventId: `takeover-${Date.now()}-${summary.player.id}`,
    playerId: summary.player.id,
    playerName: summary.player.name,
    country: summary.player.country || "",
    rank: summary.player.rank,
    timeMs: Number(run?.time_ms || 0),
    triggeredAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7000).toISOString(),
  };
}

function getActiveTakeover() {
  if (!latestLeaderboardTakeover) {
    return null;
  }

  const expiresAtMs = new Date(latestLeaderboardTakeover.expiresAt).getTime();

  if (Number.isNaN(expiresAtMs) || Date.now() > expiresAtMs) {
    latestLeaderboardTakeover = null;
    return null;
  }

  return latestLeaderboardTakeover;
}


function isAdminAnswerValid(answer = "") {
  return String(answer).toLowerCase().includes("sher");
}



// -------------------------
// BUILD PORT MAP ON STARTUP
// -------------------------
buildPortMap()
  .then((map) => {
    portMapGlobal = map;
    console.log("✅ Port map built successfully");
    console.log(portMapGlobal);
  })
  .catch((error) => {
    console.error("❌ Failed to build port map:", error);
  });

// -------------------------
// HEALTH
// -------------------------
app.get("/api/health", (req, res) => {
  return res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// -------------------------
// GAME START
// -------------------------
app.post("/api/game/start", (req, res) => {
  try {
    const { targetPorts } = req.body;

    if (!Array.isArray(targetPorts)) {
      return res.status(400).json({
        error: "targetPorts must be an array",
      });
    }

    if (targetPorts.length === 0 || targetPorts.length > 24) {
      return res.status(400).json({
        error: "targetPorts must contain 1-24 ports",
      });
    }

    const invalidPorts = targetPorts.filter(
      (portNumber) =>
        !Number.isInteger(portNumber) || portNumber < 1 || portNumber > 24
    );

    if (invalidPorts.length > 0) {
      return res.status(400).json({
        error: `Invalid port numbers: ${invalidPorts.join(
          ", "
        )}. Ports must be 1-24.`,
      });
    }

    const uniquePorts = [...new Set(targetPorts)];
    const sessionId = gameSession.startNewGame(uniquePorts);

    return res.json({
      success: true,
      sessionId,
      targetPorts: uniquePorts,
      message: `Game started with ${uniquePorts.length} target ports`,
    });
  } catch (error) {
    console.error("Error starting game:", error);
    return res.status(500).json({
      error: "Failed to start game",
      details: error.message,
    });
  }
});

// -------------------------
// GAME STATUS
// -------------------------
app.get("/api/game/status", async (req, res) => {
  try {
    if (portMapGlobal.size === 0) {
      return res.status(500).json({
        error: "Port map not initialized yet",
      });
    }

    await gameSession.refreshPortStates(portMapGlobal);

    if (gameSession.isGameActive && gameSession.checkGameComplete()) {
      gameSession.endGame();
    }

    return res.json(gameSession.getGameState());
  } catch (error) {
    console.error("Error getting game status:", error);
    return res.status(500).json({
      error: "Failed to get game status",
      details: error.message,
    });
  }
});

// -------------------------
// TOGGLE PORT
// -------------------------
app.post("/api/port/toggle/:portNumber", (req, res) => {
  try {
    const portNumber = parseInt(req.params.portNumber, 10);

    if (!Number.isInteger(portNumber) || portNumber < 1 || portNumber > 24) {
      return res.status(400).json({
        error: "Invalid port number. Must be 1-24.",
      });
    }

    const result = gameSession.togglePort(portNumber);
    const gameState = gameSession.getGameState();

    return res.json({
      success: true,
      port: result,
      gameComplete: !gameState.isGameActive && gameState.endTime !== null,
      gameState,
    });
  } catch (error) {
    console.error("Error toggling port:", error);
    return res.status(500).json({
      error: "Failed to toggle port",
      details: error.message,
    });
  }
});

// -------------------------
// SET PORT STATUS
// -------------------------
app.post("/api/port/set/:portNumber/:status", (req, res) => {
  try {
    const portNumber = parseInt(req.params.portNumber, 10);
    const targetStatus = String(req.params.status || "").toLowerCase();

    if (!Number.isInteger(portNumber) || portNumber < 1 || portNumber > 24) {
      return res.status(400).json({
        error: "Invalid port number. Must be 1-24.",
      });
    }

    if (!["up", "down"].includes(targetStatus)) {
      return res.status(400).json({
        error: 'Status must be "up" or "down"',
      });
    }

    const result = gameSession.setPortStatus(portNumber, targetStatus);
    const gameState = gameSession.getGameState();

    return res.json({
      success: true,
      port: {
        port: result.port,
        status: result.status,
        timestamp: result.timestamp,
      },
      message: result.changed
        ? `Port ${portNumber} set to ${targetStatus}`
        : `Port ${portNumber} already ${targetStatus}`,
      gameComplete: !gameState.isGameActive && gameState.endTime !== null,
      gameState,
    });
  } catch (error) {
    console.error("Error setting port status:", error);
    return res.status(500).json({
      error: "Failed to set port status",
      details: error.message,
    });
  }
});

// -------------------------
// GAME RESET
// -------------------------
app.post("/api/game/reset", (req, res) => {
  try {
    const result = gameSession.endGame();
    gameSession.reset();

    return res.json({
      success: true,
      message: "Game reset successfully",
      lastGameResult: result,
    });
  } catch (error) {
    console.error("Error resetting game:", error);
    return res.status(500).json({
      error: "Failed to reset game",
      details: error.message,
    });
  }
});

// -------------------------
// GET ALL PORTS
// -------------------------
app.get("/api/ports", (req, res) => {
  try {
    const ports = [];

    for (let i = 1; i <= 24; i += 1) {
      const portState = gameSession.portStates.get(i);

      ports.push({
        port: i,
        status: portState.status,
        isTarget: gameSession.activePorts.has(i),
        timestamp: portState.timestamp,
      });
    }

    return res.json({
      ports,
      totalPorts: 24,
      activePorts: Array.from(gameSession.activePorts),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error getting ports:", error);
    return res.status(500).json({
      error: "Failed to get ports",
      details: error.message,
    });
  }
});

// -------------------------
// SESSION INIT
// -------------------------
app.get("/api/session", (req, res) => {
  try {
    const session = getOrCreateActiveSession();

    return res.json({
      success: true,
      session,
    });
  } catch (error) {
    console.error("SESSION ERROR:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to load session",
    });
  }
});

// -------------------------
// PLAYER SCAN
// -------------------------
app.post("/api/player/scan", (req, res) => {
  try {
    const { confirmation_number } = req.body;

    if (!confirmation_number || !String(confirmation_number).trim()) {
      return res.status(400).json({
        success: false,
        message: "confirmation_number is required",
      });
    }

    const result = getOrCreatePlayerFromQR(confirmation_number);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.message || "Player not found",
      });
    }

    return res.json({
      success: true,
      message: result.message,
      player: {
        player_id: result.player.id,
        name: result.player.name,
        country: result.player.country,
        confirmation_number: result.player.confirmation_number,
        source: result.player.source,
      },
    });
  } catch (error) {
    console.error("PLAYER SCAN ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to scan player",
      error: error.message,
    });
  }
});

// -------------------------
// MANUAL PLAYER ENTRY
// -------------------------
app.post("/api/player/manual", (req, res) => {
  try {
    const { name, country, source } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({
        success: false,
        error: "name is required",
      });
    }

    // "source" lets the caller flag where this entry actually came from -
    // the kiosk's own manual-entry form still defaults to 'manual', while
    // the tablet check-in picker passes 'tablet' so admin can tell the two
    // apart later. Anything else falls back to 'manual' rather than letting
    // arbitrary values into the column.
    const allowedSources = ["manual", "tablet"];
    const resolvedSource = allowedSources.includes(source) ? source : "manual";

    const player = createManualPlayer({
      name: String(name).trim(),
      country: country ? String(country).trim() : "",
      source: resolvedSource,
    });

    return res.json({
      success: true,
      player,
    });
  } catch (error) {
    console.error("MANUAL PLAYER ERROR:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to create manual player",
    });
  }
});

// -------------------------
// ADMIN MANUAL PLAYER ENTRY
// -------------------------
app.post("/api/admin/manual-player", (req, res) => {
  try {
    const { name, country } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({
        success: false,
        message: "name is required",
      });
    }

    const result = createManualAdminPlayer(
      String(name).trim(),
      country ? String(country).trim() : ""
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message || "Manual player creation failed",
      });
    }

    return res.json({
      success: true,
      message: result.message,
      player: result.player,
    });
  } catch (error) {
    console.error("MANUAL ADMIN PLAYER ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
});

// -------------------------
// RUN START
// -------------------------
app.post("/api/run/start", (req, res) => {
  try {
    const { player_id } = req.body;

    if (!player_id) {
      return res.status(400).json({
        success: false,
        message: "player_id is required",
      });
    }

    const result = startRun(player_id);

    if (!result.success) {
      const isNotFound = result.message === "Player not found";

      return res.status(isNotFound ? 404 : 400).json({
        success: false,
        message: result.message || "Failed to start run",
      });
    }

    return res.json({
      success: true,
      message: result.message,
      run: {
        id: result.run.id,
        player_id: result.run.player_id,
        session_id: result.run.session_id,
        time_ms: result.run.time_ms,
        completed: result.run.completed,
        created_at: result.run.created_at,
      },
      player: result.player,
      session: result.session,
    });
  } catch (error) {
    console.error("RUN START ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
});

// -------------------------
// RUN COMPLETE
// -------------------------
app.post("/api/run/complete", (req, res) => {
  try {
    const { run_id, time_ms } = req.body;

    if (!run_id) {
      return res.status(400).json({
        success: false,
        message: "run_id is required",
      });
    }

    if (
      time_ms === undefined ||
      time_ms === null ||
      String(time_ms).trim() === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "time_ms is required",
      });
    }

    const numericTimeMs = Number(time_ms);

    if (!Number.isFinite(numericTimeMs) || numericTimeMs <= 0) {
      return res.status(400).json({
        success: false,
        message: "time_ms must be a positive number",
      });
    }

    const result = completeRun(run_id, numericTimeMs);

    if (!result.success) {
      let statusCode = 400;

      if (result.message === "Run not found") {
        statusCode = 404;
      } else if (result.message === "Run already completed") {
        statusCode = 409;
      }

      return res.status(statusCode).json({
        success: false,
        message: result.message,
      });
    }

    const summary = getPlayerResultSummary(result.run.player_id);
    const takeover = buildTakeoverFromSummary(summary, result.run);

    if (takeover) {
      latestLeaderboardTakeover = takeover;
    }

    return res.json({
      success: true,
      message: result.message,
      run: result.run,
      takeover,
    });
  } catch (error) {
    console.error("POST /api/run/complete error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// -------------------------
// LEADERBOARD
// -------------------------
app.get("/api/leaderboard", (req, res) => {
  try {
    const leaderboard = getBestRuns(10);

    return res.json({
      success: true,
      leaderboard,
    });
  } catch (error) {
    console.error("GET /api/leaderboard error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch leaderboard",
    });
  }
});

app.get("/api/leaderboard/takeover/latest", (req, res) => {
  try {
    return res.json({
      success: true,
      takeover: getActiveTakeover(),
    });
  } catch (error) {
    console.error("GET /api/leaderboard/takeover/latest error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch leaderboard takeover",
    });
  }
});

// -------------------------
// CLEAR LEADERBOARD DISPLAY
// -------------------------
app.post("/api/leaderboard/clear", (req, res) => {
  try {
    const newSession = clearLeaderboardDisplay();

    return res.json({
      success: true,
      message: "Leaderboard display reset successfully",
      session: newSession,
    });
  } catch (error) {
    console.error("CLEAR LEADERBOARD ERROR:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to clear leaderboard",
    });
  }
});

// -------------------------
// PLAYER RESULT
// -------------------------
app.get("/api/result/:playerId", (req, res) => {
  try {
    const { playerId } = req.params;

    if (!playerId) {
      return res.status(400).json({
        success: false,
        error: "playerId is required",
      });
    }

    const result = getPlayerResultSummary(playerId);

    if (!result.player) {
      return res.status(404).json({
        success: false,
        error: "Player result not found in current session",
      });
    }

    return res.json({
      success: true,
      session: result.session,
      player: result.player,
      leaderboard: result.leaderboard,
      totalRankedPlayers: result.totalRankedPlayers,
      isTop10: result.player.rank <= 10,
    });
  } catch (error) {
    console.error("Failed to load player result summary:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to load player result summary",
    });
  }
});

// -------------------------
// ROSTER UPLOAD
// -------------------------
app.post("/api/admin/upload-roster", upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Excel file is required",
      });
    }

    const result = uploadRosterFromExcel(req.file.buffer);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message || "Roster upload failed",
      });
    }

    return res.json({
      success: true,
      message: result.message,
      totalImported: result.totalImported,
      sheetName: result.sheetName,
    });
  } catch (error) {
    console.error("ROSTER UPLOAD ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
});

// -------------------------
// ADMIN RESET LEADERBOARD
// -------------------------
app.post("/api/admin/reset-leaderboard", (req, res) => {
  try {
    const newSession = resetLeaderboardSession();

    return res.json({
      success: true,
      message: "Leaderboard reset successfully",
      session: newSession,
    });
  } catch (error) {
    console.error("POST /api/admin/reset-leaderboard error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to reset leaderboard",
    });
  }
});
// -------------------------
// ADMIN STATUS
// -------------------------
app.get("/api/admin/status", async (req, res) => {
  try {
    const status = await getAdminStatus();

    return res.json({
      success: true,
      status,
      currentIntroVideo,
      previousIntroVideo,
      serverTime: new Date().toISOString(),
    });
  } catch (error) {
    console.error("GET /api/admin/status error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load admin status",
    });
  }
});

// -------------------------
// ADMIN SESSIONS
// -------------------------
app.get("/api/admin/sessions", async (req, res) => {
  try {
    const sessions = await getAllSessions();

    return res.json({
      success: true,
      sessions,
    });
  } catch (error) {
    console.error("GET /api/admin/sessions error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load sessions",
    });
  }
});

// -------------------------
// ADMIN PLAYERS
// -------------------------
app.get("/api/admin/players", async (req, res) => {
  try {
    const players = await getAdminPlayers();

    return res.json({
      success: true,
      players,
    });
  } catch (error) {
    console.error("GET /api/admin/players error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load players",
    });
  }
});

// -------------------------
// ADMIN RUNS
// -------------------------
app.get("/api/admin/runs", async (req, res) => {
  try {
    const runs = await getAdminRuns();

    return res.json({
      success: true,
      runs,
    });
  } catch (error) {
    console.error("GET /api/admin/runs error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load runs",
    });
  }
});

// -------------------------
// ADMIN NEW SESSION
// -------------------------
app.post("/api/admin/session/new", (req, res) => {
  try {
    const requestedName = String(req.body?.name || "").trim();
    const session = resetLeaderboardSession(requestedName || null);

    latestLeaderboardTakeover = null;

    return res.json({
      success: true,
      message: "New session started successfully",
      session,
    });
  } catch (error) {
    console.error("POST /api/admin/session/new error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to start new session",
    });
  }
});

// -------------------------
// ADMIN ROSTER UPLOAD
// -------------------------
app.post("/api/admin/roster/upload", adminRosterUpload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Excel file is required",
      });
    }

    const buffer = fs.readFileSync(req.file.path);
    const result = uploadRosterFromExcel(buffer);

    try {
      fs.unlinkSync(req.file.path);
    } catch (cleanupError) {
      console.warn("Failed to delete temp roster file:", cleanupError.message);
    }

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message || "Roster upload failed",
      });
    }

    const session = resetLeaderboardSession();
    latestLeaderboardTakeover = null;

    return res.json({
      success: true,
      message: "Roster uploaded successfully and new session started",
      totalImported: result.totalImported,
      sheetName: result.sheetName,
      session,
    });
  } catch (error) {
    console.error("POST /api/admin/roster/upload error:", error);

    if (req.file?.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (_) {}
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Roster upload failed",
    });
  }
});

// -------------------------
// ADMIN UPDATE PLAYER
// -------------------------
app.patch("/api/admin/player/:id", async (req, res) => {
  try {
    const playerId = Number(req.params.id);
    const { name, country } = req.body || {};

    if (!Number.isInteger(playerId) || playerId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid player id",
      });
    }

    if (!name || !String(name).trim()) {
      return res.status(400).json({
        success: false,
        message: "Player name is required",
      });
    }

    const player = await updatePlayerAdmin(playerId, {
      name: String(name).trim(),
      country: String(country || "").trim(),
    });

    if (!player) {
      return res.status(404).json({
        success: false,
        message: "Player not found",
      });
    }

    return res.json({
      success: true,
      message: "Player updated successfully",
      player,
    });
  } catch (error) {
    console.error("PATCH /api/admin/player/:id error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update player",
    });
  }
});

// -------------------------
// ADMIN UPDATE RUN
// -------------------------
app.patch("/api/admin/run/:id", async (req, res) => {
  try {
    const runId = Number(req.params.id);
    const { time_ms } = req.body || {};

    if (!Number.isInteger(runId) || runId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid run id",
      });
    }

    if (!Number.isFinite(Number(time_ms)) || Number(time_ms) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid time_ms is required",
      });
    }

    const run = await updateRunTimeAdmin(runId, Number(time_ms));

    if (!run) {
      return res.status(404).json({
        success: false,
        message: "Run not found",
      });
    }

    return res.json({
      success: true,
      message: "Run updated successfully",
      run,
    });
  } catch (error) {
    console.error("PATCH /api/admin/run/:id error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update run",
    });
  }
});

// -------------------------
// ADMIN INTRO VIDEO
// -------------------------
app.get("/api/admin/intro/current", (req, res) => {
  return res.json({
    success: true,
    currentIntroVideo,
    previousIntroVideo,
  });
});

app.post("/api/admin/intro/upload", adminVideoUpload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Video file is required",
      });
    }

    previousIntroVideo = currentIntroVideo;
    currentIntroVideo = `/uploads/intro/${req.file.filename}`;

    return res.json({
      success: true,
      message: "Intro video uploaded successfully",
      currentIntroVideo,
      previousIntroVideo,
    });
  } catch (error) {
    console.error("POST /api/admin/intro/upload error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to upload intro video",
    });
  }
});

app.post("/api/admin/intro/revert", (req, res) => {
  try {
    const temp = currentIntroVideo;
    currentIntroVideo = previousIntroVideo;
    previousIntroVideo = temp;

    return res.json({
      success: true,
      message: "Intro video reverted successfully",
      currentIntroVideo,
      previousIntroVideo,
    });
  } catch (error) {
    console.error("POST /api/admin/intro/revert error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to revert intro video",
    });
  }
});

// -------------------------
// SCENARIOS - LOAD GAME
// -------------------------
app.post("/api/scenarios/load-game", (req, res) => {
  try {
    const { run_id } = req.body;

    if (!run_id) {
      return res.status(400).json({
        success: false,
        message: "run_id is required",
      });
    }

    // Check if scenarios already exist for this run
    const existingScenarios = getScenarioRunsByRunId(run_id);
    if (existingScenarios.length > 0) {
      console.log(`Scenarios already loaded for run ${run_id}, returning existing scenarios`);
      // Return existing scenarios
      const scenarioRunsWithDetails = existingScenarios.map(sr => ({
        ...sr,
        scenario: getScenarioById(sr.scenario_id),
      }));
      return res.json({
        success: true,
        message: "Game scenarios loaded successfully",
        scenarios: scenarioRunsWithDetails,
      });
    }

    const scenarios = getRandomScenariosByCategory();

    if (scenarios.length !== 4) {
      return res.status(500).json({
        success: false,
        message: "Failed to load all required scenarios",
      });
    }

    const scenarioRuns = [];

    for (let order = 0; order < scenarios.length; order++) {
      const scenarioRun = createScenarioRun(run_id, scenarios[order].id, order + 1);
      scenarioRuns.push({
        ...scenarioRun,
        scenario: scenarios[order],
      });
    }

    return res.json({
      success: true,
      message: "Game scenarios loaded successfully",
      scenarios: scenarioRuns,
    });
  } catch (error) {
    console.error("POST /api/scenarios/load-game error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load game scenarios",
    });
  }
});

// -------------------------
// SCENARIOS - GET CURRENT
// -------------------------
app.get("/api/scenarios/current/:runId", (req, res) => {
  try {
    const { runId } = req.params;

    if (!runId) {
      return res.status(400).json({
        success: false,
        message: "runId is required",
      });
    }

    const scenarioRuns = getScenarioRunsByRunId(runId);

    if (scenarioRuns.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No scenarios found for this run",
      });
    }

    const pendingScenario = scenarioRuns.find((sr) => sr.result === "pending");

    if (!pendingScenario) {
      return res.json({
        success: true,
        message: "All scenarios completed",
        allCompleted: true,
        scenarioRuns,
      });
    }

    const scenario = getScenarioById(pendingScenario.scenario_id);

    return res.json({
      success: true,
      scenarioRun: pendingScenario,
      scenario,
      progress: {
        current: pendingScenario.scenario_order,
        total: scenarioRuns.length,
      },
    });
  } catch (error) {
    console.error("GET /api/scenarios/current error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to get current scenario",
    });
  }
});

// -------------------------
// SCENARIOS - SUBMIT RESULT
// -------------------------
app.post("/api/scenarios/submit", (req, res) => {
  try {
    const { scenario_run_id, plugged_ports, time_ms, run_id } = req.body;

    if (!scenario_run_id || !Array.isArray(plugged_ports) || !time_ms || !run_id) {
      return res.status(400).json({
        success: false,
        message: "scenario_run_id, plugged_ports, time_ms, and run_id are required",
      });
    }

    const scenarioRun = getScenarioRunsByRunId(run_id).find(
      (sr) => sr.id === scenario_run_id
    );

    if (!scenarioRun) {
      return res.status(404).json({
        success: false,
        message: "Scenario run not found",
      });
    }

    const requiredPorts = JSON.parse(scenarioRun.required_ports);
    const sortedRequired = requiredPorts.sort((a, b) => a - b);
    const sortedPlugged = plugged_ports.sort((a, b) => a - b);

    const isCorrect =
      sortedRequired.length === sortedPlugged.length &&
      sortedRequired.every((port, idx) => port === sortedPlugged[idx]);

    let penaltyApplied = 0;

    if (!isCorrect) {
      penaltyApplied = 1;
      updateRunWithPenalty(run_id, 3000);
    }

    const result = isCorrect ? "success" : "failure";
    const updatedScenarioRun = completeScenarioRun(
      scenario_run_id,
      result,
      time_ms,
      penaltyApplied
    );

    const scenarioRuns = getScenarioRunsByRunId(run_id);
    const nextPendingScenario = scenarioRuns.find((sr) => sr.result === "pending");

    return res.json({
      success: true,
      result: isCorrect ? "success" : "failure",
      message: isCorrect
        ? "Scenario completed successfully!"
        : "Incorrect ports. Moving to next scenario...",
      scenarioRun: updatedScenarioRun,
      penaltyApplied,
      nextScenario: nextPendingScenario || null,
      allCompleted: !nextPendingScenario,
    });
  } catch (error) {
    console.error("POST /api/scenarios/submit error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to submit scenario result",
    });
  }
});

// -------------------------
// ERROR HANDLER
// -------------------------
app.use((error, req, res, next) => {
  console.error("Unhandled error:", error);
  return res.status(500).json({
    error: "Internal server error",
    details: error.message,
  });
});

// -------------------------
// 404 HANDLER
// -------------------------
app.use((req, res) => {
  return res.status(404).json({
    error: "Endpoint not found",
    availableEndpoints: [
      "GET /api/health",
      "POST /api/game/start",
      "GET /api/game/status",
      "POST /api/port/toggle/:portNumber",
      "POST /api/port/set/:portNumber/:status",
      "POST /api/game/reset",
      "GET /api/ports",
      "GET /api/session",
      "POST /api/player/scan",
      "POST /api/player/manual",
      "POST /api/admin/manual-player",
      "POST /api/run/start",
      "POST /api/run/complete",
      "GET /api/leaderboard",
      "GET /api/leaderboard/takeover/latest",
      "POST /api/leaderboard/clear",
      "GET /api/result/:playerId",
      "POST /api/admin/upload-roster",
      "POST /api/admin/reset-leaderboard",
      "GET /api/admin/status",
"GET /api/admin/sessions",
"GET /api/admin/players",
"GET /api/admin/runs",
"POST /api/admin/session/new",
"POST /api/admin/roster/upload",
"PATCH /api/admin/player/:id",
"PATCH /api/admin/run/:id",
"GET /api/admin/intro/current",
"POST /api/admin/intro/upload",
"POST /api/admin/intro/revert",
      "POST /api/scenarios/load-game",
      "GET /api/scenarios/current/:runId",
      "POST /api/scenarios/submit",
    ],
  });
});

app.listen(port, () => {
  console.log(`🕹️ Game server listening at http://localhost:${port}`);
  console.log(`📡 API Base URL: http://localhost:${port}/api`);
  console.log("📋 Available leaderboard extras:");
  console.log("   GET  /api/leaderboard/takeover/latest - Get latest active takeover");
console.log("   GET  /api/admin/status - Admin status");
console.log("   GET  /api/admin/sessions - Admin sessions");
console.log("   GET  /api/admin/players - Admin players");
console.log("   GET  /api/admin/runs - Admin runs");
console.log("   POST /api/admin/session/new - Create new admin session");
console.log("   POST /api/admin/roster/upload - Upload roster file");
console.log("   PATCH /api/admin/player/:id - Update player");
console.log("   PATCH /api/admin/run/:id - Update run");
console.log("   GET  /api/admin/intro/current - Get current intro video");
console.log("   POST /api/admin/intro/upload - Upload intro video");
console.log("   POST /api/admin/intro/revert - Revert intro video");

  // Seed scenarios after server starts
  seedScenarios();
});

module.exports = app;