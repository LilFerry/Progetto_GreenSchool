# Copia le API PHP in C:\xampp\htdocs (eseguire dopo ogni modifica alle API)
$src = Split-Path -Parent $MyInvocation.MyCommand.Path
$dst = "C:\xampp\htdocs"

if (-not (Test-Path $dst)) {
    Write-Error "Cartella XAMPP htdocs non trovata: $dst"
    exit 1
}

Copy-Item "$src\*.php" -Destination $dst -Force
if (Test-Path "$src\includes") {
    New-Item -ItemType Directory -Path "$dst\includes" -Force | Out-Null
    Copy-Item "$src\includes\*" -Destination "$dst\includes\" -Force
}

Write-Host "API copiate in $dst"
Write-Host "Test: http://localhost/colonnine_stazione.php?id_stazione=..."
