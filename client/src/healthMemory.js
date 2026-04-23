/**
 * Health Memory — Persistent user health profile using localStorage.
 * Tracks assessments over time, habits, and preferences for personalization.
 */

const PROFILE_KEY = "pulsex_health_profile";
const HABITS_KEY = "pulsex_habit_log";
const PREFS_KEY = "pulsex_preferences";

function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback; }
  catch { return fallback; }
}

function save(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
}

// ── Health Profile ──

export function getProfile() {
  return load(PROFILE_KEY, {
    name: "",
    age: null,
    gender: "",
    conditions: [],
    assessments: [],
    riskTrajectory: [],
    lastAssessment: null,
    createdAt: null,
  });
}

export function updateProfile(result, form) {
  const profile = getProfile();
  profile.name = form?.name || profile.name;
  profile.age = form?.age || profile.age;
  profile.gender = form?.gender || profile.gender;
  if (!profile.createdAt) profile.createdAt = new Date().toISOString();
  profile.lastAssessment = new Date().toISOString();

  // Detect conditions
  const conditions = new Set(profile.conditions);
  if (form?.diabetes === "yes") conditions.add("diabetes");
  if (form?.smoking === "yes") conditions.add("smoking");
  if ((form?.systolic_bp || 0) >= 130) conditions.add("hypertension");
  if ((form?.cholesterol || 0) >= 200) conditions.add("high_cholesterol");
  if ((form?.fasting_glucose || 0) >= 100) conditions.add("prediabetes");
  if (form?.family_history === "yes") conditions.add("family_history");
  profile.conditions = [...conditions];

  // Track risk over time
  profile.riskTrajectory.push({
    date: new Date().toISOString(),
    score: result?.risk_score ?? 0,
    level: result?.risk_level ?? "Unknown",
    confidence: result?.confidence ?? 0,
    heartAge: result?.heart_age ?? null,
  });
  // Keep last 20
  if (profile.riskTrajectory.length > 20) profile.riskTrajectory = profile.riskTrajectory.slice(-20);

  // Store assessment snapshot
  profile.assessments.push({
    date: new Date().toISOString(),
    riskScore: result?.risk_score,
    riskLevel: result?.risk_level,
    primaryIssue: result?.primary_issue?.label || null,
  });
  if (profile.assessments.length > 20) profile.assessments = profile.assessments.slice(-20);

  save(PROFILE_KEY, profile);
  return profile;
}

export function getRiskTrend() {
  const profile = getProfile();
  return profile.riskTrajectory || [];
}

export function getAssessmentCount() {
  return getProfile().assessments.length;
}

// ── Habit Tracking ──

export function getHabitLog() {
  return load(HABITS_KEY, []);
}

export function logHabit(entry) {
  const log = getHabitLog();
  log.push({
    ...entry,
    id: Date.now(),
    date: new Date().toISOString(),
  });
  // Keep last 90 days
  if (log.length > 90) log.splice(0, log.length - 90);
  save(HABITS_KEY, log);
  return log;
}

export function getTodayHabits() {
  const today = new Date().toISOString().slice(0, 10);
  return getHabitLog().filter(h => h.date?.startsWith(today));
}

export function getHabitStreak(habitType) {
  const log = getHabitLog().filter(h => h.type === habitType);
  if (!log.length) return 0;
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 90; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dayStr = d.toISOString().slice(0, 10);
    if (log.some(h => h.date?.startsWith(dayStr))) streak++;
    else break;
  }
  return streak;
}

export function getWeekSummary() {
  const log = getHabitLog();
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const recent = log.filter(h => h.date >= weekAgo);
  return {
    totalEntries: recent.length,
    exerciseDays: new Set(recent.filter(h => h.type === "exercise").map(h => h.date?.slice(0, 10))).size,
    healthyMeals: recent.filter(h => h.type === "meal" && h.quality === "healthy").length,
    sleepAvg: (() => {
      const sleepEntries = recent.filter(h => h.type === "sleep" && h.hours);
      return sleepEntries.length ? (sleepEntries.reduce((s, h) => s + h.hours, 0) / sleepEntries.length).toFixed(1) : null;
    })(),
    stressLow: recent.filter(h => h.type === "stress" && h.level === "low").length,
    waterGlasses: recent.filter(h => h.type === "water").reduce((s, h) => s + (h.glasses || 0), 0),
  };
}

// ── Preferences ──

export function getPreferences() {
  return load(PREFS_KEY, { dietType: "mixed", exercisePreference: "general", language: "en" });
}

export function updatePreferences(prefs) {
  save(PREFS_KEY, { ...getPreferences(), ...prefs });
}
