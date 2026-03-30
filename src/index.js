const { Telegraf } = require("telegraf");
const { HttpsProxyAgent } = require("https-proxy-agent");
const config = require("./config");
const { registerHandlers } = require("./handlers");
const { initSheet, isConfigured } = require("./sheets");

if (!config.BOT_TOKEN) {
  console.error("BOT_TOKEN не задан. Создайте .env файл (см. .env.example)");
  process.exit(1);
}

const telegrafOptions = {};
if (config.HTTPS_PROXY) {
  const agent = new HttpsProxyAgent(config.HTTPS_PROXY);
  telegrafOptions.telegram = {
    agent,
    apiRoot: "https://api.telegram.org",
  };
  console.log("Прокси:", config.HTTPS_PROXY);
}

const bot = new Telegraf(config.BOT_TOKEN, telegrafOptions);

registerHandlers(bot);

async function start() {
  if (isConfigured()) {
    try {
      await initSheet();
    } catch (err) {
      console.error("[sheets] Ошибка подключения:", err.message);
      console.warn("[sheets] Бот продолжит работу без Google Sheets");
    }
  } else {
    console.warn(
      "[sheets] Заполните GOOGLE_SHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY в .env",
    );
  }

  const me = await bot.telegram.getMe();
  console.log(`\u{1F916} Бот @${me.username} запущен`);
  await bot.launch();
}

start().catch((err) => {
  console.error("Ошибка запуска:", err.message);
  process.exit(1);
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
