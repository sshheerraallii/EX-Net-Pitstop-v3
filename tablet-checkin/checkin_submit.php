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

try {
    $pdo = checkin_db();
    $stmt = $pdo->prepare('INSERT INTO checkins (name, country, status) VALUES (?, ?, "pending")');
    $stmt->execute([$name, $country !== '' ? $country : null]);
    $id = (int)$pdo->lastInsertId();

    echo json_encode([
        'success' => true,
        'checkin' => ['id' => $id, 'name' => $name, 'country' => $country],
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'database error']);
}
