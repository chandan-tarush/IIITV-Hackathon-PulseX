export const INITIAL_FORM = {
  name: "",
  consent: false,
  age: "",
  gender: "",
  systolic_bp: "",
  diastolic_bp: "",
  cholesterol: "",
  hdl_cholesterol: "",
  ldl_cholesterol: "",
  fasting_glucose: "",
  triglycerides: "",
  smoking: "",
  diabetes: "",
  family_history: "",
  activity_level: "",
  sitting: "",
  stress: "",
  sleep_quality: "",
  diet: "",
  exertion_response: "",
};

export const SPLASH_LINES = [
  "We read the quiet signals your routine leaves on your heart.",
  "Then we turn them into guidance grounded in real medical standards.",
];

export const LANDING_PROMPTS = [
  "A data-driven read of how your daily patterns affect cardiovascular health.",
  "Real thresholds. Real reasoning. Personalized to your data.",
  "From WHO guidelines to your specific numbers — honest, specific insight.",
];

export const LOAD_MESSAGES = [
  "Analyzing cross-signal patterns from your inputs.",
  "Applying WHO and AHA clinical thresholds to your data.",
  "Identifying primary and secondary cardiovascular factors.",
  "Generating your personalized cardiovascular assessment.",
];

// ── Base questions (always asked) ──
export const BASE_QUESTIONS = [
  {
    id: "age",
    kind: "number",
    title: "What is your age?",
    body: "Age is the strongest non-modifiable cardiovascular risk factor. Each decade after 30 shifts the baseline.",
    placeholder: "32",
    min: 18,
    max: 100,
    optional: false,
    vibe: "vitals",
    micro: "Age factor registered.",
  },
  {
    id: "gender",
    kind: "choice",
    title: "Biological sex",
    body: "Cardiovascular risk profiles differ significantly between biological sexes due to hormonal and anatomical factors.",
    vibe: "vitals",
    micro: "Baseline set.",
    options: [
      { value: "male", label: "Male", note: "Male cardiovascular baseline" },
      { value: "female", label: "Female", note: "Female cardiovascular baseline" },
      { value: "other", label: "Other / prefer not to say", note: "Averaged baseline applied" },
    ],
  },
  {
    id: "smoking",
    kind: "choice",
    title: "Do you currently smoke?",
    body: "Smoking is the single strongest modifiable cardiovascular risk factor. Even occasional smoking counts.",
    vibe: "vitals",
    micro: "Smoking status recorded.",
    options: [
      { value: "yes", label: "Yes", note: "Any frequency" },
      { value: "no", label: "No", note: "Not currently" },
    ],
  },
  {
    id: "diabetes",
    kind: "choice",
    title: "Have you been diagnosed with diabetes?",
    body: "Diabetes fundamentally changes the cardiovascular risk equation through chronic vascular damage.",
    vibe: "vitals",
    micro: "Diabetes status noted.",
    options: [
      { value: "yes", label: "Yes", note: "Type 1 or Type 2" },
      { value: "no", label: "No", note: "Not diagnosed" },
    ],
  },
  {
    id: "family_history",
    kind: "choice",
    title: "Family history of heart disease?",
    body: "Premature heart disease in first-degree relatives (father <55, mother <65) is an independent risk factor.",
    vibe: "vitals",
    micro: "Family background captured.",
    options: [
      { value: "yes", label: "Yes", note: "Parents, siblings, or grandparents" },
      { value: "no", label: "No", note: "No known family history" },
    ],
  },
  {
    id: "activity_level",
    kind: "choice",
    title: "Weekly physical activity level",
    body: "WHO recommends 150+ minutes of moderate activity per week. How does your week usually look?",
    vibe: "activity",
    micro: "Activity level set.",
    options: [
      { value: "low", label: "Mostly inactive", note: "Less than 60 min/week of intentional movement" },
      { value: "medium", label: "Somewhat active", note: "60–150 min/week of walking or light exercise" },
      { value: "high", label: "Regularly active", note: "150+ min/week of moderate-to-vigorous activity" },
    ],
  },
  {
    id: "sitting",
    kind: "choice",
    title: "Daily sitting duration",
    body: "Prolonged sitting is an independent mortality risk factor — even for people who exercise (Lancet 2016).",
    vibe: "activity",
    micro: "Sedentary pattern noted.",
    options: [
      { value: "high", label: "8+ hours/day", note: "Desk work, driving, or screen time dominant" },
      { value: "medium", label: "4–8 hours/day", note: "Mixed sitting and movement" },
      { value: "low", label: "Under 4 hours/day", note: "Mostly on your feet" },
    ],
  },
  {
    id: "diet",
    kind: "choice",
    title: "Typical dietary pattern",
    body: "Dietary pattern directly influences cholesterol, blood pressure, glucose, and inflammation levels.",
    vibe: "lifestyle",
    micro: "Dietary pattern recorded.",
    options: [
      { value: "frequent", label: "Mostly processed/outside food", note: "Takeaway, packaged, or convenience food regularly" },
      { value: "moderate", label: "Mixed — some home, some outside", note: "A balance of both" },
      { value: "rare", label: "Mostly home-cooked", note: "Whole foods, prepared at home" },
    ],
  },
  {
    id: "exertion_response",
    kind: "choice",
    title: "How does routine physical effort feel?",
    body: "Climbing stairs, walking briskly, or standing quickly — does your body signal distress?",
    vibe: "activity",
    micro: "Exertion tolerance captured.",
    options: [
      { value: "strained", label: "Noticeably strained", note: "Breathlessness, heaviness, or discomfort during routine effort" },
      { value: "noticeable", label: "I notice it, but it passes", note: "Some effort awareness, not alarming" },
      { value: "easy", label: "Mostly effortless", note: "Routine activity feels comfortable" },
    ],
  },
];

// ── Conditional questions (triggered by previous answers / signals) ──
export const CONDITIONAL_QUESTIONS = {
  high_stress: [
    {
      id: "stress",
      kind: "choice",
      title: "How would you rate your current stress level?",
      body: "Chronic stress elevates cortisol and catecholamines — raising blood pressure and heart rate continuously.",
      vibe: "lifestyle",
      micro: "Stress level captured.",
      options: [
        { value: "high", label: "Persistently high", note: "Most days feel pressured or overwhelmed" },
        { value: "medium", label: "Moderate — manageable", note: "Some stress, generally coping" },
        { value: "low", label: "Generally calm", note: "Low-stress lifestyle currently" },
      ],
    },
  ],
  stress_deep: [
    {
      id: "sleep_quality",
      kind: "choice",
      title: "Sleep quality and morning recovery",
      body: "Sleep is when cardiovascular recovery occurs. Poor sleep disrupts nocturnal blood pressure dipping — a key protective mechanism.",
      vibe: "lifestyle",
      micro: "Sleep quality noted.",
      options: [
        { value: "poor", label: "Wake tired / disrupted", note: "Trouble falling/staying asleep, unrefreshed mornings" },
        { value: "ok", label: "Moderate — could be better", note: "Variable quality, sometimes okay" },
        { value: "good", label: "Consistently restful", note: "Usually wake refreshed, 7+ hours" },
      ],
    },
  ],
  always_stress: [
    {
      id: "stress",
      kind: "choice",
      title: "Current stress level",
      body: "Chronic stress is a cardiovascular risk factor through sustained sympathetic nervous system activation.",
      vibe: "lifestyle",
      micro: "Stress level set.",
      options: [
        { value: "high", label: "Persistently high", note: "Most days feel pressured" },
        { value: "medium", label: "Moderate", note: "Manageable pressure" },
        { value: "low", label: "Generally calm", note: "Low stress currently" },
      ],
    },
  ],
  always_sleep: [
    {
      id: "sleep_quality",
      kind: "choice",
      title: "Sleep quality",
      body: "Sleep quality directly impacts overnight cardiovascular recovery and next-day stress resilience.",
      vibe: "lifestyle",
      micro: "Sleep data captured.",
      options: [
        { value: "poor", label: "Poor — wake tired", note: "Disrupted or insufficient sleep" },
        { value: "ok", label: "Okay — variable", note: "Sometimes good, sometimes not" },
        { value: "good", label: "Good — consistently restful", note: "Regular, refreshing sleep" },
      ],
    },
  ],
};

// ── Clinical data fields ──
export const CLINICAL_FIELDS = [
  {
    id: "systolic_bp",
    label: "Systolic BP (top number)",
    unit: "mmHg",
    placeholder: "120",
    min: 80,
    max: 240,
    helper: "The upper number on your BP reading. Found on any blood pressure report or home monitor.",
    standard: "AHA: Normal <120, Elevated 120-129, Stage 1 130-139, Stage 2 ≥140",
  },
  {
    id: "diastolic_bp",
    label: "Diastolic BP (bottom number)",
    unit: "mmHg",
    placeholder: "80",
    min: 40,
    max: 160,
    helper: "The lower number on your BP reading. Usually reported alongside systolic.",
    standard: "AHA: Normal <80, Stage 1 80-89, Stage 2 ≥90",
  },
  {
    id: "cholesterol",
    label: "Total Cholesterol",
    unit: "mg/dL",
    placeholder: "195",
    min: 90,
    max: 400,
    helper: "Found in a lipid panel blood test. Usually labeled 'Total Cholesterol' or 'TC'.",
    standard: "ATP-III: Desirable <200, Borderline 200-239, High ≥240",
  },
  {
    id: "hdl_cholesterol",
    label: "HDL Cholesterol (good)",
    unit: "mg/dL",
    placeholder: "55",
    min: 15,
    max: 100,
    helper: "The 'good' cholesterol. Found in lipid panel. Higher is better — ≥60 is protective.",
    standard: "AHA: Low <40 (risk factor), Protective ≥60",
  },
  {
    id: "ldl_cholesterol",
    label: "LDL Cholesterol (bad)",
    unit: "mg/dL",
    placeholder: "110",
    min: 40,
    max: 300,
    helper: "The 'bad' cholesterol. Primary target for cardiovascular risk reduction.",
    standard: "ATP-III: Optimal <100, Near-optimal 100-129, Borderline 130-159, High ≥160",
  },
  {
    id: "fasting_glucose",
    label: "Fasting Blood Glucose",
    unit: "mg/dL",
    placeholder: "92",
    min: 50,
    max: 400,
    helper: "Measured after 8+ hours of fasting. Found on metabolic panel or glucose test.",
    standard: "ADA: Normal <100, Prediabetes 100-125, Diabetes ≥126",
  },
  {
    id: "triglycerides",
    label: "Triglycerides",
    unit: "mg/dL",
    placeholder: "140",
    min: 30,
    max: 600,
    helper: "Found in lipid panel blood test. Related to dietary carbohydrates and fats.",
    standard: "AHA: Normal <150, Borderline 150-199, High ≥200",
  },
];
