<?php
// Public read for the spectator board. Deliberately NOT key-protected: the
// board is a display with no secrets, and baking a key into a page anyone
// can view source on would be security theatre. It exposes only what the
// board shows - name, country, time.
require_once __DIR__ . '/config.php';
relay_cors();

try {
    $pdo = relay_db();
    $session = relay_active_session($pdo);
    if (!$session) {
        echo json_encode(['success' => true, 'session' => null, 'leaderboard' => []]);
        exit;
    }

    $stmt = $pdo->prepare(
        'SELECT run_uid, name, country, time_ms, created_at
           FROM relay_results
          WHERE session_id = :session_id
            AND created_at >= (NOW() - INTERVAL :max_age HOUR)
       ORDER BY time_ms ASC, created_at ASC
          LIMIT :board_size'
    );
    $stmt->bindValue(':session_id', (int) $session['id'], PDO::PARAM_INT);
    $stmt->bindValue(':max_age', RELAY_MAX_AGE_HOURS, PDO::PARAM_INT);
    $stmt->bindValue(':board_size', RELAY_BOARD_SIZE, PDO::PARAM_INT);
    $stmt->execute();

    echo json_encode([
        'success' => true,
        'session' => ['id' => (int) $session['id'], 'name' => $session['name']],
        'leaderboard' => $stmt->fetchAll(PDO::FETCH_ASSOC),
        'server_time' => gmdate('c'),
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'database error']);
}
