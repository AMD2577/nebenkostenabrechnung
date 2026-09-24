# Nebenkostenabrechnung 2025 · Berrenrather Straße 218, Köln-Sülz

Aus den 43 Originalunterlagen des Hauses entstehen die Betriebskostenabrechnungen 2025 – je
Mietverhältnis, nachvollziehbar hergeleitet, geprüft und so, dass man sie einem Mieter schicken kann.

## Die vier Ergebnisse

| Gefragt | Wo |
|---|---|
| **1 · Die Abrechnungen** | je eine PDF-Datei in [`dist/`](dist/) |
| **2 · Die Lösung** | [`dist/Nebenkostenabrechnung_2025.zip`](dist/Nebenkostenabrechnung_2025.zip) entpacken und die HTML-Datei öffnen. Keine Installation, kein Server, kein Internet. |
| **3 · Annahmen und Rückfragen** | [`ANNAHMEN_UND_RUECKFRAGEN.md`](ANNAHMEN_UND_RUECKFRAGEN.md) |
| **4 · Bewirtschaftungs-Check** | [`BEWIRTSCHAFTUNGS_CHECK.md`](BEWIRTSCHAFTUNGS_CHECK.md) |

## Das Ergebnis

| Mietverhältnis | Zeitraum | Anteil Betriebskosten | Vorauszahlungen | Ergebnis |
|---|---|---:|---:|---:|
| WE 1 · Yildirim | ganzjährig | 2.206,78 € | 1.560,00 € | Nachzahlung 646,78 € |
| WE 2 · Bendel | ganzjährig | 1.726,28 € | 1.440,00 € | Nachzahlung 286,28 € |
| WE 3 · Nowak | 01.01.–31.07. (212 Tage) | 1.736,56 € | 1.260,00 € | Nachzahlung 476,56 € |
| WE 3 · Kestner | 01.08.–31.12. (153 Tage) | 1.253,27 € | 1.000,00 € | Nachzahlung 253,27 € |
| WE 4 · Ohlwein | ganzjährig | 1.975,43 € | 1.650,00 € | Nachzahlung 325,43 € |
| | | **8.898,32 €** | | |

Belege 2025 zusammen **12.956,72 €**. Davon werden **8.898,32 €** umgelegt, **4.058,40 €** trägt
die Eigentümerin (Verwaltung, neuer Vorgarten, Reparatur der Steigleitung, Rechtsschutz,
Kleinreparaturen des Hauswarts, Kabel-TV). Die fünf Anteile ergeben zusammen auf den Cent genau
die umgelegten Kosten.

**Vier Schreiben sind versandfertig, eines ist bewusst gesperrt:** Für Frau Nowak liegt keine neue
Anschrift vor. Ihr Schreiben trägt deshalb sichtbar den Vermerk *ENTWURF*.

## Was in den Unterlagen nicht zusammenpasst

Die wichtigsten Befunde – alle mit Beleg und Behandlung in der Lösung unter *Prüfungen*:

- **Staffelmiete Bendel nie umgesetzt.** Allein 2025 fehlen 720 €, ab 2026 laufend 960 € im Jahr.
  Laut Vertrag hätte die Miete schon ab 09/2023 steigen müssen.
- **Oktobermiete Ohlwein fehlt** und ist offenbar niemandem aufgefallen. Nachzufordern sind 610 €,
  nicht 760 € – die 150 € Vorauszahlung sind schon in ihrer Nebenkostenabrechnung ausgeglichen.
- **Wohnfläche WE 3:** Der alte Vertrag nennt „ca. 81 m²“, das Aufmaß 84 m². Angesetzt sind 84 m² –
  nur so ergeben die vier Wohnungen die 250 m² des Hauses.
- **Kabel-TV** wird seit Mitte 2024 weiter von der Eigentümerin bezahlt (427 € im Jahr), darf aber
  nicht mehr umgelegt werden.
- **Die Hauswart-Rechnungen** mischen umlagefähige Pauschale und nicht umlagefähige Reparaturen und
  rechnen Arbeiten ab, die zum Rechnungsdatum noch nicht erbracht sein konnten.
- **Die Vorauszahlungen sind zu niedrig:** Alle fünf Mietverhältnisse enden mit einer Nachzahlung.

Was daraus folgt, steht im [Bewirtschaftungs-Check](BEWIRTSCHAFTUNGS_CHECK.md). Was vor dem Versand
geklärt werden muss, steht in den [Rückfragen](ANNAHMEN_UND_RUECKFRAGEN.md).

## Wie die Lösung gebaut ist – und warum so

- **Eine Datei mit allen Eingaben** (`daten/fall_2025.json`): Wohnungen, Verträge, 23 Belege,
  95 Kontobuchungen. Ob ein Posten umgelegt wird, steht dort mit Begründung in normaler Sprache und
  mit Fundstelle im Gesetz und im Mietvertrag. Eine andere fachliche Einschätzung ist damit eine
  geänderte Zeile, keine Programmierung.
- **Eine Stelle, an der gerechnet wird.** Oberfläche und Schreiben zeigen nur an, was dort
  herauskommt. Auf dem Bildschirm kann deshalb nichts anderes stehen als im Brief.
- **66 Prüfungen bei jedem Lauf** – von „ergeben die Positionen den Rechnungsbetrag?“ bis „enthält das
  Schreiben alles, was es rechtlich wirksam macht?“. Ist eine Prüfung nicht bestanden, die den Versand
  verhindern muss, wird das Schreiben als ENTWURF gesperrt.
- **Annahmen sind umschaltbar.** Unter *Einstellungen* lassen sich Zeitanteil, Vorauszahlungen und
  Kostenansatz umstellen. Die Lösung zeigt sofort, was sich dadurch für jeden Mieter ändert.

Bewusst **nicht** gebaut: Login, Datenbank, Server, mehrere Objekte. Für vier Wohnungen und 23
Belege liegt der Wert in der richtigen Zuordnung und der Nachvollziehbarkeit, nicht in Infrastruktur.

## Weiterlesen

- [`TECHNIK.md`](TECHNIK.md) – Bedienung, Aufbau, neue Belege einlesen, Tests
- [`SPEC.md`](SPEC.md) – fachliche Grundlage, Prüfkatalog, Entscheidungen
- [`dist/Pruefprotokoll.md`](dist/Pruefprotokoll.md) – Nachweis aller Prüfungen zum aktuellen Stand
