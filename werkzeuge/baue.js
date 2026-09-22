/* =============================================================================
 * BAUEN: aus den Quelldateien EINE versendbare Datei machen
 * =============================================================================
 *
 * AUFRUF:   node werkzeuge/baue.js
 * ERGEBNIS: dist/Nebenkostenabrechnung_2025.html   (Oberfläche, alles enthalten)
 *           dist/vendor/                            (PDF.js zum Einlesen von Belegen)
 *           dist/Pruefprotokoll.md                  (Nachweis aller Prüfungen)
 *           dist/Nebenkostenabrechnung_2025.zip     (alles zusammen zum Verschicken)
 *
 * WARUM EINE EINZIGE DATEI
 * Der Empfänger soll nichts installieren und nichts starten müssen: Datei per
 * Doppelklick öffnen, fertig. Deshalb werden CSS, Daten und JavaScript in das
 * HTML hineinkopiert. Zum Entwickeln bleibt app/index.html mit getrennten
 * Dateien bestehen - beides zeigt dasselbe, weil beides aus denselben Quellen
 * gebaut wird.
 *
 * WICHTIG: Dieses Skript ERSETZT app/fall.js aus daten/fall_2025.json. Die
 * Falldatei ist die Quelle, app/fall.js ist nur die Browserfassung davon.
 * ========================================================================== */

const fs = require("fs");
const pfad = require("path");

const WURZEL = pfad.join(__dirname, "..");
const lies = (...teile) => fs.readFileSync(pfad.join(WURZEL, ...teile), "utf8");

// --- 1. Falldatei laden und als Browserfassung ablegen -----------------------
const fallText = lies("daten", "fall_2025.json");
const fallJs =
  "/* Erzeugt von werkzeuge/baue.js - nicht von Hand ändern.\n" +
  "   Die Falldaten als JavaScript, damit die Seite auch per Doppelklick\n" +
  "   (file://) funktioniert und keinen Server braucht. */\n" +
  "window.FALL = " + fallText + ";\n";
fs.writeFileSync(pfad.join(WURZEL, "app", "fall.js"), fallJs, "utf8");

// --- 2. Rechnen und prüfen, BEVOR gebaut wird -------------------------------
// Der Rechenkern und das Schreiben laufen hier in Node. Dazu tun wir kurz so,
// als gäbe es ein Browser-Fenster - mehr braucht der Code nicht.
global.self = global;
global.Nebenkosten = require(pfad.join(WURZEL, "rechenkern", "nebenkosten.js"));
require(pfad.join(WURZEL, "app", "schreiben.js"));

const fall = JSON.parse(fallText);
const ergebnis = global.Nebenkosten.berechne(fall);

// Auch hier keine fest eingebaute Jahreszahl - sie folgt dem Abrechnungszeitraum.
const zeitraum = global.Schreiben.zeitraumBezeichnung(ergebnis.abrechnung);
const jahrKurz = zeitraum.kurz.replace(/[^0-9A-Za-z]+/g, "_");
const htmlName = `Nebenkostenabrechnung_${jahrKurz}.html`;
const zipName = `Nebenkostenabrechnung_${jahrKurz}.zip`;
const dokumentpruefungen = ergebnis.mietverhaeltnisse.flatMap((m) =>
  global.Schreiben.pruefeSchreiben(m, ergebnis)
);
const allePruefungen = ergebnis.pruefungen.concat(dokumentpruefungen);
const offen = allePruefungen.filter((p) => !p.bestanden);
const blocker = offen.filter((p) => p.schwere === "blocker");

// --- 3. Die eine Datei zusammensetzen ---------------------------------------
const html = lies("app", "index.html")
  .replace(
    '<link rel="stylesheet" href="stil.css">',
    "<style>\n" + lies("app", "stil.css") + "\n</style>"
  )
  .replace('<script src="fall.js"></script>', "<script>\n" + fallJs + "\n</script>")
  .replace(
    '<script src="../rechenkern/nebenkosten.js"></script>',
    "<script>\n" + lies("rechenkern", "nebenkosten.js") + "\n</script>"
  )
  .replace('<script src="schreiben.js"></script>', "<script>\n" + lies("app", "schreiben.js") + "\n</script>")
  .replace('<script src="einlesen.js"></script>', "<script>\n" + lies("app", "einlesen.js") + "\n</script>")
  .replace('<script src="app.js"></script>', "<script>\n" + lies("app", "app.js") + "\n</script>")
  // PDF.js wird NICHT eingebettet: 1,4 MB im HTML würden die Datei unhandlich
  // machen. Die zwei Dateien liegen daneben im Ordner vendor/. Fehlen sie,
  // funktioniert alles weiter - nur das Einlesen per PDF nicht.
  .replace('<script src="../vendor/pdf.min.js"></script>', '<script src="vendor/pdf.min.js"></script>')
  .replace('window.PDFJS_WORKER_PFAD = "../vendor/pdf.worker.min.js";',
           'window.PDFJS_WORKER_PFAD = "vendor/pdf.worker.min.js";');

fs.mkdirSync(pfad.join(WURZEL, "dist"), { recursive: true });
const zielHtml = pfad.join(WURZEL, "dist", htmlName);
fs.writeFileSync(zielHtml, html, "utf8");

// PDF.js daneben legen
fs.mkdirSync(pfad.join(WURZEL, "dist", "vendor"), { recursive: true });
for (const datei of ["pdf.min.js", "pdf.worker.min.js", "HERKUNFT.md"]) {
  fs.copyFileSync(pfad.join(WURZEL, "vendor", datei), pfad.join(WURZEL, "dist", "vendor", datei));
}

// --- 4. Prüfprotokoll schreiben ---------------------------------------------
// Das Protokoll ist ein eigenes Ergebnis (SPEC.md D5): Man kann damit einem
// Dritten zeigen, WORAN geprüft wurde, dass die Zahlen stimmen.
const eur = global.Nebenkosten.alsEuroText;
const zeile = (p) =>
  `| ${p.id} | ${p.titel}${p.mietverhaeltnis ? ` (${p.mietverhaeltnis})` : ""} | ` +
  `${p.bestanden ? "bestanden" : p.schwere === "blocker" ? "**BLOCKER**" : "**Warnung**"} | ${p.befund} |`;

const protokoll = `# Prüfprotokoll – Nebenkostenabrechnung ${zeitraum.kurz}

Erzeugt am ${new Date().toISOString().slice(0, 10)} durch \`node werkzeuge/baue.js\`.
Grundlage: \`daten/fall_2025.json\` · Prüfkatalog: \`SPEC.md\` § 5.

## Einstellungen dieses Laufs

| Stellschraube | Wert |
|---|---|
| Zeitanteil | ${ergebnis.einstellungen.zeitanteil_methode} |
| Vorauszahlungen | ${ergebnis.einstellungen.vorauszahlungen_ansatz} |
| Kostenansatz | ${ergebnis.einstellungen.kostenansatz} |

## Ergebnis

| Mietverhältnis | Zeitraum | Anteil | Vorauszahlungen | Ergebnis | Versandfertig |
|---|---|---:|---:|---:|---|
${ergebnis.mietverhaeltnisse
  .map((m) => {
    const gesperrt = dokumentpruefungen.some(
      (p) => p.mietverhaeltnis === m.id && !p.bestanden && p.schwere === "blocker"
    );
    return `| ${m.we} ${m.mieter} | ${m.zeit_text} | ${eur(m.summe_cent)} | ${eur(
      m.vorauszahlung_angesetzt_cent
    )} | ${m.ergebnis} ${eur(Math.abs(m.saldo_cent))} | ${gesperrt ? "nein – ENTWURF" : "ja"} |`;
  })
  .join("\n")}

Umlagefähig gesamt **${eur(ergebnis.summe_umlagefaehig_cent)}** · nicht umlagefähig
${eur(ergebnis.summe_nicht_umlagefaehig_cent)} · Belegsumme ${eur(ergebnis.summe_belege_cent)}.

Kontrollsumme: Die Anteile aller fünf Mietverhältnisse ergeben zusammen
${eur(ergebnis.mietverhaeltnisse.reduce((s, m) => s + m.summe_cent, 0))} — exakt die umlagefähigen
Gesamtkosten (Prüfung F-09).

## Prüfungen an Daten und Rechnung

| ID | Prüfung | Ergebnis | Befund |
|---|---|---|---|
${ergebnis.pruefungen.map(zeile).join("\n")}

## Prüfungen an den fünf Schreiben (formelle Wirksamkeit)

| ID | Prüfung | Ergebnis | Befund |
|---|---|---|---|
${dokumentpruefungen.map(zeile).join("\n")}

## Zusammenfassung

- ${allePruefungen.length} Prüfungen, davon **${allePruefungen.length - offen.length} bestanden**
- **${blocker.length} Blocker** – ein Schreiben mit offenem Blocker wird sichtbar als ENTWURF gekennzeichnet und darf nicht versandt werden
- **${offen.length - blocker.length} Warnungen** – jede muss in \`ANNAHMEN_UND_RUECKFRAGEN.md\` stehen

${
  blocker.length
    ? "### Offene Blocker\n\n" + blocker.map((b) => `- **${b.id}** ${b.titel}${b.mietverhaeltnis ? ` (${b.mietverhaeltnis})` : ""}: ${b.befund}`).join("\n")
    : "Keine offenen Blocker."
}

${
  offen.length - blocker.length
    ? "### Offene Warnungen\n\n" + offen.filter((p) => p.schwere !== "blocker").map((b) => `- **${b.id}** ${b.titel}: ${b.befund}`).join("\n")
    : ""
}

## Freigabe

Diese Abrechnung ist erst versandfertig, wenn ein Mensch sie freigibt (SPEC.md Q-03/Q-04):
die Vier-Augen-Liste abgearbeitet, Name und Datum eingetragen.

Freigegeben von: ______________________  am: ____________
`;

fs.writeFileSync(pfad.join(WURZEL, "dist", "Pruefprotokoll.md"), protokoll, "utf8");

// --- 5. Alles in ein Zip-Archiv legen ---------------------------------------
// Damit lässt sich die Lösung als eine Datei verschicken: Empfänger entpackt,
// öffnet die HTML-Datei, fertig.
let zipGebaut = false;
try {
  const { execFileSync } = require("child_process");
  const dist = pfad.join(WURZEL, "dist");
  fs.rmSync(pfad.join(dist, zipName), { force: true });
  const inhalt = fs.readdirSync(dist).filter((d) => d !== zipName);
  execFileSync("zip", ["-r", "-q", zipName, ...inhalt], { cwd: dist });
  zipGebaut = true;
} catch (fehler) {
  console.log("Hinweis: Zip-Archiv konnte nicht erstellt werden (" + fehler.message + ").");
  console.log("Die Dateien in dist/ lassen sich auch von Hand zusammenpacken.");
}

// --- 6. Bericht auf der Kommandozeile ---------------------------------------
const groesse = (fs.statSync(zielHtml).size / 1024).toFixed(0);
console.log("Gebaut:");
console.log(`  dist/${htmlName}  (${groesse} KB, Oberfläche komplett enthalten)`);
console.log(`  dist/vendor/                          (PDF.js, für das Einlesen von Belegen)`);
console.log(`  dist/Pruefprotokoll.md`);
if (zipGebaut) {
  const zipGroesse = (fs.statSync(pfad.join(WURZEL, "dist", zipName)).size / 1024 / 1024).toFixed(1);
  console.log(`  dist/${zipName}   (${zipGroesse} MB, alles zum Verschicken)`);
}
console.log("");
console.log(`Prüfungen: ${allePruefungen.length - offen.length}/${allePruefungen.length} bestanden, ` +
  `${blocker.length} Blocker, ${offen.length - blocker.length} Warnungen`);
for (const p of offen) {
  console.log(`  [${p.schwere}] ${p.id} ${p.titel}${p.mietverhaeltnis ? ` (${p.mietverhaeltnis})` : ""}`);
  console.log(`           ${p.befund}`);
}
if (blocker.length) {
  console.log("");
  console.log("HINWEIS: Schreiben mit offenem Blocker tragen sichtbar den Vermerk ENTWURF.");
}
