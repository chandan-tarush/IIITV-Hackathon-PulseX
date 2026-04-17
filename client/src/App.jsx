import { useState, useEffect, useCallback, useRef, Suspense, lazy } from "react";
import { AnimatePresence, motion } from "motion/react";
import "./styles.css";
import {
  INITIAL_FORM,
  SPLASH_LINES,
  LANDING_PROMPTS,
  LOAD_MESSAGES,
  CLINICAL_FIELDS,
} from "./data";
import {
  getNextQuestion,
  isQuestionnaireComplete,
} from "./questionEngine";
import {
  BeatlyWordmark,
  TinyPulse,
  QuestionGlyph,
  StoryMeter,
  ECGBackground,
  ConfidenceIndicator,
  StatusBadge,
  ECGLine,
} from "./illustrations";
import {
  predictOffline,
  refineOffline,
  normalizeResult,
  normalizeHistory,
  formatApiError,
} from "./fallbackEngine";
import { downloadPdfDocument } from "./pdf";
import { predictAssessment, refineAssessment, fetchHistory } from "./lib.api";

const Hero3DScene = lazy(() =>
  import("./scene3d").then((m) => ({ default: m.Hero3DScene }))
);

const fade = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -10 }, transition: { duration: 0.35 } };

/* ── Main App ── */
export default function App() {
  const [screen, setScreen] = useState("splash");
  const [form, setForm] = useState({ ...INITIAL_FORM });
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);
  const [loadPct, setLoadPct] = useState(0);
  const [loadMsg, setLoadMsg] = useState(LOAD_MESSAGES[0]);
  const [followupAnswers, setFollowupAnswers] = useState({});
  const [resultTab, setResultTab] = useState("overview");
  const [splashIdx, setSplashIdx] = useState(0);
  const [landingIdx, setLandingIdx] = useState(0);
  const sentRef = useRef(false);

  // Splash auto-advance
  useEffect(() => {
    if (screen !== "splash") return;
    const timer = setTimeout(() => setScreen("landing"), 3200);
    return () => clearTimeout(timer);
  }, [screen]);

  // Splash line rotation
  useEffect(() => {
    if (screen !== "splash") return;
    const timer = setInterval(() => setSplashIdx((i) => (i + 1) % SPLASH_LINES.length), 3600);
    return () => clearInterval(timer);
  }, [screen]);

  // Landing prompt rotation
  useEffect(() => {
    if (screen !== "landing") return;
    const timer = setInterval(() => setLandingIdx((i) => (i + 1) % LANDING_PROMPTS.length), 4800);
    return () => clearInterval(timer);
  }, [screen]);

  // Field updater
  const set = useCallback((id, value) => setForm((prev) => ({ ...prev, [id]: value })), []);

  // Build payload for API
  const toPayload = useCallback(() => {
    const p = { consent: form.consent };
    if (form.name?.trim()) p.name = form.name.trim();
    p.age = Number(form.age);
    p.gender = form.gender;
    p.smoking = form.smoking;
    p.diabetes = form.diabetes;
    p.family_history = form.family_history;
    p.activity_level = form.activity_level;
    p.sitting = form.sitting;
    p.stress = form.stress;
    p.sleep_quality = form.sleep_quality;
    p.diet = form.diet;
    p.exertion_response = form.exertion_response;

    // Clinical fields — only include if non-empty
    for (const f of CLINICAL_FIELDS) {
      const val = form[f.id];
      if (val !== "" && val !== null && val !== undefined) {
        p[f.id] = Number(val);
      } else {
        p[f.id] = null;
      }
    }
    return p;
  }, [form]);

  // Submit assessment
  const runAssessment = useCallback(async () => {
    if (sentRef.current) return;
    sentRef.current = true;
    setScreen("loading");
    setLoadPct(0);
    setError(null);

    let step = 0;
    const ticker = setInterval(() => {
      step += 1;
      setLoadPct(Math.min(95, step * 6));
      setLoadMsg(LOAD_MESSAGES[Math.min(step, LOAD_MESSAGES.length - 1)]);
    }, 600);

    const payload = toPayload();
    let data;
    try {
      const raw = await predictAssessment(payload);
      data = normalizeResult(raw, payload);
    } catch {
      data = predictOffline(payload);
    }

    clearInterval(ticker);
    setLoadPct(100);
    setLoadMsg("Assessment complete.");
    setTimeout(() => {
      setResult(data);
      setScreen("result");

      // Fetch history
      fetchHistory(8)
        .then((r) => setHistory(normalizeHistory(r?.items)))
        .catch(() => {});
    }, 600);
  }, [toPayload]);

  // Refine with followup answers
  const runRefinement = useCallback(async () => {
    if (!result) return;
    const payload = toPayload();
    try {
      const raw = await refineAssessment(payload, followupAnswers);
      setResult(normalizeResult(raw, payload));
    } catch {
      setResult(refineOffline(payload, result, followupAnswers));
    }
  }, [result, followupAnswers, toPayload]);

  // Download PDF
  const handlePdf = useCallback(() => {
    if (!result) return;
    const sections = result.report_sections || [];
    const body = sections.map((s) => `\n${s.title}\n${"—".repeat(s.title.length)}\n${(s.items || []).join("\n")}`).join("\n");
    downloadPdfDocument({
      title: `HeartRisk+ Assessment — ${result.name || "Anonymous"}`,
      body: `Risk Score: ${result.risk_score} (${result.risk_level})\nHeart Age: ${result.heart_age}\nConfidence: ${result.confidence}%\n${body}\n\nDisclaimer: ${result.disclaimer}`,
      filename: "heartrisk-assessment.pdf",
    });
  }, [result]);

  // Start over
  const restart = useCallback(() => {
    sentRef.current = false;
    setForm({ ...INITIAL_FORM });
    setResult(null);
    setFollowupAnswers({});
    setResultTab("overview");
    setScreen("landing");
  }, []);

  // Risk color helper
  const riskColor = (level) => {
    const map = { Low: "#10b981", Mild: "#22d3ee", Moderate: "#f59e0b", High: "#ef4444", "Very High": "#dc2626" };
    return map[level] || "#6366f1";
  };

  const severityClass = (s) => s >= 0.7 ? "severity-high" : s >= 0.4 ? "severity-moderate" : "severity-low";
  const severityLabel = (s) => s >= 0.7 ? "High" : s >= 0.4 ? "Moderate" : "Low";

  return (
    <div className="beatly-app">
      {/* 3D Background */}
      <div className="global-3d-layer">
        <Suspense fallback={<div className="scene3d-fallback" />}>
          <Hero3DScene />
        </Suspense>
      </div>

      {/* ECG Background */}
      <ECGBackground />

      {/* Main Content */}
      <div className="page-shell">
        <AnimatePresence mode="wait">
          {/* ══ SPLASH ══ */}
          {screen === "splash" && (
            <motion.div key="splash" className="splash-screen" {...fade}>
              <div className="splash-stage">
                <div className="beatly-wordmark">
                  <BeatlyWordmark />
                  <h1>Beatly</h1>
                </div>
                <TinyPulse />
                <div className="splash-lines">
                  <AnimatePresence mode="wait">
                    <motion.p key={splashIdx} {...fade}>{SPLASH_LINES[splashIdx]}</motion.p>
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}

          {/* ══ LANDING ══ */}
          {screen === "landing" && (
            <motion.div key="landing" className="landing-screen" {...fade}>
              <div className="landing-brand">
                <BeatlyWordmark />
                <TinyPulse />
              </div>
              <div className="landing-card">
                <span className="landing-kicker">Cardiovascular Assessment</span>
                <h2>Know your heart</h2>
                <div className="landing-message">
                  <AnimatePresence mode="wait">
                    <motion.p key={landingIdx} {...fade}>{LANDING_PROMPTS[landingIdx]}</motion.p>
                  </AnimatePresence>
                </div>

                <input
                  id="name-input"
                  className="name-field"
                  placeholder="Your name (optional)"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  maxLength={48}
                />

                <div className="consent-line" style={{ marginTop: "0.85rem" }}>
                  <input
                    id="consent-checkbox"
                    type="checkbox"
                    checked={form.consent}
                    onChange={(e) => set("consent", e.target.checked)}
                  />
                  <span>
                    I understand this is an awareness tool, not a diagnosis. I consent to generating a risk estimate.
                  </span>
                </div>

                <div className="landing-actions">
                  <button
                    id="start-assessment"
                    className="cta-primary"
                    disabled={!form.consent}
                    onClick={() => setScreen("questions")}
                  >
                    Begin Assessment
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ══ QUESTIONS ══ */}
          {screen === "questions" && (
            <motion.div key="questions" className="center-stage" {...fade}>
              <QuestionScreen
                form={form}
                set={set}
                onComplete={() => setScreen("clinical")}
              />
            </motion.div>
          )}

          {/* ══ CLINICAL DATA ══ */}
          {screen === "clinical" && (
            <motion.div key="clinical" className="center-stage" {...fade}>
              <ClinicalScreen
                form={form}
                set={set}
                onSkip={runAssessment}
                onSubmit={runAssessment}
              />
            </motion.div>
          )}

          {/* ══ LOADING ══ */}
          {screen === "loading" && (
            <motion.div key="loading" className="center-stage" {...fade}>
              <div className="loading-sheet">
                <div className="loading-heart" />
                <h2>Analyzing your data</h2>
                <div className="loading-progress">
                  <div className="loading-progress-bar">
                    <div style={{ width: `${loadPct}%` }} />
                  </div>
                  <span>{loadMsg}</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* ══ RESULTS ══ */}
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
                riskColor={riskColor}
                severityClass={severityClass}
                severityLabel={severityLabel}
                handlePdf={handlePdf}
                restart={restart}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   QUESTION SCREEN (Dynamic Questioning)
   ══════════════════════════════════════════ */
function QuestionScreen({ form, set, onComplete }) {
  const [pendingNumber, setPendingNumber] = useState("");
  const [numberCommitted, setNumberCommitted] = useState(false);
  const next = getNextQuestion(form);
  const prevQRef = useRef(null);

  // Reset pending state when question changes
  useEffect(() => {
    if (next && next.question.id !== prevQRef.current) {
      prevQRef.current = next.question.id;
      setPendingNumber(form[next.question.id] || "");
      setNumberCommitted(!!form[next.question.id]);
    }
  }, [next, form]);

  // If all answered, move on
  useEffect(() => {
    if (!next) onComplete();
  }, [next, onComplete]);

  if (!next) return null;

  const { question: q, index, total, progress } = next;

  const handleChoice = (value) => {
    set(q.id, value);
  };

  const handleNumberChange = (e) => {
    setPendingNumber(e.target.value);
    setNumberCommitted(false);
  };

  const confirmNumber = () => {
    set(q.id, pendingNumber);
    setNumberCommitted(true);
  };

  const handleNumberKeyDown = (e) => {
    if (e.key === "Enter") {
      const val = Number(pendingNumber);
      if (pendingNumber !== "" && val >= q.min && val <= q.max) {
        confirmNumber();
      }
    }
  };

  const numberValid = q.kind === "number"
    ? pendingNumber !== "" && Number(pendingNumber) >= q.min && Number(pendingNumber) <= q.max
    : true;

  const showMicro = q.kind === "number" ? numberCommitted : !!form[q.id];

  return (
    <div className="question-sheet">
      <div className="question-stage-content">
        {/* Progress */}
        <div className="question-topline">
          <span>{index + 1}</span>
          <div className="question-progress-bar">
            <div style={{ width: `${progress}%` }} />
          </div>
          <span>{total}</span>
        </div>

        {/* Glyph */}
        <QuestionGlyph vibe={q.vibe || "vitals"} />

        {/* Title */}
        <h2>{q.title}</h2>
        <p>{q.body}</p>

        {/* Choice tiles */}
        {q.kind === "choice" && (
          <div className="tile-stack">
            {q.options.map((opt) => (
              <button
                key={opt.value}
                className={`option-tile${form[q.id] === opt.value ? " selected" : ""}`}
                onClick={() => handleChoice(opt.value)}
              >
                <strong>{opt.label}</strong>
                {opt.note && <span>{opt.note}</span>}
              </button>
            ))}
          </div>
        )}

        {/* Number input */}
        {q.kind === "number" && (
          <div className="number-block">
            <input
              className="number-field"
              type="number"
              inputMode="numeric"
              placeholder={q.placeholder}
              min={q.min}
              max={q.max}
              value={pendingNumber}
              onChange={handleNumberChange}
              onKeyDown={handleNumberKeyDown}
              autoFocus
            />
            <div className="number-actions">
              <button
                className="cta-primary"
                disabled={!numberValid}
                onClick={confirmNumber}
              >
                Confirm
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="question-foot">
          <span className="micro-copy">{showMicro ? q.micro : ""}</span>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   CLINICAL DATA SCREEN
   ══════════════════════════════════════════ */
function ClinicalScreen({ form, set, onSkip, onSubmit }) {
  const hasAny = CLINICAL_FIELDS.some((f) => form[f.id] !== "" && form[f.id] !== null);

  return (
    <div className="clinical-section">
      <div className="question-sheet">
        <div className="question-stage-content">
          <QuestionGlyph vibe="clinical" />
          <h2>Lab Values</h2>
          <p>
            If you have a recent blood test report, enter what you can below. This significantly improves accuracy.
            <br /><strong>All fields are optional</strong> — skip entirely if you don't have lab results.
          </p>

          <div className="clinical-grid" style={{ textAlign: "left" }}>
            {CLINICAL_FIELDS.map((field) => (
              <div key={field.id} className="clinical-field">
                <label htmlFor={`clinical-${field.id}`}>{field.label}</label>
                <div className="clinical-field-row">
                  <input
                    id={`clinical-${field.id}`}
                    type="number"
                    inputMode="numeric"
                    placeholder={field.placeholder}
                    min={field.min}
                    max={field.max}
                    value={form[field.id]}
                    onChange={(e) => set(field.id, e.target.value)}
                  />
                  <span className="unit-label">{field.unit}</span>
                </div>
                <div className="helper-text">{field.helper}</div>
                <div className="standard-text">{field.standard}</div>
              </div>
            ))}
          </div>

          <div className="clinical-actions">
            <button className="cta-primary" onClick={onSubmit}>
              {hasAny ? "Submit with Lab Data" : "Generate Assessment"}
            </button>
            {!hasAny && (
              <button className="cta-secondary" onClick={onSkip}>
                Skip — I don't have lab reports
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   RESULTS PAGE
   ══════════════════════════════════════════ */
function ResultPage({
  result, form, history, followupAnswers, setFollowupAnswers, runRefinement,
  resultTab, setResultTab, riskColor, severityClass, severityLabel, handlePdf, restart,
}) {
  const r = result;
  const color = riskColor(r.risk_level);
  const narrative = r.narrative || {};
  const primaryIssue = r.primary_issue;
  const secondaryIssue = r.secondary_issue;
  const patterns = r.detected_patterns || [];
  const clinicalInterps = r.clinical_interpretations || {};
  const vm = r.visual_metrics || [];
  const sims = r.simulations || [];
  const followups = r.followup_questions || [];
  const confirmed = r.confirmed_signals || [];

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "patterns", label: "Patterns" },
    { id: "clinical", label: "Clinical" },
    { id: "actions", label: "Actions" },
    { id: "deeper", label: "Deeper Look" },
  ];

  return (
    <div className="result-page">
      {/* ── Hero Section ── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="hero-note">
          <div className="hero-note-copy">
            <span className="landing-kicker">{r.risk_level} Risk</span>
            <h1>{r.name ? `${r.name}'s` : "Your"} Heart</h1>
            <p>{r.message}</p>
            <p style={{ fontSize: "0.88rem", color: "var(--text-faint)" }}>{narrative.confidence_text}</p>

            <ConfidenceIndicator value={r.confidence} />

            {primaryIssue && (
              <div className="journey-note">
                <StatusBadge severity={primaryIssue.severity >= 0.7 ? "high" : primaryIssue.severity >= 0.4 ? "moderate" : "low"} />
                <span>Primary: {primaryIssue.label}</span>
              </div>
            )}
          </div>

          <div className="hero-note-side">
            <StoryMeter score={r.risk_score} label="Risk" color={color} />
            <div className="hero-meta">
              <span>Age {form.age}</span>
              <span>Heart Age {r.heart_age}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Emotional Message ── */}
      <motion.div className="result-rail" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
        <div className="result-rail-copy">
          <p style={{ fontSize: "0.95rem", lineHeight: 1.7 }}>{r.emotional_message}</p>
        </div>
      </motion.div>

      {/* ── Tab Navigation ── */}
      <div className="result-tabs">
        {tabs.map((t) => (
          <button key={t.id} className={`result-tab${resultTab === t.id ? " active" : ""}`} onClick={() => setResultTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ═══ OVERVIEW TAB ═══ */}
        {resultTab === "overview" && (
          <motion.div key="overview" {...fade}>
            {/* Visual Metrics */}
            <div className="result-panel-grid">
              {vm.map((m) => (
                <div key={m.id} className={`metric-bar metric-${m.tone}`}>
                  <div className="metric-bar-top">
                    <span>{m.label}</span>
                    <strong>{m.value}</strong>
                  </div>
                  <div className="metric-bar-track">
                    <div style={{ width: `${Math.min(100, m.value)}%` }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Primary + Secondary Issue */}
            {primaryIssue && (
              <div className="story-grid">
                <div className="story-card accent">
                  <span className="story-eyebrow">Primary Finding</span>
                  <h3>{primaryIssue.label}</h3>
                  <p>{primaryIssue.cause}</p>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-faint)", fontStyle: "italic", marginTop: "0.4rem" }}>
                    If unchanged: {primaryIssue.projection}
                  </p>
                </div>
                {secondaryIssue && (
                  <div className="story-card dark">
                    <span className="story-eyebrow">Secondary Finding</span>
                    <h3>{secondaryIssue.label}</h3>
                    <p>{secondaryIssue.cause}</p>
                  </div>
                )}
              </div>
            )}

            {/* Daily Story */}
            <div className="story-card dark" style={{ marginTop: "0.85rem" }}>
              <span className="story-eyebrow">Pattern Analysis</span>
              <h3>What's happening</h3>
              <ul className="soft-list">
                {(r.daily_story || []).map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>

            {/* Protective Factors */}
            {r.protective_factors?.length > 0 && (
              <div className="story-card green" style={{ marginTop: "0.85rem" }}>
                <span className="story-eyebrow">Protective Factors</span>
                <h3>Working in your favor</h3>
                <ul className="soft-list">
                  {r.protective_factors.map((f, i) => <li key={i}>{f}</li>)}
                </ul>
              </div>
            )}
          </motion.div>
        )}

        {/* ═══ PATTERNS TAB ═══ */}
        {resultTab === "patterns" && (
          <motion.div key="patterns" {...fade}>
            <div style={{ marginTop: "0.85rem" }}>
              {patterns.length > 0 ? (
                patterns.map((p) => (
                  <div key={p.id} className="pattern-card">
                    <div className="pattern-card-header">
                      <h4>{p.label}</h4>
                      <span className={`severity-tag ${severityClass(p.severity)}`}>
                        {severityLabel(p.severity)} ({Math.round(p.severity * 100)}%)
                      </span>
                    </div>
                    <p>{p.cause}</p>
                    <p className="projection">Trajectory: {p.projection}</p>
                  </div>
                ))
              ) : (
                <div className="pattern-card">
                  <h4>No compound patterns detected</h4>
                  <p>Your input signals don't form concerning cross-factor combinations — this is protective.</p>
                </div>
              )}
            </div>

            {/* Body Signals */}
            <div className="story-card dark" style={{ marginTop: "0.85rem" }}>
              <span className="story-eyebrow">Body Signals</span>
              <h3>Physical indicators</h3>
              <ul className="soft-list">
                {(r.possible_body_signals || []).map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>

            {/* Symptom Watch */}
            <div className="story-card warm" style={{ marginTop: "0.85rem" }}>
              <span className="story-eyebrow">Symptom Watch</span>
              <h3>Keep an eye on</h3>
              <ul className="soft-list">
                {(r.symptom_watch || []).map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          </motion.div>
        )}

        {/* ═══ CLINICAL TAB ═══ */}
        {resultTab === "clinical" && (
          <motion.div key="clinical" {...fade}>
            <div style={{ marginTop: "0.85rem" }}>
              {/* BP Interpretation */}
              {clinicalInterps.bp && (
                <div className="clinical-result-card">
                  <strong>🫀 Blood Pressure: {clinicalInterps.bp.label}</strong>
                  <p>{clinicalInterps.bp.text}</p>
                  <div className="standard-ref">Standard: {clinicalInterps.bp.standard}</div>
                </div>
              )}

              {/* Cholesterol */}
              {clinicalInterps.cholesterol && Object.values(clinicalInterps.cholesterol.components || {}).map((c, i) => (
                <div key={i} className="clinical-result-card">
                  <strong>🧪 {c.value} mg/dL — {c.label || c.category}</strong>
                  <p>{c.text}</p>
                </div>
              ))}

              {clinicalInterps.cholesterol?.tc_hdl_ratio && (
                <div className="clinical-result-card">
                  <strong>📊 TC/HDL Ratio: {clinicalInterps.cholesterol.tc_hdl_ratio.value}</strong>
                  <p>{clinicalInterps.cholesterol.tc_hdl_ratio.text}</p>
                </div>
              )}

              {/* Glucose */}
              {clinicalInterps.glucose && (
                <div className="clinical-result-card">
                  <strong>🩸 Fasting Glucose: {clinicalInterps.glucose.label}</strong>
                  <p>{clinicalInterps.glucose.text}</p>
                  <div className="standard-ref">Standard: {clinicalInterps.glucose.standard}</div>
                </div>
              )}

              {/* Triglycerides */}
              {clinicalInterps.triglycerides && (
                <div className="clinical-result-card">
                  <strong>🔬 Triglycerides: {clinicalInterps.triglycerides.label}</strong>
                  <p>{clinicalInterps.triglycerides.text}</p>
                  <div className="standard-ref">Standard: {clinicalInterps.triglycerides.standard}</div>
                </div>
              )}

              {/* Framingham */}
              {r.framingham && (
                <div className="clinical-result-card" style={{ borderColor: "rgba(99,102,241,0.2)" }}>
                  <strong>📈 10-Year CVD Risk Estimate</strong>
                  <p>{r.framingham.note}</p>
                  <div className="standard-ref">Method: Framingham-derived approximation</div>
                </div>
              )}

              {!clinicalInterps.bp && !clinicalInterps.cholesterol && !clinicalInterps.glucose && (
                <div className="pattern-card">
                  <h4>No clinical data provided</h4>
                  <p>Lab values from a blood test would add clinical depth to this assessment. The assessment currently relies on lifestyle signals and self-reported conditions.</p>
                </div>
              )}

              {/* Explanations */}
              <div className="story-card dark" style={{ marginTop: "0.85rem" }}>
                <span className="story-eyebrow">Factor Analysis</span>
                <h3>Contributing factors</h3>
                <div className="reason-stack" style={{ marginTop: "0.65rem" }}>
                  {(r.explanations || []).map((e, i) => (
                    <div key={i} className="reason-row">
                      <h4>{e.headline}</h4>
                      <p>{e.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ═══ ACTIONS TAB ═══ */}
        {resultTab === "actions" && (
          <motion.div key="actions" {...fade}>
            {/* Targeted Suggestions */}
            <div className="story-card accent" style={{ marginTop: "0.85rem" }}>
              <span className="story-eyebrow">Recommended Actions</span>
              <h3>What to do</h3>
              <div className="tip-stack" style={{ marginTop: "0.65rem" }}>
                {(r.suggestions || []).map((s, i) => (
                  <div key={i} className="tip-row">
                    <div>
                      <h4>{s.title}</h4>
                      <p>{s.body}</p>
                    </div>
                    <span>{s.tag}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Simulations */}
            {sims.length > 0 && (
              <div className="story-card dark" style={{ marginTop: "0.85rem" }}>
                <span className="story-eyebrow">Simulated Improvements</span>
                <h3>What-if scenarios</h3>
                <div className="sim-stack" style={{ marginTop: "0.65rem" }}>
                  {sims.map((s) => (
                    <div key={s.id} className="sim-row">
                      <div>
                        <h4>{s.title}</h4>
                        <p>{s.summary}</p>
                      </div>
                      <div className="sim-score">
                        <strong>{s.risk_score}</strong>
                        {s.delta > 0 && <span>−{s.delta}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Food Guidance */}
            <div className="story-grid">
              <div className="story-card green">
                <span className="story-eyebrow">Lean Into</span>
                <h3>Beneficial patterns</h3>
                <ul className="soft-list">
                  {(r.food_guidance?.lean_into || []).map((f, i) => <li key={i}>{f}</li>)}
                </ul>
              </div>
              <div className="story-card rose">
                <span className="story-eyebrow">Ease Off</span>
                <h3>Patterns to reduce</h3>
                <ul className="soft-list">
                  {(r.food_guidance?.ease_off || []).map((f, i) => <li key={i}>{f}</li>)}
                </ul>
              </div>
            </div>

            {/* Habit Focus */}
            <div className="story-card dark" style={{ marginTop: "0.85rem" }}>
              <span className="story-eyebrow">Habit Focus</span>
              <h3>Priority areas</h3>
              <ul className="soft-list">
                {(r.habit_focus || []).map((h, i) => <li key={i}>{h}</li>)}
              </ul>
            </div>
          </motion.div>
        )}

        {/* ═══ DEEPER LOOK TAB ═══ */}
        {resultTab === "deeper" && (
          <motion.div key="deeper" {...fade}>
            {/* Follow-up Questions */}
            {followups.length > 0 && (
              <div className="story-card dark" style={{ marginTop: "0.85rem" }}>
                <span className="story-eyebrow">Refinement Questions</span>
                <h3>Sharpen the picture</h3>
                <p style={{ fontSize: "0.88rem", marginBottom: "0.65rem" }}>
                  Answer these to increase assessment confidence and detect specific symptoms.
                </p>
                <div className="followup-stack">
                  {followups.map((fq) => (
                    <div key={fq.id} className="followup-card">
                      <h4>{fq.question}</h4>
                      <p>{fq.why}</p>
                      <div className="followup-actions">
                        <button
                          className={`binary-pill${followupAnswers[fq.id] === "yes" ? " active yes" : ""}`}
                          onClick={() => setFollowupAnswers((p) => ({ ...p, [fq.id]: "yes" }))}
                        >
                          Yes
                        </button>
                        <button
                          className={`binary-pill${followupAnswers[fq.id] === "no" ? " active no" : ""}`}
                          onClick={() => setFollowupAnswers((p) => ({ ...p, [fq.id]: "no" }))}
                        >
                          No
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {Object.keys(followupAnswers).length > 0 && (
                  <button className="cta-primary" style={{ marginTop: "0.85rem" }} onClick={runRefinement}>
                    Refine Assessment
                  </button>
                )}
              </div>
            )}

            {/* Confirmed Signals */}
            {confirmed.length > 0 && (
              <div className="story-card warm" style={{ marginTop: "0.85rem" }}>
                <span className="story-eyebrow">Confirmed Signals</span>
                <h3>Refinement results</h3>
                <ul className="soft-list">
                  {confirmed.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
                {r.refinement_summary && <p style={{ marginTop: "0.5rem", fontSize: "0.88rem" }}>{r.refinement_summary}</p>}
              </div>
            )}

            {/* Risk Projection */}
            {r.heart_attack_scenario && (
              <div className="story-card rose" style={{ marginTop: "0.85rem" }}>
                <span className="story-eyebrow">Risk Projection</span>
                <h3>Event scenario</h3>
                <div className="attack-grid">
                  <div className="attack-card">
                    <span>6-month</span>
                    <strong>{r.heart_attack_scenario.six_month_percent}%</strong>
                  </div>
                  <div className="attack-card">
                    <span>3-year</span>
                    <strong>{r.heart_attack_scenario.three_year_percent}%</strong>
                  </div>
                  <div className="attack-card">
                    <span>Level</span>
                    <strong style={{ fontSize: "1.2rem", textTransform: "capitalize" }}>{r.heart_attack_scenario.label}</strong>
                  </div>
                </div>
                <p style={{ marginTop: "0.65rem", fontSize: "0.88rem" }}>{r.heart_attack_scenario.summary}</p>
              </div>
            )}

            {/* Care Flags */}
            <div className="story-card dark" style={{ marginTop: "0.85rem" }}>
              <span className="story-eyebrow">Care Flags</span>
              <h3>Important notes</h3>
              <ul className="soft-list">
                {(r.care_flags || []).map((f, i) => <li key={i}>{f}</li>)}
              </ul>
            </div>

            {/* Doctor Visit Script */}
            <div className="story-card health" style={{ marginTop: "0.85rem" }}>
              <span className="story-eyebrow">Doctor Preparation</span>
              <h3>What to bring up</h3>
              <ul className="soft-list">
                {(r.doctor_visit_script || []).map((d, i) => <li key={i}>{d}</li>)}
              </ul>
            </div>

            {/* History */}
            {history.length > 0 && (
              <div className="story-card dark" style={{ marginTop: "0.85rem" }}>
                <span className="story-eyebrow">Assessment History</span>
                <h3>Previous assessments</h3>
                <div className="history-strip">
                  {history.map((h) => (
                    <div key={h.id} className="history-chip">
                      <strong>{h.risk_score}</strong>
                      <p>{h.risk_level}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Footer Actions ── */}
      <div className="hero-actions" style={{ marginTop: "1.25rem" }}>
        <button className="cta-secondary" onClick={handlePdf}>Download PDF</button>
        <button className="cta-secondary" onClick={restart}>New Assessment</button>
      </div>

      {/* Disclaimer */}
      <p style={{ marginTop: "1rem", fontSize: "0.78rem", color: "var(--text-faint)", textAlign: "center" }}>
        {r.disclaimer}
      </p>
    </div>
  );
}
