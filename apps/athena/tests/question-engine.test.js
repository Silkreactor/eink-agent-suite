const test = require("node:test");
const assert = require("node:assert/strict");
const { countWords, generateWorksheet } = require("../question-engine.js");

const inventedNote = `Sleep is an active part of learning rather than a pause from it. During deep sleep, the brain replays patterns of activity connected with recent experiences. This replay helps stabilize new memories so they are less easily disrupted the next day. Different sleep stages appear to support different kinds of learning. Deep non-REM sleep is strongly linked with remembering facts and events, while REM sleep may help the brain integrate ideas and discover broader patterns. A full night matters because these stages repeat in cycles. Cutting the night short removes more of the later REM-rich cycles. Researchers also find that testing yourself before sleep can strengthen the material available for consolidation. In practice, a short retrieval session followed by adequate sleep may be more useful than an extra hour of tired rereading. Sleep does not replace practice, but it helps preserve and reorganize what practice has already changed in the brain.`;

test("counts ordinary words without persisting state", () => {
  assert.equal(countWords("one two three"), 3);
  assert.equal(countWords("don't re-read ideas"), 3);
});

test("produces exactly three deterministic grounded questions and one reflection", () => {
  const first = generateWorksheet("Why sleep strengthens memory", inventedNote);
  const second = generateWorksheet("Why sleep strengthens memory", inventedNote);

  assert.deepEqual(first, second);
  assert.equal(first.questions.length, 3);
  assert.ok(first.questions.every((question) => question.endsWith("?")));
  assert.ok(first.questions.every((question) => !question.includes("the central idea")));
  assert.ok(first.questions.some((question) => /sleep|memory|REM/i.test(question)));
  const relation = first.questions[1].match(/connect (.+) with (.+)\?$/i);
  assert.ok(relation);
  assert.notEqual(relation[1].toLowerCase(), relation[2].toLowerCase());
  assert.equal(typeof first.reflection, "string");
  assert.ok(first.reflection.endsWith("?"));
  assert.equal(first.anchors.length, 3);
  assert.ok(first.anchors.every((anchor) => inventedNote.includes(anchor)));
});

test("rejects missing titles and notes outside the v0 range", () => {
  assert.throws(() => generateWorksheet("", inventedNote), /title/i);
  assert.throws(() => generateWorksheet("Too short", "A small note."), /100 and 300/);
  assert.throws(() => generateWorksheet("Too long", Array(301).fill("word").join(" ")), /100 and 300/);
});
