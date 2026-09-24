/* =============================================================================
 * DAS ABRECHNUNGSSCHREIBEN
 * =============================================================================
 *
 * Erzeugt aus einem Mietverhältnis das fertige Schreiben an den Mieter - als
 * HTML-Text. Dasselbe HTML wird am Bildschirm angezeigt und gedruckt; es gibt
 * also keine zweite Fassung, die abweichen könnte.
 *
 * WAS IM SCHREIBEN STEHEN MUSS (SPEC.md § 2.1)
 * Vier Angaben entscheiden darüber, ob eine Betriebskostenabrechnung überhaupt
 * wirksam ist. Fehlt eine davon, ist das ganze Schreiben unwirksam:
 *   1. die Gesamtkosten je Kostenart          -> Spalte "Gesamtkosten Haus"
 *   2. der Verteilerschlüssel, erklärt        -> Kopfzeile + Spaltenüberschrift
 *   3. die Berechnung des Mieteranteils       -> eine Zeile je Kostenart
 *   4. der Abzug der Vorauszahlungen          -> Abrechnungsblock am Ende
 * Im Code sind diese Stellen mit MINDESTANGABE 1..4 markiert. Die Prüfungen
 * F-01 bis F-04 kontrollieren am fertigen HTML, ob sie wirklich da sind.
 * ========================================================================== */

(function (global) {
  "use strict";

  const N = global.Nebenkosten;
  const eur = N.alsEuroText;
  const dat = N.alsDatumText;
  const pro = N.alsProzentText;
  const zahl = N.alsZahlText;

  /** Macht Text sicher für HTML (aus < wird &lt; usw.). */
  function sicher(text) {
    return String(text === null || text === undefined ? "" : text).replace(
      /[&<>"]/g,
      (zeichen) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[zeichen])
    );
  }

  /**
   * Wie der Abrechnungszeitraum im Brief benannt wird.
   * Deckt sich der Zeitraum mit einem Kalenderjahr, heißt es schlicht "2025".
   * Weicht er ab (etwa bei einem abweichenden Wirtschaftsjahr), wird das
   * Datumspaar genannt. So steht nirgends eine fest eingebaute Jahreszahl.
   */
  function zeitraumBezeichnung(abrechnung) {
    const jahrVon = abrechnung.von.slice(0, 4);
    const jahrBis = abrechnung.bis.slice(0, 4);
    const ganzesKalenderjahr =
      jahrVon === jahrBis && abrechnung.von.endsWith("-01-01") && abrechnung.bis.endsWith("-12-31");
    return {
      ganzesKalenderjahr,
      kurz: ganzesKalenderjahr ? jahrVon : `${dat(abrechnung.von)} – ${dat(abrechnung.bis)}`,
      satz: ganzesKalenderjahr
        ? `das Kalenderjahr ${jahrVon}`
        : `den Zeitraum ${dat(abrechnung.von)} bis ${dat(abrechnung.bis)}`,
      jahr: jahrVon,
    };
  }

  /** Addiert Tage auf ein ISO-Datum (für die Zahlungsfrist). */
  function plusTage(iso, tage) {
    const d = new Date(iso + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + tage);
    return d.toISOString().slice(0, 10);
  }

  /**
   * Baut das komplette Schreiben.
   * @param {object} m  ein Mietverhältnis aus dem Ergebnis
   * @param {object} e  das Gesamtergebnis (für Gesamtkosten und Objektdaten)
   * @returns {string}  HTML
   */
  function schreiben(m, e) {
    const v = e.vermieterin;
    const o = e.objekt;
    const erstelltAm = e.abrechnung.erstellt_am;
    const zeitraum = zeitraumBezeichnung(e.abrechnung);
    const zahlungsfrist = plusTage(erstelltAm, e.abrechnung.zahlungsfrist_tage);

    // --- MINDESTANGABE 1 + 3: Gesamtkosten und Anteilsberechnung je Kostenart -
    const kostenzeilen = m.zeilen
      .map(
        (z) => `
      <tr>
        <td>${sicher(z.bezeichnung)}<div class="klein">${sicher(z.betrkv)}</div></td>
        <td class="r">${eur(z.gesamt_cent)}</td>
        <td class="r">${eur(z.anteil_einheit_jahr_cent)}</td>
        <td class="r">${eur(z.betrag_cent)}</td>
      </tr>`
      )
      .join("");

    // Zur Transparenz: was NICHT umgelegt wurde und warum.
    const nichtUmgelegt = e.nicht_umlagefaehige
      .map(
        (k) => `
      <tr>
        <td>${sicher(k.bezeichnung)}
          ${k.warum ? `<div class="grund">${sicher(k.warum)}</div>` : ""}
          <div class="klein">${sicher(k.betrkv)}</div></td>
        <td class="r">${eur(k.gesamt_cent)}</td>
      </tr>`
      )
      .join("");

    const zahlungszeilen = m.zahlungen
      .map(
        (z) => `
      <tr>
        <td>${dat(z.datum)}</td>
        <td>${sicher(z.zweck)}</td>
        <td class="r">${eur(z.betrag_cent)}</td>
        <td class="r">${eur(z.vorauszahlungsanteil_cent)}</td>
      </tr>`
      )
      .join("");

    // --- Ergebnissatz und Zahlungsaufforderung -------------------------------
    let ergebnisText;
    let zahlungsabsatz;
    if (m.saldo_cent > 0) {
      ergebnisText = `Nachzahlung zu Ihren Lasten`;
      zahlungsabsatz = `<p>Bitte überweisen Sie den Nachzahlungsbetrag von <b>${eur(
        m.saldo_cent
      )}</b> bis zum <b>${dat(zahlungsfrist)}</b> auf das Konto <span class="iban">${sicher(v.iban)}</span> (${sicher(
        v.bank
      )}), Verwendungszweck „Betriebskosten ${zeitraum.kurz} ${sicher(m.we)}".</p>`;
    } else if (m.saldo_cent < 0) {
      ergebnisText = `Guthaben zu Ihren Gunsten`;
      zahlungsabsatz = `<p>Das Guthaben von <b>${eur(-m.saldo_cent)}</b> überweisen wir Ihnen
        innerhalb von ${e.abrechnung.zahlungsfrist_tage} Tagen auf das uns bekannte Konto.</p>`;
    } else {
      ergebnisText = `Die Abrechnung ist ausgeglichen`;
      zahlungsabsatz = "";
    }

    // Erklärung des Zeitanteils - nur nötig, wenn nicht ganzjährig gemietet.
    const zeitErklaerung = m.ganzjahr
      ? `Sie haben die Wohnung im gesamten Abrechnungsjahr gemietet; Ihr Zeitanteil beträgt 100 %.`
      : `Ihr Mietverhältnis bestand im Abrechnungsjahr vom ${dat(m.nutzung_von)} bis ${dat(
          m.nutzung_bis
        )}. Die auf die Wohnung entfallenden Jahreskosten werden deshalb gemäß § 4 Abs. 5 Ihres
         Mietvertrags zeitanteilig aufgeteilt (${sicher(m.zeit_text)}).`;

    // Hinweis, wenn Vorauszahlungen fehlen (Ist-Ansatz).
    const fehlhinweis =
      m.fehlende_zahlungen > 0 && e.einstellungen.vorauszahlungen_ansatz === "ist"
        ? (() => {
            // WICHTIG: Die nicht geleistete Vorauszahlung ist durch diese Abrechnung bereits
            // ausgeglichen - sie fehlt in der Spalte "abzüglich Vorauszahlungen" und erhöht die
            // Nachzahlung entsprechend. Gesondert offen ist deshalb nur die Nettokaltmiete.
            // Würde man die ganze Monatsmiete zusätzlich anmahnen, wäre die Vorauszahlung
            // doppelt gefordert.
            const offeneKaltmiete = N.zuCent(m.nettokaltmiete) * m.fehlende_zahlungen;
            const bereitsAusgeglichen = m.vorauszahlung_monatlich_cent * m.fehlende_zahlungen;
            return `<div class="hinweis"><b>Hinweis zu Ihren Vorauszahlungen.</b> Für den
              Abrechnungszeitraum sind ${m.monate} monatliche Vorauszahlungen vereinbart; auf dem
              Objektkonto sind ${m.zahlungen.length} Mietzahlungen eingegangen. Angerechnet werden
              können nur die tatsächlich geleisteten Vorauszahlungen. Der nicht geleistete Anteil
              von ${eur(bereitsAusgeglichen)} ist damit <b>in dieser Abrechnung bereits
              berücksichtigt</b> und wird nicht noch einmal gefordert. Gesondert offen bleibt allein
              die Nettokaltmiete von ${eur(offeneKaltmiete)}. Sollten Sie die Zahlung nachweisen
              können, korrigieren wir die Abrechnung selbstverständlich.</div>`;
          })()
        : "";

    // Anpassung der Vorauszahlung - nur bei laufendem Mietverhältnis sinnvoll.
    const laufend = m.nutzung_bis === e.abrechnung.bis;
    const anpassung = laufend
      ? `<h2>Anpassung Ihrer Vorauszahlung</h2>
         <p>Auf Ihre Wohnung entfällt ein Jahresbetrag von ${eur(m.jahresanteil_einheit_cent)},
         das sind rund ${eur(Math.round(m.jahresanteil_einheit_cent / 12))} je Monat. Ihre bisherige
         Vorauszahlung von ${eur(m.vorauszahlung_monatlich_cent)} deckt diesen Betrag nicht.
         Wir passen die monatliche Betriebskostenvorauszahlung daher gemäß § 560 Abs. 4 BGB ab dem
         übernächsten Monat nach Zugang dieses Schreibens auf <b>${eur(
           m.empfohlene_vorauszahlung_cent
         )}</b> an.</p>`
      : "";

    // Wer noch im Haus wohnt, bekommt die Abrechnung an die Objektanschrift.
    // Wer ausgezogen ist, braucht eine eigene Anschrift (Feld "anschrift" im
    // Mietverhältnis) - sonst ginge der Brief an die leere Wohnung.
    const anschrift = m.anschrift_hinweis
      ? `<span class="offen">[Anschrift ergänzen — ${sicher(m.anschrift_hinweis)}]</span>`
      : m.anschrift
        ? `${sicher(m.anschrift.strasse)}<br>${sicher(m.anschrift.plz_ort)}`
        : `${sicher(o.strasse)}<br>${sicher(o.plz_ort)}`;

    const flaechenhinweis = m.hinweis
      ? `<p class="klein">${sicher(m.hinweis)}</p>`
      : "";

    return `
<article class="schreiben" data-mietverhaeltnis="${sicher(m.id)}">

  <header class="briefkopf">
    <div><b>${sicher(v.name)}</b><br>vertreten durch ${sicher(v.vertreten_durch)} ·
      ${sicher(v.strasse)} · ${sicher(v.plz_ort)}</div>
    <div class="rechts">Objekt ${sicher(o.strasse)}<br>${sicher(o.plz_ort)}</div>
  </header>

  <div class="datumzeile">Köln, ${dat(erstelltAm)}<br>Wohnung ${sicher(m.we)} · ${sicher(m.lage || "")}</div>

  <div class="anschriftenfeld">
    <div class="absenderzeile">${sicher(v.name)} · ${sicher(v.strasse)} · ${sicher(v.plz_ort)}</div>
    ${sicher(m.mieter)}<br>${anschrift}
  </div>

  <h1>Betriebskostenabrechnung ${zeitraum.kurz}</h1>
  <div class="untertitel">Abrechnungszeitraum ${dat(e.abrechnung.von)} – ${dat(
      e.abrechnung.bis
    )} · ${sicher(o.bezeichnung)}</div>

  <!-- MINDESTANGABE 2: Verteilerschlüssel, angegeben und erläutert -->
  <table class="eckdaten">
    <tr><td>Ihre Wohnung</td><td>${sicher(m.we)}, ${sicher(m.lage || "")}</td></tr>
    <tr><td>Wohnfläche</td><td>${zahl(m.wohnflaeche_qm)} m² von ${zahl(
      e.flaeche_gesamt_qm
    )} m² Gesamtwohnfläche — Ihr Anteil beträgt ${pro(m.flaechen_anteil)}</td></tr>
    <tr><td>Ihr Nutzungszeitraum</td><td>${dat(m.nutzung_von)} – ${dat(m.nutzung_bis)} (${sicher(
      m.zeit_text
    )})</td></tr>
    <tr><td>Verteilerschlüssel</td><td>Wohnfläche — für sämtliche Kostenarten
      (§ 4 Abs. 3 Mietvertrag, § 556a Abs. 1 BGB)</td></tr>
  </table>
  ${flaechenhinweis}

  <p class="anrede">${sicher(m.anrede)}</p>
  <p>hiermit rechnen wir die Betriebskosten für ${zeitraum.satz} ab. Die Gesamtkosten des
  Hauses werden nach dem Verhältnis der Wohnflächen auf die vier Wohnungen verteilt.
  ${zeitErklaerung}</p>

  <p>Umgelegt wird eine Kostenart nur dann, wenn <b>beides</b> zutrifft: Sie ist in § 2 der
  Betriebskostenverordnung aufgeführt <b>und</b> sie ist in § 4 Ihres Mietvertrags vereinbart. Die
  Nummer hinter jeder Kostenart verweist auf die entsprechende Stelle der Verordnung. Kosten, auf
  die das nicht zutrifft, sind am Ende dieses Schreibens aufgeführt — sie trägt die Vermieterin.</p>

  <!-- MINDESTANGABE 1 (Spalte 2) und 3 (Spalten 3 und 4) -->
  <table class="kosten">
    <thead>
      <tr>
        <th>Kostenart</th>
        <th class="r">Gesamtkosten Haus</th>
        <th class="r">Anteil Ihrer Wohnung<div class="klein">${pro(
          m.flaechen_anteil
        )}, ganzes Jahr</div></th>
        <th class="r">Ihr Anteil<div class="klein">${sicher(m.zeit_text)}</div></th>
      </tr>
    </thead>
    <tbody>
      ${kostenzeilen}
      <tr class="summe">
        <td>Summe umlagefähige Betriebskosten</td>
        <td class="r">${eur(e.summe_umlagefaehig_cent)}</td>
        <td class="r">${eur(m.jahresanteil_einheit_cent)}</td>
        <td class="r">${eur(m.summe_cent)}</td>
      </tr>
      <!-- MINDESTANGABE 4: Abzug der Vorauszahlungen -->
      <tr>
        <td colspan="3">abzüglich Ihrer Vorauszahlungen (${
          m.zahlungen.length
        } × ${eur(m.vorauszahlung_monatlich_cent)})</td>
        <td class="r">− ${eur(m.vorauszahlung_angesetzt_cent)}</td>
      </tr>
      <tr class="ergebnis">
        <td colspan="3">${ergebnisText}</td>
        <td class="r">${eur(Math.abs(m.saldo_cent))}</td>
      </tr>
    </tbody>
  </table>

  ${zahlungsabsatz}
  ${fehlhinweis}
  ${anpassung}

  <h2>Ihre Zahlungseingänge im Abrechnungszeitraum</h2>
  <table class="kosten">
    <thead><tr><th>Datum</th><th>Verwendungszweck</th><th class="r">Zahlung</th>
      <th class="r">davon Vorauszahlung</th></tr></thead>
    <tbody>
      ${zahlungszeilen}
      <tr class="summe"><td colspan="3">Summe Ihrer Vorauszahlungen</td>
        <td class="r">${eur(m.vorauszahlung_ist_cent)}</td></tr>
    </tbody>
  </table>

  <h2>Zu Ihrer Information: nicht umgelegte Kosten</h2>
  <p>Für das Haus sind ${zeitraum.ganzesKalenderjahr ? zeitraum.jahr : "im Abrechnungszeitraum"} weitere Kosten angefallen, die keine umlagefähigen Betriebskosten sind
  und deshalb von der Vermieterin getragen werden. Wir führen sie auf, damit Sie nachvollziehen
  können, was <i>nicht</i> in Ihre Abrechnung eingeflossen ist:</p>
  <table class="kosten">
    <thead><tr><th>Position</th><th class="r">Betrag</th></tr></thead>
    <tbody>
      ${nichtUmgelegt}
      <tr class="summe"><td>Summe nicht umgelegt</td>
        <td class="r">${eur(e.summe_nicht_umlagefaehig_cent)}</td></tr>
    </tbody>
  </table>

  <div class="abschluss">
  <h2>Herleitung und Belege</h2>
  <p>Rechenweg je Zeile: Gesamtkosten × Wohnflächenanteil (${zahl(m.wohnflaeche_qm)} m² /
  ${zahl(e.flaeche_gesamt_qm)} m²) × Zeitanteil (${sicher(m.zeit_text)}). Die Beträge sind so auf
  Cent gerundet, dass die Summe aller Wohnungen exakt den Gesamtkosten entspricht.</p>
  <p>Sämtliche Belege — Grundbesitzabgabenbescheid, Jahresrechnung der RheinEnergie,
  Versicherungsbeitrag, Hauswart-, Reinigungs- und Gartenpflegerechnungen, Schornsteinfeger und
  Rauchwarnmelderwartung — können Sie nach Terminvereinbarung einsehen. Einwendungen gegen diese
  Abrechnung teilen Sie uns bitte gemäß § 556 Abs. 3 Satz 5 BGB innerhalb von zwölf Monaten nach
  Zugang mit.</p>

  <p class="gruss">Mit freundlichen Grüßen<br><br>${sicher(v.name)}<br>${sicher(
      v.vertreten_durch
    )}</p>
  </div>

  <footer class="brieffuss">
    Betriebskostenabrechnung ${zeitraum.kurz} · ${sicher(m.we)} · ${sicher(m.mieter)} · erstellt am
    ${dat(erstelltAm)}. Heizung und Warmwasser werden nicht abgerechnet: Ihre Wohnung hat eine
    eigene Gas-Etagenheizung mit eigenem Liefervertrag.
  </footer>
</article>`;
  }

  /* -------------------------------------------------------------------------
   * PRÜFUNGEN AM FERTIGEN SCHREIBEN (SPEC.md § 5, Gruppe F)
   * Diese Prüfungen können erst laufen, wenn das Schreiben gebaut ist - sie
   * schauen in das erzeugte HTML hinein. Damit ist sichergestellt, dass die
   * Mindestangaben nicht nur berechnet, sondern auch abgedruckt wurden.
   * ----------------------------------------------------------------------- */
  function pruefeSchreiben(m, e) {
    const html = schreiben(m, e);
    const ergebnisse = [];
    const pruefe = (id, titel, bestanden, befund) =>
      ergebnisse.push({ id, titel, schwere: "blocker", bestanden, befund, mietverhaeltnis: m.id });

    pruefe("F-01", "Gesamtkosten je Kostenart abgedruckt",
      html.includes("Gesamtkosten Haus") && html.includes(N.alsEuroText(e.summe_umlagefaehig_cent)),
      "Spalte und Summe vorhanden");

    pruefe("F-02", "Verteilerschlüssel genannt und erläutert",
      html.includes("Verteilerschlüssel") &&
        html.includes("Gesamtwohnfläche") &&
        html.includes(N.alsProzentText(m.flaechen_anteil)) &&
        (m.ganzjahr || html.includes(m.zeit_text)),
      "Fläche, Prozentsatz und Zeitanteil angegeben");

    pruefe("F-03", "Anteilsberechnung je Kostenart sichtbar",
      m.zeilen.every((z) => html.includes(N.alsEuroText(z.betrag_cent))),
      `${m.zeilen.length} Kostenartenzeilen`);

    pruefe("F-04", "Vorauszahlungen abgezogen und Saldo ausgewiesen",
      html.includes("abzüglich Ihrer Vorauszahlungen") &&
        html.includes(N.alsEuroText(Math.abs(m.saldo_cent))),
      "Abzug und Ergebnis vorhanden");

    pruefe("F-05", "Adressat, Zeitraum, Einheit und Datum vorhanden",
      html.includes(m.mieter) &&
        html.includes(N.alsDatumText(e.abrechnung.von)) &&
        html.includes(m.we) &&
        html.includes(N.alsDatumText(e.abrechnung.erstellt_am)),
      "vollständig");

    pruefe("F-06", "Hinweis auf Einwendungsfrist und Belegeinsicht",
      html.includes("556 Abs. 3") && html.includes("einsehen"), "enthalten");
    ergebnisse[ergebnisse.length - 1].schwere = "warnung";

    // F-07: Die Vorauszahlung darf sich nur durch eine ausdrückliche Erklärung
    // ändern (§ 560 Abs. 4 BGB). Bei beendeten Mietverhältnissen entfällt sie.
    const laufendesMietverhaeltnis = m.nutzung_bis === e.abrechnung.bis;
    pruefe("F-07", "Vorauszahlungsanpassung als ausdrückliche Erklärung",
      !laufendesMietverhaeltnis || (html.includes("560 Abs. 4") && html.includes("Anpassung Ihrer Vorauszahlung")),
      laufendesMietverhaeltnis ? "eigener Absatz mit Rechtsgrundlage vorhanden"
        : "entfällt: Mietverhältnis endete im Abrechnungszeitraum");
    ergebnisse[ergebnisse.length - 1].schwere = "warnung";

    // Ein ausgezogener Mieter ohne eigene Anschrift würde an die Wohnung
    // geschrieben, die er verlassen hat. Das ist kein sichtbarer Platzhalter,
    // aber genauso wenig zustellbar.
    const ausgezogen = m.nutzung_bis < e.abrechnung.bis;
    const ohneNeueAnschrift = ausgezogen && !m.anschrift;
    pruefe("F-08", "Keine offenen Platzhalter, Anschrift zustellbar",
      !html.includes('class="offen"') && !ohneNeueAnschrift,
      m.anschrift_hinweis ? "ACHTUNG: Anschrift fehlt noch"
        : ohneNeueAnschrift ? "ausgezogen, aber keine neue Anschrift eingetragen (Feld \"anschrift\")"
        : "keine Platzhalter");

    return ergebnisse;
  }

  /* -------------------------------------------------------------------------
   * DAS VERSANDFERTIGE SCHREIBEN
   * Ruft erst die Prüfungen auf und setzt, falls etwas Blockierendes offen ist,
   * sichtbar ein ENTWURF-Band über das Schreiben. So kann ein Schreiben, das
   * noch nicht versandt werden darf, nicht versehentlich verschickt werden -
   * man sieht es auf dem Papier (SPEC.md Q-04, "fail-closed").
   * ----------------------------------------------------------------------- */
  function schreibenFertig(m, e) {
    const offeneBlocker = pruefeSchreiben(m, e).filter(
      (p) => !p.bestanden && p.schwere === "blocker"
    );
    if (offeneBlocker.length === 0) return schreiben(m, e);

    const band = `
      <div class="entwurfsband">
        <b>ENTWURF – noch nicht versandfertig</b>
        ${offeneBlocker.map((p) => `${p.id}: ${sicher(p.befund)}`).join(" · ")}
      </div>`;
    // Das Band wird in das <article> eingesetzt, damit es mitgedruckt wird.
    return schreiben(m, e).replace(/(<article[^>]*>)/, `$1${band}`);
  }

  global.Schreiben = { schreiben, schreibenFertig, pruefeSchreiben, sicher, zeitraumBezeichnung };
})(typeof self !== "undefined" ? self : globalThis);
