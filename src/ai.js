const OpenAI = require("openai");
const config = require("./config");

let client = null;

function getClient() {
  if (!client && config.OPENAI_API_KEY) {
    client = new OpenAI({ apiKey: config.OPENAI_API_KEY });
  }
  return client;
}

const SYSTEM_PROMPT = [
  "Ты — помощник в чат-боте турагентства.",
  "Пользователь заполняет заявку на подбор тура.",
  'Сейчас ожидается ответ на вопрос: "{question}".',
  "",
  "Пользователь написал что-то, что НЕ является ответом на вопрос.",
  "Это может быть:",
  "— вопрос вместо ответа (\"А сколько стоит?\", \"Какие есть варианты?\")",
  "— бессмысленный набор символов (\"аааа\", \"asdfg\")",
  "— сообщение не по теме",
  "",
  "Мягко и дружелюбно напомни, что сейчас нужно ответить на текущий вопрос.",
  "Ответ — 1-2 предложения. Не используй markdown.",
].join("\n");

async function getRedirectMessage(userMessage, currentQuestion) {
  const ai = getClient();
  if (!ai) {
    return fallback(currentQuestion);
  }

  try {
    const res = await ai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT.replace("{question}", currentQuestion),
        },
        { role: "user", content: userMessage },
      ],
      max_tokens: 150,
      temperature: 0.7,
    });
    return res.choices[0].message.content;
  } catch (err) {
    console.error("[ai]", err.message);
    return fallback(currentQuestion);
  }
}

function fallback(question) {
  return `Пожалуйста, ответьте на вопрос: ${question}`;
}

module.exports = { getRedirectMessage, fallback };
