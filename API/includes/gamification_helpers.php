<?php

require_once __DIR__ . '/utente_helpers.php';

const XP_BASE_RICARICA = 15;
const XP_PER_KWH = 25;
const XP_PER_LIVELLO = 100;

/** Definizioni missioni giornaliere (solo utenti non admin). */
function missioni_giornaliere_definizioni(): array
{
    return [
        'ricarica_oggi' => [
            'codice' => 'ricarica_oggi',
            'titolo' => 'Prima ricarica del giorno',
            'descrizione' => 'Completa almeno 1 sessione di ricarica oggi.',
            'target' => 1,
            'xp_bonus' => 30,
            'unita' => 'ricariche',
        ],
        'kwh_oggi' => [
            'codice' => 'kwh_oggi',
            'titolo' => 'Energia verde',
            'descrizione' => 'Eroga almeno 3 kWh in totale oggi.',
            'target' => 3,
            'xp_bonus' => 40,
            'unita' => 'kWh',
        ],
        'stazioni_oggi' => [
            'codice' => 'stazioni_oggi',
            'titolo' => 'Esploratore',
            'descrizione' => 'Ricarica in 2 stazioni diverse nella stessa giornata.',
            'target' => 2,
            'xp_bonus' => 35,
            'unita' => 'stazioni',
        ],
    ];
}

function xp_richiesti_per_livello(int $livello): int
{
    return max(1, $livello) * XP_PER_LIVELLO;
}

function livello_da_xp(int $xp): int
{
    $livello = 1;
    while ($xp >= xp_richiesti_per_livello($livello)) {
        $xp -= xp_richiesti_per_livello($livello);
        $livello++;
        if ($livello > 99) {
            break;
        }
    }
    return $livello;
}

function progresso_livello(int $xp): array
{
    $livello = livello_da_xp($xp);
    $consumato = 0;
    for ($l = 1; $l < $livello; $l++) {
        $consumato += xp_richiesti_per_livello($l);
    }
    $nelLivello = $xp - $consumato;
    $serve = xp_richiesti_per_livello($livello);

    return [
        'livello' => $livello,
        'xp_nel_livello' => $nelLivello,
        'xp_per_prossimo_livello' => $serve,
        'percentuale_livello' => $serve > 0 ? min(100, round(($nelLivello / $serve) * 100, 1)) : 100,
    ];
}

function xp_da_ricarica(float $kwh): int
{
    if ($kwh < 0.001) {
        return 0;
    }
    return XP_BASE_RICARICA + (int) round($kwh * XP_PER_KWH);
}

function gamification_tabelle_presenti(PDO $pdo): bool
{
    static $cache = null;
    if ($cache !== null) {
        return $cache;
    }
    $stmt = $pdo->query("SHOW TABLES LIKE 'utente_gamification'");
    $cache = (bool) $stmt->fetch();
    return $cache;
}

function get_or_create_profilo_gamification(PDO $pdo, string $idUtente): array
{
    $stmt = $pdo->prepare('SELECT * FROM utente_gamification WHERE id_utente = :id');
    $stmt->execute(['id' => $idUtente]);
    $row = $stmt->fetch();
    if ($row) {
        return $row;
    }
    $pdo->prepare(
        'INSERT INTO utente_gamification (id_utente, xp_totale, livello, ricariche_completate, kwh_totali)
         VALUES (:id, 0, 1, 0, 0)'
    )->execute(['id' => $idUtente]);
    $stmt->execute(['id' => $idUtente]);
    return $stmt->fetch();
}

function carica_progresso_missione(PDO $pdo, string $idUtente, string $data, string $codice): array
{
    $stmt = $pdo->prepare(
        'SELECT progresso, completata, xp_bonus_riscosso FROM missioni_giornaliere_progresso
         WHERE id_utente = :u AND data_missione = :d AND codice_missione = :c'
    );
    $stmt->execute(['u' => $idUtente, 'd' => $data, 'c' => $codice]);
    $row = $stmt->fetch();
    if ($row) {
        return $row;
    }
    return ['progresso' => 0, 'completata' => 0, 'xp_bonus_riscosso' => 0];
}

function salva_progresso_missione(
    PDO $pdo,
    string $idUtente,
    string $data,
    string $codice,
    float $progresso,
    bool $completata,
    bool $bonusRiscosso
): void {
    $pdo->prepare(
        'INSERT INTO missioni_giornaliere_progresso
            (id_utente, data_missione, codice_missione, progresso, completata, xp_bonus_riscosso)
         VALUES (:u, :d, :c, :p, :comp, :bonus)
         ON DUPLICATE KEY UPDATE
            progresso = VALUES(progresso),
            completata = VALUES(completata),
            xp_bonus_riscosso = VALUES(xp_bonus_riscosso)'
    )->execute([
        'u' => $idUtente,
        'd' => $data,
        'c' => $codice,
        'p' => $progresso,
        'comp' => $completata ? 1 : 0,
        'bonus' => $bonusRiscosso ? 1 : 0,
    ]);
}

function conta_stazioni_distinte_oggi(PDO $pdo, string $idUtente, string $data): int
{
    $stmt = $pdo->prepare(
        "SELECT COUNT(DISTINCT p.id_stazione) AS n
         FROM sessioni_ricarica s
         INNER JOIN punti_ricarica p ON p.id_punto = s.id_punto
         WHERE s.id_utente = :u
           AND s.data_fine IS NOT NULL
           AND DATE(s.data_fine) = :d
           AND s.quantita_kwh > 0"
    );
    $stmt->execute(['u' => $idUtente, 'd' => $data]);
    return (int) ($stmt->fetch()['n'] ?? 0);
}

function somma_kwh_oggi(PDO $pdo, string $idUtente, string $data): float
{
    $stmt = $pdo->prepare(
        "SELECT COALESCE(SUM(quantita_kwh), 0) AS tot
         FROM sessioni_ricarica
         WHERE id_utente = :u AND data_fine IS NOT NULL AND DATE(data_fine) = :d"
    );
    $stmt->execute(['u' => $idUtente, 'd' => $data]);
    return (float) ($stmt->fetch()['tot'] ?? 0);
}

function conta_ricariche_oggi(PDO $pdo, string $idUtente, string $data): int
{
    $stmt = $pdo->prepare(
        "SELECT COUNT(*) AS n FROM sessioni_ricarica
         WHERE id_utente = :u AND data_fine IS NOT NULL AND DATE(data_fine) = :d AND quantita_kwh > 0"
    );
    $stmt->execute(['u' => $idUtente, 'd' => $data]);
    return (int) ($stmt->fetch()['n'] ?? 0);
}

/**
 * Aggiorna missioni dopo una ricarica e restituisce bonus XP delle missioni appena completate.
 *
 * @return array{missioni_completate: list<array>, xp_bonus_missioni: int}
 */
function aggiorna_missioni_giornaliere(
    PDO $pdo,
    string $idUtente,
    float $kwh,
    string $idStazione
): array {
    $oggi = date('Y-m-d');
    $def = missioni_giornaliere_definizioni();
    $completate = [];
    $xpBonus = 0;

    $ricariche = conta_ricariche_oggi($pdo, $idUtente, $oggi);
    $kwhTot = somma_kwh_oggi($pdo, $idUtente, $oggi);
    $stazioni = conta_stazioni_distinte_oggi($pdo, $idUtente, $oggi);

    $valori = [
        'ricarica_oggi' => (float) $ricariche,
        'kwh_oggi' => $kwhTot,
        'stazioni_oggi' => (float) $stazioni,
    ];

    foreach ($def as $codice => $m) {
        $prog = carica_progresso_missione($pdo, $idUtente, $oggi, $codice);
        $progresso = $valori[$codice];
        $target = (float) $m['target'];
        $eraCompletata = (bool) (int) $prog['completata'];
        $completata = $progresso >= $target;
        $bonusGia = (bool) (int) $prog['xp_bonus_riscosso'];

        salva_progresso_missione($pdo, $idUtente, $oggi, $codice, $progresso, $completata, $bonusGia || ($completata && $bonusGia));

        if ($completata && !$eraCompletata && !$bonusGia) {
            $xpMissione = (int) $m['xp_bonus'];
            $xpBonus += $xpMissione;
            salva_progresso_missione($pdo, $idUtente, $oggi, $codice, $progresso, true, true);
            $completate[] = [
                'codice' => $codice,
                'titolo' => $m['titolo'],
                'xp_bonus' => $xpMissione,
            ];
        }
    }

    return ['missioni_completate' => $completate, 'xp_bonus_missioni' => $xpBonus];
}

function formatta_missioni_per_utente(PDO $pdo, string $idUtente): array
{
    $oggi = date('Y-m-d');
    $def = missioni_giornaliere_definizioni();
    $lista = [];

    $ricariche = conta_ricariche_oggi($pdo, $idUtente, $oggi);
    $kwhTot = somma_kwh_oggi($pdo, $idUtente, $oggi);
    $stazioni = conta_stazioni_distinte_oggi($pdo, $idUtente, $oggi);
    $valori = [
        'ricarica_oggi' => (float) $ricariche,
        'kwh_oggi' => $kwhTot,
        'stazioni_oggi' => (float) $stazioni,
    ];

    foreach ($def as $codice => $m) {
        $prog = carica_progresso_missione($pdo, $idUtente, $oggi, $codice);
        $progresso = max((float) $prog['progresso'], $valori[$codice]);
        $target = (float) $m['target'];
        $completata = $progresso >= $target || (bool) (int) $prog['completata'];

        $lista[] = [
            'codice' => $codice,
            'titolo' => $m['titolo'],
            'descrizione' => $m['descrizione'],
            'target' => $target,
            'progresso' => min($progresso, $target),
            'progresso_raw' => $progresso,
            'unita' => $m['unita'],
            'xp_bonus' => (int) $m['xp_bonus'],
            'completata' => $completata,
            'percentuale' => $target > 0 ? min(100, round(($progresso / $target) * 100, 1)) : 100,
        ];
    }

    return $lista;
}

function formatta_profilo_gamification(array $profiloRow): array
{
    $xp = (int) $profiloRow['xp_totale'];
    $prog = progresso_livello($xp);

    return [
        'xp_totale' => $xp,
        'livello' => $prog['livello'],
        'xp_nel_livello' => $prog['xp_nel_livello'],
        'xp_per_prossimo_livello' => $prog['xp_per_prossimo_livello'],
        'percentuale_livello' => $prog['percentuale_livello'],
        'ricariche_completate' => (int) $profiloRow['ricariche_completate'],
        'kwh_totali' => (float) $profiloRow['kwh_totali'],
    ];
}

/**
 * Elabora XP al termine ricarica (solo utenti non admin, kwh > 0).
 */
function gamification_processa_ricarica_completata(
    PDO $pdo,
    string $idUtente,
    float $kwh,
    string $idStazione
): ?array {
    if (!gamification_tabelle_presenti($pdo)) {
        return null;
    }

    $stmt = $pdo->prepare('SELECT * FROM utenti WHERE id_utente = :id AND attivo = 1');
    $stmt->execute(['id' => $idUtente]);
    $utente = $stmt->fetch();
    if (!$utente || is_admin_utente($utente)) {
        return null;
    }

    if ($kwh < 0.001) {
        return null;
    }

    $profilo = get_or_create_profilo_gamification($pdo, $idUtente);
    $xpPrima = (int) $profilo['xp_totale'];
    $livelloPrima = livello_da_xp($xpPrima);

    $xpRicarica = xp_da_ricarica($kwh);
    $missioni = aggiorna_missioni_giornaliere($pdo, $idUtente, $kwh, $idStazione);
    $xpBonus = $missioni['xp_bonus_missioni'];
    $xpGuadagnati = $xpRicarica + $xpBonus;
    $xpDopo = $xpPrima + $xpGuadagnati;
    $livelloDopo = livello_da_xp($xpDopo);

    $pdo->prepare(
        'UPDATE utente_gamification
         SET xp_totale = :xp, livello = :liv, ricariche_completate = ricariche_completate + 1,
             kwh_totali = kwh_totali + :kwh
         WHERE id_utente = :id'
    )->execute([
        'xp' => $xpDopo,
        'liv' => $livelloDopo,
        'kwh' => $kwh,
        'id' => $idUtente,
    ]);

    $profiloAgg = get_or_create_profilo_gamification($pdo, $idUtente);

    return [
        'xp_guadagnati' => $xpGuadagnati,
        'xp_ricarica' => $xpRicarica,
        'xp_bonus_missioni' => $xpBonus,
        'xp_totale' => $xpDopo,
        'xp_prima' => $xpPrima,
        'livello' => $livelloDopo,
        'livello_prima' => $livelloPrima,
        'livello_salito' => $livelloDopo > $livelloPrima,
        'kwh_sessione' => round($kwh, 3),
        'missioni_completate' => $missioni['missioni_completate'],
        'profilo' => formatta_profilo_gamification($profiloAgg),
    ];
}

function classifica_utenti(PDO $pdo, int $limite = 50): array
{
    if (!gamification_tabelle_presenti($pdo)) {
        return [];
    }

    $limite = max(1, min(100, $limite));
    $adminId = ADMIN_UTENTE_ID;

    $sql = "
        SELECT u.id_utente, u.nome, u.cognome, u.email, u.tipo_account,
               g.xp_totale, g.livello, g.ricariche_completate, g.kwh_totali
        FROM utente_gamification g
        INNER JOIN utenti u ON u.id_utente = g.id_utente
        WHERE u.attivo = 1 AND u.id_utente != :admin
        ORDER BY g.xp_totale DESC, g.ricariche_completate DESC, u.data_registrazione ASC
        LIMIT {$limite}";

    $stmt = $pdo->prepare($sql);
    $stmt->execute(['admin' => $adminId]);

    $lista = [];
    $pos = 1;
    while ($row = $stmt->fetch()) {
        if (is_admin_utente($row)) {
            continue;
        }
        $nome = trim(($row['nome'] ?? '') . ' ' . ($row['cognome'] ?? ''));
        if ($nome === '') {
            $nome = explode('@', (string) ($row['email'] ?? 'Utente'))[0];
        }
        $lista[] = [
            'posizione' => $pos++,
            'id_utente' => $row['id_utente'],
            'nome_visualizzato' => $nome,
            'xp_totale' => (int) $row['xp_totale'],
            'livello' => (int) $row['livello'],
            'ricariche_completate' => (int) $row['ricariche_completate'],
            'kwh_totali' => round((float) $row['kwh_totali'], 2),
        ];
    }

    return $lista;
}

function gamification_profilo_completo(PDO $pdo, string $idUtente): ?array
{
    if (!gamification_tabelle_presenti($pdo)) {
        return null;
    }

    $stmt = $pdo->prepare('SELECT * FROM utenti WHERE id_utente = :id');
    $stmt->execute(['id' => $idUtente]);
    $utente = $stmt->fetch();
    if (!$utente || is_admin_utente($utente)) {
        return null;
    }

    $profilo = get_or_create_profilo_gamification($pdo, $idUtente);

    return [
        'profilo' => formatta_profilo_gamification($profilo),
        'missioni_oggi' => formatta_missioni_per_utente($pdo, $idUtente),
        'data_oggi' => date('Y-m-d'),
    ];
}
