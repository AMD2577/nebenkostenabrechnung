# Nebenkostenabrechnung 2025 · Berrenrather Straße 218, Köln-Sülz

Eine leichtgewichtige Lösung, die aus den Originalunterlagen die Betriebskostenabrechnung 2025
je Mietverhältnis erzeugt — nachvollziehbar hergeleitet, geprüft und in einer Form, die man einem
Mieter tatsächlich schicken kann.

| Was | Wo |
|---|---|
| **Zum Verschicken** | [`dist/Nebenkostenabrechnung_2025.zip`](dist/Nebenkostenabrechnung_2025.zip) (1,1 MB) — entpacken, HTML öffnen, fertig. Keine Installation, kein Server, kein Internet. |
| Die Lösung allein | [`dist/Nebenkostenabrechnung_2025.html`](dist/Nebenkostenabrechnung_2025.html) |
| Die 5 Abrechnungsschreiben als PDF | [`dist/`](dist/) — je eine Datei, versandfertig |
| Nachweis, dass die Zahlen stimmen | [`dist/Pruefprotokoll.md`](dist/Pruefprotokoll.md) |
| Was ich angenommen und was ich gefragt hätte | [`ANNAHMEN_UND_RUECKFRAGEN.md`](ANNAHMEN_UND_RUECKFRAGEN.md) |
| Empfehlungen an die Eigentümerin | [`BEWIRTSCHAFTUNGS_CHECK.md`](BEWIRTSCHAFTUNGS_CHECK.md) |
| Warum die Lösung so aussieht | [`SPEC.md`](SPEC.md) — fachliche Grundlage, Prüfkatalog, Entscheidungen |

**Zum Nachvollziehen mit der Kommandozeile** (nur Node.js nötig, keine Abhängigkeiten,
kein `npm install`):

```bash
git clone https://github.com/AMD2577/nebenkostenabrechnung
cd nebenkostenabrechnung
node test/alles.js                      # 51 Tests: Rechnen, Einlesen, Dokumentenstand
node werkzeuge/pruefe_unterlagen.js     # stimmen die Daten noch zu den 43 Original-PDFs?
node werkzeuge/baue.js                  # Oberfläche, Prüfprotokoll und Zip neu erzeugen
node werkzeuge/drucke.js                # die fünf Abrechnungen als PDF (braucht Chrome)
```

---

## 1 Das Ergebnis

| Mietverhältnis | Zeitraum | Anteil Betriebskosten | Vorauszahlungen | Ergebnis |
|---|---|---:|---:|---:|
| WE 1 · Yildirim | ganzjährig | 2.206,78 € | 1.560,00 € | Nachzahlung 646,78 € |
| WE 2 · Bendel | ganzjährig | 1.726,28 € | 1.440,00 € | Nachzahlung 286,28 € |
| WE 3 · Nowak | 01.01.–31.07. (212 Tage) | 1.736,56 € | 1.260,00 € | Nachzahlung 476,56 € |
| WE 3 · Kestner | 01.08.–31.12. (153 Tage) | 1.253,27 € | 1.000,00 € | Nachzahlung 253,27 € |
| WE 4 · Ohlwein | ganzjährig | 1.975,43 € | 1.650,00 € | Nachzahlung 325,43 € |
| | | **8.898,32 €** | | |

Belegsumme 12.956,72 € → umlagefähig **8.898,32 €** (35,59 €/m² und Jahr) → nicht umlagefähig
4.058,40 € (Verwaltung, Neuanlage Vorgarten, Steigleitungsreparatur, Rechtsschutz, Kleinreparaturen
des Hauswarts, Kabel-TV).

Die Summe der fünf Mieteranteile ergibt **exakt** die umlagefähigen Gesamtkosten — kein Cent geht
verloren oder entsteht. Das ist keine Selbstverständlichkeit, siehe Abschnitt 5.

**Ein Schreiben ist bewusst gesperrt:** Für Frau Nowak liegt keine neue Anschrift vor. Ihr Schreiben
trägt sichtbar den Vermerk *ENTWURF – noch nicht versandfertig*, damit es nicht versehentlich
verschickt wird. Sobald die Anschrift in der Falldatei steht, verschwindet der Vermerk von selbst.

---

## 2 Die Oberfläche bedienen

`dist/Nebenkostenabrechnung_2025.html` öffnen. Fünf Reiter:

- **Übersicht** — alle Zahlen auf einen Blick, je Kostenart aufklappbar bis zur einzelnen
  Belegposition. Eine Zeile in der Ergebnistabelle anklicken springt zur Herleitung.
- **Abrechnungen** — je Mietverhältnis: die vollständige Herleitung, die Prüfung des Schreibens
  und darunter das Schreiben so, wie es beim Mieter ankommt. Drucken einzeln oder alle fünf.
- **Prüfungen** — das vollständige Prüfprotokoll: 66 Prüfungen an Daten, Rechnung und den fünf
  Schreiben, dazu die fachlichen Befunde aus den Unterlagen.
- **Belege & Konto** — alle 23 Belege mit Positionen und Umlagefähigkeit, dazu die Monatssalden
  des Objektkontos.
- **Beleg erfassen** — eine neue Rechnung als PDF hineinziehen (siehe Abschnitt 4).
- **Einstellungen** — die drei Stellschrauben (siehe unten) und die Falldatei zum Laden/Speichern.

### Änderungen behalten

Alle Eingaben stehen in **einer** Datei: `daten/fall_2025.json`. Was du in der Oberfläche änderst
— eine Stellschraube umstellen, einen Beleg erfassen — gilt zunächst nur in diesem Browserfenster.

Sobald es solche Änderungen gibt, erscheint oben eine Leiste **„Nicht gespeicherte Änderungen"**
mit dem Knopf *Falldatei speichern*. Der lädt die aktualisierte Falldatei herunter. Um sie
dauerhaft zu übernehmen: die heruntergeladene Datei im Projekt unter `daten/` ablegen und
`node werkzeuge/baue.js` ausführen.

Wer das Fenster mit ungespeicherten Änderungen schließen will, wird vom Browser gefragt.

*Warum nicht automatisch im Browser speichern?* Weil dann zwei Wahrheiten entstünden — eine in der
Datei, eine im Browser — die unbemerkt auseinanderlaufen. Die Datei ist die Quelle; alles andere
wird daraus erzeugt.

### Etwas ändern

Im Reiter *Einstellungen* eine der drei Stellschrauben umstellen. Die Abrechnung wird sofort neu
gerechnet, und **oben erscheint, was sich dadurch je Mieter ändert** — vorher/nachher/Differenz.
So sieht man die Wirkung, bevor irgendetwas gedruckt wird.

| Stellschraube | Bedeutung | Wirkung im Fall |
|---|---|---|
| Zeitanteil | taggenau oder volle Monate | verschiebt ca. 8 € zwischen Nowak und Kestner |
| Vorauszahlungen | tatsächlich gezahlt oder vertraglich geschuldet | Ohlwein 325,43 € statt 175,43 € |
| Kostenansatz | Leistungs- oder Abflussprinzip | umlagefähige Kosten 76,60 € niedriger |

Größere Änderungen (neue Belege, andere Wohnflächen, neue Mietverhältnisse) laufen über die
Falldatei — siehe Abschnitt 4.

---

## 3 Wie es aufgebaut ist

```
daten/fall_2025.json      ← DIE Datenquelle: Objekt, Einheiten, Mietverhältnisse,
                            Kostenarten, alle 23 Belege mit Positionen, 95 Buchungen,
                            Einstellungen, Befunde, Änderungsprotokoll

rechenkern/nebenkosten.js ← die gesamte Rechen- und Prüflogik (eine Datei, 5 Abschnitte)
app/schreiben.js          ← baut aus einem Mietverhältnis das Abrechnungsschreiben
app/einlesen.js           ← liest Belege aus PDF/Text und prüft sie, bevor sie gebucht werden
app/app.js                ← die Oberfläche: zeigt an, rechnet nicht
app/stil.css              ← Gestaltung für Bildschirm UND Druck
app/index.html            ← Entwicklungsfassung (lädt die Dateien einzeln)
vendor/                   ← PDF.js (fremde Bibliothek, Herkunft in vendor/HERKUNFT.md)

test/alles.js             ← führt alle Tests aus (51 Stück)
test/pruefe.js            ← 31 Tests für Rechnen, Prüfungen, Schreiben, Abrechnungsjahr
test/pruefe_einlesen.js   ← 10 Tests für das Einlesen, gemessen an allen 23 Belegen
test/pruefe_dokumente.js  ← 10 Tests dafür, dass alle Dokumente zum aktuellen Stand gehören
test/sollwerte.json       ← die von Hand nachgerechneten Sollwerte

werkzeuge/baue.js         ← baut die versendbare Datei, das Prüfprotokoll und das Zip
werkzeuge/drucke.js       ← druckt die fünf Abrechnungen als einzelne PDF-Dateien
werkzeuge/pruefe_unterlagen.js ← meldet, wenn sich Dokumente in 01_Unterlagen geändert haben

dist/                     ← das Ergebnis zum Verschicken
01_Unterlagen/            ← die Originale (unverändert)
02_extracted/             ← die PDFs als Text (mit pdftotext erzeugt)
scripts/                  ← Erstbefüllung: 44 PDFs nach Text, Kontoauszüge lesen,
                            Belegsummen gegen den Originaltext prüfen (Python)
```

**Die wichtigste Regel:** Gerechnet wird nur in `rechenkern/nebenkosten.js`. Die Oberfläche und die
Schreiben zeigen an, was dort herauskommt — sie rechnen selbst nichts. Deshalb kann auf dem
Bildschirm nichts anderes stehen als im gedruckten Schreiben.

**Die zweitwichtigste Regel:** Ob eine Belegposition umlagefähig ist, steht mit Begründung in den
*Daten*, nicht im Code. Eine andere fachliche Einschätzung ist ein geändertes Feld, kein
Programmiervorgang.

**Warum ein Posten umgelegt wird — und warum nicht.** Umgelegt wird nur, was in **§ 2 BetrKV**
steht **und** in **§ 4 des Mietvertrags** vereinbart ist. Beide Fundstellen stehen an jeder
Kostenart (`betrkv`, `vertrag`), dazu ein Satz in normaler Sprache (`warum`). Die Prüfungen R-01
und R-13 lassen keine Kostenart ohne beides durch. Im Abrechnungsschreiben steht der Klartext bei
den nicht umgelegten Kosten, in der Oberfläche bei jeder Kostenart und bei jeder Belegposition.

### Der Rechenweg

```
Anteil = Gesamtkosten der Kostenart
       × Wohnfläche der Wohnung / 250,00 m²
       × Nutzungstage des Mietverhältnisses / 365
```

Umgesetzt in zwei Schritten: Kostenart → vier Wohnungen (Gewicht Wohnfläche), dann Wohnung → ihre
Mietverhältnisse (Gewicht Nutzungstage). Beide Schritte verteilen centgenau.

---

## 4 Neue Belege erfassen

### Der einfache Weg: PDF hineinziehen

Reiter *Beleg erfassen* → PDF in das Feld ziehen. Die Lösung liest den Text aus dem PDF und macht
daraus einen **Vorschlag**: Lieferant, Rechnungsnummer, Datum, Zeitraum, Betrag und die einzelnen
Positionen. Zu jedem Wert steht daneben, in welcher Zeile des Dokuments er gefunden wurde.

Drei Regeln sorgen dafür, dass dabei nichts Falsches in die Abrechnung gerät:

1. **Anker-Regel** — jeder übernommene Wert muss wörtlich im Dokument stehen. Was sich nicht im Text
   nachweisen lässt, wird nicht übernommen. Damit kann kein Betrag „erfunden" werden.
2. **Gegenrechnen** — die Positionen müssen den ausgewiesenen Rechnungsbetrag ergeben, Netto plus
   Umsatzsteuer den Bruttobetrag. Stimmt das nicht, geht der Beleg in **Quarantäne** und lässt sich
   nicht übernehmen.
3. **Vorschlag, keine Buchung** — Kostenart und Umlagefähigkeit werden vorgeschlagen, aber nie
   automatisch übernommen. Das ist die fachliche Entscheidung; sie wird bestätigt und protokolliert.
   Eine Nicht-Umlage verlangt eine Begründung mit Fundstelle.

Gemessen an den 23 Belegen dieses Objekts: **22 werden vollständig richtig gelesen**, einer
(die RheinEnergie-Jahresrechnung mit zwei Vertragskonten) landet in Quarantäne und muss von Hand
erfasst werden. Kein einziger Beleg wird mit falschen Werten übernommen — nachgewiesen durch
`node test/pruefe_einlesen.js`.

Zwei Feinheiten, die dabei automatisch richtig gemacht werden:

- **Leistungsdatum vor Rechnungsdatum.** Eine am 21.08. geschriebene Rechnung für eine Reparatur vom
  19.08. gehört in das Jahr der Leistung. Steht im Beleg beides, gilt das Leistungsdatum.
- **Netto wird auf Brutto hochgerechnet.** Weisen die Positionen Nettobeträge aus, wird die
  ausgewiesene Umsatzsteuer centgenau auf sie verteilt — mit derselben Funktion, die auch die Kosten
  auf die Wohnungen verteilt. Umgelegt wird, was tatsächlich gezahlt wurde.

Ohne PDF: im selben Reiter „Text einfügen" aufklappen und den Text der Rechnung hineinkopieren —
derselbe Ablauf, dieselben Prüfungen.

### Der direkte Weg: Falldatei bearbeiten

Alles steht in `daten/fall_2025.json`. Ein Beleg sieht so aus:

```json
{
  "id": "331",
  "beleg": "331_Hausservice-Wilms_Q1.pdf",
  "lieferant": "Hausservice Wilms e.K.",
  "datum": "2025-01-02",
  "leistungszeitraum": "01.01.2025 – 31.03.2025",
  "rechnungsbetrag": 442.00,
  "bank_kennung": "WILMS",
  "positionen": [
    { "bezeichnung": "Hauswartstätigkeit Q1 (3 × 120,00 €)",
      "betrag": 360.00, "kostenart": "hauswart", "umlagefaehig": true },
    { "bezeichnung": "Kleinreparaturen und Instandhaltungsarbeiten",
      "betrag": 68.00, "kostenart": "kleinreparaturen", "umlagefaehig": false }
  ]
}
```

- `positionen` müssen zusammen den `rechnungsbetrag` ergeben — sonst schlägt Prüfung I-04 an.
- `kostenart` muss ein Schlüssel aus dem Abschnitt `kostenarten` sein.
- `umlagefaehig: false` braucht eine `begruendung` mit Fundstelle (§ …) — sonst Prüfung R-03.
- `bank_kennung` ist der Text, unter dem der Lieferant im Kontoauszug auftaucht; darüber prüft
  P-01, ob der Beleg auch bezahlt wurde.

Danach neu bauen:

```bash
node werkzeuge/baue.js
```

Das erzeugt `dist/` neu und meldet auf der Kommandozeile jede Prüfung, die anschlägt.

Alternativ ohne Kommandozeile: In der Oberfläche unter *Einstellungen* die Falldatei herunterladen,
in einem Texteditor ändern, wieder laden. Die Änderung wirkt sofort, geht beim Schließen aber
verloren — für dauerhafte Änderungen die Datei in `daten/` ersetzen und neu bauen.

---

### Einen Beleg austauschen oder eine Zahlung nachtragen

Im Reiter **Belege & Konto**:

- **Beleg entfernen** — Knopf neben dem Betrag. Der Grund wird abgefragt und landet im Protokoll,
  damit später nachvollziehbar bleibt, warum ein Beleg verschwunden ist. Einen Beleg *austauschen*
  heißt: alten entfernen, neuen unter *Beleg erfassen* einlesen.
- **Zahlung nachtragen** — für Zahlungen, die nicht auf dem Objektkonto erscheinen. Beispiel: Die
  Oktobermiete von Frau Ohlwein ging auf ein anderes Konto. Trägt man sie nach, sinkt ihre
  Nachzahlung von 325,43 € auf 175,43 €, und die Warnung P-02 verschwindet.

## 5 Wenn sich die Unterlagen ändern

Die Falldatei ist aus den PDF-Dokumenten in `01_Unterlagen` entstanden. Wird dort etwas
ausgetauscht, ergänzt oder gelöscht, passt sie nicht mehr zu ihrer Grundlage — und das sieht man
ihr nicht an. Deshalb ist zu jedem Dokument eine Prüfsumme gespeichert:

```bash
node werkzeuge/pruefe_unterlagen.js
```

Das Werkzeug vergleicht beide Seiten und sagt, was zu tun ist:

| Befund | Bedeutung | Nächster Schritt |
|---|---|---|
| **GEÄNDERT** | Das PDF wurde ausgetauscht oder bearbeitet | Dokument in der Oberfläche unter *Beleg erfassen* neu einlesen und mit der erfassten Fassung vergleichen |
| **NEU** | Liegt im Ordner, ist aber nicht erfasst | Einlesen und zuordnen |
| **FEHLT** | Erfasst, aber nicht mehr vorhanden | Datei wiederherstellen oder den Beleg aus der Falldatei entfernen — ohne Beleg ist keine Belegeinsicht möglich |

Der vollständige Ablauf nach einer Änderung:

```bash
node werkzeuge/pruefe_unterlagen.js                  # 1. was hat sich geändert?
#    2. betroffene Belege in der Oberfläche prüfen und die Falldatei anpassen
node werkzeuge/baue.js                               # 3. alles neu erzeugen
node test/alles.js                                   # 4. alle Prüfungen
node werkzeuge/pruefe_unterlagen.js --uebernehmen    # 5. Prüfsummen auf den neuen Stand
```

**Was dabei bewusst nicht automatisch geht:** Ein geändertes Dokument wird nicht automatisch neu
verarbeitet. Ob eine Position umlagefähig ist, ist eine fachliche Entscheidung — sie steht in der
Falldatei und lässt sich aus dem PDF nicht zurückrechnen. Das Werkzeug zeigt die Stellen, ein
Mensch entscheidet. Genau deshalb ist Schritt 5 der letzte und nicht der erste: Sonst würde ein
ungeprüfter Stand als geprüft gelten.

Der Abgleich läuft auch als Test mit (`node test/alles.js`), damit die Abweichung nicht erst
auffällt, wenn die Abrechnungen schon verschickt sind.

## 6 Ein anderes Abrechnungsjahr

Die Aufgabe gibt das Kalenderjahr 2025 vor. Fest eingebaut ist diese Jahreszahl trotzdem nirgends:
Gerechnet und geschrieben wird immer gegen den Zeitraum in der Falldatei.

Für ein weiteres Jahr:

1. `daten/fall_2025.json` nach `daten/fall_2026.json` kopieren
2. darin `abrechnung.von`, `abrechnung.bis` und `abrechnung.erstellt_am` setzen
3. die Belege und Buchungen des neuen Jahres erfassen (Oberfläche, *Beleg erfassen*)
4. in `werkzeuge/baue.js` und `werkzeuge/drucke.js` den Dateinamen der Falldatei anpassen

Überschrift, Anschreiben, Verwendungszweck, Dateinamen und die Ausschlussfrist nach § 556 Abs. 3
BGB richten sich dann automatisch nach dem neuen Zeitraum. Getestet ist das für ein Folgejahr, ein
Schaltjahr (366 Tage) und einen vom Kalenderjahr abweichenden Zeitraum, der dann als Datumsspanne
statt als Jahreszahl benannt wird.

Was bewusst **nicht** gebaut ist: eine Verwaltung mehrerer Jahre in der Oberfläche. Ein Jahr ist
eine Datei — das genügt, solange man nicht Jahre miteinander vergleichen will. Die
Vorjahresabweichung (Prüfung P-05) wäre der erste Grund, das zu ändern.

## 7 Woran man erkennt, dass die Zahlen stimmen

```bash
node test/alles.js
```

Das führt drei Testdateien nacheinander aus (einzeln aufrufbar als `test/pruefe.js`,
`test/pruefe_einlesen.js`, `test/pruefe_dokumente.js`).

**31 Tests** für Rechnen, Schreiben und Abrechnungsjahr: die Verteilfunktion (inklusive 1.000 Zufallsfällen), die von
Hand nachgerechneten Sollwerte Zeile für Zeile, die Invarianten, der Prüfkatalog, die Wirkung jeder
Stellschraube und die gesetzlichen Mindestangaben in allen fünf Schreiben.

**10 Tests** für das Einlesen, gemessen an allen 23 Belegen des Objekts, deren richtige Werte bekannt
sind. Die wichtigste Eigenschaft ist dabei nicht die Trefferquote: Ein Verfahren, das 90 % richtig
liest und 10 % falsch übernimmt, wäre unbrauchbar — eines, das 70 % liest und den Rest in Quarantäne
schickt, ist brauchbar. Getestet wird deshalb vor allem, dass **kein als geprüft geltender Beleg
einen falschen Betrag trägt**, inklusive Gegenprobe mit einem untergeschobenen Betrag.

**10 Tests** dafür, dass die Dokumente und die Originalunterlagen zum aktuellen Stand gehören: dass die erzeugten Dateien
(Oberfläche, PDF-Abrechnungen, Prüfprotokoll) die heutigen Beträge tragen, dass kein Dokument mehr
einen Saldo aus einer Vorfassung nennt und dass jede offene Warnung in den Annahmen auftaucht.
Dieser Test existiert, weil genau das schon einmal auseinandergelaufen ist: Nach der
Rundungskorrektur lagen im Ausgabeordner noch PDF-Dateien mit den alten Beträgen.

Dazu laufen bei **jedem** Lauf 66 fachliche Prüfungen mit (Katalog in `SPEC.md` § 5). Sie sind in
drei Stufen eingeteilt:

- **Blocker** — das Schreiben wird sichtbar als ENTWURF gekennzeichnet und darf nicht raus
- **Warnung** — die Abrechnung entsteht, der Punkt muss aber in den Annahmen stehen
- **Information** — reine Beobachtung

Aktuell offen: 1 Blocker (Anschrift Nowak fehlt) und 2 Warnungen (fehlende Oktobermiete Ohlwein,
nicht umgesetzte Staffelmiete Bendel). Alle drei sind echte Befunde aus den Unterlagen, keine
Fehler der Lösung — und sie sind in `ANNAHMEN_UND_RUECKFRAGEN.md` dokumentiert.

### Ein Fehler, den die Prüfungen gefunden haben

Die erste Fassung rundete jede Zeile einzeln kaufmännisch. Dadurch ergaben die Anteile der vier
Wohnungen zusammen **8.898,30 €** statt 8.898,32 € — zwei Cent verschwanden, unsichtbar, weil
jede einzelne Zeile korrekt aussah. Die jetzige Fassung verteilt nach dem
Largest-Remainder-Verfahren: abrunden, und die übrigen Cent an die Anteile mit dem größten
abgeschnittenen Nachkommateil. Die Summe stimmt dadurch immer exakt. Details in `SPEC.md` § 9.2,
die Funktion ist in `rechenkern/nebenkosten.js` ausführlich kommentiert.

---

## 8 Was bewusst nicht gebaut wurde

Kein Login, keine Benutzerverwaltung, keine Mandantenfähigkeit, kein Deployment, keine Datenbank,
kein Framework — alles laut Aufgabenstellung außerhalb des Auftrags. Für vier Wohnungen, 23 Belege
und einen Verteilerschlüssel liegt der Wert in der richtigen Zuordnung der Belege und in der
Nachvollziehbarkeit, nicht in Infrastruktur.

Wo die Lösung tragen müsste: Weitere Verteilerschlüssel (Personen, Einheiten, Verbrauch) wären ein
Feld je Kostenart und eine Zeile im Rechenkern — das Feld `verteilerschluessel` ist bereits in den
Daten vorgesehen. Ein zweites Objekt wäre eine zweite Falldatei.

Die Erstbefüllung der Falldatei lief über die Python-Skripte in `scripts/` (alle 44 PDFs nach Text,
Kontoauszüge parsen, Belegsummen gegen den PDF-Text prüfen). Für den laufenden Betrieb braucht man
sie nicht mehr: Neue Belege werden in der Oberfläche eingelesen. `scripts/02_parse.py` bleibt als
Stapelprüfung nützlich — es kontrolliert alle 23 Belegsummen gegen den Originaltext und meldet jede
Abweichung.

Nicht gebaut, aber naheliegend: Kontoauszüge ebenso einlesen wie Belege (heute kommen die Buchungen
aus der Erstextraktion). Dafür wäre eine Bank-CSV der robustere Weg als ein PDF.
