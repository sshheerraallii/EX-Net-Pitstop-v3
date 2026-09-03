<?php
// =============================================================================
// Tablet check-in relay - config
//
// This is the shared "mailbox" between the staff tablet (its own internet
// connection) and the kiosk (its own, separate internet connection). The
// tablet writes check-ins here; the kiosk polls this same place to read
// them. Neither device talks to the other directly.
//
// EDIT THE THREE DB_* VALUES BELOW after creating a MySQL database in
// Hostinger's hPanel (hPanel -> Databases -> MySQL Databases -> Create).
// Hostinger will show you the database name, username and password there -
// copy them in exactly.
// =============================================================================

define('DB_HOST', 'localhost'); // Hostinger MySQL is almost always 'localhost'
define('DB_NAME', 'REPLACE_ME_DB_NAME');
define('DB_USER', 'REPLACE_ME_DB_USER');
define('DB_PASS', 'REPLACE_ME_DB_PASSWORD');

// A shared secret so random internet traffic can't write fake check-ins or
// read the list. This is NOT a login system - it's one fixed string that
// both the tablet page (tablet-checkin/config.js) and the kiosk
// (real-game/frontend/src/config/tabletCheckin.js) must send on every
// request. Change this to your own random string before you deploy, and
// make sure the SAME string is set in both of those other two files.
define('CHECKIN_API_KEY', 'REPLACE_ME_WITH_A_LONG_RANDOM_STRING');

// A pending check-in older than this many minutes stops showing up in the
// kiosk's list (it's almost certainly a no-show or a mistaken entry by
// then). It isn't deleted, just hidden - claimed check-ins are excluded
// from the list regardless of age.
define('CHECKIN_STALE_MINUTES', 180);

function checkin_db() {
    static $pdo = null;
    if ($pdo === null) {
        $pdo = new PDO(
            'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
            DB_USER,
            DB_PASS,
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
        );
    }
    return $pdo;
}

function checkin_cors() {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, X-Checkin-Key');
    header('Content-Type: application/json');
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

function checkin_require_key() {
    $sent = $_SERVER['HTTP_X_CHECKIN_KEY'] ?? '';
    if (!is_string($sent) || $sent === '' || !hash_equals(CHECKIN_API_KEY, $sent)) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'invalid or missing key']);
        exit;
    }
}

function checkin_json_body() {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}
