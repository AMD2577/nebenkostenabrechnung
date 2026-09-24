/* =============================================================================
 * BELEGE EINLESEN
 * =============================================================================
 *
 * Aus einem PDF (oder eingefügtem Text) wird ein VORSCHLAG für einen Beleg.
 * Ein Vorschlag ist noch kein Beleg: Er muss geprüft und von einem Menschen
 * bestätigt werden, bevor er in die Abrechnung wandert.
 *
 * DIE DREI REGELN, DIE DAS SICHER MACHEN (SPEC.md § 3)
 *
 *   1. ANKER-REGEL
 *      Jeder erkannte Wert muss WÖRTLICH im Text des Dokuments vorkommen, und
 *      es wird gespeichert, an welcher Stelle. Was nicht im Dokument steht,
 *      wird nicht übernommen. Damit kann kein Wert "erfunden" werden - weder
 *      durch einen fehlerhaften Ausdruck noch durch ein Sprachmodell.
 *
 *   2. RECHNEN GEGEN DAS DOKUMENT
 *      Die erkannten Positionen müssen die im Dokument ausgewiesene Summe
 *      ergeben, Netto plus Umsatzsteuer muss den Bruttobetrag ergeben, Menge
 *      mal Einzelpreis den Positionsbetrag. Stimmt das nicht, geht der Beleg in
 *      QUARANTÄNE und nicht in die Abrechnung.
 *
 *   3. VORSCHLAG, NICHT BUCHUNG
 *      Die Kostenart und die Frage "umlagefähig ja/nein" werden vorgeschlagen,
 *      aber nie automatisch übernommen. Das ist die fachliche Entscheidung, und
 *      die trifft ein Mensch - nachvollziehbar im Protokoll.
 *
 * WARUM DER FEHLER HIER ABGEFANGEN WERDEN MUSS
 * Ein falsch gelesener Betrag wäre ab hier in allen weiteren Schritten drin:
 * in den Gesamtkosten, in fünf Abrechnungen, in der Nachzahlung des Mieters.
 * Je später ein Fehler auffällt, desto teurer wird er - deshalb steht die
 * Prüfung direkt an der Eingangstür.
 *
 * Diese Datei läuft im Browser UND in Node (für die Tests). Das Lesen der
 * PDF-Datei selbst geht nur im Browser - alles andere arbeitet auf Text.
 * ========================================================================== */

(function (global) {
  "use strict";

  // Der Rechenkern wird für die centgenaue Verteilung der Umsatzsteuer
  // gebraucht. Im Browser liegt er als globales Objekt bereit, in Node wird er
  // geladen - in beiden Fällen ist es derselbe Code, keine zweite Fassung.
  const RECHENKERN =
    typeof module === "object" && module.exports ? require("../rechenkern/nebenkosten.js") : null;
  const verteileCentgenau = (gesamtCent, gewichte) =>
    (RECHENKERN || global.Nebenkosten).verteileCentgenau(gesamtCent, gewichte);

  /* ===========================================================================
   * TEIL 1 - TEXT AUFBEREITEN
   * ========================================================================= */

  /**
   * Räumt den Rohtext auf, ohne Inhalte zu verändern:
   * weiche Trennstriche auflösen, Mehrfach-Leerzeichen verdichten, Leerzeilen
   * zusammenfassen, wiederkehrende Seitenfußzeilen entfernen.
   * Das spart Platz und macht die Mustererkennung zuverlässiger.
   */
  function normalisiereText(roh) {
    return String(roh)
      // Manche PDFs liefern "fi" und "fl" als ein einzelnes Sonderzeichen.
      // NFKC macht daraus normale Buchstaben - sonst greift kein Stichwort,
      // weil "Rasenpflege" dort anders geschrieben steht als hier gesucht.
      .normalize("NFKC")
      .replace(/\r\n?/g, "\n")
      .replace(/­/g, "")               // weiches Trennzeichen
      .replace(/(\w)-\n(\w)/g, "$1$2")      // am Zeilenende getrenntes Wort
      .split("\n")
      .map((zeile) => zeile.replace(/[ \t]+/g, " ").trim())
      .filter((zeile, i, alle) => !(zeile === "" && alle[i - 1] === ""))
      .join("\n")
      .replace(/^\s*Seite \d+( von \d+)?\s*$/gim, "")
      .trim();
  }

  /**
   * NUR IM BROWSER: liest den Text aus einer PDF-Datei.
   *
   * PDF.js liefert einzelne Textstücke mit Koordinaten, nicht Zeilen. Wir bauen
   * die Zeilen wieder zusammen, indem wir Stücke mit derselben Höhe (y) zu einer
   * Zeile gruppieren und nach links/rechts (x) sortieren. Ohne diesen Schritt
   * käme eine einzige lange Textwurst heraus, in der man Positionen nicht mehr
   * erkennen kann.
   */
  async function textAusPdf(datei) {
    if (typeof global.pdfjsLib === "undefined") {
      throw new Error(
        "PDF.js ist nicht geladen. Beleg bitte über 'Text einfügen' oder das Formular erfassen."
      );
    }
    global.pdfjsLib.GlobalWorkerOptions.workerSrc =
      global.PDFJS_WORKER_PFAD || "../vendor/pdf.worker.min.js";

    const puffer = await datei.arrayBuffer();
    const dokument = await global.pdfjsLib.getDocument({ data: new Uint8Array(puffer) }).promise;

    const seiten = [];
    for (let nummer = 1; nummer <= dokument.numPages; nummer++) {
      const seite = await dokument.getPage(nummer);
      const inhalt = await seite.getTextContent();

      // Textstücke nach Zeilen gruppieren (y-Position, auf 2 Punkte gerundet).
      const zeilen = new Map();
      for (const stueck of inhalt.items) {
        if (!stueck.str) continue;
        const y = Math.round(stueck.transform[5] / 2) * 2;
        const x = stueck.transform[4];
        if (!zeilen.has(y)) zeilen.set(y, []);
        zeilen.get(y).push({ x, text: stueck.str });
      }
      const sortiert = [...zeilen.entries()]
        .sort((a, b) => b[0] - a[0])                    // von oben nach unten
        .map(([, stuecke]) =>
          stuecke.sort((a, b) => a.x - b.x).map((s) => s.text).join(" "));
      seiten.push(sortiert.join("\n"));
    }
    return { text: normalisiereText(seiten.join("\n")), seiten: dokument.numPages };
  }

  /* ===========================================================================
   * TEIL 2 - ZAHLEN UND DATEN LESEN
   * ========================================================================= */

  /** "1.234,56" -> 1234.56 · "1.234,56 €" -> 1234.56 */
  function zahlAusText(text) {
    if (text === null || text === undefined) return null;
    const bereinigt = String(text).replace(/[€\s]/g, "").replace(/\./g, "").replace(",", ".");
    const wert = Number(bereinigt);
    return Number.isFinite(wert) ? wert : null;
  }

  /** "02.01.2025" -> "2025-01-02" */
  function datumAusText(text) {
    const treffer = /(\d{2})\.(\d{2})\.(\d{4})/.exec(String(text || ""));
    return treffer ? `${treffer[3]}-${treffer[2]}-${treffer[1]}` : null;
  }

  /**
   * Sucht ein Muster im Text und gibt Wert UND Fundstelle zurück.
   * Die Fundstelle ist die Umsetzung der Anker-Regel: Zu jedem Wert lässt sich
   * später zeigen, wo im Dokument er steht.
   */
  function sucheMitAnker(text, muster, gruppe = 1) {
    const treffer = muster.exec(text);
    if (!treffer) return null;
    return {
      roh: treffer[gruppe],
      stelle: treffer.index,
      zeile: text.slice(0, treffer.index).split("\n").length,
      quelle: "regel",
    };
  }

  /* ===========================================================================
   * TEIL 3 - DEN BELEG VORSCHLAGEN
   * ========================================================================= */

  /**
   * Schlägt anhand des Textes eine Kostenart vor.
   * Bewusst einfach gehalten: Stichwörter, keine Statistik. Wer den Vorschlag
   * ändern will, tut das in der Oberfläche - der Vorschlag spart Tipparbeit,
   * er entscheidet nichts.
   */
  const STICHWOERTER = [
    ["kleinreparaturen", /kleinreparatur/i],
    ["instandhaltung", /instandsetzung|instandhaltung|reparatur des|defekt/i],
    ["neuanlage", /neuanlage|bodenaustausch|pflanzarbeiten/i],
    ["hauswart", /hauswart/i],
    ["gebaeudereinigung", /unterhaltsreinigung|treppenhausreinigung|gebäudereinigung/i],
    ["gartenpflege", /pflegeeinsatz|gartenpflege|grünpflege|heckenschnitt|rasen/i],
    ["grundsteuer", /grundsteuer/i],
    ["muell", /abfallentsorgung|müllbeseitigung|restabfall/i],
    ["strassenreinigung", /straßenreinigung/i],
    ["entwaesserung", /entwässerung|niederschlagswasser|schmutzwasser/i],
    ["wasser", /trinkwasser|wasserversorgung|frischwasser/i],
    ["allgemeinstrom", /allgemeinstrom|beleuchtung|arbeitspreis.*kwh/i],
    ["schornsteinfeger", /schornstein|feuerstättenschau|kehrung|abgasanlage/i],
    ["rauchwarnmelder", /rauchwarnmelder/i],
    ["rechtsschutz", /rechtsschutz/i],
    ["versicherung", /versicherung|haftpflicht/i],
    ["verwaltung", /verwaltervergütung|verwalterhonorar|verwaltung/i],
    ["kabel", /kabelanschluss|sammelinkasso|breitband/i],
  ];

  function schlageKostenartVor(bezeichnung, kontext = "") {
    // Erst die Position selbst ansehen - sie ist am aussagekräftigsten.
    for (const [schluessel, muster] of STICHWOERTER) {
      if (muster.test(bezeichnung)) return schluessel;
    }
    // Sonst die Überschrift des Belegs heranziehen. Beispiel: Die Positionen
    // "Absperrventil", "Monteurstunden", "Kleinmaterial" sagen für sich genommen
    // nichts aus - erst die Betreffzeile "Rechnung – Instandsetzung
    // Kaltwassersteigleitung" ordnet sie ein.
    for (const [schluessel, muster] of STICHWOERTER) {
      if (muster.test(kontext)) return schluessel;
    }
    return null;
  }

  /** Holt die Betreffzeile des Belegs ("Rechnung – ..."), als Kontext für oben. */
  function findeBetreff(text) {
    const zeilen = text.split("\n");
    // Das \b am Ende ist entscheidend: Ohne es galten auch "Rechnungsnr." und
    // "Rechnungsbetrag" als Betreffzeile. Positionen ohne eigenes Stichwort
    // bekamen dann keine Kostenart vorgeschlagen.
    const treffer = zeilen.find((z) =>
      /^(Rechnung|Gebührenbescheid|Beitragsrechnung|Jahresrechnung|Jahresübersicht|Grundbesitzabgabenbescheid)\b/i.test(z));
    return treffer || zeilen.slice(0, 12).join(" ");
  }

  /**
   * Liest Rechnungspositionen aus dem Text.
   * Erkannt wird das übliche Muster deutscher Rechnungen:
   *   <Nr.> <Bezeichnung> ... <weitere Zahlen> <Betrag> €
   * Der LETZTE Betrag einer Zeile ist der Positionsbetrag.
   */
  // Zeilen, die eine Summe oder Zahlungsmodalität sind und deshalb keine
  // Position sein können - sonst würde doppelt gezählt.
  const KEINE_POSITION =
    /^(summe|gesamt|zwischensumme|zzgl|abzgl|abzüglich|nachzahlung|rechnungsbetrag|betrag|netto|brutto|\d+\. rate|rate|gesamtbetrag|gesamtbeitrag|festsetzung|fälligkeit)/i;

  function findePositionen(text) {
    const positionen = [];
    const zeilen = text.split("\n");
    const betreff = findeBetreff(text);

    zeilen.forEach((zeile, index) => {
      // Zeile beginnt mit einer Positionsnummer (1..99) und endet mit einem Betrag.
      const treffer = /^(\d{1,2})\s+(.+?)\s+([\d.]+,\d{2})\s*€?\s*$/.exec(zeile);
      if (!treffer) return;

      const betrag = zahlAusText(treffer[3]);
      if (betrag === null || betrag === 0) return;

      // Aus der Beschreibung die Mengen-/Preisangaben entfernen, damit eine
      // lesbare Bezeichnung übrig bleibt.
      const bezeichnung = treffer[2]
        .replace(/\s+[\d.]+,\d{2}\s*€?\s*$/, "")
        .replace(/\s+\d+(,\d+)?\s*(Monate?|Stück|Std\.?|Pausch\.|Einsatz|lfm|m²|Melder|WE-Mon\.)\s*/gi, " ")
        .replace(/\s+[\d.]+,\d{2,3}\s*€(\/[A-Za-z²³.]+)?/g, "")
        .replace(/\s{2,}/g, " ")
        .trim();

      positionen.push({
        nummer: Number(treffer[1]),
        bezeichnung: bezeichnung || treffer[2].trim(),
        betrag,
        zeile: index + 1,
        quelle: "regel",
        kostenart_vorschlag: schlageKostenartVor(zeile, betreff),
      });
    });

    if (positionen.length > 0) return positionen;

    // ZWEITE STRATEGIE - für Belege ohne nummerierte Positionen (Bescheide,
    // Jahresübersichten). Hier steht je Zeile eine Bezeichnung und rechts ein
    // Betrag. Das ist unsicherer, deshalb entscheidet anschließend die Prüfung
    // I-04: Nur wenn die gefundenen Zeilen exakt die ausgewiesene Summe ergeben,
    // gilt der Beleg als gelesen - sonst geht er in Quarantäne.
    zeilen.forEach((zeile, index) => {
      if (KEINE_POSITION.test(zeile.trim())) return;
      const treffer = /^(.{3,}?)\s+([\d.]+,\d{2})\s*€?\s*$/.exec(zeile.trim());
      if (!treffer) return;

      const betrag = zahlAusText(treffer[2]);
      if (betrag === null || betrag === 0) return;

      // Aus der Bezeichnung die Zwischenzahlen entfernen (Mengen, Einzelpreise,
      // Steueranteile), damit eine lesbare Bezeichnung übrig bleibt.
      const bezeichnung = treffer[1]
        .replace(/\s*[\d.]+,\d{2,3}\s*€(\/[A-Za-z²³.]+)?/g, " ")
        .replace(/\s*\d+(,\d+)?\s*(m³|m²|kWh|Stück|Monate?)\b/gi, " ")
        .replace(/\s{2,}/g, " ")
        .trim();
      if (!bezeichnung || /^[\d.,\s€%]+$/.test(bezeichnung)) return;

      positionen.push({
        nummer: positionen.length + 1,
        bezeichnung,
        betrag,
        zeile: index + 1,
        quelle: "regel-tabelle",
        kostenart_vorschlag: schlageKostenartVor(zeile, betreff),
      });
    });
    return positionen;
  }

  /**
   * Baut aus einem Dokumenttext einen Belegvorschlag mitsamt Prüfungen.
   *
   * @param {string} rohtext    Text des Dokuments (aus PDF oder eingefügt)
   * @param {string} dateiname  nur zur Kennzeichnung
   * @param {object} objekt     Objektstammdaten, um den Objektbezug zu prüfen (optional)
   * @returns {{vorschlag, pruefungen, status}}
   */
  function schlageBelegVor(rohtext, dateiname, objekt) {
    const text = normalisiereText(rohtext);

    // --- Kopfdaten suchen (jeweils mit Fundstelle) -------------------------
    const lieferantZeile = text.split("\n").find((z) => z.length > 3) || "";
    const rechnungsnr = sucheMitAnker(text, /Rechnungsnr\.?\s*([A-Za-z0-9\-\/]+)/i)
      || sucheMitAnker(text, /Kassenzeichen\s*([A-Za-z0-9\-\/]+)/i)
      || sucheMitAnker(text, /Versicherungsschein\s*([A-Za-z0-9\-\/]+)/i);
    // ZWEI DATEN, ZWEI BEDEUTUNGEN - und sie sind oft verschieden:
    //   Rechnungsdatum  = wann die Rechnung geschrieben wurde
    //   Leistungsdatum  = wann die Leistung erbracht wurde
    // Für die Abrechnung nach dem Leistungsprinzip zählt das LEISTUNGSdatum:
    // Eine am 21.08. geschriebene Rechnung für eine Reparatur vom 19.08. gehört
    // in das Jahr der Reparatur. Deshalb hat das Leistungsdatum Vorrang.
    const rechnungsdatum = sucheMitAnker(text, /Datum\s+(\d{2}\.\d{2}\.\d{4})/i);
    const leistungsdatumFeld = sucheMitAnker(text, /Leistungsdatum\s+([^\n]+)/i);
    let leistungsdatum = null;
    if (leistungsdatumFeld) {
      // Bei einem Zeitraum ("22.–25.04.2025") gilt der Abschluss der Leistung,
      // also das letzte Datum im Feld.
      const alleDaten = leistungsdatumFeld.roh.match(/\d{2}\.\d{2}\.\d{4}/g);
      if (alleDaten) {
        leistungsdatum = { ...leistungsdatumFeld, roh: alleDaten[alleDaten.length - 1] };
      }
    }
    // Bewusst KEIN Rückgriff auf "irgendein Datum im Dokument": Ein geratenes
    // Datum wäre schlimmer als gar keines. Fehlt beides, meldet Prüfung I-01
    // ein Pflichtfeld und der Beleg geht in Quarantäne.
    const datum = leistungsdatum || rechnungsdatum;
    const zeitraum = sucheMitAnker(
      text, /(?:Leistungszeitraum|Abrechnungszeitraum|Erhebungszeitraum|Versicherungsjahr)\s+(\d{2}\.\d{2}\.\d{4}\s*[–—-]\s*\d{2}\.\d{2}\.\d{4})/i)
      || sucheMitAnker(text, /Leistungsdatum\s+([\d.–—\s-]+\d{4})/i);

    // Gesamtbetrag: mehrere übliche Bezeichnungen, in dieser Reihenfolge.
    const betragTreffer =
      sucheMitAnker(text, /Rechnungsbetrag\s+([\d.]+,\d{2})/i) ||
      sucheMitAnker(text, /Gesamtbetrag(?:\s+\d{4})?\s+([\d.]+,\d{2})/i) ||
      sucheMitAnker(text, /Gesamtbeitrag(?:\s+\d{4})?\s+([\d.]+,\d{2})/i) ||
      sucheMitAnker(text, /Summe Verbrauchskosten(?:\s+\d{4})?\s+([\d.]+,\d{2})/i) ||
      sucheMitAnker(text, /Summe\s+\d{4}\s+[\d.]+,\d{2}\s*€?\s+[\d.]+,\d{2}\s*€?\s+([\d.]+,\d{2})/i);

    const umsatzsteuer = sucheMitAnker(text, /zzgl\.\s*\d+\s*%\s*Umsatzsteuer\s+([\d.]+,\d{2})/i);
    const netto = sucheMitAnker(text, /(?:Zwischensumme netto|Netto)\s+([\d.]+,\d{2})/i);

    let positionen = findePositionen(text);

    // NETTO ODER BRUTTO? Viele Rechnungen weisen die Positionen netto aus und
    // schlagen die Umsatzsteuer erst am Ende auf. Umgelegt wird aber der
    // Bruttobetrag (die Vermieterin kann bei Wohnraum keine Vorsteuer ziehen).
    // Deshalb wird die ausgewiesene Steuer centgenau auf die Positionen verteilt
    // - mit derselben Funktion, die auch die Kosten auf die Wohnungen verteilt.
    const bruttoBetrag = betragTreffer ? zahlAusText(betragTreffer.roh) : null;
    const nettoBetrag = netto ? zahlAusText(netto.roh) : null;
    const ustBetrag = umsatzsteuer ? zahlAusText(umsatzsteuer.roh) : null;
    let ustVerteilt = false;

    if (positionen.length && nettoBetrag !== null && ustBetrag !== null && bruttoBetrag !== null) {
      const summePositionen = Math.round(positionen.reduce((s, p) => s + p.betrag, 0) * 100);
      const passtZuNetto = summePositionen === Math.round(nettoBetrag * 100);
      const bruttoStimmt = Math.round((nettoBetrag + ustBetrag) * 100) === Math.round(bruttoBetrag * 100);

      if (passtZuNetto && bruttoStimmt) {
        const anteile = verteileCentgenau(
          Math.round(ustBetrag * 100),
          positionen.map((p) => Math.round(p.betrag * 100))
        );
        positionen = positionen.map((p, i) => ({
          ...p,
          betrag: Math.round(p.betrag * 100 + anteile[i]) / 100,
          netto: p.betrag,
          hinweis: "brutto, Umsatzsteuer anteilig aufgeschlagen",
        }));
        ustVerteilt = true;
      }
    }

    const vorschlag = {
      beleg: dateiname || "unbenannt.pdf",
      lieferant: lieferantZeile.replace(/\s{2,}.*$/, "").trim(),
      rechnungsnr: rechnungsnr ? rechnungsnr.roh : null,
      datum: datum ? datumAusText(datum.roh) : null,
      datum_art: leistungsdatum ? "Leistungsdatum" : rechnungsdatum ? "Rechnungsdatum" : null,
      rechnungsdatum: rechnungsdatum ? datumAusText(rechnungsdatum.roh) : null,
      leistungszeitraum: zeitraum ? zeitraum.roh.replace(/\s+/g, " ") : null,
      rechnungsbetrag: bruttoBetrag,
      netto: nettoBetrag,
      umsatzsteuer: ustBetrag,
      ust_auf_positionen_verteilt: ustVerteilt,
      bank_kennung: "",
      positionen: positionen.map((p) => ({
        bezeichnung: p.bezeichnung,
        betrag: p.betrag,
        // Der Nettowert bleibt erhalten: Er ist die Stelle, die wörtlich im
        // Dokument steht, und damit der Anker für den aufgeschlagenen Bruttowert.
        ...(p.netto !== undefined ? { netto: p.netto, hinweis: p.hinweis } : {}),
        kostenart: p.kostenart_vorschlag,   // VORSCHLAG - muss bestätigt werden
        umlagefaehig: null,                 // bewusst offen
        begruendung: "",
      })),
      anker: {
        rechnungsnr: rechnungsnr || null,
        datum: datum || null,
        leistungszeitraum: zeitraum || null,
        rechnungsbetrag: betragTreffer || null,
      },
      text,
    };

    const pruefungen = pruefeVorschlag(vorschlag, text, objekt);
    const blocker = pruefungen.filter((p) => !p.bestanden && p.schwere === "blocker");

    return {
      vorschlag,
      pruefungen,
      status: blocker.length === 0 ? "geprueft" : "quarantaene",
    };
  }

  /* ===========================================================================
   * TEIL 4 - DIE PRÜFUNGEN AM EINZELNEN DOKUMENT
   * Diese laufen, BEVOR der Beleg in die Abrechnung darf (SPEC.md § 5, L0).
   * ========================================================================= */

  function pruefeVorschlag(v, text, objekt) {
    const p = [];
    const pruefe = (id, titel, schwere, bestanden, befund) =>
      p.push({ id, titel, schwere, bestanden, befund });

    // I-13: Anker-Regel - jeder Wert muss wörtlich im Dokument stehen.
    const nichtVerankert = [];
    if (v.rechnungsbetrag !== null) {
      const alsText = v.rechnungsbetrag.toLocaleString("de-DE", {
        minimumFractionDigits: 2, maximumFractionDigits: 2 });
      if (!text.includes(alsText)) nichtVerankert.push(`Rechnungsbetrag ${alsText}`);
    }
    for (const pos of v.positionen) {
      // Wurde die Umsatzsteuer auf die Position aufgeschlagen, steht der
      // Bruttobetrag nicht im Dokument - dann wird der NETTOwert verankert,
      // aus dem er entstanden ist. Der Rechenweg dorthin ist geprüft (I-04/I-09).
      const zuPruefen = pos.netto !== undefined ? pos.netto : pos.betrag;
      const alsText = zuPruefen.toLocaleString("de-DE", {
        minimumFractionDigits: 2, maximumFractionDigits: 2 });
      if (!text.includes(alsText)) nichtVerankert.push(`Position ${alsText}`);
    }
    pruefe("I-13", "Jeder Wert steht wörtlich im Dokument (Anker-Regel)", "blocker",
      nichtVerankert.length === 0,
      nichtVerankert.length ? nichtVerankert.join(", ") : "alle Werte belegt");

    // Pflichtfelder - ohne die kann nicht gebucht werden.
    const fehlt = [];
    if (!v.lieferant) fehlt.push("Lieferant");
    if (!v.datum) fehlt.push("Datum");
    if (v.rechnungsbetrag === null) fehlt.push("Rechnungsbetrag");
    if (v.positionen.length === 0) fehlt.push("mindestens eine Position");
    pruefe("I-01", "Pflichtfelder erkannt", "blocker", fehlt.length === 0,
      fehlt.length ? "nicht erkannt: " + fehlt.join(", ") : "vollständig");

    // I-02: Ist der ausgelesene Text überhaupt brauchbar? Ein eingescanntes
    // Dokument ohne Texterkennung liefert wenige, oft sinnlose Zeichen. Dann ist
    // nichts zu retten - der Beleg muss von Hand erfasst werden.
    const buchstaben = (text.match(/[A-Za-zÄÖÜäöüß]/g) || []).length;
    pruefe("I-02", "Text aus dem Dokument ist verwertbar", "blocker",
      text.length >= 120 && buchstaben / Math.max(1, text.length) > 0.3,
      text.length < 120
        ? `nur ${text.length} Zeichen gefunden - vermutlich ein Scan ohne Texterkennung`
        : `${text.length} Zeichen, davon ${Math.round((buchstaben / text.length) * 100)} % Buchstaben`);

    // I-08: Gehört der Beleg zu DIESEM Objekt? Eine Rechnung für ein anderes
    // Haus sieht sonst völlig plausibel aus und wandert stillschweigend in die
    // Umlage. Geprüft wird gegen Straße und Postleitzahl des Objekts.
    if (objekt && objekt.strasse) {
      const strasse = objekt.strasse.replace(/\s*\d+.*$/, "").trim();   // "Berrenrather Straße"
      const hausnummer = (objekt.strasse.match(/\d+/) || [""])[0];
      const plz = (objekt.plz_ort || "").match(/\d{5}/);
      const treffer = text.includes(strasse) && text.includes(hausnummer);
      pruefe("I-08", "Beleg nennt dieses Objekt", "warnung",
        treffer || (plz && text.includes(plz[0])),
        treffer ? `Objektbezug "${strasse} ${hausnummer}" im Dokument gefunden`
          : "ACHTUNG: weder Anschrift noch Postleitzahl des Objekts im Dokument - falscher Beleg?");
    }

    // I-11: Manche Bescheide nennen zusätzlich Raten oder Monatszeilen. Ergeben
    // die zusammen den Jahresbetrag, ist das ein zweiter, unabhängiger Beleg
    // dafür, dass der Gesamtbetrag richtig gelesen wurde.
    const raten = [...text.matchAll(/(?:\d\.\s*Rate|Rate)\s+\d{2}\.\d{2}\.\d{4}\s+([\d.]+,\d{2})/gi)]
      .map((m) => zahlAusText(m[1]));
    if (raten.length >= 2 && v.rechnungsbetrag !== null) {
      const summeRaten = Math.round(raten.reduce((a, b) => a + b, 0) * 100);
      pruefe("I-11", "Summe der Raten ergibt den Jahresbetrag", "blocker",
        summeRaten === Math.round(v.rechnungsbetrag * 100),
        `${raten.length} Raten ergeben ${(summeRaten / 100).toFixed(2)} € ` +
          `(Jahresbetrag ${v.rechnungsbetrag.toFixed(2)} €)`);
    }

    // I-04: Positionen müssen die Rechnungssumme ergeben.
    if (v.rechnungsbetrag !== null && v.positionen.length) {
      const summe = Math.round(v.positionen.reduce((s, pos) => s + pos.betrag, 0) * 100);
      const soll = Math.round(v.rechnungsbetrag * 100);
      pruefe("I-04", "Positionen ergeben den Rechnungsbetrag", "blocker", summe === soll,
        summe === soll
          ? (v.ust_auf_positionen_verteilt
              ? "Positionen = Rechnungsbetrag (Umsatzsteuer anteilig verteilt)"
              : "Positionen = Rechnungsbetrag")
          : `Positionen ${(summe / 100).toFixed(2)} vs. Rechnungsbetrag ${v.rechnungsbetrag.toFixed(2)}`);
    }

    // I-09: Netto + Umsatzsteuer muss den Bruttobetrag ergeben.
    if (v.netto !== null && v.umsatzsteuer !== null && v.rechnungsbetrag !== null) {
      const summe = Math.round((v.netto + v.umsatzsteuer) * 100);
      pruefe("I-09", "Netto + Umsatzsteuer == Bruttobetrag", "blocker",
        summe === Math.round(v.rechnungsbetrag * 100),
        `${v.netto.toFixed(2)} + ${v.umsatzsteuer.toFixed(2)} = ${(summe / 100).toFixed(2)}`);
    }

    // I-12: Datum plausibel.
    if (v.datum) {
      const jahr = Number(v.datum.slice(0, 4));
      pruefe("I-12", "Datum plausibel", "blocker", jahr >= 2000 && jahr <= 2100, v.datum);
    }

    // Fachliche Zuordnung fehlt noch - das ist keine Störung, sondern der
    // vorgesehene nächste Schritt durch einen Menschen.
    const ohneKostenart = v.positionen.filter((pos) => !pos.kostenart).length;
    pruefe("Z-01", "Kostenart je Position vorgeschlagen", "warnung", ohneKostenart === 0,
      ohneKostenart ? `${ohneKostenart} Position(en) ohne Vorschlag - bitte zuordnen`
        : "für alle Positionen vorgeschlagen");

    pruefe("Z-02", "Umlagefähigkeit bestätigt", "warnung",
      v.positionen.every((pos) => pos.umlagefaehig !== null),
      "muss vor der Übernahme bestätigt werden");

    return p;
  }

  /* ===========================================================================
   * TEIL 5 - ÜBERNAHME IN DEN FALL
   * ========================================================================= */

  /**
   * Prüft, ob ein bestätigter Vorschlag in den Fall übernommen werden darf,
   * und hängt ihn an. Gibt zurück, was passiert ist.
   */
  /**
   * Sucht im Kontoauszug die Abbuchung, die zu diesem Rechnungsbetrag passt,
   * und liefert deren Gegenpartei als Bank-Kennung zurück.
   *
   * Warum nicht einfach den Lieferantennamen nehmen: Auf dem Kontoauszug steht
   * "SANITAER DOBLINGER GMBH", auf der Rechnung "Sanitär Doblinger GmbH". Das
   * erste Wort zu raten ergibt "SANITÄR" - und die Zahlungsprüfung P-01 findet
   * die Zahlung nicht. Der Betrag dagegen ist eindeutig.
   */
  function findeBankKennung(fall, betrag) {
    const gesucht = Math.round(betrag * 100);
    const treffer = (fall.buchungen || []).filter(
      (b) => Math.round(-b.betrag * 100) === gesucht);
    if (treffer.length !== 1) return null;    // mehrdeutig oder nicht gefunden
    return treffer[0].gegenpartei;
  }

  /**
   * Vergleicht zwei Lieferantennamen grosszügig.
   * Der aus dem PDF gelesene Name trägt oft noch die Anschrift mit sich; der
   * erfasste ist gekürzt. Verglichen werden deshalb nur Buchstaben und Ziffern
   * der ersten Wörter - das genügt, um "Clean&Go Gebäudeservice GmbH" und
   * "Clean&Go; Gebäudeservice GmbH Vitalisstraße 300" als denselben zu erkennen.
   */
  function aehnlicherLieferant(a, b) {
    const kern = (text) => String(text || "").toUpperCase()
      .replace(/[^A-ZÄÖÜ0-9]/g, "").slice(0, 16);
    const ka = kern(a), kb = kern(b);
    return ka.length >= 6 && kb.length >= 6 && (ka.startsWith(kb) || kb.startsWith(ka));
  }

  function uebernimm(fall, vorschlag) {
    const fehler = [];

    if (!vorschlag.positionen.length) fehler.push("keine Positionen");
    for (const pos of vorschlag.positionen) {
      if (!pos.kostenart) fehler.push(`Position "${pos.bezeichnung}": keine Kostenart gewählt`);
      else if (!fall.kostenarten[pos.kostenart]) fehler.push(`unbekannte Kostenart "${pos.kostenart}"`);
      if (pos.umlagefaehig === null) fehler.push(`Position "${pos.bezeichnung}": Umlagefähigkeit nicht bestätigt`);
      if (pos.umlagefaehig === false && !/§|BGH|TKG|BetrKV|Urteil/i.test(pos.begruendung || ""))
        fehler.push(`Position "${pos.bezeichnung}": Nicht-Umlage braucht eine Begründung mit Fundstelle (R-03)`);
    }
    const summe = Math.round(vorschlag.positionen.reduce((s, p) => s + p.betrag, 0) * 100);
    if (summe !== Math.round(vorschlag.rechnungsbetrag * 100))
      fehler.push("Positionen ergeben nicht den Rechnungsbetrag (I-04)");

    // Dublettenprüfung auf drei Wegen - ein anderer Dateiname macht aus
    // derselben Rechnung keine zweite Rechnung.
    if (fall.belege.some((b) => b.beleg === vorschlag.beleg))
      fehler.push(`Ein Beleg mit dem Namen "${vorschlag.beleg}" ist bereits erfasst (I-07)`);
    // Rechnungsnummer plus Betrag: Zwei Lieferanten können dieselbe Nummer
    // vergeben, aber kaum mit demselben Betrag am selben Objekt.
    if (vorschlag.rechnungsnr && fall.belege.some(
          (b) => b.rechnungsnr === vorschlag.rechnungsnr
              && Math.round(b.rechnungsbetrag * 100) === Math.round(vorschlag.rechnungsbetrag * 100)))
      fehler.push(`Rechnung ${vorschlag.rechnungsnr} über ${vorschlag.rechnungsbetrag.toFixed(2)} € ist bereits erfasst (I-07)`);

    // Lieferant, Betrag und Datum. Der Lieferantenname wird dabei grosszügig
    // verglichen: Aus dem PDF kommt "Clean&Go; Gebäudeservice GmbH Vitalisstraße
    // 300, 50933 Köln", erfasst ist "Clean&Go Gebäudeservice GmbH".
    if (fall.belege.some((b) => aehnlicherLieferant(b.lieferant, vorschlag.lieferant)
          && Math.round(b.rechnungsbetrag * 100) === Math.round(vorschlag.rechnungsbetrag * 100)
          && b.datum === vorschlag.datum))
      fehler.push(`Gleicher Lieferant, Betrag und Datum bereits erfasst - Dublette? (I-07)`);

    if (fehler.length) return { uebernommen: false, fehler };

    fall.belege.push({
      id: "neu-" + Date.now(),
      beleg: vorschlag.beleg,
      lieferant: vorschlag.lieferant,
      datum: vorschlag.datum,
      leistungszeitraum: vorschlag.leistungszeitraum || "",
      rechnungsbetrag: vorschlag.rechnungsbetrag,
      ...(vorschlag.rechnungsnr ? { rechnungsnr: vorschlag.rechnungsnr } : {}),
      bank_kennung: vorschlag.bank_kennung
        || findeBankKennung(fall, vorschlag.rechnungsbetrag)
        || "",
      positionen: vorschlag.positionen.map((p) => ({
        bezeichnung: p.bezeichnung,
        betrag: p.betrag,
        kostenart: p.kostenart,
        umlagefaehig: p.umlagefaehig,
        ...(p.begruendung ? { begruendung: p.begruendung } : {}),
      })),
    });

    fall.protokoll = fall.protokoll || [];
    fall.protokoll.push({
      zeitpunkt: new Date().toISOString().slice(0, 19).replace("T", " "),
      wer: "Oberfläche",
      was: `Beleg "${vorschlag.beleg}" über ${vorschlag.rechnungsbetrag.toFixed(2)} € erfasst`,
      warum: "Einlesen und Bestätigung durch Benutzer",
    });

    return { uebernommen: true, fehler: [] };
  }

  /**
   * Entfernt einen Beleg aus dem Fall.
   *
   * Wozu: Ein Beleg kann falsch sein - falsches Objekt, Dublette, oder es kommt
   * eine korrigierte Fassung. Ohne diese Funktion könnte man Belege nur
   * hinzufügen, nie zurücknehmen; ein Austausch wäre unmöglich.
   * Der Vorgang landet im Protokoll, damit später nachvollziehbar bleibt,
   * warum ein Beleg verschwunden ist.
   */
  function entferneBeleg(fall, belegName, grund) {
    const stelle = fall.belege.findIndex((b) => b.beleg === belegName);
    if (stelle === -1) return { entfernt: false, fehler: [`Beleg "${belegName}" nicht gefunden`] };

    const [entfernt] = fall.belege.splice(stelle, 1);
    fall.protokoll = fall.protokoll || [];
    fall.protokoll.push({
      zeitpunkt: new Date().toISOString().slice(0, 19).replace("T", " "),
      wer: "Oberfläche",
      was: `Beleg "${belegName}" über ${entfernt.rechnungsbetrag.toFixed(2)} € entfernt`,
      warum: grund || "kein Grund angegeben",
    });
    return { entfernt: true, beleg: entfernt, fehler: [] };
  }

  /**
   * Nimmt eine einzelne Kontobewegung auf.
   *
   * Wozu: Nicht jede Zahlung steht auf dem Objektkonto. Geht eine Miete auf ein
   * anderes Konto ein oder taucht ein Beleg später auf, muss sich die Buchung
   * nachtragen lassen - sonst rechnet die Abrechnung mit einer Zahlung, die es
   * gegeben hat, aber nicht sichtbar ist.
   *
   * Positiver Betrag = Eingang (Miete), negativer = Abbuchung (Rechnung).
   */
  function fuegeBuchungHinzu(fall, buchung, grund) {
    const fehler = [];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(buchung.datum || "")) fehler.push("Datum fehlt oder hat nicht die Form JJJJ-MM-TT");
    if (!String(buchung.gegenpartei || "").trim()) fehler.push("Gegenpartei fehlt - darüber wird die Zahlung zugeordnet");
    const betrag = Number(buchung.betrag);
    if (!Number.isFinite(betrag) || betrag === 0) fehler.push("Betrag fehlt oder ist null");
    if (fehler.length) return { hinzugefuegt: false, fehler };

    fall.buchungen.push({
      datum: buchung.datum,
      gegenpartei: String(buchung.gegenpartei).trim(),
      zweck: String(buchung.zweck || "").trim(),
      betrag: Math.round(betrag * 100) / 100,
    });
    fall.buchungen.sort((a, b) => a.datum.localeCompare(b.datum));

    fall.protokoll = fall.protokoll || [];
    fall.protokoll.push({
      zeitpunkt: new Date().toISOString().slice(0, 19).replace("T", " "),
      wer: "Oberfläche",
      was: `Buchung ${buchung.datum} ${buchung.gegenpartei} ${betrag.toFixed(2)} € nachgetragen`,
      warum: grund || "kein Grund angegeben",
    });
    return { hinzugefuegt: true, fehler: [] };
  }

  const API = {
    normalisiereText, textAusPdf, schlageBelegVor, pruefeVorschlag, uebernimm, findeBankKennung,
    entferneBeleg, fuegeBuchungHinzu,
    zahlAusText, datumAusText, findePositionen, schlageKostenartVor,
  };

  if (typeof module === "object" && module.exports) module.exports = API;
  else global.Einlesen = API;
})(typeof self !== "undefined" ? self : globalThis);
