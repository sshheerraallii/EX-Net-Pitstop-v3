//databse.js

const path = require("path");
const Database = require("better-sqlite3");

const dbPath = path.join(__dirname, "pitstop.db");
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    country TEXT,
    confirmation_number TEXT UNIQUE,
    source TEXT NOT NULL DEFAULT 'manual',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS roster (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    invitee_status TEXT,
    country TEXT,
    confirmation_number TEXT UNIQUE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER,
    session_id INTEGER,
    time_ms INTEGER,
    penalty_ms INTEGER NOT NULL DEFAULT 0,
    completed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES players(id),
    FOREIGN KEY (session_id) REFERENCES sessions(id)
  );

  CREATE TABLE IF NOT EXISTS scenarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    variant INTEGER NOT NULL,
    agent_message TEXT NOT NULL,
    required_ports TEXT NOT NULL,
    success_message TEXT NOT NULL,
    background_image TEXT NOT NULL,
    success_image TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS scenario_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id INTEGER NOT NULL,
    scenario_id INTEGER NOT NULL,
    scenario_order INTEGER NOT NULL,
    result TEXT NOT NULL,
    time_ms INTEGER NOT NULL DEFAULT 0,
    penalty_applied INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (run_id) REFERENCES runs(id),
    FOREIGN KEY (scenario_id) REFERENCES scenarios(id)
  );
`);

db.prepare(`
  CREATE INDEX IF NOT EXISTS idx_roster_confirmation_number
  ON roster (confirmation_number)
`).run();

db.prepare(`
  CREATE INDEX IF NOT EXISTS idx_scenarios_category
  ON scenarios (category)
`).run();

db.prepare(`
  CREATE INDEX IF NOT EXISTS idx_scenario_runs_run_id
  ON scenario_runs (run_id)
`).run();

db.prepare(`
  CREATE INDEX IF NOT EXISTS idx_scenario_runs_scenario_id
  ON scenario_runs (scenario_id)
`).run();

module.exports = db;