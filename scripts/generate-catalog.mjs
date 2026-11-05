import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDirectory = path.join(projectDirectory, "datas");
const catalogPath = path.join(dataDirectory, "catalog.json");
const classesPath = path.join(dataDirectory, "classes.json");

// 1001 START - Liest und validiert die separate Klassenverwaltung.
async function readClassConfiguration() {
  const contents = await readFile(classesPath, "utf8");
  const configuration = JSON.parse(contents);
  validateClassConfiguration(configuration);
  return configuration;
}
// 1001 ENDE

// 1002 START - Prüft Klassenkennungen, Gruppencodes und eindeutige Listen-IDs.
function validateClassConfiguration(configuration) {
  if (!configuration || !Array.isArray(configuration.groups)) {
    throw new Error("datas/classes.json muss ein groups-Array enthalten.");
  }

  const classIds = new Set();
  const accessCodes = new Set();
  for (const group of configuration.groups) {
    if (!group || !/^\d{2}[A-Za-z0-9]*$/.test(group.classId || "") || group.grade !== group.classId.slice(0, 2)) {
      throw new Error("Jede Gruppe braucht eine classId mit zweistelligem Jahrgang und passender grade-Angabe.");
    }

    if (!/^\d{6}$/.test(group.accessCode || "") || !group.accessCode.startsWith(group.grade)) {
      throw new Error(`${group.classId}: accessCode muss sechsstellig sein und mit ${group.grade} beginnen.`);
    }

    if (classIds.has(group.classId) || accessCodes.has(group.accessCode)) {
      throw new Error(`${group.classId}: Klassenkennung und Gruppencode müssen eindeutig sein.`);
    }
    classIds.add(group.classId);
    accessCodes.add(group.accessCode);

    if (!Array.isArray(group.lists) || group.lists.some((listId) => typeof listId !== "string") || new Set(group.lists).size !== group.lists.length) {
      throw new Error(`${group.classId}: lists muss eindeutige Listen-IDs enthalten.`);
    }
    if (group.dataFolder !== undefined && !/^[A-Za-z0-9]+$/.test(group.dataFolder)) {
      throw new Error(`${group.classId}: dataFolder darf nur Buchstaben und Ziffern enthalten.`);
    }
  }
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
async function readVocabularyFolder(dataFolder, folderName) {
  const folderPath = path.join(dataDirectory, dataFolder, folderName);
  const metadataPath = path.join(folderPath, "meta.json");
  const vocabularyPath = path.join(folderPath, `${folderName}.json`);
  const metadata = JSON.parse(await readFile(metadataPath, "utf8"));

  if (!metadata || metadata.id !== folderName || typeof metadata.title !== "string" || typeof metadata.description !== "string") {
    throw new Error(`${dataFolder}/${folderName}/meta.json: id muss dem Ordnernamen entsprechen; title und description müssen Texte sein.`);
  }

  return readVocabularyFile(dataFolder, folderName, vocabularyPath, metadata);
}
// 1008 ENDE

// 1005 START - Baut Gruppen ausschließlich aus den administrativ zugewiesenen Listen.
async function discoverGroups(configuredGroups) {
  const groups = [];

  for (const configuredGroup of configuredGroups) {
    const classId = configuredGroup.classId;
    const dataFolder = configuredGroup.dataFolder || classId;
    const classDirectory = path.join(dataDirectory, dataFolder);
    const entries = await readdir(classDirectory, { withFileTypes: true });

    const lists = [];
    for (const listId of configuredGroup.lists) {
      const listFolder = entries.find((entry) => entry.isDirectory() && entry.name === listId);
      if (listFolder) {
        lists.push(await readVocabularyFolder(dataFolder, listId));
        continue;
      }

      const legacyFile = entries.find((entry) => entry.isFile() && entry.name === `${listId}.json`);
      if (!legacyFile) {
        throw new Error(`${classId}: Die zugewiesene Liste ${listId} wurde nicht gefunden.`);
      }

      const filePath = path.join(classDirectory, legacyFile.name);
      lists.push(await readVocabularyFile(dataFolder, listId, filePath, {}));
    }

    groups.push({
      classId,
      grade: configuredGroup.grade,
      accessCode: configuredGroup.accessCode,
      lists
    });
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

// 9001 START - Erzeugt datas/catalog.json aus allen Vokabeldateien.
async function generateCatalog() {
  const configuration = await readClassConfiguration();
  const groups = await discoverGroups(configuration.groups);

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