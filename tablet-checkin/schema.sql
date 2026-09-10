-- Run this once against the MySQL database you created in Hostinger's
-- hPanel (Databases -> MySQL Databases -> Enter phpMyAdmin -> SQL tab ->
-- paste this in -> Go). Creates the one table this whole relay needs.

CREATE TABLE IF NOT EXISTS checkins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  country VARCHAR(120) DEFAULT NULL,
  status ENUM('pending', 'claimed') NOT NULL DEFAULT 'pending',
  start_at DATETIME DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  claimed_at DATETIME DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_checkins_status_created ON checkins (status, created_at);

-- Already deployed the table before this update? Run this one line instead
-- of the CREATE above (phpMyAdmin -> SQL tab):
--   ALTER TABLE checkins ADD COLUMN start_at DATETIME DEFAULT NULL AFTER status;
