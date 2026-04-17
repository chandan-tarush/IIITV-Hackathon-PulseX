/**
 * Offline / fallback assessment engine.
 * Mirrors the backend HeartRiskEngine logic for when the ML server is unavailable.
 * All thresholds from WHO / AHA / ADA / ATP-III published standards.
 */
import { analyzePatterns, identifyIssues, interpretBP, interpretCholesterol, interpretGlucose } from "./signalAnalyzer";

const HISTORY_KEY = "beatly_local_history";

const lifePoints = {
  activity_level: { low: 20, medium: 10, high: 0 },
  sitting: { high: 15, medium: 8, low: 0 },
  stress: { high: 15, medium: 8, low: 0 },
  sleep_quality: { poor: 15, ok: 5, good: 0 },
  diet: { frequent: 15, moderate: 8, rare: 0 },
  exertion_response: { strained: 12, noticeable: 6, easy: 0 },
};

const followupBank = [
  { id: "chest_tightness", question: "Do you ever feel tightness, pressure, or heaviness in the chest during physical effort or stress?", why: "Chest symptoms during exertion may indicate coronary insufficiency." },
  { id: "breathless_easy", question: "Do you get unusually breathless doing things that should normally feel easy?", why: "Disproportionate breathlessness suggests reduced cardiac output." },
  { id: "palpitations", question: "Have you noticed racing heartbeat, skipped beats, or unusual pounding?", why: "Palpitations may indicate autonomic dysregulation or arrhythmia." },
  { id: "ankle_swelling", question: "Do your feet or ankles swell, especially by evening or after sitting?", why: "Peripheral edema may indicate venous insufficiency or early heart failure." },
  { id: "dizzy_standing", question: "Do you feel dizzy or lightheaded when standing up quickly?", why: "Orthostatic symptoms may indicate blood pressure dysregulation." },
];

function level(score) {
  if (score < 5) return "Low";
  if (score < 10) return "Mild";
  if (score < 20) return "Moderate";
  if (score < 30) return "High";
  return "Very High";
}

function levelMessage(levelValue) {
  return {
    Low: "Your heart profile looks calm and well supported right now.",
    Mild: "A few gentle adjustments could give your heart even more breathing room.",
    Moderate: "Your daily routine is putting quiet pressure on your heart.",
    High: "Your heart is carrying a meaningful amount of stress and deserves attention.",
    "Very High": "Your heart risk is elevated enough that a clinician conversation is worth prioritising.",
  }[levelValue];
}

function emotionalMessage(payload, levelValue) {
  const name = payload.name || "Your";
  const age = payload.age || 30;
  if (levelValue === "Low" || levelValue === "Mild")
    return `${name}'s cardiovascular profile is reassuring — the current pattern is protective and worth maintaining.`;
  if (levelValue === "Moderate")
    return `${name}'s profile shows modifiable pressure points. At ${age}, targeted adjustments can meaningfully change this trajectory.`;
  return `${name}'s profile shows elevated risk that deserves calm, structured attention — not panic, but purposeful action.`;
}

function ruleScore(payload) {
  let score = 0;
  if (payload.smoking === "yes") score += 30;
  if (payload.family_history === "yes") score += 12;
  if (payload.diabetes === "yes") score += 22;

  const sbp = payload.systolic_bp;
  if (sbp != null) {
    if (sbp >= 180) score += 35;
    else if (sbp >= 150) score += 28;
    else if (sbp >= 140) score += 22;
    else if (sbp >= 130) score += 14;
    else if (sbp >= 125) score += 10;
  }

  const dbp = payload.diastolic_bp;
  if (dbp != null) {
    if (dbp >= 120) score += 15;
    else if (dbp >= 90) score += 10;
    else if (dbp >= 80) score += 4;
  }

  const chol = payload.cholesterol;
  if (chol != null && chol >= 260) score += 24;
  else if (chol != null && chol >= 220) score += 14;

  const hdl = payload.hdl_cholesterol;
  if (hdl != null && hdl < 40) score += 15;
  else if (hdl != null && hdl < 50) score += 6;

  const ldl = payload.ldl_cholesterol;
  if (ldl != null && ldl >= 190) score += 18;
  else if (ldl != null && ldl >= 160) score += 12;

  const glucose = payload.fasting_glucose;
  if (glucose != null && glucose >= 126) score += 16;
  else if (glucose != null && glucose >= 100) score += 8;

  const trig = payload.triglycerides;
  if (trig != null && trig >= 200) score += 10;

  return Math.min(score, 100);
}

function lifestyleScore(payload) {
  return (
    (lifePoints.activity_level[payload.activity_level] || 0) +
    (lifePoints.sitting[payload.sitting] || 0) +
    (lifePoints.stress[payload.stress] || 0) +
    (lifePoints.sleep_quality[payload.sleep_quality] || 0) +
    (lifePoints.diet[payload.diet] || 0) +
    (lifePoints.exertion_response[payload.exertion_response] || 0)
  );
}

function mlScore(payload) {
  let score = 8;
  if (payload.age > 55) score += 20;
  else if (payload.age > 40) score += 12;
  else if (payload.age > 30) score += 5;
  if (payload.gender === "male") score += 4;
  if (payload.smoking === "yes") score += 18;
  if (payload.diabetes === "yes") score += 15;
  if (payload.family_history === "yes") score += 8;
  if (payload.activity_level === "low") score += 9;
  if (payload.sitting === "high") score += 5;
  if (payload.stress === "high") score += 6;
  if (payload.sleep_quality === "poor") score += 6;
  if (payload.exertion_response === "strained") score += 10;
  if (payload.systolic_bp != null && payload.systolic_bp >= 145) score += 16;
  else if (payload.systolic_bp != null && payload.systolic_bp >= 130) score += 8;
  if (payload.cholesterol != null && payload.cholesterol >= 240) score += 10;
  if (payload.hdl_cholesterol != null && payload.hdl_cholesterol < 40) score += 8;
  if (payload.fasting_glucose != null && payload.fasting_glucose >= 126) score += 10;
  return Math.min(score, 100);
}

function computeConfidence(payload) {
  let base = 30;
  const fields = [
    ["systolic_bp", 15], ["diastolic_bp", 8], ["cholesterol", 12],
    ["hdl_cholesterol", 10], ["ldl_cholesterol", 10], ["fasting_glucose", 10], ["triglycerides", 5],
  ];
  for (const [field, pts] of fields) {
    if (payload[field] != null) base += pts;
  }
  return Math.min(100, base);
}

function heartHealthScore(payload, riskScore) {
  let score = 100 - Math.round(riskScore * 1.45);
  if (payload.activity_level === "high") score += 6;
  if (payload.sleep_quality === "good") score += 4;
  if (payload.diet === "rare") score += 4;
  if (payload.smoking === "yes") score -= 8;
  if (payload.diabetes === "yes") score -= 7;
  if (payload.hdl_cholesterol != null && payload.hdl_cholesterol >= 60) score += 5;
  else if (payload.hdl_cholesterol != null && payload.hdl_cholesterol < 40) score -= 6;
  return Math.max(18, Math.min(96, score));
}

function attackScenario(payload, riskScore, refinementPoints = 0) {
  let symptomWeight = refinementPoints * 1.45;
  if (payload.exertion_response === "strained") symptomWeight += 4;
  else if (payload.exertion_response === "noticeable") symptomWeight += 1.8;
  if (payload.smoking === "yes") symptomWeight += 3.4;
  if (payload.diabetes === "yes") symptomWeight += 3.6;
  if (payload.systolic_bp != null && payload.systolic_bp >= 145) symptomWeight += 4;
  if (payload.cholesterol != null && payload.cholesterol >= 240) symptomWeight += 2.8;
  if (payload.hdl_cholesterol != null && payload.hdl_cholesterol < 40) symptomWeight += 2.0;
  if (payload.fasting_glucose != null && payload.fasting_glucose >= 126) symptomWeight += 2.5;

  const sixMonth = Math.max(0.5, Math.min(28, 0.6 + riskScore * 0.12 + symptomWeight * 0.45));
  const threeYear = Math.max(3, Math.min(68, 4 + riskScore * 0.72 + symptomWeight * 1.2));
  let label = "lower";
  if (sixMonth >= 10 || threeYear >= 28) label = "elevated";
  if (sixMonth >= 16 || threeYear >= 40) label = "high";

  return {
    label,
    six_month_percent: Number(sixMonth.toFixed(1)),
    three_year_percent: Number(threeYear.toFixed(1)),
    summary: label === "lower"
      ? "This looks more like a prevention opportunity than an immediate danger — but prevention is most valuable when acted on early."
      : "This is not a diagnosis, but the near-term scenario is serious enough to deserve prompt medical follow-through.",
  };
}

function explanations(payload) {
  const items = [];
  if (payload.smoking === "yes") items.push(["Smoking", "Smoking is the strongest modifiable cardiovascular risk factor — it damages endothelial cells and promotes thrombosis."]);
  if (payload.diabetes === "yes") items.push(["Diabetes", "Diabetes changes the cardiovascular risk equation through chronic glycemic vascular damage."]);
  if (payload.exertion_response === "strained") items.push(["Exertion tolerance", "Feeling strained during routine effort signals reduced cardiac reserve."]);
  if (payload.activity_level === "low") items.push(["Physical activity", "Physical inactivity is the 4th leading mortality risk factor globally (WHO)."]);
  if (payload.sitting === "high") items.push(["Sedentary time", "Prolonged sitting increases all-cause mortality independent of exercise."]);
  if (payload.stress === "high") items.push(["Chronic stress", "Chronic stress elevates cortisol and catecholamines, raising BP and heart rate."]);
  if (payload.sleep_quality === "poor") items.push(["Sleep quality", "Poor sleep impairs overnight cardiovascular recovery."]);
  if (payload.systolic_bp != null && payload.systolic_bp >= 130) items.push(["Blood pressure", `Systolic BP of ${payload.systolic_bp} mmHg indicates hypertension (AHA).`]);
  if (payload.cholesterol != null && payload.cholesterol >= 240) items.push(["Cholesterol", `Total cholesterol of ${payload.cholesterol} mg/dL is classified as high (ATP-III).`]);
  if (payload.hdl_cholesterol != null && payload.hdl_cholesterol < 40) items.push(["Low HDL", `HDL of ${payload.hdl_cholesterol} mg/dL is a major CVD risk factor (AHA).`]);
  if (payload.fasting_glucose != null && payload.fasting_glucose >= 100) items.push(["Blood glucose", `Fasting glucose of ${payload.fasting_glucose} mg/dL indicates ${payload.fasting_glucose >= 126 ? 'diabetes' : 'prediabetes'} (ADA).`]);

  return items.slice(0, 5).map(([headline, detail], index) => ({
    feature: headline.toLowerCase().replace(/\s+/g, "_"),
    direction: "up",
    magnitude: Number((0.92 - index * 0.1).toFixed(3)),
    headline,
    detail,
  }));
}

function dailyStory(payload, patterns) {
  const story = [];
  const name = payload.name || "Your";

  for (const p of patterns.slice(0, 3)) {
    story.push(`${p.label}: ${p.cause}`);
  }

  if (!story.length) {
    if (payload.activity_level !== "low" && payload.stress !== "high") {
      story.push(`${name}'s daily rhythm shows more stability than strain — the current pattern is protective.`);
    } else {
      story.push(`${name}'s routine is placing some pressure on cardiovascular recovery, but this is addressable.`);
    }
  }
  return story;
}

function bodySignals(payload) {
  const signals = [];
  if (payload.sitting === "high") signals.push("Stiffness or circulatory sluggishness after prolonged sitting — response to sustained venous pooling.");
  if (payload.stress === "high") signals.push("Persistent tension or fatigue that doesn't resolve with rest — chronic sympathetic activation.");
  if (payload.sleep_quality === "poor") signals.push("Waking unrefreshed, daytime fog, reduced stamina — markers of incomplete overnight recovery.");
  if (payload.exertion_response === "strained") signals.push("Breathlessness or unusual fatigue during routine activity — reduced cardiac reserve.");
  if (payload.systolic_bp != null && payload.systolic_bp >= 140) signals.push(`With BP at ${payload.systolic_bp} mmHg: headaches or pressure sensations during effort.`);
  if (payload.fasting_glucose != null && payload.fasting_glucose >= 100) signals.push(`With glucose at ${payload.fasting_glucose} mg/dL: energy crashes or increased thirst.`);
  if (!signals.length) signals.push("No concerning body signals detected — a positive finding worth protecting.");
  return signals.slice(0, 5);
}

function foodGuidance(payload) {
  const leanInto = [
    "Whole foods: vegetables, legumes, whole grains, nuts, fish — the Mediterranean pattern shows consistent CVD benefit.",
    "Potassium-rich foods (bananas, sweet potatoes, spinach) to counterbalance sodium's effect on BP.",
    "Consistent meal timing — irregular eating disrupts glucose regulation and lipid metabolism.",
  ];
  const easeOff = [
    "Processed foods high in sodium (>600mg/serving) — the primary dietary driver of hypertension.",
    "Trans fats and deep-fried foods — directly raise LDL and lower HDL.",
    "Added sugars and refined carbs — drive triglyceride elevation and insulin resistance.",
  ];
  if (payload.systolic_bp != null && payload.systolic_bp >= 130) leanInto.unshift(`With BP at ${payload.systolic_bp} mmHg: DASH diet pattern — proven to reduce systolic BP 8–14 mmHg.`);
  if (payload.cholesterol != null && payload.cholesterol >= 240) easeOff.unshift(`With cholesterol at ${payload.cholesterol} mg/dL: reduce saturated fat — each 1% reduction lowers LDL ~2 mg/dL.`);
  if (payload.fasting_glucose != null && payload.fasting_glucose >= 100) easeOff.unshift(`With glucose at ${payload.fasting_glucose} mg/dL: minimize refined carbs and sugary drinks.`);
  return { lean_into: leanInto.slice(0, 5), ease_off: easeOff.slice(0, 5) };
}

function symptomWatch(payload) {
  const watch = [];
  if (payload.exertion_response !== "easy") watch.push("Track whether effort tolerance worsens — this is a key cardiovascular warning signal.");
  if (payload.stress === "high") watch.push("Monitor for chest tightness during stress — stress cardiomyopathy can mimic cardiac events.");
  if (payload.systolic_bp != null && payload.systolic_bp >= 140) watch.push(`With BP at ${payload.systolic_bp} mmHg: watch for morning headaches or vision changes.`);
  if (payload.sleep_quality === "poor") watch.push("Pay attention to morning blood pressure — poor sleep often causes non-dipping patterns.");
  if (!watch.length) watch.push("Continue noticing how your body responds to effort — catching changes early is prevention.");
  return watch.slice(0, 4);
}

function habitFocus(payload) {
  const focus = [];
  if (payload.activity_level === "low") focus.push("Movement is the single most protective lifestyle factor — 150 min/week reduces CVD risk by 30% (WHO).");
  if (payload.diet === "frequent") focus.push("Dietary pattern is driving metabolic load — simplification is the realistic goal.");
  if (payload.stress === "high") focus.push("The nervous system needs daily decompression — without it, cortisol stays elevated.");
  if (payload.sleep_quality === "poor") focus.push("Sleep is cardiovascular recovery time — protecting it has disproportionate returns.");
  if (payload.sitting === "high") focus.push("Sedentary time is an independent risk factor — even exercisers who sit 8+ hr/day have elevated risk.");
  return focus.slice(0, 4).length ? focus.slice(0, 4) : ["Your current habits are protective — focus on sustaining them long-term."];
}

function doctorVisitScript(payload, levelValue, issues) {
  const name = payload.name || "I";
  const primary = issues?.primary || {};
  const items = [
    `${name} used a cardiovascular risk assessment tool and would like to review the findings.`,
    `Primary area identified: ${primary.label || "general cardiovascular health"}.`,
  ];
  if (levelValue === "High" || levelValue === "Very High") items.push("Assessment indicated elevated risk warranting prompt evaluation.");
  if (payload.systolic_bp != null && payload.systolic_bp >= 130) items.push(`Blood pressure recorded: ${payload.systolic_bp} mmHg — please verify.`);
  if (payload.fasting_glucose != null && payload.fasting_glucose >= 100) items.push(`Fasting glucose: ${payload.fasting_glucose} mg/dL — consider confirmatory testing.`);
  if (payload.exertion_response !== "easy") items.push("Exertional symptoms reported during routine activity — cardiac evaluation may be valuable.");
  return items.slice(0, 5);
}

function suggestions(payload, levelValue, issues) {
  const items = [];
  const primary = issues?.primary;
  if (primary) {
    items.push({ tag: "Primary Action", title: primary.action || "Consult a healthcare provider", body: `This targets: ${primary.label || "your primary finding"}. ${primary.actionTimeline || ""}` });
  }
  const secondary = issues?.secondary;
  if (secondary && items.length < 2) {
    items.push({ tag: "Supporting Action", title: secondary.action || "Monitor and follow up", body: `Addresses: ${secondary.label || "supporting factor"}. ${secondary.actionTimeline || ""}` });
  }
  const doctorGuidance = {
    Low: "Stay consistent and schedule preventive checks every 1–2 years.",
    Mild: "Monitor BP and glucose trends at your next routine visit.",
    Moderate: "A doctor check-in is sensible, especially if BP or stress stay elevated.",
    High: "Plan a doctor visit soon to review BP, labs, and prevention options.",
    "Very High": "Speak with a doctor promptly. This tool is for awareness, not diagnosis.",
  };
  items.push({ tag: "Medical", title: "Know your next medical step", body: doctorGuidance[levelValue] || "Schedule a preventive check." });
  return items.slice(0, 3);
}

function careFlags(payload, levelValue) {
  const flags = [];
  if (levelValue === "High" || levelValue === "Very High") flags.push("This risk level warrants medical consultation — early intervention has the highest return.");
  if (payload.systolic_bp != null && payload.systolic_bp >= 145) flags.push(`BP of ${payload.systolic_bp} mmHg crosses into territory where medication discussion is standard (AHA).`);
  if (payload.diabetes === "yes") flags.push("Diabetes fundamentally changes CVD risk management — structured prevention is essential.");
  if (payload.exertion_response === "strained") flags.push("Exertional strain during routine activities should be evaluated medically.");
  if (payload.smoking === "yes") flags.push("Smoking cessation at any age reduces cardiovascular risk — it's the single most impactful change.");
  if (payload.fasting_glucose != null && payload.fasting_glucose >= 126) flags.push(`Fasting glucose of ${payload.fasting_glucose} mg/dL is in diabetes range (≥126, ADA) — needs medical confirmation.`);
  if (!flags.length) flags.push("No urgent flags — maintain current patterns and schedule regular preventive check-ups.");
  return flags.slice(0, 5);
}

function simulations(payload, baseline) {
  const candidates = [
    { id: "move", title: "Move more and sit less", summary: "Building movement into your week relieves pressure from circulation and metabolism.", patch: { activity_level: "high", sitting: "low" } },
    { id: "sleep", title: "Improve sleep and lower stress", summary: "Recovery habits help the heart quiet down and improve long-term resilience.", patch: { stress: "low", sleep_quality: "good" } },
    { id: "food", title: "Shift toward home-cooked meals", summary: "Small nutrition changes compound faster than expected.", patch: { diet: "rare" } },
  ];
  return candidates.map((item) => {
    const nextScore = calculateRiskScore({ ...payload, ...item.patch }).riskScore;
    return { id: item.id, title: item.title, summary: item.summary, risk_score: nextScore, delta: baseline - nextScore, changes: item.patch };
  });
}

function profileSnapshot(payload, riskLevel) {
  return {
    energy_pattern: payload.sleep_quality === "poor" || payload.stress === "high" ? "likely stretched and inconsistent" : "fairly steady",
    movement_profile: payload.activity_level === "low" ? "under-moved" : payload.activity_level === "medium" ? "decently active" : "protective",
    food_profile: payload.diet === "frequent" ? "convenience-driven" : payload.diet === "moderate" ? "mixed" : "mostly supportive",
    watch_level: riskLevel.toLowerCase(),
  };
}

function visualMetrics(result) {
  return [
    { id: "heart_health", label: "Heart health", value: result.heart_health_score, tone: "mint" },
    { id: "heart_load", label: "Heart load", value: result.risk_score, tone: "rose" },
    { id: "attack_watch", label: "Event risk", value: Math.round(result.heart_attack_scenario.three_year_percent), tone: "gold" },
    { id: "recovery", label: "Recovery quality", value: Math.max(12, 100 - result.breakdown.lifestyle_score), tone: "blue" },
  ];
}

function pickFollowups(payload) {
  const picks = [followupBank[0], followupBank[1]];
  if (payload.stress === "high" || payload.sleep_quality === "poor") picks.push(followupBank[2]);
  if (payload.sitting === "high" || payload.activity_level === "low") picks.push(followupBank[3]);
  picks.push(followupBank[4]);
  return Array.from(new Map(picks.map((item) => [item.id, item])).values()).slice(0, 4);
}

function reportSections(result) {
  const sections = [
    { title: "Assessment Summary", items: [result.message, result.emotional_message] },
    { title: "Risk Projection", items: [result.heart_attack_scenario.summary] },
  ];
  if (result.primary_issue) {
    sections.push({ title: "Primary Finding", items: [
      `${result.primary_issue.label}: ${result.primary_issue.cause}`,
      `If unchanged: ${result.primary_issue.projection}`,
    ]});
  }
  sections.push(
    { title: "Pattern Analysis", items: result.daily_story },
    { title: "Body Signals", items: result.possible_body_signals },
    { title: "Dietary Guidance", items: [...result.food_guidance.lean_into, ...result.food_guidance.ease_off] },
    { title: "Doctor Talking Points", items: result.doctor_visit_script },
  );
  return sections;
}

function calculateRiskScore(payload) {
  const ml = mlScore(payload);
  const rule = ruleScore(payload);
  const life = lifestyleScore(payload);
  const confidence = computeConfidence(payload);

  let wMl, wRule, wLife, wPers;
  if (confidence >= 70) { wMl = 0.42; wRule = 0.30; wLife = 0.16; wPers = 0.12; }
  else if (confidence >= 45) { wMl = 0.38; wRule = 0.28; wLife = 0.20; wPers = 0.14; }
  else { wMl = 0.34; wRule = 0.22; wLife = 0.28; wPers = 0.16; }

  const personalization = Math.min(100, 10 + (payload.activity_level === "low" && payload.sitting === "high" ? 8 : 0) + (payload.stress === "high" && payload.sleep_quality === "poor" ? 8 : 0) + (payload.diet === "frequent" ? 6 : 0) + (payload.exertion_response === "strained" ? 8 : 0));
  const riskScore = Math.round(Math.min(100, Math.max(0, wMl * ml + wRule * rule + wLife * life + wPers * personalization)));
  const riskLevel = level(riskScore);
  return { ml, rule, life, personalization, riskScore, riskLevel, confidence };
}

function buildBaseResult(payload) {
  const { ml, rule, life, personalization, riskScore, riskLevel, confidence } = calculateRiskScore(payload);
  const patterns = analyzePatterns(payload);
  const issues = identifyIssues(payload, patterns);

  // Clinical interpretations
  const clinicalInterpretations = {};
  const bp = interpretBP(payload.systolic_bp, payload.diastolic_bp);
  if (bp) clinicalInterpretations.bp = bp;
  const chol = interpretCholesterol(payload.cholesterol, payload.hdl_cholesterol, payload.ldl_cholesterol);
  if (chol) clinicalInterpretations.cholesterol = chol;
  const glucose = interpretGlucose(payload.fasting_glucose);
  if (glucose) clinicalInterpretations.glucose = glucose;

  return {
    name: payload.name,
    risk_score: riskScore,
    risk_level: riskLevel,
    confidence,
    heart_age: Math.max(payload.age, Math.round(payload.age + (riskScore - 24) * 0.55)),
    heart_health_score: heartHealthScore(payload, riskScore),
    heart_attack_scenario: attackScenario(payload, riskScore),
    message: levelMessage(riskLevel),
    emotional_message: emotionalMessage(payload, riskLevel),
    narrative: {
      tone: riskScore < 15 ? "reassuring" : riskScore < 25 ? "advisory" : riskScore < 35 ? "concerned" : "urgent",
      condition: issues.primary?.cause || "",
      projection: issues.primary?.projection || "",
      confidence_text: confidence >= 70 ? `Assessment based on clinical and lifestyle data (confidence: ${confidence}%).` : `Assessment based primarily on lifestyle signals (confidence: ${confidence}%). Lab values would improve accuracy.`,
    },
    primary_issue: issues.primary,
    secondary_issue: issues.secondary,
    detected_patterns: patterns.slice(0, 4),
    clinical_interpretations: clinicalInterpretations,
    clinical_severity: 0,
    framingham: null,
    top_factors: explanations(payload).slice(0, 3).map((item) => item.headline),
    protective_factors: [],
    derived_signals: patterns,
    daily_story: dailyStory(payload, patterns),
    possible_body_signals: bodySignals(payload),
    breakdown: { ml_score: ml, rule_score: rule, lifestyle_score: life, personalization_score: personalization },
    explanations: explanations(payload),
    lime_summary: [],
    simulations: [],
    suggestions: suggestions(payload, riskLevel, issues),
    food_guidance: foodGuidance(payload),
    symptom_watch: symptomWatch(payload),
    habit_focus: habitFocus(payload),
    doctor_visit_script: doctorVisitScript(payload, riskLevel, issues),
    care_flags: careFlags(payload, riskLevel),
    doctor_guidance: riskLevel === "Low" ? "Stay consistent and schedule preventive checks." : "A doctor visit would be a wise next step.",
    followup_questions: pickFollowups(payload),
    visual_metrics: [],
    confirmed_signals: [],
    refinement_summary: "",
    profile_snapshot: profileSnapshot(payload, riskLevel),
    disclaimer: "For awareness and prevention guidance only. This is not a medical diagnosis.",
    model_status: { ensemble: ["Local fallback"], personalization: "Local guide", explainers: ["Local reasoning"], validation_auc: 0, data_mode: "fallback", confidence_score: confidence },
  };
}

export function predictOffline(payload, includeHistory = true) {
  const result = buildBaseResult(payload);
  result.simulations = simulations(payload, result.risk_score);
  result.visual_metrics = visualMetrics(result);
  result.report_sections = reportSections(result);
  if (includeHistory) saveLocalHistory(result);
  return result;
}

export function refineOffline(payload, currentResult, answers) {
  const base = currentResult || predictOffline(payload, false);
  const rules = {
    chest_tightness: { delta: 7, text: "Chest pressure confirmed — cardiac evaluation urgency elevated." },
    breathless_easy: { delta: 6, text: "Exertional breathlessness confirmed — suggests reduced cardiac/pulmonary reserve." },
    palpitations: { delta: 4, text: "Palpitations confirmed — rhythm assessment may be warranted." },
    ankle_swelling: { delta: 5, text: "Peripheral edema confirmed — circulatory assessment prioritized." },
    dizzy_standing: { delta: 4, text: "Orthostatic symptoms confirmed — BP regulation needs evaluation." },
  };

  let refinementPoints = 0;
  const confirmed = [];
  Object.entries(answers || {}).forEach(([key, value]) => {
    if (value === "yes" && rules[key]) {
      refinementPoints += rules[key].delta;
      confirmed.push(rules[key].text);
    }
  });

  const nextScore = Math.max(0, Math.min(100, base.risk_score + refinementPoints));
  const nextLevel = level(nextScore);
  const refined = {
    ...base,
    risk_score: nextScore,
    risk_level: nextLevel,
    heart_age: Math.max(payload.age, Math.round(payload.age + (nextScore - 24) * 0.55)),
    heart_health_score: heartHealthScore(payload, nextScore),
    heart_attack_scenario: attackScenario(payload, nextScore, refinementPoints),
    message: levelMessage(nextLevel),
    emotional_message: emotionalMessage(payload, nextLevel),
    confirmed_signals: confirmed.length ? confirmed : ["No additional symptoms confirmed — helps narrow the clinical picture."],
    refinement_summary: confirmed.length
      ? "Follow-up answers confirmed specific symptoms that sharpen the clinical picture and increase confidence."
      : "No major symptoms confirmed — useful information that helps rule out several concerns.",
  };
  refined.visual_metrics = visualMetrics(refined);
  refined.report_sections = reportSections(refined);
  return refined;
}

function mergeArray(value, fallback) {
  return Array.isArray(value) && value.length ? value : fallback;
}

export function normalizeResult(raw, payload) {
  const base = buildBaseResult(payload);
  base.simulations = simulations(payload, base.risk_score);
  base.visual_metrics = visualMetrics(base);
  base.report_sections = reportSections(base);
  if (!raw || typeof raw !== "object") return base;

  const merged = {
    ...base,
    ...raw,
    breakdown: { ...base.breakdown, ...(raw.breakdown || {}) },
    food_guidance: {
      ...base.food_guidance,
      ...(raw.food_guidance || {}),
      lean_into: mergeArray(raw.food_guidance?.lean_into, base.food_guidance.lean_into),
      ease_off: mergeArray(raw.food_guidance?.ease_off, base.food_guidance.ease_off),
    },
    heart_attack_scenario: { ...base.heart_attack_scenario, ...(raw.heart_attack_scenario || {}) },
    profile_snapshot: { ...base.profile_snapshot, ...(raw.profile_snapshot || {}) },
    narrative: { ...base.narrative, ...(raw.narrative || {}) },
  };

  merged.daily_story = mergeArray(raw.daily_story, base.daily_story);
  merged.possible_body_signals = mergeArray(raw.possible_body_signals, base.possible_body_signals);
  merged.suggestions = mergeArray(raw.suggestions, base.suggestions);
  merged.explanations = mergeArray(raw.explanations, base.explanations);
  merged.simulations = mergeArray(raw.simulations, base.simulations);
  merged.symptom_watch = mergeArray(raw.symptom_watch, base.symptom_watch);
  merged.habit_focus = mergeArray(raw.habit_focus, base.habit_focus);
  merged.doctor_visit_script = mergeArray(raw.doctor_visit_script, base.doctor_visit_script);
  merged.followup_questions = mergeArray(raw.followup_questions, base.followup_questions);
  merged.care_flags = mergeArray(raw.care_flags, base.care_flags);
  merged.detected_patterns = mergeArray(raw.detected_patterns, base.detected_patterns);
  merged.confirmed_signals = Array.isArray(raw.confirmed_signals) ? raw.confirmed_signals : base.confirmed_signals;
  merged.primary_issue = raw.primary_issue || base.primary_issue;
  merged.secondary_issue = raw.secondary_issue || base.secondary_issue;
  merged.clinical_interpretations = raw.clinical_interpretations || base.clinical_interpretations;
  merged.visual_metrics = Array.isArray(raw.visual_metrics) && raw.visual_metrics.length ? raw.visual_metrics : visualMetrics(merged);
  merged.report_sections = Array.isArray(raw.report_sections) && raw.report_sections.length ? raw.report_sections : reportSections(merged);
  return merged;
}

export function normalizeHistory(items) {
  if (!Array.isArray(items)) return [];
  return items.map((item, index) => ({
    id: item?.id ?? `${Date.now()}-${index}`,
    created_at: item?.created_at || new Date(Date.now() - index * 86400000).toISOString(),
    risk_score: item?.risk_score ?? 0,
    risk_level: item?.risk_level ?? "Unknown",
    heart_health_score: item?.heart_health_score ?? null,
    heart_attack_three_year: item?.heart_attack_three_year ?? null,
  }));
}

export function saveLocalHistory(result) {
  try {
    const existing = loadLocalHistory();
    const next = [
      ...existing,
      {
        id: Date.now(),
        created_at: new Date().toISOString(),
        risk_score: result?.risk_score ?? 0,
        risk_level: result?.risk_level ?? "Unknown",
        heart_health_score: result?.heart_health_score ?? null,
        heart_attack_three_year: result?.heart_attack_scenario?.three_year_percent ?? null,
      },
    ];
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next.slice(-8)));
  } catch {}
}

export function loadLocalHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

export function formatApiError(detail) {
  if (!detail) return "Something slipped. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((item) => (typeof item === "string" ? item : item?.msg || "Something needs a fix.")).join(" ");
  }
  if (typeof detail === "object") return detail.message || detail.detail || "Something needs a fix.";
  return "Something slipped. Please try again.";
}
