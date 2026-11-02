<?php
// Admin page -> relay. Retires the current session, opens a new one, and
// flags that the kiosk should reset its own local leaderboard to match.
//
// The flag is the whole point: the booth machine sits behind whatever
// network the venue gives it and accepts no inbound connections, so the only
// way a web page can reach it is to leave a message the kiosk picks up on
// its own schedule.
require_once __DIR__ . '/config.php';
relay_cors();
relay_require_key();

$body = relay_json_body();
$name = isset($body['name']) ? trim((string) $body['name']) : '';

try {
    $pdo = relay_db();
    $pdo->beginTransaction();
    $pdo->exec('UPDATE relay_sessions SET is_active = 0 WHERE is_active = 1');

    if ($name === '') {
        $name = 'Session ' . gmdate('Y-m-d H:i');
    }

    $stmt = $pdo->prepare(
        'INSERT INTO relay_sessions (name, is_active, reset_requested) VALUES (:name, 1, 1)'
    );
    $stmt->execute([':name' => substr($name, 0, 120)]);
    $id = (int) $pdo->lastInsertId();
    $pdo->commit();

    echo json_encode([
        'success' => true,
        'session' => ['id' => $id, 'name' => $name, 'reset_requested' => true],
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'database error']);
}
