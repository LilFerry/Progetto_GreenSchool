<?php
// GET ?id_stazione=...&id_accumulatore=... (opzionale)

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/includes/db.php';
require_once __DIR__ . '/includes/sessione_helpers.php';
require_once __DIR__ . '/includes/colonnina_helpers.php';

$idStazione = trim((string) ($_GET['id_stazione'] ?? ''));
$idAccumulatore = trim((string) ($_GET['id_accumulatore'] ?? ''));

if ($idStazione === '') {
    json_error('Parametro id_stazione obbligatorio', 400);
}

try {
    $pdo = db_connect();

    if ($idAccumulatore !== '') {
        $stmt = $pdo->prepare(
            'SELECT id_accumulatore, id_stazione FROM accumulatori_stazione WHERE id_accumulatore = :id'
        );
        $stmt->execute(['id' => $idAccumulatore]);
        $acc = $stmt->fetch();
        if (!$acc || $acc['id_stazione'] !== $idStazione) {
            json_error('Accumulatore non appartiene a questa stazione', 404);
        }
    }

    $sqlPunti = "
        SELECT p.id_punto, p.identificativo_fisico, p.tipo_veicolo, p.tipo_connettore,
               p.potenza_max_kw, p.tariffa_predefinita, p.stato_hardware,
               s.id_sessione, s.data_inizio AS occupata_da,
               TIMESTAMPDIFF(MINUTE, s.data_inizio, NOW()) AS minuti_trascorsi
        FROM punti_ricarica p
        LEFT JOIN sessioni_ricarica s ON s.id_punto = p.id_punto AND s.data_fine IS NULL
        WHERE p.id_stazione = :stazione";
    $paramsPunti = ['stazione' => $idStazione];
    if ($idAccumulatore !== '') {
        $sqlPunti .= ' AND p.id_accumulatore = :acc';
        $paramsPunti['acc'] = $idAccumulatore;
    }
    $sqlPunti .= ' ORDER BY p.identificativo_fisico';

    $stmt = $pdo->prepare($sqlPunti);
    $stmt->execute($paramsPunti);
    $rows = $stmt->fetchAll();

    $colonnine = [];
    foreach ($rows as $c) {
        $sessioneAperta = $c['id_sessione'] !== null;
        $stato = stato_colonnina_calcolato($c['stato_hardware'], $sessioneAperta);

        $item = [
            'id_punto' => $c['id_punto'],
            'identificativo' => $c['identificativo_fisico'],
            'tipo_veicolo' => $c['tipo_veicolo'],
            'tipo_connettore' => $c['tipo_connettore'],
            'potenza_max_kw' => $c['potenza_max_kw'] !== null ? (float) $c['potenza_max_kw'] : null,
            'tariffa_kwh' => $c['tariffa_predefinita'] !== null ? (float) $c['tariffa_predefinita'] : null,
            'stato_hardware' => $c['stato_hardware'],
            'stato' => $stato,
            'utilizzabile' => colonnina_utilizzabile($stato),
            'batteria_stazione' => [],
        ];

        if ($stato === 'occupata') {
            $item['sessione_attiva'] = [
                'id_sessione' => $c['id_sessione'],
                'occupata_da' => $c['occupata_da'],
                'minuti_trascorsi' => $c['minuti_trascorsi'] !== null ? (int) $c['minuti_trascorsi'] : null,
            ];
        }

        $colonnine[] = $item;
    }

    $riepilogo = ['libere' => 0, 'occupate' => 0, 'offline' => 0, 'fuori_servizio' => 0];
    foreach ($colonnine as $col) {
        $s = $col['stato'];
        if ($s === 'libera') {
            $riepilogo['libere']++;
        } elseif ($s === 'occupata') {
            $riepilogo['occupate']++;
        } elseif ($s === 'offline') {
            $riepilogo['offline']++;
        } else {
            $riepilogo['fuori_servizio']++;
        }
    }

    json_response([
        'status' => 'success',
        'id_stazione' => $idStazione,
        'id_accumulatore' => $idAccumulatore !== '' ? $idAccumulatore : null,
        'riepilogo' => $riepilogo,
        'colonnine' => $colonnine,
    ]);
} catch (Throwable $e) {
    json_error('Errore recupero colonnine: ' . $e->getMessage(), 500);
}
