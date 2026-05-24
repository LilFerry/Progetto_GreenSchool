"""Stato accumulatore a riposo in base a percentuale e soglia minima DB."""


def stato_idle_da_percentuale(percentuale: float, soglia_minima: float) -> str:
    return "attivo" if percentuale > soglia_minima else "offline"
