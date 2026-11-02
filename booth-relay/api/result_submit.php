<?php
// Kiosk -> relay. Called once per finished run, retried by the kiosk until
// it gets a 2xx, so this has to be idempotent: the same run_uid pushed twice
// updates the existing row rather than doubling it on the board.
require_once __DIR__ . '/config.php';
relay_cors();
relay_require_key();

$body = relay_json_body();
$runUid = isset($body['run_uid']) ? trim((string) $body['run_uid']) : '';
$name = isset($body['name']) ? trim((string) $body['name']) : '';
$country = isset($body['country']) && $body['country'] !== '' ? trim((string) $body['country']) : null;
$timeMs = isset($body['time_ms']) ? (int) $body['time_ms'] : 0;

if ($runUid === '' || $name === '' || $timeMs <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'run_uid, name and a positive time_ms are required']);
    exit;
}

try {
    $pdo = relay_db();
    $session = relay_active_session($pdo);
    if (!$session) {
        http_response_code(409);
        echo json_encode(['success' => false, 'error' => 'no active session']);
        exit;
    }

    $stmt = $pdo->prepare(
        'INSERT INTO relay_results (session_id, run_uid, name, country, time_ms)
         VALUES (:session_id, :run_uid, :name, :country, :time_ms)
         ON DUPLICATE KEY UPDATE
           session_id = VALUES(session_id),
           name = VALUES(name),
           country = VALUES(country),
           time_ms = VALUES(time_ms)'
    );
    $stmt->execute([
        ':session_id' => (int) $session['id'],
        ':run_uid' => substr($runUid, 0, 64),
        ':name' => substr($name, 0, 120),
        ':country' => $country !== null ? substr($country, 0, 120) : null,
        ':time_ms' => $timeMs,
    ]);

    echo json_encode(['success' => true, 'session_id' => (int) $session['id']]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'database error']);
}
