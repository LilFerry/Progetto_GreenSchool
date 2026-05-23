<?php

require_once __DIR__ . '/db.php';

const METODI_AVVIO_AMMESSI = ['APP', 'RFID', 'QR_CODE', 'ADMIN'];

function nuovo_uuid_sessione(): string
{
    $data = random_bytes(16);
    $data[6] = chr((ord($data[6]) & 0x0f) | 0x40);
    $data[8] = chr((ord($data[8]) & 0x3f) | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}

/** Deriva i tipi veicolo compatibili con un accumulatore dal nome. */
function tipi_veicolo_per_accumulatore(string $nomeAccumulatore): array
{
    $nome = mb_strtolower($nomeAccumulatore);
    if (strpos($nome, 'auto') !== false) {
        return ['auto'];
    }
    if (strpos($nome, 'bici') !== false || strpos($nome, 'monopatt') !== false) {
        return ['bici', 'monopattino'];
    }
    return ['auto', 'bici', 'monopattino'];
}

function seleziona_accumulatore(PDO $pdo, string $idStazione, string $tipoVeicolo): ?array
{
    $pattern = $tipoVeicolo === 'auto' ? '%Auto%' : '%Bici%';

    $stmt = $pdo->prepare(
        "SELECT * FROM accumulatori_stazione
         WHERE id_stazione = :id AND nome LIKE :pattern
         ORDER BY livello_corrente_kwh DESC
         LIMIT 1"
    );
    $stmt->execute(['id' => $idStazione, 'pattern' => $pattern]);
    $row = $stmt->fetch();
    if ($row) {
        return $row;
    }

    $stmt = $pdo->prepare(
        "SELECT * FROM accumulatori_stazione
         WHERE id_stazione = :id
         ORDER BY livello_corrente_kwh DESC
         LIMIT 1"
    );
    $stmt->execute(['id' => $idStazione]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function carica_accumulatore(PDO $pdo, string $idAccumulatore): ?array
{
    $stmt = $pdo->prepare(
        "SELECT id_accumulatore, id_stazione, nome, capacita_totale_kwh, capacita_utilizzabile_kwh,
                potenza_max_carica_kw, potenza_max_scarica_kw, livello_corrente_kwh,
                percentuale_carica, stato_operativo, data_ultimo_aggiornamento,
                soglia_minima_perc, soglia_massima_perc
         FROM accumulatori_stazione WHERE id_accumulatore = :id"
    );
    $stmt->execute(['id' => $idAccumulatore]);
    $row = $stmt->fetch();
    return $row ? formatta_accumulatore($row) : null;
}

function formatta_accumulatore(array $row): array
{
    return [
        'id_accumulatore' => $row['id_accumulatore'],
        'id_stazione' => $row['id_stazione'],
        'nome' => $row['nome'],
        'capacita_totale_kwh' => (float) $row['capacita_totale_kwh'],
        'capacita_utilizzabile_kwh' => (float) $row['capacita_utilizzabile_kwh'],
        'potenza_max_carica_kw' => (float) $row['potenza_max_carica_kw'],
        'potenza_max_scarica_kw' => (float) $row['potenza_max_scarica_kw'],
        'livello_corrente_kwh' => (float) $row['livello_corrente_kwh'],
        'percentuale_carica' => (float) $row['percentuale_carica'],
        'stato_operativo' => $row['stato_operativo'],
        'data_ultimo_aggiornamento' => $row['data_ultimo_aggiornamento'],
        'soglia_minima_perc' => (float) $row['soglia_minima_perc'],
        'soglia_massima_perc' => (float) $row['soglia_massima_perc'],
    ];
}

function carica_dati_post_sessione(PDO $pdo, string $idSessione): array
{
    $stmt = $pdo->prepare(
        "SELECT s.*, p.id_stazione, p.identificativo_fisico, p.tipo_veicolo
         FROM sessioni_ricarica s
         JOIN punti_ricarica p ON p.id_punto = s.id_punto
         WHERE s.id_sessione = :id"
    );
    $stmt->execute(['id' => $idSessione]);
    $sessione = $stmt->fetch();
    if (!$sessione) {
        return [];
    }

    $accRow = seleziona_accumulatore($pdo, $sessione['id_stazione'], $sessione['tipo_veicolo']);
    $acc = $accRow ? formatta_accumulatore($accRow) : null;

    return [
        'sessione' => [
            'id_sessione' => $sessione['id_sessione'],
            'id_punto' => $sessione['id_punto'],
            'id_utente' => $sessione['id_utente'],
            'data_inizio' => $sessione['data_inizio'],
            'data_fine' => $sessione['data_fine'],
            'quantita_kwh' => $sessione['quantita_kwh'] !== null ? (float) $sessione['quantita_kwh'] : null,
            'costo_totale' => (float) $sessione['costo_totale'],
            'stato_pagamento' => $sessione['stato_pagamento'],
            'identificativo_colonnina' => $sessione['identificativo_fisico'],
            'tipo_veicolo' => $sessione['tipo_veicolo'],
        ],
        'accumulatore' => $acc,
    ];
}

/** Chiude sessione su DB se il simulatore non risponde. */
function chiudi_sessione_su_db(PDO $pdo, string $idSessione, float $kwh = 0.0, float $costo = 0.0): void
{
    $pdo->prepare(
        "UPDATE sessioni_ricarica
         SET data_fine = NOW(), quantita_kwh = :kwh, costo_totale = :costo,
             stato_pagamento = CASE WHEN :costo > 0 THEN 'in_attesa_pagamento' ELSE 'gratuito' END
         WHERE id_sessione = :id AND data_fine IS NULL"
    )->execute(['kwh' => $kwh, 'costo' => $costo, 'id' => $idSessione]);

    $stmt = $pdo->prepare(
        "SELECT p.id_stazione, p.tipo_veicolo FROM sessioni_ricarica s
         JOIN punti_ricarica p ON p.id_punto = s.id_punto WHERE s.id_sessione = :id"
    );
    $stmt->execute(['id' => $idSessione]);
    $row = $stmt->fetch();
    if ($row) {
        $acc = seleziona_accumulatore($pdo, $row['id_stazione'], $row['tipo_veicolo']);
        if ($acc) {
            $pdo->prepare(
                "UPDATE accumulatori_stazione SET stato_operativo = 'standby' WHERE id_accumulatore = :a"
            )->execute(['a' => $acc['id_accumulatore']]);
        }
    }
}

function annulla_sessione(PDO $pdo, string $idSessione): void
{
    $pdo->prepare(
        "UPDATE sessioni_ricarica
         SET data_fine = NOW(), quantita_kwh = 0, costo_totale = 0,
             stato_pagamento = 'non_richiesto'
         WHERE id_sessione = :id AND data_fine IS NULL"
    )->execute(['id' => $idSessione]);

    $stmt = $pdo->prepare(
        "SELECT p.id_stazione, p.tipo_veicolo FROM sessioni_ricarica s
         JOIN punti_ricarica p ON p.id_punto = s.id_punto
         WHERE s.id_sessione = :id"
    );
    $stmt->execute(['id' => $idSessione]);
    $row = $stmt->fetch();
    if ($row) {
        $acc = seleziona_accumulatore($pdo, $row['id_stazione'], $row['tipo_veicolo']);
        if ($acc) {
            $pdo->prepare(
                "UPDATE accumulatori_stazione SET stato_operativo = 'standby' WHERE id_accumulatore = :id"
            )->execute(['id' => $acc['id_accumulatore']]);
        }
    }
}
