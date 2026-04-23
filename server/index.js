import http from "node:http";
import { URL } from "node:url";

const PORT = Number(process.env.PORT || 3001);
const ML_ENGINE_URL = process.env.ML_ENGINE_URL || "http://127.0.0.1:8000";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const GROQ_API_KEY =
  process.env.GROQ_API_KEY ||
  "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";

function json(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(body);
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  if (!chunks.length) return null;
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : null;
}

async function forward(pathname, init = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 14000);

  const response = await fetch(`${ML_ENGINE_URL}${pathname}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    signal: controller.signal,
  }).finally(() => clearTimeout(timeout));

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const error = new Error(data?.detail || "Upstream request failed");
    error.statusCode = response.status;
    error.payload = data;
    throw error;
  }

  return data;
}

function toLanguageLabel(language) {
  if (language === "hi") return "Hindi";
  if (language === "hinglish") return "Hinglish";
  return "English";
}

function takeList(value, fallback = []) {
  return Array.isArray(value) && value.length ? value : fallback;
}

function confidenceNote(score, language) {
  if (language === "hi") {
    if (score >= 90) return "उच्च चिकित्सीय विश्वास";
    if (score >= 78) return "अच्छा चिकित्सीय विश्वास";
    return "सावधानी से व्याख्या करें";
  }
  if (language === "hinglish") {
    if (score >= 90) return "High medical confidence";
    if (score >= 78) return "Good medical confidence";
    return "Interpret with caution";
  }
  if (score >= 90) return "High medical confidence";
  if (score >= 78) return "Good medical confidence";
  return "Interpret with caution";
}

function buildClinicalContext(result, form) {
  return {
    patient_name: result?.name || form?.name || "Anonymous",
    age: Number(form?.age || result?.age || 0),
    risk_level: result?.risk_level,
    risk_score: result?.risk_score,
    confidence: result?.confidence,
    heart_age: result?.heart_age,
    primary_issue: result?.primary_issue || null,
    secondary_issue: result?.secondary_issue || null,
    detected_patterns: result?.detected_patterns || [],
    care_flags: result?.care_flags || [],
    symptom_watch: result?.symptom_watch || [],
    food_guidance: result?.food_guidance || {},
    clinical_interpretations: result?.clinical_interpretations || {},
    explanations: result?.explanations || [],
    doctor_visit_script: result?.doctor_visit_script || [],
    profile_snapshot: result?.profile_snapshot || {},
    possible_body_signals: result?.possible_body_signals || [],
    confirmed_signals: result?.confirmed_signals || [],
    followup_answers: result?.followup_answers || {},
    intake: {
      gender: form?.gender,
      smoking: form?.smoking,
      cigarettes_per_day: form?.cigarettes_per_day,
      diabetes: form?.diabetes,
      family_history: form?.family_history,
      activity_level: form?.activity_level,
      sitting: form?.sitting,
      exertion_response: form?.exertion_response,
      chest_symptom_pattern: form?.chest_symptom_pattern,
      breathlessness_pattern: form?.breathlessness_pattern,
      recovery_after_effort: form?.recovery_after_effort,
      stress: form?.stress,
      stress_trigger_pattern: form?.stress_trigger_pattern,
      sleep_quality: form?.sleep_quality,
      sleep_hours: form?.sleep_hours ?? null,
      snoring_pattern: form?.snoring_pattern,
      diet: form?.diet,
      fruit_veg_servings: form?.fruit_veg_servings,
      sugary_drinks: form?.sugary_drinks,
      salt_intake: form?.salt_intake,
      meal_timing_pattern: form?.meal_timing_pattern,
      systolic_bp: form?.systolic_bp ?? null,
      diastolic_bp: form?.diastolic_bp ?? null,
      cholesterol: form?.cholesterol ?? null,
      hdl_cholesterol: form?.hdl_cholesterol ?? null,
      ldl_cholesterol: form?.ldl_cholesterol ?? null,
      fasting_glucose: form?.fasting_glucose ?? null,
      triglycerides: form?.triglycerides ?? null,
    },
  };
}

function section(id, eyebrow, title, body, bullets, confidenceScore, language) {
  return {
    id,
    eyebrow,
    title,
    body,
    bullets: takeList(bullets).slice(0, 5),
    confidence_score: confidenceScore,
    confidence_note: confidenceNote(confidenceScore, language),
  };
}

function buildFallbackDetailedReport(language, result, form) {
  const patient = result?.name || form?.name || (language === "hi" ? "रोगी" : language === "hinglish" ? "patient" : "the patient");
  const score = Math.max(72, Math.min(96, Number(result?.confidence || 80)));

  const copy = {
    en: {
      headline: "Doctor-style grounded briefing",
      subheadline: result?.message || "",
      summary: "Core picture",
      drivers: "Main drivers",
      patterns: "Functional patterns",
      clinical: "Clinical reading",
      actions: "Immediate focus",
      doctors: "Doctor discussion",
      deeper: "Refinement focus",
      profile: `${patient}'s current profile`,
      risk: `${patient}'s current risk picture`,
      nutrition: "Nutrition and lifestyle focus",
      deeperBody: "This section is used to reconfirm the patterns found in the first analysis and tighten the medical picture before follow-up.",
    },
    hi: {
      headline: "डॉक्टर-शैली आधारित चिकित्सीय ब्रीफिंग",
      subheadline: result?.message || "",
      summary: "मुख्य चित्र",
      drivers: "मुख्य कारण",
      patterns: "कार्यात्मक पैटर्न",
      clinical: "क्लिनिकल रीडिंग",
      actions: "तत्काल फोकस",
      doctors: "डॉक्टर से चर्चा",
      deeper: "गहन पुनर्पुष्टि",
      profile: `${patient} की वर्तमान स्वास्थ्य-प्रोफ़ाइल`,
      risk: `${patient} का वर्तमान जोखिम-चित्र`,
      nutrition: "आहार और दिनचर्या फोकस",
      deeperBody: "यह भाग प्रारम्भिक विश्लेषण में उभरे पैटर्न की पुनर्पुष्टि करने और चिकित्सीय चित्र को और स्पष्ट करने के लिए है।",
    },
    hinglish: {
      headline: "Doctor-style grounded briefing",
      subheadline: result?.message || "",
      summary: "Core picture",
      drivers: "Main drivers",
      patterns: "Functional patterns",
      clinical: "Clinical reading",
      actions: "Immediate focus",
      doctors: "Doctor discussion",
      deeper: "Refinement focus",
      profile: `${patient} ka current health profile`,
      risk: `${patient} ka current risk picture`,
      nutrition: "Nutrition and routine focus",
      deeperBody: "Yeh section pehle analysis mein nikle patterns ko reconfirm karne aur medical picture ko aur tight karne ke liye hai.",
    },
  }[language] || {
    headline: "Doctor-style grounded briefing",
    subheadline: result?.message || "",
    summary: "Core picture",
    drivers: "Main drivers",
    patterns: "Functional patterns",
    clinical: "Clinical reading",
    actions: "Immediate focus",
    doctors: "Doctor discussion",
    deeper: "Refinement focus",
    profile: `${patient}'s current profile`,
    risk: `${patient}'s current risk picture`,
    nutrition: "Nutrition and lifestyle focus",
    deeperBody: "This section is used to reconfirm the patterns found in the first analysis and tighten the medical picture before follow-up.",
  };

  return {
    headline: copy.headline,
    subheadline: copy.subheadline,
    summary_cards: [
      section(
        "summary-profile",
        copy.summary,
        copy.profile,
        result?.emotional_message || result?.message || "",
        result?.daily_story || result?.care_flags || [],
        score,
        language,
      ),
      section(
        "summary-risk",
        copy.clinical,
        copy.risk,
        language === "hi"
          ? `वर्तमान जोखिम-स्कोर ${result?.risk_score ?? "-"} है और जोखिम-स्तर ${result?.risk_level || "अज्ञात"} है।`
          : language === "hinglish"
            ? `Current risk score ${result?.risk_score ?? "-"} hai aur risk level ${result?.risk_level || "unknown"} hai.`
            : `Current risk score is ${result?.risk_score ?? "-"} with a ${result?.risk_level || "unknown"} risk level.`,
        result?.top_factors || [],
        Math.max(74, score - 2),
        language,
      ),
    ],
    tabs: {
      overview: [
        section("overview-primary", copy.summary, result?.primary_issue?.label || copy.profile, result?.primary_issue?.cause || result?.message || "", result?.daily_story || [], score, language),
      ],
      patterns: [
        section("patterns-drivers", copy.drivers, copy.patterns, result?.secondary_issue?.cause || result?.primary_issue?.projection || "", result?.possible_body_signals || [], Math.max(72, score - 6), language),
      ],
      clinical: [
        section("clinical-reading", copy.clinical, copy.clinical, result?.doctor_guidance || result?.message || "", Object.values(result?.clinical_interpretations || {}).map((item) => item?.summary).filter(Boolean), Math.max(78, score - 1), language),
      ],
      actions: [
        section("actions-care", copy.actions, copy.actions, result?.refinement_summary || result?.doctor_guidance || "", [...takeList(result?.care_flags), ...takeList(result?.symptom_watch)], Math.max(80, score - 2), language),
        section("actions-food", copy.nutrition, copy.nutrition, language === "hi" ? "आहार को सरल, दोहराने योग्य और रक्तचाप-अनुकूल रखना सबसे उपयोगी रहेगा।" : language === "hinglish" ? "Diet ko simple, repeatable aur BP-friendly rakhna sabse practical hoga." : "Keeping the diet simple, repeatable, and blood-pressure friendly will be most practical.", [...takeList(result?.food_guidance?.lean_into), ...takeList(result?.food_guidance?.ease_off)], Math.max(76, score - 4), language),
      ],
      doctors: [
        section("doctors-points", copy.doctors, copy.doctors, language === "hi" ? "डॉक्टर से मिलते समय नीचे की बातें साथ ले जाना उपयोगी रहेगा।" : language === "hinglish" ? "Doctor se milte waqt yeh points saath rakhna useful rahega." : "These are the most useful grounded points to carry into a clinician discussion.", result?.doctor_visit_script || [], Math.max(84, score), language),
      ],
      deeper: [
        section("deeper-reconfirm", copy.deeper, copy.deeper, copy.deeperBody, [...takeList(result?.confirmed_signals), ...takeList(result?.followup_questions?.map((item) => item?.question))].filter(Boolean), Math.max(74, score - 5), language),
      ],
    },
  };
}

function fallbackInsight(language, result, form) {
  const patient = result?.name || form?.name || "The patient";
  return {
    headline: language === "hi" ? "विस्तृत क्लिनिकल ब्रीफिंग" : "Deeper clinical briefing",
    section_labels: {
      summary: language === "hi" ? "सारांश" : "Summary",
      patterns: language === "hi" ? "संभावित पैटर्न" : "Likely patterns",
      care: language === "hi" ? "सावधानियाँ" : "Precautions",
      food: language === "hi" ? "पोषण" : "Nutrition",
    },
    executive_summary: [
      language === "hi"
        ? `${patient} का जोखिम-स्कोर ${result?.risk_score}/100 है और जोखिम-स्तर ${result?.risk_level || "अज्ञात"} दिख रहा है।`
        : language === "hinglish"
          ? `${patient} ka risk score ${result?.risk_score}/100 hai aur risk level ${result?.risk_level || "unknown"} dikh raha hai.`
          : `${patient} has a risk score of ${result?.risk_score}/100 with a ${result?.risk_level || "unknown"} risk profile.`,
      result?.message || "",
      result?.emotional_message || "",
    ].filter(Boolean),
    likely_daily_patterns: [
      language === "hi"
        ? "जीवनशैली के पैटर्न से लगता है कि रिकवरी, गतिविधि और आहार तीनों पर साथ में काम करने की आवश्यकता है।"
        : language === "hinglish"
          ? "Lifestyle pattern se lag raha hai ki recovery, movement aur diet tino par ek saath kaam karna padega."
          : "The lifestyle pattern suggests that recovery, movement, and nutrition all need attention together.",
      ...(result?.daily_story || []).slice(0, 2),
    ],
    precautions: [
      language === "hi"
        ? "अगले चरण में रक्तचाप, प्रयास-सम्बन्धी लक्षण और भोजन के पैटर्न को ट्रैक करते हुए डॉक्टर-परामर्श को प्राथमिकता दें।"
        : language === "hinglish"
          ? "Agla step blood pressure, exertion symptoms aur food pattern ko track karke doctor consult ko priority dena hai."
          : "The next step is to track blood pressure, effort tolerance, and food habits while prioritizing a clinician review.",
      ...(result?.care_flags || []).slice(0, 3),
    ],
    food_intro: language === "hi" ? "आहार-योजना को सरल और टिकाऊ रखें।" : language === "hinglish" ? "Nutrition plan ko simple aur sustainable rakho." : "Keep the nutrition plan simple and sustainable.",
    foods_to_prioritize: result?.food_guidance?.lean_into || [],
    foods_to_reduce: result?.food_guidance?.ease_off || [],
  };
}

function fallbackAssistant(language, result, messages) {
  const risk = result?.risk_level || "unknown";
  const score = result?.risk_score ?? "–";
  const lastUserMsg = (Array.isArray(messages) ? messages.filter(m => m.role === "user").pop()?.content : "") || "";
  const q = lastUserMsg.toLowerCase();

  // Contextual fallback: try to give a useful answer based on what the user actually asked
  let body = "";

  if (/exercise|workout|walk|run|gym|yoga|stretch|move|physical/i.test(q)) {
    const base = risk === "High" || risk === "Very High"
      ? "Given your elevated risk profile, start with low-impact activities like walking 15–20 minutes daily, gentle stretching, or chair yoga. Avoid heavy lifting or intense cardio until a doctor clears you. Gradually build up to 150 minutes of moderate activity per week (WHO guideline)."
      : "Aim for at least 150 minutes of moderate aerobic activity per week — brisk walking, cycling, swimming, or yoga are all excellent choices. Add light resistance training 2 days a week. Movement is the single most protective lifestyle factor for cardiovascular health.";
    body = base + " Always warm up before exercise and cool down after. Listen to your body — stop if you feel chest pain, dizziness, or unusual breathlessness.";
  } else if (/eat|food|diet|nutrition|meal|breakfast|lunch|dinner|snack|fruit|vegetable|cook/i.test(q)) {
    const foods = result?.food_guidance;
    const leanInto = foods?.lean_into?.slice(0, 3)?.join(". ") || "Vegetables, legumes, whole grains, nuts, and fish — the Mediterranean pattern shows consistent cardiovascular benefit";
    const easeOff = foods?.ease_off?.slice(0, 2)?.join(". ") || "Processed foods high in sodium, trans fats, and added sugars";
    body = `Based on your profile (risk: ${risk}), here is practical dietary guidance:\n\nPrioritize: ${leanInto}.\n\nReduce: ${easeOff}.\n\nKeep meals simple, repeatable, and home-cooked when possible. Consistent meal timing also helps regulate glucose and lipid metabolism.`;
  } else if (/sleep|rest|insomnia|tired|fatigue|nap|snor/i.test(q)) {
    body = `Sleep is your heart's recovery window. Aim for 7–8 hours of quality sleep. ${result?.profile_snapshot?.energy_pattern === "likely stretched and inconsistent" ? "Your profile suggests your energy pattern is already stretched — protecting sleep will have outsized returns." : ""} Tips: keep a consistent schedule, avoid screens 1 hour before bed, keep the room cool and dark, and limit caffeine after 2 PM. If you snore or gasp during sleep, mention it to your doctor — it may indicate sleep apnea, which raises cardiovascular risk.`;
  } else if (/stress|anxi|relax|meditat|calm|tension|nervous/i.test(q)) {
    body = "Chronic stress keeps cortisol and adrenaline elevated, raising blood pressure and heart rate over time. Evidence-backed strategies: daily 10-minute breathing exercises (box breathing: inhale 4s, hold 4s, exhale 4s, hold 4s), progressive muscle relaxation, regular walks in nature, and limiting news/social media exposure. If stress feels unmanageable, speaking with a counselor is a sign of strength, not weakness.";
  } else if (/score|risk|result|mean|number|assessment|report/i.test(q)) {
    body = `Your assessment shows a ${risk} risk level with a score of ${score}/100. ${result?.message || ""} ${result?.primary_issue ? `The primary area identified is: ${result.primary_issue.label || result.primary_issue.cause || ""}.` : ""} This score combines clinical data, lifestyle factors, and published medical thresholds. It is not a diagnosis — it is an awareness estimate to help guide conversations with your doctor.`;
  } else if (/doctor|hospital|clinic|visit|appointment|emergency|urgent/i.test(q)) {
    const scripts = result?.doctor_visit_script?.slice(0, 3)?.join(" ") || "";
    body = `${risk === "High" || risk === "Very High" ? "Your risk level suggests a doctor visit should be prioritized soon." : "A preventive check-up would be a wise next step."} When you visit, mention that you used a cardiovascular risk assessment tool. ${scripts ? "Key talking points: " + scripts : ""} Bring any recent lab reports and a list of current symptoms.`;
  } else if (/symptom|chest|breath|dizz|palpitat|swell|pain|headache/i.test(q)) {
    const watches = result?.symptom_watch?.slice(0, 3)?.join(" ") || "";
    body = `Based on your profile, here are the symptoms to watch: ${watches || "Track how your body responds to effort — catching changes early is prevention."}\n\nIMPORTANT: If you experience sudden chest pain, severe breathlessness, fainting, or one-sided weakness, seek emergency medical care immediately. Do not wait.`;
  } else if (/bp|blood pressure|hypertens|systolic|diastolic/i.test(q)) {
    const sbp = result?.clinical_interpretations?.bp;
    body = `${sbp ? sbp.summary || "" : "Blood pressure is a key cardiovascular marker."} Normal BP is below 120/80 mmHg. Elevated is 120-129/<80. Stage 1 hypertension is 130-139/80-89. Stage 2 is ≥140/≥90. ${result?.intake?.systolic_bp ? `Your recorded systolic BP is ${result.intake.systolic_bp} mmHg.` : ""} To manage BP: reduce sodium, increase potassium-rich foods, exercise regularly, manage stress, and follow any prescribed medication.`;
  } else if (/cholesterol|hdl|ldl|triglyceride|lipid/i.test(q)) {
    const chol = result?.clinical_interpretations?.cholesterol;
    body = `${chol ? chol.summary || "" : "Cholesterol management is important for heart health."} Desirable total cholesterol is <200 mg/dL. HDL (good cholesterol) should be ≥60 mg/dL. LDL (bad cholesterol) should be <100 mg/dL ideally. Triglycerides should be <150 mg/dL. To improve: eat more fiber, omega-3 fatty acids, and reduce saturated/trans fats.`;
  } else if (/sugar|glucose|diabetes|insulin|a1c/i.test(q)) {
    const glu = result?.clinical_interpretations?.glucose;
    body = `${glu ? glu.summary || "" : "Blood sugar management is closely linked to cardiovascular health."} Normal fasting glucose is <100 mg/dL. Prediabetes is 100-125 mg/dL. Diabetes is ≥126 mg/dL (ADA). To manage: limit refined carbs and sugary drinks, maintain regular meal timing, stay physically active, and monitor glucose regularly if elevated.`;
  } else if (/smok|cigarette|tobacco|nicotine|quit|vape/i.test(q)) {
    body = "Smoking is the single strongest modifiable cardiovascular risk factor. It damages blood vessel lining, promotes clot formation, raises blood pressure, and lowers HDL cholesterol. Quitting at any age reduces risk — within 1 year, heart attack risk drops significantly. Strategies: nicotine replacement therapy, prescription medications (talk to your doctor), behavioral counseling, and support groups. Even reducing quantity helps, but complete cessation is the goal.";
  } else {
    // General catch-all that still references the patient's context
    body = `Your current assessment shows a ${risk} risk profile (score: ${score}/100). ${result?.message || ""} I can help you understand your report, suggest exercises, dietary changes, sleep improvements, stress management, or explain any medical term. Feel free to ask anything about your health — I'll answer while keeping your specific profile in mind.`;
  }

  // Translate if needed
  if (language === "hi") {
    // Return English for now since proper Hindi generation needs the LLM — but prefix with a Hindi note
    return `(नोट: विस्तृत हिन्दी उत्तर के लिए कृपया पुनः प्रयास करें)\n\n${body}`;
  }
  if (language === "hinglish") {
    return body;
  }
  return body;
}

function extractJson(text) {
  try {
    return JSON.parse(text);
  } catch {}

  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  if (fenced) {
    try {
      return JSON.parse(fenced[1]);
    } catch {}
  }

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {}
  }

  throw new Error("Model response was not valid JSON.");
}

async function callGroq(messages, temperature = 0.35, maxTokens = 2200) {
  if (!GROQ_API_KEY) {
    throw new Error("Missing Groq API key.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
    signal: controller.signal,
  }).finally(() => clearTimeout(timeout));

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error?.message || `Groq request failed with ${response.status}`);
  }

  const content = payload?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Groq did not return any content.");
  }

  return content;
}

async function generateInsights({ result, form, language }) {
  const clinicalContext = buildClinicalContext(result, form);
  const languageLabel = toLanguageLabel(language);

  const systemPrompt = [
    "You are PulseX Doctor Briefing Writer — an expert cardiological health analyst.",
    "The diagnosis has already been produced by a non-LLM cardiovascular pipeline.",
    "You must not invent new diseases, diagnoses, lab values, or risk scores.",
    "Use only grounded details from the supplied assessment, but expand them with deep medical insight.",
    `Write in ${languageLabel}.`,
    "If language is Hindi, use pure Devanagari script and standard Hindi, not Roman Hindi.",
    "If language is Hinglish, use Roman script only.",
    "",
    "IMPORTANT: Write with depth and clinical specificity. Do NOT give shallow generic bullet points.",
    "Each point should be specific to THIS patient's data — mention their actual values, patterns, and risk factors.",
    "Write like a thoughtful doctor who knows the patient's full picture.",
    "",
    "Return ONLY valid JSON with this structure:",
    "{",
    '  "headline": string (a warm, specific headline about this patient\'s health status),',
    '  "section_labels": { "summary": string, "patterns": string, "care": string, "food": string, "exercise": string, "sleep": string, "stress": string },',
    '  "executive_summary": string[] (at least 5 detailed, data-specific points about this patient\'s cardiovascular picture),',
    '  "likely_daily_patterns": string[] (at least 4 day-in-the-life scenarios describing how their habits affect their heart — be vivid and specific),',
    '  "precautions": string[] (at least 5 actionable precautions with specific steps, not vague advice),',
    '  "food_intro": string (a personalized intro to their dietary situation),',
    '  "foods_to_prioritize": string[] (at least 5 specific foods/meals with reasons tied to their condition),',
    '  "foods_to_reduce": string[] (at least 4 specific items with reasons tied to their risk factors),',
    '  "exercise_recommendations": string[] (at least 4 specific exercise recommendations — type, duration, frequency, tailored to their risk level and condition),',
    '  "sleep_recommendations": string[] (at least 3 specific sleep improvement tips based on their sleep quality and stress data),',
    '  "stress_management": string[] (at least 3 actionable stress management strategies based on their stress profile)',
    "}",
  ].join("\n");

  const userPrompt = `Grounded cardiovascular assessment data:\n${JSON.stringify(clinicalContext, null, 2)}`;
  const content = await callGroq(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    0.32,
    2800,
  );

  return extractJson(content);
}

async function generateIntakeQuestion({ form, question, language }) {
  const languageLabel = toLanguageLabel(language);
  const systemPrompt = [
    "You are PulseX Intake Interview Writer.",
    "Your task is to rewrite the next intake question so it sounds like a thoughtful, experienced doctor.",
    "Do not diagnose. Do not invent new medical conclusions.",
    "Do not change the question id, kind, min, max, placeholder, or option values.",
    "You may improve clarity, empathy, specificity, and option labels/notes.",
    `Write in ${languageLabel}.`,
    "If language is Hindi, use pure Devanagari script and standard Hindi, not Roman Hindi.",
    "If language is Hinglish, use Roman script only.",
    "Return ONLY valid JSON.",
    "{",
    '  "id": string,',
    '  "kind": "choice" | "number",',
    '  "title": string,',
    '  "body": string,',
    '  "micro": string,',
    '  "placeholder": string | null,',
    '  "min": number | null,',
    '  "max": number | null,',
    '  "options": [{ "value": string, "label": string, "note": string | null }]',
    "}",
  ].join("\n");

  const userPrompt = `Current intake context:\n${JSON.stringify(form || {}, null, 2)}\n\nRewrite this question without changing its meaning or answer values:\n${JSON.stringify(question || {}, null, 2)}`;
  const content = await callGroq(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    0.45,
    1200,
  );

  return extractJson(content);
}

async function generateDetailedReport({ result, form, language }) {
  const clinicalContext = buildClinicalContext(result, form);
  const languageLabel = toLanguageLabel(language);

  const systemPrompt = [
    "You are PulseX Doctor Report Writer.",
    "The diagnosis and scores have already been produced by a non-LLM cardiovascular pipeline.",
    "You must stay grounded to the supplied findings only.",
    "Do not invent new diseases, diagnoses, scores, lab values, symptom histories, or advice that requires missing evidence.",
    "Create a polished, professional, medically useful report.",
    "Write only sections that are meaningfully supported by the input.",
    "Do not include weak, generic filler. If evidence is weak, omit the section.",
    "Every included section should feel like a senior clinician briefing a patient or another doctor, not like a chatbot summary.",
    "Prefer specifics over slogans: connect scores, symptoms, habits, and likely day-to-day patterns when the evidence supports it.",
    "Each section body should usually be 2 to 4 sentences, and bullets should add concrete observations or precautions instead of repeating the body.",
    "When a tab has meaningful evidence, include at least one strong section for it. Use up to three sections in a tab if the evidence justifies it.",
    "Do not speculate beyond the supplied evidence. If you infer a likely routine pattern, make it cautious and clearly tied to the findings.",
    "Every section must include a confidence_score from 70 to 98.",
    "The higher the confidence_score, the more directly grounded the section must be.",
    `Write in ${languageLabel}.`,
    "If language is Hindi, use pure Devanagari script and standard medical Hindi, not Roman Hindi.",
    "If language is Hinglish, use Roman script only.",
    "Return ONLY valid JSON.",
    "Schema:",
    "{",
    '  "headline": string,',
    '  "subheadline": string,',
    '  "summary_cards": [{ "id": string, "eyebrow": string, "title": string, "body": string, "bullets": string[], "confidence_score": number, "confidence_note": string }],',
    '  "tabs": {',
    '    "overview": [{ "id": string, "eyebrow": string, "title": string, "body": string, "bullets": string[], "confidence_score": number, "confidence_note": string }],',
    '    "patterns": [{ "id": string, "eyebrow": string, "title": string, "body": string, "bullets": string[], "confidence_score": number, "confidence_note": string }],',
    '    "clinical": [{ "id": string, "eyebrow": string, "title": string, "body": string, "bullets": string[], "confidence_score": number, "confidence_note": string }],',
    '    "actions": [{ "id": string, "eyebrow": string, "title": string, "body": string, "bullets": string[], "confidence_score": number, "confidence_note": string }],',
    '    "doctors": [{ "id": string, "eyebrow": string, "title": string, "body": string, "bullets": string[], "confidence_score": number, "confidence_note": string }],',
    '    "deeper": [{ "id": string, "eyebrow": string, "title": string, "body": string, "bullets": string[], "confidence_score": number, "confidence_note": string }]',
    "  }",
    "}",
  ].join("\n");

  const userPrompt = `Grounded cardiovascular assessment data:\n${JSON.stringify(clinicalContext, null, 2)}`;
  const content = await callGroq(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    0.32,
    3200,
  );

  return extractJson(content);
}

async function generateAssistantReply({ messages, result, form, language }) {
  const clinicalContext = buildClinicalContext(result, form);
  const languageLabel = toLanguageLabel(language);

  const systemPrompt = [
    "You are PulseX MedAssist — a warm, knowledgeable health assistant built into a cardiovascular assessment app called Beatly.",
    "",
    "CORE IDENTITY:",
    "You are helpful, empathetic, and practical. You answer ANY health-related question the patient asks — diet, exercise, sleep, stress, lifestyle habits, what medical terms mean, what they should eat, what exercises to do or avoid, how to talk to their doctor, or anything else about their wellbeing.",
    "",
    "PATIENT CONTEXT (from their cardiovascular assessment):",
    `${JSON.stringify(clinicalContext)}`,
    "",
    "HOW TO USE THE CONTEXT:",
    "- Always keep this patient's specific health profile in mind when answering.",
    "- If the patient has high blood pressure, tailor exercise and diet advice accordingly.",
    "- If they smoke, and they ask about exercise, mention that quitting smoking alongside exercise yields the best results.",
    "- If they have diabetes, factor that into any food or lifestyle recommendations.",
    "- Reference their specific risk score, risk level, detected patterns, care flags, and food guidance when relevant.",
    "",
    "WHAT YOU CAN DO:",
    "- Answer general health and wellness questions (\"what should I eat?\", \"what exercises are safe for me?\", \"how much water should I drink?\")",
    "- Explain any part of their assessment report in simple language",
    "- Provide practical, actionable lifestyle advice personalized to their condition",
    "- Explain medical terms, lab values, and what certain numbers mean",
    "- Suggest specific foods, meal ideas, exercise routines, and stress management techniques",
    "- Help them prepare questions for their doctor",
    "- Discuss general cardiovascular health education",
    "",
    "SAFETY RULES:",
    "- For emergency symptoms (sudden chest pain, severe breathlessness, fainting, one-sided weakness, stroke signs), ALWAYS tell them to call emergency services or go to the nearest ER immediately. Do not hedge.",
    "- Do not recommend specific prescription drugs by name — say 'your doctor may consider medication for X' instead.",
    "- Do not invent new diagnoses not supported by their assessment data.",
    "- Always remind them that your guidance supplements but does not replace a doctor's advice when the question is medically serious.",
    "",
    "TONE AND STYLE:",
    "- Be warm, clear, and encouraging — like a knowledgeable friend who happens to be medically literate.",
    "- Give specific, practical advice — not vague slogans. Say 'walk 20 minutes after dinner' not 'try to be more active'.",
    "- Use bullet points or short paragraphs for readability.",
    "- When answering food questions, give actual food examples and simple meal ideas.",
    "- When answering exercise questions, give specific routines with durations and frequencies.",
    `- Reply in ${languageLabel}.`,
    "- If language is Hindi, use pure Devanagari script and standard Hindi, not Roman Hindi.",
    "- If language is Hinglish, use Roman script only.",
  ].join("\n");

  const content = await callGroq(
    [
      { role: "system", content: systemPrompt },
      ...(Array.isArray(messages) ? messages : []),
    ],
    0.45,
    2000,
  );

  return { reply: content };
}

async function generateAdaptiveQuestion({ result, form, previousQA, questionIndex, language }) {
  const languageLabel = toLanguageLabel(language);
  const clinicalContext = buildClinicalContext(result, form);

  const maxQuestions = 6;
  const currentIndex = questionIndex || 0;

  if (currentIndex >= maxQuestions) {
    return { done: true };
  }

  const previousHistory = (previousQA || []).map((qa, i) =>
    `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer}`
  ).join("\n\n");

  const systemPrompt = [
    "You are PulseX Adaptive Deep Dive Specialist — a thoughtful, experienced cardiologist.",
    "The initial assessment has been completed. You are now conducting a targeted follow-up interview.",
    "",
    "YOUR GOAL: Ask the SINGLE most important next question to verify, deepen, or refine specific findings from the initial assessment.",
    "",
    "REASONING RULES:",
    "1. Study the detected patterns, risk factors, and clinical interpretations carefully.",
    "2. Consider what has already been asked — NEVER repeat a topic.",
    "3. Each question should target a SPECIFIC finding — for example:",
    "   - If 'recovery_deficit' was detected, ask about specific sleep disruption patterns, dream quality, or nighttime waking",
    "   - If 'vascular_stress' was detected, ask about headache location during stress, visual disturbances, facial flushing",
    "   - If high BP found, ask about morning symptoms, nosebleeds, or blurred vision episodes",
    "   - If 'sedentary_metabolic' was detected, ask about post-meal energy crashes, sugar cravings, belt size changes",
    "   - If smoking compound, ask about morning cough quality, cold fingers/toes, shortness of breath timeline",
    "4. Start each question's 'why' with which specific finding triggered this question.",
    "5. Make options clinically meaningful — each answer should help differentiate between benign and concerning patterns.",
    "6. Sound warm and human — like a doctor who genuinely cares, not a robot running a checklist.",
    "",
    `Write everything in ${languageLabel}.`,
    "If language is Hindi, use pure Devanagari script and standard Hindi.",
    "If language is Hinglish, use Roman script only.",
    "",
    `This is question ${currentIndex + 1} of ${maxQuestions}.`,
    currentIndex >= maxQuestions - 2
      ? "These are the final questions — focus on the most impactful remaining concern."
      : "",
    "",
    "Return ONLY valid JSON:",
    "{",
    '  "done": false,',
    '  "question": string (the question to ask — warm, specific, referencing the finding),',
    '  "why": string (which specific finding triggered this question and why it matters),',
    '  "finding_reference": string (the pattern_id or clinical finding this probes),',
    '  "options": [',
    '    { "value": string (short key), "label": string (answer text), "note": string | null (clarifying detail) }',
    '  ]',
    "}",
    "",
    "If there are truly no more meaningful questions to ask, return: { \"done\": true }",
  ].join("\n");

  const userPrompt = [
    "ASSESSMENT DATA:",
    JSON.stringify(clinicalContext, null, 2),
    "",
    previousHistory ? `PREVIOUS DEEP DIVE Q&A:\n${previousHistory}` : "No previous questions asked yet.",
  ].join("\n");

  const content = await callGroq(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    0.4,
    800,
  );

  return extractJson(content);
}

const server = http.createServer(async (req, res) => {
  if (!req.url) {
    return json(res, 400, { error: "Missing request URL" });
  }

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  try {
    if (req.method === "GET" && url.pathname === "/api/health") {
      return json(res, 200, await forward("/health"));
    }

    if (req.method === "GET" && url.pathname === "/api/history") {
      const limit = url.searchParams.get("limit") || "8";
      return json(res, 200, await forward(`/history?limit=${encodeURIComponent(limit)}`));
    }

    if (req.method === "POST" && url.pathname === "/api/predict") {
      const body = await readBody(req);
      return json(res, 200, await forward("/predict", { method: "POST", body: JSON.stringify(body || {}) }));
    }

    if (req.method === "POST" && url.pathname === "/api/simulate") {
      const body = await readBody(req);
      return json(res, 200, await forward("/simulate", { method: "POST", body: JSON.stringify(body || {}) }));
    }

    if (req.method === "POST" && url.pathname === "/api/refine") {
      const body = await readBody(req);
      return json(res, 200, await forward("/refine", { method: "POST", body: JSON.stringify(body || {}) }));
    }

    if (req.method === "POST" && url.pathname === "/api/insights") {
      const body = (await readBody(req)) || {};
      try {
        const insight = await generateInsights(body);
        return json(res, 200, insight);
      } catch {
        return json(res, 200, fallbackInsight(body.language, body.result, body.form));
      }
    }

    if (req.method === "POST" && url.pathname === "/api/intake-question") {
      const body = (await readBody(req)) || {};
      try {
        const intakeQuestion = await generateIntakeQuestion(body);
        return json(res, 200, intakeQuestion);
      } catch {
        return json(res, 200, body.question || null);
      }
    }

    if (req.method === "POST" && url.pathname === "/api/adaptive-question") {
      const body = (await readBody(req)) || {};
      try {
        const question = await generateAdaptiveQuestion(body);
        return json(res, 200, question);
      } catch {
        return json(res, 200, { done: true });
      }
    }

    if (req.method === "POST" && url.pathname === "/api/report") {
      const body = (await readBody(req)) || {};
      try {
        const report = await generateDetailedReport(body);
        return json(res, 200, report);
      } catch {
        return json(res, 200, buildFallbackDetailedReport(body.language, body.result, body.form));
      }
    }

    if (req.method === "POST" && url.pathname === "/api/assistant") {
      const body = (await readBody(req)) || {};
      try {
        const reply = await generateAssistantReply(body);
        return json(res, 200, reply);
      } catch {
        return json(res, 200, { reply: fallbackAssistant(body.language, body.result, body.messages) });
      }
    }

    // ── NEW: Fitness Plan (LLM-powered) ──
    if (req.method === "POST" && url.pathname === "/api/fitness-plan") {
      const body = (await readBody(req)) || {};
      try {
        const plan = await generateFitnessPlan(body);
        return json(res, 200, plan);
      } catch {
        return json(res, 200, buildFallbackFitnessPlan(body.result, body.form, body.language));
      }
    }

    // ── NEW: Nutrition Plan (LLM-powered) ──
    if (req.method === "POST" && url.pathname === "/api/nutrition-plan") {
      const body = (await readBody(req)) || {};
      try {
        const plan = await generateNutritionPlan(body);
        return json(res, 200, plan);
      } catch {
        return json(res, 200, buildFallbackNutritionPlan(body.result, body.form, body.language));
      }
    }

    // ── NEW: Habit Coach (LLM-powered) ──
    if (req.method === "POST" && url.pathname === "/api/habit-coach") {
      const body = (await readBody(req)) || {};
      try {
        const coaching = await generateHabitCoaching(body);
        return json(res, 200, coaching);
      } catch {
        return json(res, 200, { tips: ["Track one small habit daily — consistency beats intensity.", "Start with the easiest change first.", "Log your progress to stay motivated."], streak_message: "Keep going!" });
      }
    }

    // ── NEW: Doctor Prep (LLM-powered) ──
    if (req.method === "POST" && url.pathname === "/api/doctor-prep") {
      const body = (await readBody(req)) || {};
      try {
        const prep = await generateDoctorPrep(body);
        return json(res, 200, prep);
      } catch {
        return json(res, 200, { script: ["Share your PulseX risk report with your doctor."], questions: ["What is my 10-year cardiovascular risk?"], tests: ["Lipid panel", "ECG"] });
      }
    }

    // ── NEW: What-If Simulator (LLM-powered) ──
    if (req.method === "POST" && url.pathname === "/api/what-if") {
      const body = (await readBody(req)) || {};
      try {
        const sim = await generateWhatIf(body);
        return json(res, 200, sim);
      } catch {
        return json(res, 200, { scenarios: [], summary: "Unable to simulate right now." });
      }
    }

    // ── NEW: Micro-Insight after each question answer (fast LLM) ──
    if (req.method === "POST" && url.pathname === "/api/micro-insight") {
      const body = (await readBody(req)) || {};
      try {
        const insight = await generateMicroInsight(body);
        return json(res, 200, insight);
      } catch {
        return json(res, 200, { insight: null });
      }
    }

    // ── NEW: Hero Narrative for result page (LLM) ──
    if (req.method === "POST" && url.pathname === "/api/hero-narrative") {
      const body = (await readBody(req)) || {};
      try {
        const narrative = await generateHeroNarrative(body);
        return json(res, 200, narrative);
      } catch {
        return json(res, 200, { narrative: null, heart_age_insight: null });
      }
    }

    // ── NEW: Clinical Value Explanation (fast LLM) ──
    if (req.method === "POST" && url.pathname === "/api/explain-value") {
      const body = (await readBody(req)) || {};
      try {
        const explanation = await generateValueExplanation(body);
        return json(res, 200, explanation);
      } catch {
        return json(res, 200, { explanation: null });
      }
    }

    if (req.method === "GET" && url.pathname === "/") {
      return json(res, 200, {
        service: "HeartRisk+ server",
        routes: [
          "/api/health",
          "/api/predict",
          "/api/refine",
          "/api/simulate",
          "/api/history",
          "/api/insights",
          "/api/intake-question",
          "/api/adaptive-question",
          "/api/report",
          "/api/assistant",
          "/api/fitness-plan",
          "/api/nutrition-plan",
          "/api/habit-coach",
          "/api/doctor-prep",
          "/api/what-if",
        ],
      });
    }

    return json(res, 404, { error: "Route not found" });
  } catch (error) {
    return json(res, error.statusCode || 500, {
      error: "Server request failed",
      detail:
        error.name === "AbortError"
          ? "The service took too long to answer."
          : error.payload?.detail || error.message,
    });
  }
});

// ── LLM-Powered Fitness Plan Generator ──
async function generateFitnessPlan({ result, form, language, habitLog }) {
  const ctx = buildClinicalContext(result, form);
  const lang = toLanguageLabel(language);
  const age = ctx.age || 40;
  const maxHR = 220 - age;
  const habitContext = habitLog?.length ? `\nRecent habit log (last 7 days): ${JSON.stringify(habitLog.slice(-7))}` : "";

  const content = await callGroq([
    {
      role: "system",
      content: `You are an elite exercise physiologist and cardiac rehabilitation specialist. You create personalized exercise plans GROUNDED ONLY in the patient's actual clinical data. You MUST NOT invent data. Use WHO, AHA, and ACSM guidelines. Respond in ${lang}. Return ONLY valid JSON.`
    },
    {
      role: "user",
      content: `Create a personalized 7-day exercise plan for this patient.

CLINICAL CONTEXT:
${JSON.stringify(ctx, null, 2)}
${habitContext}

Max heart rate: ${maxHR} bpm

RULES:
- If risk is High/Very High: LOW IMPACT ONLY. Walking, yoga, breathing. No vigorous exercise.
- If exertion_response is "strained": Start with 10-min sessions only. Include safety warnings.
- If BP >= 180: NO exercise until BP controlled. Say this clearly.
- If diabetes: Include post-meal walking advice.
- Ground every recommendation in their actual data.

Return JSON:
{
  "headline": "one-line personalized headline",
  "intensity_limit": "low|moderate|vigorous",
  "weekly_target_minutes": number,
  "target_hr": { "lower": number, "upper": number },
  "warnings": ["string array of safety warnings based on their data"],
  "exercises": [
    {
      "name": "exercise name",
      "icon": "emoji",
      "type": "cardio|strength|flexibility|balance",
      "frequency": "how often",
      "duration": "how long",
      "benefit": "why this exercise for THIS patient specifically",
      "safety_note": "any cautions for this patient"
    }
  ],
  "weekly_schedule": [
    { "day": "Monday", "activities": ["exercise 1", "exercise 2"], "rest": false }
  ],
  "progression": {
    "week_1_2": "what to do",
    "week_3_4": "how to progress",
    "week_5_8": "target state",
    "milestone": "expected improvement"
  },
  "motivation": "personalized motivational message grounded in their data"
}`
    }
  ], 0.38, 2800);

  return extractJson(content);
}

function buildFallbackFitnessPlan(result, form, language) {
  const risk = result?.risk_level || "Moderate";
  const isHigh = ["High", "Very High"].includes(risk);
  const age = Number(form?.age || 40);
  return {
    headline: isHigh ? "Gentle movement plan — safety first" : "Your personalized movement plan",
    intensity_limit: isHigh ? "low" : "moderate",
    weekly_target_minutes: isHigh ? 90 : 150,
    target_hr: { lower: Math.round((220 - age) * 0.5), upper: Math.round((220 - age) * (isHigh ? 0.6 : 0.7)) },
    warnings: isHigh ? ["Stop immediately if you feel chest pain, severe breathlessness, or dizziness."] : [],
    exercises: [
      { name: "Brisk Walking", icon: "🚶", type: "cardio", frequency: "Daily", duration: isHigh ? "15 min" : "30 min", benefit: "Safest cardiovascular exercise", safety_note: "" },
      { name: "Yoga / Breathing", icon: "🧘", type: "flexibility", frequency: "3-4x/week", duration: "20 min", benefit: "Reduces cortisol, improves HRV", safety_note: "" },
      { name: "Stretching", icon: "🤸", type: "flexibility", frequency: "Daily", duration: "10 min", benefit: "Improves circulation and flexibility", safety_note: "" },
    ],
    weekly_schedule: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day, i) => ({
      day, activities: i === 6 ? ["Rest / light walk"] : ["Walking", i % 2 === 0 ? "Yoga" : "Stretching"], rest: i === 6
    })),
    progression: { week_1_2: "Start gently, build consistency", week_3_4: "Extend duration by 5 min", week_5_8: "Add variety", milestone: "Reassess with PulseX after 8 weeks" },
    motivation: "Every step counts. Start where you are, not where you think you should be."
  };
}

// ── LLM-Powered Nutrition Plan Generator ──
async function generateNutritionPlan({ result, form, language, preferences }) {
  const ctx = buildClinicalContext(result, form);
  const lang = toLanguageLabel(language);
  const dietPref = preferences?.dietType || "mixed";

  const content = await callGroq([
    {
      role: "system",
      content: `You are an elite clinical nutritionist specializing in cardiovascular disease prevention and metabolic health. Create meal plans GROUNDED ONLY in the patient's actual clinical data. Use AHA dietary guidelines, DASH diet protocol, and ADA nutrition therapy standards. Respond in ${lang}. Return ONLY valid JSON.`
    },
    {
      role: "user",
      content: `Create a personalized nutrition plan for this patient.

CLINICAL CONTEXT:
${JSON.stringify(ctx, null, 2)}

Diet preference: ${dietPref}

RULES:
- If BP >= 130: Emphasize DASH diet, limit sodium to <1500mg
- If cholesterol >= 200: Reduce saturated fat, increase omega-3, soluble fiber
- If fasting glucose >= 100: Low glycemic foods, consistent meal timing, no sugary drinks
- If diabetes: Carb counting guidance, post-meal walking
- Include Indian/South Asian food options (dal, roti, sabzi, etc.)
- Ground every recommendation in their actual clinical values
- Include specific portion sizes

Return JSON:
{
  "headline": "personalized headline",
  "conditions_detected": ["list of dietary-relevant conditions"],
  "daily_targets": {
    "calories": "range",
    "sodium": "limit with reason",
    "fiber": "target",
    "water": "liters",
    "sugar_limit": "grams"
  },
  "meal_timing": [
    { "time": "7:00 AM", "meal": "Breakfast", "guidance": "specific advice for this patient" }
  ],
  "today_plan": {
    "breakfast": { "name": "meal name", "icon": "emoji", "description": "what to eat", "benefit": "why for THIS patient" },
    "lunch": { "name": "", "icon": "", "description": "", "benefit": "" },
    "snack": { "name": "", "icon": "", "description": "", "benefit": "" },
    "dinner": { "name": "", "icon": "", "description": "", "benefit": "" }
  },
  "weekly_themes": [
    { "day": "Monday", "theme": "e.g. Mediterranean", "highlight_meal": "description" }
  ],
  "grocery_essentials": ["list of 10-12 must-have items for this patient"],
  "foods_to_increase": [{ "food": "name", "reason": "grounded reason for THIS patient" }],
  "foods_to_reduce": [{ "food": "name", "reason": "grounded reason for THIS patient" }],
  "hydration_tips": ["personalized hydration advice"],
  "motivation": "personalized nutrition motivation"
}`
    }
  ], 0.35, 3000);

  return extractJson(content);
}

function buildFallbackNutritionPlan(result, form, language) {
  const hasBP = (form?.systolic_bp || 0) >= 130;
  const hasChol = (form?.cholesterol || 0) >= 200;
  const hasGlucose = (form?.fasting_glucose || 0) >= 100;
  return {
    headline: "Your heart-healthy nutrition guide",
    conditions_detected: [hasBP && "hypertension", hasChol && "high cholesterol", hasGlucose && "elevated glucose"].filter(Boolean),
    daily_targets: { calories: "1600-2000", sodium: hasBP ? "<1500 mg" : "<2300 mg", fiber: "25-35g", water: "2-2.5 liters", sugar_limit: "<25g" },
    meal_timing: [
      { time: "7:00-8:00 AM", meal: "Breakfast", guidance: "Eat within 1 hour of waking" },
      { time: "12:30-1:30 PM", meal: "Lunch", guidance: "Largest meal of the day" },
      { time: "4:00 PM", meal: "Snack", guidance: "Nuts or fruit" },
      { time: "7:00-7:30 PM", meal: "Dinner", guidance: "Light dinner, 3 hours before bed" },
    ],
    today_plan: {
      breakfast: { name: "Oats with berries", icon: "🥣", description: "Steel-cut oats, mixed berries, walnuts", benefit: "Soluble fiber lowers LDL" },
      lunch: { name: "Dal, brown rice, sabzi", icon: "🍛", description: "Moong dal, brown rice, seasonal vegetables", benefit: "Complete protein, high fiber" },
      snack: { name: "Mixed nuts", icon: "🥜", description: "Almonds, walnuts, pistachios (30g)", benefit: "Heart-healthy fats" },
      dinner: { name: "Khichdi with vegetables", icon: "🍲", description: "Moong dal khichdi, steamed veggies", benefit: "Easy to digest, light" },
    },
    weekly_themes: [{ day: "Monday", theme: "Mediterranean", highlight_meal: "Grilled fish with salad" }],
    grocery_essentials: ["Oats", "Brown rice", "Moong dal", "Seasonal vegetables", "Mixed nuts", "Olive/mustard oil", "Berries", "Fish", "Spinach", "Turmeric"],
    foods_to_increase: [{ food: "Leafy greens", reason: "Rich in potassium and nitrates for BP" }],
    foods_to_reduce: [{ food: "Processed foods", reason: "High sodium drives hypertension" }],
    hydration_tips: ["Start morning with warm water + lemon"],
    motivation: "Small dietary changes compound faster than you expect."
  };
}

// ── LLM-Powered Habit Coach ──
async function generateHabitCoaching({ result, form, language, habitLog, weekSummary }) {
  const ctx = buildClinicalContext(result, form);
  const lang = toLanguageLabel(language);

  const content = await callGroq([
    {
      role: "system",
      content: `You are a warm, evidence-based behavioral health coach. You help patients build sustainable cardiovascular health habits. You celebrate progress, don't shame. Ground advice in their actual clinical data. Use behavioral science: tiny habits, implementation intentions, streak psychology. Respond in ${lang}. Return ONLY valid JSON.`
    },
    {
      role: "user",
      content: `Provide personalized habit coaching for this patient.

CLINICAL CONTEXT:
${JSON.stringify(ctx, null, 2)}

HABIT LOG (recent entries): ${JSON.stringify(habitLog?.slice(-14) || [])}
WEEK SUMMARY: ${JSON.stringify(weekSummary || {})}

Analyze their habit patterns and provide coaching. If they have no habits logged yet, suggest starter habits based on their risk profile.

Return JSON:
{
  "greeting": "warm personalized greeting",
  "streak_message": "message about their current streaks or encouragement to start",
  "progress_analysis": "analysis of their recent habit patterns (or starter guidance)",
  "top_habits": [
    {
      "id": "habit_id",
      "name": "habit name",
      "icon": "emoji",
      "why": "why THIS habit matters for THIS patient specifically",
      "micro_version": "the tiny/easy version to start with",
      "trigger": "when/where to do it (implementation intention)",
      "target": "daily/weekly target"
    }
  ],
  "weekly_focus": "one specific focus area for this week",
  "nudge": "a gentle, specific nudge based on their weakest area",
  "celebration": "something to celebrate from their data (even small wins)"
}`
    }
  ], 0.45, 1800);

  return extractJson(content);
}

// ── LLM-Powered Doctor Visit Preparation ──
async function generateDoctorPrep({ result, form, language }) {
  const ctx = buildClinicalContext(result, form);
  const lang = toLanguageLabel(language);

  const content = await callGroq([
    {
      role: "system",
      content: `You are a clinical advisor helping a patient prepare for a cardiology appointment. Generate a personalized doctor visit preparation guide GROUNDED ONLY in the patient's actual clinical data. Be specific — reference their actual numbers, patterns, and risk factors. Respond in ${lang}. Return ONLY valid JSON.`
    },
    {
      role: "user",
      content: `Prepare a personalized doctor visit guide for this patient.

CLINICAL CONTEXT:
${JSON.stringify(ctx, null, 2)}

Return JSON:
{
  "urgency_reasoning": "why they should see a doctor at this urgency level — reference specific data points",
  "opening_script": "exact words to say when they walk in — personalized to their situation",
  "talking_points": [
    {
      "topic": "topic name",
      "what_to_say": "exact phrasing grounded in their data",
      "why_it_matters": "clinical reasoning"
    }
  ],
  "questions_to_ask": [
    {
      "question": "specific question for the doctor",
      "context": "why this question matters for THIS patient"
    }
  ],
  "tests_to_request": [
    {
      "test": "test name",
      "reason": "why this test is relevant for their specific profile",
      "priority": "essential|recommended|optional"
    }
  ],
  "what_to_bring": ["list of things to bring to the appointment"],
  "red_flags": ["symptoms that should trigger immediate ER visit — personalized"],
  "follow_up_plan": "suggested follow-up schedule based on risk level"
}`
    }
  ], 0.35, 2400);

  return extractJson(content);
}

// ── LLM-Powered What-If Lifestyle Simulator ──
async function generateWhatIf({ result, form, language }) {
  const ctx = buildClinicalContext(result, form);
  const lang = toLanguageLabel(language);
  const currentScore = result?.risk_score ?? 50;

  const content = await callGroq([
    {
      role: "system",
      content: `You are a cardiovascular risk modeling specialist. Simulate how specific lifestyle changes would affect this patient's risk score. Use established medical evidence (Framingham, ASCVD, WHO data) to estimate realistic score changes. Be conservative and honest — don't promise miracles. Ground every projection in their actual clinical data. Respond in ${lang}. Return ONLY valid JSON.`
    },
    {
      role: "user",
      content: `Simulate lifestyle change scenarios for this patient.

CLINICAL CONTEXT:
${JSON.stringify(ctx, null, 2)}

CURRENT RISK SCORE: ${currentScore}/100

Based on their ACTUAL data, simulate these scenarios (skip any that don't apply):
1. If they quit smoking (only if they smoke)
2. If they exercise 150 min/week (only if currently sedentary)
3. If they improve diet to DASH pattern
4. If they reduce stress (only if stress is high)
5. If they improve sleep to 7-8 hours (only if sleep is poor)
6. If they lose 5-10% body weight (if applicable)
7. If they take prescribed medication (if BP/cholesterol/glucose elevated)
8. Combined: ALL changes together

For each applicable scenario, estimate the new score and explain the medical reasoning.

Return JSON:
{
  "current_score": ${currentScore},
  "current_level": "${result?.risk_level || 'Unknown'}",
  "scenarios": [
    {
      "id": "scenario_id",
      "change": "what changes",
      "icon": "emoji",
      "new_score": number,
      "reduction": number,
      "timeline": "how long to see this change",
      "evidence": "medical evidence supporting this projection",
      "difficulty": "easy|moderate|hard",
      "impact": "low|moderate|high|transformative"
    }
  ],
  "best_single_change": "which ONE change would have the biggest impact for THIS patient and why",
  "combined_projection": {
    "new_score": number,
    "new_level": "risk level",
    "message": "what this means for their future health"
  },
  "heart_age_note": "current biological heart age vs chronological, and how changes affect it"
}`
    }
  ], 0.35, 2800);

  return extractJson(content);
}

// ── LLM-Powered Micro-Insight (fast, ~200 tokens) ──
async function generateMicroInsight({ form, questionId, answer, language }) {
  const lang = toLanguageLabel(language);
  const formSnapshot = {};
  for (const [k, v] of Object.entries(form || {})) {
    if (v !== "" && v !== null && v !== undefined) formSnapshot[k] = v;
  }

  const content = await callGroq([
    {
      role: "system",
      content: `You are a cardiovascular health advisor giving a brief, caring insight after a patient answers a health question. Be specific, warm, and medically grounded. One sentence only. Respond in ${lang}. Return ONLY valid JSON: { "insight": "your one sentence", "tone": "reassuring|cautionary|neutral" }`
    },
    {
      role: "user",
      content: `Patient just answered: "${questionId}" = "${answer}"\n\nTheir profile so far:\n${JSON.stringify(formSnapshot, null, 2)}\n\nGive a brief, specific reaction to this answer in context of their overall profile. If the answer is concerning in combination with other factors, say so gently. If positive, acknowledge it.`
    }
  ], 0.3, 200);

  return extractJson(content);
}

// ── LLM-Powered Hero Narrative (personalized result summary) ──
async function generateHeroNarrative({ result, form, language }) {
  const ctx = buildClinicalContext(result, form);
  const lang = toLanguageLabel(language);

  const content = await callGroq([
    {
      role: "system",
      content: `You are a compassionate cardiologist summarizing a patient's heart health assessment. Write exactly 3 sentences that are deeply personal, reference their actual data, and give them clear next direction. Never generic. Respond in ${lang}. Return ONLY valid JSON.`
    },
    {
      role: "user",
      content: `Generate a personalized hero narrative for this patient's result page.

CLINICAL DATA:
${JSON.stringify(ctx, null, 2)}

Return JSON:
{
  "narrative": "3-sentence personalized summary referencing their actual numbers, patterns, and what matters most",
  "heart_age_insight": "one sentence about their heart age vs chronological age — what it means and what drives it",
  "primary_action": "the single most important thing they should do RIGHT NOW",
  "emotional_tone": "encouraging|cautionary|urgent"
}`
    }
  ], 0.35, 500);

  return extractJson(content);
}

// ── LLM-Powered Clinical Value Explanation (fast) ──
async function generateValueExplanation({ field, value, form, language }) {
  const lang = toLanguageLabel(language);
  const formSnapshot = {};
  for (const [k, v] of Object.entries(form || {})) {
    if (v !== "" && v !== null && v !== undefined) formSnapshot[k] = v;
  }

  const content = await callGroq([
    {
      role: "system",
      content: `You are a clinical lab interpreter. Explain what a specific health measurement means for THIS patient. Be specific to their profile. 2 sentences max. Respond in ${lang}. Return ONLY valid JSON: { "explanation": "what this value means", "status": "normal|borderline|elevated|high|critical", "emoji": "relevant emoji" }`
    },
    {
      role: "user",
      content: `Patient entered: ${field} = ${value}\n\nTheir profile:\n${JSON.stringify(formSnapshot, null, 2)}\n\nExplain what this specific value means for their cardiovascular health, considering their age, gender, and other factors.`
    }
  ], 0.3, 250);

  return extractJson(content);
}

server.listen(PORT, () => {
  console.log(`HeartRisk+ server listening on http://localhost:${PORT}`);
  console.log(`Proxying ML requests to ${ML_ENGINE_URL}`);
});
