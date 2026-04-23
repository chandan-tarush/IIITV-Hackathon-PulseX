const API_ROOT = import.meta.env.VITE_API_URL || "/api";

async function parseBody(response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function formatDetail(detail) {
  if (!detail) return "Something slipped. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === "string") return item;
        if (item?.msg) return item.msg;
        return "Something in the answers still needs a quick fix.";
      })
      .join(" ");
  }
  if (typeof detail === "object") {
    return detail.message || detail.detail || "Something in the answers still needs a quick fix.";
  }
  return "Something slipped. Please try again.";
}

async function request(path, options = {}) {
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? 10000;
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  const response = await fetch(`${API_ROOT}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    signal: controller.signal,
  }).finally(() => {
    window.clearTimeout(timeoutId);
  });

  const data = await parseBody(response);
  if (!response.ok) {
    throw new Error(formatDetail(data?.detail || data?.error || data));
  }
  return data;
}

export function predictAssessment(payload) {
  return request("/predict", {
    method: "POST",
    body: JSON.stringify(payload),
    timeoutMs: 12000,
  });
}

export function simulateAssessment(payload, changes) {
  return request("/simulate", {
    method: "POST",
    body: JSON.stringify({ payload, changes }),
  });
}

export function refineAssessment(payload, answers) {
  return request("/refine", {
    method: "POST",
    body: JSON.stringify({ payload, answers }),
    timeoutMs: 12000,
  });
}

export function fetchHistory(limit = 8) {
  return request(`/history?limit=${limit}`, { timeoutMs: 4000 });
}

export function fetchHealth() {
  return request("/health", { timeoutMs: 4000 });
}

export function generateResultInsights(payload) {
  return request("/insights", {
    method: "POST",
    body: JSON.stringify(payload),
    timeoutMs: 20000,
  });
}

export function fetchIntakeQuestion(payload) {
  return request("/intake-question", {
    method: "POST",
    body: JSON.stringify(payload),
    timeoutMs: 18000,
  });
}

export function fetchDetailedReport(payload) {
  return request("/report", {
    method: "POST",
    body: JSON.stringify(payload),
    timeoutMs: 25000,
  });
}

export function chatWithMedAssist(payload) {
  return request("/assistant", {
    method: "POST",
    body: JSON.stringify(payload),
    timeoutMs: 20000,
  });
}

export function fetchAdaptiveQuestion(payload) {
  return request("/adaptive-question", {
    method: "POST",
    body: JSON.stringify(payload),
    timeoutMs: 18000,
  });
}

export function fetchFitnessPlan(payload) {
  return request("/fitness-plan", {
    method: "POST",
    body: JSON.stringify(payload),
    timeoutMs: 25000,
  });
}

export function fetchNutritionPlan(payload) {
  return request("/nutrition-plan", {
    method: "POST",
    body: JSON.stringify(payload),
    timeoutMs: 25000,
  });
}

export function fetchHabitCoaching(payload) {
  return request("/habit-coach", {
    method: "POST",
    body: JSON.stringify(payload),
    timeoutMs: 20000,
  });
}

export function fetchDoctorPrep(payload) {
  return request("/doctor-prep", {
    method: "POST",
    body: JSON.stringify(payload),
    timeoutMs: 25000,
  });
}

export function fetchWhatIf(payload) {
  return request("/what-if", {
    method: "POST",
    body: JSON.stringify(payload),
    timeoutMs: 25000,
  });
}

export function fetchMicroInsight(payload) {
  return request("/micro-insight", {
    method: "POST",
    body: JSON.stringify(payload),
    timeoutMs: 8000,
  });
}

export function fetchHeroNarrative(payload) {
  return request("/hero-narrative", {
    method: "POST",
    body: JSON.stringify(payload),
    timeoutMs: 15000,
  });
}

export function fetchValueExplanation(payload) {
  return request("/explain-value", {
    method: "POST",
    body: JSON.stringify(payload),
    timeoutMs: 10000,
  });
}
