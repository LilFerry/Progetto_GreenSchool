<?php
/**
 * Report giornaliero per stazione (solo admin).
 * GET: id_utente_admin, data (YYYY-MM-DD, default oggi), id_stazione (opzionale)
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/includes/db.php';
require_once __DIR__ . '/includes/admin_helpers.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_error('Metodo non consentito', 405);
}

$idAdmin = id_utente_admin_da_richiesta([], $_GET);
$dataRichiesta = trim((string) ($_GET['data'] ?? ''));
$idStazione = trim((string) ($_GET['id_stazione'] ?? ''));

if ($dataRichiesta === '') {
    $dataRichiesta = date('Y-m-d');
} elseif (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $dataRichiesta)) {
    json_error('Formato data non valido (usa YYYY-MM-DD)', 400);
}

try {
    $pdo = db_connect();
    richiedi_admin($pdo, $idAdmin);

    $sql = "
        SELECT
            st.id_stazione,
            st.nome AS nome_stazione,
            CAST(s.data_inizio AS DATE) AS data,
            p.tipo_veicolo,
            COUNT(*) AS numero_ricariche,
            COALESCE(SUM(s.quantita_kwh), 0) AS totale_kwh,
            COALESCE(SUM(
                CASE WHEN s.tipo_tariffa_applicata = 'standard' THEN s.costo_totale ELSE 0 END
            ), 0) AS incasso_standard,
            COALESCE(SUM(
                CASE WHEN s.tipo_tariffa_applicata LIKE 'gratuita%' THEN s.quantita_kwh ELSE 0 END
            ), 0) AS kwh_gratuiti,
            COALESCE(AVG(TIMESTAMPDIFF(MINUTE, s.data_inizio, s.data_fine)), 0) AS durata_media_minuti
        FROM sessioni_ricarica s
        INNER JOIN punti_ricarica p ON s.id_punto = p.id_punto
        INNER JOIN stazioni st ON p.id_stazione = st.id_stazione
        WHERE s.data_fine IS NOT NULL
          AND CAST(s.data_inizio AS DATE) = :data
    ";

    $params = ['data' => $dataRichiesta];

    if ($idStazione !== '') {
        $sql .= ' AND st.id_stazione = :id_stazione';
        $params['id_stazione'] = $idStazione;
    }

    $sql .= '
        GROUP BY st.id_stazione, st.nome, CAST(s.data_inizio AS DATE), p.tipo_veicolo
        ORDER BY st.nome ASC, p.tipo_veicolo ASC
    ';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    $righe = [];
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $righe[] = [
            'id_stazione' => $row['id_stazione'],
            'nome_stazione' => $row['nome_stazione'],
            'data' => $row['data'],
            'tipo_veicolo' => $row['tipo_veicolo'],
            'numero_ricariche' => (int) $row['numero_ricariche'],
            'totale_kwh' => round((float) $row['totale_kwh'], 2),
            'incasso_standard' => round((float) $row['incasso_standard'], 2),
            'kwh_gratuiti' => round((float) $row['kwh_gratuiti'], 2),
            'durata_media_minuti' => round((float) $row['durata_media_minuti'], 1),
        ];
    }

    // Totali aggregati per stazione (tutti i tipi veicolo)
    $sqlTot = "
        SELECT
            st.id_stazione,
            st.nome AS nome_stazione,
            COUNT(*) AS numero_ricariche,
            COALESCE(SUM(s.quantita_kwh), 0) AS totale_kwh,
            COALESCE(SUM(
                CASE WHEN s.tipo_tariffa_applicata = 'standard' THEN s.costo_totale ELSE 0 END
            ), 0) AS incasso_standard,
            COALESCE(SUM(
                CASE WHEN s.tipo_tariffa_applicata LIKE 'gratuita%' THEN s.quantita_kwh ELSE 0 END
            ), 0) AS kwh_gratuiti
        FROM sessioni_ricarica s
        INNER JOIN punti_ricarica p ON s.id_punto = p.id_punto
        INNER JOIN stazioni st ON p.id_stazione = st.id_stazione
        WHERE s.data_fine IS NOT NULL
          AND CAST(s.data_inizio AS DATE) = :data
    ";

    if ($idStazione !== '') {
        $sqlTot .= ' AND st.id_stazione = :id_stazione';
    }

    $sqlTot .= ' GROUP BY st.id_stazione, st.nome ORDER BY st.nome ASC';

    $stmtTot = $pdo->prepare($sqlTot);
    $stmtTot->execute($params);

    $totaliPerStazione = [];
    while ($row = $stmtTot->fetch(PDO::FETCH_ASSOC)) {
        $totaliPerStazione[] = [
            'id_stazione' => $row['id_stazione'],
            'nome_stazione' => $row['nome_stazione'],
            'numero_ricariche' => (int) $row['numero_ricariche'],
            'totale_kwh' => round((float) $row['totale_kwh'], 2),
            'incasso_standard' => round((float) $row['incasso_standard'], 2),
            'kwh_gratuiti' => round((float) $row['kwh_gratuiti'], 2),
        ];
    }

    // Stazioni senza sessioni nel giorno (solo se non filtrate singolarmente)
    $stazioniSenzaAttivita = [];
    if ($idStazione === '') {
        $stmtSt = $pdo->query('SELECT id_stazione, nome FROM stazioni ORDER BY nome');
        $tutte = $stmtSt->fetchAll(PDO::FETCH_ASSOC);
        $conDati = array_column($totaliPerStazione, 'id_stazione');
        foreach ($tutte as $st) {
            if (!in_array($st['id_stazione'], $conDati, true)) {
                $stazioniSenzaAttivita[] = [
                    'id_stazione' => $st['id_stazione'],
                    'nome_stazione' => $st['nome'],
                ];
            }
        }
    }

    json_response([
        'status' => 'success',
        'data' => $dataRichiesta,
        'righe' => $righe,
        'totali_per_stazione' => $totaliPerStazione,
        'stazioni_senza_attivita' => $stazioniSenzaAttivita,
    ]);
} catch (Throwable $e) {
    json_error($e->getMessage(), 500);
}
