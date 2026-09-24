#!/bin/bash
# Doppelklick: erzeugt Oberfläche, Prüfprotokoll und die fünf PDF-Abrechnungen neu.
# Nötig nach jeder Änderung an daten/fall_2025.json.
#
# Vorher wird geprüft, ob sich seit der letzten Erfassung ein Originaldokument
# geändert hat. Grund: Wer ein PDF in 01_Unterlagen austauscht, ändert damit
# NICHT die Abrechnung - die Daten stehen in daten/fall_2025.json. Ohne diesen
# Hinweis baut man ahnungslos den alten Stand neu.
cd "$(dirname "$0")" || exit 1
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

node werkzeuge/pruefe_unterlagen.js > /tmp/nk_unterlagen.txt 2>&1
if [ $? -ne 0 ]; then
  echo "═══════════════════════════════════════════════════════════════"
  echo "  ACHTUNG: Die Originalunterlagen passen nicht mehr zu den Daten"
  echo "═══════════════════════════════════════════════════════════════"
  echo
  cat /tmp/nk_unterlagen.txt
  echo
  echo "Es wird trotzdem gebaut - aber mit dem BISHERIGEN Datenstand."
  echo "Die Änderung am Dokument wirkt sich erst aus, wenn sie in der"
  echo "Falldatei nachgezogen ist (Oberfläche, Reiter Belege)."
  echo
  echo "───────────────────────────────────────────────────────────────"
  echo
fi
rm -f /tmp/nk_unterlagen.txt

echo "Baue die Lösung neu …"; echo
node werkzeuge/baue.js && node werkzeuge/drucke.js
echo; echo "Fertig. Seite im Browser mit Cmd+R neu laden."
echo "Dieses Fenster kann geschlossen werden."
