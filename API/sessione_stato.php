<?php
// =========================================================================
// API: STATO SESSIONE (polling da app)
// GET ?id_sessione=...
// =========================================================================

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/includes/db.php';
require_once __DIR__ . '/includes/sessione_helpers.php';
require_once __DIR__ . '/includes/simulatore.php';



$idSessione = trim((string) ($_GET['id_sessione'] ?? ''));
if ($idSessione === '') {
    json_error('Parametro id_sessione obbligatorio', 400);
}

try {
    $pdo = db_connect();

    $stmt = $pdo->prepare(
        "SELECT s.*, p.id_stazione, p.identificativo_fisico, p.tipo_veicolo
         FROM sessioni_ricarica s
         JOIN punti_ricarica p ON p.id_punto = s.id_punto
         WHERE s.id_sessione = :id"
    );
    $stmt->execute(['id' => $idSessione]);
    $sessione = $stmt->fetch();
    if (!$sessione) {
        json_error('Sessione non trovata', 404);
    }

    $live = null;
    if ($sessione['data_fine'] === null) {
        $sim = simulatore_stato($idSessione);
        if ($sim['ok']) {
            $live = $sim['body']['data'] ?? null;
        }
    }

    $accRow = seleziona_accumulatore($pdo, $sessione['id_stazione'], $sessione['tipo_veicolo']);
    $acc = $accRow ? formatta_accumulatore($accRow) : null;

    $kwhLive = null;
    if (is_array($live) && isset($live['kwh_erogati'])) {
        $kwhLive = (float) $live['kwh_erogati'];
    } elseif ($sessione['quantita_kwh'] !== null) {
        $kwhLive = (float) $sessione['quantita_kwh'];
    }

    json_response([
        'status' => 'success',
        'data' => [
            'sessione' => [
                'id_sessione' => $sessione['id_sessione'],
                'id_punto' => $sessione['id_punto'],
                'data_inizio' => $sessione['data_inizio'],
                'data_fine' => $sessione['data_fine'],
                'quantita_kwh' => $kwhLive,
                'costo_totale' => (float) $sessione['costo_totale'],
                'stato' => $sessione['data_fine'] ? 'terminata' : 'in_corso',
                'identificativo_colonnina' => $sessione['identificativo_fisico'],
                'durata_secondi' => is_array($live) && isset($live['durata_secondi'])
                    ? (int) $live['durata_secondi']
                    : null,
            ],
            'live' => $live,
            'accumulatore' => $acc,
        ],
    ]);

} catch (Throwable $e) {
    json_error('Errore lettura stato: ' . $e->getMessage(), 500);
}
