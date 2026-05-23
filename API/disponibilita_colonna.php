<?php
// =========================================================================
// API: DISPONIBILITÀ COLONNINE DI RICARICA
// Restituisce lo stato in tempo reale dei punti di ricarica,
// con filtri opzionali per stazione e tipo di veicolo.
//
// Parametri GET:
//   id_stazione   (opzionale) — UUID della stazione da filtrare
//   tipo_veicolo  (opzionale) — 'auto' | 'bici' | 'monopattino'
// =========================================================================

header('Content-Type: application/json');

// ── Lettura e sanificazione dei parametri opzionali ──────────────────────
$id_stazione  = filter_input(INPUT_GET, 'id_stazione',  FILTER_SANITIZE_SPECIAL_CHARS);
$tipo_veicolo = filter_input(INPUT_GET, 'tipo_veicolo', FILTER_SANITIZE_SPECIAL_CHARS);

// Valori ammessi per tipo_veicolo
$tipi_veicolo_ammessi = ['auto', 'bici', 'monopattino'];

if ($tipo_veicolo !== null && $tipo_veicolo !== false && !in_array($tipo_veicolo, $tipi_veicolo_ammessi, true)) {
    http_response_code(400);
    echo json_encode([
        "status"  => "error",
        "message" => "Valore non valido per tipo_veicolo. Valori accettati: auto, bici, monopattino."
    ]);
    exit;
}

// ── Impostazioni di connessione al database ──────────────────────────────
$host     = 'localhost';
$dbname   = 'stazione_ricarica';
$user     = 'root';
$password = '';
$charset  = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$dbname;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    // Apertura connessione PDO
    $pdo = new PDO($dsn, $user, $password, $options);

    // ── Costruzione dinamica della query con filtri opzionali ────────────
    // Si interroga la vista vw_stato_colonnine che calcola già lo stato
    // aggiornato di ogni punto (libera / occupata / offline / fuori_servizio)
    $sql    = "SELECT * FROM vw_stato_colonnine WHERE 1=1";
    $params = [];

    if (!empty($id_stazione)) {
        $sql .= " AND id_stazione = :id_stazione";
        $params['id_stazione'] = $id_stazione;
    }

    if (!empty($tipo_veicolo)) {
        $sql .= " AND tipo_veicolo = :tipo_veicolo";
        $params['tipo_veicolo'] = $tipo_veicolo;
    }

    $sql .= " ORDER BY nome_stazione, tipo_veicolo, identificativo_fisico";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $colonnine = $stmt->fetchAll();

    // ── Nessun risultato trovato ─────────────────────────────────────────
    if (empty($colonnine)) {
        http_response_code(404);
        echo json_encode([
            "status"  => "error",
            "message" => "Nessuna colonnina trovata con i filtri specificati."
        ]);
        exit;
    }

    // ── Calcolo riepilogo disponibilità ──────────────────────────────────
    $totali = ["libera" => 0, "occupata" => 0, "offline" => 0, "fuori_servizio" => 0];
    foreach ($colonnine as $c) {
        $stato = $c['stato_calcolato'];
        if (isset($totali[$stato])) {
            $totali[$stato]++;
        }
    }

    // ── Formattazione dei dati per ogni colonnina ─────────────────────────
    $risultati = array_map(function ($c) {
        $info = [
            "id_punto"            => $c['id_punto'],
            "identificativo"      => $c['identificativo_fisico'],
            "tipo_veicolo"        => $c['tipo_veicolo'],
            "connettore"          => $c['tipo_connettore'],
            "potenza_max_kw"      => $c['potenza_max_kw'] !== null ? (float) $c['potenza_max_kw'] : null,
            "tariffa_kwh"         => $c['tariffa_predefinita'] !== null ? (float) $c['tariffa_predefinita'] : null,
            "stazione"            => [
                "id"        => $c['id_stazione'],
                "nome"      => $c['nome_stazione'],
                "indirizzo" => $c['indirizzo'],
                "lat"       => $c['latitudine'] !== null ? (float) $c['latitudine'] : null,
                "lon"       => $c['longitudine'] !== null ? (float) $c['longitudine'] : null,
            ],
            "stato"               => $c['stato_calcolato'],
            "batteria_stazione"   => [
                "percentuale" => $c['batteria_stazione_perc'] !== null ? (float) $c['batteria_stazione_perc'] : null,
                "kwh"         => $c['batteria_stazione_kwh']  !== null ? (float) $c['batteria_stazione_kwh']  : null,
                "stato"       => $c['batteria_stato'],
            ],
        ];

        // Aggiunge i dettagli di occupazione solo se la colonnina è in uso
        if ($c['stato_calcolato'] === 'occupata') {
            $info['sessione_attiva'] = [
                "id_sessione"       => $c['id_sessione'],
                "inizio"            => $c['occupata_da'],
                "minuti_trascorsi"  => $c['minuti_trascorsi'] !== null ? (int) $c['minuti_trascorsi'] : null,
                "utente"            => trim(($c['occupante_nome'] ?? '') . ' ' . ($c['occupante_cognome'] ?? '')) ?: null,
            ];
        }

        return $info;
    }, $colonnine);

    // ── Output JSON finale ───────────────────────────────────────────────
    echo json_encode([
        "status"   => "success",
        "filtri"   => [
            "id_stazione"  => $id_stazione  ?: null,
            "tipo_veicolo" => $tipo_veicolo ?: null,
        ],
        "riepilogo" => [
            "totale"        => count($colonnine),
            "libere"        => $totali['libera'],
            "occupate"      => $totali['occupata'],
            "offline"       => $totali['offline'],
            "fuori_servizio" => $totali['fuori_servizio'],
        ],
        "colonnine" => $risultati,
    ]);

} catch (\PDOException $e) {
    // Gestione degli errori del database
    http_response_code(500);
    echo json_encode([
        "status"  => "error",
        "message" => "Errore interno durante il recupero dei dati: " . $e->getMessage()
    ]);
}
?>