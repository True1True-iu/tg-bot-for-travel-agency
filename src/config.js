require("dotenv").config();

const HTTPS_PROXY = process.env.HTTPS_PROXY;

// Прокси передаём только Telegraf вручную через agent.
// Убираем из process.env, чтобы Google-библиотеки (gaxios) не подхватывали.
delete process.env.HTTPS_PROXY;
delete process.env.https_proxy;

module.exports = {
  BOT_TOKEN: process.env.BOT_TOKEN,
  HTTPS_PROXY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  GOOGLE_SHEET_ID: process.env.GOOGLE_SHEET_ID,
  GOOGLE_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
};
