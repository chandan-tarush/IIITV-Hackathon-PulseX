import { QUESTION_BANK } from "./data";

function isAnswered(value) {
  return value !== "" && value !== null && value !== undefined;
}

function questionPriority(question, form) {
  let score = 100;

  switch (question.id) {
    case "cigarettes_per_day":
      if (form?.smoking === "yes") score -= 90;
      break;
    case "chest_symptom_pattern":
      if (form?.exertion_response === "strained") score -= 58;
      if (form?.exertion_response === "noticeable") score -= 36;
      break;
    case "breathlessness_pattern":
      if (form?.exertion_response === "strained") score -= 54;
      if (form?.exertion_response === "noticeable") score -= 32;
      break;
    case "recovery_after_effort":
      if (form?.exertion_response === "strained") score -= 44;
      if (form?.exertion_response === "noticeable") score -= 22;
      break;
    case "stress_trigger_pattern":
      if (form?.stress === "high") score -= 48;
      break;
    case "sleep_quality":
      if (form?.stress === "high") score -= 18;
      break;
    case "sleep_hours":
      if (form?.sleep_quality === "poor") score -= 42;
      if (form?.stress === "high") score -= 14;
      break;
    case "snoring_pattern":
      if (form?.sleep_quality === "poor") score -= 38;
      if (Number(form?.sleep_hours || 0) <= 6) score -= 18;
      break;
    case "sugary_drinks":
      if (form?.diet === "frequent") score -= 34;
      if (form?.diabetes === "yes") score -= 18;
      break;
    case "meal_timing_pattern":
      if (form?.diet === "frequent") score -= 28;
      if (form?.diabetes === "yes") score -= 20;
      if (form?.sugary_drinks) score -= 14;
      break;
    case "salt_intake":
      if (form?.family_history === "yes") score -= 18;
      if (form?.stress === "high") score -= 16;
      break;
    default:
      break;
  }

  return score;
}

export function buildQuestionPath(form) {
  return QUESTION_BANK
    .map((question, index) => ({ question, index }))
    .filter(({ question }) => {
      try {
        return question.ask(form || {});
      } catch {
        return false;
      }
    })
    .sort((left, right) => {
      const priorityDelta =
        questionPriority(left.question, form || {}) - questionPriority(right.question, form || {});
      if (priorityDelta !== 0) return priorityDelta;
      return left.index - right.index;
    })
    .map(({ question }) => question);
}

export function getNextQuestion(form) {
  const path = buildQuestionPath(form);
  const total = path.length;
  const answeredCount = path.filter((question) => isAnswered(form?.[question.id])).length;

  for (let index = 0; index < path.length; index += 1) {
    const question = path[index];
    if (!isAnswered(form?.[question.id])) {
      return {
        question,
        index,
        total,
        progress: Math.round((answeredCount / Math.max(total, 1)) * 100),
        isLast: answeredCount === total - 1,
      };
    }
  }

  return null;
}

export function isQuestionnaireComplete(form) {
  return getNextQuestion(form) === null;
}

export function getEstimatedTotal(form) {
  return buildQuestionPath(form).length;
}
