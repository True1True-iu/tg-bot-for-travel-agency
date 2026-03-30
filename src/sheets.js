const { GoogleSpreadsheet } = require("google-spreadsheet");
const { JWT } = require("google-auth-library");
const config = require("./config");

const HEADERS = [
  "Дата",
  "Username",
  "Chat ID",
  "Имя",
  "Направление",
  "Даты поездки",
  "Кол-во человек",
  "Бюджет",
  "Город вылета",
  "Телефон",
  "Статус",
];

let _sheet = null;
let _configured = false;

function isConfigured() {
  return !!(
    config.GOOGLE_SHEET_ID &&
    config.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    config.GOOGLE_PRIVATE_KEY
  );
}

async function initSheet() {
  if (!isConfigured()) {
    console.warn("[sheets] Google Sheets не настроен — заявки пойдут в консоль");
    return null;
  }

  const auth = new JWT({
    email: config.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: config.GOOGLE_PRIVATE_KEY,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const doc = new GoogleSpreadsheet(config.GOOGLE_SHEET_ID, auth);
  await doc.loadInfo();
  _sheet = doc.sheetsByIndex[0];

  try {
    await _sheet.loadHeaderRow();
  } catch {
    await _sheet.setHeaderRow(HEADERS);
  }

  _configured = true;
  console.log(`[sheets] Подключено: "${doc.title}" / "${_sheet.title}"`);
  return _sheet;
}

async function getSheet() {
  if (_sheet) return _sheet;
  return initSheet();
}

async function appendRow(userData) {
  const sheet = await getSheet();
  if (!sheet) {
    console.log("[sheets] Заявка (консоль):", JSON.stringify(userData, null, 2));
    return null;
  }

  const row = await sheet.addRow({
    "Дата": new Date().toLocaleString("ru-RU", { timeZone: "Europe/Moscow" }),
    "Username": userData.username || "—",
    "Chat ID": String(userData.chatId),
    "Имя": userData.name,
    "Направление": userData.destination,
    "Даты поездки": userData.dates,
    "Кол-во человек": userData.peopleCount,
    "Бюджет": userData.budget,
    "Город вылета": userData.departureCity,
    "Телефон": userData.phone,
    "Статус": "Новая",
  });

  console.log("[sheets] Заявка записана, строка", row.rowNumber);
  return row;
}

async function findByChatId(chatId) {
  const sheet = await getSheet();
  if (!sheet) return [];

  const rows = await sheet.getRows();
  return rows
    .filter((r) => r.get("Chat ID") === String(chatId))
    .map(rowToObject);
}

async function findActiveRequest(chatId) {
  const sheet = await getSheet();
  if (!sheet) return null;

  const rows = await sheet.getRows();
  const active = rows.find(
    (r) =>
      r.get("Chat ID") === String(chatId) &&
      (r.get("Статус") === "Новая" || r.get("Статус") === "В работе"),
  );
  return active ? { row: active, data: rowToObject(active) } : null;
}

async function cancelRequest(chatId) {
  const sheet = await getSheet();
  if (!sheet) return false;

  const rows = await sheet.getRows();
  const active = rows.find(
    (r) =>
      r.get("Chat ID") === String(chatId) &&
      (r.get("Статус") === "Новая" || r.get("Статус") === "В работе"),
  );

  if (!active) return false;

  active.set("Статус", "Отменена");
  await active.save();
  console.log("[sheets] Заявка отменена, строка", active.rowNumber);
  return true;
}

function rowToObject(row) {
  return {
    date: row.get("Дата"),
    username: row.get("Username"),
    chatId: row.get("Chat ID"),
    name: row.get("Имя"),
    destination: row.get("Направление"),
    dates: row.get("Даты поездки"),
    peopleCount: row.get("Кол-во человек"),
    budget: row.get("Бюджет"),
    departureCity: row.get("Город вылета"),
    phone: row.get("Телефон"),
    status: row.get("Статус"),
  };
}

module.exports = {
  initSheet,
  isConfigured,
  appendRow,
  findByChatId,
  findActiveRequest,
  cancelRequest,
};
