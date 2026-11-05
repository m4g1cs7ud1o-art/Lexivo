# Vokabular

Statische Vokabelsammlung für GitHub Pages. Gruppencodes dienen zum Finden der passenden Klasse; die Dateien im Repository sind öffentlich und nicht durch den Code geschützt.

## Listen pflegen

Jede Klasse oder Jahrgangsgruppe bekommt einen Ordner unter `datas/`, zum Beispiel `datas/12Eng/` oder `datas/09Lat/`. Jeder Vokabelsatz liegt in einem eigenen Unterordner. Der Ordnername ist gleichzeitig der Name der Vokabeldatei ohne `.json`.

Ein Gruppencode besteht aus sechs Ziffern. Die ersten beiden Ziffern entsprechen dem Jahrgang, zum Beispiel `09` für `09Lat` oder `12` für `12Eng`. Bestehende Codes bleiben erhalten; für neue Klassen wird automatisch ein eindeutiger Code erzeugt. Der Code ist nur eine Auswahlhilfe, keine Zugangssperre.

Eine Vokabeldatei verwendet dieses Format:

```json
{
  "languageX": "Englisch",
  "languageY": "Deutsch",
  "entries": [
    { "x": "the classroom", "y": "das Klassenzimmer" }
  ]
}
```

`languageX` bestimmt die Sprache, unter der die Liste auf der Website gruppiert wird. So können innerhalb eines Jahrgangs zum Beispiel Englisch-, Französisch-, Spanisch- oder Lateinlisten stehen. `languageY` bezeichnet jeweils die Übersetzungssprache. Optional kannst du mit `languageZ` ein Feld für Zusatzinformationen angeben und jedem Eintrag ein entsprechendes `z`-Feld hinzufügen; die Zusatzinformation erscheint bei der Wortansicht und während des Lernens.

```json
{
  "languageX": "Latein",
  "languageY": "Deutsch",
  "languageZ": "Informationen",
  "entries": [
    { "x": "gratia", "y": "der Dank", "z": "gratiae f." }
  ]
}
```

Lege daneben die Datei `meta.json` mit Titel und Beschreibung ab. Ein vollständiger Eintrag sieht so aus:

```text
datas/12Eng/us-history/
  us-history.json
  meta.json
```

Inhalt von `meta.json`:

```json
{
  "id": "us-history",
  "title": "US History",
  "description": "Geschichte der Vereinigten Staaten",
  "wordCount": 51,
  "file": "datas/12Eng/us-history/us-history.json"
}
```

`id` muss dem Ordnernamen entsprechen. Der Generator verwendet Titel und Beschreibung aus den Metadaten und setzt `wordCount` sowie `file` aus der tatsächlichen Vokabeldatei neu.

Nach einem Push mit neuen oder geänderten JSON-Dateien durchsucht GitHub Actions die Klassenordner und aktualisiert `datas/catalog.json` automatisch. Die Katalogdatei muss nicht manuell bearbeitet werden. Für den Workflow müssen GitHub Actions Schreibrechte für das Repository haben (**Settings → Actions → General → Workflow permissions → Read and write permissions**).

## Lokal ansehen

Die App braucht einen lokalen Webserver, damit Browser Katalog und Vokabeldateien laden können. Mit installiertem Node.js lässt sie sich im Projektordner so starten:

```powershell
npx --yes http-server .
```

Für GitHub Pages kann das Repository über **Settings → Pages → Deploy from a branch** veröffentlicht werden; als Ordner die Repository-Wurzel auswählen.