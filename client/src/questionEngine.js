/**
 * Dynamic question engine — builds an adaptive question path
 * based on the user's previous answers and detected signals.
 */
import { BASE_QUESTIONS, CONDITIONAL_QUESTIONS } from "./data";

/**
 * Build the complete question path given answers so far.
 * Returns an ordered array of question objects.
 */
export function buildQuestionPath(form) {
  const path = [...BASE_QUESTIONS];
  const answered = new Set(Object.keys(form).filter((k) => form[k] !== "" && form[k] !== null && form[k] !== undefined));

  // Stress question — always asked, but framing depends on context
  if (!answered.has("stress")) {
    if (form.activity_level === "low" || form.sitting === "high") {
      path.push(...CONDITIONAL_QUESTIONS.high_stress);
    } else {
      path.push(...CONDITIONAL_QUESTIONS.always_stress);
    }
  }

  // Sleep question — always asked, but deeper framing if stress is high
  if (!answered.has("sleep_quality")) {
    if (form.stress === "high") {
      path.push(...CONDITIONAL_QUESTIONS.stress_deep);
    } else {
      path.push(...CONDITIONAL_QUESTIONS.always_sleep);
    }
  }

  // Deduplicate by id (keep first occurrence)
  const seen = new Set();
  const deduped = [];
  for (const q of path) {
    if (!seen.has(q.id)) {
      seen.add(q.id);
      deduped.push(q);
    }
  }

  return deduped;
}

/**
 * Get the next unanswered question from the dynamic path.
 * Returns { question, index, total, progress } or null if all done.
 */
export function getNextQuestion(form) {
  const path = buildQuestionPath(form);
  const total = path.length;

  for (let i = 0; i < path.length; i++) {
    const q = path[i];
    const val = form[q.id];
    if (val === "" || val === null || val === undefined) {
      return {
        question: q,
        index: i,
        total,
        progress: Math.round((i / total) * 100),
        isLast: i === total - 1,
      };
    }
  }

  return null; // All questions answered
}

/**
 * Check if all required questions have been answered.
 */
export function isQuestionnaireComplete(form) {
  return getNextQuestion(form) === null;
}

/**
 * Get the estimated total question count (for progress display).
 */
export function getEstimatedTotal(form) {
  return buildQuestionPath(form).length;
}
