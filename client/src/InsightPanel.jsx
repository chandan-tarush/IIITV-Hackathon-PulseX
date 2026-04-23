import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";

import { generateResultInsights } from "./lib.api";
import { localize, UI_TEXT } from "./i18n";

function buildSpeechText(insight) {
  if (!insight) return "";
  return [
    ...(insight.executive_summary || []),
    ...(insight.likely_daily_patterns || []),
    ...(insight.precautions || []),
    ...(insight.exercise_recommendations || []),
    ...(insight.sleep_recommendations || []),
    ...(insight.stress_management || []),
  ].join(" ");
}

export default function InsightPanel({ result, form, language }) {
  const [insight, setInsight] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);
  const [speaking, setSpeaking] = useState(false);
  const utteranceRef = useRef(null);

  useEffect(() => {
    let alive = true;
    setStatus("loading");
    setError(null);

    generateResultInsights({ result, form, language })
      .then((data) => {
        if (!alive) return;
        setInsight(data);
        setStatus("ready");
      })
      .catch((err) => {
        if (!alive) return;
        setError(err.message);
        setStatus("error");
      });

    return () => {
      alive = false;
    };
  }, [result, form, language]);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  const speechText = useMemo(() => buildSpeechText(insight), [insight]);

  const toggleSpeech = () => {
    if (!speechText || !window.speechSynthesis) return;

    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.lang = language === "hi" ? "hi-IN" : "en-IN";
    utterance.rate = 0.95;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    utteranceRef.current = utterance;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  };

  return (
    <motion.div className="story-card accent insight-panel" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
      <div className="insight-panel-header">
        <div>
          <span className="story-eyebrow">{localize(UI_TEXT.aiBriefing, language)}</span>
          <h3>{insight?.headline || localize(UI_TEXT.aiBriefing, language)}</h3>
        </div>
        <button className="cta-secondary insight-speak-btn" onClick={toggleSpeech} disabled={!speechText}>
          {speaking ? localize(UI_TEXT.stopBriefing, language) : localize(UI_TEXT.listenBriefing, language)}
        </button>
      </div>

      {status === "loading" && <p>{localize(UI_TEXT.generatingBriefing, language)}</p>}
      {status === "error" && <p>{error || "Unable to generate detailed insight right now."}</p>}

      {status === "ready" && insight && (
        <div className="insight-grid">
          <div className="insight-column">
            <h4>{insight.section_labels?.summary || localize(UI_TEXT.aiBriefing, language)}</h4>
            <ul className="soft-list">
              {(insight.executive_summary || []).map((item, index) => <li key={index}>{item}</li>)}
            </ul>
          </div>

          <div className="insight-column">
            <h4>{insight.section_labels?.patterns || "Likely Daily Patterns"}</h4>
            <ul className="soft-list">
              {(insight.likely_daily_patterns || []).map((item, index) => <li key={index}>{item}</li>)}
            </ul>
          </div>

          <div className="insight-column">
            <h4>{insight.section_labels?.care || "Precautions"}</h4>
            <ul className="soft-list">
              {(insight.precautions || []).map((item, index) => <li key={index}>{item}</li>)}
            </ul>
          </div>

          <div className="insight-column">
            <h4>{insight.section_labels?.food || "Nutrition"}</h4>
            <p><strong>{insight.food_intro}</strong></p>
            <ul className="soft-list">
              {(insight.foods_to_prioritize || []).map((item, index) => <li key={`food-${index}`}>{item}</li>)}
            </ul>
            <ul className="soft-list">
              {(insight.foods_to_reduce || []).map((item, index) => <li key={`avoid-${index}`}>{item}</li>)}
            </ul>
          </div>

          {(insight.exercise_recommendations?.length > 0) && (
            <div className="insight-column">
              <h4>{insight.section_labels?.exercise || localize(UI_TEXT.insightExercise, language)}</h4>
              <ul className="soft-list">
                {insight.exercise_recommendations.map((item, index) => <li key={`ex-${index}`}>{item}</li>)}
              </ul>
            </div>
          )}

          {(insight.sleep_recommendations?.length > 0) && (
            <div className="insight-column">
              <h4>{insight.section_labels?.sleep || localize(UI_TEXT.insightSleep, language)}</h4>
              <ul className="soft-list">
                {insight.sleep_recommendations.map((item, index) => <li key={`sl-${index}`}>{item}</li>)}
              </ul>
            </div>
          )}

          {(insight.stress_management?.length > 0) && (
            <div className="insight-column">
              <h4>{insight.section_labels?.stress || localize(UI_TEXT.insightStress, language)}</h4>
              <ul className="soft-list">
                {insight.stress_management.map((item, index) => <li key={`st-${index}`}>{item}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
