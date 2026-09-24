#!/bin/bash
# Doppelklick: erzeugt Oberfläche, Prüfprotokoll und die fünf PDF-Abrechnungen neu.
# Nötig nach jeder Änderung an daten/fall_2025.json.
cd "$(dirname "$0")" || exit 1
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
echo "Baue die Lösung neu …"; echo
node werkzeuge/baue.js && node werkzeuge/drucke.js
echo; echo "Fertig. Seite im Browser mit Cmd+R neu laden."
echo "Dieses Fenster kann geschlossen werden."
