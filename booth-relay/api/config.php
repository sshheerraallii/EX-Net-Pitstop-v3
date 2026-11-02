<?php
// =============================================================================
// Booth relay - config
//
// The spectator leaderboard and the session admin page both live on the web,
// but the game's results live in SQLite on the booth machine, which nothing
// on the internet can reach. So this is the tablet check-in relay run in
// reverse: the kiosk PUSHES finished runs up here, and the public board reads
// them from here. The kiosk also polls here for a "start a new session"
// request, so the admin page never needs to reach into the booth.
//
// EDIT THE DB_* VALUES BELOW after creating a MySQL database in Hostinger's
// hPanel (Databases -> MySQL Databases -> Create). Use the SAME database the
// check-in relay uses if you already made one - these tables don't clash.
// =============================================================================

define('DB_HOST', 'localhost'); // Hostinger MySQL is almost always 'localhost'
define('DB_NAME', 'REPLACE_ME_DB_NAME');
define('DB_USER', 'REPLACE_ME_DB_USER');
define('DB_PASS', 'REPLACE_ME_DB_PASSWORD');

// Shared secret for anything that WRITES or that the kiosk calls. The public
// leaderboard page does not send it - that endpoint is read-only on purpose,
// so a screen at the booth needs no secret baked into it.
//
// Must match RELAY_API_KEY in the kiosk's .env and the key in
// sessions/config.js. Change it to your own long random string before
// deploying.
define('RELAY_API_KEY', 'REPLACE_ME_WITH_A_LONG_RANDOM_STRING');

// Rows older than this are hidden from the public board even if nobody ever
// retired their session. Stops an abandoned session showing stale times
// forever if staff forget the start-of-day reset.
define('RELAY_MAX_AGE_HOURS', 36);

// How many rows the public board returns.
define('RELAY_BOARD_SIZE', 20);

function relay_db() {
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

function relay_cors() {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, X-Relay-Key');
    header('Content-Type: application/json');
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

function relay_require_key() {
    $sent = $_SERVER['HTTP_X_RELAY_KEY'] ?? '';
    if (!is_string($sent) || $sent === '' || !hash_equals(RELAY_API_KEY, $sent)) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'invalid or missing key']);
        exit;
    }
}

function relay_json_body() {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

// The session the board is currently showing. Created by the admin page; the
// kiosk stamps every pushed run with whatever id it last acknowledged.
function relay_active_session($pdo) {
    $stmt = $pdo->query(
        'SELECT id, name, created_at FROM relay_sessions WHERE is_active = 1 ORDER BY id DESC LIMIT 1'
    );
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return $row ?: null;
}
