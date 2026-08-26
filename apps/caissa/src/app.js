(function () {
  "use strict";

  const Chess = window.CaissaChess;
  const AI = window.CaissaAI;
  const PIECES = { K: "♔", Q: "♕", R: "♖", B: "♗", N: "♘", P: "♙", k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" };
  const NAMES = { p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king" };

  const elements = {
    setup: document.getElementById("setup"), game: document.getElementById("game"), board: document.getElementById("board"),
    computerSettings: document.getElementById("computer-settings"), start: document.getElementById("start-button"),
    setupButton: document.getElementById("setup-button"), rotate: document.getElementById("rotate-button"),
    resign: document.getElementById("resign-button"), promotion: document.getElementById("promotion-select"),
    status: document.getElementById("status-text"), detail: document.getElementById("status-detail"),
    token: document.getElementById("turn-token"), boardNote: document.getElementById("board-note"),
    gameLabel: document.getElementById("game-label"), opponentLabel: document.getElementById("opponent-label"),
    moveList: document.getElementById("move-list"), noMoves: document.getElementById("no-moves"),
    resultCard: document.getElementById("result-card"), resultTitle: document.getElementById("result-title"),
    resultLesson: document.getElementById("result-lesson"), playAgain: document.getElementById("play-again-button")
  };

  let state = Chess.initialState();
  let mode = "local";
  let level = 3;
  let humanSide = "w";
  let orientation = "w";
  let selected = null;
  let selectedMoves = [];
  let moveLog = [];
  let thinking = false;
  let manualResult = null;
  let aiTimer = null;

  function checkedValue(name) {
    return document.querySelector(`input[name="${name}"]:checked`).value;
  }

  function colorName(color) { return color === "w" ? "White" : "Black"; }

  function updateSetup() {
    const computer = checkedValue("mode") === "computer";
    elements.computerSettings.hidden = !computer;
    elements.start.textContent = computer ? "Start computer game" : "Start two-player game";
  }

  function showSetup() {
    if (aiTimer) clearTimeout(aiTimer);
    aiTimer = null;
    thinking = false;
    elements.setup.hidden = false;
    elements.game.hidden = true;
    elements.setupButton.hidden = true;
  }

  function startGame() {
    mode = checkedValue("mode");
    level = Number(checkedValue("level"));
    humanSide = checkedValue("side");
    orientation = mode === "computer" ? humanSide : "w";
    state = Chess.initialState();
    selected = null;
    selectedMoves = [];
    moveLog = [];
    manualResult = null;
    thinking = false;
    elements.setup.hidden = true;
    elements.game.hidden = false;
    elements.setupButton.hidden = false;
    elements.resultCard.hidden = true;
    elements.resign.disabled = false;
    elements.gameLabel.textContent = mode === "computer" ? `Computer · level ${level}` : "Two players";
    elements.opponentLabel.textContent = mode === "computer" ? `Local prototype opponent — not Stockfish · You are ${colorName(humanSide)}` : "Shared-screen play · no game is saved";
    elements.boardNote.textContent = `Select one of ${colorName(state.turn)}'s pieces.`;
    render();
    if (mode === "computer" && state.turn !== humanSide) queueComputerMove();
  }

  function isHumanTurn() {
    return mode === "local" || state.turn === humanSide;
  }

  function squareOrder() {
    const indices = [];
    if (orientation === "w") {
      for (let i = 0; i < 64; i += 1) indices.push(i);
    } else {
      for (let i = 63; i >= 0; i -= 1) indices.push(i);
    }
    return indices;
  }

  function renderBoard() {
    elements.board.replaceChildren();
    const status = Chess.gameStatus(state);
    const kingInCheck = status.inCheck ? state.board.indexOf(state.turn === "w" ? "K" : "k") : -1;
    const targets = new Map(selectedMoves.map(move => [move.to, move]));
    const last = state.lastMove;
    for (const index of squareOrder()) {
      const row = Math.floor(index / 8);
      const col = index % 8;
      const squareName = Chess.indexToSquare(index);
      const piece = state.board[index];
      const button = document.createElement("button");
      button.type = "button";
      button.className = `square ${(row + col) % 2 === 0 ? "light" : "dark"}`;
      button.setAttribute("role", "gridcell");
      button.dataset.square = squareName;
      button.setAttribute("aria-label", piece ? `${squareName}, ${colorName(Chess.colorOf(piece))} ${NAMES[Chess.typeOf(piece)]}` : `${squareName}, empty`);
      if (selected === index) button.classList.add("selected");
      if (targets.has(index)) button.classList.add("target", targets.get(index).capture ? "capture" : "quiet-target");
      if (last && (last.from === index || last.to === index)) button.classList.add("last-move");
      if (kingInCheck === index) button.classList.add("in-check");
      if (piece) {
        const span = document.createElement("span");
        span.className = "piece";
        span.textContent = PIECES[piece];
        span.setAttribute("aria-hidden", "true");
        button.appendChild(span);
      }
      const displayPosition = squareOrder().indexOf(index);
      const displayRow = Math.floor(displayPosition / 8);
      const displayCol = displayPosition % 8;
      if (displayCol === 0) {
        const rank = document.createElement("span");
        rank.className = "coord rank";
        rank.textContent = squareName[1];
        button.appendChild(rank);
      }
      if (displayRow === 7) {
        const file = document.createElement("span");
        file.className = "coord file";
        file.textContent = squareName[0];
        button.appendChild(file);
      }
      button.addEventListener("click", () => handleSquare(index));
      elements.board.appendChild(button);
    }
  }

  function statusCopy() {
    if (manualResult) return manualResult;
    const status = Chess.gameStatus(state);
    if (status.type === "checkmate") return { over: true, title: `${colorName(status.winner)} wins`, detail: "Checkmate" };
    if (status.type === "stalemate") return { over: true, title: "Draw", detail: "Stalemate" };
    if (status.type === "fifty-move") return { over: true, title: "Draw", detail: "Fifty-move rule" };
    if (status.type === "repetition") return { over: true, title: "Draw", detail: "Threefold repetition" };
    if (status.type === "insufficient-material") return { over: true, title: "Draw", detail: "Insufficient material" };
    if (thinking) return { over: false, title: `${colorName(state.turn)} is thinking`, detail: `Local prototype · level ${level}` };
    return { over: false, title: `${colorName(state.turn)} to move${status.inCheck ? " — check" : ""}`, detail: isHumanTurn() ? "Tap a piece, then its destination." : "Waiting for the local prototype opponent." };
  }

  function renderStatus() {
    const copy = statusCopy();
    elements.status.textContent = copy.title;
    elements.detail.textContent = copy.detail;
    elements.token.className = `turn-token ${state.turn === "w" ? "white" : "black"}`;
    elements.resign.disabled = copy.over || thinking;
    if (copy.over && elements.resultCard.hidden) showResult(copy);
  }

  function renderMoves() {
    elements.moveList.replaceChildren();
    elements.noMoves.hidden = moveLog.length > 0;
    for (let i = 0; i < moveLog.length; i += 2) {
      const item = document.createElement("li");
      item.value = Math.floor(i / 2) + 1;
      item.textContent = `${moveLog[i] || ""}${moveLog[i + 1] ? "   " + moveLog[i + 1] : ""}`;
      elements.moveList.appendChild(item);
    }
  }

  function render() {
    renderBoard();
    renderStatus();
    renderMoves();
  }

  function selectSquare(index) {
    selected = index;
    selectedMoves = Chess.legalMovesFrom(state, index);
    const piece = state.board[index];
    elements.boardNote.textContent = `${colorName(Chess.colorOf(piece))} ${NAMES[Chess.typeOf(piece)]} selected on ${Chess.indexToSquare(index)}. Choose a marked square.`;
    renderBoard();
  }

  function handleSquare(index) {
    const current = statusCopy();
    if (current.over || thinking) return;
    if (!isHumanTurn()) {
      elements.boardNote.textContent = "Wait for the local prototype opponent to finish its move.";
      return;
    }
    const piece = state.board[index];
    if (piece && Chess.colorOf(piece) === state.turn) {
      if (selected === index) {
        selected = null;
        selectedMoves = [];
        elements.boardNote.textContent = "Selection cleared.";
        renderBoard();
      } else selectSquare(index);
      return;
    }
    if (selected != null) {
      const move = selectedMoves.find(candidate => candidate.to === index && (!candidate.promotion || candidate.promotion === elements.promotion.value));
      if (move) {
        commitMove(move, "player");
        return;
      }
      elements.boardNote.textContent = `${Chess.indexToSquare(index)} is not a legal destination for the selected piece.`;
      return;
    }
    elements.boardNote.textContent = piece ? `It is ${colorName(state.turn)}'s turn.` : `No piece on ${Chess.indexToSquare(index)}. Select a ${colorName(state.turn)} piece first.`;
  }

  function moveNote(before, move, after, actor) {
    const piece = before.board[move.from];
    const who = actor === "computer" ? "The local opponent" : colorName(Chess.colorOf(piece));
    if (move.castle) return `${who} castled ${move.to > move.from ? "kingside" : "queenside"}.`;
    if (move.promotion) return `${who} promoted a pawn to a ${NAMES[move.promotion]}.`;
    const status = Chess.gameStatus(after);
    if (status.type === "checkmate") return `${Chess.moveToSAN(before, move)} ends the game in checkmate.`;
    if (status.inCheck) return `${Chess.moveToSAN(before, move)} gives check.`;
    if (move.capture) return `${who} captured on ${Chess.indexToSquare(move.to)}.`;
    return `${who} moved a ${NAMES[Chess.typeOf(piece)]} to ${Chess.indexToSquare(move.to)}.`;
  }

  function commitMove(move, actor) {
    const before = state;
    const san = Chess.moveToSAN(before, move);
    state = Chess.playMove(before, move);
    moveLog.push(san);
    selected = null;
    selectedMoves = [];
    elements.boardNote.textContent = moveNote(before, move, state, actor);
    render();
    const status = Chess.gameStatus(state);
    if (!status.over && mode === "computer" && state.turn !== humanSide) queueComputerMove();
  }

  function queueComputerMove() {
    thinking = true;
    selected = null;
    selectedMoves = [];
    render();
    aiTimer = setTimeout(() => {
      const move = AI.chooseMove(state, level);
      thinking = false;
      aiTimer = null;
      if (move) commitMove(move, "computer");
      else render();
    }, 220);
  }

  function lessonFor(copy) {
    const last = state.lastMove;
    if (copy.detail === "Checkmate" && last && Chess.indexToSquare(last.to) === "f7" && Chess.typeOf(last.piece) === "q" && state.board[Chess.squareToIndex("c4")] && Chess.typeOf(state.board[Chess.squareToIndex("c4")]) === "b") {
      return "The queen attacks the king from f7 and is protected by the bishop on c4. The king has no legal escape.";
    }
    if (copy.detail === "Checkmate") return "The final checking move left the king with no legal move, capture, or block.";
    if (copy.detail === "Stalemate") return "The player to move was not in check but had no legal move, so the game is a draw.";
    if (copy.detail.toLowerCase().includes("resign")) return "Resignation ends the game immediately. The board remains visible so you can review the final position.";
    return "The game ended in a draw. Review the final position and look for ways to keep more legal choices available.";
  }

  function showResult(copy) {
    elements.resultTitle.textContent = copy.title;
    elements.resultLesson.textContent = lessonFor(copy);
    elements.resultCard.hidden = false;
  }

  function resignGame() {
    if (thinking || statusCopy().over) return;
    const resigning = state.turn;
    const winner = Chess.opposite(resigning);
    manualResult = { over: true, title: `${colorName(winner)} wins`, detail: `${colorName(resigning)} resigned` };
    selected = null;
    selectedMoves = [];
    elements.boardNote.textContent = `${colorName(resigning)} resigned.`;
    render();
  }

  document.querySelectorAll('input[name="mode"]').forEach(input => input.addEventListener("change", updateSetup));
  elements.start.addEventListener("click", startGame);
  elements.setupButton.addEventListener("click", showSetup);
  elements.playAgain.addEventListener("click", showSetup);
  elements.rotate.addEventListener("click", () => { orientation = Chess.opposite(orientation); renderBoard(); });
  elements.resign.addEventListener("click", resignGame);
  updateSetup();
})();
