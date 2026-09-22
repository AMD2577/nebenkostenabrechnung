#!/usr/bin/env python3
"""Schritt 2: Rohtexte -> strukturierte Daten.

a) 12 Kontoauszüge -> 02_extracted/transactions.csv  (jede Buchung: Datum, Gegenpartei, Verwendungszweck, Betrag)
   Dabei wird die Saldenkette (Alter Kontostand + Buchungen = Neuer Kontostand) je Monat geprüft.
b) 23 Rechnungen -> Rechnungsbetrag je Beleg wird aus dem Text gelesen und gegen daten/fall_2025.json geprüft
   Das ist Prüfung I-03 aus SPEC.md § 5 (Belegsumme im Datensatz == Summe im Dokumenttext).
   (die Positionszuordnung ist bewusst manuell/fachlich, die Beträge müssen aber zum Beleg passen).
"""
import csv, json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EXT = ROOT / "02_extracted"
DATA = ROOT / "02_extracted"
FALL = ROOT / "daten" / "fall_2025.json"

def de_amount(s: str) -> float:
    s = s.replace("−", "-").replace("–", "-").replace(".", "").replace(",", ".").replace("€", "").replace(" ", "")
    return round(float(s), 2)

MONTHS = {"Januar":1,"Februar":2,"März":3,"April":4,"Mai":5,"Juni":6,"Juli":7,"August":8,"September":9,"Oktober":10,"November":11,"Dezember":12}
AMT = r"([−-]?\s?[\d.]+,\d{2})\s*€"

def parse_statements():
    rows, problems = [], []
    files = sorted((EXT / "40_Kontoauszuege").glob("*.txt"))
    prev_close = None
    for f in files:
        txt = f.read_text(encoding="utf-8")
        m = re.search(r"Kontoauszug (\w+) (\d{4})", txt)
        month, year = MONTHS[m.group(1)], int(m.group(2))
        opening = de_amount(re.search(r"Alter Kontostand\s+" + AMT, txt).group(1))
        closing = de_amount(re.search(r"Neuer Kontostand\s+" + AMT, txt).group(1))
        if prev_close is not None and abs(prev_close - opening) > 0.005:
            problems.append(f"{f.name}: Alter Kontostand {opening} != Vormonat {prev_close}")
        lines = txt.splitlines()
        total = 0.0
        for i, line in enumerate(lines):
            bm = re.match(r"\s*(\d{2})\.(\d{2})\.\s+(.+?)\s{2,}(Gutschrift|Lastschrift)\s+" + AMT + r"\s*$", line)
            if not bm:
                continue
            day, mon, party, art, amt = bm.groups()
            betrag = de_amount(amt)
            if art == "Lastschrift" and betrag > 0:
                betrag = -betrag
            zweck = lines[i + 1].strip() if i + 1 < len(lines) else ""
            rows.append({"datum": f"{year}-{int(mon):02d}-{int(day):02d}", "gegenpartei": party.strip(),
                         "verwendungszweck": zweck, "art": art, "betrag": f"{betrag:.2f}", "auszug": f.name})
            total += betrag
        if abs(opening + total - closing) > 0.005:
            problems.append(f"{f.name}: Saldenkette stimmt nicht ({opening} + {total:.2f} != {closing})")
        prev_close = closing
    with open(DATA / "transactions.csv", "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=["datum", "gegenpartei", "verwendungszweck", "art", "betrag", "auszug"])
        w.writeheader(); w.writerows(rows)
    return rows, problems

def check_invoices():
    inv = json.load(open(FALL, encoding="utf-8"))["belege"]
    problems = []
    for i in inv:
        f = EXT / "30_Rechnungen" / (i["beleg"][:-4] + ".txt")
        txt = f.read_text(encoding="utf-8")
        m = (re.search(r"Rechnungsbetrag\s+" + AMT, txt) or re.search(r"Gesamtbetrag 2025\s+" + AMT, txt)
             or re.search(r"Gesamtbeitrag 2025\s+" + AMT, txt) or re.search(r"Summe Verbrauchskosten 2025\s+" + AMT, txt)
             or re.search(r"Summe 2025\s+[\d.,]+ €\s+[\d.,]+ €\s+" + AMT, txt))
        if not m:
            problems.append(f"{i['beleg']}: kein Gesamtbetrag im Text gefunden"); continue
        beleg_betrag = de_amount(m.group(1))
        if abs(beleg_betrag - i["rechnungsbetrag"]) > 0.005:
            problems.append(f"{i['beleg']}: Beleg {beleg_betrag} != Falldatei {i['rechnungsbetrag']}")
        pos_sum = round(sum(p["betrag"] for p in i["positionen"]), 2)
        if abs(pos_sum - i["rechnungsbetrag"]) > 0.005:
            problems.append(f"{i['beleg']}: Positionen {pos_sum} != Rechnungsbetrag {i['rechnungsbetrag']}")
    return len(inv), problems

if __name__ == "__main__":
    rows, p1 = parse_statements()
    n, p2 = check_invoices()
    print(f"Kontoauszüge: {len(rows)} Buchungen -> 02_extracted/transactions.csv; Saldenkette {'OK' if not p1 else 'FEHLER'}")
    print(f"Rechnungen (I-03): {n} Belege gegen Text geprüft: {'OK' if not p2 else 'FEHLER'}")
    for p in p1 + p2:
        print("  !", p)
    sys.exit(1 if (p1 or p2) else 0)
