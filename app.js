"use strict";

let catalog = null;
let browseGroups = [];

const codeForm = document.querySelector("#code-form");
const codeInput = document.querySelector("#group-code");
const codeMessage = document.querySelector("#code-message");
const browseButton = document.querySelector("#browse-button");
const resultsPanel = document.querySelector("#results-panel");
const resultsTitle = document.querySelector("#results-title");
const resultsContent = document.querySelector("#results-content");
const gradeFilterWrap = document.querySelector("#grade-filter-wrap");
const gradeFilter = document.querySelector("#grade-filter");
const listDialog = document.querySelector("#list-dialog");
const dialogClose = document.querySelector("#dialog-close");

// 9001 START - Initialisiert die Oberfläche und verbindet ihre Ereignisse.
function startApp() {
  codeForm.addEventListener("submit", handleCodeSubmit);
  codeInput.addEventListener("input", handleCodeInput);
  browseButton.addEventListener("click", handleBrowseClick);
  gradeFilter.addEventListener("change", handleGradeChange);
  resultsContent.addEventListener("click", handleListOpen);
  dialogClose.addEventListener("click", closeListDialog);
  loadCatalog();
}
// 9001 ENDE

// 1001 START - Lädt den GitHub-Dateikatalog mit Gruppen und Vokabellisten.
async function loadCatalog() {
  try {
    const response = await fetch("datas/catalog.json");
    if (!response.ok) {
      throw new Error("Der Katalog konnte nicht geladen werden.");
    }

    catalog = await response.json();
    if (!validateCatalog(catalog)) {
      throw new Error("Der Katalog hat ein ungültiges Format.");
    }
  } catch (error) {
    setCodeMessage("Die Vokabelsammlung ist gerade nicht erreichbar. Bitte später erneut versuchen.");
    browseButton.disabled = true;
    browseButton.setAttribute("aria-disabled", "true");
  }
}
// 1001 ENDE

// 2001 START - Prüft den Gruppencode und zeigt nur die zugehörigen Listen.
function handleCodeSubmit(event) {
  event.preventDefault();
  setCodeMessage("");

  const code = codeInput.value.trim();
  if (!/^\d{6}$/.test(code)) {
    setCodeMessage("Bitte gib einen sechsstelligen Code ein.");
    codeInput.focus();
    return;
  }

  if (!catalog) {
    setCodeMessage("Die Vokabelsammlung wird noch geladen.");
    return;
  }

  const group = findGroupByCode(code);
  if (!group) {
    setCodeMessage("Zu diesem Code wurde keine Lerngruppe gefunden.");
    codeInput.focus();
    return;
  }

  gradeFilterWrap.hidden = true;
  resultsTitle.textContent = `Listen für ${group.classId}`;
  renderGroupLists([group], false);
  showResults();
}
// 2001 ENDE

// 2002 START - Erlaubt im Codefeld ausschließlich Ziffern bis zur Maximallänge.
function handleCodeInput() {
  codeInput.value = codeInput.value.replace(/\D/g, "").slice(0, 6);
}
// 2002 ENDE

// 1002 START - Öffnet die vollständige Sammlung und sortiert sie nach Jahrgang.
function handleBrowseClick() {
  if (!catalog) {
    setCodeMessage("Die Vokabelsammlung wird noch geladen.");
    return;
  }

  browseGroups = sortGroups(catalog.groups);
  populateGradeFilter(browseGroups);
  gradeFilterWrap.hidden = false;
  resultsTitle.textContent = "Alle Vokabelsätze";
  renderBrowseGroups(browseGroups);
  showResults();
}
// 1002 ENDE

// 1003 START - Aktualisiert die Sammlung entsprechend dem ausgewählten Jahrgang.
function handleGradeChange() {
  const selectedGrade = gradeFilter.value;
  const visibleGroups = [];

  for (const group of browseGroups) {
    if (selectedGrade === "all" || group.grade === selectedGrade) {
      visibleGroups.push(group);
    }
  }

  renderBrowseGroups(visibleGroups);
}
// 1003 ENDE

// 1004 START - Befüllt den Jahrgangsfilter mit den vorhandenen Jahrgangsstufen.
function populateGradeFilter(groups) {
  gradeFilter.replaceChildren();
  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = "Alle Jahrgänge";
  gradeFilter.append(allOption);

  let previousGrade = "";
  for (const group of groups) {
    if (group.grade !== previousGrade) {
      const option = document.createElement("option");
      option.value = group.grade;
      option.textContent = `Jahrgang ${group.grade}`;
      gradeFilter.append(option);
      previousGrade = group.grade;
    }
  }
}
// 1004 ENDE

// 1005 START - Rendert alle Gruppen geordnet in Abschnitten nach Jahrgang.
function renderBrowseGroups(groups) {
  resultsContent.replaceChildren();
  if (groups.length === 0) {
    showEmptyState("Für diesen Jahrgang sind noch keine Vokabelsätze hinterlegt.");
    return;
  }

  let currentGrade = "";
  let gradeSection = null;

  for (const group of groups) {
    if (group.grade !== currentGrade) {
      currentGrade = group.grade;
      gradeSection = document.createElement("section");
      gradeSection.className = "grade-section";

      const gradeTitle = document.createElement("h3");
      gradeTitle.className = "grade-title";
      gradeTitle.textContent = `Jahrgang ${group.grade}`;
      const count = document.createElement("span");
      count.textContent = "LERNGRUPPEN";
      gradeTitle.append(count);
      gradeSection.append(gradeTitle);
      resultsContent.append(gradeSection);
    }

    const classSection = document.createElement("div");
    classSection.className = "class-section";
    const classHeading = document.createElement("h4");
    classHeading.className = "class-heading";
    classHeading.textContent = group.classId;
    const classList = document.createElement("div");
    classList.className = "list-grid";
    classSection.append(classHeading, classList);
    gradeSection.append(classSection);
    appendListCards(classList, group);
  }
}
// 1005 ENDE

// 1006 START - Rendert die Listen einer oder mehrerer Lerngruppen.
function renderGroupLists(groups, showClasses) {
  resultsContent.replaceChildren();

  for (const group of groups) {
    const listGrid = document.createElement("div");
    listGrid.className = "list-grid";

    if (showClasses) {
      const classSection = document.createElement("section");
      classSection.className = "class-section";
      const classHeading = document.createElement("h3");
      classHeading.className = "class-heading";
      classHeading.textContent = group.classId;
      classSection.append(classHeading, listGrid);
      resultsContent.append(classSection);
    } else {
      resultsContent.append(listGrid);
    }

    appendListCards(listGrid, group);
  }
}
// 1006 ENDE

// 1007 START - Fügt die Vokabelsatz-Karten einer Lerngruppe in die Ansicht ein.
function appendListCards(container, group) {
  for (let index = 0; index < group.lists.length; index += 1) {
    const list = group.lists[index];
    const card = document.createElement("article");
    card.className = "list-card";

    const number = document.createElement("span");
    number.className = "list-number";
    number.textContent = String(index + 1).padStart(2, "0");

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
    openButton.textContent = "Wörter ansehen →";
    card.append(number, details, openButton);
    container.append(card);
  }
}
// 1007 ENDE

// 1008 START - Lädt einen Vokabelsatz und öffnet dessen Wortliste.
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
  button.textContent = "Lädt …";

  try {
    const response = await fetch(list.file);
    if (!response.ok) {
      throw new Error("Der Vokabelsatz konnte nicht geladen werden.");
    }

    const vocabulary = await response.json();
    renderListDialog(group, list, vocabulary);
    listDialog.showModal();
  } catch (error) {
    setCodeMessage("Dieser Vokabelsatz konnte nicht geladen werden.");
  } finally {
    button.disabled = false;
    button.textContent = "Wörter ansehen →";
  }
}
// 1008 ENDE

// 1009 START - Zeigt Überschrift, Sprachpaar und Einträge im Vokabeldialog an.
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

// 2003 START - Findet anhand des sechsstelligen Codes die passende Lerngruppe.
function findGroupByCode(code) {
  for (const group of catalog.groups) {
    if (group.accessCode === code) {
      return group;
    }
  }

  return null;
}
// 2003 ENDE

// 2005 START - Prüft Katalogstruktur, eindeutige Codes und den Jahrgangspräfix.
function validateCatalog(data) {
  if (!data || !Array.isArray(data.groups)) {
    return false;
  }

  const knownCodes = new Set();
  for (const group of data.groups) {
    if (!group || typeof group.grade !== "string" || typeof group.classId !== "string" || !Array.isArray(group.lists)) {
      return false;
    }

    if (!group.classId.startsWith(group.grade) || !/^\d{6}$/.test(group.accessCode) || !group.accessCode.startsWith(group.grade) || knownCodes.has(group.accessCode)) {
      return false;
    }

    knownCodes.add(group.accessCode);
  }

  return true;
}
// 2005 ENDE

// 2004 START - Findet eine Lerngruppe anhand ihrer Klassenbezeichnung.
function findGroupById(classId) {
  for (const group of catalog.groups) {
    if (group.classId === classId) {
      return group;
    }
  }

  return null;
}
// 2004 ENDE

// 1010 START - Findet eine Liste innerhalb einer Lerngruppe anhand ihrer Kennung.
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

// 9002 START - Sortiert Gruppen zuerst nach Jahrgang, dann nach Klassenkennung.
function sortGroups(groups) {
  return groups.slice().sort(compareGroups);
}
// 9002 ENDE

// 9003 START - Vergleicht zwei Gruppen für eine aufsteigende Katalogsortierung.
function compareGroups(firstGroup, secondGroup) {
  const gradeOrder = firstGroup.grade.localeCompare(secondGroup.grade, "de", { numeric: true });
  return gradeOrder || firstGroup.classId.localeCompare(secondGroup.classId, "de");
}
// 9003 ENDE

// 9004 START - Zeigt den Inhaltsbereich an und bringt ihn in den sichtbaren Bereich.
function showResults() {
  resultsPanel.hidden = false;
  resultsPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}
// 9004 ENDE

// 9005 START - Zeigt einen Hinweis in der Codeeingabe an.
function setCodeMessage(message) {
  codeMessage.textContent = message;
}
// 9005 ENDE

// 9006 START - Zeigt einen neutralen Hinweis an, wenn eine Ansicht leer ist.
function showEmptyState(message) {
  const emptyState = document.createElement("p");
  emptyState.className = "empty-state";
  emptyState.textContent = message;
  resultsContent.append(emptyState);
}
// 9006 ENDE

// 9007 START - Schließt den Dialog mit der geladenen Vokabelliste.
function closeListDialog() {
  listDialog.close();
}
// 9007 ENDE

startApp();