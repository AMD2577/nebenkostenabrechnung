#!/bin/bash
# Doppelklick: verwirft ALLE Änderungen und stellt den zuletzt gesicherten Stand her.
# Die Notbremse - fragt vorher nach.
cd "$(dirname "$0")" || exit 1
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
echo "Diese Änderungen würden verworfen:"; echo
git status --short || { echo "Kein Git-Repository gefunden."; exit 1; }
echo
read -r -p "Wirklich alles zurücksetzen? (j = ja) " antwort
if [ "$antwort" = "j" ]; then
  git checkout . && node werkzeuge/baue.js >/dev/null && node werkzeuge/drucke.js >/dev/null
  echo; echo "Zurückgesetzt. Seite im Browser mit Cmd+R neu laden."
else
  echo; echo "Abgebrochen - es wurde nichts verändert."
fi
echo; echo "Dieses Fenster kann geschlossen werden."
