/* =============================================================================
 * RECHENKERN DER NEBENKOSTENABRECHNUNG
 * =============================================================================
 *
 * WAS DIESE DATEI IST
 *   Die gesamte Rechen- und Prüflogik der Abrechnung - in einer Datei, damit man
 *   sie am Stück lesen kann. Sie bekommt einen "Fall" (daten/fall_2025.json) und
 *   gibt ein "Ergebnis" zurück. Mehr macht sie nicht.
 *
 * WAS SIE BEWUSST NICHT TUT
 *   - Sie liest und schreibt keine Dateien.
 *   - Sie erzeugt kein HTML und kein PDF.
 *   - Sie kennt keinen Browser und kein Node.
 *   Dadurch kann derselbe Code im Browser (Oberfläche) und in Node (Tests)
 *   laufen, und es gibt nur EINE Rechenlogik - keine zweite, die abweichen kann.
 *
 * AUFBAU
 *   TEIL 1  Geld: Rechnen in ganzen Cent und centgenaues Verteilen
 *   TEIL 2  Zeit: Tage, Monate, Zeitanteile
 *   TEIL 3  Die Berechnung
 *   TEIL 4  Die Prüfungen (Katalog aus SPEC.md)
 *   TEIL 5  Export
 *
 * GRUNDREGEL DES GANZEN SYSTEMS
 *   Intern wird ausschließlich in GANZEN CENT gerechnet (also 442,00 EUR = 44200).
 *   Grund: Kommazahlen sind im Computer nicht exakt (0.1 + 0.2 ergibt 0.30000000000000004).
 *   Bei Geld führt das früher oder später zu Cent-Differenzen. Ganze Zahlen sind
 *   exakt. Erst bei der Anzeige wird wieder in Euro umgerechnet.
 * ========================================================================== */

(function (global) {
  "use strict";

  /* ===========================================================================
   * TEIL 1 - GELD
   * ========================================================================= */

  /** Euro (z. B. 442.00) -> ganze Cent (44200). */
  function zuCent(euro) {
    return Math.round(euro * 100);
  }

  /** Ganze Cent (44200) -> Euro als Zahl (442). Nur für Anzeige/Export. */
  function zuEuro(cent) {
    return cent / 100;
  }

  /** Ganze Cent -> deutscher Text, z. B. 44200 -> "442,00 EUR". */
  function alsEuroText(cent) {
    const text = Math.abs(cent / 100).toLocaleString("de-DE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return (cent < 0 ? "−" : "") + text + " €";
  }

  /** "2025-08-01" -> "01.08.2025". Für Anzeige und Schreiben. */
  function alsDatumText(iso) {
    const [jahr, monat, tag] = iso.split("-");
    return `${tag}.${monat}.${jahr}`;
  }

  /** 0.248 -> "24,800 %". Nachkommastellen einstellbar. */
  function alsProzentText(anteil, nachkommastellen = 3) {
    return (
      (anteil * 100).toLocaleString("de-DE", {
        minimumFractionDigits: nachkommastellen,
        maximumFractionDigits: nachkommastellen,
      }) + " %"
    );
  }

  /** 62 -> "62,00". Für Quadratmeterangaben. */
  function alsZahlText(zahl, nachkommastellen = 2) {
    return zahl.toLocaleString("de-DE", {
      minimumFractionDigits: nachkommastellen,
      maximumFractionDigits: nachkommastellen,
    });
  }

  /**
   * VERTEILT EINEN BETRAG CENTGENAU (Largest-Remainder-Verfahren)
   * ---------------------------------------------------------------------------
   * Das Problem: 1.096,00 EUR sollen nach Wohnfläche auf vier Wohnungen verteilt
   * werden. Die exakten Anteile sind 271,808 / 212,624 / 368,256 / 243,312 EUR.
   * Rundet man jeden Wert einzeln kaufmännisch, ergibt die Summe der gerundeten
   * Werte nicht mehr exakt 1.096,00 EUR - es fehlen oder es entstehen Cent.
   * Genau dieser Fehler steckte in v1 (siehe SPEC.md § 9.2: 2 Cent Differenz).
   *
   * Die Lösung (Largest Remainder / Hare-Niemeyer, dasselbe Verfahren wie bei
   * Sitzverteilungen):
   *   1. Jeden Anteil exakt berechnen und ABRUNDEN.
   *   2. Es bleibt ein Rest von wenigen Cent übrig (Gesamt minus Summe der
   *      abgerundeten Werte).
   *   3. Diese Rest-Cent bekommen die Anteile mit dem GRÖSSTEN abgeschnittenen
   *      Nachkommateil - einer je Cent.
   * Ergebnis: Die Summe stimmt danach immer exakt, und jeder Anteil weicht um
   * höchstens einen Cent vom mathematisch exakten Wert ab.
   *
   * @param {number}   gesamtCent  zu verteilender Betrag in ganzen Cent (>= 0)
   * @param {number[]} gewichte    z. B. Wohnflächen oder Nutzungstage
   * @returns {number[]}           Anteile in ganzen Cent, Summe == gesamtCent
   */
  function verteileCentgenau(gesamtCent, gewichte) {
    const summeGewichte = gewichte.reduce((a, b) => a + b, 0);

    // Ohne Gewichte kann nichts verteilt werden (z. B. Einheit ohne Mieter).
    if (summeGewichte <= 0) return gewichte.map(() => 0);

    // Schritt 1: exakter Anteil und daraus der abgerundete Wert.
    const exakt = gewichte.map((g) => (gesamtCent * g) / summeGewichte);
    const anteile = exakt.map((wert) => Math.floor(wert));

    // Schritt 2: wie viele Cent sind durch das Abrunden übrig geblieben?
    let restCent = gesamtCent - anteile.reduce((a, b) => a + b, 0);

    // Schritt 3: Rest-Cent nach Größe des abgeschnittenen Nachkommateils vergeben.
    // Bei exaktem Gleichstand entscheidet die ursprüngliche Reihenfolge
    // (JavaScript sortiert stabil) - damit ist das Ergebnis reproduzierbar.
    const nachRestSortiert = exakt
      .map((wert, index) => ({ index, nachkomma: wert - Math.floor(wert) }))
      .sort((a, b) => b.nachkomma - a.nachkomma);

    for (let i = 0; i < restCent; i++) {
      anteile[nachRestSortiert[i % nachRestSortiert.length].index] += 1;
    }
    return anteile;
  }

  /* ===========================================================================
   * TEIL 2 - ZEIT
   * ========================================================================= */

  /** "2025-08-01" -> Date. Immer UTC, damit Sommerzeit nichts verschiebt. */
  function alsDatum(iso) {
    return new Date(iso + "T00:00:00Z");
  }

  /** Anzahl Tage von..bis, beide Tage mitgezählt. 01.01.-31.12.2025 = 365. */
  function tageZwischen(vonIso, bisIso) {
    const EIN_TAG = 24 * 60 * 60 * 1000;
    return Math.round((alsDatum(bisIso) - alsDatum(vonIso)) / EIN_TAG) + 1;
  }

  /** Angefangene Kalendermonate, beide mitgezählt. Januar..Juli = 7. */
  function monateZwischen(vonIso, bisIso) {
    const a = alsDatum(vonIso);
    const b = alsDatum(bisIso);
    return (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth()) + 1;
  }

  /** Das spätere von zwei Daten (als ISO-Text). */
  const spaeteres = (a, b) => (a > b ? a : b);
  /** Das frühere von zwei Daten (als ISO-Text). */
  const frueheres = (a, b) => (a < b ? a : b);

  /* ===========================================================================
   * TEIL 3 - DIE BERECHNUNG
   * ===========================================================================
   *
   * Der Rechenweg in einem Satz:
   *
   *   Anteil = Gesamtkosten der Kostenart
   *            x  Wohnfläche der Einheit / Gesamtwohnfläche
   *            x  Nutzungstage des Mietverhältnisses / Tage im Abrechnungsjahr
   *
   * Umgesetzt wird das in ZWEI Verteilschritten, beide centgenau:
   *   Schritt A: Kostenart  ->  die vier Einheiten   (Gewicht: Wohnfläche)
   *   Schritt B: Einheit    ->  ihre Mietverhältnisse (Gewicht: Nutzungstage)
   *
   * Warum zwei Schritte und nicht eine Multiplikation? Weil so per Konstruktion
   * gilt: Summe aller Mieteranteile == Gesamtkosten, auf den Cent. Die Prüfungen
   * A-02/A-03/F-09 können danach gar nicht mehr fehlschlagen.
   * ========================================================================= */

  function berechne(fall) {
    const zeitraumVon = fall.abrechnung.von;
    const zeitraumBis = fall.abrechnung.bis;
    const tageImJahr = tageZwischen(zeitraumVon, zeitraumBis);
    const einstellungen = fall.einstellungen;

    // -----------------------------------------------------------------------
    // 3.1  Mietverhältnisse vorbereiten: Wie lange war wer im Jahr Mieter?
    // -----------------------------------------------------------------------
    const mietverhaeltnisse = fall.mietverhaeltnisse.map((m) => {
      // Ein Mietverhältnis kann vor dem Jahr begonnen und nach ihm geendet haben.
      // Uns interessiert nur der Teil, der IM Abrechnungszeitraum liegt.
      const nutzungVon = spaeteres(m.beginn, zeitraumVon);
      const nutzungBis = frueheres(m.ende || zeitraumBis, zeitraumBis);

      const tage = tageZwischen(nutzungVon, nutzungBis);
      const monate = monateZwischen(nutzungVon, nutzungBis);

      // Das Gewicht für Schritt B. "tage" ist der Normalfall (taggenau),
      // "monate" die Alternative aus den Einstellungen.
      const gewicht = einstellungen.zeitanteil_methode === "monate" ? monate : tage;

      return {
        ...m,
        nutzung_von: nutzungVon,
        nutzung_bis: nutzungBis,
        tage,
        monate,
        gewicht,
        ganzjahr: tage === tageImJahr,
        zeit_text:
          einstellungen.zeitanteil_methode === "monate"
            ? `${monate}/12 Monate`
            : `${tage}/${tageImJahr} Tage`,
        zeilen: [],       // wird in 3.3 gefüllt
        summe_cent: 0,    // ebenso
      };
    });

    // -----------------------------------------------------------------------
    // 3.2  Kosten je Kostenart aus den Belegen zusammenzählen
    // -----------------------------------------------------------------------
    const kostenarten = [];
    for (const [schluessel, stamm] of Object.entries(fall.kostenarten)) {
      kostenarten.push({
        schluessel,
        bezeichnung: stamm.bezeichnung,
        betrkv: stamm.betrkv,           // Rechtsgrundlage (Betriebskostenverordnung)
        vertrag: stamm.vertrag || "",   // Vertragsgrundlage (§ 4 des Mietvertrags)
        warum: stamm.warum || "",       // dieselbe Aussage in normaler Sprache
        konto: stamm.konto,
        umlagefaehig_bis: stamm.umlagefaehig_bis || null,
        gesamt_cent: 0,
        positionen: [],
        umlagefaehig: stamm.umlagefaehig,
      });
    }
    const kostenartNach = {};
    kostenarten.forEach((k) => (kostenartNach[k.schluessel] = k));

    for (const beleg of fall.belege) {
      // Beim Abflussprinzip zählt nicht der Rechnungsbetrag, sondern was im
      // Abrechnungsjahr tatsächlich vom Konto abgeflossen ist. Betroffen ist hier
      // nur die RheinEnergie-Jahresrechnung (Rechnung 2026, Abschläge 2025).
      const abflussAbweichend =
        einstellungen.kostenansatz === "abfluss" && typeof beleg.abfluss_im_abrechnungsjahr === "number";

      for (const position of beleg.positionen) {
        let betragCent = zuCent(position.betrag);
        if (abflussAbweichend) {
          betragCent = Math.round(
            (betragCent * zuCent(beleg.abfluss_im_abrechnungsjahr)) / zuCent(beleg.rechnungsbetrag)
          );
        }

        const kostenart = kostenartNach[position.kostenart];
        kostenart.gesamt_cent += betragCent;
        kostenart.positionen.push({
          beleg: beleg.beleg,
          lieferant: beleg.lieferant,
          datum: beleg.datum,
          leistungszeitraum: beleg.leistungszeitraum,
          bezeichnung: position.bezeichnung,
          betrag_cent: betragCent,
          umlagefaehig: position.umlagefaehig,
          begruendung: position.begruendung || "",
        });
      }
    }

    // Eine Kostenart gilt als umlagefähig, wenn ALLE ihre Positionen es sind.
    // Maßgeblich ist immer die Position, nicht die Kostenart - so kann eine
    // Hauswartrechnung teils umlagefähig, teils Instandhaltung sein.
    for (const k of kostenarten) {
      if (k.positionen.length > 0) {
        k.umlagefaehig = k.positionen.every((p) => p.umlagefaehig);
      }
    }

    const benutzteKostenarten = kostenarten.filter((k) => k.positionen.length > 0);
    const umlagefaehige = benutzteKostenarten.filter((k) => k.umlagefaehig);
    const nichtUmlagefaehige = benutzteKostenarten.filter((k) => !k.umlagefaehig);

    // -----------------------------------------------------------------------
    // 3.3  Verteilen: Kostenart -> Einheiten -> Mietverhältnisse
    // -----------------------------------------------------------------------
    // Gewicht für Schritt A: die Wohnfläche. Wir nehmen sie mal 100 als ganze
    // Zahl (62,00 m² -> 6200), damit auch hier keine Kommazahlen mitrechnen.
    const einheiten = fall.einheiten.map((e) => ({
      ...e,
      flaeche_gewicht: Math.round(e.wohnflaeche_qm * 100),
      jahresanteil_cent: 0,
    }));
    const flaecheGesamt = einheiten.reduce((summe, e) => summe + e.wohnflaeche_qm, 0);

    for (const kostenart of umlagefaehige) {
      // --- Schritt A: Gesamtkosten auf die Einheiten -----------------------
      const anteileJeEinheit = verteileCentgenau(
        kostenart.gesamt_cent,
        einheiten.map((e) => e.flaeche_gewicht)
      );
      kostenart.anteile_je_einheit = {};

      einheiten.forEach((einheit, i) => {
        const einheitAnteilCent = anteileJeEinheit[i];
        kostenart.anteile_je_einheit[einheit.we] = einheitAnteilCent;
        einheit.jahresanteil_cent += einheitAnteilCent;

        // --- Schritt B: Anteil der Einheit auf ihre Mietverhältnisse -------
        const mieterDieserEinheit = mietverhaeltnisse.filter((m) => m.we === einheit.we);
        const anteileJeMieter = verteileCentgenau(
          einheitAnteilCent,
          mieterDieserEinheit.map((m) => m.gewicht)
        );

        mieterDieserEinheit.forEach((mietverhaeltnis, j) => {
          mietverhaeltnis.zeilen.push({
            kostenart: kostenart.schluessel,
            bezeichnung: kostenart.bezeichnung,
            betrkv: kostenart.betrkv,
            gesamt_cent: kostenart.gesamt_cent,
            anteil_einheit_jahr_cent: einheitAnteilCent,
            betrag_cent: anteileJeMieter[j],
          });
          mietverhaeltnis.summe_cent += anteileJeMieter[j];
        });
      });
    }

    // -----------------------------------------------------------------------
    // 3.4  Vorauszahlungen und Ergebnis je Mietverhältnis
    // -----------------------------------------------------------------------
    for (const m of mietverhaeltnisse) {
      const vorauszahlungMonatlichCent = zuCent(m.nk_vorauszahlung);
      const nettokaltmieteCent = zuCent(m.nettokaltmiete);
      const gesamtmieteCent = nettokaltmieteCent + vorauszahlungMonatlichCent;

      // SOLL: was laut Vertrag zu zahlen gewesen wäre.
      m.vorauszahlung_soll_cent = vorauszahlungMonatlichCent * m.monate;

      // IST: was laut Kontoauszug tatsächlich eingegangen ist.
      // Zuordnung über die "zahler_kennung" (z. B. "OHLWEIN") im Buchungstext.
      m.zahlungen = fall.buchungen
        .filter(
          (b) =>
            b.betrag > 0 &&
            b.gegenpartei.toUpperCase().includes(m.zahler_kennung) &&
            b.datum >= m.nutzung_von &&
            b.datum <= m.nutzung_bis
        )
        .map((b) => {
          const betragCent = zuCent(b.betrag);
          // Bei voller Miete steckt genau die vertragliche Vorauszahlung darin.
          // Bei einer Teilzahlung wird der Rest nach Abzug der Kaltmiete als
          // Vorauszahlung gewertet (nie negativ).
          const vorauszahlungsanteilCent =
            betragCent >= gesamtmieteCent
              ? vorauszahlungMonatlichCent
              : Math.max(0, betragCent - nettokaltmieteCent);
          return {
            datum: b.datum,
            zweck: b.zweck,
            betrag_cent: betragCent,
            vorauszahlungsanteil_cent: vorauszahlungsanteilCent,
          };
        });

      m.vorauszahlung_ist_cent = m.zahlungen.reduce(
        (summe, z) => summe + z.vorauszahlungsanteil_cent,
        0
      );
      m.vorauszahlung_monatlich_cent = vorauszahlungMonatlichCent;
      m.fehlende_zahlungen = m.monate - m.zahlungen.length;

      // Welcher der beiden Werte angerechnet wird, steht in den Einstellungen.
      // Voreinstellung ist "ist" - nur tatsächlich geleistete Vorauszahlungen
      // dürfen angerechnet werden (BGH VIII ZR 57/04).
      m.vorauszahlung_angesetzt_cent =
        einstellungen.vorauszahlungen_ansatz === "soll"
          ? m.vorauszahlung_soll_cent
          : m.vorauszahlung_ist_cent;

      // Positiver Saldo = Nachzahlung des Mieters, negativer = Guthaben.
      m.saldo_cent = m.summe_cent - m.vorauszahlung_angesetzt_cent;
      m.ergebnis = m.saldo_cent > 0 ? "Nachzahlung" : m.saldo_cent < 0 ? "Guthaben" : "ausgeglichen";

      // Flächenanteil nur zur Anzeige im Schreiben.
      const einheit = einheiten.find((e) => e.we === m.we);
      m.lage = einheit.lage;                 // z. B. "Erdgeschoss links" - steht im Schreiben
      m.hinweis = einheit.hinweis || "";     // z. B. abweichende Flächenangabe im Altvertrag
      m.wohnflaeche_qm = einheit.wohnflaeche_qm;
      m.flaechen_anteil = einheit.wohnflaeche_qm / flaecheGesamt;
      m.jahresanteil_einheit_cent = einheit.jahresanteil_cent;

      // Vorschlag für die künftige Vorauszahlung (§ 560 Abs. 4 BGB):
      // Jahresbetrag der Wohnung durch 12, aufgerundet auf volle Euro.
      m.empfohlene_vorauszahlung_cent = Math.ceil(einheit.jahresanteil_cent / 12 / 100) * 100;
    }

    // -----------------------------------------------------------------------
    // 3.5  Summen fürs Gesamtbild
    // -----------------------------------------------------------------------
    const summeUmlagefaehigCent = umlagefaehige.reduce((s, k) => s + k.gesamt_cent, 0);
    const summeNichtUmlagefaehigCent = nichtUmlagefaehige.reduce((s, k) => s + k.gesamt_cent, 0);

    const ergebnis = {
      fall_bezeichnung: fall.bezeichnung,
      objekt: fall.objekt,
      vermieterin: fall.vermieterin,
      abrechnung: fall.abrechnung,
      einstellungen,
      tage_im_jahr: tageImJahr,
      flaeche_gesamt_qm: flaecheGesamt,
      einheiten,
      kostenarten: benutzteKostenarten,
      umlagefaehige,
      nicht_umlagefaehige: nichtUmlagefaehige,
      mietverhaeltnisse,
      summe_umlagefaehig_cent: summeUmlagefaehigCent,
      summe_nicht_umlagefaehig_cent: summeNichtUmlagefaehigCent,
      summe_belege_cent: benutzteKostenarten.reduce((s, k) => s + k.gesamt_cent, 0),
      kosten_je_qm_jahr_cent: Math.round(summeUmlagefaehigCent / flaecheGesamt),
      befunde: fall.befunde || [],
    };

    // Die Prüfungen laufen IMMER mit - man kann kein Ergebnis bekommen, ohne zu
    // wissen, ob es geprüft wurde (SPEC.md § 5.1, "fail-closed").
    ergebnis.pruefungen = pruefeAlles(fall, ergebnis);
    ergebnis.blocker = ergebnis.pruefungen.filter((p) => !p.bestanden && p.schwere === "blocker");
    ergebnis.warnungen = ergebnis.pruefungen.filter((p) => !p.bestanden && p.schwere === "warnung");
    ergebnis.freigegeben = ergebnis.blocker.length === 0;

    return ergebnis;
  }

  /* ===========================================================================
   * TEIL 4 - DIE PRÜFUNGEN
   * ===========================================================================
   *
   * Jede Prüfung hat eine feste Nummer aus SPEC.md, damit man von einem Befund
   * im Prüfprotokoll direkt zur Begründung in der Spezifikation kommt.
   *
   *   schwere "blocker" -> es werden KEINE Abrechnungen erzeugt
   *   schwere "warnung" -> Abrechnung entsteht, muss aber in den Annahmen stehen
   *   schwere "info"    -> reine Beobachtung
   * ========================================================================= */

  /** Kleiner Helfer, damit jede Prüfung gleich aussieht. */
  function pruefung(id, titel, schwere, bestanden, befund) {
    return { id, titel, schwere, bestanden, befund };
  }

  function pruefeAlles(fall, e) {
    const p = [];
    const euro = alsEuroText;

    /* --- L0: Stimmen die Daten mit den Belegen überein? -------------------- */

    // I-04: Die Positionen eines Belegs müssen seine Rechnungssumme ergeben.
    const belegeMitSummenfehler = fall.belege.filter((b) => {
      const summePositionen = b.positionen.reduce((s, pos) => s + zuCent(pos.betrag), 0);
      return summePositionen !== zuCent(b.rechnungsbetrag);
    });
    p.push(
      pruefung("I-04", "Positionen ergeben die Belegsumme", "blocker",
        belegeMitSummenfehler.length === 0,
        belegeMitSummenfehler.length === 0
          ? `${fall.belege.length} Belege geprüft`
          : belegeMitSummenfehler.map((b) => b.beleg).join(", "))
    );

    // I-06 (schließt I-05 ein): Saldenkette der Kontoauszüge. Je Monat muss
    // Anfangsbestand + Buchungen den Endbestand ergeben (das ist I-05), und der
    // Endbestand eines Monats muss der Anfangsbestand des nächsten sein (I-06).
    // Beides in einer Schleife zu prüfen ist klarer als zwei getrennte Läufe.
    const kettenfehler = [];
    const auszuege = (fall.kontoauszuege || []).slice().sort((a, b) => a.monat - b.monat);
    auszuege.forEach((auszug, i) => {
      const monatsText = String(auszug.monat).padStart(2, "0");
      const buchungenDesMonats = fall.buchungen.filter(
        (b) => b.datum.slice(0, 7) === `${auszug.jahr}-${monatsText}`
      );
      const summe = buchungenDesMonats.reduce((s, b) => s + zuCent(b.betrag), 0);
      if (zuCent(auszug.anfangsbestand) + summe !== zuCent(auszug.endbestand)) {
        kettenfehler.push(`${auszug.datei}: Saldo passt nicht zu den Buchungen`);
      }
      if (i > 0 && zuCent(auszuege[i - 1].endbestand) !== zuCent(auszug.anfangsbestand)) {
        kettenfehler.push(`${auszug.datei}: Anfangsbestand != Endbestand des Vormonats`);
      }
    });
    p.push(
      pruefung("I-06", "Saldenkette der Kontoauszüge lückenlos", "blocker",
        kettenfehler.length === 0,
        kettenfehler.length === 0
          ? `${auszuege.length} Auszüge, ${fall.buchungen.length} Buchungen`
          : kettenfehler.join(" | "))
    );

    // I-07: Derselbe Beleg zweimal erfasst?
    const gesehen = new Map();
    const dubletten = [];
    for (const b of fall.belege) {
      const schluessel = `${b.lieferant}|${b.rechnungsbetrag}|${b.datum}`;
      if (gesehen.has(schluessel)) dubletten.push(`${b.beleg} ~ ${gesehen.get(schluessel)}`);
      gesehen.set(schluessel, b.beleg);
    }
    p.push(
      pruefung("I-07", "Keine doppelt erfassten Belege", "warnung",
        dubletten.length === 0, dubletten.join(", ") || "keine Dubletten")
    );

    // I-12: Datumslogik der Belege.
    const datumsfehler = fall.belege.filter((b) => b.datum > "2027-01-01" || !b.datum);
    p.push(
      pruefung("I-12", "Belegdaten plausibel", "blocker",
        datumsfehler.length === 0, datumsfehler.map((b) => b.beleg).join(", ") || "alle plausibel")
    );

    /* --- L1: Stimmt die Arithmetik? --------------------------------------- */

    // A-01: Die Wohnflächen müssen die Gesamtwohnfläche ergeben.
    const flaecheLautStammdaten = fall.objekt.wohnflaeche_gesamt_qm;
    const flaecheSumme = e.flaeche_gesamt_qm;
    p.push(
      pruefung("A-01", "Summe der Wohnflächen == Gesamtwohnfläche", "blocker",
        Math.abs(flaecheSumme - flaecheLautStammdaten) < 0.005,
        `${flaecheSumme.toFixed(2)} m² vs. ${flaecheLautStammdaten.toFixed(2)} m² laut Stammdaten`)
    );

    // A-02: Je Kostenart muss die Summe der Einheitenanteile exakt die
    // Gesamtkosten ergeben. Das ist die Prüfung, die in v1 fehlgeschlagen wäre.
    const verteilfehler = e.umlagefaehige.filter((k) => {
      const summe = Object.values(k.anteile_je_einheit).reduce((a, b) => a + b, 0);
      return summe !== k.gesamt_cent;
    });
    p.push(
      pruefung("A-02", "Verteilung je Kostenart centgenau", "blocker",
        verteilfehler.length === 0,
        verteilfehler.map((k) => k.bezeichnung).join(", ") ||
          `${e.umlagefaehige.length} Kostenarten, Differenz 0 Cent`)
    );

    // A-03: Je Einheit müssen sich die Mietverhältnisse lückenlos und
    // überschneidungsfrei über das Jahr verteilen - sonst zahlt jemand doppelt
    // oder ein Zeitraum fällt unter den Tisch.
    const zeitfehler = [];
    for (const einheit of e.einheiten) {
      const mieter = e.mietverhaeltnisse
        .filter((m) => m.we === einheit.we)
        .sort((a, b) => a.nutzung_von.localeCompare(b.nutzung_von));
      const summeTage = mieter.reduce((s, m) => s + m.tage, 0);
      if (summeTage !== e.tage_im_jahr) {
        zeitfehler.push(`${einheit.we}: ${summeTage} statt ${e.tage_im_jahr} Tage belegt`);
      }
      for (let i = 1; i < mieter.length; i++) {
        if (mieter[i].nutzung_von <= mieter[i - 1].nutzung_bis) {
          zeitfehler.push(`${einheit.we}: Zeiträume überschneiden sich`);
        }
      }
      // Summe der verteilten Anteile muss den Jahresanteil der Einheit ergeben.
      const summeAnteile = mieter.reduce((s, m) => s + m.summe_cent, 0);
      if (summeAnteile !== einheit.jahresanteil_cent) {
        zeitfehler.push(`${einheit.we}: Anteile der Mieter != Jahresanteil der Einheit`);
      }
    }
    p.push(
      pruefung("A-03", "Zeitanteile je Einheit vollständig und überschneidungsfrei", "blocker",
        zeitfehler.length === 0, zeitfehler.join(" | ") || "alle 4 Einheiten ganzjährig belegt")
    );

    // A-04: Nichts darf beim Sortieren verloren gehen.
    const summeAllerPositionen = fall.belege.reduce(
      (s, b) => s + b.positionen.reduce((s2, pos) => s2 + zuCent(pos.betrag), 0), 0);
    const summeSortiert = e.summe_umlagefaehig_cent + e.summe_nicht_umlagefaehig_cent;
    const abflussAktiv = e.einstellungen.kostenansatz === "abfluss";
    p.push(
      pruefung("A-04", "umlagefähig + nicht umlagefähig == alle Belegpositionen", "blocker",
        abflussAktiv || summeSortiert === summeAllerPositionen,
        abflussAktiv
          ? "übersprungen: Abflussprinzip aktiv, Belegsummen weichen bewusst ab"
          : `${euro(summeSortiert)} == ${euro(summeAllerPositionen)}`)
    );

    // A-05: Saldo == Anteil minus angerechnete Vorauszahlung.
    const saldofehler = e.mietverhaeltnisse.filter(
      (m) => m.saldo_cent !== m.summe_cent - m.vorauszahlung_angesetzt_cent);
    p.push(
      pruefung("A-05", "Saldo == Anteil - Vorauszahlungen", "blocker",
        saldofehler.length === 0, saldofehler.map((m) => m.id).join(", ") || "5 Mietverhältnisse")
    );

    // A-06: Beim Ist-Ansatz muss die angerechnete Summe den erfassten
    // Zahlungseingängen entsprechen - kein frei gewählter Wert.
    const vzFehler = e.mietverhaeltnisse.filter((m) => {
      const erwartet = e.einstellungen.vorauszahlungen_ansatz === "soll"
        ? m.vorauszahlung_soll_cent : m.vorauszahlung_ist_cent;
      return m.vorauszahlung_angesetzt_cent !== erwartet;
    });
    p.push(
      pruefung("A-06", "Angerechnete Vorauszahlungen == erfasste Zahlungen", "blocker",
        vzFehler.length === 0,
        vzFehler.map((m) => m.id).join(", ") ||
          `Ansatz "${e.einstellungen.vorauszahlungen_ansatz}"`)
    );

    /* --- L2: Recht und Vertrag -------------------------------------------- */

    // R-01: Eine Kostenart darf nur umgelegt werden, wenn sie im § 4 DIESES
    // Mietvertrags steht. Der Katalog liegt als Daten am Mietverhältnis.
    const nichtVereinbart = [];
    for (const m of e.mietverhaeltnisse) {
      const katalog = m.vereinbarte_kostenarten || [];
      for (const zeile of m.zeilen) {
        if (zeile.betrag_cent > 0 && !katalog.includes(zeile.kostenart)) {
          nichtVereinbart.push(`${m.id}: ${zeile.bezeichnung}`);
        }
      }
    }
    const ohneVertragsgrundlage = e.umlagefaehige.filter((k) => !k.vertrag);
    p.push(
      pruefung("R-01", "Nur vertraglich vereinbarte Kostenarten umgelegt, Fundstelle benannt", "blocker",
        nichtVereinbart.length === 0 && ohneVertragsgrundlage.length === 0,
        [...nichtVereinbart, ...ohneVertragsgrundlage.map((k) => `${k.bezeichnung}: Vertragsfundstelle fehlt`)]
          .join(", ") || "alle umgelegten Kostenarten stehen in § 4 der Verträge, Fundstelle je Kostenart benannt")
    );

    // R-02: War die Kostenart im Abrechnungsjahr überhaupt noch umlagefähig?
    // (Gültigkeitsfenster, z. B. Kabel-TV nur bis 30.06.2024.)
    const abgelaufen = e.umlagefaehige.filter(
      (k) => k.umlagefaehig_bis && k.umlagefaehig_bis < e.abrechnung.von);
    p.push(
      pruefung("R-02", "Keine Kostenart außerhalb ihres Gültigkeitszeitraums umgelegt", "blocker",
        abgelaufen.length === 0,
        abgelaufen.map((k) => `${k.bezeichnung} (nur bis ${k.umlagefaehig_bis})`).join(", ") ||
          "Gültigkeitsfenster eingehalten")
    );

    // R-03: Jede Nicht-Umlage braucht eine Begründung mit Fundstelle.
    const ohneBegruendung = [];
    for (const beleg of fall.belege) {
      for (const pos of beleg.positionen) {
        if (pos.umlagefaehig) continue;
        const text = pos.begruendung || fall.kostenarten[pos.kostenart]?.betrkv || "";
        const hatFundstelle = /§|BGH|TKG|BetrKV|Urteil/i.test(text);
        if (!hatFundstelle) ohneBegruendung.push(`${beleg.beleg}: ${pos.bezeichnung}`);
      }
    }
    p.push(
      pruefung("R-03", "Jede Nicht-Umlage ist mit Fundstelle begründet", "blocker",
        ohneBegruendung.length === 0, ohneBegruendung.join(", ") || "alle begründet")
    );

    // R-04: Jede umgelegte Kostenart braucht eine BetrKV-Ziffer.
    const ohneZiffer = e.umlagefaehige.filter((k) => !/§\s*2\s*Nr\./.test(k.betrkv || ""));
    p.push(
      pruefung("R-04", "Jede umgelegte Kostenart nennt ihre BetrKV-Ziffer", "blocker",
        ohneZiffer.length === 0, ohneZiffer.map((k) => k.bezeichnung).join(", ") || "vollständig")
    );

    // R-05: Der Abrechnungszeitraum darf höchstens 12 Monate umfassen.
    p.push(
      pruefung("R-05", "Abrechnungszeitraum <= 12 Monate", "blocker",
        e.tage_im_jahr <= 366, `${e.tage_im_jahr} Tage`)
    );

    // R-06: Ausschlussfrist - die Abrechnung muss dem Mieter binnen 12 Monaten
    // nach Ende des Zeitraums zugehen (§ 556 Abs. 3 S. 2 BGB).
    const fristende = `${Number(e.abrechnung.bis.slice(0, 4)) + 1}-12-31`;
    p.push(
      pruefung("R-06", "Abrechnung innerhalb der Ausschlussfrist", "blocker",
        e.abrechnung.erstellt_am <= fristende,
        `erstellt ${e.abrechnung.erstellt_am}, Frist ${fristende}`)
    );

    // R-07: Der Soll-Ansatz ist rechtlich die Ausnahme und muss bewusst gewählt
    // sein - er darf nie stillschweigend die Voreinstellung sein.
    p.push(
      pruefung("R-07", "Vorauszahlungen nach Ist (BGH VIII ZR 57/04)",
        e.einstellungen.vorauszahlungen_ansatz === "soll" ? "warnung" : "blocker",
        e.einstellungen.vorauszahlungen_ansatz === "ist",
        e.einstellungen.vorauszahlungen_ansatz === "ist"
          ? "nur tatsächlich geleistete Vorauszahlungen angerechnet"
          : "ACHTUNG: Soll-Ansatz aktiv - muss in den Annahmen begründet werden")
    );

    // R-08: Gehört der Beleg überhaupt in dieses Abrechnungsjahr?
    // Ein Beleg aus dem Vorjahr, der versehentlich mitgebucht wird, fällt sonst
    // niemandem auf - die Summe sieht ja plausibel aus.
    const ausserhalb = [];
    for (const beleg of fall.belege) {
      // Alle Datumsangaben aus dem Leistungszeitraum ziehen; fehlt er, gilt das
      // Belegdatum. Frühestes und spätestes Datum spannen den Leistungszeitraum auf.
      const daten = (String(beleg.leistungszeitraum || "").match(/\d{2}\.\d{2}\.\d{4}/g) || [])
        .map((d) => { const [tag, monat, jahr] = d.split("."); return `${jahr}-${monat}-${tag}`; });
      const von = daten.length ? daten.reduce((a, b) => (a < b ? a : b)) : beleg.datum;
      const bis = daten.length ? daten.reduce((a, b) => (a > b ? a : b)) : beleg.datum;
      if (bis < e.abrechnung.von || von > e.abrechnung.bis) {
        ausserhalb.push(`${beleg.beleg} (Leistung ${von} bis ${bis})`);
      }
    }
    p.push(
      pruefung("R-08", "Jeder Beleg betrifft den Abrechnungszeitraum", "blocker",
        ausserhalb.length === 0,
        ausserhalb.join(", ") || `${fall.belege.length} Belege, Leistung jeweils im Zeitraum`)
    );

    // R-09: Der Kostenansatz ist EINE Einstellung für alle Kostenarten. Ein
    // Mischen wäre nur möglich, wenn es die Einstellung je Kostenart gäbe - die
    // Prüfung hält das ausdrücklich fest, statt sich stillschweigend darauf zu verlassen.
    p.push(
      pruefung("R-09", "Kostenansatz einheitlich über alle Kostenarten", "blocker",
        ["leistung", "abfluss"].includes(e.einstellungen.kostenansatz),
        `"${e.einstellungen.kostenansatz}" gilt für alle ${e.kostenarten.length} Kostenarten`)
    );

    // R-11: Weicht die verwendete Fläche vom Mietvertrag ab, muss das eine
    // begründete Entscheidung sein - kein stiller Zahlendreher.
    const mitFlaechenhinweis = e.einheiten.filter((u) => u.hinweis);
    p.push(
      pruefung("R-11", "Abweichende Wohnflächen sind als Entscheidung dokumentiert", "warnung",
        mitFlaechenhinweis.every((u) => /BGH|Aufmaß|maßgeblich/i.test(u.hinweis)),
        mitFlaechenhinweis.length
          ? mitFlaechenhinweis.map((u) => `${u.we}: begründet`).join(", ")
          : "keine abweichenden Flächenangaben")
    );

    // R-10: Diese Kostenarten dürfen niemals im umgelegten Block auftauchen.
    const niemalsUmlagefaehig = ["verwaltung", "instandhaltung", "kleinreparaturen", "neuanlage", "rechtsschutz"];
    const verbotenUmgelegt = e.umlagefaehige.filter((k) => niemalsUmlagefaehig.includes(k.schluessel));
    p.push(
      pruefung("R-10", "Verwaltung/Instandhaltung/Neuanlage nicht umgelegt", "blocker",
        verbotenUmgelegt.length === 0,
        verbotenUmgelegt.map((k) => k.bezeichnung).join(", ") ||
          "§ 1 Abs. 2 BetrKV eingehalten")
    );

    // R-13: Eine Paragrafenangabe ist für die Eigentümerin und die Mieter keine
    // Begründung. Jede tatsächlich verwendete Kostenart muss zusätzlich in
    // normaler Sprache erklären, warum sie umgelegt wird oder eben nicht.
    const ohneKlartext = e.kostenarten.filter((k) => !k.warum);
    p.push(
      pruefung("R-13", "Jede verwendete Kostenart ist in normaler Sprache begründet", "blocker",
        ohneKlartext.length === 0,
        ohneKlartext.map((k) => k.bezeichnung).join(", ") ||
          `${e.kostenarten.length} Kostenarten mit Begründung und Vertragsgrundlage`)
    );

    // R-12: Kein Befund darf unter den Tisch fallen.
    const ohneBehandlung = (fall.befunde || []).filter((b) => !b.behandlung);
    p.push(
      pruefung("R-12", "Jeder Befund hat eine dokumentierte Behandlung", "blocker",
        ohneBehandlung.length === 0,
        ohneBehandlung.map((b) => b.id).join(", ") ||
          `${(fall.befunde || []).length} Befunde dokumentiert`)
    );

    /* --- L4: Plausibilität ------------------------------------------------ */

    // P-01: Jeder Beleg muss bezahlt worden sein, und jede Abbuchung muss zu
    // einem Beleg gehören. Beide Richtungen, sonst fehlt etwas.
    const lieferantenSummen = new Map();
    for (const b of fall.belege) {
      const kennung = b.bank_kennung;
      const eintrag = lieferantenSummen.get(kennung) || { rechnung: 0, zahlung: 0, belege: 0 };
      eintrag.rechnung += zuCent(
        typeof b.abfluss_im_abrechnungsjahr === "number" ? b.abfluss_im_abrechnungsjahr : b.rechnungsbetrag);
      eintrag.belege += 1;
      lieferantenSummen.set(kennung, eintrag);
    }
    const abbuchungenOhneBeleg = [];
    for (const buchung of fall.buchungen.filter((b) => b.betrag < 0)) {
      const treffer = [...lieferantenSummen.keys()].find((k) =>
        buchung.gegenpartei.toUpperCase().includes(k));
      if (treffer) lieferantenSummen.get(treffer).zahlung += zuCent(-buchung.betrag);
      else abbuchungenOhneBeleg.push(`${buchung.datum} ${buchung.gegenpartei}`);
    }
    const abweichungen = [...lieferantenSummen.entries()]
      .filter(([, v]) => v.rechnung !== v.zahlung)
      .map(([k, v]) => `${k}: Rechnungen ${euro(v.rechnung)} vs. Zahlungen ${euro(v.zahlung)}`);
    p.push(
      pruefung("P-01", "Belege und Kontobewegungen decken sich", "warnung",
        abweichungen.length === 0 && abbuchungenOhneBeleg.length === 0,
        [...abweichungen, ...abbuchungenOhneBeleg.map((t) => `ohne Beleg: ${t}`)].join(" | ") ||
          `${lieferantenSummen.size} Lieferanten abgeglichen`)
    );

    // P-02: Fehlt ein Mieteingang?
    const fehlendeZahlungen = e.mietverhaeltnisse
      .filter((m) => m.fehlende_zahlungen > 0)
      .map((m) => {
        const gezahlteMonate = new Set(m.zahlungen.map((z) => z.datum.slice(0, 7)));
        const erwartet = [];
        const start = alsDatum(m.nutzung_von);
        for (let i = 0; i < m.monate; i++) {
          const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1));
          erwartet.push(d.toISOString().slice(0, 7));
        }
        const fehlt = erwartet.filter((monat) => !gezahlteMonate.has(monat));
        return `${m.mieter} (${m.we}): ${fehlt.join(", ")} fehlt`;
      });
    p.push(
      pruefung("P-02", "Mieteingänge vollständig", "warnung",
        fehlendeZahlungen.length === 0, fehlendeZahlungen.join(" | ") || "alle Monate bezahlt")
    );

    // P-02b: Vereinbarte Staffelmiete auch tatsächlich vereinnahmt?
    const staffelabweichungen = [];
    for (const m of e.mietverhaeltnisse) {
      if (!m.staffelmiete) continue;
      let ausfallCent = 0;
      for (const zahlung of m.zahlungen) {
        const stufe = m.staffelmiete
          .filter((s) => s.ab <= zahlung.datum)
          .sort((a, b) => a.ab.localeCompare(b.ab))
          .pop();
        if (!stufe) continue;
        const gezahlteKaltmiete = zahlung.betrag_cent - zahlung.vorauszahlungsanteil_cent;
        if (zuCent(stufe.nettokaltmiete) > gezahlteKaltmiete) {
          ausfallCent += zuCent(stufe.nettokaltmiete) - gezahlteKaltmiete;
        }
      }
      if (ausfallCent > 0) {
        staffelabweichungen.push(`${m.mieter} (${m.we}): Mindereinnahme ${euro(ausfallCent)} in ${e.abrechnung.von.slice(0, 4)}`);
      }
    }
    p.push(
      pruefung("P-02b", "Vereinbarte Staffelmiete wird vereinnahmt", "warnung",
        staffelabweichungen.length === 0,
        staffelabweichungen.join(" | ") || "keine Abweichung")
    );

    return p;
  }

  /* ===========================================================================
   * TEIL 5 - EXPORT
   * ===========================================================================
   * Dieser Block sorgt dafür, dass dieselbe Datei an zwei Orten funktioniert:
   *   - im Browser, eingebunden per <script src="...">   -> window.Nebenkosten
   *   - in Node, für die Tests, per require(...)         -> module.exports
   * ========================================================================= */

  const API = {
    berechne,
    pruefeAlles,
    // Hilfsfunktionen, die auch die Oberfläche und die Tests brauchen:
    verteileCentgenau,
    zuCent,
    zuEuro,
    alsEuroText,
    alsDatumText,
    alsProzentText,
    alsZahlText,
    tageZwischen,
    monateZwischen,
  };

  if (typeof module === "object" && module.exports) module.exports = API;
  else global.Nebenkosten = API;
})(typeof self !== "undefined" ? self : globalThis);
