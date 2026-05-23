<?php
// =========================================================================
// API: SALVA CHIUSURA SESSIONE SU sessioni_ricarica
// POST JSON: id_sessione, quantita_kwh, costo_totale (opz.), id_accumulatore (opz.)
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
$idSessione = trim((string) ($data['id_sessione'] ?? ''));
$kwh = isset($data['quantita_kwh']) ? (float) $data['quantita_kwh'] : null;
$costo = isset($data['costo_totale']) ? (float) $data['costo_totale'] : null;
$idAccumulatore = isset($data['id_accumulatore']) ? trim((string) $data['id_accumulatore']) : null;

if ($idSessione === '') {
    json_error('Campo id_sessione obbligatorio', 400);
}
if ($kwh === null || $kwh < 0) {
    json_error('Campo quantita_kwh obbligatorio e >= 0', 400);
}

try {
    $pdo = db_connect();
    $pdo->beginTransaction();

    if ($costo === null) {
        $stmt = $pdo->prepare(
            "SELECT p.tariffa_predefinita FROM sessioni_ricarica s
             JOIN punti_ricarica p ON p.id_punto = s.id_punto
             WHERE s.id_sessione = :id"
        );
        $stmt->execute(['id' => $idSessione]);
        $row = $stmt->fetch();
        $tariffa = $row ? (float) ($row['tariffa_predefinita'] ?? 0) : 0.0;
        $costo = round($kwh * $tariffa, 2);
    }

    $risultato = salva_fine_sessione($pdo, $idSessione, $kwh, $costo, $idAccumulatore ?: null);
    $pdo->commit();

    json_response([
        'status' => 'success',
        'message' => 'Sessione salvata su database',
        'data' => $risultato,
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    json_error('Errore salvataggio sessione: ' . $e->getMessage(), 500);
}
