/* =============================================================================
 * TEST DES BELEG-EINLESENS
 * =============================================================================
 *
 * AUFRUF: node test/pruefe_einlesen.js
 *
 * WIE HIER GEMESSEN WIRD
 * Für alle 23 Belege des Falls sind die richtigen Werte bekannt - sie stehen
 * geprüft in daten/fall_2025.json. Das Einlesen wird deshalb gegen den Text
 * derselben Belege laufen gelassen und mit den bekannten Werten verglichen.
 *
 * DIE WICHTIGSTE EIGENSCHAFT IST NICHT DIE TREFFERQUOTE
 * Ein Einleseverfahren, das 90 % der Belege richtig liest und die restlichen
 * 10 % FALSCH übernimmt, ist unbrauchbar. Ein Verfahren, das 70 % richtig liest
 * und die übrigen 30 % in Quarantäne schickt, ist brauchbar - man erfasst sie
 * von Hand. Deshalb ist der entscheidende Test:
 *
 *      KEIN Beleg darf den Status "geprueft" haben und dabei einen falschen
 *      Betrag tragen.
 *
 * Alles andere ist Komfort.
 * ========================================================================== */

const fs = require("fs");
const pfad = require("path");
const E = require("../app/einlesen.js");

const WURZEL = pfad.join(__dirname, "..");
const fall = JSON.parse(fs.readFileSync(pfad.join(WURZEL, "daten/fall_2025.json"), "utf8"));

let bestanden = 0, fehlgeschlagen = 0;
function test(beschreibung, fn) {
  try { fn(); console.log(`  ok    ${beschreibung}`); bestanden++; }
  catch (f) { console.log(`  FEHLER ${beschreibung}\n         ${f.message}`); fehlgeschlagen++; }
}

// --- Alle Belege einlesen ----------------------------------------------------
const ergebnisse = fall.belege.map((beleg) => {
  const textdatei = pfad.join(WURZEL, "02_extracted", "30_Rechnungen", beleg.beleg.replace(/\.pdf$/, ".txt"));
  const text = fs.readFileSync(textdatei, "utf8");
  const gelesen = E.schlageBelegVor(text, beleg.beleg, fall.objekt);
  return { soll: beleg, gelesen };
});

console.log("\n1. Trefferquote über alle 23 Belege");

const betragRichtig = ergebnisse.filter(
  (r) => Math.round((r.gelesen.vorschlag.rechnungsbetrag || 0) * 100) === Math.round(r.soll.rechnungsbetrag * 100));
const datumRichtig = ergebnisse.filter((r) => r.gelesen.vorschlag.datum === r.soll.datum);
const geprueft = ergebnisse.filter((r) => r.gelesen.status === "geprueft");
const quarantaene = ergebnisse.filter((r) => r.gelesen.status === "quarantaene");

console.log(`  Rechnungsbetrag richtig erkannt: ${betragRichtig.length}/${ergebnisse.length}`);
console.log(`  Datum richtig erkannt:           ${datumRichtig.length}/${ergebnisse.length}`);
console.log(`  Status "geprueft":               ${geprueft.length}/${ergebnisse.length}`);
console.log(`  Status "quarantaene":            ${quarantaene.length}/${ergebnisse.length}`);

// Welche landen in Quarantäne und warum?
if (quarantaene.length) {
  console.log("\n  In Quarantäne (müssen von Hand erfasst werden):");
  for (const r of quarantaene) {
    const gruende = r.gelesen.pruefungen.filter((p) => !p.bestanden && p.schwere === "blocker");
    console.log(`    ${r.soll.beleg}`);
    gruende.forEach((g) => console.log(`        ${g.id}: ${g.befund}`));
  }
}

console.log("\n2. Sicherheitseigenschaften");

test("KEIN als geprüft geltender Beleg trägt einen falschen Betrag", () => {
  const falsch = geprueft.filter(
    (r) => Math.round(r.gelesen.vorschlag.rechnungsbetrag * 100) !== Math.round(r.soll.rechnungsbetrag * 100));
  if (falsch.length) {
    throw new Error(falsch.map((r) =>
      `${r.soll.beleg}: gelesen ${r.gelesen.vorschlag.rechnungsbetrag} statt ${r.soll.rechnungsbetrag}`).join(" | "));
  }
});

test("KEIN als geprüft geltender Beleg hat falsch summierte Positionen", () => {
  for (const r of geprueft) {
    const summe = Math.round(r.gelesen.vorschlag.positionen.reduce((s, p) => s + p.betrag, 0) * 100);
    const brutto = Math.round(r.gelesen.vorschlag.rechnungsbetrag * 100);
    const netto = r.gelesen.vorschlag.netto !== null ? Math.round(r.gelesen.vorschlag.netto * 100) : null;
    if (summe !== brutto && summe !== netto) {
      throw new Error(`${r.soll.beleg}: Positionen ${summe / 100} passen weder zu Brutto noch Netto`);
    }
  }
});

test("jeder erkannte Wert steht wörtlich im Dokument (Anker-Regel)", () => {
  for (const r of ergebnisse) {
    const anker = r.gelesen.pruefungen.find((p) => p.id === "I-13");
    if (!anker.bestanden) throw new Error(`${r.soll.beleg}: ${anker.befund}`);
  }
});

test("ein manipulierter Betrag wird erkannt und nicht übernommen", () => {
  // Gegenprobe: Wir schieben in den Vorschlag einen Betrag, der im Dokument
  // nicht vorkommt - genau das, was ein fehlerhafter Parser oder ein
  // Sprachmodell produzieren würde. Die Anker-Regel muss anschlagen.
  const text = fs.readFileSync(
    pfad.join(WURZEL, "02_extracted/30_Rechnungen/341_Clean-and-Go_Q1.txt"), "utf8");
  const r = E.schlageBelegVor(text, "test.pdf");
  r.vorschlag.rechnungsbetrag = 999.99;                    // im Dokument nicht vorhanden
  const pruefungen = E.pruefeVorschlag(r.vorschlag, r.vorschlag.text);
  const anker = pruefungen.find((p) => p.id === "I-13");
  if (anker.bestanden) throw new Error("Anker-Regel hat den erfundenen Betrag nicht bemerkt");
});

console.log("\n3. Fachliche Zuordnung (Vorschlagsqualität)");

test("die nicht umlagefähigen Fallen werden als solche vorgeschlagen", () => {
  // Das sind die Belege, bei denen ein unaufmerksamer Bearbeiter zu viel
  // umlegen würde. Der Vorschlag muss hier die richtige Kostenart treffen.
  const erwartet = {
    "331_Hausservice-Wilms_Q1.pdf": "kleinreparaturen",
    "351_Hausverwaltung-Rheinblick_Q1.pdf": "verwaltung",
    "364_Gruenpflege-Bertram_Neuanlage-Vorgarten.pdf": "neuanlage",
    "39_Sanitaer-Doblinger_Steigleitung.pdf": "instandhaltung",
  };
  for (const [datei, kostenart] of Object.entries(erwartet)) {
    const r = ergebnisse.find((x) => x.soll.beleg === datei);
    const treffer = r.gelesen.vorschlag.positionen.some((p) => p.kostenart === kostenart);
    if (!treffer) {
      throw new Error(`${datei}: "${kostenart}" nicht vorgeschlagen, sondern ` +
        r.gelesen.vorschlag.positionen.map((p) => p.kostenart).join("/"));
    }
  }
});

test("Kostenartvorschläge widersprechen nirgends der geprüften Zuordnung", () => {
  // Wo ein Vorschlag gemacht wird, muss er zur bekannten richtigen Kostenart
  // passen - ein falscher Vorschlag wäre schlimmer als gar keiner.
  const abweichungen = [];
  for (const r of ergebnisse) {
    for (const pos of r.gelesen.vorschlag.positionen) {
      if (!pos.kostenart) continue;
      const passt = r.soll.positionen.some((s) => s.kostenart === pos.kostenart);
      if (!passt) {
        abweichungen.push(`${r.soll.beleg}: "${pos.bezeichnung.slice(0, 40)}" -> ${pos.kostenart}, ` +
          `richtig wäre ${r.soll.positionen.map((s) => s.kostenart).join("/")}`);
      }
    }
  }
  if (abweichungen.length) throw new Error(abweichungen.join(" | "));
});

console.log("\n4. Übernahme in den Fall");

test("ein Vorschlag ohne bestätigte Umlagefähigkeit wird abgelehnt", () => {
  const testfall = JSON.parse(JSON.stringify(fall));
  const r = ergebnisse.find((x) => x.soll.beleg === "341_Clean-and-Go_Q1.pdf");
  const vorschlag = JSON.parse(JSON.stringify(r.gelesen.vorschlag));
  vorschlag.beleg = "neuer_beleg.pdf";
  const ergebnis = E.uebernimm(testfall, vorschlag);
  if (ergebnis.uebernommen) throw new Error("wurde übernommen, obwohl unbestätigt");
});

test("eine Nicht-Umlage ohne Fundstelle wird abgelehnt (R-03)", () => {
  const testfall = JSON.parse(JSON.stringify(fall));
  const r = ergebnisse.find((x) => x.soll.beleg === "341_Clean-and-Go_Q1.pdf");
  const vorschlag = JSON.parse(JSON.stringify(r.gelesen.vorschlag));
  vorschlag.beleg = "neuer_beleg.pdf";
  vorschlag.positionen.forEach((p) => { p.umlagefaehig = false; p.begruendung = "will ich nicht"; });
  const ergebnis = E.uebernimm(testfall, vorschlag);
  if (ergebnis.uebernommen) throw new Error("wurde ohne Fundstelle übernommen");
  if (!ergebnis.fehler.some((f) => f.includes("R-03"))) throw new Error("falscher Ablehnungsgrund");
});

test("ein vollständiger Vorschlag wird übernommen und wirkt sich auf die Abrechnung aus", () => {
  const testfall = JSON.parse(JSON.stringify(fall));
  const N = require("../rechenkern/nebenkosten.js");
  const vorher = N.berechne(testfall).summe_umlagefaehig_cent;

  const r = ergebnisse.find((x) => x.soll.beleg === "341_Clean-and-Go_Q1.pdf");
  const vorschlag = JSON.parse(JSON.stringify(r.gelesen.vorschlag));
  vorschlag.beleg = "345_Clean-and-Go_Q5.pdf";
  vorschlag.positionen.forEach((p) => { p.kostenart = "gebaeudereinigung"; p.umlagefaehig = true; });

  const ergebnis = E.uebernimm(testfall, vorschlag);
  if (!ergebnis.uebernommen) throw new Error("abgelehnt: " + ergebnis.fehler.join(", "));

  const nachher = N.berechne(testfall);
  const zuwachs = nachher.summe_umlagefaehig_cent - vorher;
  if (zuwachs !== Math.round(vorschlag.rechnungsbetrag * 100)) {
    throw new Error(`Zuwachs ${zuwachs} statt ${Math.round(vorschlag.rechnungsbetrag * 100)} Cent`);
  }
  // Und die Verteilung muss weiterhin centgenau aufgehen.
  const summeMieter = nachher.mietverhaeltnisse.reduce((s, m) => s + m.summe_cent, 0);
  if (summeMieter !== nachher.summe_umlagefaehig_cent) throw new Error("Verteilung geht nicht mehr auf");
  if (nachher.protokoll === undefined && !testfall.protokoll.length) throw new Error("kein Protokolleintrag");
});

test("derselbe Beleg kann nicht zweimal erfasst werden (I-07)", () => {
  const testfall = JSON.parse(JSON.stringify(fall));
  const r = ergebnisse.find((x) => x.soll.beleg === "341_Clean-and-Go_Q1.pdf");
  const vorschlag = JSON.parse(JSON.stringify(r.gelesen.vorschlag));
  vorschlag.positionen.forEach((p) => { p.kostenart = "gebaeudereinigung"; p.umlagefaehig = true; });
  const ergebnis = E.uebernimm(testfall, vorschlag);   // Name existiert bereits
  if (ergebnis.uebernommen) throw new Error("Dublette wurde übernommen");
});

console.log(`\n${"=".repeat(70)}`);
if (fehlgeschlagen === 0) {
  console.log(`ALLE TESTS BESTANDEN (${bestanden} Tests)`);
  console.log(`Einlesen: ${betragRichtig.length}/${ergebnisse.length} Rechnungsbeträge richtig gelesen · ` +
    `${geprueft.length} Belege vollständig übernehmbar · ${quarantaene.length} in Quarantäne · ` +
    `0 mit falschen Werten übernommen`);
} else {
  console.log(`${fehlgeschlagen} TEST(S) FEHLGESCHLAGEN (${bestanden} bestanden)`);
}
console.log("=".repeat(70));
process.exit(fehlgeschlagen === 0 ? 0 : 1);
