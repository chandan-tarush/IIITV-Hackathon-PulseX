import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import "./styles.css";
import AntigravityParticles from "./AntigravityParticles";
import {
  INITIAL_FORM,
  LANDING_PROMPTS,
  LOAD_MESSAGES,
  CLINICAL_FIELDS,
} from "./data";
import { getNextQuestion } from "./questionEngine";
import {
  BeatlyWordmark,
  TinyPulse,
  QuestionGlyph,
  StoryMeter,
  ECGBackground,
  ConfidenceIndicator,
  HeartVeinLanding,
} from "./illustrations";
import {
  predictOffline,
  refineOffline,
  normalizeResult,
  normalizeHistory,
} from "./fallbackEngine";
import { downloadPdfDocument } from "./pdf";
import {
  predictAssessment,
  refineAssessment,
  fetchHistory,
  fetchIntakeQuestion,
  fetchMicroInsight,
  fetchHeroNarrative,
} from "./lib.api";
import ChatBot from "./ChatBot";
import DoctorRecommendations from "./DoctorRecommendations";
import AdaptiveInterviewPanel from "./AdaptiveInterviewPanel";
import ReportNarratives from "./ReportNarratives";
import FitnessPanel from "./FitnessPanel";
import NutritionPanel from "./NutritionPanel";
import HabitTracker from "./HabitTracker";
import WhatIfSimulator from "./WhatIfSimulator";
import { updateProfile } from "./healthMemory";
import { localize, repairText, UI_TEXT, LANGUAGE_OPTIONS } from "./i18n";

const fade = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.35 },
};

const NUMERIC_FIELDS = new Set([
  "age",
  "sleep_hours",
  "systolic_bp",
  "diastolic_bp",
  "cholesterol",
  "hdl_cholesterol",
  "ldl_cholesterol",
  "fasting_glucose",
  "triglycerides",
]);

const RISK_LEVEL_LABELS = {
  en: { Low: "Low", Mild: "Mild", Moderate: "Moderate", High: "High", "Very High": "Very High" },
  hi: {
    Low: "\u0928\u093f\u092e\u094d\u0928",
    Mild: "\u0939\u0932\u094d\u0915\u093e",
    Moderate: "\u092e\u0927\u094d\u092f\u092e",
    High: "\u0909\u091a\u094d\u091a",
    "Very High": "\u0905\u0924\u094d\u092f\u0927\u093f\u0915 \u0909\u091a\u094d\u091a",
  },
  hinglish: { Low: "Low", Mild: "Mild", Moderate: "Moderate", High: "High", "Very High": "Very High" },
};

function localRisk(level, language) {
  return repairText(RISK_LEVEL_LABELS[language]?.[level] || level);
}

function resultTitle(name, language) {
  if (language === "hi") return name ? `${name} \u0915\u093e \u0939\u0943\u0926\u092f-\u091a\u093f\u0924\u094d\u0930` : "\u0906\u092a\u0915\u093e \u0939\u0943\u0926\u092f-\u091a\u093f\u0924\u094d\u0930";
  if (language === "hinglish") return name ? `${name} ka heart summary` : "Aapka heart summary";
  return name ? `${name}'s Heart` : "Your Heart";
}

function resultCopy(language) {
  if (language === "hi") {
    return {
      riskBadge: "\u091c\u094b\u0916\u093f\u092e",
      riskMeter: "\u091c\u094b\u0916\u093f\u092e",
      age: "\u0906\u092f\u0941",
      heartAge: "\u0939\u0943\u0926\u092f-\u0906\u092f\u0941",
      confirmedSignals: "\u092a\u0941\u0937\u094d\u091f \u0938\u0902\u0915\u0947\u0924",
      refinementResults: "\u0930\u093f\u092b\u093e\u0907\u0928\u092e\u0947\u0902\u091f \u092a\u0930\u093f\u0923\u093e\u092e",
      assessmentHistory: "\u092e\u0942\u0932\u094d\u092f\u093e\u0902\u0915\u0928 \u0907\u0924\u093f\u0939\u093e\u0938",
      previousAssessments: "\u092a\u093f\u091b\u0932\u0947 \u092e\u0942\u0932\u094d\u092f\u093e\u0902\u0915\u0928",
    };
  }

  if (language === "hinglish") {
    return {
      riskBadge: "Risk",
      riskMeter: "Risk",
      age: "Age",
      heartAge: "Heart Age",
      confirmedSignals: "Confirmed signals",
      refinementResults: "Refinement results",
      assessmentHistory: "Assessment history",
      previousAssessments: "Previous assessments",
    };
  }

  return {
    riskBadge: "Risk",
    riskMeter: "Risk",
    age: "Age",
    heartAge: "Heart Age",
    confirmedSignals: "Confirmed Signals",
    refinementResults: "Refinement results",
    assessmentHistory: "Assessment History",
    previousAssessments: "Previous assessments",
  };
}

function heroSummary(result, form, language) {
  const risk = result?.risk_level || "Unknown";
  const score = result?.risk_score ?? 0;
  const heartAge = result?.heart_age ?? null;
  const age = Number(form?.age || 0);
  const heartAgeGap = heartAge ? heartAge - age : 0;
  const primary = result?.primary_issue?.label || result?.primary_issue?.cause || null;
  const patterns = result?.detected_patterns?.length || 0;
  const name = result?.name || form?.name || null;

  // Build a dynamic, data-grounded summary
  const parts = [];
  if (name) parts.push(`${name}, your`);
  else parts.push("Your");

  if (score <= 25) parts.push(`cardiovascular profile looks strong (${score}/100).`);
  else if (score <= 45) parts.push(`heart shows mild signals worth monitoring (${score}/100).`);
  else if (score <= 65) parts.push(`assessment reveals moderate cardiovascular risk (${score}/100).`);
  else parts.push(`heart profile indicates elevated risk that needs attention (${score}/100).`);

  if (heartAge && heartAgeGap > 2) {
    parts.push(`Your heart is functioning like a ${heartAge}-year-old — ${heartAgeGap} years older than your actual age of ${age}.`);
  } else if (heartAge && heartAgeGap <= 0) {
    parts.push(`Your heart age of ${heartAge} is ${Math.abs(heartAgeGap)} years younger than your age — a positive sign.`);
  }

  if (primary) parts.push(`Primary concern: ${primary}.`);
  if (patterns > 0) parts.push(`${patterns} clinical pattern${patterns > 1 ? "s" : ""} detected.`);

  if (language === "hi") {
    return `\u0935\u0930\u094d\u0924\u092e\u093e\u0928 \u0906\u0915\u0932\u0928: \u091c\u094b\u0916\u093f\u092e-\u0938\u094d\u0924\u0930 ${localRisk(risk, language)}, \u0938\u094d\u0915\u094b\u0930 ${score}/100${heartAge ? `, \u0939\u0943\u0926\u092f-\u0906\u092f\u0941 ${heartAge}` : ""}\u0964 ${primary ? `\u092a\u094d\u0930\u092e\u0941\u0916 \u091a\u093f\u0902\u0924\u093e: ${primary}` : ""}${patterns > 0 ? ` ${patterns} \u092a\u0948\u091f\u0930\u094d\u0928 \u092a\u0939\u091a\u093e\u0928\u0947 \u0917\u090f\u0964` : ""}`;
  }
  if (language === "hinglish") {
    return `Risk level ${localRisk(risk, language)} hai, score ${score}/100${heartAge ? `, heart age ${heartAge}` : ""}. ${primary ? `Primary issue: ${primary}.` : ""} ${patterns > 0 ? `${patterns} pattern detected.` : ""}`;
  }
  return parts.join(" ");
}
function localizedDisclaimer(result, language) {
  if (language === "hi") {
    return "\u092f\u0939 \u0915\u0947\u0935\u0932 \u091c\u093e\u0917\u0930\u0942\u0915\u0924\u093e \u0914\u0930 \u0930\u094b\u0915\u0925\u093e\u092e \u0915\u0947 \u092e\u093e\u0930\u094d\u0917\u0926\u0930\u094d\u0936\u0928 \u0915\u0947 \u0932\u093f\u090f \u0939\u0948\u0964 \u092f\u0939 \u091a\u093f\u0915\u093f\u0924\u094d\u0938\u0940\u092f \u0928\u093f\u0926\u093e\u0928 \u0928\u0939\u0940\u0902 \u0939\u0948\u0964";
  }
  if (language === "hinglish") {
    return "Yeh sirf awareness aur prevention guidance ke liye hai. Yeh medical diagnosis nahin hai.";
  }
  return result?.disclaimer || "For awareness and prevention guidance only. This is not a medical diagnosis.";
}

export default function App() {
  const [screen, setScreen] = useState("splash");
  const [language, setLanguage] = useState("en");
  const [form, setForm] = useState({ ...INITIAL_FORM });
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadPct, setLoadPct] = useState(0);
  const [loadMsg, setLoadMsg] = useState(LOAD_MESSAGES[0]);
  const [followupAnswers, setFollowupAnswers] = useState({});
  const [resultTab, setResultTab] = useState("report");
  const [landingIdx, setLandingIdx] = useState(0);
  const sentRef = useRef(false);

  useEffect(() => {
    if (screen !== "splash") return undefined;
    const timer = setTimeout(() => setScreen("landing"), 3200);
    return () => clearTimeout(timer);
  }, [screen]);

  useEffect(() => {
    if (screen !== "landing") return undefined;
    const timer = setInterval(() => setLandingIdx((index) => (index + 1) % LANDING_PROMPTS.length), 4600);
    return () => clearInterval(timer);
  }, [screen]);

  const setField = useCallback((id, value) => {
    setForm((prev) => ({ ...prev, [id]: value }));
  }, []);

  const toPayload = useCallback(() => {
    const payload = {};

    Object.entries(form).forEach(([key, value]) => {
      if (value === "") {
        payload[key] = NUMERIC_FIELDS.has(key) ? null : "";
        return;
      }

      if (NUMERIC_FIELDS.has(key)) {
        payload[key] = value == null ? null : Number(value);
        return;
      }

      payload[key] = value;
    });

    payload.consent = Boolean(form.consent);
    if (!payload.name) delete payload.name;
    return payload;
  }, [form]);

  const runAssessment = useCallback(async () => {
    if (sentRef.current) return;
    sentRef.current = true;
    setScreen("loading");
    setLoadPct(0);
    setLoadMsg(LOAD_MESSAGES[0]);

    let step = 0;
    const ticker = setInterval(() => {
      step += 1;
      setLoadPct(Math.min(95, step * 6));
      setLoadMsg(LOAD_MESSAGES[Math.min(step, LOAD_MESSAGES.length - 1)]);
    }, 600);

    const payload = toPayload();
    let nextResult;

    try {
      const raw = await predictAssessment(payload);
      nextResult = normalizeResult(raw, payload);
    } catch {
      nextResult = predictOffline(payload);
    }

    clearInterval(ticker);
    setLoadPct(100);
    setLoadMsg(UI_TEXT.assessmentComplete);

    setTimeout(() => {
      setResult(nextResult);
      updateProfile(nextResult, payload);
      setScreen("result");
      fetchHistory(8)
        .then((response) => setHistory(normalizeHistory(response?.items)))
        .catch(() => {});
    }, 450);
  }, [toPayload]);

  const runRefinement = useCallback(async () => {
    if (!result) return;
    const payload = toPayload();
    try {
      const raw = await refineAssessment(payload, followupAnswers);
      setResult(normalizeResult(raw, payload));
    } catch {
      setResult(refineOffline(payload, result, followupAnswers));
    }
  }, [followupAnswers, result, toPayload]);

  const handlePdf = useCallback(() => {
    if (!result) return;

    const sections = result.report_sections || [];
    const body = sections
      .map((section) => `\n${section.title}\n${"-".repeat(section.title.length)}\n${(section.items || []).join("\n")}`)
      .join("\n");

    downloadPdfDocument({
      title: `HeartRisk+ Assessment - ${result.name || "Anonymous"}`,
      body: `Risk Score: ${result.risk_score} (${result.risk_level})\nHeart Age: ${result.heart_age}\nConfidence: ${result.confidence}%\n${body}\n\nDisclaimer: ${result.disclaimer}`,
      filename: "heartrisk-assessment.pdf",
    });
  }, [result]);

  const restart = useCallback(() => {
    sentRef.current = false;
    setForm({ ...INITIAL_FORM });
    setResult(null);
    setFollowupAnswers({});
    setResultTab("report");
    setScreen("landing");
  }, []);

  return (
    <div className="beatly-app">
      <AntigravityParticles />
      <ECGBackground />

      <div className="page-shell">
        <AnimatePresence mode="wait">
          {screen === "splash" && (
            <motion.div key="splash" className="splash-screen" {...fade}>
              <div className="splash-stage splash-animated">
                {/* Ambient glow orbs */}
                <div className="splash-ambient-orb splash-orb-1" aria-hidden="true" />
                <div className="splash-ambient-orb splash-orb-2" aria-hidden="true" />

                {/* Heart flies in from top */}
                <motion.div
                  className="beatly-wordmark"
                  initial={{ y: -120, opacity: 0, scale: 0.6 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  transition={{ duration: 0.9, ease: [0.34, 1.56, 0.64, 1] }}
                >
                  <motion.div
                    className="splash-heart-wrap"
                    animate={{ scale: [1, 1.08, 0.96, 1.04, 1] }}
                    transition={{ duration: 1.1, delay: 0.9, repeat: Infinity, repeatDelay: 0.2 }}
                  >
                    <BeatlyWordmark />
                  </motion.div>
                </motion.div>

                {/* Tagline reveal */}
                <motion.p
                  className="splash-tagline"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7, duration: 0.6, ease: "easeOut" }}
                >
                  {language === "hi" ? "जानना चाहते हैं आपका दिल क्या कहता है?" : language === "hinglish" ? "Jaanna chahte ho tumhara dil kya kehta hai?" : "Want to know what your heart has to say?"}
                </motion.p>

                {/* ECG trace */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.0, duration: 0.4 }}
                >
                  <TinyPulse />
                </motion.div>

                {/* Let's Beatly reveal */}
                <motion.h1
                  className="splash-cta-text"
                  initial={{ opacity: 0, y: 10, filter: "blur(8px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ delay: 1.3, duration: 0.7, ease: "easeOut" }}
                >
                  {language === "hi" ? "चलो... Beatly" : language === "hinglish" ? "Chalo... Beatly" : "Let's Beatly..."}
                </motion.h1>
              </div>
            </motion.div>
          )}

          {screen === "landing" && (
            <motion.div key="landing" className="landing-screen" {...fade}>
              <HeartVeinLanding />
              <div className="landing-brand">
                <BeatlyWordmark />
                <TinyPulse />
              </div>
              <div className="landing-card">
                <div className="language-row">
                  {LANGUAGE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      className={`language-pill${language === option.value ? " active" : ""}`}
                      onClick={() => setLanguage(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                <span className="landing-kicker">{localize(UI_TEXT.assessmentLabel, language)}</span>
                <h2>{localize(UI_TEXT.knowYourHeart, language)}</h2>
                <div className="landing-message">
                  <AnimatePresence mode="wait">
                    <motion.p key={landingIdx} {...fade}>
                      {localize(LANDING_PROMPTS[landingIdx], language)}
                    </motion.p>
                  </AnimatePresence>
                </div>

                <input
                  className="name-field"
                  placeholder={localize(UI_TEXT.yourNameOptional, language)}
                  value={form.name}
                  onChange={(event) => setField("name", event.target.value)}
                  maxLength={48}
                />

                <div className="consent-line" style={{ marginTop: "0.85rem" }}>
                  <input
                    type="checkbox"
                    checked={form.consent}
                    onChange={(event) => setField("consent", event.target.checked)}
                  />
                  <span>{localize(UI_TEXT.consentLabel, language)}</span>
                </div>

                <div className="landing-actions">
                  <button className="cta-primary" disabled={!form.consent} onClick={() => setScreen("questions")}>
                    {localize(UI_TEXT.beginAssessment, language)}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {screen === "questions" && (
            <motion.div key="questions" className="center-stage question-stage-ambient" {...fade}>
              <div className="ambient-orb ambient-orb-tl" aria-hidden="true" />
              <div className="ambient-orb ambient-orb-br" aria-hidden="true" />
              <div className="ambient-orb ambient-orb-ml" aria-hidden="true" />
              <QuestionScreen form={form} setField={setField} language={language} onComplete={() => setScreen("clinical")} />
            </motion.div>
          )}

          {screen === "clinical" && (
            <motion.div key="clinical" className="center-stage" {...fade}>
              <ClinicalScreen
                form={form}
                setField={setField}
                language={language}
                onSkip={runAssessment}
                onSubmit={runAssessment}
              />
            </motion.div>
          )}

          {screen === "loading" && (
            <motion.div key="loading" className="center-stage" {...fade}>
              <div className="loading-sheet">
                <div className="loading-heart" />
                <h2>{localize(UI_TEXT.analyzingData, language)}</h2>
                <div className="loading-progress">
                  <div className="loading-progress-bar">
                    <div style={{ width: `${loadPct}%` }} />
                  </div>
                  <span>{localize(loadMsg, language)}</span>
                </div>
              </div>
            </motion.div>
          )}

          {screen === "result" && result && (
            <motion.div key="result" {...fade}>
              <ResultPage
                result={result}
                form={form}
                history={history}
                followupAnswers={followupAnswers}
                setFollowupAnswers={setFollowupAnswers}
                runRefinement={runRefinement}
                resultTab={resultTab}
                setResultTab={setResultTab}
                language={language}
                handlePdf={handlePdf}
                restart={restart}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {screen === "result" && result && <ChatBot result={result} form={form} language={language} />}
    </div>
  );
}

function QuestionScreen({ form, setField, language, onComplete }) {
  const [pendingNumber, setPendingNumber] = useState("");
  const [promptQuestion, setPromptQuestion] = useState(null);
  const [promptStatus, setPromptStatus] = useState("loading");
  const [microInsight, setMicroInsight] = useState(null);
  const [lastAnsweredId, setLastAnsweredId] = useState(null);
  const next = getNextQuestion(form);
  const canonicalQuestion = next?.question || null;
  const nextQuestionId = canonicalQuestion?.id || null;

  useEffect(() => {
    if (!next) onComplete();
  }, [next, onComplete]);

  useEffect(() => {
    if (canonicalQuestion?.kind === "number") {
      setPendingNumber(form[canonicalQuestion.id] || "");
    }
  }, [canonicalQuestion, form]);

  useEffect(() => {
    let alive = true;

    if (!canonicalQuestion) {
      setPromptQuestion(null);
      setPromptStatus("ready");
      return () => {
        alive = false;
      };
    }

    setPromptQuestion(null);
    setPromptStatus("loading");

    fetchIntakeQuestion({ form, question: canonicalQuestion, language })
      .then((data) => {
        if (!alive) return;
        setPromptQuestion(data || canonicalQuestion);
        setPromptStatus("ready");
      })
      .catch(() => {
        if (!alive) return;
        setPromptQuestion(canonicalQuestion);
        setPromptStatus("ready");
      });

    return () => {
      alive = false;
    };
  }, [canonicalQuestion, form, language, nextQuestionId]);

  // Fire micro-insight when an answer changes
  const handleAnswer = (fieldId, value) => {
    setField(fieldId, value);
    setLastAnsweredId(fieldId);
    setMicroInsight(null);
    fetchMicroInsight({ form: { ...form, [fieldId]: value }, questionId: fieldId, answer: value, language })
      .then(data => { if (data?.insight) setMicroInsight(data); })
      .catch(() => {});
  };

  if (!next) return null;

  const { question, index, total, progress } = next;
  if (promptStatus !== "ready") {
    return <QuestionLoadingCard language={language} index={index} total={total} progress={progress} />;
  }

  const presentedQuestion = {
    ...question,
    ...(promptQuestion || {}),
    options: promptQuestion?.options?.length ? promptQuestion.options : question.options,
  };

  return (
    <div className="question-sheet">
      <div className="question-stage-content">
        <div className="question-topline">
          <span>{index + 1}</span>
          <div className="question-progress-bar">
            <div style={{ width: `${progress}%` }} />
          </div>
          <span>{total}</span>
        </div>

        <QuestionGlyph vibe={question.vibe || "vitals"} />
        <span className="landing-kicker">{localize(UI_TEXT.preAssessmentNote, language)}</span>
        <h2>{localize(presentedQuestion.title, language)}</h2>
        <p>{localize(presentedQuestion.body, language)}</p>

        {/* Micro-Insight from LLM */}
        {microInsight?.insight && (
          <div style={{
            padding: "0.55rem 0.85rem", borderRadius: "0.65rem", marginBottom: "0.65rem",
            background: microInsight.tone === "cautionary" ? "rgba(245,158,11,0.08)" : microInsight.tone === "reassuring" ? "rgba(34,197,94,0.07)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${microInsight.tone === "cautionary" ? "rgba(245,158,11,0.18)" : microInsight.tone === "reassuring" ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.08)"}`,
            fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.55,
            animation: "fadeIn 0.3s ease",
          }}>
            <span style={{ marginRight: "0.35rem" }}>{microInsight.tone === "cautionary" ? "⚡" : microInsight.tone === "reassuring" ? "✓" : "💡"}</span>
            {microInsight.insight}
          </div>
        )}

        {presentedQuestion.kind === "choice" && (
          <div className="tile-stack">
            {(presentedQuestion.options || []).map((option) => (
              <button
                key={option.value}
                className={`option-tile${form[question.id] === option.value ? " selected" : ""}`}
                onClick={() => handleAnswer(question.id, option.value)}
              >
                <strong>{localize(option.label, language)}</strong>
                {option.note && <span>{localize(option.note, language)}</span>}
              </button>
            ))}
          </div>
        )}

        {presentedQuestion.kind === "number" && (
          <div className="number-block">
            <input
              className="number-field"
              type="number"
              inputMode="numeric"
              min={presentedQuestion.min}
              max={presentedQuestion.max}
              placeholder={presentedQuestion.placeholder}
              value={pendingNumber}
              onChange={(event) => setPendingNumber(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                const value = Number(pendingNumber);
                if (pendingNumber !== "" && value >= question.min && value <= question.max) {
                  handleAnswer(question.id, pendingNumber);
                }
              }}
            />
            <div className="number-actions">
              <button
                className="cta-primary"
                disabled={
                  pendingNumber === "" ||
                  Number(pendingNumber) < question.min ||
                  Number(pendingNumber) > question.max
                }
                onClick={() => handleAnswer(question.id, pendingNumber)}
              >
                {localize(UI_TEXT.confirm, language)}
              </button>
            </div>
          </div>
        )}

        <div className="question-foot">
          <span className="micro-copy">{localize(presentedQuestion.micro, language)}</span>
        </div>
      </div>
    </div>
  );
}

function QuestionLoadingCard({ language, index, total, progress }) {
  return (
    <div className="question-sheet question-loading-card">
      <div className="question-stage-content">
        <div className="question-topline">
          <span>{index + 1}</span>
          <div className="question-progress-bar">
            <div style={{ width: `${progress}%` }} />
          </div>
          <span>{total}</span>
        </div>

        <div className="question-loader-orb" />
        <span className="landing-kicker">{localize(UI_TEXT.questionLoadingEyebrow, language)}</span>
        <h2>{localize(UI_TEXT.questionLoadingTitle, language)}</h2>
        <p>{localize(UI_TEXT.questionLoadingBody, language)}</p>

        <div className="question-loading-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>

        <div className="question-foot">
          <span className="micro-copy">{localize(UI_TEXT.questionLoadingHint, language)}</span>
        </div>
      </div>
    </div>
  );
}

function ClinicalScreen({ form, setField, language, onSkip, onSubmit }) {
  const hasAny = CLINICAL_FIELDS.some((field) => form[field.id] !== "" && form[field.id] !== null);

  return (
    <div className="clinical-section">
      <div className="question-sheet">
        <div className="question-stage-content">
          <QuestionGlyph vibe="clinical" />
          <h2>{localize(UI_TEXT.labValues, language)}</h2>
          <p>
            {localize(UI_TEXT.labIntro, language)}
            <br />
            <strong>{localize(UI_TEXT.allFieldsOptional, language)}</strong>
          </p>

          <div className="clinical-grid" style={{ textAlign: "left" }}>
            {CLINICAL_FIELDS.map((field) => (
              <div key={field.id} className="clinical-field">
                <label htmlFor={`clinical-${field.id}`}>{localize(field.label, language)}</label>
                <div className="clinical-field-row">
                  <input
                    id={`clinical-${field.id}`}
                    type="number"
                    inputMode="numeric"
                    placeholder={field.placeholder}
                    min={field.min}
                    max={field.max}
                    value={form[field.id]}
                    onChange={(event) => setField(field.id, event.target.value)}
                  />
                  <span className="unit-label">{field.unit}</span>
                </div>
                <div className="helper-text">{localize(field.helper, language)}</div>
                <div className="standard-text">{localize(field.standard, language)}</div>
              </div>
            ))}
          </div>

          <div className="clinical-actions">
            <button className="cta-primary" onClick={onSubmit}>
              {hasAny ? localize(UI_TEXT.submitWithLabs, language) : localize(UI_TEXT.generateAssessment, language)}
            </button>
            {!hasAny && (
              <button className="cta-secondary" onClick={onSkip}>
                {localize(UI_TEXT.skipLabs, language)}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultPage({
  result,
  form,
  history,
  followupAnswers,
  setFollowupAnswers,
  runRefinement,
  resultTab,
  setResultTab,
  language,
  handlePdf,
  restart,
}) {
  const copy = resultCopy(language);
  const [lifestyleSubTab, setLifestyleSubTab] = useState("fitness");
  const [heroNarr, setHeroNarr] = useState(null);
  const tabs = [
    { id: "report", label: "📋 Report" },
    { id: "lifestyle", label: "💪 Lifestyle" },
    { id: "simulate", label: "🔮 Simulate" },
    { id: "doctors", label: "🩺 Doctor" },
    { id: "explore", label: "🔬 Explore" },
  ];

  // Fetch LLM hero narrative on mount
  useEffect(() => {
    let alive = true;
    fetchHeroNarrative({ result, form, language })
      .then(data => { if (alive && data?.narrative) setHeroNarr(data); })
      .catch(() => {});
    return () => { alive = false; };
  }, [result, form, language]);

  return (
    <div className="result-page">
      <div className="hero-note">
        <div className="hero-note-copy">
          <span className="landing-kicker">
            {localRisk(result.risk_level, language)} {copy.riskBadge}
          </span>
          <h1>{resultTitle(result.name, language)}</h1>
          <p style={{ lineHeight: 1.65 }}>{heroNarr?.narrative || heroSummary(result, form, language)}</p>
          {heroNarr?.primary_action && (
            <div style={{
              marginTop: "0.5rem", padding: "0.5rem 0.75rem", borderRadius: "0.6rem",
              background: heroNarr.emotional_tone === "urgent" ? "rgba(239,68,68,0.1)" : "rgba(99,102,241,0.08)",
              border: `1px solid ${heroNarr.emotional_tone === "urgent" ? "rgba(239,68,68,0.2)" : "rgba(99,102,241,0.15)"}`,
              fontSize: "0.82rem", fontWeight: 600, color: "var(--text)",
            }}>
              🎯 {heroNarr.primary_action}
            </div>
          )}
          <ConfidenceIndicator value={result.confidence} />
        </div>

        <div className="hero-note-side">
          <StoryMeter score={result.risk_score} label={copy.riskMeter} color="#ef4444" />
          <div className="hero-meta">
            <span>{copy.age} {form.age}</span>
            <span style={{ color: result.heart_age > Number(form.age || 0) + 2 ? "var(--danger)" : "var(--success)" }}>
              {copy.heartAge} {result.heart_age || "—"}
              {result.heart_age && Number(form.age) ? ` (${result.heart_age - Number(form.age) > 0 ? "+" : ""}${result.heart_age - Number(form.age)}y)` : ""}
            </span>
          </div>
          {heroNarr?.heart_age_insight && (
            <p style={{ fontSize: "0.78rem", color: "var(--text-faint)", marginTop: "0.35rem", lineHeight: 1.5, fontStyle: "italic" }}>
              {heroNarr.heart_age_insight}
            </p>
          )}
        </div>
      </div>

      <div className="result-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`result-tab${resultTab === tab.id ? " active" : ""}`}
            onClick={() => setResultTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══ REPORT TAB ═══ */}
      {resultTab === "report" && (
        <>
          {["overview", "patterns", "clinical", "actions"].map(sub => (
            <ReportNarratives key={sub} result={result} form={form} language={language} tab={sub} />
          ))}
        </>
      )}

      {/* ═══ LIFESTYLE TAB ═══ */}
      {resultTab === "lifestyle" && (
        <>
          <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.85rem", overflowX: "auto", paddingBottom: "0.3rem" }}>
            {[
              { id: "fitness", label: "🏃 Fitness", },
              { id: "nutrition", label: "🥗 Nutrition" },
              { id: "habits", label: "📊 Habits" },
            ].map(sub => (
              <button key={sub.id} onClick={() => setLifestyleSubTab(sub.id)} style={{
                padding: "0.45rem 0.85rem", borderRadius: "999px", border: "1px solid",
                borderColor: lifestyleSubTab === sub.id ? "rgba(220,38,38,0.5)" : "rgba(255,255,255,0.08)",
                background: lifestyleSubTab === sub.id ? "rgba(220,38,38,0.15)" : "rgba(255,255,255,0.03)",
                color: lifestyleSubTab === sub.id ? "var(--accent-bright)" : "var(--text-secondary)",
                fontSize: "0.82rem", fontWeight: lifestyleSubTab === sub.id ? 700 : 400,
                cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.2s",
              }}>{sub.label}</button>
            ))}
          </div>
          {lifestyleSubTab === "fitness" && <FitnessPanel result={result} form={form} language={language} />}
          {lifestyleSubTab === "nutrition" && <NutritionPanel result={result} form={form} language={language} />}
          {lifestyleSubTab === "habits" && <HabitTracker result={result} form={form} language={language} />}
        </>
      )}

      {/* ═══ SIMULATE TAB ═══ */}
      {resultTab === "simulate" && (
        <WhatIfSimulator result={result} form={form} language={language} />
      )}

      {/* ═══ DOCTOR TAB ═══ */}
      {resultTab === "doctors" && (
        <>
          <ReportNarratives result={result} form={form} language={language} tab="doctors" />
          <DoctorRecommendations result={result} form={form} language={language} />
        </>
      )}

      {/* ═══ EXPLORE TAB ═══ */}
      {resultTab === "explore" && (
        <>
          <AdaptiveInterviewPanel
            result={result}
            form={form}
            answers={followupAnswers}
            setAnswers={setFollowupAnswers}
            runRefinement={runRefinement}
            language={language}
          />

          {result.confirmed_signals?.length > 0 && (
            <div className="story-card warm" style={{ marginTop: "0.85rem" }}>
              <span className="story-eyebrow">{copy.confirmedSignals}</span>
              <h3>{copy.refinementResults}</h3>
              <ul className="soft-list">
                {result.confirmed_signals.map((item, index) => <li key={index}>{item}</li>)}
              </ul>
              {result.refinement_summary && <p>{result.refinement_summary}</p>}
            </div>
          )}

          {history.length > 0 && (
            <div className="story-card dark" style={{ marginTop: "0.85rem" }}>
              <span className="story-eyebrow">{copy.assessmentHistory}</span>
              <h3>{copy.previousAssessments}</h3>
              <div className="history-strip">
                {history.map((item) => (
                  <div key={item.id} className="history-chip">
                    <strong>{item.risk_score}</strong>
                    <p>{localRisk(item.risk_level, language)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <div className="hero-actions" style={{ marginTop: "1.25rem" }}>
        <button className="cta-secondary" onClick={handlePdf}>{localize(UI_TEXT.downloadPdf, language)}</button>
        <button className="cta-secondary" onClick={restart}>{localize(UI_TEXT.newAssessment, language)}</button>
      </div>

      <p style={{ marginTop: "1rem", fontSize: "0.78rem", color: "var(--text-faint)", textAlign: "center" }}>
        {localizedDisclaimer(result, language)}
      </p>
    </div>
  );
}
