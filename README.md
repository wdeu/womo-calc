# Womo-Calc

**Wohnmobil Rentabilitätsrechner für Raycast**

Berechne die tatsächlichen Kosten deines Wohnmobils pro Nutzungstag – inklusive Restwert, Jahresübersicht und Kategorieauswertung.

---

## Funktionen

### Ausgaben erfassen
Trage alle Kosten rund ums Wohnmobil nach Jahr und Kategorie ein:

| Kategorie | Beispiele |
|---|---|
| Anschaffung | Kaufpreis |
| Zusatzausstattung | Markise, Fahrradträger |
| Wartung | Ölwechsel, Filter |
| TÜV | Hauptuntersuchung |
| Reparatur | Unfallschäden, Defekte |
| Reifen | Sommer-/Winterreifen |
| Stellplatz | Campingplatz, Dauerstellplatz |
| Sprit | Kraftstoffkosten |
| Garage | Winterlager |
| Versicherung | KFZ-Versicherung |
| Restwert | Aktueller Wiederverkaufswert |
| Sonstiges | Alles weitere |

### Nutzungstage
Erfasse pro Jahr, wie viele Tage du das Wohnmobil tatsächlich genutzt hast.

### Rentabilitätsrechnung
- **Brutto-Ausgaben** – Summe aller Kosten ohne Restwert
- **Restwert** – Aktueller oder erwarteter Wiederverkaufswert (wird abgezogen)
- **Netto-Wertverlust** – Tatsächliche Kosten (Brutto − Restwert)
- **Nutzungstage gesamt** – Alle erfassten Tage jahresübergreifend
- **Kosten pro Nutzungstag** – Netto-Wertverlust geteilt durch Nutzungstage

### Jahresübersicht
Zeigt für jedes Jahr die Ausgaben, Nutzungstage und Kosten pro Tag im Vergleich.

### Kategorieauswertung
Sortierte Übersicht aller Kategorien mit Betrag und prozentualem Anteil an den Gesamtkosten.

---

## Datenverwaltung

| Aktion | Beschreibung |
|---|---|
| CSV exportieren | Exportiert alle Ausgaben und Nutzungstage als CSV in die Zwischenablage (kompatibel mit Numbers und Excel) |
| JSON exportieren | Vollständiges Backup aller Daten als JSON in die Zwischenablage |
| JSON importieren | Stellt Daten aus einem JSON-Backup in der Zwischenablage wieder her |
| Alle Daten löschen | Setzt alle Daten auf den Anfangszustand zurück (mit Bestätigung) |

---

## Verwendung

1. Öffne Raycast und suche nach **Womo-Calc**
2. Füge zunächst deine Ausgaben über **Neue Ausgabe hinzufügen** ein
3. Trage die Nutzungstage pro Jahr über **Nutzungstage hinzufügen** ein
4. Der Abschnitt **Rentabilitätsrechnung** zeigt sofort deine Kosten pro Tag

### Tipps
- Den **Restwert** regelmäßig aktualisieren, damit die Kalkulation realistisch bleibt
- Vor dem Löschen aller Daten immer ein **JSON-Backup** erstellen
- Der **CSV-Export** eignet sich gut für eine weitere Auswertung in einer Tabellenkalkulation

---

## Datenspeicherung

Alle Daten werden lokal im Raycast `LocalStorage` gespeichert. Es werden keine Daten an externe Server übertragen.

---

## Autor

**Werner Deuermeier** · Lizenz: MIT
