<?php
// =========================================================================
// API: COLONNINE PER STAZIONE (disponibilità per ricarica)
// GET ?id_stazione=...&id_accumulatore=... (opzionale)
// File autonomo (nessuna cartella includes richiesta) — compatibile XAMPP htdocs
// =========================================================================

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function colonnine_json_response(array $payload, int $code = 200): void
{
    http_response_code($code);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function colonnine_json_error(string $message, int $code = 400): void
{
    colonnine_json_response(['status' => 'error', 'message' => $message], $code);
}

function colonnine_tipi_veicolo_per_accumulatore(string $nome): array
{
    $nome = mb_strtolower($nome);
    if (strpos($nome, 'auto') !== false) {
        return ['auto'];
    }
    if (strpos($nome, 'bici') !== false || strpos($nome, 'monopatt') !== false) {
        return ['bici', 'monopattino'];
    }
    return ['auto', 'bici', 'monopattino'];
}

$idStazione = trim((string) ($_GET['id_stazione'] ?? ''));
$idAccumulatore = trim((string) ($_GET['id_accumulatore'] ?? ''));

if ($idStazione === '') {
    colonnine_json_error('Parametro id_stazione obbligatorio', 400);
}

try {
    $pdo = new PDO(
        'mysql:host=127.0.0.1;dbname=stazione_ricarica;charset=utf8mb4',
        'root',
        '',
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );

    $tipiFiltro = null;

    if ($idAccumulatore !== '') {
        $stmt = $pdo->prepare(
            'SELECT id_accumulatore, id_stazione, nome FROM accumulatori_stazione WHERE id_accumulatore = :id'
        );
        $stmt->execute(['id' => $idAccumulatore]);
        $acc = $stmt->fetch();
        if (!$acc || $acc['id_stazione'] !== $idStazione) {
            colonnine_json_error('Accumulatore non appartiene a questa stazione', 404);
        }
        $tipiFiltro = colonnine_tipi_veicolo_per_accumulatore($acc['nome']);
    }

    $stmt = $pdo->prepare('SELECT * FROM vw_stato_colonnine WHERE id_stazione = :stazione');
    $stmt->execute(['stazione' => $idStazione]);
    $rows = $stmt->fetchAll();

    // La vista unisce tutti gli accumulatori della stazione → una riga per accumulatore.
    // Teniamo una sola riga per id_punto (stato sessione identico su tutte le righe).
    $colonnine = [];
    $visti = [];
    foreach ($rows as $c) {
        if (isset($visti[$c['id_punto']])) {
            continue;
        }
        if ($tipiFiltro !== null && !in_array($c['tipo_veicolo'], $tipiFiltro, true)) {
            continue;
        }
        $visti[$c['id_punto']] = true;

        $item = [
            'id_punto' => $c['id_punto'],
            'identificativo' => $c['identificativo_fisico'],
            'tipo_veicolo' => $c['tipo_veicolo'],
            'tipo_connettore' => $c['tipo_connettore'],
            'potenza_max_kw' => $c['potenza_max_kw'] !== null ? (float) $c['potenza_max_kw'] : null,
            'tariffa_kwh' => $c['tariffa_predefinita'] !== null ? (float) $c['tariffa_predefinita'] : null,
            'stato' => $c['stato_calcolato'],
            'utilizzabile' => !in_array($c['stato_calcolato'], ['occupata', 'fuori_servizio'], true),
            'batteria_stazione' => [
                'percentuale' => $c['batteria_stazione_perc'] !== null ? (float) $c['batteria_stazione_perc'] : null,
                'kwh' => $c['batteria_stazione_kwh'] !== null ? (float) $c['batteria_stazione_kwh'] : null,
            ],
        ];

        if ($c['stato_calcolato'] === 'occupata') {
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

    colonnine_json_response([
        'status' => 'success',
        'id_stazione' => $idStazione,
        'id_accumulatore' => $idAccumulatore !== '' ? $idAccumulatore : null,
        'riepilogo' => $riepilogo,
        'colonnine' => $colonnine,
    ]);

} catch (Throwable $e) {
    colonnine_json_error('Errore recupero colonnine: ' . $e->getMessage(), 500);
}
