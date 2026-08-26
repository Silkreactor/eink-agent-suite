(function (root, factory) {
  const api = factory(root.CaissaChess || (typeof require === "function" ? require("./chess.js") : null));
  if (typeof module === "object" && module.exports) module.exports = api;
  root.CaissaAI = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Chess) {
  "use strict";

  const VALUES = { p: 100, n: 320, b: 335, r: 500, q: 900, k: 0 };
  const LEVELS = {
    1: { name: "Gentle", depth: 0, time: 40 },
    2: { name: "Easy", depth: 1, time: 90 },
    3: { name: "Club", depth: 2, time: 350 },
    4: { name: "Hard", depth: 3, time: 900 },
    5: { name: "Maximum", depth: 4, time: 1800 }
  };

  function evaluateWhite(state) {
    let score = 0;
    for (let index = 0; index < 64; index += 1) {
      const piece = state.board[index];
      if (!piece) continue;
      const color = Chess.colorOf(piece);
      const type = Chess.typeOf(piece);
      const row = Math.floor(index / 8);
      const col = index % 8;
      const center = 7 - (Math.abs(3.5 - row) + Math.abs(3.5 - col));
      let bonus = 0;
      if (["n", "b"].includes(type)) bonus += center * 4;
      if (type === "p") bonus += (color === "w" ? 6 - row : row - 1) * 6;
      if (type === "q") bonus += center;
      const value = VALUES[type] + bonus;
      score += color === "w" ? value : -value;
    }
    return score;
  }

  function sideEvaluation(state) {
    const white = evaluateWhite(state);
    return state.turn === "w" ? white : -white;
  }

  function movePriority(state, move) {
    const moving = state.board[move.from];
    const captured = move.enPassant ? "p" : state.board[move.to];
    let score = move.promotion ? VALUES[move.promotion] + 800 : 0;
    if (captured) score += 10 * VALUES[Chess.typeOf(captured)] - VALUES[Chess.typeOf(moving)];
    if (move.castle) score += 80;
    return score;
  }

  function orderedMoves(state) {
    return Chess.legalMoves(state).sort((a, b) => movePriority(state, b) - movePriority(state, a));
  }

  function negamax(state, depth, alpha, beta, started, limit, counter) {
    counter.nodes += 1;
    if ((counter.nodes & 255) === 0 && Date.now() - started > limit) throw new Error("SEARCH_TIMEOUT");
    const moves = orderedMoves(state);
    if (!moves.length) return Chess.isInCheck(state, state.turn) ? -100000 + counter.ply : 0;
    if (depth === 0) return sideEvaluation(state);
    let best = -Infinity;
    counter.ply += 1;
    for (const move of moves) {
      const next = Chess._applyUnchecked(state, move, false);
      const score = -negamax(next, depth - 1, -beta, -alpha, started, limit, counter);
      if (score > best) best = score;
      if (score > alpha) alpha = score;
      if (alpha >= beta) break;
    }
    counter.ply -= 1;
    return best;
  }

  function rankAtDepth(state, depth, started, limit) {
    const moves = orderedMoves(state);
    const ranked = [];
    for (const move of moves) {
      const next = Chess._applyUnchecked(state, move, false);
      const counter = { nodes: 0, ply: 1 };
      const score = -negamax(next, Math.max(0, depth - 1), -Infinity, Infinity, started, limit, counter);
      ranked.push({ move, score });
    }
    ranked.sort((a, b) => b.score - a.score);
    return ranked;
  }

  function randomItem(items, rng) { return items[Math.floor(rng() * items.length)]; }

  function chooseMove(state, level, options) {
    const settings = LEVELS[level] || LEVELS[3];
    const opts = options || {};
    const rng = opts.rng || Math.random;
    const legal = Chess.legalMoves(state);
    if (!legal.length) return null;
    if (Number(level) === 1) {
      const quiet = legal.filter(move => !move.capture && !move.promotion);
      return randomItem(quiet.length && rng() < 0.75 ? quiet : legal, rng);
    }

    const started = Date.now();
    const limit = opts.maxMs || settings.time;
    let ranked = legal.map(move => ({ move, score: 0 }));
    for (let depth = 1; depth <= settings.depth; depth += 1) {
      try { ranked = rankAtDepth(state, depth, started, limit); }
      catch (error) {
        if (error.message !== "SEARCH_TIMEOUT") throw error;
        break;
      }
      if (Date.now() - started > limit) break;
    }

    if (Number(level) === 2) return randomItem(ranked.slice(0, Math.max(2, Math.ceil(ranked.length * 0.45))), rng).move;
    if (Number(level) === 3) return randomItem(ranked.slice(0, Math.min(3, ranked.length)), rng).move;
    if (Number(level) === 4 && ranked.length > 1 && rng() < 0.18) return ranked[1].move;
    return ranked[0].move;
  }

  return { LEVELS, chooseMove, evaluateWhite };
});
