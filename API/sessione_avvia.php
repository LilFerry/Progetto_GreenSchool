<?php
// =========================================================================
// API: AVVIO SESSIONE DI RICARICA
// Gestisce concorrenza su DB, crea la sessione e avvia il simulatore Python.
//
// POST JSON:
//   id_punto       (obbligatorio)
//   id_utente      (opzionale)
//   id_accumulatore (opzionale, per validare compatibilità)
//   metodo_avvio   APP | RFID | QR_CODE | ADMIN (default APP)
//   id_badge_usato (opzionale)
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
$idPunto = trim((string) ($data['id_punto'] ?? ''));
$idUtente = isset($data['id_utente']) ? trim((string) $data['id_utente']) : null;
$idAccumulatore = isset($data['id_accumulatore']) ? trim((string) $data['id_accumulatore']) : null;
$metodoAvvio = strtoupper(trim((string) ($data['metodo_avvio'] ?? 'APP')));
$idBadge = isset($data['id_badge_usato']) ? (int) $data['id_badge_usato'] : null;

if ($idPunto === '') {
    json_error('Campo id_punto obbligatorio', 400);
}

if (!in_array($metodoAvvio, METODI_AVVIO_AMMESSI, true)) {
    json_error('metodo_avvio non valido', 400, ['valori' => METODI_AVVIO_AMMESSI]);
}

try {
    $pdo = db_connect();
    $pdo->beginTransaction();

    // 1) Blocca la colonnina per primo (ordine lock anti-deadlock / concorrenza)
    $stmt = $pdo->prepare(
        "SELECT id_punto, id_stazione, id_accumulatore, identificativo_fisico, tipo_veicolo,
                potenza_max_kw, tariffa_predefinita, stato_hardware
         FROM punti_ricarica WHERE id_punto = :punto FOR UPDATE"
    );
    $stmt->execute(['punto' => $idPunto]);
    $punto = $stmt->fetch();
    if (!$punto) {
        $pdo->rollBack();
        json_error('Punto di ricarica non trovato', 404);
    }

    if (in_array($punto['stato_hardware'], ['guasto', 'manutenzione_programmata'], true)) {
        $pdo->rollBack();
        json_error('Colonnina fuori servizio', 409, ['stato_hardware' => $punto['stato_hardware']]);
    }

    if ($punto['stato_hardware'] === 'offline') {
        $pdo->rollBack();
        json_error('Colonnina offline: impostarla online dall\'admin prima di avviare', 409);
    }

    // 2) Una sola sessione aperta per colonnina
    $stmt = $pdo->prepare(
        "SELECT id_sessione FROM sessioni_ricarica
         WHERE id_punto = :punto AND data_fine IS NULL
         LIMIT 1 FOR UPDATE"
    );
    $stmt->execute(['punto' => $idPunto]);
    if ($stmt->fetch()) {
        $pdo->rollBack();
        json_error('Colonnina già occupata da un\'altra sessione', 409);
    }

    if ($idUtente) {
        $stmt = $pdo->prepare('SELECT attivo FROM utenti WHERE id_utente = :u FOR UPDATE');
        $stmt->execute(['u' => $idUtente]);
        $utente = $stmt->fetch();
        if (!$utente) {
            $pdo->rollBack();
            json_error('Utente non trovato', 404);
        }
        if (!(int) $utente['attivo']) {
            $pdo->rollBack();
            json_error('Utente non attivo', 409);
        }
    }

    $idAccPunto = (string) ($punto['id_accumulatore'] ?? '');
    if ($idAccumulatore !== '') {
        if ($idAccPunto !== '' && $idAccPunto !== $idAccumulatore) {
            $pdo->rollBack();
            json_error('Colonnina non collegata a questo accumulatore', 409);
        }
        $acc = carica_accumulatore($pdo, $idAccumulatore);
        if (!$acc || $acc['id_stazione'] !== $punto['id_stazione']) {
            $pdo->rollBack();
            json_error('Accumulatore non compatibile con questa stazione', 409);
        }
        $tipi = tipi_veicolo_per_accumulatore($acc['nome']);
        if (!in_array($punto['tipo_veicolo'], $tipi, true)) {
            $pdo->rollBack();
            json_error('Colonnina non compatibile con l\'accumulatore selezionato', 409);
        }
    } elseif ($idAccPunto !== '') {
        $acc = carica_accumulatore($pdo, $idAccPunto);
        if (!$acc) {
            $pdo->rollBack();
            json_error('Accumulatore del punto di ricarica non trovato', 404);
        }
    } else {
        $acc = seleziona_accumulatore($pdo, $punto['id_stazione'], $punto['tipo_veicolo']);
        if (!$acc) {
            $pdo->rollBack();
            json_error('Nessun accumulatore disponibile per questa stazione', 409);
        }
    }

    applica_stato_idle_accumulatore($pdo, $acc['id_accumulatore']);

    $stmt = $pdo->prepare(
        "SELECT id_accumulatore, livello_corrente_kwh, percentuale_carica,
                soglia_minima_perc, stato_operativo
         FROM accumulatori_stazione WHERE id_accumulatore = :id FOR UPDATE"
    );
    $stmt->execute(['id' => $acc['id_accumulatore']]);
    $accLock = $stmt->fetch();

    if (in_array($accLock['stato_operativo'], ['guasto', 'manutenzione'], true)) {
        $pdo->rollBack();
        json_error('Accumulatore non operativo', 409);
    }

    $perc = (float) $accLock['percentuale_carica'];
    $sogliaMin = (float) $accLock['soglia_minima_perc'];
    if ($perc <= $sogliaMin || $accLock['stato_operativo'] === 'offline') {
        $pdo->rollBack();
        json_error(
            'Accumulatore sotto la soglia minima (' . round($sogliaMin, 1) . '%): ricarica non avviabile',
            409
        );
    }

    if ((float) $accLock['livello_corrente_kwh'] <= 0.01) {
        $pdo->rollBack();
        json_error('Accumulatore scarico: ricarica non avviabile', 409);
    }

    $idSessione = nuovo_uuid_sessione();

    $ins = $pdo->prepare(
        "INSERT INTO sessioni_ricarica
            (id_sessione, id_utente, id_punto, id_badge_usato, metodo_avvio,
             tipo_tariffa_applicata, costo_totale, stato_pagamento)
         VALUES (:sid, :uid, :punto, :badge, :metodo, 'standard', 0.00, 'non_richiesto')"
    );
    $ins->execute([
        'sid' => $idSessione,
        'uid' => $idUtente ?: null,
        'punto' => $idPunto,
        'badge' => $idBadge ?: null,
        'metodo' => $metodoAvvio,
    ]);

    $pdo->prepare(
        "UPDATE punti_ricarica SET stato_hardware = 'online', data_ultimo_heartbeat = NOW()
         WHERE id_punto = :p"
    )->execute(['p' => $idPunto]);

    $pdo->prepare(
        "UPDATE accumulatori_stazione SET stato_operativo = 'scarica', data_ultimo_aggiornamento = NOW()
         WHERE id_accumulatore = :a"
    )->execute(['a' => $acc['id_accumulatore']]);

    $pdo->commit();

    $sim = simulatore_avvia($idSessione, $acc['id_accumulatore']);
    if (!$sim['ok']) {
        $pdo->beginTransaction();
        annulla_sessione($pdo, $idSessione);
        $pdo->commit();
        json_error($sim['error'] ?? 'Simulatore non disponibile', 503);
    }

    $accAgg = carica_accumulatore($pdo, $acc['id_accumulatore']);

    json_response([
        'status' => 'success',
        'message' => 'Sessione avviata; simulatore attivo',
        'data' => [
            'id_sessione' => $idSessione,
            'id_punto' => $idPunto,
            'identificativo' => $punto['identificativo_fisico'],
            'tipo_veicolo' => $punto['tipo_veicolo'],
            'stato' => 'in_corso',
            'simulatore' => $sim['body']['data'] ?? null,
            'accumulatore' => $accAgg,
        ],
    ], 201);

} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    json_error('Errore avvio sessione: ' . $e->getMessage(), 500);
}
