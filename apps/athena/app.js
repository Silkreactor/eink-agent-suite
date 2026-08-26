(function () {
  "use strict";

  const engine = window.AthenaQuestionEngine;
  const form = document.querySelector("#worksheet-form");
  const titleInput = document.querySelector("#note-title");
  const noteInput = document.querySelector("#note-body");
  const wordCount = document.querySelector("#word-count");
  const message = document.querySelector("#form-message");
  const printButton = document.querySelector("#print-button");
  const clearButton = document.querySelector("#clear-button");
  const exampleButton = document.querySelector("#example-button");
  const sheet = document.querySelector("#worksheet");
  const sheetTitle = document.querySelector("#sheet-title");
  const emptyState = document.querySelector("#empty-state");
  const sheetContent = document.querySelector("#sheet-content");
  const questionList = document.querySelector("#question-list");
  const reflectionPrompt = document.querySelector("#reflection-prompt");

  const example = {
    title: "Why sleep strengthens memory",
    note: "Sleep is an active part of learning rather than a pause from it. During deep sleep, the brain replays patterns of activity connected with recent experiences. This replay helps stabilize new memories so they are less easily disrupted the next day. Different sleep stages appear to support different kinds of learning. Deep non-REM sleep is strongly linked with remembering facts and events, while REM sleep may help the brain integrate ideas and discover broader patterns. A full night matters because these stages repeat in cycles. Cutting the night short removes more of the later REM-rich cycles. Researchers also find that testing yourself before sleep can strengthen the material available for consolidation. In practice, a short retrieval session followed by adequate sleep may be more useful than an extra hour of tired rereading. Sleep does not replace practice, but it helps preserve and reorganize what practice has already changed in the brain."
  };

  function updateWordCount() {
    const count = engine.countWords(noteInput.value);
    wordCount.value = `${count} / 100-300 words`;
    wordCount.textContent = wordCount.value;
    wordCount.style.color = count > 300 ? "var(--error)" : "";
  }

  function setMessage(text, type) {
    message.textContent = text;
    message.className = `form-message${type ? ` is-${type}` : ""}`;
  }

  function renderWorksheet(result) {
    sheetTitle.textContent = result.title;
    questionList.replaceChildren(...result.questions.map((question, index) => {
      const item = document.createElement("li");
      item.textContent = question;
      item.dataset.groundedIn = result.anchors[index];
      const lines = document.createElement("div");
      lines.className = "writing-lines";
      lines.setAttribute("aria-hidden", "true");
      item.append(lines);
      return item;
    }));
    reflectionPrompt.textContent = result.reflection;
    emptyState.hidden = true;
    sheetContent.hidden = false;
    sheet.classList.remove("is-empty");
    printButton.disabled = false;
    setMessage("Worksheet ready. Your note remains only in this browser tab.", "success");
  }

  function resetWorksheet() {
    sheetTitle.textContent = "Your learning worksheet";
    questionList.replaceChildren();
    reflectionPrompt.textContent = "";
    emptyState.hidden = false;
    sheetContent.hidden = true;
    sheet.classList.add("is-empty");
    printButton.disabled = true;
  }

  function loadInventedExample(generateImmediately) {
    titleInput.value = example.title;
    noteInput.value = example.note;
    updateWordCount();
    if (generateImmediately) {
      renderWorksheet(engine.generateWorksheet(titleInput.value, noteInput.value));
    } else {
      setMessage("Invented example loaded. Generate it or edit it first.");
      titleInput.focus();
    }
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    try {
      renderWorksheet(engine.generateWorksheet(titleInput.value, noteInput.value));
    } catch (error) {
      setMessage(error.message, "error");
      if (!titleInput.value.trim()) titleInput.focus();
      else noteInput.focus();
    }
  });

  noteInput.addEventListener("input", updateWordCount);

  exampleButton.addEventListener("click", function () {
    loadInventedExample(false);
  });

  clearButton.addEventListener("click", function () {
    form.reset();
    updateWordCount();
    resetWorksheet();
    setMessage("Cleared. Nothing from this page was saved.");
    titleInput.focus();
  });

  printButton.addEventListener("click", function () {
    if (printButton.disabled) return;
    window.print();
  });

  window.addEventListener("beforeprint", function () {
    document.documentElement.dataset.printing = "true";
  });

  window.addEventListener("afterprint", function () {
    delete document.documentElement.dataset.printing;
  });

  updateWordCount();

  if (new URLSearchParams(window.location.search).get("fixture") === "1") {
    loadInventedExample(true);
  }
})();
