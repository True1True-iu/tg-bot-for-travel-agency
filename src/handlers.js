const { Markup } = require("telegraf");
const { State, STEPS, getStepByState, getNextState } = require("./states");
const { getSession, resetSession } = require("./session");
const { getRedirectMessage, fallback } = require("./ai");
const {
  appendRow,
  findActiveRequest,
  cancelRequest,
  isConfigured,
} = require("./sheets");

const WELCOME =
  "Добро пожаловать в турагентство! \u{1F334}\n\n" +
  "Я помогу оформить заявку на подбор тура.";

const btnStart = Markup.inlineKeyboard([
  [Markup.button.callback("\u{1F3D6} Подобрать тур", "start_flow")],
]);

function menuKeyboard() {
  const rows = [
    [Markup.button.callback("\u{1F3D6} Подобрать тур", "start_flow")],
  ];
  if (isConfigured()) {
    rows.push([
      Markup.button.callback("\u{1F4CB} Моя заявка", "my_request")],
    );
  }
  return Markup.inlineKeyboard(rows);
}

function looksLikeQuestion(text) {
  if (text.includes("?")) return true;
  return /^(а |как |что |где |когда |почему |зачем |сколько стоит|можно ли|подскаж)/i.test(
    text,
  );
}

function looksLikeGibberish(text) {
  const noEmoji = text
    .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}\uFE0F\u200D]/gu, "")
    .trim();
  if (noEmoji.length === 0) return true;

  if (/^(.)\1{2,}$/u.test(text)) return true;

  if (text.length <= 2 && !/^\d+$/.test(text)) return true;

  if (!/[a-zA-Zа-яА-ЯёЁ\d]/u.test(text)) return true;

  return false;
}

const RU_CONSONANTS = "бвгджзйклмнпрстфхцчшщъь";
const EN_CONSONANTS = "bcdfghjklmnpqrstvwxyz";
const CONSONANTS_RE = new RegExp(
  `[${RU_CONSONANTS}${EN_CONSONANTS}]{4,}`,
  "i",
);
const NUMBER_WORDS_RE =
  /(?:один|одна|два|две|три|четыр|пят|шест|сем|восем|девят|десят|двое|трое|четверо)/i;

const fieldValidators = {
  name(text) {
    if (/\d/.test(text)) return "Имя не должно содержать цифры.";
    const letters = text.replace(/[^a-zA-Zа-яА-ЯёЁ]/gu, "");
    if (letters.length < 2) return null;
    if (CONSONANTS_RE.test(text))
      return "Пожалуйста, введите настоящее имя.";
    return null;
  },
  peopleCount(text) {
    if (/\d/.test(text)) return null;
    if (NUMBER_WORDS_RE.test(text)) return null;
    return "Укажите количество человек (например, 2 взрослых, 1 ребёнок).";
  },
  budget(text) {
    if (/\d/.test(text)) return null;
    if (/не знаю|любой|без ограничен|не важно|неважно/i.test(text)) return null;
    return "Укажите бюджет (например, 150 000 руб. или «без ограничений»).";
  },
};

function buildSummary(data) {
  return STEPS.map(
    (s) => `${s.emoji} ${s.label}: ${data[s.field] || "\u2014"}`,
  ).join("\n");
}

function buildSheetSummary(d) {
  return [
    `\u{1F464} Имя: ${d.name}`,
    `\u{1F30D} Направление: ${d.destination}`,
    `\u{1F4C5} Даты: ${d.dates}`,
    `\u{1F465} Кол-во: ${d.peopleCount}`,
    `\u{1F4B0} Бюджет: ${d.budget}`,
    `\u2708\uFE0F Город вылета: ${d.departureCity}`,
    `\u{1F4DE} Телефон: ${d.phone}`,
    `\u{1F4CC} Статус: ${d.status}`,
    `\u{1F4C6} Дата заявки: ${d.date}`,
  ].join("\n");
}

function sendConfirmation(ctx, session) {
  return ctx.reply(
    `\u{1F4CB} Ваша заявка:\n\n${buildSummary(session.data)}\n\nВсё верно?`,
    Markup.inlineKeyboard([
      [Markup.button.callback("\u2705 Отправить", "confirm_submit")],
      [Markup.button.callback("\u270F\uFE0F Изменить", "edit_field")],
      [Markup.button.callback("\u274C Отменить", "confirm_cancel")],
    ]),
  );
}

function registerHandlers(bot) {
  bot.start((ctx) => {
    resetSession(ctx.chat.id);
    return ctx.reply(WELCOME, menuKeyboard());
  });

  bot.command("cancel", (ctx) => {
    const session = getSession(ctx.chat.id);
    if (session.state === State.IDLE) {
      return ctx.reply("Нет активной заявки для отмены.");
    }
    resetSession(ctx.chat.id);
    return ctx.reply("Заявка отменена.", menuKeyboard());
  });

  /* ─── просмотр отправленной заявки ─── */

  bot.command("status", async (ctx) => {
    const result = await findActiveRequest(ctx.chat.id);
    if (!result) {
      return ctx.reply("У вас нет активных заявок.", menuKeyboard());
    }
    return ctx.reply(
      `\u{1F4CB} Ваша заявка:\n\n${buildSheetSummary(result.data)}`,
      Markup.inlineKeyboard([
        [Markup.button.callback("\u274C Отменить заявку", "cancel_submitted")],
      ]),
    );
  });

  bot.action("my_request", async (ctx) => {
    ctx.answerCbQuery();
    const result = await findActiveRequest(ctx.chat.id);
    if (!result) {
      return ctx.reply("У вас нет активных заявок.", menuKeyboard());
    }
    return ctx.reply(
      `\u{1F4CB} Ваша заявка:\n\n${buildSheetSummary(result.data)}`,
      Markup.inlineKeyboard([
        [Markup.button.callback("\u274C Отменить заявку", "cancel_submitted")],
      ]),
    );
  });

  bot.action("cancel_submitted", async (ctx) => {
    ctx.answerCbQuery();
    const ok = await cancelRequest(ctx.chat.id);
    if (ok) {
      return ctx.reply(
        "\u2705 Заявка отменена. Можете подать новую.",
        menuKeyboard(),
      );
    }
    return ctx.reply("Активная заявка не найдена.", menuKeyboard());
  });

  /* ─── начать заполнение ─── */

  bot.action("start_flow", (ctx) => {
    ctx.answerCbQuery();
    const session = getSession(ctx.chat.id);
    session.state = State.AWAITING_NAME;
    session.data = {};
    session.editingField = null;
    return ctx.reply(STEPS[0].prompt);
  });

  /* ─── редактирование полей перед отправкой ─── */

  bot.action("edit_field", (ctx) => {
    ctx.answerCbQuery();
    const buttons = STEPS.map((step) => [
      Markup.button.callback(
        `${step.emoji} ${step.label}`,
        `edit:${step.field}`,
      ),
    ]);
    buttons.push([
      Markup.button.callback("\u21A9\uFE0F Назад", "back_to_confirm"),
    ]);
    return ctx.reply(
      "Какое поле хотите изменить?",
      Markup.inlineKeyboard(buttons),
    );
  });

  for (const step of STEPS) {
    bot.action(`edit:${step.field}`, (ctx) => {
      ctx.answerCbQuery();
      const session = getSession(ctx.chat.id);
      session.state = step.state;
      session.editingField = step.field;
      return ctx.reply(step.prompt);
    });
  }

  bot.action("back_to_confirm", (ctx) => {
    ctx.answerCbQuery();
    const session = getSession(ctx.chat.id);
    session.state = State.CONFIRM;
    return sendConfirmation(ctx, session);
  });

  /* ─── подтверждение ─── */

  bot.action("confirm_submit", async (ctx) => {
    ctx.answerCbQuery();
    const session = getSession(ctx.chat.id);

    try {
      await appendRow({
        ...session.data,
        chatId: ctx.chat.id,
        username: ctx.from?.username,
      });
      resetSession(ctx.chat.id);
      return ctx.reply(
        "\u2705 Заявка отправлена! Менеджер свяжется с вами в ближайшее время.\n\n" +
          "Проверить статус — /status\n" +
          "Новая заявка — /start",
      );
    } catch (err) {
      console.error("[sheets]", err.message);
      return ctx.reply(
        "Произошла ошибка при сохранении заявки. Попробуйте позже или напишите /start",
      );
    }
  });

  bot.action("confirm_cancel", (ctx) => {
    ctx.answerCbQuery();
    resetSession(ctx.chat.id);
    return ctx.reply("Заявка отменена.", menuKeyboard());
  });

  /* ─── текстовые сообщения — FSM ─── */

  bot.on("text", async (ctx) => {
    if (ctx.message.text.startsWith("/")) return;

    const session = getSession(ctx.chat.id);
    const text = ctx.message.text.trim();

    if (session.state === State.IDLE) {
      return ctx.reply(
        "Нажмите кнопку ниже, чтобы начать оформление заявки.",
        menuKeyboard(),
      );
    }

    if (session.state === State.CONFIRM) {
      return ctx.reply(
        "Пожалуйста, используйте кнопки для подтверждения, изменения или отмены заявки.",
      );
    }

    const step = getStepByState(session.state);
    if (!step) return;

    if (looksLikeGibberish(text)) {
      const msg = await getRedirectMessage(text, step.prompt);
      return ctx.reply(msg);
    }

    const validator = fieldValidators[step.field];
    if (validator) {
      const err = validator(text);
      if (err) {
        return ctx.reply(`${err}\n\n${step.prompt}`);
      }
    }

    if (step.field === "phone") {
      const cleaned = text.replace(/[\s\-()]/g, "");
      if (!/^\+?\d{10,15}$/.test(cleaned)) {
        const msg = await getRedirectMessage(text, step.prompt);
        return ctx.reply(msg);
      }
    }

    if (step.field !== "phone" && looksLikeQuestion(text)) {
      const msg = await getRedirectMessage(text, step.prompt);
      return ctx.reply(msg);
    }

    session.data[step.field] = text;

    if (session.editingField) {
      session.editingField = null;
      session.state = State.CONFIRM;
      return sendConfirmation(ctx, session);
    }

    const nextState = getNextState(session.state);
    session.state = nextState;

    if (nextState === State.CONFIRM) {
      return sendConfirmation(ctx, session);
    }

    const nextStep = getStepByState(nextState);
    return ctx.reply(nextStep.prompt);
  });

  bot.on("message", (ctx) => {
    const session = getSession(ctx.chat.id);
    if (session.state === State.IDLE) return;

    const step = getStepByState(session.state);
    if (!step) return;

    const type =
      ctx.message.sticker ? "стикеры" :
      ctx.message.animation ? "гифки" :
      ctx.message.photo ? "фото" :
      ctx.message.video ? "видео" :
      ctx.message.voice ? "голосовые" : null;

    if (type) {
      return ctx.reply(
        `Я пока не понимаю ${type} \u{1F605}\nПожалуйста, ответьте текстом.\n\n${step.prompt}`,
      );
    }

    return ctx.reply(
      `Пожалуйста, отправьте текстовое сообщение.\n\n${step.prompt}`,
    );
  });
}

module.exports = { registerHandlers };
