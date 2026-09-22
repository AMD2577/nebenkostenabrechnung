# Fremdbibliothek

| Datei | Was | Version | Herkunft | Lizenz |
|---|---|---|---|---|
| `pdf.min.js`, `pdf.worker.min.js` | PDF.js — liest Text aus PDF-Dateien im Browser | 3.11.174 | cdnjs.cloudflare.com | Apache 2.0 (Mozilla) |

**Warum mitgeliefert und nicht nachgeladen:** Die Lösung soll ohne Internet funktionieren
(Doppelklick auf die HTML-Datei). Ein Nachladen aus dem Netz würde diese Zusage brechen.

**Warum Version 3 und nicht 4:** Version 4 wird als ES-Modul ausgeliefert; Modul-Skripte werden von
Browsern aus `file://` blockiert. Version 3 ist ein klassisches Skript und läuft auch beim
Doppelklick. Getestet: PDF.js weicht dabei automatisch auf die Verarbeitung im Hauptthread aus,
wenn der Worker nicht geladen werden kann.

**Ohne diese Dateien** funktioniert alles weiter — nur das Einlesen per PDF nicht. Belege lassen
sich dann über eingefügten Text oder das Formular erfassen.
