"use strict";

let catalog = null;
let codeFilterGroup = null;

const codeForm = document.querySelector("#code-form");
const codeInput = document.querySelector("#group-code");
const codeMessage = document.querySelector("#code-message");
const clearCodeButton = document.querySelector("#clear-code");
const gradeFilter = document.querySelector("#grade-filter");
const resultsCount = document.querySelector("#results-count");
const resultsContent = document.querySelector("#results-content");
const listDialog = document.querySelector("#list-dialog");

// 9001 START - Verbindet die Filter und lädt beim Start alle Katalogdaten.
function startApp() {
  codeForm.addEventListener("submit", handleCodeSubmit);
  codeInput.addEventListener("input", handleCodeInput);
  clearCodeButton.addEventListener("click", handleClearCode);
  gradeFilter.addEventListener("change", handleGradeChange);
  resultsContent.addEventListener("click", handleListOpen);
  document.querySelector("#dialog-close").addEventListener("click", closeListDialog);
  loadCatalog();
}
// 9001 ENDE

// 1001 START - Lädt den automatisch erzeugten Katalog und zeigt alle Listen.
async function loadCatalog() {
  try {
    const response = await fetch(`datas/catalog.json?v=${Date.now()}`);
    if (!response.ok) {
      throw new Error("Der Katalog konnte nicht geladen werden.");
    }

    catalog = await response.json();
    if (!validateCatalog(catalog)) {
      throw new Error("Der Katalog hat ein ungültiges Format.");
    }

    catalog.groups = sortGroups(catalog.groups);
    populateGradeFilter(catalog.groups);
    renderVisibleGroups();
  } catch (error) {
    setStatus("Die Vokabelsammlung ist gerade nicht erreichbar.");
    showEmptyState("Bitte lade die Seite später erneut.");
  }
}
// 1001 ENDE

// 2001 START - Filtert die Klassenansicht mit dem eingegebenen sechsstelligen Code.
function handleCodeSubmit(event) {
  event.preventDefault();
  setStatus("");

  const code = codeInput.value.trim();
  if (!/^\d{6}$/.test(code)) {
    setStatus("Bitte gib einen sechsstelligen Code ein.");
    codeInput.focus();
    return;
  }

  if (!catalog) {
    setStatus("Die Vokabelsammlung wird noch geladen.");
    return;
  }

  codeFilterGroup = findGroupByCode(code);
  if (!codeFilterGroup) {
    setStatus("Zu diesem Code wurde keine Lerngruppe gefunden.");
    codeInput.focus();
    return;
  }

  gradeFilter.value = "all";
  setStatus(`Klasse ${codeFilterGroup.classId} wird angezeigt.`);
  renderVisibleGroups();
}
// 2001 ENDE

// 2002 START - Beschränkt das Codefeld auf sechs Ziffern.
function handleCodeInput() {
  codeInput.value = codeInput.value.replace(/\D/g, "").slice(0, 6);
}
// 2002 ENDE

// 2003 START - Entfernt den Klassencodefilter und zeigt wieder alle Listen.
function handleClearCode() {
  codeInput.value = "";
  codeFilterGroup = null;
  gradeFilter.value = "all";
  setStatus("");
  renderVisibleGroups();
}
// 2003 ENDE

// 1002 START - Aktualisiert die Ansicht nach einer Änderung des Jahrgangsfilters.
function handleGradeChange() {
  renderVisibleGroups();
}
// 1002 ENDE

// 1003 START - Befüllt den Jahrgangsfilter aus den vorhandenen Klassen.
function populateGradeFilter(groups) {
  gradeFilter.replaceChildren();
  addGradeOption("all", "Alle Jahrgänge");

  let previousGrade = "";
  for (const group of groups) {
    if (group.grade !== previousGrade) {
      addGradeOption(group.grade, `Jahrgang ${group.grade}`);
      previousGrade = group.grade;
    }
  }
}
// 1003 ENDE

// 1004 START - Fügt dem Jahrgangsfilter eine Option hinzu.
function addGradeOption(value, label) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  gradeFilter.append(option);
}
// 1004 ENDE

// 1005 START - Rendert alle Klassen, die den aktiven Filtern entsprechen.
function renderVisibleGroups() {
  if (!catalog) {
    return;
  }

  const visibleGroups = [];
  const selectedGrade = gradeFilter.value;

  for (const group of catalog.groups) {
    if (codeFilterGroup && group.classId !== codeFilterGroup.classId) {
      continue;
    }

    if (selectedGrade !== "all" && group.grade !== selectedGrade) {
      continue;
    }

    visibleGroups.push(group);
  }

  renderGroups(visibleGroups);
}
// 1005 ENDE

// 1006 START - Zeigt die Vokabellisten nach Jahrgang und Klasse sortiert an.
function renderGroups(groups) {
  resultsContent.replaceChildren();

  let listCount = 0;
  for (const group of groups) {
    listCount += group.lists.length;
  }
  updateResultsCount(groups.length, listCount);

  if (groups.length === 0) {
    showEmptyState("Für diese Auswahl sind noch keine Vokabelsätze hinterlegt.");
    return;
  }

  let currentGrade = "";
  let gradeSection = null;

  for (const group of groups) {
    if (group.grade !== currentGrade) {
      currentGrade = group.grade;
      gradeSection = document.createElement("section");
      gradeSection.className = "grade-section";
      const gradeTitle = document.createElement("h2");
      gradeTitle.className = "grade-title";
      gradeTitle.textContent = `Jahrgang ${group.grade}`;
      gradeSection.append(gradeTitle);
      resultsContent.append(gradeSection);
    }

    const classSection = document.createElement("section");
    classSection.className = "class-section";
    const classHeading = document.createElement("h3");
    classHeading.className = "class-heading";
    classHeading.textContent = group.classId;
    const listGrid = document.createElement("div");
    listGrid.className = "list-grid";
    classSection.append(classHeading, listGrid);
    gradeSection.append(classSection);
    appendListCards(listGrid, group);
  }
}
// 1006 ENDE

// 1007 START - Erzeugt die Listenkarten einer Klasse.
function appendListCards(container, group) {
  for (let index = 0; index < group.lists.length; index += 1) {
    const list = group.lists[index];
    const card = document.createElement("article");
    card.className = "list-card";

    const details = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = list.title;
    const description = document.createElement("p");
    description.textContent = `${list.wordCount} Wörter · ${list.description}`;
    details.append(title, description);

    const openButton = document.createElement("button");
    openButton.className = "list-open";
    openButton.type = "button";
    openButton.dataset.groupId = group.classId;
    openButton.dataset.listId = list.id;
    openButton.textContent = "Alle Wörter ansehen";
    card.append(details, openButton);
    container.append(card);
  }
}
// 1007 ENDE

// 1008 START - Lädt die Vokabeldatei der gewählten Karte in den Dialog.
async function handleListOpen(event) {
  const button = event.target.closest("button[data-list-id]");
  if (!button) {
    return;
  }

  const group = findGroupById(button.dataset.groupId);
  const list = findListById(group, button.dataset.listId);
  if (!group || !list) {
    return;
  }

  button.disabled = true;
  try {
    const response = await fetch(list.file);
    if (!response.ok) {
      throw new Error("Der Vokabelsatz konnte nicht geladen werden.");
    }

    const vocabulary = await response.json();
    renderListDialog(group, list, vocabulary);
    listDialog.showModal();
  } catch (error) {
    setStatus("Dieser Vokabelsatz konnte nicht geladen werden.");
  } finally {
    button.disabled = false;
  }
}
// 1008 ENDE

// 1009 START - Zeigt die Vokabeln und Sprachrichtungen im Dialog an.
function renderListDialog(group, list, vocabulary) {
  document.querySelector("#dialog-class").textContent = `${group.classId} · ${vocabulary.languageX} / ${vocabulary.languageY}`;
  document.querySelector("#dialog-title").textContent = list.title;
  document.querySelector("#dialog-description").textContent = `${vocabulary.entries.length} Vokabeln`;

  const wordContainer = document.querySelector("#dialog-words");
  wordContainer.replaceChildren();
  for (const entry of vocabulary.entries) {
    const row = document.createElement("div");
    row.className = "word-row";
    const wordX = document.createElement("span");
    wordX.textContent = entry.x;
    const wordY = document.createElement("span");
    wordY.textContent = entry.y;
    row.append(wordX, wordY);
    wordContainer.append(row);
  }
}
// 1009 ENDE

// 2004 START - Sucht die Klasse zum eingegebenen Klassencode.
function findGroupByCode(code) {
  for (const group of catalog.groups) {
    if (group.accessCode === code) {
      return group;
    }
  }

  return null;
}
// 2004 ENDE

// 2005 START - Sucht eine Klasse anhand ihrer Klassenkennung.
function findGroupById(classId) {
  for (const group of catalog.groups) {
    if (group.classId === classId) {
      return group;
    }
  }

  return null;
}
// 2005 ENDE

// 1010 START - Sucht einen Vokabelsatz innerhalb einer Klasse.
function findListById(group, listId) {
  if (!group) {
    return null;
  }

  for (const list of group.lists) {
    if (list.id === listId) {
      return list;
    }
  }

  return null;
}
// 1010 ENDE

// 9002 START - Sortiert Klassen nach Jahrgang und Kennung.
function sortGroups(groups) {
  return groups.slice().sort(compareGroups);
}
// 9002 ENDE

// 9003 START - Vergleicht zwei Klassen für die Katalogsortierung.
function compareGroups(firstGroup, secondGroup) {
  const gradeOrder = firstGroup.grade.localeCompare(secondGroup.grade, "de", { numeric: true });
  return gradeOrder || firstGroup.classId.localeCompare(secondGroup.classId, "de");
}
// 9003 ENDE

// 9004 START - Aktualisiert die sichtbare Anzahl von Klassen und Listen.
function updateResultsCount(groupCount, listCount) {
  resultsCount.textContent = `${listCount} Vokabelsätze · ${groupCount} Klassen`;
}
// 9004 ENDE

// 9005 START - Zeigt eine Status- oder Fehlermeldung unter dem Codefeld.
function setStatus(message) {
  codeMessage.textContent = message;
}
// 9005 ENDE

// 9006 START - Prüft die automatisch erzeugte Katalogstruktur.
function validateCatalog(data) {
  if (!data || !Array.isArray(data.groups)) {
    return false;
  }

  const knownCodes = new Set();
  for (const group of data.groups) {
    if (!group || !/^\d{2}$/.test(group.grade) || !group.classId.startsWith(group.grade) || !Array.isArray(group.lists)) {
      return false;
    }

    if (!/^\d{6}$/.test(group.accessCode) || !group.accessCode.startsWith(group.grade) || knownCodes.has(group.accessCode)) {
      return false;
    }
    knownCodes.add(group.accessCode);

    for (const list of group.lists) {
      if (!list.id || !list.title || !list.file || !Number.isInteger(list.wordCount)) {
        return false;
      }
    }
  }

  return true;
}
// 9006 ENDE

// 9007 START - Zeigt einen Hinweis, wenn keine Liste zur Auswahl passt.
function showEmptyState(message) {
  const emptyState = document.createElement("p");
  emptyState.className = "empty-state";
  emptyState.textContent = message;
  resultsContent.append(emptyState);
}
// 9007 ENDE

// 9008 START - Schließt den Dialog mit dem geöffneten Vokabelsatz.
function closeListDialog() {
  listDialog.close();
}
// 9008 ENDE

startApp();