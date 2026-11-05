Die Verwaltung liegt außerhalb der Schüleroberfläche in `datas/classes.json`. Dort legst du pro Gruppe `classId`, Jahrgang, Klassencode und die angezeigten Listen-IDs fest. `dataFolder` nennt den Ordner, in dem die Vokabeldateien liegen; so kann zum Beispiel die sichtbare Klasse `12T2` ihre Daten aus `datas/12Eng/` beziehen. Nur eingetragene Listen-IDs gelangen in den Website-Katalog; entfernst du eine Listen-ID, wird die Liste nicht mehr angezeigt. Gruppencodes müssen sechs Ziffern haben und mit dem Jahrgang beginnen.
# Vokabular

Statische Vokabelsammlung für GitHub Pages. Gruppencodes dienen zum Finden der passenden Klasse; die Dateien im Repository sind öffentlich und nicht durch den Code geschützt.

## Klassen verwalten

Die Schüleroberfläche enthält keine Verwaltungsfunktionen. Klassen, Codes und freigegebene Vokabelsätze bearbeitest du zentral in `datas/classes.json`. Nur dort eingetragene Listen erscheinen auf der Website. Zum Ausblenden einer Liste entfernst du ihre ID aus `lists`; zum Hinzufügen trägst du die ID des Ordners unter der Klasse ein. Gruppencodes müssen sechs Ziffern haben und mit dem Jahrgang beginnen.

Beispiel für eine Zuordnung:

```json
{
  "classId": "09Lat",
  "grade": "09",
  "dataFolder": "09Lat",
  "accessCode": "091864",
  "lists": ["lektion-22"]
}
```

Die Klassen-IDs und Codes sind keine Zugangssicherung: Die Daten und Konfiguration liegen öffentlich im Repository.

## Listen pflegen

Jede Klasse oder Jahrgangsgruppe bekommt einen Ordner unter `datas/`, zum Beispiel `datas/12Eng/` oder `datas/09Lat/`. Jeder Vokabelsatz liegt in einem eigenen Unterordner. Der Ordnername ist gleichzeitig der Name der Vokabeldatei ohne `.json`.

Ein Gruppencode besteht aus sechs Ziffern. Die ersten beiden Ziffern entsprechen dem Jahrgang, zum Beispiel `09` für `09Lat` oder `12` für `12Eng`. Lege den gewünschten Code in `datas/classes.json` fest und achte darauf, dass er eindeutig ist. Der Code ist nur eine Auswahlhilfe, keine Zugangssperre.

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

Nach einem Push mit Änderungen an `datas/classes.json` oder Vokabeldateien aktualisiert GitHub Actions `datas/catalog.json` automatisch. Die Katalogdatei muss nicht manuell bearbeitet werden. Für den Workflow müssen GitHub Actions Schreibrechte für das Repository haben (**Settings → Actions → General → Workflow permissions → Read and write permissions**).

## Lokal ansehen

Die App braucht einen lokalen Webserver, damit Browser Katalog und Vokabeldateien laden können. Mit installiertem Node.js lässt sie sich im Projektordner so starten:

```powershell
npx --yes http-server .
```

Für GitHub Pages kann das Repository über **Settings → Pages → Deploy from a branch** veröffentlicht werden; als Ordner die Repository-Wurzel auswählen.