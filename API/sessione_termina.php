<?php
// =========================================================================
// API: CHIUSURA SESSIONE DI RICARICA
// Termina il simulatore Python e restituisce i dati aggiornati da DB.
//
// POST JSON: id_sessione oppure id_punto
// =========================================================================

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['status' => 'error', 'message' => 'Metodo non consentito. Usare POST.']);
    exit;
}

require_once __DIR__ . '/includes/db.php';
require_once __DIR__ . '/includes/sessione_helpers.php';
require_once __DIR__ . '/includes/simulatore.php';

$data = read_json_body();
$idSessione = trim((string) ($data['id_sessione'] ?? ''));
$idPunto = trim((string) ($data['id_punto'] ?? ''));
$idAccumulatore = isset($data['id_accumulatore']) ? trim((string) $data['id_accumulatore']) : null;

if ($idSessione === '' && $idPunto === '') {
    json_error('Specificare id_sessione oppure id_punto', 400);
}



try {
    $pdo = db_connect();

    if ($idSessione === '' && $idPunto !== '') {
        $stmt = $pdo->prepare(
            "SELECT id_sessione FROM sessioni_ricarica
             WHERE id_punto = :p AND data_fine IS NULL LIMIT 1"
        );
        $stmt->execute(['p' => $idPunto]);
        $row = $stmt->fetch();
        if (!$row) {
            json_error('Nessuna sessione aperta su questa colonnina', 404);
        }
        $idSessione = $row['id_sessione'];
    }

    $sim = simulatore_termina($idSessione, null);

    if (!$sim['ok']) {
        $stmt = $pdo->prepare(
            "SELECT s.quantita_kwh, s.data_fine, p.tariffa_predefinita, p.id_stazione, p.tipo_veicolo
             FROM sessioni_ricarica s
             JOIN punti_ricarica p ON p.id_punto = s.id_punto
             WHERE s.id_sessione = :id"
        );
        $stmt->execute(['id' => $idSessione]);
        $aperta = $stmt->fetch();
        if ($aperta && $aperta['data_fine'] === null) {
            $kwh = (float) ($aperta['quantita_kwh'] ?? 0);
            $statoSim = simulatore_stato($idSessione);
            if ($statoSim['ok'] && isset($statoSim['body']['data']['kwh_erogati'])) {
                $kwh = (float) $statoSim['body']['data']['kwh_erogati'];
            }
            $tariffa = (float) ($aperta['tariffa_predefinita'] ?? 0);
            $costo = round($kwh * $tariffa, 2);
            chiudi_sessione_su_db($pdo, $idSessione, $kwh, $costo, $idAccumulatore);
        } elseif (!$aperta) {
            json_error('Sessione non trovata', 404);
        } else {
            json_error($sim['error'] ?? 'Errore terminazione simulatore', $sim['http_code'] ?: 500);
        }
    } else {
        // Simulatore ok: se la riga sessione è ancora aperta, chiudi solo sessioni_ricarica
        // (l'accumulatore è già stato scalato tick-by-tick dal simulatore Python)
        $stmt = $pdo->prepare(
            "SELECT data_fine, quantita_kwh FROM sessioni_ricarica WHERE id_sessione = :id"
        );
        $stmt->execute(['id' => $idSessione]);
        $check = $stmt->fetch();
        if ($check && $check['data_fine'] === null) {
            $kwh = (float) ($sim['body']['data']['sessione']['quantita_kwh'] ?? $check['quantita_kwh'] ?? 0);
            $costo = (float) ($sim['body']['data']['sessione']['costo_totale'] ?? 0);
            $pdo->prepare(
                "UPDATE sessioni_ricarica
                 SET data_fine = NOW(), quantita_kwh = :kwh, costo_totale = :costo,
                     stato_pagamento = CASE WHEN :costo > 0 THEN 'in_attesa_pagamento' ELSE 'gratuito' END
                 WHERE id_sessione = :id AND data_fine IS NULL"
            )->execute(['kwh' => $kwh, 'costo' => $costo, 'id' => $idSessione]);
        }
    }

    $aggiornati = carica_dati_post_sessione($pdo, $idSessione);
    if ($aggiornati === []) {
        json_error('Sessione non trovata dopo la chiusura', 404);
    }

    // Tutti gli accumulatori della stazione (per refresh UI mappa)
    $idStazione = $aggiornati['accumulatore']['id_stazione'] ?? null;
    $tuttiAcc = [];
    if ($idStazione) {
        $stmt = $pdo->prepare(
            "SELECT * FROM accumulatori_stazione WHERE id_stazione = :s ORDER BY nome"
        );
        $stmt->execute(['s' => $idStazione]);
        while ($r = $stmt->fetch()) {
            $tuttiAcc[] = formatta_accumulatore($r);
        }
    }

    json_response([
        'status' => 'success',
        'message' => 'Sessione terminata; dati salvati su database e storico',
        'data' => array_merge($aggiornati, [
            'simulatore' => $sim['body']['data'] ?? null,
            'accumulatori_stazione' => $tuttiAcc,
        ]),
    ]);

} catch (Throwable $e) {
    json_error('Errore chiusura sessione: ' . $e->getMessage(), 500);
}
