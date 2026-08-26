# Athena prototype

Status: **implemented local demo**, with physical-device and persistence work still planned.

Open `index.html` directly. The prototype accepts a 100–300 word note, deterministically produces exactly three grounded retrieval questions and one reflection prompt, and presents a one-page print layout. It makes no model call and does not save a learning record.

The PDF in `demo/` uses invented content. Do not use personal notes in screenshots, fixtures, or bug reports.

Run the checks:

```sh
node --test tests/question-engine.test.js
```

Not implemented: source ingestion, accounts, AI generation, device transfer, handwriting recognition, grading, saved results, or review scheduling.

