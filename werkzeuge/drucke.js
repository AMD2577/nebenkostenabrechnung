/* =============================================================================
 * DIE FÜNF ABRECHNUNGEN ALS EINZELNE PDF-DATEIEN
 * =============================================================================
 *
 * AUFRUF:   node werkzeuge/drucke.js
 * ERGEBNIS: dist/Abrechnung_2025_<Mietverhältnis>.pdf  (fünf Dateien)
 *
 * WOZU, wenn man in der Oberfläche doch drucken kann?
 * Für den Versand per E-Mail braucht man je Mieter eine eigene Datei. Dieses
 * Skript erzeugt sie mit demselben Schreiben und derselben Gestaltung wie die
 * Oberfläche - es gibt keine zweite Fassung des Dokuments.
 *
 * VORAUSSETZUNG: Google Chrome auf dem Rechner. Chrome druckt die Seite still
 * im Hintergrund nach PDF. Ist Chrome nicht da, bricht das Skript mit einem
 * Hinweis ab; drucken über die Oberfläche geht dann immer noch.
 * ========================================================================== */

const fs = require("fs");
const pfad = require("path");
const { execFileSync } = require("child_process");

const WURZEL = pfad.join(__dirname, "..");
const lies = (...t) => fs.readFileSync(pfad.join(WURZEL, ...t), "utf8");

// --- Chrome finden -----------------------------------------------------------
function findeChrome() {
  const kandidaten = [
    process.env.CHROME,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  ];
  return kandidaten.find((p) => p && fs.existsSync(p));
}

const chrome = findeChrome();
if (!chrome) {
  console.error("Google Chrome wurde nicht gefunden.");
  console.error("Entweder Chrome installieren, den Pfad über CHROME=... angeben,");
  console.error("oder in der Oberfläche über 'Alle Abrechnungen drucken' als PDF speichern.");
  process.exit(1);
}

// --- Rechnen (wie überall: derselbe Rechenkern) ------------------------------
global.self = global;
global.Nebenkosten = require(pfad.join(WURZEL, "rechenkern", "nebenkosten.js"));
require(pfad.join(WURZEL, "app", "schreiben.js"));

const fall = JSON.parse(lies("daten", "fall_2025.json"));
const ergebnis = global.Nebenkosten.berechne(fall);
const stil = lies("app", "stil.css");

// Die Jahreszahl steht nirgends fest im Code - sie kommt aus dem Zeitraum der
// Falldatei. Rechnet man ein anderes Jahr ab, heißen die Dateien automatisch so.
const zeitraum = global.Schreiben.zeitraumBezeichnung(ergebnis.abrechnung);
const jahrKurz = zeitraum.kurz.replace(/[^0-9A-Za-z]+/g, "_");

fs.mkdirSync(pfad.join(WURZEL, "dist"), { recursive: true });
const temp = fs.mkdtempSync(pfad.join(require("os").tmpdir(), "abrechnung-"));

console.log("Drucke die Abrechnungen:");
for (const m of ergebnis.mietverhaeltnisse) {
  // Eine Minimalseite, die nur dieses eine Schreiben enthält. Die Druckregeln
  // aus stil.css greifen, weil das Schreiben in #druckbereich steht.
  const seite = `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8">
<title>Betriebskostenabrechnung ${zeitraum.kurz} – ${m.we} ${m.mieter}</title>
<style>${stil}</style></head>
<body><div id="druckbereich">${global.Schreiben.schreibenFertig(m, ergebnis)}</div></body></html>`;

  const htmlDatei = pfad.join(temp, `${m.id}.html`);
  const pdfDatei = pfad.join(WURZEL, "dist", `Abrechnung_${jahrKurz}_${m.id}.pdf`);
  fs.writeFileSync(htmlDatei, seite, "utf8");

  execFileSync(chrome, [
    "--headless=new", "--disable-gpu", "--no-pdf-header-footer",
    `--print-to-pdf=${pdfDatei}`,
    "file://" + htmlDatei,
  ], { stdio: "ignore" });

  const gesperrt = global.Schreiben.schreibenFertig(m, ergebnis).includes("entwurfsband");
  const groesse = (fs.statSync(pdfDatei).size / 1024).toFixed(0);
  console.log(`  Abrechnung_${jahrKurz}_${m.id}.pdf  (${groesse} KB)` +
    `  ${m.ergebnis} ${global.Nebenkosten.alsEuroText(Math.abs(m.saldo_cent))}` +
    (gesperrt ? "   ← ENTWURF, nicht versenden" : ""));
}

fs.rmSync(temp, { recursive: true, force: true });
console.log("\nFertig. Die Dateien liegen in dist/.");
