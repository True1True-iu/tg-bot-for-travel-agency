const { State } = require("./states");

const sessions = new Map();

function createSession() {
  return { state: State.IDLE, editingField: null, data: {} };
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

module.exports = { getSession, resetSession };
