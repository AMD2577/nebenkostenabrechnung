/* =============================================================================
 * TEST: STIMMEN DIE DOKUMENTE MIT DEM AKTUELLEN STAND ÜBEREIN?
 * =============================================================================
 *
 * AUFRUF: node test/pruefe_dokumente.js
 *
 * WARUM ES DIESEN TEST GIBT
 * Die Zahlen stehen an vielen Stellen: im Rechenkern, in den fünf Schreiben,
 * im README, in den Annahmen, im Bewirtschaftungs-Check, im Prüfprotokoll und
 * in den erzeugten PDF-Dateien. Ändert sich eine Regel - wie beim Wechsel auf
 * die centgenaue Verteilung, bei dem sich drei Salden um je einen Cent
 * verschoben haben -, muss das überall ankommen.
 *
 * Genau das ist schon einmal schiefgegangen: Nach der Korrektur lagen im
 * Ausgabeordner noch PDF-Dateien mit den alten Beträgen (286,27 statt 286,28).
 * Verschickt man so etwas, ist der Schaden größer als der ursprüngliche Fehler.
 *
 * Dieser Test vergleicht deshalb die Dokumente gegen das, was der Rechenkern
 * heute ausgibt - und schlägt an, sobald etwas veraltet ist.
 * ========================================================================== */

const fs = require("fs");
const pfad = require("path");
const { execFileSync, spawnSync } = require("child_process");
const N = require("../rechenkern/nebenkosten.js");

const WURZEL = pfad.join(__dirname, "..");
const lies = (...t) => fs.readFileSync(pfad.join(WURZEL, ...t), "utf8");
const existiert = (...t) => fs.existsSync(pfad.join(WURZEL, ...t));

let bestanden = 0, fehlgeschlagen = 0;
function test(beschreibung, fn) {
  try { fn(); console.log(`  ok    ${beschreibung}`); bestanden++; }
  catch (f) { console.log(`  FEHLER ${beschreibung}\n         ${f.message}`); fehlgeschlagen++; }
}

const fall = JSON.parse(lies("daten", "fall_2025.json"));
const ergebnis = N.berechne(fall);

// Die Salden, wie sie heute gelten - als deutscher Text, so wie sie in den
// Dokumenten stehen.
const aktuelleSalden = ergebnis.mietverhaeltnisse.map((m) => ({
  id: m.id,
  mieter: m.mieter,
  text: N.alsEuroText(Math.abs(m.saldo_cent)).replace(" €", ""),
}));

console.log("\n1. Erzeugte Dateien sind auf dem Stand der Falldatei");

test("app/fall.js entspricht daten/fall_2025.json", () => {
  const eingebettet = lies("app", "fall.js").replace(/^[\s\S]*?window\.FALL = /, "").replace(/;\s*$/, "");
  if (JSON.stringify(JSON.parse(eingebettet)) !== JSON.stringify(fall)) {
    throw new Error("app/fall.js ist veraltet - 'node werkzeuge/baue.js' ausführen");
  }
});

test("dist/ enthält den aktuellen Rechenkern und die aktuellen Falldaten", () => {
  // Wichtig: Die Salden stehen NICHT als Text in der HTML-Datei - sie werden
  // beim Öffnen aus den Falldaten gerechnet. Geprüft wird deshalb, ob der
  // Rechenkern und die heutige Falldatei eingebettet sind.
  if (!existiert("dist", "Nebenkostenabrechnung_2025.html")) throw new Error("dist fehlt - bauen");
  const html = lies("dist", "Nebenkostenabrechnung_2025.html");
  if (!html.includes("verteileCentgenau")) throw new Error("Rechenkern fehlt in der gebauten Datei");
  if (!html.includes("schlageBelegVor")) throw new Error("Beleg-Einlesen fehlt in der gebauten Datei");

  const eingebettet = /window\.FALL = ([\s\S]*?);\n/.exec(html);
  if (!eingebettet) throw new Error("keine Falldaten in der gebauten Datei");
  if (JSON.stringify(JSON.parse(eingebettet[1])) !== JSON.stringify(fall)) {
    throw new Error("die eingebauten Falldaten sind veraltet - 'node werkzeuge/baue.js' ausführen");
  }
});

test("die fünf PDF-Dateien tragen die heutigen Beträge", () => {
  let pdftotextDa = true;
  try { execFileSync("pdftotext", ["-v"], { stdio: "ignore" }); } catch { pdftotextDa = false; }
  if (!pdftotextDa) { console.log("         (übersprungen: pdftotext nicht installiert)"); return; }

  for (const s of aktuelleSalden) {
    const datei = pfad.join(WURZEL, "dist", `Abrechnung_2025_${s.id}.pdf`);
    if (!fs.existsSync(datei)) throw new Error(`${pfad.basename(datei)} fehlt - 'node werkzeuge/drucke.js'`);
    const text = execFileSync("pdftotext", ["-layout", datei, "-"], { encoding: "utf8" });
    if (!text.includes(s.text)) {
      throw new Error(`${pfad.basename(datei)} enthält ${s.text} nicht - PDF ist veraltet`);
    }
  }
});

test("das Prüfprotokoll gehört zum heutigen Stand", () => {
  const protokoll = lies("dist", "Pruefprotokoll.md");
  for (const s of aktuelleSalden) {
    if (!protokoll.includes(s.text)) throw new Error(`Saldo ${s.text} (${s.id}) fehlt im Prüfprotokoll`);
  }
});

test("die Falldatei passt zu den Originalunterlagen", () => {
  // Wird ein PDF in 01_Unterlagen ausgetauscht, ergänzt oder entfernt, passt
  // die Falldatei nicht mehr zu ihrer Grundlage. Das Werkzeug meldet das mit
  // Rückgabewert 1.
  const lauf = spawnSync(process.execPath,
    [pfad.join(WURZEL, "werkzeuge", "pruefe_unterlagen.js")], { encoding: "utf8" });
  if (lauf.status !== 0) {
    throw new Error("Unterlagen und Falldatei weichen ab:\n" + lauf.stdout.trim());
  }
});

console.log("\n2. Keine veralteten Beträge in den Übergabedokumenten");

// Salden aus der Fassung vor der Rundungskorrektur. Stünde einer davon noch in
// einem Übergabedokument, wäre dort ein FALSCHER Betrag für einen konkreten
// Mieter genannt - das muss ausgeschlossen sein.
//
// Nicht in dieser Liste: die alte Gesamtsumme 8.898,30 € und der alte
// WE-3-Wert 2.989,84 €. Beide werden in README und Annahmen bewusst zitiert,
// um zu erklären, warum die Rundungsregel gewechselt hat. Ein erklärter
// historischer Wert ist kein veralteter Wert.
const VERALTET = ["286,27", "253,28", "325,42", "175,42", "1.726,27", "1.253,28", "1.975,42"];
const ZU_PRUEFEN = ["README.md", "TECHNIK.md", "ANNAHMEN_UND_RUECKFRAGEN.md", "BEWIRTSCHAFTUNGS_CHECK.md"];

test("README, Technik, Annahmen und Bewirtschaftungs-Check nennen keine alten Beträge", () => {
  const funde = [];
  for (const datei of ZU_PRUEFEN) {
    const inhalt = lies(datei);
    for (const alt of VERALTET) {
      if (inhalt.includes(alt)) funde.push(`${datei}: ${alt}`);
    }
  }
  if (funde.length) throw new Error(funde.join(", "));
});

test("SPEC.md weist die alten Beträge ausdrücklich als behoben aus", () => {
  const spec = lies("SPEC.md");
  if (!spec.includes("Status: behoben")) {
    throw new Error("SPEC.md nennt alte Beträge, kennzeichnet sie aber nicht als behoben");
  }
});

console.log("\n3. Kennzahlen stimmen mit der Rechnung überein");

test("README nennt die heutigen Summen und Salden", () => {
  const readme = lies("README.md");
  const pflicht = [
    N.alsEuroText(ergebnis.summe_umlagefaehig_cent).replace(" €", ""),
    N.alsEuroText(ergebnis.summe_nicht_umlagefaehig_cent).replace(" €", ""),
    N.alsEuroText(ergebnis.summe_belege_cent).replace(" €", ""),
    ...aktuelleSalden.map((s) => s.text),
  ];
  const fehlend = pflicht.filter((wert) => !readme.includes(wert));
  if (fehlend.length) throw new Error("im README nicht zu finden: " + fehlend.join(", "));
});

test("keine Verweise auf entfernte Dateien", () => {
  const entfernt = ["03_data/", "config.json", "computed.json", "overlay/", "konvertiere_v1"];
  const funde = [];
  for (const datei of [...ZU_PRUEFEN, "SPEC.md"]) {
    const inhalt = lies(datei);
    for (const weg of entfernt) {
      if (inhalt.includes(weg)) funde.push(`${datei}: ${weg}`);
    }
  }
  if (funde.length) throw new Error(funde.join(", "));
});

test("jede offene Warnung taucht in den Annahmen und Rückfragen auf", () => {
  // SPEC.md § 5.1: Eine Warnung darf nie stillschweigend bleiben.
  const annahmen = lies("ANNAHMEN_UND_RUECKFRAGEN.md").toLowerCase();
  const warnungen = ergebnis.pruefungen.filter((p) => !p.bestanden);
  const stichwoerter = { "P-02": "oktober", "P-02b": "staffel" };
  for (const w of warnungen) {
    const wort = stichwoerter[w.id];
    if (wort && !annahmen.includes(wort)) {
      throw new Error(`Warnung ${w.id} (${w.titel}) fehlt in den Annahmen`);
    }
  }
});

console.log(`\n${"=".repeat(70)}`);
if (fehlgeschlagen === 0) console.log(`ALLE TESTS BESTANDEN (${bestanden} Tests)`);
else console.log(`${fehlgeschlagen} TEST(S) FEHLGESCHLAGEN (${bestanden} bestanden)`);
console.log("=".repeat(70));
process.exit(fehlgeschlagen === 0 ? 0 : 1);
