<?php

/**
 * Stato a riposo dell'accumulatore in base alla percentuale e alla soglia minima DB.
 */
function stato_idle_da_percentuale(float $percentuale, float $sogliaMinima): string
{
    return $percentuale > $sogliaMinima ? 'attivo' : 'offline';
}

/**
 * Aggiorna stato_operativo a attivo/offline se non in carica/scarica/guasto/manutenzione.
 */
function applica_stato_idle_accumulatore(PDO $pdo, string $idAccumulatore): void
{
    $stmt = $pdo->prepare(
        "SELECT percentuale_carica, soglia_minima_perc, stato_operativo
         FROM accumulatori_stazione WHERE id_accumulatore = :id"
    );
    $stmt->execute(['id' => $idAccumulatore]);
    $row = $stmt->fetch();
    if (!$row) {
        return;
    }

    $stato = (string) $row['stato_operativo'];
    if (in_array($stato, ['scarica', 'carica', 'guasto', 'manutenzione'], true)) {
        return;
    }

    $nuovo = stato_idle_da_percentuale(
        (float) $row['percentuale_carica'],
        (float) $row['soglia_minima_perc']
    );

    $pdo->prepare(
        "UPDATE accumulatori_stazione
         SET stato_operativo = :stato, data_ultimo_aggiornamento = NOW()
         WHERE id_accumulatore = :id AND stato_operativo NOT IN ('scarica','carica','guasto','manutenzione')"
    )->execute(['stato' => $nuovo, 'id' => $idAccumulatore]);
}

/** Normalizza standby legacy e allinea lo stato mostrato alla soglia. */
function normalizza_stato_accumulatore_riga(array $row): array
{
    $stato = (string) ($row['stato_operativo'] ?? '');
    if (in_array($stato, ['scarica', 'carica', 'guasto', 'manutenzione'], true)) {
        return $row;
    }

    $perc = (float) ($row['percentuale_carica'] ?? 0);
    $soglia = (float) ($row['soglia_minima_perc'] ?? 0);
    $row['stato_operativo'] = stato_idle_da_percentuale($perc, $soglia);

    return $row;
}

function accumulatore_utilizzabile(array $row): bool
{
    $row = normalizza_stato_accumulatore_riga($row);
    $stato = (string) $row['stato_operativo'];

    if (in_array($stato, ['guasto', 'manutenzione', 'offline'], true)) {
        return false;
    }

    return (float) ($row['livello_corrente_kwh'] ?? 0) > 0.01;
}
