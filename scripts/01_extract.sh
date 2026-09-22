#!/usr/bin/env bash
# Schritt 1: Alle PDFs aus 01_Unterlagen als Text nach 02_extracted spiegeln (pdftotext -layout).
# Die PDFs sind textbasiert (keine Scans) – kein OCR nötig. Idempotent, verändert die Originale nicht.
set -euo pipefail
cd "$(dirname "$0")/.."
command -v pdftotext >/dev/null || { echo "pdftotext fehlt (brew install poppler)"; exit 1; }
find 01_Unterlagen -name '*.pdf' | while read -r f; do
  out="02_extracted/${f#01_Unterlagen/}"; out="${out%.pdf}.txt"
  mkdir -p "$(dirname "$out")"
  pdftotext -layout "$f" "$out"
done
echo "extrahiert: $(find 02_extracted -name '*.txt' | wc -l | tr -d ' ') Textdateien"
