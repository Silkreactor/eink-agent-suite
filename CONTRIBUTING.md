# Contributing

Thanks for helping make calm, privacy-respecting e-ink workflows more useful.

## Before proposing a change

1. Keep the core workflow independent of a particular device or agent runtime.
2. Use invented data only in tests, fixtures, screenshots, PDFs, and examples.
3. Do not add credentials, runtime configuration, network coordinates, device identifiers, personal data, logs, or recovery instructions.
4. Label user-visible claims as **implemented**, **demo/experimental**, or **planned**.
5. Add or update a reproducible check for implemented behavior.

## Local checks

With Node.js 18 or newer:

```sh
node --test apps/athena/tests/question-engine.test.js
node --test apps/caissa/tests/chess.test.js
```

The browser prototypes have no third-party runtime dependencies. Open each `index.html` directly and check the primary interaction at both desktop and portrait widths.

## Scope

Good first contributions include accessibility improvements, synthetic fixtures, deterministic tests, documentation corrections, and device-neutral interface design. Production adapters, telemetry, cloud storage, authentication, and device maintenance need a separate security and privacy design before implementation.

## License

By contributing, you agree that your contribution is licensed under Apache License 2.0.
