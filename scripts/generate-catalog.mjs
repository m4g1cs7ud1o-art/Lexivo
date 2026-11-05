import { randomInt } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDirectory = path.join(projectDirectory, "datas");
const catalogPath = path.join(dataDirectory, "catalog.json");

// 1001 START - Liest vorhandene Klassencodes, damit bestehende Codes stabil bleiben.
async function readPreviousCatalog() {
  try {
    const contents = await readFile(catalogPath, "utf8");
    const previousCatalog = JSON.parse(contents);
    return Array.isArray(previousCatalog.groups) ? previousCatalog.groups : [];
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}
// 1001 ENDE

// 1002 START - Erzeugt für neue Klassen einen zufälligen sechsstelligen Auswahlcode.
function createAccessCode(classId, usedCodes) {
  const grade = classId.slice(0, 2);
  let suffix = randomInt(10000);
  for (let attempt = 0; attempt < 10000; attempt += 1) {
    const code = `${grade}${String(suffix).padStart(4, "0")}`;
    if (!usedCodes.has(code)) {
      return code;
    }
    suffix = (suffix + 1) % 10000;
  }

  throw new Error(`Für ${classId} konnte kein eindeutiger Code erzeugt werden.`);
}
// 1002 ENDE

// 1003 START - Macht aus einem Dateinamen einen gut lesbaren Listentitel.
function createTitle(fileName) {
  const words = fileName.replace(/\.json$/i, "").split(/[-_]+/);
  const titleWords = [];

  for (const word of words) {
    const lowerWord = word.toLowerCase();
    if (["us", "usa", "uk", "co2"].includes(lowerWord)) {
      titleWords.push(lowerWord.toUpperCase());
    } else {
      titleWords.push(lowerWord.charAt(0).toUpperCase() + lowerWord.slice(1));
    }
  }

  return titleWords.join(" ");
}
// 1003 ENDE

// 1004 START - Liest eine Vokabeldatei und erstellt daraus einen Katalogeintrag.
async function readVocabularyFile(classId, listId, filePath, metadata) {
  const contents = await readFile(filePath, "utf8");
  const vocabulary = JSON.parse(contents);

  if (!vocabulary.languageX || !vocabulary.languageY || !Array.isArray(vocabulary.entries)) {
    throw new Error(`${path.relative(dataDirectory, filePath)}: Sprachfelder oder entries fehlen.`);
  }

  for (const entry of vocabulary.entries) {
    if (!entry || typeof entry.x !== "string" || typeof entry.y !== "string") {
      throw new Error(`${path.relative(dataDirectory, filePath)}: Jeder Eintrag braucht Textfelder x und y.`);
    }
  }

  return {
    id: metadata.id || listId,
    title: metadata.title || createTitle(listId),
    description: metadata.description || `${vocabulary.languageX} ↔ ${vocabulary.languageY}`,
    language: metadata.language || vocabulary.languageX,
    languageY: vocabulary.languageY,
    wordCount: vocabulary.entries.length,
    file: path.relative(projectDirectory, filePath).split(path.sep).join("/")
  };
}
// 1004 ENDE

// 1008 START - Liest meta.json und die gleichnamige Vokabeldatei eines Listenordners.
async function readVocabularyFolder(classId, folderName) {
  const folderPath = path.join(dataDirectory, classId, folderName);
  const metadataPath = path.join(folderPath, "meta.json");
  const vocabularyPath = path.join(folderPath, `${folderName}.json`);
  const metadata = JSON.parse(await readFile(metadataPath, "utf8"));

  if (!metadata || metadata.id !== folderName || typeof metadata.title !== "string" || typeof metadata.description !== "string") {
    throw new Error(`${classId}/${folderName}/meta.json: id muss dem Ordnernamen entsprechen; title und description müssen Texte sein.`);
  }

  return readVocabularyFile(classId, folderName, vocabularyPath, metadata);
}
// 1008 ENDE

// 1005 START - Durchsucht alle Klassenordner und baut daraus die Gruppenliste.
async function discoverGroups() {
  const directoryEntries = await readdir(dataDirectory, { withFileTypes: true });
  const groups = [];

  for (const directoryEntry of directoryEntries) {
    if (!directoryEntry.isDirectory() || !/^\d{2}(?:[A-Za-z0-9]+)?$/.test(directoryEntry.name)) {
      continue;
    }

    const classId = directoryEntry.name;
    const classDirectory = path.join(dataDirectory, classId);
    const entries = await readdir(classDirectory, { withFileTypes: true });
    const listEntries = [];
    for (const entry of entries) {
      if (entry.isDirectory()) {
        listEntries.push({ name: entry.name, isFolder: true });
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".json")) {
        listEntries.push({ name: entry.name, isFolder: false });
      }
    }
    listEntries.sort((firstEntry, secondEntry) => firstEntry.name.localeCompare(secondEntry.name, "de"));

    const lists = [];
    for (const entry of listEntries) {
      if (entry.isFolder) {
        lists.push(await readVocabularyFolder(classId, entry.name));
      } else {
        const listId = entry.name.replace(/\.json$/i, "");
        const filePath = path.join(classDirectory, entry.name);
        lists.push(await readVocabularyFile(classId, listId, filePath, {}));
      }
    }

    if (lists.length > 0) {
      groups.push({
        classId,
        grade: classId.slice(0, 2),
        accessCode: "",
        lists
      });
    }
  }

  groups.sort(compareGroups);
  return groups;
}
// 1005 ENDE

// 1007 START - Sortiert Klassen nach Jahrgang und anschließend nach Kennung.
function compareGroups(firstGroup, secondGroup) {
  const gradeOrder = firstGroup.grade.localeCompare(secondGroup.grade, "de", { numeric: true });
  return gradeOrder || firstGroup.classId.localeCompare(secondGroup.classId, "de");
}
// 1007 ENDE

// 1006 START - Behält vorhandene Codes bei und vergibt Codes für neue Klassen.
function assignAccessCodes(groups, previousGroups) {
  const previousCodes = new Map();
  for (const group of previousGroups) {
    previousCodes.set(group.classId, group.accessCode);
  }

  const usedCodes = new Set();
  for (const group of groups) {
    const previousCode = previousCodes.get(group.classId);
    if (/^\d{6}$/.test(previousCode || "") && previousCode.startsWith(group.grade) && !usedCodes.has(previousCode)) {
      group.accessCode = previousCode;
      usedCodes.add(previousCode);
    }
  }

  for (const group of groups) {
    if (!group.accessCode) {
      group.accessCode = createAccessCode(group.classId, usedCodes);
      usedCodes.add(group.accessCode);
    }
  }
}
// 1006 ENDE

// 9001 START - Erzeugt datas/catalog.json aus allen Vokabeldateien.
async function generateCatalog() {
  const previousGroups = await readPreviousCatalog();
  const groups = await discoverGroups();
  assignAccessCodes(groups, previousGroups);

  const output = `${JSON.stringify({ groups }, null, 2)}\n`;
  if (process.argv.includes("--dry-run")) {
    process.stdout.write(output);
    return;
  }

  await writeFile(catalogPath, output, "utf8");
  console.log(`Katalog aktualisiert: ${groups.length} Klassen.`);
}
// 9001 ENDE

// 9002 START - Meldet Fehler der Katalogerzeugung mit einem Fehlercode.
function handleGenerationError(error) {
  console.error(error.message);
  process.exitCode = 1;
}
// 9002 ENDE

generateCatalog().catch(handleGenerationError);