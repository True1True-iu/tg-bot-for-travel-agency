const { State } = require("./states");

const sessions = new Map();
const MAX_HISTORY = 10;

function createSession() {
  return { state: State.IDLE, editingField: null, data: {}, history: [] };
}

function getSession(chatId) {
  if (!sessions.has(chatId)) {
    sessions.set(chatId, createSession());
  }
  return sessions.get(chatId);
}

function resetSession(chatId) {
  sessions.set(chatId, createSession());
}

function addHistoryMessage(chatId, role, content) {
  const session = getSession(chatId);
  session.history.push({ role, content });
  if (session.history.length > MAX_HISTORY) {
    session.history = session.history.slice(-MAX_HISTORY);
  }
}

function getRecentHistory(chatId, limit = MAX_HISTORY) {
  const session = getSession(chatId);
  return session.history.slice(-limit);
}

module.exports = {
  getSession,
  resetSession,
  addHistoryMessage,
  getRecentHistory,
};
