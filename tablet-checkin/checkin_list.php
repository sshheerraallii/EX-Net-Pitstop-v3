<?php
// Polled by the kiosk to show the live list of people the tablet has
// checked in but nobody has picked up on the kiosk yet.
require __DIR__ . '/config.php';
checkin_cors();
checkin_require_key();

try {
    $pdo = checkin_db();
    $stmt = $pdo->prepare(
        'SELECT id, name, country, created_at FROM checkins
         WHERE status = "pending" AND created_at >= (NOW() - INTERVAL ? MINUTE)
         ORDER BY created_at DESC
         LIMIT 50'
    );
    $stmt->execute([CHECKIN_STALE_MINUTES]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['success' => true, 'checkins' => $rows]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'database error']);
}
