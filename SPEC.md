# SPEC — Nebenkostenabrechnung 2025, Berrenrather Straße 218

**Status:** umgesetzt · **Stand:** 24.09.2026 · **Autor:** Aaron
**Zweck:** Dieses Dokument legt fest, *was* gebaut wird, *warum* es fachlich so aussehen muss und
*woran* geprüft wird, dass es stimmt. Es ist vor dem Code entstanden und beschreibt jetzt den
gebauten Stand. Wo etwas bewusst nicht umgesetzt ist, steht das an der Stelle dabei.

> Die Vorversion (v1) hatte eine Rundungsdifferenz von 2 Cent. Sie ist gefunden und behoben, siehe
> [§ 9.2](#92-gefundene-abweichung-in-v1).

---

## 1 Ziel und Abgrenzung

### 1.1 Auftrag
Aus 44 Originalunterlagen (Mietverträge, Belege, Kontoauszüge, Stammdaten) die
Betriebskostenabrechnung 2025 je Mietverhältnis erzeugen — nachvollziehbar hergeleitet und in einer
Form, die einem Mieter tatsächlich zugestellt werden könnte.

### 1.2 Definition of Done
Fertig ist die Arbeit, wenn **alle** folgenden Punkte erfüllt sind:

| # | Ergebnis | Prüfbar durch |
|---|---|---|
| D1 | 5 Abrechnungsschreiben (je Mietverhältnis), deutsch, versandfertig | Checks F-01…F-09 grün |
| D2 | Lösung läuft/ist ansehbar beim Empfänger ohne Installation | Öffnen der ausgelieferten Datei auf einem fremden Rechner |
| D3 | Annahmen und Rückfragen, vollständig und begründet | Jede Zeile im Risikoregister hat Status + Verweis |
| D4 | 2–3 Bewirtschaftungs-Empfehlungen, aus den Unterlagen abgeleitet | Jede Empfehlung: Befund → € Wirkung → Handlung |
| D5 | Prüfprotokoll zum Lauf | Alle Checks L0–L5 dokumentiert, keine offenen Blocker |
| D6 | Lösung im Termin änderbar | Eine Annahme umstellen → neue Zahlen + Diff in < 1 Minute |

### 1.3 Nicht-Ziele (laut Aufgabenstellung, bewusst ausgeschlossen)
Benutzerverwaltung/Login · Mandantenfähigkeit/mehrere Objekte · produktionsreifes Deployment,
CI/CD, Monitoring · pixelgenaues Design · vollständige Testabdeckung.

### 1.4 Gesetzte Rahmenbedingungen (nicht zu hinterfragen)
Kalenderjahr 2025 · Gasetagenheizungen, keine Heizkostenabrechnung nach HeizkostenV · Verteilung
ausschließlich nach Wohnfläche · keine Gewerbeeinheit, kein Aufzug, kein Leerstand.

---

## 2 Fachliche Grundlage: Wie die Abrechnung aussehen muss

### 2.1 Formelle Mindestangaben (entscheiden über Wirksamkeit)
Fehlt eine dieser vier Angaben, ist die Abrechnung **formell unwirksam**; läuft dann die Frist
nach § 556 Abs. 3 BGB ab, ist die Nachforderung verloren. Deshalb sind sie als blockierende
Dokument-Checks abgebildet (F-01…F-04).

| Mindestangabe | Umsetzung im Schreiben |
|---|---|
| Zusammenstellung der **Gesamtkosten** je Kostenart | Spalte „Gesamtkosten Haus" |
| **Verteilerschlüssel**, angegeben *und* erläutert | „62,00 m² / 250,00 m² = 24,800 %" + Zeitanteil |
| **Berechnung des Anteils** des Mieters | eine Zeile je Kostenart, Rechenweg im Fuß |
| **Abzug der Vorauszahlungen** | „abzüglich Vorauszahlungen … = Saldo" |

### 2.1a Warum ein Posten umgelegt wird — und warum nicht

Eine Kostenart darf nur umgelegt werden, wenn **beides** zutrifft:

1. sie ist in **§ 2 BetrKV** aufgeführt (gesetzliche Seite), **und**
2. sie ist in **§ 4 des jeweiligen Mietvertrags** vereinbart (vertragliche Seite).

Beide Fundstellen stehen deshalb als Daten an der Kostenart (`betrkv`, `vertrag`) und werden von
Prüfung R-01 erzwungen. Eine Paragrafenangabe allein erklärt aber niemandem etwas: Die Eigentümerin
ist Laiin, und der Mieter soll die Abrechnung verstehen können. Jede Kostenart trägt deshalb
zusätzlich ein Feld `warum` — **ein Satz in normaler Sprache**, der die Einordnung erklärt
(Prüfung R-13, blockierend).

Die Begründung gehört an die **Kostenart**, nicht an die einzelne Position: Der Grund, warum
Verwaltungskosten nicht umlagefähig sind, ist bei allen vier Quartalsrechnungen derselbe. Eine
zusätzliche Begründung an der **Position** kommt nur dort hinzu, wo der Einzelfall etwas
Besonderes hat — etwa bei der Neuanlage des Vorgartens der Verweis auf den Auftrag der
Eigentümerin vom 04.04.2025.

Sichtbar wird das an drei Stellen: im Abrechnungsschreiben (Klartext bei den nicht umgelegten
Kosten, Paragraf je Kostenart in der Kostentabelle), in der Oberfläche unter *Übersicht* und
*Belege* sowie beim Zuordnen eines neu eingelesenen Belegs.

### 2.2 Regeln, die die Zahlen bestimmen
| Regel | Quelle | Konsequenz im System |
|---|---|---|
| Umlage nur, wenn Kostenart **im Mietvertrag vereinbart** *und* in § 2 BetrKV | § 556 Abs. 1 BGB | Check R-01: Vertragskatalog als Daten je Mietverhältnis |
| Verwaltung, Instandhaltung/Instandsetzung sind **keine** Betriebskosten | § 1 Abs. 2 BetrKV; § 7 Abs. 2 Mietvertrag | Check R-10 |
| Kabel-TV aus Sammelverträgen seit 01.07.2024 nicht mehr umlagefähig | § 2 Nr. 15 Buchst. a/b BetrKV: nur bis 30.06.2024 | Gültigkeitsfenster je Kostenart, Check R-02 |
| Maßgeblich ist die **tatsächliche** Wohnfläche, nicht „ca." im Vertrag | BGH VIII ZR 220/17 | Check R-11 + Entscheidung A1 |
| Bei Mieterwechsel: Kosten **zeitanteilig**, je Mieter nur *seine* Vorauszahlungen | § 4 Abs. 5 Mietvertrag | Zeitfaktor; Check A-03 |
| Nur **tatsächlich geleistete** Vorauszahlungen anrechenbar | BGH VIII ZR 57/04 | Check R-07, Ist-Ansatz als Default |
| Leistungs- **oder** Abflussprinzip, aber einheitlich und ohne Doppel-/Nichterfassung | Wahlrecht d. Vermieters | Schalter `kostenansatz`, Check R-09 |
| Abrechnungsfrist 12 Monate nach Periodenende | § 556 Abs. 3 S. 2 BGB | Check R-06 (Ausschlussfrist 31.12.2026) |
| Einwendungsfrist des Mieters 12 Monate, Belegeinsichtsrecht | § 556 Abs. 3 S. 5 BGB | Hinweis im Schreiben, Check F-06 |
| Anpassung der Vorauszahlung nur durch ausdrückliche Erklärung | § 560 Abs. 4 BGB | eigener Absatz, Check F-07 |
| **Wirtschaftlichkeitsgebot** | § 556 Abs. 3 S. 1 BGB | Plausibilitätschecks P-01…P-06 → Bewirtschaftungs-Check |
| Umlage der **Bruttobeträge** (kein Vorsteuerabzug bei Wohnraum) | § 4 Nr. 12a UStG | Beträge brutto, Annahme 9 |

### 2.3 Rechenweg (einzige Formel im System)

```
Anteil(Mietverhältnis, Kostenart)
    = Gesamtkosten(Kostenart)
    × Wohnfläche(Einheit) / Gesamtwohnfläche
    × Tage(Mietverhältnis im Zeitraum) / Tage(Zeitraum)
```

Rundung: **Largest-Remainder je Kostenart** — die Zeilen werden so auf Cent gerundet, dass ihre
Summe exakt den Gesamtkosten entspricht (siehe § 9.2). Reines kaufmännisches Runden je Zeile ist
**nicht** zulässig, weil dabei Cent verschwinden.

---

## 3 Einlesen neuer Belege: vom PDF zum geprüften Datensatz

Umgesetzt in `app/einlesen.js`, gemessen in `test/pruefe_einlesen.js`: Von den 23 Belegen des
Objekts werden 22 vollständig richtig gelesen, einer geht in Quarantäne, **keiner** wird mit falschen
Werten übernommen.

### 3.1 Ablauf
```
PDF oder Text → normalisieren → Felder erkennen (je Lieferant ein Muster)
              → Prüfungen am Beleg ─ alle ok ──→ Vorschlag → Mensch bestätigt Kostenart
                                    │                        und Umlagefähigkeit → Falldatei
                                    └ Fehler ──→ Quarantäne (keine Übernahme möglich)
```

### 3.2 Drei Regeln
- **Anker-Regel:** Jeder übernommene Wert muss wörtlich im Dokument stehen; die Fundstelle wird
  angezeigt. Was sich nicht nachweisen lässt, wird verworfen, nicht geraten.
- **Gegenrechnen:** Positionen == Rechnungsbetrag (I-04), Netto + USt == Brutto (I-09). Sonst
  Quarantäne.
- **Vorschlag, keine Buchung:** Kostenart und Umlagefähigkeit sind eine fachliche Entscheidung.
  Sie werden vorgeschlagen, aber erst nach Bestätigung übernommen und protokolliert. Eine
  Nicht-Umlage verlangt eine Begründung mit Fundstelle (R-03).

### 3.3 Fehler nach Verursacher trennen
| Klasse | Signal | Eigentümer | Handlung |
|---|---|---|---|
| **Lesefehler** | Positionen ≠ Summe, PDF selbst stimmig | wir | Muster verbessern, kein Kundenkontakt |
| **Dokumentmangel** | PDF stimmt in sich nicht, Seite fehlt, falsches Objekt | Lieferant/Mandant | Quarantäne + Rückfrage, nie stillschweigend reparieren |
| **Echte Auffälligkeit** | Dokument korrekt, Sachverhalt auffällig | fachliche Entscheidung | mit Begründung einordnen → Befund |

### 3.4 Bewusst nicht gebaut
- **Eine KI-Stufe für unbekannte Rechnungslayouts.** Die festen Muster decken alle Lieferanten
  dieses Objekts ab; ein Modell wäre nicht reproduzierbar und bräuchte ohnehin die Anker-Regel.
- **Gespeicherte Zwischenstände je Beleg.** Der Vorschlag lebt in der Oberfläche, bis er bestätigt
  ist; danach steht er in der Falldatei. Ob sich ein Original-PDF seit der Erfassung geändert hat,
  prüft `werkzeuge/pruefe_unterlagen.js` über eine Prüfsumme je Dokument.

---

## 4 Datenmodell

Alles steht in **einer** Datei, `daten/fall_2025.json`:

```
objekt, vermieterin    Stammdaten, Absender, Bankverbindung
abrechnung             von, bis, erstellt_am, zahlungsfrist_tage
einstellungen          zeitanteil_methode, vorauszahlungen_ansatz, kostenansatz   ← die drei Stellschrauben
einheiten[]            we, lage, wohnflaeche_qm, quelle, hinweis
mietverhaeltnisse[]    id, we, mieter[], beginn, ende, Miete, Vorauszahlung, Staffeln,
                       vereinbarte Kostenarten   ← § 4 des jeweiligen Vertrags als Daten
kostenarten{}          bezeichnung, betrkv, vertrag, warum, Gültigkeitsfenster
belege[]               id, lieferant, datum, leistungszeitraum, rechnungsbetrag, bank_kennung,
                       positionen[{ bezeichnung, betrag, kostenart, umlagefaehig, begruendung }]
buchungen[], kontoauszuege[]   aus den 12 Monatsauszügen
befunde[]              A1…A13: was in den Unterlagen auffällt und wie es behandelt ist
protokoll[]            wer, wann, was, warum
unterlagen[]           Prüfsumme je Original-PDF
```
Alles Abgeleitete (Ergebnisse, Prüfungen) wird bei jedem Lauf neu berechnet und **nie** gespeichert —
so kann nichts veralten.

---

## 5 Prüfkatalog

Legende: **B** = blockierend (keine Abrechnungen), **W** = Warnung (Abrechnung entsteht, muss in
Annahmen/Rückfragen auftauchen), **I** = Information.

### L0 — Eingangsintegrität (Datensatz ↔ Dokument)
| ID | Prüfung | Sev |
|---|---|---|
| I-01 | Jedes PDF ist erfasst **oder** ausdrücklich als `nicht_relevant` mit Grund markiert | B |
| I-02 | Textextraktion liefert verwertbaren Text (sonst Quarantäne, manuelle Erfassung) | B |
| I-03 | Belegsumme im Datensatz == Summe im Dokumenttext | B |
| I-04 | Σ Positionen == Belegsumme | B |
| I-05 | Kontoauszug: Alter Kontostand + Buchungen == Neuer Kontostand (je Monat) | B |
| I-06 | Saldenkette über alle 12 Auszüge lückenlos, kein Monat fehlt | B |
| I-07 | Dublettenerkennung: (Lieferant, Rechnungsnr) bzw. (Lieferant, Betrag, Datum) doppelt | W |
| I-08 | Beleg nennt *dieses* Objekt (Adresse/Objekt-Nr. im Text) | W |
| I-09 | Netto × (1 + Satz) ≈ Brutto; ausgewiesene USt stimmt | B |
| I-10 | Menge × Einzelpreis == Positionsbetrag | B |
| I-11 | Σ Raten == Jahresbetrag; Σ Monatszeilen == Jahressumme | B |
| I-12 | Datumslogik: Datum ≤ heute, Zeitraum von ≤ bis, Länge plausibel | B |
| I-13 | Anker-Check auf allen Feldern (§ 3.2) | B |
| I-14 | Seitenzahl im Text == Seitenzahl im PDF | W |

### L1 — Arithmetische Invarianten
| ID | Prüfung | Sev |
|---|---|---|
| A-01 | Σ Wohnflächen == Gesamtwohnfläche | B |
| A-02 | Σ Einheitenanteile == Gesamtkosten je Kostenart, **exakt auf Cent** | B |
| A-03 | Je Einheit: Σ Zeitanteile der Mietverhältnisse == 1,0 (keine Lücke, keine Überlappung) | B |
| A-04 | Σ umlagefähig + Σ nicht umlagefähig == Σ aller Belegpositionen | B |
| A-05 | Saldo == Anteil − angesetzte Vorauszahlungen | B |
| A-06 | Angesetzte Vorauszahlungen == Σ identifizierter Zahlungseingänge (Ist-Ansatz) | B |
| A-07 | Golden Test: handgerechnetes Referenz-Mietverhältnis stimmt auf Cent | B |

### L2 — Rechts- und Vertragskonformität
| ID | Prüfung | Sev |
|---|---|---|
| R-01 | Umlage nur, wenn Kostenart im § 4 **dieses** Vertrags *und* in § 2 BetrKV; beide Fundstellen sind je Kostenart benannt | B |
| R-02 | Umlagedatum im Gültigkeitsfenster der Kostenart (fängt Kabel-TV 2025) | B |
| R-03 | Jede Position `umlagefaehig: false` hat Begründung **mit Fundstelle** (§ … / Urteil) | B |
| R-04 | Jede Position `umlagefaehig: true` hat BetrKV-Ziffer; „sonstige" nur mit § 2 Nr. 17 + Vertragsklausel | B |
| R-05 | Abrechnungszeitraum ≤ 12 Monate und deckungsgleich mit Vertragsregelung | B |
| R-06 | Abrechnungsdatum vor Ablauf der Ausschlussfrist (hier 31.12.2026); Warnung ab 10 Monaten | B |
| R-07 | Nur tatsächlich geleistete Vorauszahlungen; Soll-Ansatz nur bewusst geschaltet + in Annahmen | B |
| R-08 | Leistungszeitraum des Belegs schneidet den Abrechnungszeitraum, sonst Abgrenzungsentscheidung nötig | B |
| R-09 | Kostenansatz einheitlich über alle Kostenarten | B |
| R-10 | Verwaltung, Instandhaltung, Rechtsschutz, Neuanlage erscheinen nie im umgelegten Block | B |
| R-11 | Verwendete Wohnfläche == tatsächliche Fläche; Abweichung zum Vertrag als Entscheidung dokumentiert | W |
| R-12 | Jede offene Rückfrage ist in den Übergabedokumenten gelistet — keine verschwindet | B |
| R-13 | Jede verwendete Kostenart ist zusätzlich **in normaler Sprache** begründet | B |

### L3 — Formelle Wirksamkeit je erzeugtem Schreiben
| ID | Prüfung | Sev |
|---|---|---|
| F-01 | Gesamtkosten je Kostenart enthalten | B |
| F-02 | Verteilerschlüssel genannt **und** erläutert (inkl. Zeitanteil bei Wechsel) | B |
| F-03 | Anteilsberechnung je Kostenart sichtbar | B |
| F-04 | Vorauszahlungen abgezogen, Saldo ausgewiesen | B |
| F-05 | Adressat = alle Vertragsparteien, richtiger Zeitraum, richtige Einheit, Datum, Absender | B |
| F-06 | Hinweis auf Einwendungsfrist und Belegeinsicht | W |
| F-07 | Vorauszahlungsanpassung als eigene ausdrückliche Erklärung (§ 560 Abs. 4) | W |
| F-08 | Keine Platzhalter (`[…]`, leere Anschrift) im Schreiben; ausgezogene Mieter haben eine eigene Anschrift | B |
| F-09 | Σ der Anteile aller Schreiben == Σ umlagefähige Kosten | B |

### L4 — Plausibilität / Wirtschaftlichkeit
| ID | Prüfung | Sev |
|---|---|---|
| P-01 | Jeder Beleg hat eine Abbuchung, jede Abbuchung einen Beleg (beide Richtungen) | W |
| P-02 | Mieteingänge je Mietverhältnis vollständig; Staffel/Index tatsächlich umgesetzt | W |
| P-03 | Physikalische Größen dokumentübergreifend konsistent (z. B. Wasser m³ ↔ Schmutzwasser) | W |
| P-04 | €/m²·Monat je Kostenart gegen Betriebskostenspiegel; Ausreißer markieren, **nie** korrigieren | I |
| P-05 | Vorjahresabweichung je Kostenart > Schwelle (Vorjahr hier nicht verfügbar → Rückfrage) | I |
| P-06 | Gleiche Leistung doppelt von verschiedenen Lieferanten berechnet | I |

### L5 — Prozessprüfungen
| ID | Prüfung | Zeitpunkt |
|---|---|---|
| Q-01 | Golden-Value-Regression: gespeicherte Sollwerte, Diff je Mietverhältnis bei jeder Änderung | jeder Lauf |
| Q-02 | Änderungsdiff: nach Umstellen einer Annahme alt vs. neu je Mieter anzeigen, **vor** Neuerzeugung | jede Änderung |
| Q-03 | Vier-Augen-Checkliste: ein Schreiben vollständig als Mieter lesen; eine Zeile per Taschenrechner nachrechnen; jede Rückfrage in der Liste | vor Versand |
| Q-04 | Freigabe: Name + Datum im Protokoll; ohne Freigabe Wasserzeichen „ENTWURF" | vor Versand |
| Q-05 | Audit-Trail: jede Entscheidung (wer, wann, warum) und jeder Prüflauf protokolliert | laufend |

### 5.1 Gating
```
Lauf → L0…L4 → Prüfprotokoll
        ├── Blocker offen  → keine Abrechnungen, nur ENTWURF
        ├── Warnungen offen → Abrechnungen entstehen; jede Warnung muss auf
        │                     einen Eintrag in ANNAHMEN_UND_RUECKFRAGEN.md zeigen
        └── alles grün      → Abrechnungen + gezeichnetes Prüfprotokoll
```

### 5.1a Umsetzungsstand des Katalogs

Von den 54 aufgeführten Prüfungen laufen **48** automatisch (34 verschiedene Prüfungen, die je Mietverhältnis bzw. je Beleg mehrfach ausgeführt werden — 66 Einzelprüfungen pro Lauf). Die übrigen zehn sind bewusst
nicht als Programmprüfung umgesetzt — hier steht, warum:

| ID | Warum keine Programmprüfung |
|---|---|
| I-10 | Menge × Einzelpreis lässt sich nur dort nachrechnen, wo beide Angaben sauber in eigenen Spalten stehen. Bei den Belegen dieses Objekts ist das uneinheitlich; I-04 (Positionen == Rechnungsbetrag) fängt denselben Fehler zuverlässiger ab. |
| I-14 | Seitenzahl im Text gegen Seitenzahl im PDF — nur beim Einlesen per PDF überhaupt möglich und dort ohne eigenen Nutzen: Eine fehlende Seite fällt bereits durch I-04 auf, weil dann Positionen fehlen. |
| P-03 | Physikalische Größen dokumentübergreifend (320 m³ Wasser in zwei unabhängigen Belegen) wurden **von Hand** geprüft und als Befund A9 dokumentiert. Eine allgemeine Regel dafür müsste wissen, welche Größe in welchem Beleg wofür steht — das ist mehr Modellierung, als der Nutzen rechtfertigt. |
| P-04 | Vergleich gegen den Betriebskostenspiegel braucht eine externe, jährlich wechselnde Datenquelle. Die Einordnung (35,59 €/m²·a) steht stattdessen im Bewirtschaftungs-Check. |
| P-05 | Vorjahresvergleich — für 2025 liegen keine Vorjahresdaten vor. Die Prüfung bleibt im Katalog, weil sie ab dem zweiten Abrechnungsjahr sinnvoll ist. |
| P-06 | Dieselbe Leistung von zwei Lieferanten (Laubbeseitigung bei Hauswart und Gartenpflege) ist eine Ähnlichkeitsfrage ohne klare Schwelle. Automatisch erzeugte Fehlalarme wären schädlicher als der Nutzen; der Fall steht als Hinweis im Bewirtschaftungs-Check. |
| Q-03 | Vier-Augen-Durchsicht — ausdrücklich eine menschliche Aufgabe. Der Ablauf steht in `werkzeuge/pruefe_unterlagen.js` und im README; die Maschine kann sie nicht ersetzen. |
| Q-04 | Die Sperre ist umgesetzt (Schreiben mit offenem Blocker tragen sichtbar ENTWURF). Die **namentliche Freigabe** ist ein Formularfeld im Prüfprotokoll und bleibt bewusst manuell — eine Unterschrift, die ein Programm setzt, ist keine. |
| Q-05 | Das Protokoll wird geführt (`protokoll` in der Falldatei, Einträge aus Oberfläche und Werkzeugen). Nicht umgesetzt ist eine Prüfung, die die Vollständigkeit des Protokolls erzwingt. |
| I-02 | Umgesetzt beim Einlesen (Text zu kurz oder ohne Buchstaben → Quarantäne). Für die bereits erfassten Belege nicht rückwirkend nötig. |

Wo eine Prüfung außerhalb des Rechenkerns läuft, ist das im Code vermerkt:
**I-03** in `scripts/02_parse.py` (Belegsummen gegen den PDF-Text),
**I-05** innerhalb von I-06 (Saldenkette je Monat),
**A-07 und Q-01** als Golden Test in `test/pruefe.js`,
**Q-02** als Vorher/Nachher-Anzeige in der Oberfläche.

### 5.2 Was die Maschine *nicht* leisten kann
Automatisch prüfbar sind Arithmetik, Vollständigkeit, Fristen, Konsistenz und das Vorhandensein
einer begründeten Entscheidung. **Nicht** automatisch prüfbar ist, ob eine Entscheidung fachlich
richtig ist (z. B. „ist diese Leistung Instandhaltung?"). Dafür erzwingt das System eine benannte,
begründete, protokollierte Freigabe durch einen Menschen. Die Gültigkeitsfenster der Kostenarten
(z. B. TKG-Stichtag) brauchen einen Eigentümer und ein Review-Datum, sonst veraltet die
Rechtsschicht unbemerkt. Das Werkzeug unterstützt die rechtliche Prüfung, es ersetzt sie nicht.

---

## 6 Entscheidungstabelle Umlagefähigkeit

Belegsumme 2025: **12.956,72 €** → umlagefähig **8.898,32 €** · nicht umlagefähig **4.058,40 €**

| Kostenart | Vertrag § 4 | BetrKV | Betrag | Umlage | Begründung |
|---|---|---|---|---:|---|
| Grundsteuer | ja | § 2 Nr. 1 | 1.096,00 | ja | laufende öffentliche Last |
| Wasserversorgung | ja | § 2 Nr. 2 | 892,40 | ja | brutto, 7 % USt |
| Entwässerung (Schmutz + Niederschlag) | ja | § 2 Nr. 3 | 1.160,40 | ja | |
| Straßenreinigung | ja | § 2 Nr. 8 | 214,40 | ja | |
| Müllbeseitigung | ja | § 2 Nr. 8 | 764,00 | ja | |
| Gebäudereinigung | ja | § 2 Nr. 9 | 756,00 | ja | 4 Quartalsrechnungen |
| Gartenpflege | ja | § 2 Nr. 10 | 735,00 | ja | 3 Pflegeeinsätze |
| Allgemeinstrom | ja | § 2 Nr. 11 | 384,20 | ja | |
| Schornsteinfeger | ja | § 2 Nr. 12 | 218,40 | ja | § 5 Abs. 2 Vertrag: Umlage nach § 4 |
| Sach-/Haftpflichtversicherung | ja | § 2 Nr. 13 | 1.148,52 | ja | Gebäude 986,40 + Haftpflicht 162,12 |
| Hauswart | ja | § 2 Nr. 14 | 1.440,00 | ja | nur Pauschale 4 × 360,00 |
| Wartung Rauchwarnmelder | ja (Abs. 2) | § 2 Nr. 17 | 89,00 | ja | ausdrücklich als sonstige BK vereinbart |
| **Kleinreparaturen (im Hauswartbeleg)** | – | § 2 Nr. 14 schließt Instandhaltung aus | 300,00 | **nein** | Positionssplit je Quartalsrechnung |
| **Verwaltervergütung** | – | § 1 Abs. 2 Nr. 1 | 1.176,00 | **nein** | Verwaltungskosten |
| **Neuanlage Vorgarten** | – | keine laufende Pflege | 1.480,00 | **nein** | einmalige Herstellung, Konto 6600 |
| **Instandsetzung Steigleitung** | – | § 1 Abs. 2 Nr. 2 | 486,20 | **nein** | Reparatur defektes Ventil |
| **Rechtsschutzversicherung** | – | nicht in § 2 BetrKV | 189,00 | **nein** | dient allein dem Vermieterinteresse |
| **Kabel-TV (Sammelinkasso)** | nein | § 2 Nr. 15 BetrKV a.F., entfallen zum 30.06.2024 | 427,20 | **nein** | Nebenkostenprivileg entfallen **und** nicht vereinbart |

---

## 7 Befunde aus den Unterlagen

Die Befunde stehen mit Behandlung und Auswirkung in der Falldatei (`befunde`) und in der Oberfläche
unter *Prüfungen*. Jede offene Rückfrage steht in `ANNAHMEN_UND_RUECKFRAGEN.md` (Check R-12).

| ID | Befund | Behandlung | Status |
|---|---|---|---|
| A1 | WE 3: „ca. 81 m²" (Vertrag 2016) vs. 84,00 m² (Aufmaß 2018) | 84,00 m² angesetzt; nur so ergibt sich die Gesamtfläche 250,00 m² | behandelt |
| A2 | WE 4 Ohlwein: Miete Oktober 2025 fehlt (760,00 €) | nur 11 × 150 € Vorauszahlung angerechnet; 610 € Kaltmiete gesondert anmahnen | behandelt + Rückfrage |
| A3 | WE 2 Bendel: Staffelmiete laut Vertrag ab 09/2023 nicht umgesetzt (720 € in 2025 belegt, bis zu 500 € in 2023/24 zu prüfen) | ohne Einfluss auf die Abrechnung; Bewirtschaftungs-Check | Rückfrage |
| A4 | RheinEnergie-Jahresrechnung vom 22.01.2026: 1.276,60 € Kosten vs. 1.200,00 € Abschläge 2025 | Leistungsprinzip; umschaltbar | behandelt |
| A5 | Hauswartrechnungen enthalten Kleinreparaturen (300,00 €) | Positionen aufgeteilt | behandelt |
| A6 | Vodafone Kabel-TV 427,20 € | nicht umgelegt | behandelt |
| A7 | Verwaltung, Neuanlage Vorgarten, Steigleitung, Rechtsschutz | nicht umgelegt | behandelt |
| A8 | Hauswart Q1 rechnet „Kontrolle Heizungsraum" ab — das Haus hat keinen | Pauschale angesetzt, Leistungsbeschreibung klären | Rückfrage |
| A9 | Wasser 320 m³ in zwei unabhängigen Belegen gleich; Saldenkette lückenlos; alle Belege bezahlt | geprüft, ohne Befund | behandelt |
| A10 | Anschrift Nowak nach Auszug unbekannt | Schreiben gesperrt; Frist 31.12.2026 | Rückfrage |
| A11 | Hauswart rechnet Reparaturen am ersten Tag des Quartals ab | Reparaturen ohnehin nicht umgelegt; Nachweise anfordern | Rückfrage |
| A12 | Neuvertrag Kestner +27 % — Mietpreisbremse? | kein Einfluss auf die Abrechnung | Rückfrage |
| A13 | Rechenfehler von 2 Cent in der Verwalterrechnung; eine verspätete Miete | kein Einfluss | behandelt |

---

## 8 Annahmen, die getroffen werden müssen

| # | Annahme | Alternative | Schalter |
|---|---|---|---|
| 1 | Wohnfläche WE 3 = 84,00 m² | 81 m² laut Altvertrag | `einheiten.wohnflaeche_qm` |
| 2 | Leistungsprinzip | Abflussprinzip (−76,60 € umlagefähig) | `kostenansatz` |
| 3 | Zeitanteil taggenau (212/153 Tage) | volle Monate (7/12, 5/12) | `zeitanteil_methode` |
| 4 | Vorauszahlungen nach Ist | nach Soll (Ohlwein −150 € Nachzahlung) | `vorauszahlungen_ansatz` |
| 5 | Verteilung aller Kostenarten nach Fläche | vorgegeben durch Aufgabenstellung | `positionen[].schluessel` |
| 6 | Bruttobeträge | – | – |
| 7 | Abrechnungsdatum 16.02.2026, Zahlungsfrist 30 Tage | – | `einstellungen` |

---

## 9 Abnahmekriterien

### 9.1 Sollwerte (Golden Test)
Referenz ist **WE 1 Yildirim**, Flächenanteil 24,800 % (62,00 / 250,00 m²), ganzjährig.
Verteilung nach der Regel aus § 2.3 (Largest-Remainder), von Hand nachvollzogen:

```
Kostenart          Gesamtkosten          Anteil WE 1
Grundsteuer            1.096,00               271,81
Wasser                   892,40               221,31   (*)
Entwässerung           1.160,40               287,78
Straßenreinigung         214,40                53,17
Müll                     764,00               189,47
Gebäudereinigung         756,00               187,49
Gartenpflege             735,00               182,28
Allgemeinstrom           384,20                95,28
Schornsteinfeger         218,40                54,16
Versicherung           1.148,52               284,84   (*)
Hauswart               1.440,00               357,12
Rauchwarnmelder           89,00                22,07
                                            ---------
Summe                                        2.206,78
abzgl. Vorauszahlungen 12 × 130,00           1.560,00
Nachzahlung                                    646,78
```

**(*) Diese beiden Zeilen zeigen, warum die Rundungsregel wichtig ist:**
- *Wasser:* 892,40 × 24,8 % = 221,3152. Kaufmännisch gerundet wären das 221,32 €.
  Die Kostenart hat aber nur 2 Restcent zu vergeben, und WE 3 (Nachkommateil 0,64)
  sowie WE 2 (0,56) liegen vor WE 1 (0,52). WE 1 erhält daher **221,31 €**.
- *Versicherung:* 1.148,52 × 24,8 % = 284,83296. Kaufmännisch wären das 284,83 €.
  Der eine Restcent der Kostenart geht an WE 1, weil 0,296 der größte Nachkommateil
  ist. WE 1 erhält daher **284,84 €**.

Beide Abweichungen heben sich in der Summe auf — der Endbetrag für WE 1 bleibt
2.206,78 €. Bei den übrigen Mietverhältnissen verschiebt die Regel den Saldo um je
einen Cent gegenüber v1 (Bendel 286,28 statt 286,27 · Kestner 253,27 statt 253,28 ·
Ohlwein 325,43 statt 325,42). Dafür stimmen jetzt alle Summen exakt.

Sollwerte aller fünf Mietverhältnisse und die Zeilen der Referenz liegen maschinenlesbar
in `test/sollwerte.json`; geprüft werden sie mit `node test/pruefe.js`.

Weicht die Implementierung hiervon ab, ist **entweder** der Code **oder** diese Tabelle
falsch — beides muss aufgeklärt werden, bevor weitergebaut wird.

### 9.2 Gefundene Abweichung in v1
Die Prüfung von A-02/A-03/F-09 gegen den bestehenden Stand zeigt eine Rundungsdifferenz:

| Invariante | Soll | Ist (v1) | Δ |
|---|---:|---:|---:|
| Σ Einheitenanteile == Σ umlagefähig | 8.898,32 | 8.898,30 | **−0,02** |
| Σ Anteile der 5 Mietverhältnisse == Σ umlagefähig | 8.898,32 | 8.898,31 | **−0,01** |
| Nowak + Kestner == Jahresanteil WE 3 | 2.989,83 | 2.989,84 | **+0,01** |

Ursache: kaufmännisches Runden je Zeile ohne Restverteilung. **Konsequenz:** Largest-Remainder
je Kostenart wird verbindlich (§ 2.3). Dies ist der Beleg dafür, dass die Invarianten-Checks nötig
sind — der Fehler war ohne sie unsichtbar.

**Status: behoben.** Der Rechenkern (`rechenkern/nebenkosten.js`) verteilt in zwei Stufen
centgenau (Kostenart → Einheit → Mietverhältnis). Alle drei Invarianten stimmen jetzt exakt;
`node test/pruefe.js` prüft sie bei jedem Lauf. Die korrigierten Sollwerte stehen in § 9.1.

### 9.3 Weitere Abnahmekriterien
- Alle Checks L0–L4 laufen; kein Blocker offen; jede Warnung zeigt auf einen Eintrag in Annahmen/Rückfragen.
- Jeder der drei Schalter aus § 8 lässt sich umstellen; das Ergebnis ändert sich in der erwarteten
  Richtung und der Diff wird angezeigt (Q-02).
- Ein Schreiben wird vollständig als Mieter gelesen (Q-03): verständlich, keine Fachabkürzung ohne Erklärung.
- Die ausgelieferte Datei öffnet auf einem fremden Rechner ohne Installation (D2).

---

## 10 Architekturentscheidungen (ADR, Kurzform)

**ADR-1 — Keine Datenbank, kein Framework.** 4 Einheiten, 23 Belege, ein Verteilerschlüssel. Der
Wert liegt in der Belegzuordnung und der Nachvollziehbarkeit, nicht in Infrastruktur. JSON-Dateien
sind lesbar, diffbar, versionierbar und in Sekunden änderbar. *Verworfen:* SQLite (kein Mehrwert
bei dieser Größe), Django/Rails (Nicht-Ziel laut Aufgabenstellung).

**ADR-2 — Fachliche Entscheidung ist Daten, nicht Code.** Ob eine Position umlagefähig ist, steht
mit Begründung im Datensatz. Der Rechenkern kennt keine Sonderfälle. Eine andere Einschätzung ist
ein Flag, kein Programmiervorgang — das ist die Voraussetzung für die Live-Änderung im Termin.

**ADR-3 — Auslieferung als eigenständige Datei, Rechenkern im Browser.** Der Empfänger soll nichts
installieren müssen (D2). Rechenkern als ein Modul, das sowohl die Seite als auch ein CLI
(Tests, Stapelverarbeitung) nutzt — eine Logik, keine Divergenz. *Verworfen:* Python-Pipeline als
Auslieferung (setzt Python, poppler, Chrome beim Empfänger voraus).

**ADR-4 — Belege mit festen Mustern lesen, nicht mit einem Modell.** Feste Muster je Lieferant
decken alle 23 Belege ab und liefern bei jedem Lauf dasselbe Ergebnis. Eine KI-Stufe wäre erst für
neue, unbekannte Layouts sinnvoll und müsste dann ebenfalls die Anker-Regel erfüllen.
*Verworfen:* durchgehende LLM-Extraktion (nicht reproduzierbar, teurer, ohne Anker nicht prüfbar).

**ADR-5 — Fail-closed statt Best-Effort.** Lieber keine Abrechnung als eine falsche: ein
unwirksames Schreiben kostet die Nachforderung, ein verzögertes nicht.

---

## 11 Vorgehen

| Phase | Inhalt | Ergebnis |
|---|---|---|
| 0 Discovery | Unterlagen sichten, Entscheidungstabelle und Risikoregister füllen | dieses SPEC |
| 1 Design | Datenmodell, Formel, Prüfkatalog, Golden Test von Hand | § 4, 5, 9.1 |
| 2 Rechenkern | Umlage, Zeitanteile, Largest-Remainder, Invarianten | `rechenkern/` + L0/L1 |
| 3 Ausgabe | 5 Schreiben, Oberfläche, Dokument-Checks F-01…F-09 | D1, D2 |
| 4 Einlesen | Normalisierung, Anker-Regel, Quarantäne, Zuordnen-und-Bestätigen | `app/einlesen.js` |
| 5 Prüfen | L2–L5, Schalter durchspielen, Vier-Augen-Liste | D5 |
| 6 Übergabe | Annahmen/Rückfragen, Bewirtschaftungs-Check, README, Demo-Skript | D3, D4, D6 |

Priorität bei Zeitnot: **A-01…A-07 und F-01…F-04 zuerst** (verhindern falsche Zahlen und
unwirksame Schreiben), dann R-01/R-02/R-03, dann der Rest.

---

## 12 Stand der Umsetzung

| Ergebnis | Stand |
|---|---|
| D1 · 5 Abrechnungsschreiben | 4 versandfertig, 1 gesperrt (Anschrift Nowak fehlt, Prüfung F-08) |
| D2 · Lösung lauffähig beim Empfänger | `dist/Nebenkostenabrechnung_2025.zip` — entpacken, HTML öffnen, ohne Installation |
| D3 · Annahmen und Rückfragen | `ANNAHMEN_UND_RUECKFRAGEN.md`, 14 Annahmen und 11 Rückfragen |
| D4 · Bewirtschaftungs-Check | `BEWIRTSCHAFTUNGS_CHECK.md`, 3 Empfehlungen mit € Wirkung |
| D5 · Prüfprotokoll | `dist/Pruefprotokoll.md`, bei jedem Bauen neu erzeugt |
| D6 · im Termin änderbar | 3 Stellschrauben mit Vorher/Nachher-Vergleich, plus Beleg-Einlesen |

Automatisch geprüft: **60 Tests** (`node test/alles.js`) und
**66 fachliche Prüfungen** bei jedem Lauf.

### Offene Punkte

1. Freigabe der Annahmen aus § 8 durch die Mandantin (insb. Ist- vs. Soll-Vorauszahlungen).
2. Zustelladresse Nowak (Befund A10, Rückfrage 1) — blockiert D1 für dieses eine Schreiben.
3. Vier-Augen-Durchsicht (Q-03) und Freigabe (Q-04) durch einen Menschen — nicht maschinell ersetzbar.
4. Vorjahresdaten für P-05 (Abweichungsanalyse) liegen nicht vor.
5. Eigentümer und Review-Datum für die Gültigkeitsfenster der Kostenarten (§ 5.2).
6. Nicht umgesetzt: Kontoauszüge einlesen (die Buchungen stammen aus der Erstbefüllung) sowie
   weitere Verteilerschlüssel — beides ist im Datenmodell vorgesehen, aber für dieses Objekt
   nicht erforderlich.
