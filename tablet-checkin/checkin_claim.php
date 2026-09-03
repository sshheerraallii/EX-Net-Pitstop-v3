<?php
// Called by the kiosk right after it successfully creates the local player
// from a check-in, so that entry stops showing up in the live list (for
// this kiosk and any other kiosk polling the same relay).
require __DIR__ . '/config.php';
checkin_cors();
checkin_require_key();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'POST only']);
    exit;
}

$body = checkin_json_body();
$id = (int)($body['id'] ?? 0);

if ($id <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'valid id is required']);
    exit;
}

try {
    $pdo = checkin_db();
    $stmt = $pdo->prepare('UPDATE checkins SET status = "claimed", claimed_at = NOW() WHERE id = ? AND status = "pending"');
    $stmt->execute([$id]);

    // rowCount() is 0 if someone else (another kiosk, or a double-tap)
    // already claimed it first - not an error, just tells the caller they
    // lost the race so they don't double-start a run for the same person.
    echo json_encode(['success' => true, 'claimed' => $stmt->rowCount() > 0]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'database error']);
}
