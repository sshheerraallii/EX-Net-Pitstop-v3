<?php
// Kiosk -> relay. "I saw the reset request, my local leaderboard is now a
// fresh session." Clears the flag so the kiosk doesn't reset itself again on
// the next poll.
require_once __DIR__ . '/config.php';
relay_cors();
relay_require_key();

$body = relay_json_body();
$sessionId = isset($body['session_id']) ? (int) $body['session_id'] : 0;

if ($sessionId <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'session_id is required']);
    exit;
}

try {
    $pdo = relay_db();
    $stmt = $pdo->prepare(
        'UPDATE relay_sessions
            SET reset_requested = 0, reset_acked_at = NOW()
          WHERE id = :id'
    );
    $stmt->execute([':id' => $sessionId]);
    echo json_encode(['success' => true]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'database error']);
}
