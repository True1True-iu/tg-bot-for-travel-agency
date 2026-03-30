const State = Object.freeze({
  IDLE: "IDLE",
  AWAITING_NAME: "AWAITING_NAME",
  AWAITING_DESTINATION: "AWAITING_DESTINATION",
  AWAITING_DATES: "AWAITING_DATES",
  AWAITING_PEOPLE_COUNT: "AWAITING_PEOPLE_COUNT",
  AWAITING_BUDGET: "AWAITING_BUDGET",
  AWAITING_DEPARTURE_CITY: "AWAITING_DEPARTURE_CITY",
  AWAITING_PHONE: "AWAITING_PHONE",
  CONFIRM: "CONFIRM",
});

const STEPS = [
  {
    state: State.AWAITING_NAME,
    field: "name",
    label: "\u0418\u043C\u044F",
    emoji: "\u{1F464}",
    prompt: "\u041A\u0430\u043A \u043A \u0432\u0430\u043C \u043E\u0431\u0440\u0430\u0449\u0430\u0442\u044C\u0441\u044F?",
  },
  {
    state: State.AWAITING_DESTINATION,
    field: "destination",
    label: "\u041D\u0430\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435",
    emoji: "\u{1F30D}",
    prompt: "\u041A\u0443\u0434\u0430 \u0445\u043E\u0442\u0438\u0442\u0435 \u043F\u043E\u0435\u0445\u0430\u0442\u044C? (\u0441\u0442\u0440\u0430\u043D\u0430, \u0433\u043E\u0440\u043E\u0434 \u0438\u043B\u0438 \u043A\u0443\u0440\u043E\u0440\u0442)",
  },
  {
    state: State.AWAITING_DATES,
    field: "dates",
    label: "\u0414\u0430\u0442\u044B",
    emoji: "\u{1F4C5}",
    prompt: "\u041A\u0430\u043A\u0438\u0435 \u0434\u0430\u0442\u044B \u043F\u043E\u0435\u0437\u0434\u043A\u0438? (\u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440, 15.06 \u2013 25.06)",
  },
  {
    state: State.AWAITING_PEOPLE_COUNT,
    field: "peopleCount",
    label: "\u041A\u043E\u043B-\u0432\u043E \u0447\u0435\u043B\u043E\u0432\u0435\u043A",
    emoji: "\u{1F465}",
    prompt: "\u0421\u043A\u043E\u043B\u044C\u043A\u043E \u0447\u0435\u043B\u043E\u0432\u0435\u043A \u043F\u043E\u0435\u0434\u0435\u0442? (\u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440, 2 \u0432\u0437\u0440\u043E\u0441\u043B\u044B\u0445, 1 \u0440\u0435\u0431\u0451\u043D\u043E\u043A)",
  },
  {
    state: State.AWAITING_BUDGET,
    field: "budget",
    label: "\u0411\u044E\u0434\u0436\u0435\u0442",
    emoji: "\u{1F4B0}",
    prompt: "\u041A\u0430\u043A\u043E\u0439 \u0443 \u0432\u0430\u0441 \u0431\u044E\u0434\u0436\u0435\u0442 \u043D\u0430 \u043F\u043E\u0435\u0437\u0434\u043A\u0443?",
  },
  {
    state: State.AWAITING_DEPARTURE_CITY,
    field: "departureCity",
    label: "\u0413\u043E\u0440\u043E\u0434 \u0432\u044B\u043B\u0435\u0442\u0430",
    emoji: "\u2708\uFE0F",
    prompt: "\u0418\u0437 \u043A\u0430\u043A\u043E\u0433\u043E \u0433\u043E\u0440\u043E\u0434\u0430 \u043F\u043B\u0430\u043D\u0438\u0440\u0443\u0435\u0442\u0435 \u0432\u044B\u043B\u0435\u0442?",
  },
  {
    state: State.AWAITING_PHONE,
    field: "phone",
    label: "\u0422\u0435\u043B\u0435\u0444\u043E\u043D",
    emoji: "\u{1F4DE}",
    prompt: "\u0412\u0430\u0448 \u043D\u043E\u043C\u0435\u0440 \u0442\u0435\u043B\u0435\u0444\u043E\u043D\u0430 \u0434\u043B\u044F \u0441\u0432\u044F\u0437\u0438?",
  },
];

function getStepByState(state) {
  return STEPS.find((s) => s.state === state);
}

function getStepByField(field) {
  return STEPS.find((s) => s.field === field);
}

function getNextState(currentState) {
  const idx = STEPS.findIndex((s) => s.state === currentState);
  if (idx === -1 || idx === STEPS.length - 1) return State.CONFIRM;
  return STEPS[idx + 1].state;
}

module.exports = { State, STEPS, getStepByState, getStepByField, getNextState };
