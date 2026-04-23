import { useEffect, useMemo, useState } from "react";

import { fetchDetailedReport } from "./lib.api";
import { localize, repairText, UI_TEXT } from "./i18n";

function collectSpeakableText(section) {
  return [
    repairText(section.title),
    repairText(section.body),
    ...((section.bullets || []).map((item) => repairText(item))),
  ].filter(Boolean).join(". ");
}

function preferredLanguages(language) {
  if (language === "hi") return ["hi-IN", "hi"];
  if (language === "hinglish") return ["en-IN", "en-US", "en-GB", "en"];
  return ["en-IN", "en-US", "en-GB", "en"];
}

function sortVoices(voices, language) {
  const prefs = preferredLanguages(language);
  return [...voices].sort((left, right) => {
    const leftIndex = prefs.findIndex((prefix) => left.lang?.toLowerCase().startsWith(prefix.toLowerCase()));
    const rightIndex = prefs.findIndex((prefix) => right.lang?.toLowerCase().startsWith(prefix.toLowerCase()));
    const leftRank = leftIndex === -1 ? prefs.length + 1 : leftIndex;
    const rightRank = rightIndex === -1 ? prefs.length + 1 : rightIndex;
    if (leftRank !== rightRank) return leftRank - rightRank;
    return `${left.name} ${left.lang}`.localeCompare(`${right.name} ${right.lang}`);
  });
}

function pickVoice(voices, language, selectedName) {
  if (!Array.isArray(voices) || !voices.length) return null;
  if (selectedName) {
    const exact = voices.find((voice) => voice.name === selectedName);
    if (exact) return exact;
  }

  const prefs = preferredLanguages(language);
  for (const prefix of prefs) {
    const match = voices.find((voice) => voice.lang?.toLowerCase().startsWith(prefix.toLowerCase()));
    if (match) return match;
  }
  return voices[0];
}

function confidenceTone(score) {
  if (score >= 90) return "high";
  if (score >= 80) return "moderate";
  return "watch";
}

function confidenceLabel(score, language) {
  if (score >= 90) return localize(UI_TEXT.confidenceHigh, language);
  if (score >= 80) return localize(UI_TEXT.confidenceModerate, language);
  return localize(UI_TEXT.confidenceWatch, language);
}

function SectionCard({ section, language, onSpeak, speakingId }) {
  const score = Number(section.confidence_score || 0);
  const eyebrow = repairText(section.eyebrow);
  const title = repairText(section.title);
  const body = repairText(section.body);
  const confidenceNote = repairText(section.confidence_note || confidenceLabel(score, language));
  const bullets = (section.bullets || []).map((item) => repairText(item));

  return (
    <div className="story-card dark report-section-card">
      <div className="report-card-head">
        <div>
          <div className="report-card-meta">
            <span className="story-eyebrow">{eyebrow}</span>
            {score > 0 && (
              <span className={`confidence-chip ${confidenceTone(score)}`}>
                {localize(UI_TEXT.medicalConfidence, language)} {score}% {"\u00B7"} {confidenceNote}
              </span>
            )}
          </div>
          <h3>{title}</h3>
        </div>
        <button className="cta-secondary report-speak-btn" onClick={() => onSpeak(section)}>
          {speakingId === section.id ? localize(UI_TEXT.stopAudio, language) : localize(UI_TEXT.listenSection, language)}
        </button>
      </div>
      {body && <p>{body}</p>}
      {bullets.length > 0 && (
        <ul className="soft-list">
          {bullets.map((item, index) => <li key={`${section.id}-${index}`}>{item}</li>)}
        </ul>
      )}
    </div>
  );
}

function ReportLoadingShell({ language }) {
  return (
    <div className="report-loading-shell story-card dark">
      <div className="report-loading-orb" />
      <span className="story-eyebrow">{localize(UI_TEXT.reportLoading, language)}</span>
      <h3>{localize(UI_TEXT.reportLoadingTitle, language)}</h3>
      <p>{localize(UI_TEXT.reportLoadingBody, language)}</p>
      <div className="report-loading-bars" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

export default function ReportNarratives({ result, form, language, tab }) {
  const [report, setReport] = useState(null);
  const [status, setStatus] = useState("loading");
  const [voices, setVoices] = useState([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState("");
  const [speakingId, setSpeakingId] = useState(null);

  useEffect(() => {
    let alive = true;
    setStatus("loading");

    fetchDetailedReport({ result, form, language })
      .then((data) => {
        if (!alive) return;
        setReport(data);
        setStatus("ready");
      })
      .catch(() => {
        if (!alive) return;
        setStatus("error");
      });

    return () => {
      alive = false;
    };
  }, [form, language, result]);

  useEffect(() => {
    const syncVoices = () => setVoices(window.speechSynthesis?.getVoices?.() || []);
    syncVoices();
    window.speechSynthesis?.addEventListener?.("voiceschanged", syncVoices);
    return () => window.speechSynthesis?.removeEventListener?.("voiceschanged", syncVoices);
  }, []);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  const speak = (section) => {
    if (!window.speechSynthesis) return;

    if (speakingId === section.id) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(collectSpeakableText(section));
    const voice = pickVoice(voices, language, selectedVoiceName);

    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = language === "hi" ? "hi-IN" : "en-IN";
    }

    utterance.rate = language === "hi" ? 0.9 : 0.95;
    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setSpeakingId(section.id);
  };

  const availableVoices = useMemo(() => sortVoices(voices, language), [voices, language]);

  const sections = useMemo(() => {
    if (!report) return [];
    const raw = tab === "overview"
      ? [...(report.summary_cards || []), ...(report.tabs?.overview || [])]
      : report.tabs?.[tab] || [];

    return raw.filter((item) => Number(item?.confidence_score || 0) >= 70);
  }, [report, tab]);

  if (status === "loading") {
    return <ReportLoadingShell language={language} />;
  }

  if (status === "error") {
    return <div className="story-card dark"><p>{localize(UI_TEXT.reportUnavailable, language)}</p></div>;
  }

  return (
    <div className="report-narratives">
      <div className="story-card dark report-voice-card">
        <span className="story-eyebrow">{localize(UI_TEXT.voiceSettings, language)}</span>
        <div className="voice-settings-row">
          <span>{localize(UI_TEXT.voiceSettings, language)}</span>
          <select
            className="voice-select"
            value={selectedVoiceName}
            onChange={(event) => setSelectedVoiceName(event.target.value)}
          >
            <option value="">{localize(UI_TEXT.voiceAuto, language)}</option>
            {availableVoices.map((voice) => (
              <option key={`${voice.name}-${voice.lang}`} value={voice.name}>
                {voice.name} ({voice.lang})
              </option>
            ))}
          </select>
        </div>
      </div>

      {tab === "overview" && (
        <div className="story-card accent report-hero-card">
          <span className="story-eyebrow">{localize(UI_TEXT.preAssessmentNote, language)}</span>
          <h3>{repairText(report?.headline)}</h3>
          {report?.subheadline && <p>{repairText(report.subheadline)}</p>}
        </div>
      )}

      <div className="report-section-grid">
        {sections.map((section) => (
          <SectionCard
            key={section.id}
            section={section}
            language={language}
            onSpeak={speak}
            speakingId={speakingId}
          />
        ))}
      </div>
    </div>
  );
}
