<?php
// Called by the staff tablet when they submit the check-in form.
require __DIR__ . '/config.php';
checkin_cors();
checkin_require_key();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'POST only']);
    exit;
}

$body = checkin_json_body();
$name = trim((string)($body['name'] ?? ''));
$country = trim((string)($body['country'] ?? ''));

if ($name === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'name is required']);
    exit;
}

// Hard cap so a pasted essay can't blow past the column width.
if (strlen($name) > 120) {
    $name = substr($name, 0, 120);
}
if (strlen($country) > 120) {
    $country = substr($country, 0, 120);
}

$countdown = defined('CHECKIN_COUNTDOWN_SECONDS') ? (int)CHECKIN_COUNTDOWN_SECONDS : 20;

try {
    $pdo = checkin_db();
    // start_at is the shared moment the tablet and the kiosk both count down
    // to, set from the DB server's clock so the two stay in sync.
    $stmt = $pdo->prepare(
        'INSERT INTO checkins (name, country, status, start_at)
         VALUES (?, ?, "pending", DATE_ADD(NOW(), INTERVAL ? SECOND))'
    );
    $stmt->execute([$name, $country !== '' ? $country : null, $countdown]);
    $id = (int)$pdo->lastInsertId();

    $row = $pdo->prepare('SELECT start_at FROM checkins WHERE id = ?');
    $row->execute([$id]);
    $startAt = $row->fetchColumn();

    echo json_encode([
        'success' => true,
        'checkin' => [
            'id' => $id,
            'name' => $name,
            'country' => $country,
            'start_at' => $startAt,
        ],
        'countdown_seconds' => $countdown,
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'database error']);
}
