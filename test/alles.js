/* =============================================================================
 * ALLE TESTS AUF EINMAL
 * =============================================================================
 * AUFRUF: node test/alles.js
 *
 * Führt die drei Testdateien nacheinander aus und fasst zusammen:
 *   pruefe.js            Rechnen, Prüfkatalog, Stellschrauben, Schreiben
 *   pruefe_einlesen.js   Belege aus PDF/Text einlesen
 *   pruefe_dokumente.js  Dokumente und erzeugte Dateien auf aktuellem Stand
 * ========================================================================== */

const { spawnSync } = require("child_process");
const pfad = require("path");

const dateien = ["pruefe.js", "pruefe_einlesen.js", "pruefe_dokumente.js"];
let fehlgeschlagen = 0;

for (const datei of dateien) {
  console.log(`\n${"─".repeat(70)}\n▶ ${datei}\n${"─".repeat(70)}`);
  const lauf = spawnSync(process.execPath, [pfad.join(__dirname, datei)], { stdio: "inherit" });
  if (lauf.status !== 0) fehlgeschlagen++;
}

console.log(`\n${"=".repeat(70)}`);
console.log(fehlgeschlagen === 0
  ? `ALLES IN ORDNUNG – ${dateien.length} Testdateien ohne Fehler`
  : `${fehlgeschlagen} von ${dateien.length} Testdateien mit Fehlern`);
console.log("=".repeat(70));
process.exit(fehlgeschlagen === 0 ? 0 : 1);
