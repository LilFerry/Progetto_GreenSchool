<?php
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/includes/accumulatore_helpers.php';

try {
    $pdo = new PDO(
        'mysql:host=127.0.0.1;dbname=stazione_ricarica;charset=utf8mb4',
        'root',
        ''
    );
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Filtro opzionale per stazione tramite query string: ?id_stazione=...
    $id_stazione = $_GET['id_stazione'] ?? null;

    $sql = "
        SELECT
            a.id_accumulatore,
            a.id_stazione,
            s.nome AS nome_stazione,
            a.nome,
            a.capacita_totale_kwh,
            a.capacita_utilizzabile_kwh,
            a.potenza_max_carica_kw,
            a.potenza_max_scarica_kw,
            a.livello_corrente_kwh,
            a.percentuale_carica,
            a.stato_operativo,
            a.data_ultimo_aggiornamento,
            a.soglia_minima_perc,
            a.soglia_massima_perc
        FROM accumulatori_stazione a
        JOIN stazioni s ON s.id_stazione = a.id_stazione
    ";

    if ($id_stazione !== null) {
        $sql .= " WHERE a.id_stazione = :id_stazione";
    }

    $sql .= " ORDER BY s.nome, a.nome";

    $stmt = $pdo->prepare($sql);

    if ($id_stazione !== null) {
        $stmt->bindValue(':id_stazione', $id_stazione, PDO::PARAM_STR);
    }

    $stmt->execute();
    $accumulatori = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($accumulatori as &$row) {
        $row['capacita_totale_kwh']      = (float) $row['capacita_totale_kwh'];
        $row['capacita_utilizzabile_kwh'] = (float) $row['capacita_utilizzabile_kwh'];
        $row['potenza_max_carica_kw']    = (float) $row['potenza_max_carica_kw'];
        $row['potenza_max_scarica_kw']   = (float) $row['potenza_max_scarica_kw'];
        $row['livello_corrente_kwh']     = (float) $row['livello_corrente_kwh'];
        $row['percentuale_carica']       = (float) $row['percentuale_carica'];
        $row['soglia_minima_perc']       = (float) $row['soglia_minima_perc'];
        $row['soglia_massima_perc']      = (float) $row['soglia_massima_perc'];
        $row = normalizza_stato_accumulatore_riga($row);
    }
    unset($row);

    echo json_encode($accumulatori, JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['errore' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}