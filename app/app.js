/* =============================================================================
 * DIE BEDIENOBERFLÄCHE
 * =============================================================================
 *
 * Diese Datei zeigt an - sie rechnet nicht. Jede Zahl auf dem Bildschirm kommt
 * aus rechenkern/nebenkosten.js. Dadurch kann die Oberfläche gar nicht etwas
 * anderes anzeigen, als in den Abrechnungen steht.
 *
 * ABLAUF
 *   1. beim Start: Fall laden  ->  berechnen  ->  anzeigen
 *   2. Reiter wechseln         ->  denselben Ergebnisstand neu darstellen
 *   3. Einstellung ändern      ->  neu berechnen, Unterschied zeigen, anzeigen
 *
 * WO WAS LIEGT
 *   fall        - die Eingabedaten (aus fall.js oder einer geladenen Datei)
 *   ergebnis    - das Ergebnis des Rechenkerns (wird bei jeder Änderung neu gebaut)
 *   vergleich   - das vorige Ergebnis, um Änderungen sichtbar zu machen (Q-02)
 * ========================================================================== */

(function () {
  "use strict";

  const N = window.Nebenkosten;
  const S = window.Schreiben;
  const EIN = window.Einlesen;
  const eur = N.alsEuroText;
  const dat = N.alsDatumText;
  const pro = N.alsProzentText;
  const zahl = N.alsZahlText;
  const sicher = S.sicher;

  // --- Zustand der Anwendung ------------------------------------------------
  let fall = JSON.parse(JSON.stringify(window.FALL)); // Kopie, damit das Original unberührt bleibt
  let ergebnis = null;
  let vergleich = null;       // Ergebnis VOR der letzten Änderung
  let aktiverReiter = "uebersicht";
  let gewaehltesMietverhaeltnis = null;
  let vorschlag = null;        // der gerade eingelesene, noch nicht übernommene Beleg
  let einlesefehler = null;

  // Alle Eingaben leben in der Falldatei. Änderungen in der Oberfläche liegen
  // zunächst nur im Arbeitsspeicher dieses Browserfensters - beim Schließen
  // wären sie weg. Dieser Schalter merkt sich, ob es solche Änderungen gibt,
  // und die Oberfläche weist dann sichtbar darauf hin.
  let ungespeichert = false;

  const $ = (auswahl) => document.querySelector(auswahl);

  /* =========================================================================
   * Neu berechnen und alles neu zeichnen
   * ======================================================================= */
  function neuBerechnen(merkeVergleich) {
    if (merkeVergleich) vergleich = ergebnis;
    ergebnis = N.berechne(fall);
    zeichne();
  }

  function zeichne() {
    // Kopfzeile
    $("#kopfzeile").textContent =
      `${ergebnis.objekt.bezeichnung} · ${dat(ergebnis.abrechnung.von)} – ` +
      `${dat(ergebnis.abrechnung.bis)} · ${ergebnis.einheiten.length} Wohneinheiten, ` +
      `${zahl(ergebnis.flaeche_gesamt_qm)} m²`;

    // Hinweis auf ungespeicherte Änderungen
    $("#speicherhinweis").innerHTML = ungespeichert
      ? `<div class="speicherleiste">
           <div>
             <b>Nicht gespeicherte Änderungen</b>
             Deine Änderungen gelten nur in diesem Browserfenster. Damit sie erhalten bleiben,
             lade die Falldatei herunter und lege sie im Projekt unter <code>daten/</code> ab.
           </div>
           <button class="knopf haupt" data-aktion="speichern">Falldatei speichern</button>
         </div>`
      : "";

    // Reiter markieren
    document.querySelectorAll("nav.reiter button").forEach((b) =>
      b.classList.toggle("aktiv", b.dataset.reiter === aktiverReiter));

    // Inhalt
    $("#inhalt").innerHTML = ansichten[aktiverReiter]();

    // Druckbereich immer aktuell halten (enthält alle fünf Schreiben)
    $("#druckbereich").innerHTML = ergebnis.mietverhaeltnisse
      .map((m) => S.schreibenFertig(m, ergebnis)).join("");

    verdrahteKnoepfe();
  }

  /* =========================================================================
   * Ansicht 1: Übersicht
   * ======================================================================= */
  const ansichten = {};

  ansichten.uebersicht = function () {
    const summeSaldo = ergebnis.mietverhaeltnisse.reduce((s, m) => s + m.saldo_cent, 0);

    const zeilenMietverhaeltnisse = ergebnis.mietverhaeltnisse.map((m) => `
      <tr class="klickbar" data-oeffne="${m.id}">
        <td>${m.we}</td>
        <td>${sicher(m.mieter)}</td>
        <td>${dat(m.nutzung_von)} – ${dat(m.nutzung_bis)}<div class="klein">${m.zeit_text}</div></td>
        <td class="r">${zahl(m.wohnflaeche_qm)} m²</td>
        <td class="r">${eur(m.summe_cent)}</td>
        <td class="r">${eur(m.vorauszahlung_angesetzt_cent)}
          ${m.fehlende_zahlungen > 0 ? `<span class="marke warnung">${m.fehlende_zahlungen} Zahlung fehlt</span>` : ""}</td>
        <td class="r ${m.saldo_cent > 0 ? "plus" : "minus"}">${m.ergebnis} ${eur(Math.abs(m.saldo_cent))}</td>
      </tr>`).join("");

    // Tabelle der Kostenarten mit einer Spalte je Wohnung.
    const spaltenKopf = ergebnis.einheiten.map((e) =>
      `<th class="r">${e.we}<div class="klein">${zahl(e.wohnflaeche_qm)} m²</div></th>`).join("");

    const kostenzeilen = ergebnis.umlagefaehige.map((k) => `
      <tr>
        <td>${sicher(k.bezeichnung)}
          ${k.warum ? `<div class="grund">${sicher(k.warum)}</div>` : ""}
          <div class="klein"><b>umlagefähig, weil beides zutrifft:</b> ${sicher(k.betrkv)}
            · vereinbart in ${sicher(k.vertrag)} · Konto ${k.konto}</div>
          <details><summary>${k.positionen.length} Belegposition(en)</summary>
            <table>${k.positionen.map((p) => `
              <tr><td class="klein">${sicher(p.beleg)}<br>${sicher(p.bezeichnung)}</td>
                  <td class="r klein">${eur(p.betrag_cent)}</td></tr>`).join("")}
            </table></details></td>
        <td class="r">${eur(k.gesamt_cent)}</td>
        ${ergebnis.einheiten.map((e) => `<td class="r">${eur(k.anteile_je_einheit[e.we])}</td>`).join("")}
      </tr>`).join("");

    const nichtUmgelegt = ergebnis.nicht_umlagefaehige.map((k) => `
      <tr>
        <td>${sicher(k.bezeichnung)}
          ${k.warum ? `<div class="grund">${sicher(k.warum)}</div>` : ""}
          <div class="klein"><b>nicht umlagefähig:</b> ${sicher(k.betrkv)}
            · ${sicher(k.vertrag)} · Konto ${k.konto}</div>
          <details><summary>${k.positionen.length} Belegposition(en)</summary>
            <table>${k.positionen.map((p) => `
              <tr><td class="klein">${sicher(p.beleg)}<br>${sicher(p.bezeichnung)}
                ${p.begruendung ? `<br><i>${sicher(p.begruendung)}</i>` : ""}</td>
                  <td class="r klein">${eur(p.betrag_cent)}</td></tr>`).join("")}
            </table></details></td>
        <td class="r">${eur(k.gesamt_cent)}</td>
      </tr>`).join("");

    return `
      ${zeigeDiff()}
      <div class="kacheln">
        <div class="kachel"><div class="titel">Belegsumme 2025</div>
          <div class="wert">${eur(ergebnis.summe_belege_cent)}</div>
          <div class="klein">${fall.belege.length} Belege</div></div>
        <div class="kachel"><div class="titel">davon umlagefähig</div>
          <div class="wert">${eur(ergebnis.summe_umlagefaehig_cent)}</div>
          <div class="klein">${pro(ergebnis.summe_umlagefaehig_cent / ergebnis.summe_belege_cent, 1)} der Belegsumme</div></div>
        <div class="kachel"><div class="titel">trägt die Eigentümerin</div>
          <div class="wert">${eur(ergebnis.summe_nicht_umlagefaehig_cent)}</div></div>
        <div class="kachel"><div class="titel">je m² und Jahr</div>
          <div class="wert">${eur(ergebnis.kosten_je_qm_jahr_cent)}</div>
          <div class="klein">${eur(Math.round(ergebnis.kosten_je_qm_jahr_cent / 12))} je m² und Monat</div></div>
        <div class="kachel"><div class="titel">Summe der Nachzahlungen</div>
          <div class="wert">${eur(summeSaldo)}</div></div>
      </div>

      <div class="karte">
        <h2>Ergebnis je Mietverhältnis</h2>
        <table>
          <tr><th>WE</th><th>Mieter</th><th>Nutzungszeitraum</th><th class="r">Fläche</th>
              <th class="r">Anteil Kosten</th><th class="r">Vorauszahlungen</th><th class="r">Ergebnis</th></tr>
          ${zeilenMietverhaeltnisse}
        </table>
        <p class="klein">Zeile anklicken öffnet die vollständige Herleitung und das Schreiben.</p>
      </div>

      <div class="karte">
        <h2>Umlagefähige Kostenarten und Verteilung nach Wohnfläche</h2>
        <table>
          <tr><th>Kostenart</th><th class="r">Gesamt</th>${spaltenKopf}</tr>
          ${kostenzeilen}
          <tr class="summe"><td>Summe umlagefähig</td>
            <td class="r">${eur(ergebnis.summe_umlagefaehig_cent)}</td>
            ${ergebnis.einheiten.map((e) => `<td class="r">${eur(e.jahresanteil_cent)}</td>`).join("")}</tr>
        </table>
        <p class="klein">Die Spaltensummen ergeben zusammen exakt die Gesamtkosten — die Verteilung
        erfolgt centgenau (Prüfung A-02).</p>
      </div>

      <div class="karte">
        <h2>Nicht umlagefähig — trägt die Eigentümerin</h2>
        <table>
          <tr><th>Position</th><th class="r">Gesamt</th></tr>
          ${nichtUmgelegt}
          <tr class="summe"><td>Summe</td><td class="r">${eur(ergebnis.summe_nicht_umlagefaehig_cent)}</td></tr>
        </table>
      </div>`;
  };

  /* =========================================================================
   * Ansicht 2: Abrechnungen (Herleitung + fertiges Schreiben)
   * ======================================================================= */
  ansichten.abrechnungen = function () {
    const m = ergebnis.mietverhaeltnisse.find((x) => x.id === gewaehltesMietverhaeltnis)
      || ergebnis.mietverhaeltnisse[0];
    gewaehltesMietverhaeltnis = m.id;

    const auswahl = ergebnis.mietverhaeltnisse.map((x) => `
      <button class="knopf ${x.id === m.id ? "haupt" : ""}" data-oeffne="${x.id}">
        ${x.we} · ${sicher(x.mieter)}</button>`).join(" ");

    const herleitung = m.zeilen.map((z) => `
      <tr>
        <td>${sicher(z.bezeichnung)}<div class="klein">${sicher(z.betrkv)}</div></td>
        <td class="r">${eur(z.gesamt_cent)}</td>
        <td class="r">${eur(z.anteil_einheit_jahr_cent)}</td>
        <td class="r">${eur(z.betrag_cent)}</td>
      </tr>`).join("");

    return `
      ${zeigeDiff()}
      <div class="karte">
        <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
          ${auswahl}
          <span style="margin-left:auto"></span>
          <button class="knopf" data-drucke="${m.id}">Dieses Schreiben drucken</button>
          <button class="knopf haupt" data-drucke="alle">Alle 5 drucken</button>
        </div>
      </div>

      <div class="karte">
        <h2>Herleitung: Gesamtkosten × Flächenanteil (${pro(m.flaechen_anteil)}) × Zeitanteil (${m.zeit_text})</h2>
        <table>
          <tr><th>Kostenart</th><th class="r">Gesamtkosten Haus</th>
              <th class="r">Anteil Wohnung / Jahr</th><th class="r">Anteil Mietverhältnis</th></tr>
          ${herleitung}
          <tr class="summe"><td>Summe</td>
            <td class="r">${eur(ergebnis.summe_umlagefaehig_cent)}</td>
            <td class="r">${eur(m.jahresanteil_einheit_cent)}</td>
            <td class="r">${eur(m.summe_cent)}</td></tr>
          <tr><td colspan="3">abzüglich Vorauszahlungen (${m.zahlungen.length} × ${eur(m.vorauszahlung_monatlich_cent)})</td>
            <td class="r">− ${eur(m.vorauszahlung_angesetzt_cent)}</td></tr>
          <tr class="summe"><td colspan="3">${m.ergebnis}</td>
            <td class="r ${m.saldo_cent > 0 ? "plus" : "minus"}">${eur(Math.abs(m.saldo_cent))}</td></tr>
        </table>
      </div>

      <div class="karte">
        <h2>Prüfung dieses Schreibens</h2>
        ${S.pruefeSchreiben(m, ergebnis).map((p) => `
          <div class="befund ${p.bestanden ? "ok" : ""}">
            <b>${p.id} ${sicher(p.titel)} — ${p.bestanden ? "erfüllt" : "OFFEN"}</b>
            ${sicher(p.befund)}</div>`).join("")}
      </div>

      <h2 style="font-size:15px">So geht das Schreiben beim Mieter ein</h2>
      <div class="papier">${S.schreibenFertig(m, ergebnis)}</div>`;
  };

  /* =========================================================================
   * Ansicht 3: Prüfungen
   * ======================================================================= */
  ansichten.pruefungen = function () {
    // Prüfungen am Datenbestand plus Prüfungen an allen fünf Schreiben.
    const dokumentpruefungen = ergebnis.mietverhaeltnisse
      .flatMap((m) => S.pruefeSchreiben(m, ergebnis));
    const alle = ergebnis.pruefungen.concat(dokumentpruefungen);
    const offen = alle.filter((p) => !p.bestanden);
    const blocker = offen.filter((p) => p.schwere === "blocker");

    // Ein Blocker sperrt nur das betroffene Schreiben, nicht alle. Deshalb wird
    // hier je Mietverhältnis ausgewertet, welches versandt werden darf.
    const gesperrteSchreiben = ergebnis.mietverhaeltnisse
      .filter((m) => dokumentpruefungen.some(
        (p) => p.mietverhaeltnis === m.id && !p.bestanden && p.schwere === "blocker"))
      .map((m) => m.we + " " + m.mieter.split(" ").pop());
    const versandfertig = ergebnis.mietverhaeltnisse.length - gesperrteSchreiben.length;

    const zeile = (p) => `
      <tr>
        <td>${p.id}</td>
        <td>${sicher(p.titel)}${p.mietverhaeltnis ? `<div class="klein">${p.mietverhaeltnis}</div>` : ""}</td>
        <td><span class="marke ${p.bestanden ? "gut" : p.schwere === "blocker" ? "schlecht" : "warnung"}">
          ${p.bestanden ? "bestanden" : p.schwere === "blocker" ? "Blocker" : "Warnung"}</span></td>
        <td class="klein">${sicher(p.befund)}</td>
      </tr>`;

    return `
      ${zeigeDiff()}
      <div class="kacheln">
        <div class="kachel"><div class="titel">Prüfungen gesamt</div><div class="wert">${alle.length}</div></div>
        <div class="kachel"><div class="titel">bestanden</div><div class="wert">${alle.length - offen.length}</div></div>
        <div class="kachel"><div class="titel">Blocker</div>
          <div class="wert ${blocker.length ? "plus" : ""}">${blocker.length}</div></div>
        <div class="kachel"><div class="titel">Warnungen</div>
          <div class="wert">${offen.length - blocker.length}</div></div>
        <div class="kachel"><div class="titel">Versandfertig</div>
          <div class="wert">${versandfertig} von ${ergebnis.mietverhaeltnisse.length}</div>
          <div class="klein">${gesperrteSchreiben.length === 0
            ? "alle Schreiben dürfen versandt werden"
            : gesperrteSchreiben.join(", ") + " als ENTWURF gesperrt"}</div></div>
      </div>

      ${offen.length ? `<div class="karte"><h2>Offene Punkte</h2>
        ${offen.map((p) => `<div class="befund"><b>${p.id} ${sicher(p.titel)}</b>${sicher(p.befund)}</div>`).join("")}
        <p class="klein">Jede Warnung muss in ANNAHMEN_UND_RUECKFRAGEN.md auftauchen (SPEC.md § 5.1).</p>
      </div>` : ""}

      <div class="karte">
        <h2>Prüfprotokoll — Daten und Rechnung</h2>
        <table><tr><th>ID</th><th>Prüfung</th><th>Ergebnis</th><th>Befund</th></tr>
          ${ergebnis.pruefungen.map(zeile).join("")}</table>
      </div>

      <div class="karte">
        <h2>Prüfprotokoll — die fünf Schreiben (formelle Wirksamkeit)</h2>
        <table><tr><th>ID</th><th>Prüfung</th><th>Ergebnis</th><th>Befund</th></tr>
          ${dokumentpruefungen.map(zeile).join("")}</table>
      </div>

      <div class="karte">
        <h2>Fachliche Befunde aus den Unterlagen</h2>
        ${ergebnis.befunde.map((b) => `
          <div class="befund">
            <b>${b.id} · ${sicher(b.kategorie)}: ${sicher(b.titel)}</b>
            <div><b style="display:inline">Behandlung:</b> ${sicher(b.behandlung)}</div>
            <div class="klein"><b style="display:inline">Auswirkung:</b> ${sicher(b.auswirkung)}</div>
          </div>`).join("")}
      </div>`;
  };

  /* =========================================================================
   * Ansicht 4: Belege
   * ======================================================================= */
  ansichten.belege = function () {
    const zeilen = fall.belege.map((b) => {
      const summePositionen = b.positionen.reduce((s, p) => s + N.zuCent(p.betrag), 0);
      const stimmt = summePositionen === N.zuCent(b.rechnungsbetrag);
      return `
        <tr>
          <td>${sicher(b.beleg)}<div class="klein">${sicher(b.lieferant)}</div></td>
          <td>${dat(b.datum)}<div class="klein">${sicher(b.leistungszeitraum || "")}</div></td>
          <td>${b.positionen.map((p) => {
            const k = fall.kostenarten[p.kostenart] || {};
            return `
            <div style="margin-bottom:8px">
              ${sicher(p.bezeichnung)}
              <span class="marke ${p.umlagefaehig ? "gut" : "schlecht"}">
                ${p.umlagefaehig ? "umlagefähig" : "nicht umlagefähig"}</span>
              <div class="grund">${sicher(k.warum || "")}</div>
              <div class="klein">${sicher(k.bezeichnung)} · ${sicher(k.betrkv || "")}
                ${k.vertrag ? " · " + sicher(k.vertrag) : ""}</div>
              ${p.begruendung ? `<div class="klein"><b>Zu diesem Beleg:</b> ${sicher(p.begruendung)}</div>` : ""}
            </div>`; }).join("")}</td>
          <td class="r">${eur(N.zuCent(b.rechnungsbetrag))}
            <div class="klein">${stimmt ? "Positionen stimmen" : "PRÜFEN"}</div></td>
        </tr>`;
    }).join("");

    return `
      ${zeigeDiff()}
      <div class="karte">
        <h2>Belege (${fall.belege.length})</h2>
        <table><tr><th>Beleg</th><th>Datum</th><th>Positionen</th><th class="r">Betrag</th></tr>
          ${zeilen}</table>
      </div>
      <div class="karte">
        <h2>Objektkonto 2025</h2>
        <p class="klein">${fall.buchungen.length} Buchungen aus ${fall.kontoauszuege.length}
        Kontoauszügen. Die Saldenkette wird bei jedem Lauf geprüft (Prüfung I-06).</p>
        <table><tr><th>Monat</th><th class="r">Anfangsbestand</th><th class="r">Endbestand</th></tr>
          ${fall.kontoauszuege.map((a) => `
            <tr><td>${String(a.monat).padStart(2, "0")}/${a.jahr}</td>
              <td class="r">${eur(N.zuCent(a.anfangsbestand))}</td>
              <td class="r">${eur(N.zuCent(a.endbestand))}</td></tr>`).join("")}
        </table>
      </div>`;
  };

  /* =========================================================================
   * Ansicht 5: Einstellungen (die Stellschrauben)
   * ======================================================================= */
  ansichten.einstellungen = function () {
    const e = fall.einstellungen;

    // Baut eine Reihe Auswahlknöpfe für eine Einstellung.
    const wahl = (name, optionen) => `
      <div class="auswahl">
        ${optionen.map((o) => `
          <button class="${e[name] === o.wert ? "aktiv" : ""}"
                  data-einstellung="${name}" data-wert="${o.wert}">${o.text}</button>`).join("")}
      </div>`;

    return `
      ${zeigeDiff()}
      <div class="karte">
        <h2>Stellschrauben</h2>
        <p class="klein">Jede Änderung berechnet die Abrechnung sofort neu und zeigt oben, was sich
        dadurch je Mieter ändert. Die fachliche Begründung steht jeweils daneben.</p>
        <div class="schalter">
          <label>Zeitanteil bei Mieterwechsel</label>
          <div>
            ${wahl("zeitanteil_methode", [
              { wert: "tage", text: "taggenau (212/153 Tage)" },
              { wert: "monate", text: "volle Monate (7/12, 5/12)" },
            ])}
            <div class="klein">§ 4 Abs. 5 der Mietverträge verlangt eine zeitanteilige Aufteilung,
            legt die Methode aber nicht fest. Taggenau ist die genauere Variante.</div>
          </div>

          <label>Vorauszahlungen</label>
          <div>
            ${wahl("vorauszahlungen_ansatz", [
              { wert: "ist", text: "tatsächlich gezahlt (Kontoauszug)" },
              { wert: "soll", text: "vertraglich geschuldet" },
            ])}
            <div class="klein">Angerechnet werden dürfen nur tatsächlich geleistete Vorauszahlungen
            (BGH VIII ZR 57/04). Der Soll-Ansatz löst deshalb bewusst eine Warnung aus.</div>
          </div>

          <label>Kostenansatz</label>
          <div>
            ${wahl("kostenansatz", [
              { wert: "leistung", text: "Leistungsprinzip (Kosten des Jahres)" },
              { wert: "abfluss", text: "Abflussprinzip (Zahlungen des Jahres)" },
            ])}
            <div class="klein">Betrifft nur die RheinEnergie-Jahresrechnung: 1.276,60 € Kosten für
            2025 gegenüber 1.200,00 € Abschlägen, die 2025 abgeflossen sind. Beide Verfahren sind
            zulässig, müssen aber einheitlich angewandt werden.</div>
          </div>
        </div>
      </div>

      <div class="karte">
        <h2>Falldatei</h2>
        <p class="klein">Alle Eingaben stehen in einer einzigen Datei. Herunterladen, bearbeiten,
        wieder laden — oder weitergeben.</p>
        <button class="knopf" data-aktion="export">Falldatei herunterladen</button>
        <button class="knopf" data-aktion="import">Falldatei laden</button>
        <button class="knopf" data-aktion="zuruecksetzen">Auf Auslieferungsstand zurücksetzen</button>
        <input type="file" id="dateiwahl" accept="application/json" style="display:none">
      </div>`;
  };

  /* =========================================================================
   * Ansicht 6: Beleg erfassen
   * =========================================================================
   * Ablauf: Dokument einlesen -> Vorschlag prüfen -> fachlich zuordnen ->
   * bestätigen -> übernehmen. Zwischen "gelesen" und "gebucht" steht immer ein
   * Mensch (SPEC.md § 3).
   * ======================================================================= */
  ansichten.erfassen = function () {
    const kopf = `
      <div class="karte">
        <h2>Beleg einlesen</h2>
        <p class="klein">Ein PDF hierher ziehen oder den Text einer Rechnung einfügen. Aus dem
        Dokument wird ein <b>Vorschlag</b>. Übernommen wird er erst, wenn die Prüfungen bestanden
        sind und die Zuordnung bestätigt wurde.</p>
        <div id="ablage" class="ablage">
          <b>PDF hierher ziehen</b>
          <div class="klein">oder <button class="knopf" data-aktion="dateiwaehlen">Datei auswählen</button></div>
          <input type="file" id="pdfwahl" accept="application/pdf" style="display:none">
        </div>
        <details style="margin-top:10px">
          <summary>Kein PDF zur Hand? Text einfügen</summary>
          <textarea id="textfeld" rows="7" placeholder="Text der Rechnung hier einfügen …"></textarea>
          <button class="knopf" data-aktion="textauswerten">Text auswerten</button>
        </details>
        ${einlesefehler ? `<div class="befund"><b>Einlesen nicht möglich</b>${sicher(einlesefehler)}</div>` : ""}
      </div>`;

    if (!vorschlag) return kopf;
    return kopf + zeigeVorschlag();
  };

  /** Stellt den eingelesenen Vorschlag zum Prüfen und Zuordnen dar. */
  function zeigeVorschlag() {
    const v = vorschlag.vorschlag;
    const kostenartenListe = Object.entries(fall.kostenarten);

    const kopfzeile = (bezeichnung, feld, wert, anker) => `
      <tr>
        <td>${bezeichnung}</td>
        <td><input class="feld" data-kopf="${feld}" value="${sicher(wert === null ? "" : wert)}"></td>
        <td class="klein">${anker ? `Zeile ${anker.zeile} im Dokument` : "nicht im Dokument gefunden"}</td>
      </tr>`;

    const positionen = v.positionen.map((pos, i) => `
      <tr>
        <td><input class="feld" data-position="${i}" data-feld="bezeichnung" value="${sicher(pos.bezeichnung)}"></td>
        <td class="r">${eur(N.zuCent(pos.betrag))}
          ${pos.hinweis ? `<div class="klein">${sicher(pos.hinweis)}</div>` : ""}</td>
        <td>
          <select class="feld" data-position="${i}" data-feld="kostenart">
            <option value="">— bitte wählen —</option>
            ${kostenartenListe.map(([schluessel, k]) => `
              <option value="${schluessel}" ${pos.kostenart === schluessel ? "selected" : ""}>
                ${sicher(k.bezeichnung)}</option>`).join("")}
          </select>
          ${pos.kostenart ? `
            <div class="grund">${sicher(fall.kostenarten[pos.kostenart].warum || "")}</div>
            <div class="klein">${sicher(fall.kostenarten[pos.kostenart].betrkv)}
              · ${sicher(fall.kostenarten[pos.kostenart].vertrag || "")}</div>` : ""}
        </td>
        <td>
          <div class="auswahl">
            <button class="${pos.umlagefaehig === true ? "aktiv" : ""}"
                    data-umlage="${i}" data-wert="ja">umlagefähig</button>
            <button class="${pos.umlagefaehig === false ? "aktiv" : ""}"
                    data-umlage="${i}" data-wert="nein">nicht umlagefähig</button>
          </div>
          ${pos.umlagefaehig === false ? `
            <input class="feld" data-position="${i}" data-feld="begruendung"
                   placeholder="Begründung mit Fundstelle, z. B. § 1 Abs. 2 Nr. 2 BetrKV"
                   value="${sicher(pos.begruendung)}">` : ""}
        </td>
      </tr>`).join("");

    return `
      <div class="karte">
        <h2>Vorschlag aus „${sicher(v.beleg)}"</h2>
        <table>
          ${kopfzeile("Lieferant", "lieferant", v.lieferant, { zeile: 1 })}
          ${kopfzeile("Rechnungsnummer", "rechnungsnr", v.rechnungsnr, v.anker.rechnungsnr)}
          ${kopfzeile("Datum", "datum", v.datum, v.anker.datum)}
          ${kopfzeile("Leistungszeitraum", "leistungszeitraum", v.leistungszeitraum, v.anker.leistungszeitraum)}
          ${kopfzeile("Rechnungsbetrag", "rechnungsbetrag", v.rechnungsbetrag, v.anker.rechnungsbetrag)}
          ${kopfzeile("Kennung im Kontoauszug", "bank_kennung", v.bank_kennung, null)}
        </table>
        ${v.datum_art ? `<p class="klein">Als Datum wurde das <b>${v.datum_art}</b> übernommen.
          ${v.datum_art === "Leistungsdatum" && v.rechnungsdatum
            ? `Die Rechnung wurde am ${dat(v.rechnungsdatum)} geschrieben; für die Zuordnung zum
               Abrechnungsjahr zählt beim Leistungsprinzip der Tag der Leistung.` : ""}</p>` : ""}
        ${v.ust_auf_positionen_verteilt ? `<p class="klein">Die Positionen waren netto ausgewiesen.
          Die Umsatzsteuer von ${eur(N.zuCent(v.umsatzsteuer))} wurde centgenau auf die Positionen
          verteilt, weil umgelegt wird, was tatsächlich bezahlt wurde.</p>` : ""}
      </div>

      <div class="karte">
        <h2>Positionen zuordnen</h2>
        <p class="klein">Kostenart und Umlagefähigkeit sind die fachliche Entscheidung — sie werden
        vorgeschlagen, aber nicht automatisch übernommen.</p>
        <table>
          <tr><th>Bezeichnung</th><th class="r">Betrag</th><th>Kostenart</th><th>Umlage</th></tr>
          ${positionen}
          <tr class="summe"><td>Summe</td>
            <td class="r">${eur(N.zuCent(v.positionen.reduce((s, p) => s + p.betrag, 0)))}</td>
            <td colspan="2" class="klein">muss dem Rechnungsbetrag entsprechen (Prüfung I-04)</td></tr>
        </table>
      </div>

      <div class="karte" id="vorschlagstatus">${zeigeVorschlagStatus()}</div>

      <div class="karte">
        <details><summary>Text des Dokuments ansehen (Grundlage aller erkannten Werte)</summary>
          <pre class="dokumenttext">${sicher(v.text)}</pre></details>
      </div>`;
  }

  /** Prüfungen und Übernahme-Knopf - wird nach jeder Eingabe neu gezeichnet. */
  function zeigeVorschlagStatus() {
    const v = vorschlag.vorschlag;
    const pruefungen = EIN.pruefeVorschlag(v, v.text, fall.objekt);
    const blocker = pruefungen.filter((p) => !p.bestanden && p.schwere === "blocker");

    // Probelauf der Übernahme, ohne etwas zu verändern.
    const probe = EIN.uebernimm(JSON.parse(JSON.stringify(fall)), JSON.parse(JSON.stringify(v)));

    return `
      <h2>Prüfung des Belegs</h2>
      ${pruefungen.map((p) => `
        <div class="befund ${p.bestanden ? "ok" : p.schwere === "blocker" ? "" : "info"}">
          <b>${p.id} ${sicher(p.titel)} — ${p.bestanden ? "erfüllt" : "offen"}</b>
          ${sicher(p.befund)}</div>`).join("")}
      ${blocker.length
        ? `<p class="klein">Dieser Beleg steht in <b>Quarantäne</b>: Er kann nicht übernommen werden,
           solange ein blockierender Punkt offen ist. Werte oben korrigieren oder den Beleg von Hand
           erfassen.</p>`
        : ""}
      ${probe.fehler.length
        ? `<div class="befund"><b>Vor der Übernahme zu erledigen</b>
             ${probe.fehler.map((f) => sicher(f)).join("<br>")}</div>`
        : ""}
      <button class="knopf haupt" data-aktion="uebernehmen"
              ${probe.uebernommen ? "" : "disabled"}>Beleg übernehmen</button>
      <button class="knopf" data-aktion="verwerfen">Verwerfen</button>`;
  }

  /** Liest eine PDF-Datei ein und baut daraus den Vorschlag. */
  async function leseDatei(datei) {
    einlesefehler = null;
    try {
      const { text } = await EIN.textAusPdf(datei);
      vorschlag = EIN.schlageBelegVor(text, datei.name, fall.objekt);
    } catch (fehler) {
      vorschlag = null;
      einlesefehler = fehler.message;
    }
    zeichne();
  }

  /* =========================================================================
   * Änderungsanzeige (SPEC.md Q-02)
   * Nach einer Änderung sieht man sofort, was sie bei jedem Mieter bewirkt -
   * bevor man irgendetwas verschickt.
   * ======================================================================= */
  function zeigeDiff() {
    if (!vergleich) return "";
    const zeilen = ergebnis.mietverhaeltnisse.map((neu) => {
      const alt = vergleich.mietverhaeltnisse.find((m) => m.id === neu.id);
      const differenz = neu.saldo_cent - alt.saldo_cent;
      return { neu, alt, differenz };
    });
    if (zeilen.every((z) => z.differenz === 0)) return "";

    return `
      <div class="diff">
        <b>Wirkung der letzten Änderung</b>
        <table>
          <tr><th>Mietverhältnis</th><th class="r">vorher</th><th class="r">nachher</th><th class="r">Differenz</th></tr>
          ${zeilen.map((z) => `
            <tr><td>${z.neu.we} · ${sicher(z.neu.mieter)}</td>
              <td class="r">${eur(Math.abs(z.alt.saldo_cent))}</td>
              <td class="r">${eur(Math.abs(z.neu.saldo_cent))}</td>
              <td class="r ${z.differenz > 0 ? "plus" : z.differenz < 0 ? "minus" : ""}">
                ${z.differenz === 0 ? "unverändert" : (z.differenz > 0 ? "+" : "−") + eur(Math.abs(z.differenz)).replace("−", "")}</td>
            </tr>`).join("")}
        </table>
      </div>`;
  }

  /* =========================================================================
   * Knöpfe und Klicks
   * ======================================================================= */
  function verdrahteKnoepfe() {
    // Zeile oder Knopf öffnet ein Mietverhältnis
    document.querySelectorAll("[data-oeffne]").forEach((el) =>
      el.addEventListener("click", () => {
        gewaehltesMietverhaeltnis = el.dataset.oeffne;
        aktiverReiter = "abrechnungen";
        zeichne();
      }));

    // Drucken
    document.querySelectorAll("[data-drucke]").forEach((el) =>
      el.addEventListener("click", () => drucke(el.dataset.drucke)));

    // Einstellung ändern
    document.querySelectorAll("[data-einstellung]").forEach((el) =>
      el.addEventListener("click", () => {
        fall.einstellungen[el.dataset.einstellung] = el.dataset.wert;
        protokolliere(`Einstellung ${el.dataset.einstellung} auf "${el.dataset.wert}" gesetzt`);
        ungespeichert = true;
        neuBerechnen(true);
      }));

    // Falldatei
    const aktion = (name, funktion) => {
      const el = document.querySelector(`[data-aktion="${name}"]`);
      if (el) el.addEventListener("click", funktion);
    };
    aktion("export", exportiere);
    aktion("speichern", exportiere);
    aktion("import", () => document.getElementById("dateiwahl").click());
    aktion("zuruecksetzen", () => {
      fall = JSON.parse(JSON.stringify(window.FALL));
      vergleich = null;
      ungespeichert = false;
      neuBerechnen(false);
    });
    const dateiwahl = document.getElementById("dateiwahl");
    if (dateiwahl) dateiwahl.addEventListener("change", importiere);

    verdrahteErfassen();
  }

  /* ---- Knöpfe und Felder der Ansicht "Beleg erfassen" -------------------- */
  function verdrahteErfassen() {
    const ablage = document.getElementById("ablage");
    if (ablage) {
      // Datei per Ziehen und Fallenlassen
      ablage.addEventListener("dragover", (e) => { e.preventDefault(); ablage.classList.add("bereit"); });
      ablage.addEventListener("dragleave", () => ablage.classList.remove("bereit"));
      ablage.addEventListener("drop", (e) => {
        e.preventDefault();
        ablage.classList.remove("bereit");
        if (e.dataTransfer.files[0]) leseDatei(e.dataTransfer.files[0]);
      });
    }
    const pdfwahl = document.getElementById("pdfwahl");
    if (pdfwahl) pdfwahl.addEventListener("change", (e) => {
      if (e.target.files[0]) leseDatei(e.target.files[0]);
    });

    const knopf = (name, fn) => {
      const el = document.querySelector(`[data-aktion="${name}"]`);
      if (el) el.addEventListener("click", fn);
    };
    knopf("dateiwaehlen", () => document.getElementById("pdfwahl").click());
    knopf("textauswerten", () => {
      const text = document.getElementById("textfeld").value;
      if (!text.trim()) return;
      einlesefehler = null;
      vorschlag = EIN.schlageBelegVor(text, "eingefuegter_text.pdf", fall.objekt);
      zeichne();
    });
    knopf("verwerfen", () => { vorschlag = null; einlesefehler = null; zeichne(); });
    knopf("uebernehmen", () => {
      const ergebnis = EIN.uebernimm(fall, vorschlag.vorschlag);
      if (!ergebnis.uebernommen) { alert("Nicht übernommen:\n" + ergebnis.fehler.join("\n")); return; }
      vorschlag = null;
      aktiverReiter = "belege";
      ungespeichert = true;
      neuBerechnen(true);      // mit Vorher/Nachher-Vergleich
    });

    // Eingaben schreiben direkt in den Vorschlag. Danach wird nur der
    // Prüfblock neu gezeichnet - so springt der Eingabefokus nicht weg.
    document.querySelectorAll("[data-kopf]").forEach((el) =>
      el.addEventListener("input", () => {
        const feld = el.dataset.kopf;
        vorschlag.vorschlag[feld] =
          feld === "rechnungsbetrag" ? Number(el.value.replace(",", ".")) : el.value;
        aktualisiereVorschlagStatus();
      }));

    document.querySelectorAll("[data-position]").forEach((el) =>
      el.addEventListener("input", () => {
        const pos = vorschlag.vorschlag.positionen[Number(el.dataset.position)];
        pos[el.dataset.feld] = el.dataset.feld === "betrag" ? Number(el.value) : el.value;
        aktualisiereVorschlagStatus();
      }));

    document.querySelectorAll("[data-umlage]").forEach((el) =>
      el.addEventListener("click", () => {
        const pos = vorschlag.vorschlag.positionen[Number(el.dataset.umlage)];
        pos.umlagefaehig = el.dataset.wert === "ja";
        // Bei einer Nicht-Umlage schlagen wir die Begründung aus dem
        // Kostenartenkatalog vor - sie muss aber bestätigt werden.
        if (pos.umlagefaehig === false && !pos.begruendung && pos.kostenart) {
          pos.begruendung = fall.kostenarten[pos.kostenart].betrkv || "";
        }
        zeichne();
      }));
  }

  function aktualisiereVorschlagStatus() {
    const block = document.getElementById("vorschlagstatus");
    if (!block) return;
    block.innerHTML = zeigeVorschlagStatus();
    const neu = (name, fn) => {
      const el = block.querySelector(`[data-aktion="${name}"]`);
      if (el) el.addEventListener("click", fn);
    };
    neu("verwerfen", () => { vorschlag = null; einlesefehler = null; zeichne(); });
    neu("uebernehmen", () => {
      const ergebnis = EIN.uebernimm(fall, vorschlag.vorschlag);
      if (!ergebnis.uebernommen) { alert("Nicht übernommen:\n" + ergebnis.fehler.join("\n")); return; }
      vorschlag = null;
      aktiverReiter = "belege";
      neuBerechnen(true);
    });
  }

  /** Hält fest, wer wann was geändert hat (SPEC.md Q-05). */
  function protokolliere(was) {
    fall.protokoll = fall.protokoll || [];
    fall.protokoll.push({
      zeitpunkt: new Date().toISOString().slice(0, 19).replace("T", " "),
      wer: "Oberfläche",
      was,
      warum: "Änderung im laufenden Betrieb",
    });
  }

  /**
   * Druckt entweder alle Schreiben oder genau eines.
   * Der Trick: Im Druckbereich stehen immer alle fünf. Soll nur eines aufs
   * Papier, markieren wir es und setzen ein Merkmal am <body> - der Rest wird
   * per CSS ausgeblendet (siehe stil.css, Abschnitt DRUCK).
   */
  function drucke(welches) {
    const schreiben = document.querySelectorAll("#druckbereich .schreiben");
    schreiben.forEach((s) => s.classList.remove("drucken"));

    if (welches === "alle") {
      delete document.body.dataset.nurDrucken;
    } else {
      document.body.dataset.nurDrucken = welches;
      const treffer = document.querySelector(`#druckbereich [data-mietverhaeltnis="${welches}"]`);
      if (treffer) treffer.classList.add("drucken");
    }
    window.print();
  }

  function exportiere() {
    const text = JSON.stringify(fall, null, 2);
    const jahr = fall.abrechnung.von.slice(0, 4);
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([text], { type: "application/json" }));
    link.download = `fall_${jahr}.json`;
    link.click();
    URL.revokeObjectURL(link.href);

    // Der Stand liegt jetzt als Datei vor - der Hinweis kann verschwinden.
    ungespeichert = false;
    zeichne();
  }

  function importiere(ereignis) {
    const datei = ereignis.target.files[0];
    if (!datei) return;
    const leser = new FileReader();
    leser.onload = () => {
      try {
        fall = JSON.parse(leser.result);
        vergleich = null;
        ungespeichert = false;
        neuBerechnen(false);
        alert("Falldatei geladen.");
      } catch (fehler) {
        alert("Die Datei konnte nicht gelesen werden: " + fehler.message);
      }
    };
    leser.readAsText(datei);
  }

  /* =========================================================================
   * Start
   * ======================================================================= */
  document.querySelectorAll("nav.reiter button").forEach((b) =>
    b.addEventListener("click", () => {
      aktiverReiter = b.dataset.reiter;
      zeichne();
    }));

  document.getElementById("alleDrucken").addEventListener("click", () => drucke("alle"));

  // Letzte Sicherung: Wer das Fenster mit ungespeicherten Änderungen schließt,
  // bekommt die Rückfrage des Browsers. Ohne Änderungen passiert nichts.
  window.addEventListener("beforeunload", (ereignis) => {
    if (!ungespeichert) return;
    ereignis.preventDefault();
    ereignis.returnValue = "";
  });

  neuBerechnen(false);
})();
