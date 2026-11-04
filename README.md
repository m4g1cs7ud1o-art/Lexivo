# Vokabular

Statische Vokabelsammlung für GitHub Pages. Gruppencodes dienen zum Finden der passenden Klasse; die Dateien im Repository sind öffentlich und nicht durch den Code geschützt.

## Listen pflegen

Jede Klasse bekommt einen Ordner unter `datas/`, benannt nach der Klassenkennung, zum Beispiel `datas/05G5/`. Die Liste selbst liegt als JSON-Datei in diesem Ordner. Der zentrale Katalog `datas/catalog.json` verbindet Klassen, Codes und Dateien.

Ein Gruppencode besteht aus sechs Ziffern. Die ersten beiden Ziffern müssen dem Jahrgang und dem Anfang der Klassenkennung entsprechen, zum Beispiel `05` für `05G5` oder `12` für `12T2`. Codes müssen eindeutig sein.

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

Für eine neue Liste die Datei im Klassenordner ablegen und im `lists`-Abschnitt der passenden Gruppe in `datas/catalog.json` eintragen. `wordCount` muss der Anzahl der Einträge entsprechen.

## Lokal ansehen

Die App braucht einen lokalen Webserver, damit Browser Katalog und Vokabeldateien laden können. Mit installiertem Node.js lässt sie sich im Projektordner so starten:

```powershell
npx --yes http-server .
```

Für GitHub Pages kann das Repository über **Settings → Pages → Deploy from a branch** veröffentlicht werden; als Ordner die Repository-Wurzel auswählen.