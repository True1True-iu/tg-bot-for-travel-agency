const fs = require("fs");
const path = require("path");

const KNOWLEDGE_PATH = path.resolve(__dirname, "..", "knowledge.txt");
const INDEX_DIR = path.resolve(__dirname, "..", "data");
const INDEX_PATH = path.resolve(INDEX_DIR, "knowledge.index.json");

function tokenize(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-zа-яё0-9\s-]/gi, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

function parseFaqEntries(raw) {
  const lines = raw.split(/\r?\n/);
  const entries = [];
  let current = null;

  for (const line of lines) {
    const q = line.match(/^\s*(\d+)\)\s*Вопрос\s*->\s*(.+)\s*$/i);
    if (q) {
      if (current && current.question && current.answer) {
        entries.push(current);
      }
      current = {
        id: Number(q[1]),
        question: q[2].trim(),
        answer: "",
      };
      continue;
    }

    const a = line.match(/^\s*Ответ\s*->\s*(.+)\s*$/i);
    if (a && current) {
      current.answer = a[1].trim();
    }
  }

  if (current && current.question && current.answer) {
    entries.push(current);
  }

  return entries.sort((x, y) => x.id - y.id);
}

function buildIndex(entries) {
  const chunks = entries.map((entry) => {
    const text = `Вопрос: ${entry.question}\nОтвет: ${entry.answer}`;
    const freq = {};
    for (const token of tokenize(text)) {
      freq[token] = (freq[token] || 0) + 1;
    }
    return {
      id: entry.id,
      question: entry.question,
      answer: entry.answer,
      text,
      token_freq: freq,
    };
  });

  const docsCount = chunks.length;
  const df = {};
  for (const chunk of chunks) {
    for (const token of Object.keys(chunk.token_freq)) {
      df[token] = (df[token] || 0) + 1;
    }
  }

  const idf = {};
  for (const [token, count] of Object.entries(df)) {
    idf[token] = Math.log((docsCount + 1) / (count + 1)) + 1;
  }

  return {
    version: 1,
    source_file: "knowledge.txt",
    generated_at: new Date().toISOString(),
    docs_count: docsCount,
    idf,
    chunks,
  };
}

function main() {
  if (!fs.existsSync(KNOWLEDGE_PATH)) {
    console.error("[index] knowledge.txt not found:", KNOWLEDGE_PATH);
    process.exit(1);
  }

  const raw = fs.readFileSync(KNOWLEDGE_PATH, "utf-8");
  const entries = parseFaqEntries(raw);
  if (entries.length === 0) {
    console.error("[index] no FAQ entries found in knowledge.txt");
    process.exit(1);
  }

  const index = buildIndex(entries);
  fs.mkdirSync(INDEX_DIR, { recursive: true });
  fs.writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2), "utf-8");

  console.log(
    `[index] done: ${index.docs_count} chunks -> ${INDEX_PATH.replace(/\\/g, "/")}`,
  );
}

main();
