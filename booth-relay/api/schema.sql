-- Booth relay schema.
--
-- Run once against the MySQL database in Hostinger's hPanel
-- (Databases -> MySQL Databases -> Enter phpMyAdmin -> SQL tab -> paste -> Go).
-- Safe to run against the same database the check-in relay uses; no table
-- names clash with `checkins`.

-- One row per show day (or per reset). The board only ever displays the
-- active session, so retiring a session clears the board without deleting
-- anything - same semantics as the kiosk's own local sessions table.
CREATE TABLE IF NOT EXISTS relay_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) DEFAULT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  -- Set when the admin page asks for a new session; cleared once the kiosk
  -- has polled, reset its own local leaderboard and acknowledged. This is
  -- how the web page reaches the booth machine without the booth machine
  -- ever accepting inbound connections.
  reset_requested TINYINT(1) NOT NULL DEFAULT 0,
  reset_acked_at DATETIME DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- One row per finished run, pushed up by the kiosk.
CREATE TABLE IF NOT EXISTS relay_results (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  -- The kiosk's own run id. Unique so a retried push after a timeout
  -- updates the row instead of adding a duplicate to the board.
  run_uid VARCHAR(64) NOT NULL,
  name VARCHAR(120) NOT NULL,
  country VARCHAR(120) DEFAULT NULL,
  time_ms INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_run_uid (run_uid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_results_session_time ON relay_results (session_id, time_ms);

-- Start with one open session so the board works the moment it's deployed,
-- before anyone touches the admin page.
INSERT INTO relay_sessions (name, is_active) SELECT 'Session 1', 1
  WHERE NOT EXISTS (SELECT 1 FROM relay_sessions WHERE is_active = 1);
