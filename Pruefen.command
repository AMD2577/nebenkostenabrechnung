#!/bin/bash
# Doppelklick: führt alle Tests aus und vergleicht die Falldatei mit den Original-PDFs.
cd "$(dirname "$0")" || exit 1
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
node test/alles.js
echo; echo "--- Abgleich mit den Originalunterlagen ---"
node werkzeuge/pruefe_unterlagen.js
echo; echo "Dieses Fenster kann geschlossen werden."
