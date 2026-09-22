/* =============================================================================
 * HABEN SICH DIE ORIGINALUNTERLAGEN GEÄNDERT?
 * =============================================================================
 *
 * AUFRUF:   node werkzeuge/pruefe_unterlagen.js
 *           node werkzeuge/pruefe_unterlagen.js --uebernehmen
 *
 * WOZU
 * Die Falldatei (daten/fall_2025.json) ist aus den PDF-Dokumenten in
 * 01_Unterlagen entstanden. Tauscht jemand dort ein Dokument aus, legt ein
 * neues dazu oder entfernt eines, dann passt die Falldatei nicht mehr zu ihrer
 * Grundlage - und das sieht man ihr nicht an.
 *
 * Dieses Werkzeug vergleicht beide Seiten und sagt genau, was zu tun ist.
 * Es ändert nichts, es berichtet nur.
 *
 * WIE ES DAS MACHT
 * Beim Erfassen wurde zu jedem Dokument eine Prüfsumme gespeichert (SHA-256,
 * ein Fingerabdruck der Datei). Ändert sich auch nur ein Zeichen im PDF, ändert
 * sich der Fingerabdruck. Der Vergleich ist damit zuverlässiger als ein Blick
 * auf Dateiname oder Datum.
 *
 * WARUM DANACH TROTZDEM EIN MENSCH GEFRAGT IST
 * Ein geändertes Dokument lässt sich nicht automatisch neu verarbeiten. Ob eine
 * Position umlagefähig ist, ist eine fachliche Entscheidung - sie steht in der
 * Falldatei und kann nicht aus dem PDF zurückgerechnet werden. Das Werkzeug
 * zeigt deshalb die Stellen, die jemand ansehen muss.
 *
 * MIT --uebernehmen
 * Setzt die Prüfsummen auf den heutigen Stand der Dokumente. Das ist der letzte
 * Schritt, NACHDEM die Falldatei wieder zu den Unterlagen passt - niemals
 * vorher: Sonst gilt ein nicht geprüfter Stand als geprüft.
 * ========================================================================== */

const fs = require("fs");
const pfad = require("path");
const crypto = require("crypto");

const WURZEL = pfad.join(__dirname, "..");
const UNTERLAGEN = pfad.join(WURZEL, "01_Unterlagen");
const fall = JSON.parse(fs.readFileSync(pfad.join(WURZEL, "daten", "fall_2025.json"), "utf8"));

/** Alle PDF-Dateien unterhalb eines Ordners einsammeln. */
function allePdf(ordner, liste = []) {
  for (const eintrag of fs.readdirSync(ordner, { withFileTypes: true })) {
    const voll = pfad.join(ordner, eintrag.name);
    if (eintrag.isDirectory()) allePdf(voll, liste);
    else if (eintrag.name.toLowerCase().endsWith(".pdf")) liste.push(voll);
  }
  return liste;
}

const fingerabdruck = (datei) =>
  crypto.createHash("sha256").update(fs.readFileSync(datei)).digest("hex");

/**
 * Bringt einen Dateinamen auf eine einheitliche Schreibweise.
 *
 * Hintergrund: Umlaute lassen sich auf zwei Arten speichern - als ein Zeichen
 * ("ä") oder als zwei ("a" plus Pünktchen). macOS nutzt die zweite Form, die
 * meisten anderen Systeme die erste. Für das Auge ist beides identisch, für
 * einen Textvergleich nicht. Ohne diese Umwandlung gilt "März" nach einem
 * Klonen des Projekts gleichzeitig als neue und als fehlende Datei.
 */
const einheitlich = (name) => name.normalize("NFC");

// --- Ist-Zustand auf der Festplatte -----------------------------------------
const aufPlatte = new Map();
for (const voll of allePdf(UNTERLAGEN)) {
  aufPlatte.set(einheitlich(pfad.relative(UNTERLAGEN, voll)), fingerabdruck(voll));
}

// --- Soll-Zustand laut Falldatei --------------------------------------------
const lautFalldatei = new Map((fall.unterlagen || []).map((u) => [einheitlich(u.datei), u.sha256]));

if (lautFalldatei.size === 0) {
  console.log("Die Falldatei enthält keine Prüfsummen - ein Vergleich ist nicht möglich.");
  process.exit(1);
}

// --- Vergleich ---------------------------------------------------------------
const unveraendert = [], geaendert = [], neu = [], fehlt = [];

for (const [datei, summe] of aufPlatte) {
  if (!lautFalldatei.has(datei)) neu.push(datei);
  else if (lautFalldatei.get(datei) !== summe) geaendert.push(datei);
  else unveraendert.push(datei);
}
for (const datei of lautFalldatei.keys()) {
  if (!aufPlatte.has(datei)) fehlt.push(datei);
}

/** Zu einem Dateinamen den erfassten Beleg finden (falls es einer ist). */
const belegZu = (datei) => fall.belege.find((b) => datei.endsWith(b.beleg));

console.log(`Vergleich 01_Unterlagen  ↔  daten/fall_2025.json`);
console.log(`${"─".repeat(70)}`);
console.log(`unverändert: ${unveraendert.length} von ${lautFalldatei.size} Dokumenten`);

if (!geaendert.length && !neu.length && !fehlt.length) {
  console.log("\nAlles in Ordnung: Die Falldatei passt zu den Originalunterlagen.");
  process.exit(0);
}

if (geaendert.length) {
  console.log(`\nGEÄNDERT (${geaendert.length}) - Inhalt weicht von der Erfassung ab:`);
  for (const datei of geaendert) {
    const beleg = belegZu(datei);
    console.log(`  ${datei}`);
    if (beleg) {
      console.log(`      erfasst als: ${beleg.lieferant}, ${beleg.datum}, ` +
        `${beleg.rechnungsbetrag.toFixed(2)} €, ${beleg.positionen.length} Position(en)`);
      console.log(`      zu tun: Dokument in der Oberfläche unter "Beleg erfassen" neu einlesen`);
      console.log(`              und mit der erfassten Fassung vergleichen.`);
    } else {
      console.log(`      zu tun: prüfen, ob sich dadurch Stammdaten ändern ` +
        `(Wohnflächen, Mietverhältnisse, Kontoauszüge).`);
    }
  }
}

if (neu.length) {
  console.log(`\nNEU (${neu.length}) - liegt im Ordner, ist aber nicht erfasst:`);
  for (const datei of neu) {
    console.log(`  ${datei}`);
    console.log(`      zu tun: in der Oberfläche unter "Beleg erfassen" einlesen und zuordnen.`);
  }
}

if (fehlt.length) {
  console.log(`\nFEHLT (${fehlt.length}) - erfasst, aber nicht mehr im Ordner:`);
  for (const datei of fehlt) {
    const beleg = belegZu(datei);
    console.log(`  ${datei}${beleg ? `  (${beleg.rechnungsbetrag.toFixed(2)} € fließen weiter in die Abrechnung ein)` : ""}`);
    console.log(`      zu tun: Datei wiederherstellen - oder den Beleg aus der Falldatei entfernen,`);
    console.log(`              falls er zu Recht weggefallen ist. Ohne Beleg ist keine Belegeinsicht möglich.`);
  }
}

console.log(`\n${"─".repeat(70)}`);

if (process.argv.includes("--uebernehmen")) {
  // Der Stand der Dokumente wird zum neuen Soll. Nur sinnvoll, wenn die
  // Falldatei vorher an die Änderungen angepasst wurde.
  fall.unterlagen = [...aufPlatte.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([datei, sha256]) => ({
      datei: einheitlich(datei),
      sha256,
      groesse: fs.statSync(pfad.join(UNTERLAGEN, datei)).size,
    }));
  fall.protokoll = fall.protokoll || [];
  fall.protokoll.push({
    zeitpunkt: new Date().toISOString().slice(0, 10),
    wer: "pruefe_unterlagen --uebernehmen",
    was: `Prüfsummen auf den aktuellen Stand gesetzt ` +
      `(${geaendert.length} geändert, ${neu.length} neu, ${fehlt.length} entfernt)`,
    warum: "Die Falldatei wurde an die geänderten Unterlagen angepasst.",
  });
  fs.writeFileSync(pfad.join(WURZEL, "daten", "fall_2025.json"),
    JSON.stringify(fall, null, 2) + "\n", "utf8");
  console.log("Prüfsummen übernommen. Bitte jetzt: node werkzeuge/baue.js && node test/alles.js");
  process.exit(0);
}

console.log("Nächste Schritte:");
console.log("  1. die oben genannten Stellen in der Oberfläche prüfen und die Falldatei anpassen");
console.log("  2. node werkzeuge/baue.js   (Oberfläche, PDF-Abrechnungen und Prüfprotokoll neu erzeugen)");
console.log("  3. node test/alles.js       (alle Prüfungen)");
console.log("  4. node werkzeuge/pruefe_unterlagen.js --uebernehmen   (Prüfsummen auf den neuen Stand setzen)");
process.exit(1);
