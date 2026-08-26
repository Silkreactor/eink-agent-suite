(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.CaissaChess = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const FILES = "abcdefgh";
  const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  const KNIGHT_STEPS = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
  const KING_STEPS = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
  const BISHOP_DIRS = [[-1,-1],[-1,1],[1,-1],[1,1]];
  const ROOK_DIRS = [[-1,0],[1,0],[0,-1],[0,1]];

  function indexToSquare(index) {
    return FILES[index % 8] + (8 - Math.floor(index / 8));
  }

  function squareToIndex(square) {
    if (!/^[a-h][1-8]$/.test(square)) return -1;
    return (8 - Number(square[1])) * 8 + FILES.indexOf(square[0]);
  }

  function colorOf(piece) {
    if (!piece) return null;
    return piece === piece.toUpperCase() ? "w" : "b";
  }

  function typeOf(piece) {
    return piece ? piece.toLowerCase() : null;
  }

  function opposite(color) { return color === "w" ? "b" : "w"; }
  function inBounds(row, col) { return row >= 0 && row < 8 && col >= 0 && col < 8; }

  function positionKey(state) {
    return boardField(state) + " " + state.turn + " " + castlingField(state) + " " + (state.enPassant == null ? "-" : indexToSquare(state.enPassant));
  }

  function boardField(state) {
    const rows = [];
    for (let row = 0; row < 8; row += 1) {
      let text = "";
      let empty = 0;
      for (let col = 0; col < 8; col += 1) {
        const piece = state.board[row * 8 + col];
        if (!piece) empty += 1;
        else {
          if (empty) text += empty;
          text += piece;
          empty = 0;
        }
      }
      if (empty) text += empty;
      rows.push(text);
    }
    return rows.join("/");
  }

  function castlingField(state) {
    const value = ["K","Q","k","q"].filter(key => state.castling[key]).join("");
    return value || "-";
  }

  function fromFEN(fen) {
    const fields = fen.trim().split(/\s+/);
    if (fields.length < 4) throw new Error("Invalid FEN: expected at least four fields");
    const rows = fields[0].split("/");
    if (rows.length !== 8) throw new Error("Invalid FEN: expected eight ranks");
    const board = [];
    for (const row of rows) {
      for (const token of row) {
        if (/\d/.test(token)) board.push(...Array(Number(token)).fill(null));
        else if (/[prnbqkPRNBQK]/.test(token)) board.push(token);
        else throw new Error("Invalid FEN board token");
      }
    }
    if (board.length !== 64) throw new Error("Invalid FEN board width");
    const state = {
      board,
      turn: fields[1],
      castling: { K: fields[2].includes("K"), Q: fields[2].includes("Q"), k: fields[2].includes("k"), q: fields[2].includes("q") },
      enPassant: fields[3] === "-" ? null : squareToIndex(fields[3]),
      halfmove: Number(fields[4] || 0),
      fullmove: Number(fields[5] || 1),
      lastMove: null,
      positionCounts: Object.create(null)
    };
    state.positionCounts[positionKey(state)] = 1;
    return state;
  }

  function initialState() { return fromFEN(START_FEN); }

  function toFEN(state) {
    return [boardField(state), state.turn, castlingField(state), state.enPassant == null ? "-" : indexToSquare(state.enPassant), state.halfmove, state.fullmove].join(" ");
  }

  function cloneState(state) {
    return {
      board: state.board.slice(), turn: state.turn, castling: { ...state.castling },
      enPassant: state.enPassant, halfmove: state.halfmove, fullmove: state.fullmove,
      lastMove: state.lastMove ? { ...state.lastMove } : null,
      positionCounts: Object.assign(Object.create(null), state.positionCounts || {})
    };
  }

  function isSquareAttacked(state, square, byColor) {
    const row = Math.floor(square / 8);
    const col = square % 8;
    const pawnSourceRow = row + (byColor === "w" ? 1 : -1);
    const pawn = byColor === "w" ? "P" : "p";
    for (const dc of [-1, 1]) {
      if (inBounds(pawnSourceRow, col + dc) && state.board[pawnSourceRow * 8 + col + dc] === pawn) return true;
    }
    const knight = byColor === "w" ? "N" : "n";
    for (const [dr, dc] of KNIGHT_STEPS) {
      if (inBounds(row + dr, col + dc) && state.board[(row + dr) * 8 + col + dc] === knight) return true;
    }
    const king = byColor === "w" ? "K" : "k";
    for (const [dr, dc] of KING_STEPS) {
      if (inBounds(row + dr, col + dc) && state.board[(row + dr) * 8 + col + dc] === king) return true;
    }
    for (const [dirs, types] of [[BISHOP_DIRS, ["b", "q"]], [ROOK_DIRS, ["r", "q"]]]) {
      for (const [dr, dc] of dirs) {
        let r = row + dr;
        let c = col + dc;
        while (inBounds(r, c)) {
          const piece = state.board[r * 8 + c];
          if (piece) {
            if (colorOf(piece) === byColor && types.includes(typeOf(piece))) return true;
            break;
          }
          r += dr;
          c += dc;
        }
      }
    }
    return false;
  }

  function kingIndex(state, color) {
    return state.board.indexOf(color === "w" ? "K" : "k");
  }

  function isInCheck(state, color) {
    const king = kingIndex(state, color);
    return king >= 0 && isSquareAttacked(state, king, opposite(color));
  }

  function addPawnMoves(state, moves, from, row, col, color) {
    const direction = color === "w" ? -1 : 1;
    const startRow = color === "w" ? 6 : 1;
    const promotionRow = color === "w" ? 0 : 7;
    const oneRow = row + direction;
    const add = (to, flags) => {
      if (Math.floor(to / 8) === promotionRow) {
        for (const promotion of ["q", "r", "b", "n"]) moves.push({ from, to, promotion, ...flags });
      } else moves.push({ from, to, ...flags });
    };
    if (inBounds(oneRow, col) && !state.board[oneRow * 8 + col]) {
      add(oneRow * 8 + col, {});
      const twoRow = row + direction * 2;
      if (row === startRow && !state.board[twoRow * 8 + col]) add(twoRow * 8 + col, { doublePawn: true });
    }
    for (const dc of [-1, 1]) {
      const targetRow = row + direction;
      const targetCol = col + dc;
      if (!inBounds(targetRow, targetCol)) continue;
      const to = targetRow * 8 + targetCol;
      const target = state.board[to];
      if (target && colorOf(target) !== color && typeOf(target) !== "k") add(to, { capture: true });
      else if (to === state.enPassant) add(to, { capture: true, enPassant: true });
    }
  }

  function addSlidingMoves(state, moves, from, row, col, color, directions) {
    for (const [dr, dc] of directions) {
      let r = row + dr;
      let c = col + dc;
      while (inBounds(r, c)) {
        const to = r * 8 + c;
        const target = state.board[to];
        if (!target) moves.push({ from, to });
        else {
          if (colorOf(target) !== color && typeOf(target) !== "k") moves.push({ from, to, capture: true });
          break;
        }
        r += dr;
        c += dc;
      }
    }
  }

  function pseudoMoves(state) {
    const moves = [];
    const color = state.turn;
    for (let from = 0; from < 64; from += 1) {
      const piece = state.board[from];
      if (!piece || colorOf(piece) !== color) continue;
      const row = Math.floor(from / 8);
      const col = from % 8;
      const type = typeOf(piece);
      if (type === "p") addPawnMoves(state, moves, from, row, col, color);
      else if (type === "n" || type === "k") {
        const steps = type === "n" ? KNIGHT_STEPS : KING_STEPS;
        for (const [dr, dc] of steps) {
          const r = row + dr;
          const c = col + dc;
          if (!inBounds(r, c)) continue;
          const to = r * 8 + c;
          const target = state.board[to];
          if (!target) moves.push({ from, to });
          else if (colorOf(target) !== color && typeOf(target) !== "k") moves.push({ from, to, capture: true });
        }
      } else if (type === "b") addSlidingMoves(state, moves, from, row, col, color, BISHOP_DIRS);
      else if (type === "r") addSlidingMoves(state, moves, from, row, col, color, ROOK_DIRS);
      else if (type === "q") addSlidingMoves(state, moves, from, row, col, color, BISHOP_DIRS.concat(ROOK_DIRS));

      if (type === "k" && !isInCheck(state, color)) {
        const enemy = opposite(color);
        if (color === "w" && from === 60) {
          if (state.castling.K && state.board[63] === "R" && !state.board[61] && !state.board[62] && !isSquareAttacked(state, 61, enemy) && !isSquareAttacked(state, 62, enemy)) moves.push({ from, to: 62, castle: "K" });
          if (state.castling.Q && state.board[56] === "R" && !state.board[59] && !state.board[58] && !state.board[57] && !isSquareAttacked(state, 59, enemy) && !isSquareAttacked(state, 58, enemy)) moves.push({ from, to: 58, castle: "Q" });
        } else if (color === "b" && from === 4) {
          if (state.castling.k && state.board[7] === "r" && !state.board[5] && !state.board[6] && !isSquareAttacked(state, 5, enemy) && !isSquareAttacked(state, 6, enemy)) moves.push({ from, to: 6, castle: "k" });
          if (state.castling.q && state.board[0] === "r" && !state.board[3] && !state.board[2] && !state.board[1] && !isSquareAttacked(state, 3, enemy) && !isSquareAttacked(state, 2, enemy)) moves.push({ from, to: 2, castle: "q" });
        }
      }
    }
    return moves;
  }

  function applyUnchecked(state, move, recordPosition) {
    const next = cloneState(state);
    const piece = next.board[move.from];
    const color = colorOf(piece);
    const captured = move.enPassant ? next.board[move.to + (color === "w" ? 8 : -8)] : next.board[move.to];
    next.board[move.from] = null;
    if (move.enPassant) next.board[move.to + (color === "w" ? 8 : -8)] = null;
    next.board[move.to] = move.promotion ? (color === "w" ? move.promotion.toUpperCase() : move.promotion) : piece;

    if (move.castle) {
      const rookMoves = { K: [63,61], Q: [56,59], k: [7,5], q: [0,3] };
      const [rookFrom, rookTo] = rookMoves[move.castle];
      next.board[rookTo] = next.board[rookFrom];
      next.board[rookFrom] = null;
    }

    if (typeOf(piece) === "k") {
      if (color === "w") { next.castling.K = false; next.castling.Q = false; }
      else { next.castling.k = false; next.castling.q = false; }
    }
    if (move.from === 63 || move.to === 63) next.castling.K = false;
    if (move.from === 56 || move.to === 56) next.castling.Q = false;
    if (move.from === 7 || move.to === 7) next.castling.k = false;
    if (move.from === 0 || move.to === 0) next.castling.q = false;

    next.enPassant = move.doublePawn ? (move.from + move.to) / 2 : null;
    next.halfmove = typeOf(piece) === "p" || captured ? 0 : state.halfmove + 1;
    next.fullmove = state.fullmove + (color === "b" ? 1 : 0);
    next.turn = opposite(state.turn);
    next.lastMove = { ...move, piece, captured: captured || null };
    if (recordPosition) {
      const key = positionKey(next);
      next.positionCounts[key] = (next.positionCounts[key] || 0) + 1;
    }
    return next;
  }

  function legalMoves(state) {
    const movingColor = state.turn;
    return pseudoMoves(state).filter(move => !isInCheck(applyUnchecked(state, move, false), movingColor));
  }

  function legalMovesFrom(state, square) {
    const from = typeof square === "number" ? square : squareToIndex(square);
    return legalMoves(state).filter(move => move.from === from);
  }

  function findMove(state, fromSquare, toSquare, promotion) {
    const from = typeof fromSquare === "number" ? fromSquare : squareToIndex(fromSquare);
    const to = typeof toSquare === "number" ? toSquare : squareToIndex(toSquare);
    const candidates = legalMoves(state).filter(move => move.from === from && move.to === to);
    if (!candidates.length) return null;
    return candidates.find(move => (move.promotion || null) === (promotion || null)) || candidates.find(move => move.promotion === "q") || candidates[0];
  }

  function playMove(state, moveOrFrom, toSquare, promotion) {
    const move = typeof moveOrFrom === "object" ? legalMoves(state).find(candidate => candidate.from === moveOrFrom.from && candidate.to === moveOrFrom.to && (candidate.promotion || null) === (moveOrFrom.promotion || null)) : findMove(state, moveOrFrom, toSquare, promotion);
    if (!move) throw new Error("Illegal move");
    return applyUnchecked(state, move, true);
  }

  function isInsufficientMaterial(state) {
    const pieces = [];
    for (let i = 0; i < 64; i += 1) {
      const piece = state.board[i];
      if (piece && typeOf(piece) !== "k") pieces.push({ piece, index: i });
    }
    if (!pieces.length) return true;
    if (pieces.some(item => ["p", "r", "q"].includes(typeOf(item.piece)))) return false;
    if (pieces.length === 1) return true;
    if (pieces.every(item => typeOf(item.piece) === "b")) {
      const colors = pieces.map(item => (Math.floor(item.index / 8) + item.index % 8) % 2);
      return colors.every(color => color === colors[0]);
    }
    return false;
  }

  function gameStatus(state) {
    const moves = legalMoves(state);
    const check = isInCheck(state, state.turn);
    if (!moves.length) {
      if (check) return { over: true, type: "checkmate", winner: opposite(state.turn), inCheck: true };
      return { over: true, type: "stalemate", winner: null, inCheck: false };
    }
    if (state.halfmove >= 100) return { over: true, type: "fifty-move", winner: null, inCheck: check };
    if (isInsufficientMaterial(state)) return { over: true, type: "insufficient-material", winner: null, inCheck: check };
    if ((state.positionCounts[positionKey(state)] || 0) >= 3) return { over: true, type: "repetition", winner: null, inCheck: check };
    return { over: false, type: check ? "check" : "playing", winner: null, inCheck: check };
  }

  function moveToSAN(state, move) {
    const piece = state.board[move.from];
    let san;
    if (move.castle) san = move.to > move.from ? "O-O" : "O-O-O";
    else {
      const type = typeOf(piece);
      const capture = Boolean(move.capture || state.board[move.to]);
      const destination = indexToSquare(move.to);
      if (type === "p") san = (capture ? FILES[move.from % 8] + "x" : "") + destination;
      else {
        const peers = legalMoves(state).filter(candidate => candidate.to === move.to && candidate.from !== move.from && typeOf(state.board[candidate.from]) === type);
        let disambiguation = "";
        if (peers.length) {
          const sameFile = peers.some(candidate => candidate.from % 8 === move.from % 8);
          const sameRank = peers.some(candidate => Math.floor(candidate.from / 8) === Math.floor(move.from / 8));
          disambiguation = !sameFile ? FILES[move.from % 8] : !sameRank ? String(8 - Math.floor(move.from / 8)) : indexToSquare(move.from);
        }
        san = type.toUpperCase() + disambiguation + (capture ? "x" : "") + destination;
      }
      if (move.promotion) san += "=" + move.promotion.toUpperCase();
    }
    const after = applyUnchecked(state, move, false);
    const status = gameStatus(after);
    if (status.type === "checkmate") san += "#";
    else if (status.inCheck) san += "+";
    return san;
  }

  return {
    START_FEN, initialState, fromFEN, toFEN, cloneState, positionKey,
    indexToSquare, squareToIndex, colorOf, typeOf, opposite,
    isSquareAttacked, isInCheck, legalMoves, legalMovesFrom, findMove,
    playMove, gameStatus, moveToSAN, isInsufficientMaterial,
    _applyUnchecked: applyUnchecked
  };
});
