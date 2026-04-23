/**
 * Client-side cross-signal pattern analyzer.
 * Mirrors the backend CROSS_SIGNAL_PATTERNS for offline/fallback use.
 * All thresholds are from WHO / AHA / ADA published standards.
 */

const PATTERNS = [
  {
    id: "sedentary_metabolic",
    test: (f) => f.activity_level === "low" && f.sitting === "high" && f.diet === "frequent",
    severity: 0.78,
    label: "Sedentary-metabolic pattern",
    cause: "Low movement combined with convenience eating creates sustained insulin resistance and lipid accumulation pressure.",
    projection: "This pattern is associated with metabolic syndrome development within 3–5 years if sustained (WHO longitudinal data).",
    action: "Introduce a 20-minute walk after your largest meal daily — post-meal movement reduces glucose spikes by 30–50%.",
    actionTimeline: "Measurable glucose and triglyceride improvement typically visible within 4–6 weeks.",
  },
  {
    id: "sedentary_basic",
    test: (f) => f.activity_level === "low" && f.sitting === "high",
    severity: 0.55,
    label: "Prolonged sedentary pattern",
    cause: "Extended sitting reduces vascular tone and slows circulation, increasing clot and arterial stiffness risk.",
    projection: "Sedentary behavior increases all-cause mortality risk by 15–20% independent of exercise (Ekelund et al., Lancet 2016).",
    action: "Stand and move for 3–5 minutes every hour during sitting periods.",
    actionTimeline: "Vascular function improvements measurable within 2–3 weeks.",
  },
  {
    id: "recovery_deficit",
    test: (f) => f.stress === "high" && f.sleep_quality === "poor",
    severity: 0.72,
    label: "Recovery deficit",
    cause: "Chronic stress with poor sleep prevents parasympathetic recovery, keeping heart rate and blood pressure elevated around the clock.",
    projection: "Sustained recovery deficit increases hypertension risk by 40–60% and elevates resting heart rate.",
    action: "Set a consistent bedtime within ±30 minutes and avoid screens 45 minutes before sleep.",
    actionTimeline: "Sleep regularity improves HRV more than duration alone — measurable changes within 3 weeks.",
  },
  {
    id: "stress_eating",
    test: (f) => f.diet === "frequent" && f.stress === "high",
    severity: 0.58,
    label: "Stress-driven eating pattern",
    cause: "Cortisol from chronic stress drives preference for high-calorie, high-sodium foods, creating inflammation and weight gain.",
    projection: "This loop accelerates visceral fat accumulation and worsens lipid profiles within 6–12 months.",
    action: "Replace one stress-driven meal per day with a prepared home meal.",
    actionTimeline: "Inflammatory markers begin improving within 6–8 weeks of dietary consistency.",
  },
  {
    id: "vascular_stress",
    test: (f) => f.systolic_bp && Number(f.systolic_bp) >= 140 && f.stress === "high",
    severity: 0.82,
    label: "Vascular-stress compound",
    cause: "Hypertension compounded by chronic stress creates sustained arterial wall damage, accelerating atherosclerosis.",
    projection: "Combined elevated BP and chronic stress increases stroke risk 2–3x (Framingham Heart Study data).",
    action: "Practice 5-minute slow breathing at 6 breaths/minute daily — reduces systolic BP 4–6 mmHg (meta-analysis).",
    actionTimeline: "Blood pressure reduction from breathwork measurable within 4 weeks.",
  },
  {
    id: "effort_warning",
    test: (f) => f.exertion_response === "strained",
    severity: 0.70,
    label: "Exertional intolerance signal",
    cause: "Noticing ordinary physical effort suggests reduced cardiac reserve or deconditioning.",
    projection: "Exertional symptoms that worsen may indicate progressive cardiovascular or pulmonary limitation.",
    action: "Start with gentle 10-minute flat walks and track whether effort tolerance improves over 2 weeks.",
    actionTimeline: "If no improvement with gentle activity, medical evaluation is warranted.",
  },
  {
    id: "inflammatory_load",
    test: (f) => f.diet === "frequent" && f.activity_level === "low" && f.fasting_glucose && Number(f.fasting_glucose) >= 100,
    severity: 0.68,
    label: "Inflammatory metabolic load",
    cause: "Convenience diet with inactivity and elevated glucose creates chronic low-grade inflammation driving plaque formation.",
    projection: "This inflammatory pattern is the leading modifiable pathway to type 2 diabetes and coronary artery disease.",
    action: "Reduce refined carbs by replacing one processed meal daily with vegetables, legumes, and lean protein.",
    actionTimeline: "Fasting glucose and triglycerides respond to dietary changes within 4–8 weeks.",
  },
  {
    id: "lipid_burden",
    test: (f) => f.cholesterol && Number(f.cholesterol) >= 240 && f.diet === "frequent",
    severity: 0.62,
    label: "Dietary lipid burden",
    cause: "High cholesterol with convenience-food pattern suggests dietary saturated/trans fat driving LDL elevation.",
    projection: "Each 1% increase in saturated fat calories raises LDL ~2 mg/dL. Sustained high LDL accelerates plaque buildup.",
    action: "Replace one fried or processed meal daily with baked, steamed, or raw preparation.",
    actionTimeline: "LDL reduction of 5–15 mg/dL realistic within 6–8 weeks.",
  },
  {
    id: "smoking_compound",
    test: (f) => f.smoking === "yes" && f.systolic_bp && Number(f.systolic_bp) >= 130,
    severity: 0.88,
    label: "Smoking + hypertension compound",
    cause: "Smoking damages endothelial lining while hypertension increases wall stress — dramatically accelerating atherosclerosis.",
    projection: "Smokers with hypertension have 4–6x higher CVD event risk (WHO Global Burden of Disease).",
    action: "Smoking cessation is the single highest-impact action. Even reduction improves endothelial function within weeks.",
    actionTimeline: "CVD risk drops 50% within 1 year of cessation.",
  },
  {
    id: "diabetic_sedentary",
    test: (f) => f.diabetes === "yes" && f.activity_level === "low",
    severity: 0.75,
    label: "Diabetic sedentary pattern",
    cause: "Diabetes with inactivity accelerates microvascular damage, neuropathy, and cardiovascular complications.",
    projection: "Active diabetics have 35–45% lower cardiovascular mortality than sedentary diabetics (Look AHEAD trial).",
    action: "Aim for 150 min/week of moderate activity — even 10-minute sessions count.",
    actionTimeline: "Insulin sensitivity improvements detectable within 1–2 weeks of regular activity.",
  },
  {
    id: "sleep_bp",
    test: (f) => f.sleep_quality === "poor" && f.systolic_bp && Number(f.systolic_bp) >= 130,
    severity: 0.60,
    label: "Sleep-hypertension connection",
    cause: "Poor sleep disrupts nocturnal blood pressure dipping — a protective mechanism where BP falls during deep sleep.",
    projection: "Non-dipping BP patterns associated with 20–30% higher CVD event risk (MAPEC study).",
    action: "Prioritize sleep hygiene: consistent timing, cool dark room, no caffeine after 2 PM.",
    actionTimeline: "BP dipping pattern typically improves within 2–4 weeks of improved sleep.",
  },
  {
    id: "age_family",
    test: (f) => Number(f.age) >= 50 && f.family_history === "yes",
    severity: 0.50,
    label: "Age + family history convergence",
    cause: "After 50, genetic predisposition becomes increasingly impactful as age-related vascular changes compound inherited risk.",
    projection: "Family history of premature CVD with age >50 approximately doubles baseline population risk.",
    action: "Ensure annual lipid panel and BP monitoring — early detection allows intervention before events.",
    actionTimeline: "Ongoing — prevention is the primary strategy with family history.",
  },
];

/**
 * Analyze the form data and return detected cross-signal patterns.
 * @param {Object} form — the user's form data
 * @returns {Array<Object>} — detected patterns sorted by severity
 */
export function analyzePatterns(form) {
  const detected = [];
  for (const pattern of PATTERNS) {
    try {
      if (pattern.test(form)) {
        detected.push({
          id: pattern.id,
          severity: pattern.severity,
          label: pattern.label,
          cause: pattern.cause,
          projection: pattern.projection,
          action: pattern.action,
          actionTimeline: pattern.actionTimeline,
        });
      }
    } catch {
      // Skip patterns that error due to missing fields
    }
  }
  detected.sort((a, b) => b.severity - a.severity);
  return detected;
}

/**
 * Identify primary and secondary issues from detected patterns.
 */
export function identifyIssues(form, patterns) {
  const all = [...patterns];

  // Add individual risk factors not covered by patterns
  const patternIds = new Set(patterns.map((p) => p.id));
  const age = Number(form.age) || 30;

  if (form.smoking === "yes" && !patternIds.has("smoking_compound")) {
    all.push({
      id: "smoking", severity: 0.85, label: "Active smoking",
      cause: "Smoking directly damages arterial walls and promotes thrombosis.",
      projection: "Smoking is the leading modifiable CVD risk factor worldwide (WHO).",
      action: "Any reduction in smoking improves endothelial function. Cessation support doubles quit success.",
      actionTimeline: "Heart attack risk drops 50% within 1 year of quitting.",
    });
  }

  if (form.diabetes === "yes" && !patternIds.has("diabetic_sedentary")) {
    all.push({
      id: "diabetes_alone", severity: 0.70, label: "Diabetes",
      cause: "Diabetes causes chronic vascular damage through glycation and inflammation.",
      projection: "CVD is the leading cause of death in diabetics — tight glucose control reduces this risk.",
      action: "Monitor fasting glucose regularly and discuss HbA1c targets with your doctor.",
      actionTimeline: "Consistent glucose management shows CVD benefit within 6–12 months.",
    });
  }

  if (!all.length) {
    all.push({
      id: "baseline", severity: 0.10, label: "Standard cardiovascular maintenance",
      cause: `At age ${age}, maintaining current healthy patterns is the primary goal.`,
      projection: "Continued healthy lifestyle choices maintain low cardiovascular risk over time.",
      action: "Continue current habits and schedule preventive cardiovascular checks annually.",
      actionTimeline: "Ongoing protective benefit from sustained healthy patterns.",
    });
  }

  all.sort((a, b) => b.severity - a.severity);
  return {
    primary: all[0],
    secondary: all[1] || null,
    allFactors: all.slice(0, 5),
  };
}

// ── Clinical value interpretation (mirrors backend clinical_interpreter.py) ──

export function interpretBP(systolic, diastolic) {
  if (!systolic) return null;
  const s = Number(systolic);
  const d = Number(diastolic) || 0;
  let cat, label, severity;

  if (s >= 180 || d >= 120) { cat = "crisis"; label = "Hypertensive Crisis"; severity = 0.95; }
  else if (s >= 140 || d >= 90) { cat = "stage2"; label = "Stage 2 Hypertension"; severity = 0.72; }
  else if (s >= 130 || d >= 80) { cat = "stage1"; label = "Stage 1 Hypertension"; severity = 0.45; }
  else if (s >= 120) { cat = "elevated"; label = "Elevated"; severity = 0.20; }
  else { cat = "normal"; label = "Normal"; severity = 0.0; }

  return { category: cat, label, severity, systolic: s, diastolic: d, standard: "AHA/ACC 2017" };
}

export function interpretCholesterol(total, hdl, ldl) {
  const result = { components: {} };
  if (total) {
    const t = Number(total);
    let cat, severity;
    if (t >= 240) { cat = "high"; severity = 0.7; }
    else if (t >= 200) { cat = "borderline"; severity = 0.35; }
    else { cat = "desirable"; severity = 0.0; }
    result.components.total = { value: t, category: cat, severity };
  }
  if (hdl) {
    const h = Number(hdl);
    let cat, severity;
    if (h >= 60) { cat = "protective"; severity = 0.0; }
    else if (h >= 40) { cat = "moderate"; severity = 0.2; }
    else { cat = "low"; severity = 0.6; }
    result.components.hdl = { value: h, category: cat, severity };
  }
  if (ldl) {
    const l = Number(ldl);
    let cat, severity;
    if (l >= 190) { cat = "very_high"; severity = 0.85; }
    else if (l >= 160) { cat = "high"; severity = 0.65; }
    else if (l >= 130) { cat = "borderline"; severity = 0.4; }
    else if (l >= 100) { cat = "near_optimal"; severity = 0.15; }
    else { cat = "optimal"; severity = 0.0; }
    result.components.ldl = { value: l, category: cat, severity };
  }
  return Object.keys(result.components).length ? result : null;
}

export function interpretGlucose(glucose) {
  if (!glucose) return null;
  const g = Number(glucose);
  let cat, label, severity;
  if (g >= 126) { cat = "diabetes"; label = "Diabetes range"; severity = 0.8; }
  else if (g >= 100) { cat = "prediabetes"; label = "Prediabetes range"; severity = 0.4; }
  else { cat = "normal"; label = "Normal"; severity = 0.0; }
  return { category: cat, label, severity, value: g, standard: "ADA" };
}
