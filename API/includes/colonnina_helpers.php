<?php

/**
 * Stato operativo colonnina per l'app (libera = online/standby pronta).
 */
function stato_colonnina_calcolato(string $statoHardware, bool $sessioneAperta): string
{
    if (in_array($statoHardware, ['guasto', 'manutenzione_programmata'], true)) {
        return 'fuori_servizio';
    }
    if ($sessioneAperta) {
        return 'occupata';
    }
    if ($statoHardware === 'offline') {
        return 'offline';
    }
    return 'libera';
}

function colonnina_utilizzabile(string $statoCalcolato): bool
{
    return !in_array($statoCalcolato, ['occupata', 'fuori_servizio'], true);
}

function nuovo_uuid_entita(): string
{
    $data = random_bytes(16);
    $data[6] = chr((ord($data[6]) & 0x0f) | 0x40);
    $data[8] = chr((ord($data[8]) & 0x3f) | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}
