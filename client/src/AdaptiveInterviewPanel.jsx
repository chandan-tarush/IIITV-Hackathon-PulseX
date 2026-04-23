import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

import { fetchAdaptiveQuestion } from "./lib.api";
import { getNextAdaptiveQuestion, buildAdaptiveInterview } from "./adaptiveInterview";
import { localize, UI_TEXT } from "./i18n";

export default function AdaptiveInterviewPanel({
  result,
  form,
  answers,
  setAnswers,
  runRefinement,
  language,
}) {
  const [llmQuestion, setLlmQuestion] = useState(null);
  const [llmStatus, setLlmStatus] = useState("idle"); // idle | loading | ready | done | error
  const [previousQA, setPreviousQA] = useState([]);
  const [questionIndex, setQuestionIndex] = useState(0);

  // Fallback to hardcoded questions
  const fallbackNext = getNextAdaptiveQuestion(result, form, answers);
  const fallbackTotal = buildAdaptiveInterview(result, form, answers).length;

  // Fetch LLM-generated adaptive question
  const fetchNext = useCallback(async (qa, idx) => {
    setLlmStatus("loading");
    setLlmQuestion(null);
    try {
      const data = await fetchAdaptiveQuestion({
        result,
        form,
        previousQA: qa,
        questionIndex: idx,
        language,
      });

      if (data?.done) {
        setLlmStatus("done");
        return;
      }

      if (data?.question && data?.options?.length) {
        setLlmQuestion(data);
        setLlmStatus("ready");
      } else {
        setLlmStatus("error");
      }
    } catch {
      setLlmStatus("error");
    }
  }, [result, form, language]);

  // Initial fetch
  useEffect(() => {
    fetchNext([], 0);
  }, [fetchNext]);

  const commitLlmAnswer = (option) => {
    const qa = [...previousQA, {
      question: llmQuestion.question,
      answer: option.label,
      finding: llmQuestion.finding_reference || "",
    }];
    setPreviousQA(qa);

    // Also store in answers for the refinement API
    const key = `adaptive_${questionIndex}`;
    setAnswers((prev) => ({
      ...prev,
      [key]: option.value,
      [`${key}_question`]: llmQuestion.question,
      [`${key}_answer`]: option.label,
    }));

    const nextIdx = questionIndex + 1;
    setQuestionIndex(nextIdx);
    fetchNext(qa, nextIdx);
  };

  const skipLlmQuestion = () => {
    const qa = [...previousQA, {
      question: llmQuestion?.question || `Question ${questionIndex + 1}`,
      answer: "Skipped",
      finding: llmQuestion?.finding_reference || "",
    }];
    setPreviousQA(qa);

    const key = `adaptive_${questionIndex}`;
    setAnswers((prev) => ({ ...prev, [key]: "skipped" }));

    const nextIdx = questionIndex + 1;
    setQuestionIndex(nextIdx);
    fetchNext(qa, nextIdx);
  };

  // Fallback for hardcoded question answers
  const commitFallbackValue = (question, value) => {
    setAnswers((prev) => ({ ...prev, [question.id]: value }));
  };

  const skipFallbackQuestion = (question) => {
    setAnswers((prev) => ({ ...prev, [question.id]: "skipped" }));
  };

  const maxQuestions = 6;
  const isLlmMode = llmStatus !== "error";
  const isDone = isLlmMode ? llmStatus === "done" : !fallbackNext;

  return (
    <motion.div
      key="adaptive-interview"
      className="story-card dark adaptive-interview-panel"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <span className="story-eyebrow">{localize(UI_TEXT.adaptiveInterview, language)}</span>
      <h3>{localize(UI_TEXT.deeperLook, language)}</h3>
      <p>{localize(UI_TEXT.adaptiveInterviewSubhead, language)}</p>

      <AnimatePresence mode="wait">
        {/* LLM Loading State */}
        {isLlmMode && llmStatus === "loading" && (
          <motion.div
            key="llm-loading"
            className="followup-card adaptive-question-card"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <div className="question-topline">
              <span>{questionIndex + 1}</span>
              <div className="question-progress-bar">
                <div style={{ width: `${Math.round((questionIndex / maxQuestions) * 100)}%` }} />
              </div>
              <span>{maxQuestions}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem", padding: "1.5rem 0" }}>
              <div className="question-loader-orb" />
              <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", margin: 0, textAlign: "center" }}>
                {language === "hi" ? "आपकी रिपोर्ट के आधार पर अगला प्रश्न तैयार किया जा रहा है..."
                  : language === "hinglish" ? "Aapki report ke basis par agla question tayyar ho raha hai..."
                  : "Analyzing your findings to determine the next important question..."}
              </p>
            </div>
          </motion.div>
        )}

        {/* LLM Question Ready */}
        {isLlmMode && llmStatus === "ready" && llmQuestion && (
          <motion.div
            key={`llm-q-${questionIndex}`}
            className="followup-card adaptive-question-card"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            <div className="question-topline">
              <span>{questionIndex + 1}</span>
              <div className="question-progress-bar">
                <div style={{ width: `${Math.round(((questionIndex + 1) / maxQuestions) * 100)}%` }} />
              </div>
              <span>{maxQuestions}</span>
            </div>

            <h4>{llmQuestion.question}</h4>
            {llmQuestion.why && (
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: "0.35rem 0 0.75rem" }}>
                {llmQuestion.why}
              </p>
            )}

            <div className="tile-stack interview-tile-stack">
              {(llmQuestion.options || []).map((option, i) => (
                <motion.button
                  key={option.value}
                  className="option-tile"
                  onClick={() => commitLlmAnswer(option)}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                >
                  <strong>{option.label}</strong>
                  {option.note && <span>{option.note}</span>}
                </motion.button>
              ))}
            </div>

            <button className="cta-secondary adaptive-skip-btn" onClick={skipLlmQuestion}>
              {localize(UI_TEXT.skipQuestion, language)}
            </button>
          </motion.div>
        )}

        {/* Fallback: Use hardcoded questions when LLM fails */}
        {!isLlmMode && fallbackNext && (
          <motion.div
            key={`fallback-${fallbackNext.question.id}`}
            className="followup-card adaptive-question-card"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <div className="question-topline">
              <span>{fallbackNext.index + 1}</span>
              <div className="question-progress-bar">
                <div style={{ width: `${Math.round((fallbackNext.index / Math.max(fallbackTotal, 1)) * 100)}%` }} />
              </div>
              <span>{fallbackTotal}</span>
            </div>

            <h4>{localize(fallbackNext.question.title, language)}</h4>
            <p>{localize(fallbackNext.question.why, language)}</p>

            {fallbackNext.question.kind === "choice" && (
              <div className="tile-stack interview-tile-stack">
                {fallbackNext.question.options.map((option) => (
                  <button
                    key={option.value}
                    className="option-tile"
                    onClick={() => commitFallbackValue(fallbackNext.question, option.value)}
                  >
                    <strong>{localize(option.label, language)}</strong>
                  </button>
                ))}
              </div>
            )}

            <button className="cta-secondary adaptive-skip-btn" onClick={() => skipFallbackQuestion(fallbackNext.question)}>
              {localize(UI_TEXT.skipQuestion, language)}
            </button>
          </motion.div>
        )}

        {/* Done State */}
        {isDone && (
          <motion.div
            key="done"
            className="followup-card adaptive-complete-card"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h4>{localize(UI_TEXT.interviewReady, language)}</h4>
            {previousQA.length > 0 && (
              <p style={{ fontSize: "0.84rem", color: "var(--text-secondary)", margin: "0.35rem 0 0.85rem" }}>
                {language === "hi" ? `${previousQA.length} अतिरिक्त प्रश्नों का विश्लेषण किया गया`
                  : language === "hinglish" ? `${previousQA.length} additional questions analyzed`
                  : `${previousQA.length} additional questions analyzed`}
              </p>
            )}
            <button className="cta-primary" onClick={runRefinement}>
              {localize(UI_TEXT.updateAnalysis, language)}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
