"use strict";

const homeCodeForm = document.querySelector("#home-code-form");
const homeCodeInput = document.querySelector("#home-code");
const homeCodeMessage = document.querySelector("#home-code-message");

// 9001 START - Verbindet Startseiteneingabe und Codeprüfung.
function startHomePage() {
  homeCodeForm.addEventListener("submit", handleHomeCodeSubmit);
  homeCodeInput.addEventListener("input", handleHomeCodeInput);
}
// 9001 ENDE

// 2001 START - Leitet mit dem eingegebenen Klassencode zur passenden Listenansicht.
function handleHomeCodeSubmit(event) {
  event.preventDefault();
  const code = homeCodeInput.value.trim();

  if (!/^\d{6}$/.test(code)) {
    homeCodeMessage.textContent = "Bitte gib einen sechsstelligen Code ein.";
    homeCodeInput.focus();
    return;
  }

  window.location.href = `lists.html?code=${encodeURIComponent(code)}`;
}
// 2001 ENDE

// 2002 START - Entfernt alle Zeichen außer Ziffern und begrenzt die Eingabe auf sechs Stellen.
function handleHomeCodeInput() {
  homeCodeInput.value = homeCodeInput.value.replace(/\D/g, "").slice(0, 6);
  homeCodeMessage.textContent = "";
}
// 2002 ENDE

startHomePage();