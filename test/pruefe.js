/* =============================================================================
 * TESTS FÜR DEN RECHENKERN
 * =============================================================================
 *
 * AUFRUF:   node test/pruefe.js
 * ERGEBNIS: Liste aller Tests, am Ende "ALLE TESTS BESTANDEN" oder ein Fehler.
 *           Der Rückgabewert ist 0 (ok) oder 1 (Fehler), damit man den Aufruf
 *           auch automatisiert verwenden kann.
 *
 * WARUM OHNE TEST-FRAMEWORK
 *   Damit man die Datei ohne Installation lesen und ausführen kann. Ein
 *   Framework würde hier nichts hinzufügen, was 20 Zeilen eigener Code nicht
 *   auch leisten - und es wäre eine Abhängigkeit mehr beim Empfänger.
 *
 * WAS HIER GEPRÜFT WIRD (in dieser Reihenfolge)
 *   1. Die Verteilfunktion für sich allein (inkl. Sonderfälle)
 *   2. Die Sollwerte aus test/sollwerte.json (Golden Test, Prüfung A-07)
 *   3. Die Invarianten, die IMMER gelten müssen - unabhängig von den Zahlen
 *   4. Dass alle blockierenden Prüfungen bestanden sind
 *   5. Dass die echten Befunde weiterhin als Warnung erkannt werden
 *   6. Dass die drei Stellschrauben wirken und in die erwartete Richtung
 * ========================================================================== */

const fs = require("fs");
const pfad = require("path");
const N = require("../rechenkern/nebenkosten.js");

// Das Schreiben ist für den Browser geschrieben und erwartet ein globales
// Fenster-Objekt. Für die Tests tun wir kurz so, als gäbe es eines - mehr
// braucht der Code nicht, er benutzt kein einziges Browser-Merkmal.
global.self = global;
global.Nebenkosten = N;
require("../app/schreiben.js");
const S = global.Schreiben;

const WURZEL = pfad.join(__dirname, "..");
const fallDaten = () => JSON.parse(fs.readFileSync(pfad.join(WURZEL, "daten/fall_2025.json"), "utf8"));
const soll = JSON.parse(fs.readFileSync(pfad.join(__dirname, "sollwerte.json"), "utf8"));

// --- Minimaler Test-Rahmen ---------------------------------------------------
let bestanden = 0;
let fehlgeschlagen = 0;

function test(beschreibung, pruefFunktion) {
  try {
    pruefFunktion();
    console.log(`  ok    ${beschreibung}`);
    bestanden++;
  } catch (fehler) {
    console.log(`  FEHLER ${beschreibung}`);
    console.log(`         ${fehler.message}`);
    fehlgeschlagen++;
  }
}

function gleich(ist, erwartet, was) {
  if (ist !== erwartet) throw new Error(`${was}: ist ${ist}, erwartet ${erwartet}`);
}

function abschnitt(titel) {
  console.log(`\n${titel}`);
}

// Euro-Sollwert -> Cent, damit wir ganze Zahlen vergleichen.
const c = (euro) => Math.round(euro * 100);

/* ===========================================================================
 * 1. Die Verteilfunktion
 * ========================================================================= */
abschnitt("1. Centgenaue Verteilung (Largest-Remainder)");

test("verteilt 1.096,00 EUR nach Wohnfläche exakt", () => {
  const anteile = N.verteileCentgenau(109600, [6200, 4850, 8400, 5550]);
  gleich(anteile.reduce((a, b) => a + b, 0), 109600, "Summe der Anteile");
  gleich(anteile.join(","), "27181,21262,36826,24331", "Anteile");
});

test("Summe stimmt immer exakt - auch bei 500 Zufallsfällen", () => {
  // Eigenschaftstest: Statt einzelne Werte zu prüfen, wird die Regel selbst
  // geprüft - "die Summe muss stimmen" - und zwar für viele Zufallseingaben.
  for (let lauf = 0; lauf < 500; lauf++) {
    const gesamt = Math.floor(Math.random() * 1000000);
    const anzahl = 2 + Math.floor(Math.random() * 6);
    const gewichte = Array.from({ length: anzahl }, () => 1 + Math.floor(Math.random() * 10000));
    const anteile = N.verteileCentgenau(gesamt, gewichte);
    if (anteile.reduce((a, b) => a + b, 0) !== gesamt) {
      throw new Error(`Lauf ${lauf}: Summe ${anteile.reduce((a, b) => a + b, 0)} != ${gesamt}`);
    }
  }
});

test("kein Anteil weicht um mehr als einen Cent vom exakten Wert ab", () => {
  // Zweite Eigenschaft: Das Verfahren darf nicht beliebig umverteilen.
  for (let lauf = 0; lauf < 500; lauf++) {
    const gesamt = Math.floor(Math.random() * 1000000);
    const gewichte = Array.from({ length: 2 + Math.floor(Math.random() * 6) },
      () => 1 + Math.floor(Math.random() * 10000));
    const summeGewichte = gewichte.reduce((a, b) => a + b, 0);
    const anteile = N.verteileCentgenau(gesamt, gewichte);
    anteile.forEach((anteil, i) => {
      const exakt = (gesamt * gewichte[i]) / summeGewichte;
      if (Math.abs(anteil - exakt) >= 1) {
        throw new Error(`Lauf ${lauf}, Position ${i}: ${anteil} weicht von ${exakt.toFixed(3)} ab`);
      }
    });
  }
});

test("mehr Fläche bedeutet nie weniger Anteil", () => {
  // Dritte Eigenschaft: Die Reihenfolge muss erhalten bleiben (Monotonie).
  const anteile = N.verteileCentgenau(100000, [1000, 2000, 3000, 4000]);
  for (let i = 1; i < anteile.length; i++) {
    if (anteile[i] < anteile[i - 1]) throw new Error(`Anteil ${i} kleiner als ${i - 1}`);
  }
});

test("Sonderfälle: Betrag 0, ein Gewicht, Gewichte alle 0", () => {
  gleich(N.verteileCentgenau(0, [1, 2, 3]).join(","), "0,0,0", "Betrag 0");
  gleich(N.verteileCentgenau(12345, [7]).join(","), "12345", "ein Gewicht");
  gleich(N.verteileCentgenau(12345, [0, 0]).join(","), "0,0", "Gewichte 0");
});

/* ===========================================================================
 * 2. Golden Test - die von Hand geprüften Sollwerte
 *    Das ist zugleich Prüfung A-07 (Sollwerte stimmen) und Q-01 (Regression:
 *    jede Änderung wird gegen die gespeicherten Sollwerte gehalten).
 * ========================================================================= */
abschnitt("2. Sollwerte aus test/sollwerte.json (Golden Test)");

const ergebnis = N.berechne(fallDaten());

test("Summen: umlagefähig / nicht umlagefähig", () => {
  gleich(ergebnis.summe_umlagefaehig_cent, c(soll.summen_euro.umlagefaehig), "umlagefähig");
  gleich(ergebnis.summe_nicht_umlagefaehig_cent, c(soll.summen_euro.nicht_umlagefaehig), "nicht umlagefähig");
});

test("Jahresanteil je Einheit", () => {
  for (const einheit of ergebnis.einheiten) {
    gleich(einheit.jahresanteil_cent, c(soll.jahresanteil_je_einheit_euro[einheit.we]), einheit.we);
  }
});

test("Referenz-Mietverhältnis WE 1: jede einzelne Zeile", () => {
  const we1 = ergebnis.mietverhaeltnisse.find((m) => m.id === soll.referenz_mietverhaeltnis.id);
  for (const sollZeile of soll.referenz_mietverhaeltnis.zeilen_euro) {
    const istZeile = we1.zeilen.find((z) => z.kostenart === sollZeile.kostenart);
    if (!istZeile) throw new Error(`Zeile ${sollZeile.kostenart} fehlt`);
    gleich(istZeile.gesamt_cent, c(sollZeile.gesamt), `${sollZeile.kostenart} Gesamtkosten`);
    gleich(istZeile.betrag_cent, c(sollZeile.anteil), `${sollZeile.kostenart} Anteil WE 1`);
  }
  gleich(we1.summe_cent, c(soll.referenz_mietverhaeltnis.summe), "Summe WE 1");
  gleich(we1.saldo_cent, c(soll.referenz_mietverhaeltnis.saldo), "Saldo WE 1");
});

test("Ergebnis aller fünf Mietverhältnisse", () => {
  for (const [id, sollWert] of Object.entries(soll.ergebnis_je_mietverhaeltnis_euro)) {
    const m = ergebnis.mietverhaeltnisse.find((x) => x.id === id);
    if (!m) throw new Error(`Mietverhältnis ${id} fehlt`);
    gleich(m.tage, sollWert.tage, `${id} Nutzungstage`);
    gleich(m.summe_cent, c(sollWert.anteil), `${id} Anteil`);
    gleich(m.vorauszahlung_angesetzt_cent, c(sollWert.vorauszahlung), `${id} Vorauszahlung`);
    gleich(m.saldo_cent, c(sollWert.saldo), `${id} Saldo`);
  }
});

/* ===========================================================================
 * 3. Invarianten - Regeln, die unabhängig von konkreten Zahlen gelten müssen
 * ========================================================================= */
abschnitt("3. Invarianten (gelten bei jedem Datenstand)");

test("A-02: Summe der Einheitenanteile == Gesamtkosten, je Kostenart", () => {
  for (const k of ergebnis.umlagefaehige) {
    const summe = Object.values(k.anteile_je_einheit).reduce((a, b) => a + b, 0);
    gleich(summe, k.gesamt_cent, `Kostenart ${k.bezeichnung}`);
  }
});

test("A-03: Summe der Mieteranteile == Jahresanteil der Einheit", () => {
  for (const einheit of ergebnis.einheiten) {
    const summe = ergebnis.mietverhaeltnisse
      .filter((m) => m.we === einheit.we)
      .reduce((s, m) => s + m.summe_cent, 0);
    gleich(summe, einheit.jahresanteil_cent, `Einheit ${einheit.we}`);
  }
});

test("F-09: Summe aller Mieteranteile == umlagefähige Gesamtkosten", () => {
  const summe = ergebnis.mietverhaeltnisse.reduce((s, m) => s + m.summe_cent, 0);
  gleich(summe, ergebnis.summe_umlagefaehig_cent, "Gesamtabgleich");
});

test("A-03: jede Einheit ist lückenlos und überschneidungsfrei belegt", () => {
  for (const einheit of ergebnis.einheiten) {
    const tage = ergebnis.mietverhaeltnisse
      .filter((m) => m.we === einheit.we)
      .reduce((s, m) => s + m.tage, 0);
    gleich(tage, ergebnis.tage_im_jahr, `Einheit ${einheit.we} Nutzungstage`);
  }
});

test("A-04: umlagefähig + nicht umlagefähig == Summe aller Belegpositionen", () => {
  const fall = fallDaten();
  const allePositionen = fall.belege.reduce(
    (s, b) => s + b.positionen.reduce((s2, p) => s2 + N.zuCent(p.betrag), 0), 0);
  gleich(ergebnis.summe_umlagefaehig_cent + ergebnis.summe_nicht_umlagefaehig_cent,
    allePositionen, "Belegsumme");
});

/* ===========================================================================
 * 4. Prüfkatalog
 * ========================================================================= */
abschnitt("4. Prüfkatalog aus SPEC.md");

test("keine blockierende Prüfung ist offen", () => {
  if (ergebnis.blocker.length > 0) {
    throw new Error(ergebnis.blocker.map((b) => `${b.id} ${b.titel}: ${b.befund}`).join(" | "));
  }
});

test("Ergebnis ist freigegeben (fail-closed-Gate offen)", () => {
  gleich(ergebnis.freigegeben, true, "freigegeben");
});

test("die echten Befunde werden weiterhin als Warnung erkannt", () => {
  for (const id of Object.keys(soll.erwartete_warnungen)) {
    if (id.startsWith("_")) continue;
    const p = ergebnis.pruefungen.find((x) => x.id === id);
    if (!p) throw new Error(`Prüfung ${id} fehlt`);
    if (p.bestanden) throw new Error(`${id} schlägt nicht mehr an - Befund verschwunden?`);
  }
});

/* ===========================================================================
 * 5. Stellschrauben - wirken sie, und in die richtige Richtung?
 * ========================================================================= */
abschnitt("5. Stellschrauben (für die Live-Änderung im Termin)");

/** Berechnet den Fall mit einer geänderten Einstellung. */
function mitEinstellung(name, wert) {
  const fall = fallDaten();
  fall.einstellungen[name] = wert;
  return N.berechne(fall);
}

test("vorauszahlungen_ansatz=soll: Ohlwein wird um genau eine Vorauszahlung entlastet", () => {
  const sollAnsatz = mitEinstellung("vorauszahlungen_ansatz", "soll");
  const vorher = ergebnis.mietverhaeltnisse.find((m) => m.id === "WE4_Ohlwein");
  const nachher = sollAnsatz.mietverhaeltnisse.find((m) => m.id === "WE4_Ohlwein");
  gleich(vorher.saldo_cent - nachher.saldo_cent, 15000, "Differenz (eine Vorauszahlung à 150 EUR)");
});

test("zeitanteil_methode=monate: nur die Einheit mit Mieterwechsel ändert sich", () => {
  const monate = mitEinstellung("zeitanteil_methode", "monate");
  const unveraendert = ["WE1_Yildirim", "WE2_Bendel", "WE4_Ohlwein"];
  for (const id of unveraendert) {
    gleich(monate.mietverhaeltnisse.find((m) => m.id === id).summe_cent,
      ergebnis.mietverhaeltnisse.find((m) => m.id === id).summe_cent, `${id} unverändert`);
  }
  const nowak = monate.mietverhaeltnisse.find((m) => m.id === "WE3_Nowak");
  if (nowak.summe_cent === ergebnis.mietverhaeltnisse.find((m) => m.id === "WE3_Nowak").summe_cent) {
    throw new Error("WE3_Nowak hätte sich ändern müssen");
  }
  // Auch bei anderer Methode muss die Verteilung exakt aufgehen.
  gleich(monate.mietverhaeltnisse.reduce((s, m) => s + m.summe_cent, 0),
    monate.summe_umlagefaehig_cent, "Summe bleibt exakt");
});

test("kostenansatz=abfluss: umlagefähige Kosten sinken um die Nachzahlung 2026", () => {
  const abfluss = mitEinstellung("kostenansatz", "abfluss");
  const differenz = ergebnis.summe_umlagefaehig_cent - abfluss.summe_umlagefaehig_cent;
  gleich(differenz, 7660, "Differenz (RheinEnergie-Nachzahlung 76,60 EUR)");
  gleich(abfluss.mietverhaeltnisse.reduce((s, m) => s + m.summe_cent, 0),
    abfluss.summe_umlagefaehig_cent, "Summe bleibt exakt");
});

test("jede Stellschraube lässt das Ergebnis freigegeben", () => {
  for (const [name, wert] of [
    ["vorauszahlungen_ansatz", "soll"],
    ["zeitanteil_methode", "monate"],
    ["kostenansatz", "abfluss"],
  ]) {
    const e = mitEinstellung(name, wert);
    if (e.blocker.length > 0) {
      throw new Error(`${name}=${wert}: ${e.blocker.map((b) => b.id).join(", ")}`);
    }
  }
});

test("nachgetragene Zahlung zählt für den Mieter, lässt die Kontoauszüge aber unberührt", () => {
  // Der Fall aus dem Termin: Die Oktobermiete von Frau Ohlwein ging auf ein anderes Konto.
  global.self = global;
  const EIN = require("../app/einlesen.js");
  const fall = fallDaten();
  const r = EIN.fuegeBuchungHinzu(fall,
    { datum: "2025-10-03", gegenpartei: "PETRA OHLWEIN", zweck: "Miete 10/2025", betrag: 760 },
    "Zahlung ging auf das Privatkonto");
  if (!r.hinzugefuegt) throw new Error(r.fehler.join(", "));
  const e = N.berechne(fall);
  gleich(e.mietverhaeltnisse.find((m) => m.id === "WE4_Ohlwein").saldo_cent, 17543, "Saldo Ohlwein");
  const status = (id) => e.pruefungen.find((p) => p.id === id).bestanden;
  if (!status("I-06")) throw new Error("I-06 schlägt an, obwohl die Zahlung nicht über das Objektkonto lief");
  if (!status("P-02")) throw new Error("P-02 meldet die Oktobermiete weiter als fehlend");
});

/* ===========================================================================
 * 6. Die fertigen Schreiben (formelle Wirksamkeit, SPEC.md § 2.1)
 * ========================================================================= */
abschnitt("6. Abrechnungsschreiben");

test("jedes Schreiben enthält die vier gesetzlichen Mindestangaben (F-01..F-04)", () => {
  for (const m of ergebnis.mietverhaeltnisse) {
    const pflicht = S.pruefeSchreiben(m, ergebnis)
      .filter((p) => ["F-01", "F-02", "F-03", "F-04"].includes(p.id));
    gleich(pflicht.length, 4, `${m.id}: Anzahl Pflichtprüfungen`);
    for (const p of pflicht) {
      if (!p.bestanden) throw new Error(`${m.id}: ${p.id} nicht erfüllt - ${p.befund}`);
    }
  }
});

test("ausgezogener Mieter: ohne neue Anschrift gesperrt, mit neuer Anschrift versandfertig", () => {
  const fall = fallDaten();
  const nowak = fall.mietverhaeltnisse.find((m) => m.id === "WE3_Nowak");
  delete nowak.anschrift_hinweis;                         // nur den Hinweis löschen reicht nicht
  let e = N.berechne(fall);
  let m = e.mietverhaeltnisse.find((x) => x.id === "WE3_Nowak");
  if (S.pruefeSchreiben(m, e).find((p) => p.id === "F-08").bestanden) {
    throw new Error("Schreiben ginge ohne Sperre an die verlassene Wohnung");
  }
  nowak.anschrift = { strasse: "Zülpicher Straße 12", plz_ort: "50674 Köln" };
  e = N.berechne(fall);
  m = e.mietverhaeltnisse.find((x) => x.id === "WE3_Nowak");
  if (!S.pruefeSchreiben(m, e).find((p) => p.id === "F-08").bestanden) throw new Error("F-08 bleibt offen");
  const html = S.schreibenFertig(m, e);
  if (!html.includes("Zülpicher Straße 12")) throw new Error("neue Anschrift fehlt im Schreiben");
  if (html.includes("ENTWURF")) throw new Error("Schreiben trägt weiter ENTWURF");
});

test("jeder Betrag aus der Berechnung steht auch im Schreiben", () => {
  // Gegenprobe gegen stille Abweichungen zwischen Rechnung und Dokument.
  for (const m of ergebnis.mietverhaeltnisse) {
    const html = S.schreiben(m, ergebnis);
    for (const z of m.zeilen) {
      if (!html.includes(N.alsEuroText(z.betrag_cent))) {
        throw new Error(`${m.id}: Betrag ${N.alsEuroText(z.betrag_cent)} fehlt im Schreiben`);
      }
    }
    if (!html.includes(N.alsEuroText(m.summe_cent))) {
      throw new Error(`${m.id}: Summe fehlt im Schreiben`);
    }
  }
});

test("ein Schreiben mit offenem Blocker trägt sichtbar den Vermerk ENTWURF", () => {
  // Nowak hat keine Zustelladresse - dieses Schreiben darf nicht versandfertig
  // aussehen. Alle anderen müssen ohne Vermerk auskommen.
  const nowak = ergebnis.mietverhaeltnisse.find((m) => m.id === "WE3_Nowak");
  if (!S.schreibenFertig(nowak, ergebnis).includes("entwurfsband")) {
    throw new Error("WE3_Nowak müsste als ENTWURF gekennzeichnet sein (fehlende Anschrift)");
  }
  for (const m of ergebnis.mietverhaeltnisse.filter((x) => x.id !== "WE3_Nowak")) {
    if (S.schreibenFertig(m, ergebnis).includes("entwurfsband")) {
      throw new Error(`${m.id} ist unerwartet gesperrt`);
    }
  }
});

test("keine leeren Angaben mit übrig gebliebenem Trennzeichen", () => {
  // Fehlt ein Feld, blieb früher ein einsames "·" oder ein Komma im Brief
  // stehen ("Wohnung WE 1 ·"). Das sieht im gedruckten Schreiben nach Fehler aus.
  for (const m of ergebnis.mietverhaeltnisse) {
    if (!m.lage) throw new Error(`${m.id}: Lage der Wohnung fehlt`);
    const html = S.schreiben(m, ergebnis);
    for (const rest of ["· </", ", </", "·</", "( )", "&nbsp;·&nbsp;<"]) {
      if (html.includes(rest)) throw new Error(`${m.id}: leere Angabe vor "${rest}"`);
    }
  }
});

test("jedes Schreiben nennt die Pflichtbestandteile im Volltext", () => {
  // Inhaltliche Gegenprobe zu F-01..F-06: Die Formulierungen, auf die sich ein
  // Mieter berufen können muss, stehen wirklich im Brief.
  const pflichttexte = [
    "Gesamtkosten Haus",              // Zusammenstellung der Gesamtkosten
    "Gesamtwohnfläche",               // Verteilerschlüssel, erläutert
    "Verteilerschlüssel",
    "abzüglich Ihrer Vorauszahlungen",
    "556 Abs. 3",                     // Einwendungsfrist
    "einsehen",                       // Belegeinsicht
    "Abrechnungszeitraum",
  ];
  for (const m of ergebnis.mietverhaeltnisse) {
    const html = S.schreiben(m, ergebnis);
    const fehlt = pflichttexte.filter((t) => !html.includes(t));
    if (fehlt.length) throw new Error(`${m.id}: fehlt "${fehlt.join('", "')}"`);
  }
});

test("HTML-Sonderzeichen in Namen werden unschädlich gemacht", () => {
  // Sicherheitsnetz: Ein Name mit spitzen Klammern darf das Dokument nicht
  // zerstören - das kann bei importierten Falldateien vorkommen.
  const fall = fallDaten();
  fall.mietverhaeltnisse[0].mieter = 'Max <script>alert(1)</script> Mustermann';
  const e2 = N.berechne(fall);
  const html = S.schreiben(e2.mietverhaeltnisse[0], e2);
  if (html.includes("<script>alert")) throw new Error("Eingabe wurde nicht entschärft");
  if (!html.includes("&lt;script&gt;")) throw new Error("Name fehlt im Schreiben");
});

/* ===========================================================================
 * 7. Die Lösung ist nicht auf das Jahr 2025 festgelegt
 * =========================================================================
 * Der Case gibt 2025 vor. Fest eingebaut sein darf die Jahreszahl deshalb
 * trotzdem nicht - sonst wäre die Lösung nach einem Jahr wertlos. Gerechnet
 * und geschrieben wird immer gegen den Zeitraum aus der Falldatei.
 * ========================================================================= */
abschnitt("7. Abrechnungsjahr frei wählbar");

test("ein Fall für 2026 erzeugt ein Schreiben für 2026", () => {
  const fall = fallDaten();
  fall.abrechnung.von = "2026-01-01";
  fall.abrechnung.bis = "2026-12-31";
  fall.abrechnung.erstellt_am = "2027-02-16";
  const e2 = N.berechne(fall);
  gleich(e2.tage_im_jahr, 365, "Tage im Jahr 2026");

  const html = S.schreiben(e2.mietverhaeltnisse[0], e2);
  for (const text of ["Betriebskostenabrechnung 2026", "für das Kalenderjahr 2026", "Betriebskosten 2026"]) {
    if (!html.includes(text)) throw new Error(`"${text}" fehlt im Schreiben`);
  }
  if (html.includes("Kalenderjahr 2025")) throw new Error("Jahreszahl 2025 steckt noch fest im Text");
});

test("ein Schaltjahr wird richtig gerechnet", () => {
  const fall = fallDaten();
  fall.abrechnung.von = "2028-01-01";
  fall.abrechnung.bis = "2028-12-31";
  fall.abrechnung.erstellt_am = "2029-02-16";
  gleich(N.berechne(fall).tage_im_jahr, 366, "Tage im Schaltjahr 2028");
});

test("ein vom Kalenderjahr abweichender Zeitraum wird als Datumsspanne benannt", () => {
  const fall = fallDaten();
  fall.abrechnung.von = "2025-07-01";
  fall.abrechnung.bis = "2026-06-30";
  fall.abrechnung.erstellt_am = "2026-08-01";
  const e2 = N.berechne(fall);
  gleich(e2.tage_im_jahr, 365, "Tage im abweichenden Wirtschaftsjahr");
  const html = S.schreiben(e2.mietverhaeltnisse[0], e2);
  if (!html.includes("01.07.2025 – 30.06.2026")) throw new Error("Zeitraum wird nicht als Spanne benannt");
  if (html.includes("Kalenderjahr")) throw new Error("wird fälschlich als Kalenderjahr bezeichnet");
});

test("die Ausschlussfrist verschiebt sich mit dem Abrechnungsjahr", () => {
  // § 556 Abs. 3 BGB: zwölf Monate nach Ende des Zeitraums.
  const fall = fallDaten();
  fall.abrechnung.von = "2026-01-01";
  fall.abrechnung.bis = "2026-12-31";
  fall.abrechnung.erstellt_am = "2028-01-15";          // zu spät
  const zuSpaet = N.berechne(fall).pruefungen.find((p) => p.id === "R-06");
  if (zuSpaet.bestanden) throw new Error("verspätete Abrechnung wurde nicht bemerkt");
  fall.abrechnung.erstellt_am = "2027-11-30";          // rechtzeitig
  const rechtzeitig = N.berechne(fall).pruefungen.find((p) => p.id === "R-06");
  if (!rechtzeitig.bestanden) throw new Error("rechtzeitige Abrechnung wurde abgelehnt");
});

/* ===========================================================================
 * Ergebnis
 * ========================================================================= */
console.log(`\n${"=".repeat(70)}`);
if (fehlgeschlagen === 0) {
  console.log(`ALLE TESTS BESTANDEN (${bestanden} Tests)`);
  console.log(`Prüfkatalog: ${ergebnis.pruefungen.filter((p) => p.bestanden).length} von ` +
    `${ergebnis.pruefungen.length} Prüfungen grün, ` +
    `${ergebnis.warnungen.length} Warnung(en), ${ergebnis.blocker.length} Blocker`);
} else {
  console.log(`${fehlgeschlagen} TEST(S) FEHLGESCHLAGEN (${bestanden} bestanden)`);
}
console.log("=".repeat(70));
process.exit(fehlgeschlagen === 0 ? 0 : 1);
