<?php
// GET ?id_stazione=&id_utente_admin= | POST: salva/elimina colonnina

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/includes/db.php';
require_once __DIR__ . '/includes/admin_helpers.php';
require_once __DIR__ . '/includes/colonnina_helpers.php';

$method = $_SERVER['REQUEST_METHOD'];
$data = $method === 'GET' ? $_GET : read_json_body();
$idAdmin = id_utente_admin_da_richiesta($data, $_GET);

try {
    $pdo = db_connect();
    richiedi_admin($pdo, $idAdmin);

    if ($method === 'GET') {
        $idStazione = trim((string) ($_GET['id_stazione'] ?? ''));
        if ($idStazione === '') {
            json_error('id_stazione obbligatorio', 400);
        }

        $stmt = $pdo->prepare(
            "SELECT p.*, s.id_sessione, s.data_inizio
             FROM punti_ricarica p
             LEFT JOIN sessioni_ricarica s ON s.id_punto = p.id_punto AND s.data_fine IS NULL
             WHERE p.id_stazione = :st
             ORDER BY p.identificativo_fisico"
        );
        $stmt->execute(['st' => $idStazione]);
        $lista = [];
        while ($c = $stmt->fetch()) {
            $aperta = $c['id_sessione'] !== null;
            $stato = stato_colonnina_calcolato($c['stato_hardware'], $aperta);
            $lista[] = [
                'id_punto' => $c['id_punto'],
                'id_stazione' => $c['id_stazione'],
                'identificativo' => $c['identificativo_fisico'],
                'tipo_veicolo' => $c['tipo_veicolo'],
                'tipo_connettore' => $c['tipo_connettore'],
                'potenza_max_kw' => (float) $c['potenza_max_kw'],
                'tariffa_kwh' => (float) $c['tariffa_predefinita'],
                'stato_hardware' => $c['stato_hardware'],
                'stato' => $stato,
                'sessione_aperta' => $aperta,
                'id_sessione_attiva' => $c['id_sessione'],
            ];
        }
        json_response(['status' => 'success', 'data' => $lista]);
    }

    if ($method !== 'POST') {
        json_error('Metodo non consentito', 405);
    }

    $azione = strtolower(trim((string) ($data['azione'] ?? 'salva')));

    if ($azione === 'elimina') {
        $idPunto = trim((string) ($data['id_punto'] ?? ''));
        if ($idPunto === '') {
            json_error('id_punto obbligatorio', 400);
        }

        $pdo->beginTransaction();

        $stmt = $pdo->prepare('SELECT id_punto FROM punti_ricarica WHERE id_punto = :id FOR UPDATE');
        $stmt->execute(['id' => $idPunto]);
        if (!$stmt->fetch()) {
            $pdo->rollBack();
            json_error('Colonnina non trovata', 404);
        }

        $stmt = $pdo->prepare(
            "SELECT id_sessione FROM sessioni_ricarica
             WHERE id_punto = :id AND data_fine IS NULL LIMIT 1 FOR UPDATE"
        );
        $stmt->execute(['id' => $idPunto]);
        if ($stmt->fetch()) {
            $pdo->rollBack();
            json_error('Impossibile eliminare: sessione di ricarica in corso', 409);
        }

        $pdo->prepare('DELETE FROM punti_ricarica WHERE id_punto = :id')->execute(['id' => $idPunto]);
        $pdo->commit();

        json_response(['status' => 'success', 'message' => 'Colonnina eliminata']);
    }

    if ($azione === 'online_tutte') {
        $idStazione = trim((string) ($data['id_stazione'] ?? ''));
        if ($idStazione === '') {
            json_error('id_stazione obbligatorio', 400);
        }
        $pdo->prepare(
            "UPDATE punti_ricarica SET stato_hardware = 'online', data_ultimo_heartbeat = NOW()
             WHERE id_stazione = :id AND stato_hardware NOT IN ('guasto', 'manutenzione_programmata')"
        )->execute(['id' => $idStazione]);
        json_response(['status' => 'success', 'message' => 'Colonnine impostate online']);
    }

    $idPunto = trim((string) ($data['id_punto'] ?? ''));
    $idStazione = trim((string) ($data['id_stazione'] ?? ''));
    $identificativo = trim((string) ($data['identificativo'] ?? ''));
    $tipoVeicolo = trim((string) ($data['tipo_veicolo'] ?? 'auto'));
    $connettore = trim((string) ($data['tipo_connettore'] ?? 'CCS2'));
    $potenza = isset($data['potenza_max_kw']) ? (float) $data['potenza_max_kw'] : 22.0;
    $tariffa = isset($data['tariffa_kwh']) ? (float) $data['tariffa_kwh'] : 0.5;
    $statoHw = trim((string) ($data['stato_hardware'] ?? 'online'));

    if ($idStazione === '' || $identificativo === '') {
        json_error('id_stazione e identificativo obbligatori', 400);
    }
    if (!in_array($tipoVeicolo, ['auto', 'bici', 'monopattino'], true)) {
        json_error('tipo_veicolo non valido', 400);
    }
    if (!in_array($statoHw, ['online', 'offline', 'guasto', 'manutenzione_programmata'], true)) {
        json_error('stato_hardware non valido', 400);
    }

    $stmt = $pdo->prepare('SELECT id_stazione FROM stazioni WHERE id_stazione = :id');
    $stmt->execute(['id' => $idStazione]);
    if (!$stmt->fetch()) {
        json_error('Stazione non trovata', 404);
    }

    if ($idPunto === '') {
        $idPunto = nuovo_uuid_entita();
        $ins = $pdo->prepare(
            "INSERT INTO punti_ricarica
                (id_punto, id_stazione, identificativo_fisico, tipo_veicolo, tipo_connettore,
                 potenza_max_kw, stato_hardware, data_ultimo_heartbeat, tariffa_predefinita)
             VALUES (:id, :st, :idf, :tv, :conn, :pot, :hw, NOW(), :tar)"
        );
        $ins->execute([
            'id' => $idPunto,
            'st' => $idStazione,
            'idf' => $identificativo,
            'tv' => $tipoVeicolo,
            'conn' => $connettore,
            'pot' => $potenza,
            'hw' => $statoHw,
            'tar' => $tariffa,
        ]);
        $msg = 'Colonnina creata';
        $code = 201;
    } else {
        $pdo->beginTransaction();
        $stmt = $pdo->prepare('SELECT id_punto FROM punti_ricarica WHERE id_punto = :id FOR UPDATE');
        $stmt->execute(['id' => $idPunto]);
        if (!$stmt->fetch()) {
            $pdo->rollBack();
            json_error('Colonnina non trovata', 404);
        }

        $upd = $pdo->prepare(
            "UPDATE punti_ricarica SET identificativo_fisico = :idf, tipo_veicolo = :tv,
             tipo_connettore = :conn, potenza_max_kw = :pot, tariffa_predefinita = :tar,
             stato_hardware = :hw, data_ultimo_heartbeat = CASE WHEN :hw = 'online' THEN NOW() ELSE data_ultimo_heartbeat END
             WHERE id_punto = :id"
        );
        $upd->execute([
            'id' => $idPunto,
            'idf' => $identificativo,
            'tv' => $tipoVeicolo,
            'conn' => $connettore,
            'pot' => $potenza,
            'tar' => $tariffa,
            'hw' => $statoHw,
        ]);
        $pdo->commit();
        $msg = 'Colonnina aggiornata';
        $code = 200;
    }

    json_response([
        'status' => 'success',
        'message' => $msg,
        'data' => ['id_punto' => $idPunto],
    ], $code ?? 200);

} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    json_error('Errore admin colonnine: ' . $e->getMessage(), 500);
}
