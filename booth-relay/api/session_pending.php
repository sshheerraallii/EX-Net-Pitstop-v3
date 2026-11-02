<?php
// Kiosk -> relay, polled. Answers two questions in one call: which session
// should pushed results be stamped with, and is there a reset waiting.
require_once __DIR__ . '/config.php';
relay_cors();
relay_require_key();

try {
    $pdo = relay_db();
    $session = relay_active_session($pdo);
    if (!$session) {
        echo json_encode(['success' => true, 'session' => null, 'reset_requested' => false]);
        exit;
    }

    $stmt = $pdo->prepare('SELECT reset_requested FROM relay_sessions WHERE id = :id');
    $stmt->execute([':id' => (int) $session['id']]);
    $pending = (int) $stmt->fetchColumn() === 1;

    echo json_encode([
        'success' => true,
        'session' => ['id' => (int) $session['id'], 'name' => $session['name']],
        'reset_requested' => $pending,
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'database error']);
}
