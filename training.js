"use strict";

const query = new URLSearchParams(window.location.search);
const sessionClass = query.get("class");
const sessionListId = query.get("list");
const sessionMode = query.get("mode");
const requestedDirection = query.get("direction") || "xy";
const requestedCount = Number(query.get("count"));

const sessionClassLabel = document.querySelector("#session-class");
const sessionTitle = document.querySelector("#session-title");
const sessionModeLabel = document.querySelector("#session-mode");
const sessionDirectionLabel = document.querySelector("#session-direction");
const progressFill = document.querySelector("#progress-fill");
const progressLabel = document.querySelector("#progress-label");
const questionContent = document.querySelector("#question-content");
const answerFeedback = document.querySelector("#answer-feedback");
const questionActions = document.querySelector("#question-actions");
const sessionError = document.querySelector("#session-error");
const questionPanel = document.querySelector("#question-panel");

let group = null;
let list = null;
let vocabulary = null;
let deck = [];
let currentIndex = 0;
let currentDirection = "xy";
let isRevealed = false;
let hasAnswered = false;
let correctAnswers = 0;

// 9001 START - Validiert Parameter, lädt Liste und startet den angeforderten Modus.
async function startTrainingPage() {
  if (!sessionClass || !sessionListId || !["practice", "quiz", "test"].includes(sessionMode)) {
    showSessionError("Der Lernlink ist unvollständig. Bitte wähle den Modus erneut aus.");
    return;
  }

  if (!window.location.search || !["xy", "yx", "random"].includes(requestedDirection)) {
    showSessionError("Die Abfragerichtung ist ungültig.");
    return;
  }

  try {
    const catalogResponse = await fetch("datas/catalog.json");
    if (!catalogResponse.ok) {
      throw new Error("Der Katalog konnte nicht geladen werden.");
    }

    const catalog = await catalogResponse.json();
    group = findGroup(catalog.groups, sessionClass);
    list = findList(group, sessionListId);
    if (!group || !list) {
      throw new Error("Die gewählte Klasse oder Liste wurde nicht gefunden.");
    }

    const vocabularyResponse = await fetch(list.file);
    if (!vocabularyResponse.ok) {
      throw new Error("Die Vokabeldatei konnte nicht geladen werden.");
    }
    vocabulary = await vocabularyResponse.json();

    const shuffledEntries = shuffleEntries(vocabulary.entries);
    deck = sessionMode === "test" ? shuffledEntries.slice(0, normalizeTestCount(shuffledEntries.length)) : shuffledEntries;
    configureSessionHeader();
    renderQuestion();
  } catch (error) {
    showSessionError(error.message);
  }
}
// 9001 ENDE

// 9002 START - Findet die Klasse anhand der Kennung im Link.
function findGroup(groups, classId) {
  for (const candidate of groups) {
    if (candidate.classId === classId) {
      return candidate;
    }
  }

  return null;
}
// 9002 ENDE

// 9003 START - Findet den gewählten Vokabelsatz innerhalb der Klasse.
function findList(selectedGroup, listId) {
  if (!selectedGroup) {
    return null;
  }

  for (const candidate of selectedGroup.lists) {
    if (candidate.id === listId) {
      return candidate;
    }
  }

  return null;
}
// 9003 ENDE

// 9004 START - Begrenzte Testanzahl auf die gültige Listengröße.
function normalizeTestCount(entryCount) {
  if (!Number.isInteger(requestedCount) || requestedCount < 1) {
    return Math.min(20, entryCount);
  }

  return Math.min(requestedCount, entryCount);
}
// 9004 ENDE

// 9005 START - Mischt die Vokabeln, ohne die Quelldaten zu verändern.
function shuffleEntries(entries) {
  const shuffledEntries = entries.slice();
  for (let index = shuffledEntries.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffledEntries[index], shuffledEntries[randomIndex]] = [shuffledEntries[randomIndex], shuffledEntries[index]];
  }

  return shuffledEntries;
}
// 9005 ENDE

// 9006 START - Zeigt Klassenname, Liste, Modus und Fortschritt an.
function configureSessionHeader() {
  const modeNames = { practice: "Üben", quiz: "Prüfen", test: "Test" };
  sessionClassLabel.textContent = `Jahrgang ${group.grade} · ${vocabulary.languageX}`;
  sessionTitle.textContent = list.title;
  sessionModeLabel.textContent = modeNames[sessionMode];
  sessionDirectionLabel.textContent = sessionMode === "quiz" ? "Zufällige Richtung" : getDirectionLabel(requestedDirection);
  document.title = `${list.title} | Lexivo`;
}
// 9006 ENDE

// 3001 START - Zeigt die aktuelle Karte oder Frage des Übemodus.
function renderQuestion() {
  if (currentIndex >= deck.length) {
    renderSummary();
    return;
  }

  hasAnswered = false;
  isRevealed = false;
  answerFeedback.textContent = "";
  answerFeedback.className = "answer-feedback";
  questionActions.replaceChildren();
  currentDirection = getQuestionDirection();
  updateProgress();

  if (sessionMode === "practice") {
    renderPracticeQuestion();
  } else if (sessionMode === "quiz") {
    renderQuizQuestion();
  } else {
    renderTestQuestion();
  }
}
// 3001 ENDE

// 3002 START - Zeigt die Vorderseite einer Karte und ermöglicht das Umdrehen.
function renderPracticeQuestion() {
  const pair = getQuestionPair(deck[currentIndex], currentDirection);
  const hint = createElement("p", "question-hint", getDirectionLabel(currentDirection));
  const prompt = createElement("h2", "question-word", pair.question);
  const answer = createElement("p", "practice-answer", "");
  answer.id = "practice-answer";
  questionContent.replaceChildren(hint, prompt, answer);

  const revealButton = createButton("primary-button", "Antwort zeigen", handleRevealAnswer);
  questionActions.append(revealButton);
}
// 3002 ENDE

// 3003 START - Dreht die Karte um und zeigt die Übersetzung.
function handleRevealAnswer() {
  if (isRevealed) {
    return;
  }

  isRevealed = true;
  document.querySelector("#practice-answer").textContent = getQuestionPair(deck[currentIndex], currentDirection).answer;
  questionActions.replaceChildren(createButton("primary-button", currentIndex + 1 === deck.length ? "Abschließen" : "Weiter", advanceQuestion));
}
// 3003 ENDE

// 4001 START - Rendert eine Multiple-Choice-Frage mit vier Antworten.
function renderQuizQuestion() {
  const pair = getQuestionPair(deck[currentIndex], currentDirection);
  const hint = createElement("p", "question-hint", "Wähle die richtige Übersetzung");
  const prompt = createElement("h2", "question-word", pair.question);
  const choices = createElement("div", "choice-list", "");
  choices.addEventListener("click", handleQuizChoice);

  for (const choice of createQuizChoices(deck[currentIndex], currentDirection)) {
    const button = createButton("choice-button", choice, null);
    button.dataset.answer = choice;
    choices.append(button);
  }

  questionContent.replaceChildren(hint, prompt, choices);
}
// 4001 ENDE

// 4002 START - Wertet die Multiple-Choice-Auswahl aus und zeigt die richtige Antwort.
function handleQuizChoice(event) {
  const button = event.target.closest("button[data-answer]");
  if (!button || hasAnswered) {
    return;
  }

  hasAnswered = true;
  const pair = getQuestionPair(deck[currentIndex], currentDirection);
  const isCorrect = button.dataset.answer === pair.answer;
  if (isCorrect) {
    correctAnswers += 1;
  }

  for (const choiceButton of questionContent.querySelectorAll("button[data-answer]")) {
    choiceButton.disabled = true;
    if (choiceButton.dataset.answer === pair.answer) {
      choiceButton.classList.add("is-correct");
    }
  }
  if (!isCorrect) {
    button.classList.add("is-incorrect");
  }

  showAnswerFeedback(isCorrect, pair.answer);
  showNextButton();
}
// 4002 ENDE

// 5001 START - Rendert eine Freitextfrage im Testmodus.
function renderTestQuestion() {
  const pair = getQuestionPair(deck[currentIndex], currentDirection);
  const hint = createElement("p", "question-hint", "Tippe die Übersetzung ein");
  const prompt = createElement("h2", "question-word", pair.question);
  const form = createElement("form", "answer-form", "");
  const input = document.createElement("input");
  input.type = "text";
  input.name = "answer";
  input.autocomplete = "off";
  input.setAttribute("aria-label", "Deine Antwort");
  input.required = true;
  const submit = createButton("primary-button", "Prüfen", null);
  submit.type = "submit";
  form.append(input, submit);
  form.addEventListener("submit", handleTestAnswer);
  questionContent.replaceChildren(hint, prompt, form);
  input.focus();
}
// 5001 ENDE

// 5002 START - Prüft die eingetippte Antwort auf Gleichheit ohne Groß-/Kleinschreibung.
function handleTestAnswer(event) {
  event.preventDefault();
  if (hasAnswered) {
    return;
  }

  const input = questionContent.querySelector('input[name="answer"]');
  const givenAnswer = normalizeAnswer(input.value);
  if (!givenAnswer) {
    input.focus();
    return;
  }

  hasAnswered = true;
  const pair = getQuestionPair(deck[currentIndex], currentDirection);
  const isCorrect = givenAnswer === normalizeAnswer(pair.answer);
  if (isCorrect) {
    correctAnswers += 1;
  }

  input.disabled = true;
  questionContent.querySelector("button[type=submit]").disabled = true;
  showAnswerFeedback(isCorrect, pair.answer);
  showNextButton();
}
// 5002 ENDE

// 5003 START - Vergleicht Antworten unabhängig von Großschreibung und Leerraum.
function normalizeAnswer(answer) {
  return answer.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}
// 5003 ENDE

// 4003 START - Erstellt bis zu vier eindeutige Multiple-Choice-Antworten.
function createQuizChoices(correctEntry, direction) {
  const correctAnswer = getQuestionPair(correctEntry, direction).answer;
  const choices = [correctAnswer];
  const candidates = shuffleEntries(vocabulary.entries);

  for (const candidate of candidates) {
    const answer = getQuestionPair(candidate, direction).answer;
    if (!choices.includes(answer)) {
      choices.push(answer);
    }
    if (choices.length === 4) {
      break;
    }
  }

  return shuffleEntries(choices);
}
// 4003 ENDE

// 4004 START - Fügt die Weiter-Schaltfläche nach einer beantworteten Frage hinzu.
function showNextButton() {
  const label = currentIndex + 1 === deck.length ? "Ergebnis ansehen" : "Nächste Frage";
  questionActions.replaceChildren(createButton("primary-button", label, advanceQuestion));
}
// 4004 ENDE

// 4005 START - Zeigt Feedback mit der korrekten Antwort.
function showAnswerFeedback(isCorrect, correctAnswer) {
  answerFeedback.textContent = isCorrect ? "Richtig" : `Richtige Antwort: ${correctAnswer}`;
  answerFeedback.classList.add(isCorrect ? "is-correct" : "is-incorrect");
}
// 4005 ENDE

// 3004 START - Geht zur nächsten Karte oder schließt die Runde ab.
function advanceQuestion() {
  currentIndex += 1;
  renderQuestion();
}
// 3004 ENDE

// 3005 START - Zeigt nach der letzten Karte oder Frage die Zusammenfassung.
function renderSummary() {
  updateProgress(true);
  sessionDirectionLabel.textContent = "Runde abgeschlossen";
  const summary = createElement("div", "summary-card", "");
  const title = createElement("h2", "", "Fertig!");
  const score = createElement("p", "summary-score", "");
  if (sessionMode === "practice") {
    score.textContent = `${deck.length} Karteikarten durchgesehen.`;
  } else {
    score.textContent = `${correctAnswers} von ${deck.length} richtig.`;
  }
  summary.append(title, score);
  questionContent.replaceChildren(summary);
  answerFeedback.textContent = "";
  questionActions.replaceChildren(createButton("primary-button", "Zurück zu den Listen", returnToLists));
}
// 3005 ENDE

// 9007 START - Stellt eine Antwort abhängig von der gewählten Sprachrichtung zusammen.
function getQuestionPair(entry, direction) {
  if (direction === "yx") {
    return { question: entry.y, answer: entry.x };
  }

  return { question: entry.x, answer: entry.y };
}
// 9007 ENDE

// 9008 START - Wählt die Richtung für die aktuelle Frage.
function getQuestionDirection() {
  if (sessionMode === "practice") {
    return requestedDirection === "yx" ? "yx" : "xy";
  }
  if (sessionMode === "quiz" || requestedDirection === "random") {
    return Math.random() < 0.5 ? "xy" : "yx";
  }

  return requestedDirection === "yx" ? "yx" : "xy";
}
// 9008 ENDE

// 9009 START - Formatiert eine Abfragerichtung für die Oberfläche.
function getDirectionLabel(direction) {
  if (direction === "yx") {
    return "Deutsch → Englisch";
  }
  if (direction === "random") {
    return "Zufällige Richtung";
  }
  return "Englisch → Deutsch";
}
// 9009 ENDE

// 9010 START - Aktualisiert Fortschrittsanzeige und Zähler.
function updateProgress(isComplete = false) {
  const completedCount = isComplete ? deck.length : currentIndex;
  progressLabel.textContent = `${Math.min(currentIndex + 1, deck.length)} von ${deck.length} Vokabeln`;
  progressFill.style.width = `${(completedCount / deck.length) * 100}%`;
}
// 9010 ENDE

// 9011 START - Erstellt ein Textelement und setzt dessen Inhalt sicher als Text.
function createElement(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) {
    element.className = className;
  }
  element.textContent = text;
  return element;
}
// 9011 ENDE

// 9012 START - Erstellt eine Schaltfläche und bindet bei Bedarf eine Aktion.
function createButton(className, text, action) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = text;
  if (action) {
    button.addEventListener("click", action);
  }
  return button;
}
// 9012 ENDE

// 9013 START - Zeigt eine verständliche Meldung bei ungültigen oder fehlenden Daten.
function showSessionError(message) {
  questionPanel.hidden = true;
  sessionError.hidden = false;
  sessionError.textContent = message;
}
// 9013 ENDE

// 9014 START - Kehrt zur Listenübersicht der aktuellen Klasse zurück.
function returnToLists() {
  window.location.href = `lists.html?code=${encodeURIComponent(group.accessCode)}`;
}
// 9014 ENDE

startTrainingPage();