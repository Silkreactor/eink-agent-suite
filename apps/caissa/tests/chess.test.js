"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const Chess = require("../src/chess.js");
const AI = require("../src/ai.js");

function play(state, from, to, promotion) {
  const move = Chess.findMove(state, from, to, promotion);
  assert.ok(move, `Expected ${from}${to}${promotion || ""} to be legal`);
  return Chess.playMove(state, move);
}

test("initial position has twenty legal moves and rejects an illegal pawn jump", () => {
  const state = Chess.initialState();
  assert.equal(Chess.legalMoves(state).length, 20);
  assert.equal(Chess.findMove(state, "e2", "e5"), null);
});

test("scripted Scholar's Mate path ends in checkmate", () => {
  let state = Chess.initialState();
  const sequence = [["e2","e4"],["e7","e5"],["d1","h5"],["b8","c6"],["f1","c4"],["g8","f6"]];
  for (const [from, to] of sequence) state = play(state, from, to);
  const mate = Chess.findMove(state, "h5", "f7");
  assert.equal(Chess.moveToSAN(state, mate), "Qxf7#");
  state = Chess.playMove(state, mate);
  assert.deepEqual(Chess.gameStatus(state), { over: true, type: "checkmate", winner: "w", inCheck: true });
});

test("castling moves both king and rook and removes castling rights", () => {
  let state = Chess.fromFEN("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1");
  state = play(state, "e1", "g1");
  assert.equal(state.board[Chess.squareToIndex("g1")], "K");
  assert.equal(state.board[Chess.squareToIndex("f1")], "R");
  assert.equal(state.board[Chess.squareToIndex("h1")], null);
  assert.equal(state.castling.K, false);
  assert.equal(state.castling.Q, false);
});

test("castling through an attacked square is illegal", () => {
  const state = Chess.fromFEN("4kr2/8/8/8/8/8/8/4K2R w K - 0 1");
  assert.equal(Chess.findMove(state, "e1", "g1"), null);
});

test("en passant removes the passed pawn", () => {
  let state = Chess.fromFEN("4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1");
  state = play(state, "e5", "d6");
  assert.equal(state.board[Chess.squareToIndex("d6")], "P");
  assert.equal(state.board[Chess.squareToIndex("d5")], null);
});

test("promotion supports the selected piece", () => {
  let state = Chess.fromFEN("4k3/P7/8/8/8/8/8/4K3 w - - 0 1");
  state = play(state, "a7", "a8", "n");
  assert.equal(state.board[Chess.squareToIndex("a8")], "N");
});

test("stalemate is distinguished from checkmate", () => {
  const state = Chess.fromFEN("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1");
  assert.deepEqual(Chess.gameStatus(state), { over: true, type: "stalemate", winner: null, inCheck: false });
});

test("all five local fallback levels return a legal move", () => {
  const state = Chess.initialState();
  const legalKeys = new Set(Chess.legalMoves(state).map(move => `${move.from}-${move.to}-${move.promotion || ""}`));
  for (let level = 1; level <= 5; level += 1) {
    const move = AI.chooseMove(state, level, { maxMs: 80, rng: () => 0.25 });
    assert.ok(move, `Level ${level} returned a move`);
    assert.ok(legalKeys.has(`${move.from}-${move.to}-${move.promotion || ""}`), `Level ${level} move is legal`);
  }
});
