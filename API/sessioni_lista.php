<?php
// GET ?limite=100&id_utente=... (tutte le sessioni dell'utente, anche in corso)

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/includes/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_error('Metodo non consentito. Usare GET.', 405);
}

$limite = isset($_GET['limite']) ? max(1, min(500, (int) $_GET['limite'])) : 100;
$idUtente = trim((string) ($_GET['id_utente'] ?? ''));

if ($idUtente === '') {
    json_error('Parametro id_utente obbligatorio', 400);
}

try {
    $pdo = db_connect();

    $sql = "
        SELECT s.id_sessione, s.id_utente, s.id_punto, s.id_badge_usato, s.metodo_avvio,
               s.data_inizio, s.data_fine, s.quantita_kwh, s.costo_totale,
               s.stato_pagamento, s.tipo_tariffa_applicata, s.motivazione_gratuita,
               p.identificativo_fisico, p.tipo_veicolo, p.tipo_connettore, p.potenza_max_kw,
               p.tariffa_predefinita, p.id_stazione, p.id_accumulatore,
               st.nome AS nome_stazione, st.indirizzo AS indirizzo_stazione
        FROM sessioni_ricarica s
        INNER JOIN punti_ricarica p ON p.id_punto = s.id_punto
        INNER JOIN stazioni st ON st.id_stazione = p.id_stazione
        WHERE s.id_utente = :uid
        ORDER BY COALESCE(s.data_fine, s.data_inizio) DESC
        LIMIT " . $limite;

    $stmt = $pdo->prepare($sql);
    $stmt->execute(['uid' => $idUtente]);

    $lista = [];
    while ($row = $stmt->fetch()) {
        $inizio = $row['data_inizio'] ? strtotime($row['data_inizio']) : null;
        $fine = $row['data_fine'] ? strtotime($row['data_fine']) : null;
        $durataSec = null;
        if ($inizio && $fine) {
            $durataSec = max(0, $fine - $inizio);
        } elseif ($inizio && !$fine) {
            $durataSec = max(0, time() - $inizio);
        }

        $statoRicarica = 'in_corso';
        if ($row['data_fine'] !== null) {
            $kwh = (float) ($row['quantita_kwh'] ?? 0);
            $statoRicarica = ($kwh <= 0 && (float) $row['costo_totale'] <= 0) ? 'annullata' : 'conclusa';
        }

        $lista[] = [
            'id_sessione' => $row['id_sessione'],
            'id_utente' => $row['id_utente'],
            'id_punto' => $row['id_punto'],
            'id_badge_usato' => $row['id_badge_usato'],
            'identificativo_colonnina' => $row['identificativo_fisico'],
            'tipo_veicolo' => $row['tipo_veicolo'],
            'tipo_connettore' => $row['tipo_connettore'],
            'potenza_max_kw' => $row['potenza_max_kw'] !== null ? (float) $row['potenza_max_kw'] : null,
            'tariffa_kwh' => $row['tariffa_predefinita'] !== null ? (float) $row['tariffa_predefinita'] : null,
            'id_stazione' => $row['id_stazione'],
            'id_accumulatore' => $row['id_accumulatore'],
            'nome_stazione' => $row['nome_stazione'],
            'indirizzo_stazione' => $row['indirizzo_stazione'],
            'metodo_avvio' => $row['metodo_avvio'],
            'data_inizio' => $row['data_inizio'],
            'data_fine' => $row['data_fine'],
            'quantita_kwh' => $row['quantita_kwh'] !== null ? (float) $row['quantita_kwh'] : null,
            'costo_totale' => (float) $row['costo_totale'],
            'stato_pagamento' => $row['stato_pagamento'],
            'tipo_tariffa_applicata' => $row['tipo_tariffa_applicata'],
            'motivazione_gratuita' => $row['motivazione_gratuita'],
            'stato_ricarica' => $statoRicarica,
            'durata_secondi' => $durataSec,
            'durata_minuti' => $durataSec !== null ? (int) floor($durataSec / 60) : null,
        ];
    }

    json_response([
        'status' => 'success',
        'totale' => count($lista),
        'data' => $lista,
    ]);
} catch (Throwable $e) {
    json_error('Errore lettura storico: ' . $e->getMessage(), 500);
}
