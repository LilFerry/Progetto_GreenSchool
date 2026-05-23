<?php
// =========================================================================
// API: SCARICA ENERGIA DALL'ACCUMULATORE
// POST JSON: id_accumulatore, quantita_kwh (obbligatori)
// =========================================================================

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/includes/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Metodo non consentito. Usare POST.', 405);
}
require_once __DIR__ . '/includes/sessione_helpers.php';

$data = read_json_body();
$idAccumulatore = trim((string) ($data['id_accumulatore'] ?? ''));
$kwh = isset($data['quantita_kwh']) ? (float) $data['quantita_kwh'] : null;

if ($idAccumulatore === '') {
    json_error('Campo id_accumulatore obbligatorio', 400);
}
if ($kwh === null || $kwh < 0) {
    json_error('Campo quantita_kwh obbligatorio e >= 0', 400);
}

try {
    $pdo = db_connect();
    $pdo->beginTransaction();
    $acc = scarica_accumulatore($pdo, $idAccumulatore, $kwh);
    if (!$acc) {
        $pdo->rollBack();
        json_error('Accumulatore non trovato', 404);
    }
    $pdo->commit();

    json_response([
        'status' => 'success',
        'message' => 'Energia scalata dall\'accumulatore',
        'data' => ['accumulatore' => $acc],
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    json_error('Errore scarico accumulatore: ' . $e->getMessage(), 500);
}
