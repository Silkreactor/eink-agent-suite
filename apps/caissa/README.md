# Caissa prototype

Status: **implemented local browser prototype** plus a narrow **experimental AppLoad frontend**.

Open `index.html` directly, or run the optional loopback preview server:

```sh
node scripts/serve.js
```

The browser prototype includes local validation for normal and special legal moves, two-player play, five test-opponent profiles, side choice, rotation, resignation, and game-end handling. The fallback opponent is deliberately not described as Stockfish, calibrated strength, or production AI.

Run the checks:

```sh
node --test tests/chess.test.js
```

`experiments/appload/` contains a frontend-only interaction calibration: select the white pawn on e2, move it to e4, reset, and close. It is not the full chess game, has not completed public physical-device acceptance, and should not be installed from this repository without a separate device-safe procedure.

Not implemented: production chess engine, Hermes connection, calibrated levels, saved games, production coaching, full AppLoad backend, or automated installation.
