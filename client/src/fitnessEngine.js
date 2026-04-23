/**
 * Fitness Intelligence Engine
 * Generates personalized exercise plans based on risk profile, conditions, and limitations.
 * Uses WHO, AHA, and ACSM guidelines for evidence-based recommendations.
 */

const INTENSITY_LIMITS = {
  "Very High": { max: "low", label: "Low-impact only", hrMax: 0.50 },
  High:        { max: "low-moderate", label: "Low to moderate", hrMax: 0.60 },
  Moderate:    { max: "moderate", label: "Moderate", hrMax: 0.70 },
  Mild:        { max: "moderate-vigorous", label: "Moderate to vigorous", hrMax: 0.75 },
  Low:         { max: "vigorous", label: "Full range", hrMax: 0.85 },
};

const EXERCISE_DB = {
  walking: { name: "Brisk Walking", type: "cardio", intensity: "low", met: 3.5, icon: "🚶", benefit: "Safest cardiovascular exercise — improves circulation, lowers resting BP 3–5 mmHg over 4 weeks" },
  swimming: { name: "Swimming", type: "cardio", intensity: "moderate", met: 6.0, icon: "🏊", benefit: "Zero-impact full-body cardio — ideal for joint issues, improves cardiac output without skeletal stress" },
  cycling: { name: "Cycling", type: "cardio", intensity: "moderate", met: 5.5, icon: "🚴", benefit: "Low-impact sustained cardio — builds leg strength and cardiovascular endurance simultaneously" },
  yoga: { name: "Yoga / Pranayama", type: "flexibility", intensity: "low", met: 2.5, icon: "🧘", benefit: "Combines breathwork with gentle movement — reduces cortisol 15–25%, improves HRV" },
  tai_chi: { name: "Tai Chi", type: "balance", intensity: "low", met: 3.0, icon: "🥋", benefit: "Moving meditation — shown to reduce BP by 9/5 mmHg in hypertensives (meta-analysis)" },
  resistance: { name: "Light Resistance Training", type: "strength", intensity: "moderate", met: 4.0, icon: "💪", benefit: "Preserves muscle mass, improves insulin sensitivity, strengthens bones — 2x/week recommended by WHO" },
  stretching: { name: "Daily Stretching", type: "flexibility", intensity: "low", met: 2.0, icon: "🤸", benefit: "Improves arterial flexibility and blood flow — 10 min/day shown to reduce BP in sedentary adults" },
  stairs: { name: "Stair Climbing", type: "cardio", intensity: "moderate", met: 7.0, icon: "🏢", benefit: "High caloric burn in short bursts — 3 flights/day reduces cardiovascular mortality 15% (Harvard study)" },
  dancing: { name: "Dancing", type: "cardio", intensity: "moderate", met: 5.0, icon: "💃", benefit: "Joyful movement that improves adherence — cognitive + physical benefits combined" },
  desk_exercises: { name: "Desk Micro-exercises", type: "movement", intensity: "low", met: 1.8, icon: "🖥️", benefit: "Chair squats, seated leg raises, desk push-ups — breaks sedentary chains every 45 minutes" },
};

function calculateMaxHR(age) {
  return Math.round(220 - age);
}

function calculateTargetHRZone(age, riskLevel) {
  const maxHR = calculateMaxHR(age);
  const limit = INTENSITY_LIMITS[riskLevel] || INTENSITY_LIMITS.Moderate;
  const lower = Math.round(maxHR * (limit.hrMax - 0.10));
  const upper = Math.round(maxHR * limit.hrMax);
  return { lower, upper, maxHR, intensityLabel: limit.label };
}

function selectExercises(payload, result) {
  const risk = result?.risk_level || "Moderate";
  const limit = INTENSITY_LIMITS[risk] || INTENSITY_LIMITS.Moderate;
  const age = Number(payload?.age || 40);
  const selected = [];

  const isHighRisk = ["High", "Very High"].includes(risk);
  const isExertionStrained = payload?.exertion_response === "strained";
  const hasDiabetes = payload?.diabetes === "yes";
  const hasHighBP = (payload?.systolic_bp || 0) >= 140;
  const isSedentary = payload?.activity_level === "low";
  const hasStress = payload?.stress === "high";
  const hasPoorSleep = payload?.sleep_quality === "poor";
  const sitsLong = payload?.sitting === "high";

  // Everyone gets walking
  selected.push({
    ...EXERCISE_DB.walking,
    frequency: isHighRisk ? "Daily, 15–20 min" : isSedentary ? "Daily, 25–30 min" : "5x/week, 30 min",
    priority: "essential",
    personalNote: isExertionStrained
      ? "Start very slowly — 10 min flat surface only. If breathlessness or chest discomfort appears, stop and rest."
      : isSedentary
        ? "Begin with 15 minutes and add 5 minutes each week. Post-meal walking reduces glucose spikes by 30–50%."
        : "Maintain brisk pace — you should be able to talk but not sing.",
  });

  // Yoga/breathing for stress
  if (hasStress || hasPoorSleep || hasHighBP) {
    selected.push({
      ...EXERCISE_DB.yoga,
      frequency: hasStress ? "Daily, 15–20 min" : "3–4x/week, 20 min",
      priority: "high",
      personalNote: hasHighBP
        ? `With BP at ${payload.systolic_bp} mmHg, pranayama breathing (6 breaths/min) directly activates the baroreflex and can lower systolic BP 4–6 mmHg.`
        : hasStress
          ? "Focus on breath-led styles: Hatha, Yin, or Restorative. Box breathing (4-4-4-4) before bed improves both sleep and HRV."
          : "Gentle evening yoga signals the nervous system to downshift — improving sleep onset and depth.",
    });
  }

  // Cycling/swimming for moderate-risk
  if (!isHighRisk && !isExertionStrained) {
    selected.push({
      ...EXERCISE_DB.cycling,
      frequency: "3x/week, 20–30 min",
      priority: "recommended",
      personalNote: hasDiabetes
        ? "Cycling after meals is especially effective for diabetics — it uses large muscle groups that pull glucose from blood."
        : "Start at comfortable pace. Gradually increase resistance every 2 weeks.",
    });
  }

  // Tai Chi for elderly or high-risk
  if (age >= 55 || isHighRisk) {
    selected.push({
      ...EXERCISE_DB.tai_chi,
      frequency: "3x/week, 20–30 min",
      priority: age >= 65 ? "essential" : "recommended",
      personalNote: `At age ${age}, Tai Chi provides cardiovascular benefit + balance training + fall prevention — it's the most efficient movement for overall health.`,
    });
  }

  // Resistance training for non-high-risk
  if (!isHighRisk) {
    selected.push({
      ...EXERCISE_DB.resistance,
      frequency: "2x/week, 20–30 min",
      priority: "recommended",
      personalNote: hasDiabetes
        ? "Resistance training improves insulin sensitivity for 24–48 hours post-session — time these on non-walking days."
        : "Use bodyweight or light dumbbells. Focus on major muscle groups: legs, back, chest, core.",
    });
  }

  // Stretching for everyone
  selected.push({
    ...EXERCISE_DB.stretching,
    frequency: "Daily, 10 min (morning or evening)",
    priority: "supporting",
    personalNote: sitsLong
      ? "After 8+ hours of sitting, your hip flexors and hamstrings are shortened — focus on hip openers and hamstring stretches."
      : "Morning stretching primes circulation. Evening stretching aids recovery.",
  });

  // Desk exercises for sedentary
  if (sitsLong) {
    selected.push({
      ...EXERCISE_DB.desk_exercises,
      frequency: "Every 45 min during work",
      priority: "essential",
      personalNote: "Set a timer: 10 chair squats + 30 sec standing calf raises every 45 minutes. This single habit reduces sedentary mortality risk by 15–20%.",
    });
  }

  return selected;
}

function generateWeeklySchedule(exercises, riskLevel) {
  const isHighRisk = ["High", "Very High"].includes(riskLevel);
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  const essential = exercises.filter(e => e.priority === "essential");
  const recommended = exercises.filter(e => e.priority === "recommended");
  const supporting = exercises.filter(e => e.priority === "supporting");

  return days.map((day, i) => {
    const activities = [];
    // Essential exercises most days
    essential.forEach(e => activities.push({ name: e.name, icon: e.icon, duration: e.frequency.match(/\d+/)?.[0] + " min" || "15 min" }));
    // Recommended exercises 3x/week
    if (i % 2 === 0 && recommended.length > 0) {
      const rec = recommended[i % recommended.length];
      activities.push({ name: rec.name, icon: rec.icon, duration: rec.frequency.match(/\d+/)?.[0] + " min" || "20 min" });
    }
    // Supporting on alternating days
    if (i % 2 === 1 && supporting.length > 0) {
      activities.push({ name: supporting[0].name, icon: supporting[0].icon, duration: "10 min" });
    }
    // Rest day
    if (day === "Sunday" && isHighRisk) {
      return { day, activities: [{ name: "Active Rest", icon: "🌿", duration: "Light walk only" }], isRest: true };
    }
    return { day, activities, isRest: false };
  });
}

function generateProgressionPlan(riskLevel) {
  if (["High", "Very High"].includes(riskLevel)) {
    return {
      phase1: { weeks: "1–4", focus: "Foundation", detail: "Walking 10–15 min daily + breathing exercises. Goal: establish consistency, not intensity." },
      phase2: { weeks: "5–8", focus: "Build", detail: "Extend walks to 20–25 min. Add gentle stretching. Introduce 1 yoga session/week." },
      phase3: { weeks: "9–12", focus: "Strengthen", detail: "Walk 25–30 min, add interval variation. Begin light bodyweight exercises if cleared by doctor." },
      milestone: "After 12 weeks: reassess with PulseX. Expected improvement: 5–12 point risk score reduction.",
    };
  }
  return {
    phase1: { weeks: "1–3", focus: "Activate", detail: "30 min moderate activity 5x/week. Establish movement habit." },
    phase2: { weeks: "4–6", focus: "Diversify", detail: "Add resistance training 2x/week. Introduce one new activity (swimming, cycling, dancing)." },
    phase3: { weeks: "7–12", focus: "Optimize", detail: "Increase intensity gradually. Aim for 150–300 min/week moderate or 75–150 min vigorous (WHO target)." },
    milestone: "After 12 weeks: reassess with PulseX. Expected improvement: 8–18 point risk score reduction.",
  };
}

export function generateFitnessPlan(payload, result) {
  const risk = result?.risk_level || "Moderate";
  const age = Number(payload?.age || 40);
  const hrZone = calculateTargetHRZone(age, risk);
  const exercises = selectExercises(payload, result);
  const schedule = generateWeeklySchedule(exercises, risk);
  const progression = generateProgressionPlan(risk);

  const weeklyTarget = ["High", "Very High"].includes(risk) ? 90 : ["Moderate"].includes(risk) ? 150 : 200;

  const warnings = [];
  if (payload?.exertion_response === "strained") {
    warnings.push("⚠️ Stop immediately if you experience chest pain, severe breathlessness, dizziness, or nausea during exercise.");
  }
  if ((payload?.systolic_bp || 0) >= 180) {
    warnings.push("🚨 With BP ≥180 mmHg: Do NOT exercise until BP is controlled. Consult your doctor first.");
  }

  return {
    summary: {
      riskLevel: risk,
      intensityLimit: INTENSITY_LIMITS[risk]?.label || "Moderate",
      weeklyTargetMinutes: weeklyTarget,
      targetHR: hrZone,
      exerciseCount: exercises.length,
    },
    exercises,
    schedule,
    progression,
    warnings,
  };
}
