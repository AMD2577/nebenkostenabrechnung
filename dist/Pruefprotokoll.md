# Prüfprotokoll – Nebenkostenabrechnung 2025

Erzeugt am 2026-09-24 durch `node werkzeuge/baue.js`.
Grundlage: `daten/fall_2025.json` · Prüfkatalog: `SPEC.md` § 5.

## Einstellungen dieses Laufs

| Stellschraube | Wert |
|---|---|
| Zeitanteil | tage |
| Vorauszahlungen | ist |
| Kostenansatz | leistung |

## Ergebnis

| Mietverhältnis | Zeitraum | Anteil | Vorauszahlungen | Ergebnis | Versandfertig |
|---|---|---:|---:|---:|---|
| WE 1 Ahmet und Sevda Yildirim | 365/365 Tage | 2.206,78 € | 1.560,00 € | Nachzahlung 646,78 € | ja |
| WE 2 Marco Bendel | 365/365 Tage | 1.726,28 € | 1.440,00 € | Nachzahlung 286,28 € | ja |
| WE 3 Christiane Nowak | 212/365 Tage | 1.736,56 € | 1.260,00 € | Nachzahlung 476,56 € | nein – ENTWURF |
| WE 3 Julian Kestner | 153/365 Tage | 1.253,27 € | 1.000,00 € | Nachzahlung 253,27 € | ja |
| WE 4 Petra Ohlwein | 365/365 Tage | 1.975,43 € | 1.650,00 € | Nachzahlung 325,43 € | ja |

Umlagefähig gesamt **8.898,32 €** · nicht umlagefähig
4.058,40 € · Belegsumme 12.956,72 €.

Kontrollsumme: Die Anteile aller fünf Mietverhältnisse ergeben zusammen
8.898,32 € — exakt die umlagefähigen
Gesamtkosten (Prüfung F-09).

## Prüfungen an Daten und Rechnung

| ID | Prüfung | Ergebnis | Befund |
|---|---|---|---|
| I-04 | Positionen ergeben die Belegsumme | bestanden | 23 Belege geprüft |
| I-06 | Saldenkette der Kontoauszüge lückenlos | bestanden | 12 Auszüge, 95 Buchungen |
| I-07 | Keine doppelt erfassten Belege | bestanden | keine Dubletten |
| I-12 | Belegdaten plausibel | bestanden | alle plausibel |
| A-01 | Summe der Wohnflächen == Gesamtwohnfläche | bestanden | 250.00 m² vs. 250.00 m² laut Stammdaten |
| A-02 | Verteilung je Kostenart centgenau | bestanden | 12 Kostenarten, Differenz 0 Cent |
| A-03 | Zeitanteile je Einheit vollständig und überschneidungsfrei | bestanden | alle 4 Einheiten ganzjährig belegt |
| A-04 | umlagefähig + nicht umlagefähig == alle Belegpositionen | bestanden | 12.956,72 € == 12.956,72 € |
| A-05 | Saldo == Anteil - Vorauszahlungen | bestanden | 5 Mietverhältnisse |
| A-06 | Angerechnete Vorauszahlungen == erfasste Zahlungen | bestanden | Ansatz "ist" |
| R-01 | Nur vertraglich vereinbarte Kostenarten umgelegt, Fundstelle benannt | bestanden | alle umgelegten Kostenarten stehen in § 4 der Verträge, Fundstelle je Kostenart benannt |
| R-02 | Keine Kostenart außerhalb ihres Gültigkeitszeitraums umgelegt | bestanden | Gültigkeitsfenster eingehalten |
| R-03 | Jede Nicht-Umlage ist mit Fundstelle begründet | bestanden | alle begründet |
| R-04 | Jede umgelegte Kostenart nennt ihre BetrKV-Ziffer | bestanden | vollständig |
| R-05 | Abrechnungszeitraum <= 12 Monate | bestanden | 365 Tage |
| R-06 | Abrechnung innerhalb der Ausschlussfrist | bestanden | erstellt 2026-02-16, Frist 2026-12-31 |
| R-07 | Vorauszahlungen nach Ist (BGH VIII ZR 57/04) | bestanden | nur tatsächlich geleistete Vorauszahlungen angerechnet |
| R-08 | Jeder Beleg betrifft den Abrechnungszeitraum | bestanden | 23 Belege, Leistung jeweils im Zeitraum |
| R-09 | Kostenansatz einheitlich über alle Kostenarten | bestanden | "leistung" gilt für alle 18 Kostenarten |
| R-11 | Abweichende Wohnflächen sind als Entscheidung dokumentiert | bestanden | WE 3: begründet |
| R-10 | Verwaltung/Instandhaltung/Neuanlage nicht umgelegt | bestanden | § 1 Abs. 2 BetrKV eingehalten |
| R-13 | Jede verwendete Kostenart ist in normaler Sprache begründet | bestanden | 18 Kostenarten mit Begründung und Vertragsgrundlage |
| R-12 | Jeder Befund hat eine dokumentierte Behandlung | bestanden | 10 Befunde dokumentiert |
| P-01 | Belege und Kontobewegungen decken sich | bestanden | 11 Lieferanten abgeglichen |
| P-02 | Mieteingänge vollständig | **Warnung** | Petra Ohlwein (WE 4): 2025-10 fehlt |
| P-02b | Vereinbarte Staffelmiete wird vereinnahmt | **Warnung** | Marco Bendel (WE 2): Mindereinnahme 720,00 € in 2025 |

## Prüfungen an den fünf Schreiben (formelle Wirksamkeit)

| ID | Prüfung | Ergebnis | Befund |
|---|---|---|---|
| F-01 | Gesamtkosten je Kostenart abgedruckt (WE1_Yildirim) | bestanden | Spalte und Summe vorhanden |
| F-02 | Verteilerschlüssel genannt und erläutert (WE1_Yildirim) | bestanden | Fläche, Prozentsatz und Zeitanteil angegeben |
| F-03 | Anteilsberechnung je Kostenart sichtbar (WE1_Yildirim) | bestanden | 12 Kostenartenzeilen |
| F-04 | Vorauszahlungen abgezogen und Saldo ausgewiesen (WE1_Yildirim) | bestanden | Abzug und Ergebnis vorhanden |
| F-05 | Adressat, Zeitraum, Einheit und Datum vorhanden (WE1_Yildirim) | bestanden | vollständig |
| F-06 | Hinweis auf Einwendungsfrist und Belegeinsicht (WE1_Yildirim) | bestanden | enthalten |
| F-07 | Vorauszahlungsanpassung als ausdrückliche Erklärung (WE1_Yildirim) | bestanden | eigener Absatz mit Rechtsgrundlage vorhanden |
| F-08 | Keine offenen Platzhalter im Schreiben (WE1_Yildirim) | bestanden | keine Platzhalter |
| F-01 | Gesamtkosten je Kostenart abgedruckt (WE2_Bendel) | bestanden | Spalte und Summe vorhanden |
| F-02 | Verteilerschlüssel genannt und erläutert (WE2_Bendel) | bestanden | Fläche, Prozentsatz und Zeitanteil angegeben |
| F-03 | Anteilsberechnung je Kostenart sichtbar (WE2_Bendel) | bestanden | 12 Kostenartenzeilen |
| F-04 | Vorauszahlungen abgezogen und Saldo ausgewiesen (WE2_Bendel) | bestanden | Abzug und Ergebnis vorhanden |
| F-05 | Adressat, Zeitraum, Einheit und Datum vorhanden (WE2_Bendel) | bestanden | vollständig |
| F-06 | Hinweis auf Einwendungsfrist und Belegeinsicht (WE2_Bendel) | bestanden | enthalten |
| F-07 | Vorauszahlungsanpassung als ausdrückliche Erklärung (WE2_Bendel) | bestanden | eigener Absatz mit Rechtsgrundlage vorhanden |
| F-08 | Keine offenen Platzhalter im Schreiben (WE2_Bendel) | bestanden | keine Platzhalter |
| F-01 | Gesamtkosten je Kostenart abgedruckt (WE3_Nowak) | bestanden | Spalte und Summe vorhanden |
| F-02 | Verteilerschlüssel genannt und erläutert (WE3_Nowak) | bestanden | Fläche, Prozentsatz und Zeitanteil angegeben |
| F-03 | Anteilsberechnung je Kostenart sichtbar (WE3_Nowak) | bestanden | 12 Kostenartenzeilen |
| F-04 | Vorauszahlungen abgezogen und Saldo ausgewiesen (WE3_Nowak) | bestanden | Abzug und Ergebnis vorhanden |
| F-05 | Adressat, Zeitraum, Einheit und Datum vorhanden (WE3_Nowak) | bestanden | vollständig |
| F-06 | Hinweis auf Einwendungsfrist und Belegeinsicht (WE3_Nowak) | bestanden | enthalten |
| F-07 | Vorauszahlungsanpassung als ausdrückliche Erklärung (WE3_Nowak) | bestanden | entfällt: Mietverhältnis endete im Abrechnungszeitraum |
| F-08 | Keine offenen Platzhalter im Schreiben (WE3_Nowak) | **BLOCKER** | ACHTUNG: Anschrift fehlt noch |
| F-01 | Gesamtkosten je Kostenart abgedruckt (WE3_Kestner) | bestanden | Spalte und Summe vorhanden |
| F-02 | Verteilerschlüssel genannt und erläutert (WE3_Kestner) | bestanden | Fläche, Prozentsatz und Zeitanteil angegeben |
| F-03 | Anteilsberechnung je Kostenart sichtbar (WE3_Kestner) | bestanden | 12 Kostenartenzeilen |
| F-04 | Vorauszahlungen abgezogen und Saldo ausgewiesen (WE3_Kestner) | bestanden | Abzug und Ergebnis vorhanden |
| F-05 | Adressat, Zeitraum, Einheit und Datum vorhanden (WE3_Kestner) | bestanden | vollständig |
| F-06 | Hinweis auf Einwendungsfrist und Belegeinsicht (WE3_Kestner) | bestanden | enthalten |
| F-07 | Vorauszahlungsanpassung als ausdrückliche Erklärung (WE3_Kestner) | bestanden | eigener Absatz mit Rechtsgrundlage vorhanden |
| F-08 | Keine offenen Platzhalter im Schreiben (WE3_Kestner) | bestanden | keine Platzhalter |
| F-01 | Gesamtkosten je Kostenart abgedruckt (WE4_Ohlwein) | bestanden | Spalte und Summe vorhanden |
| F-02 | Verteilerschlüssel genannt und erläutert (WE4_Ohlwein) | bestanden | Fläche, Prozentsatz und Zeitanteil angegeben |
| F-03 | Anteilsberechnung je Kostenart sichtbar (WE4_Ohlwein) | bestanden | 12 Kostenartenzeilen |
| F-04 | Vorauszahlungen abgezogen und Saldo ausgewiesen (WE4_Ohlwein) | bestanden | Abzug und Ergebnis vorhanden |
| F-05 | Adressat, Zeitraum, Einheit und Datum vorhanden (WE4_Ohlwein) | bestanden | vollständig |
| F-06 | Hinweis auf Einwendungsfrist und Belegeinsicht (WE4_Ohlwein) | bestanden | enthalten |
| F-07 | Vorauszahlungsanpassung als ausdrückliche Erklärung (WE4_Ohlwein) | bestanden | eigener Absatz mit Rechtsgrundlage vorhanden |
| F-08 | Keine offenen Platzhalter im Schreiben (WE4_Ohlwein) | bestanden | keine Platzhalter |

## Zusammenfassung

- 66 Prüfungen, davon **63 bestanden**
- **1 Blocker** – ein Schreiben mit offenem Blocker wird sichtbar als ENTWURF gekennzeichnet und darf nicht versandt werden
- **2 Warnungen** – jede muss in `ANNAHMEN_UND_RUECKFRAGEN.md` stehen

### Offene Blocker

- **F-08** Keine offenen Platzhalter im Schreiben (WE3_Nowak): ACHTUNG: Anschrift fehlt noch

### Offene Warnungen

- **P-02** Mieteingänge vollständig: Petra Ohlwein (WE 4): 2025-10 fehlt
- **P-02b** Vereinbarte Staffelmiete wird vereinnahmt: Marco Bendel (WE 2): Mindereinnahme 720,00 € in 2025

## Freigabe

Diese Abrechnung ist erst versandfertig, wenn ein Mensch sie freigibt (SPEC.md Q-03/Q-04):
die Vier-Augen-Liste abgearbeitet, Name und Datum eingetragen.

Freigegeben von: ______________________  am: ____________
