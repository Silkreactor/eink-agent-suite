(function (root, factory) {
  const engine = factory();
  if (typeof module === "object" && module.exports) module.exports = engine;
  root.AthenaQuestionEngine = engine;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const STOP_WORDS = new Set([
    "about", "after", "again", "also", "among", "because", "before", "being", "between",
    "both", "could", "does", "during", "each", "from", "have", "into", "more", "most",
    "other", "over", "same", "some", "such", "than", "that", "their", "there", "these",
    "they", "this", "those", "through", "under", "using", "very", "what", "when", "where",
    "which", "while", "with", "would", "your", "you", "were", "will", "been", "then",
    "only", "often", "much", "many", "make", "made", "like", "including", "however", "therefore"
  ]);

  function words(text) {
    return String(text || "").trim().match(/[A-Za-zÀ-ÖØ-öø-ÿ0-9]+(?:['’-][A-Za-zÀ-ÖØ-öø-ÿ0-9]+)*/g) || [];
  }

  function countWords(text) {
    return words(text).length;
  }

  function cleanSentence(sentence) {
    return sentence.replace(/\s+/g, " ").replace(/^[\s•*#\-–—]+/, "").trim();
  }

  function sentences(text) {
    const normalized = String(text || "").replace(/\r/g, "\n").replace(/\n+/g, ". ");
    const found = normalized.match(/[^.!?]+(?:[.!?]+|$)/g) || [];
    return found.map(cleanSentence).filter((sentence) => countWords(sentence) >= 5);
  }

  function tokenKey(token) {
    return token.toLocaleLowerCase("en").replace(/[’']/g, "").replace(/(?:'s|s)$/i, "");
  }

  function contentTokens(text) {
    return words(text)
      .map((token) => ({ raw: token, key: tokenKey(token) }))
      .filter(({ key }) => key.length >= 4 && !STOP_WORDS.has(key) && !/^\d+$/.test(key));
  }

  function keywordFrequencies(text) {
    const frequency = new Map();
    for (const token of contentTokens(text)) {
      const current = frequency.get(token.key) || { count: 0, display: token.raw };
      current.count += 1;
      if (token.raw.length > current.display.length) current.display = token.raw;
      frequency.set(token.key, current);
    }
    return frequency;
  }

  function sentenceCandidates(note) {
    const all = sentences(note);
    const fallback = cleanSentence(note);
    const source = all.length ? all : [fallback];
    const frequencies = keywordFrequencies(note);

    return source.map((sentence, index) => {
      const unique = [];
      const seen = new Set();
      for (const token of contentTokens(sentence)) {
        if (!seen.has(token.key)) {
          unique.push(token);
          seen.add(token.key);
        }
      }
      const score = unique.reduce((sum, token) => sum + (frequencies.get(token.key)?.count || 1), 0)
        + Math.min(countWords(sentence), 24) / 8
        + (index === 0 ? 0.75 : 0);
      return { sentence, index, unique, score };
    });
  }

  function chooseDistinctCandidates(note, total) {
    const candidates = sentenceCandidates(note).sort((a, b) => b.score - a.score || a.index - b.index);
    const chosen = [];
    const usedKeywords = new Set();

    while (chosen.length < total && candidates.length) {
      let bestIndex = 0;
      let bestAdjusted = -Infinity;
      candidates.forEach((candidate, index) => {
        const overlap = candidate.unique.filter((token) => usedKeywords.has(token.key)).length;
        const adjusted = candidate.score - overlap * 1.35;
        if (adjusted > bestAdjusted) {
          bestAdjusted = adjusted;
          bestIndex = index;
        }
      });
      const [picked] = candidates.splice(bestIndex, 1);
      chosen.push(picked);
      picked.unique.slice(0, 3).forEach((token) => usedKeywords.add(token.key));
    }

    while (chosen.length < total) chosen.push(chosen[chosen.length % Math.max(chosen.length, 1)] || sentenceCandidates(note)[0]);
    return chosen;
  }

  function rankedKeywords(candidate, frequencies) {
    return candidate.unique.slice().sort((a, b) => {
      const frequencyGap = (frequencies.get(b.key)?.count || 1) - (frequencies.get(a.key)?.count || 1);
      return frequencyGap || b.key.length - a.key.length || a.key.localeCompare(b.key);
    });
  }

  function generateWorksheet(title, note) {
    const safeTitle = String(title || "").trim();
    const safeNote = String(note || "").trim();
    const wordCount = countWords(safeNote);

    if (!safeTitle) throw new Error("Add a short title first.");
    if (wordCount < 100 || wordCount > 300) throw new Error("Use a note between 100 and 300 words.");

    const frequencies = keywordFrequencies(safeNote);
    const selected = chooseDistinctCandidates(safeNote, 3);
    const usedTopicKeys = new Set();
    const topics = selected.map((candidate) => {
      const ranked = rankedKeywords(candidate, frequencies);
      const picked = ranked.find((token) => !usedTopicKeys.has(token.key)) || ranked[0];
      if (picked) usedTopicKeys.add(picked.key);
      return picked?.raw || "the central idea";
    });

    const relationTerms = rankedKeywords(selected[1], frequencies)
      .filter((token) => tokenKey(token.raw) !== tokenKey(topics[1]));
    const secondTopic = relationTerms[0]?.raw || topics[0];

    const questions = [
      `What is the note's main point about ${topics[0]}?`,
      `How does the note connect ${topics[1]} with ${secondTopic}?`,
      `What specific detail does the note give about ${topics[2]}?`
    ];

    return {
      title: safeTitle,
      wordCount,
      questions,
      reflection: `Where could the idea about ${topics[0]} matter in your own experience, and what would you notice if it did?`,
      anchors: selected.map((candidate) => candidate.sentence)
    };
  }

  return { countWords, generateWorksheet, sentences };
});
