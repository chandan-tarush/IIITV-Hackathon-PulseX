/**
 * Medical-grade SVG illustrations.
 * Removed: flowers, vines, tulips, roses, petals, bubbles.
 * Added: ECG heartbeat line, pulse ring, status badge.
 */
import { motion } from "motion/react";

/* ── ECG Heartbeat Line ── */
export function ECGLine({ className = "", color = "rgba(99,102,241,0.5)", width = "100%", height = 60 }) {
  const path = "M0,30 L20,30 L25,30 L30,10 L35,50 L40,20 L45,40 L50,30 L70,30 L80,30 L85,5 L90,55 L95,15 L100,45 L105,30 L130,30 L140,30 L145,8 L150,52 L155,18 L160,42 L165,30 L200,30";

  return (
    <svg className={className} viewBox="0 0 200 60" preserveAspectRatio="none" style={{ width, height, display: "block" }}>
      <motion.path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0.3 }}
        animate={{ pathLength: 1, opacity: 0.7 }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
      />
      <motion.path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="blur(4px)"
        initial={{ pathLength: 0, opacity: 0.15 }}
        animate={{ pathLength: 1, opacity: 0.35 }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
      />
    </svg>
  );
}

/* ── Pulse Ring (for risk score display) ── */
export function PulseRing({ color = "rgba(99,102,241,0.4)", size = 200 }) {
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            border: `1.5px solid ${color}`,
          }}
          animate={{
            scale: [1, 1.5 + i * 0.15],
            opacity: [0.45, 0],
          }}
          transition={{
            duration: 2.4,
            repeat: Infinity,
            delay: i * 0.65,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
}

/* ── Status Badge ── */
export function StatusBadge({ severity = "low" }) {
  const colors = {
    low: "#10b981",
    mild: "#22d3ee",
    moderate: "#f59e0b",
    high: "#ef4444",
    critical: "#dc2626",
  };
  const color = colors[severity] || colors.low;

  return (
    <span
      className="status-badge"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.4rem",
      }}
    >
      <motion.span
        style={{
          width: "0.5rem",
          height: "0.5rem",
          borderRadius: "50%",
          backgroundColor: color,
          boxShadow: `0 0 8px ${color}`,
        }}
        animate={{ scale: [1, 1.3, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
    </span>
  );
}

/* ── Beatly Wordmark (simplified, medical-grade) ── */
export function BeatlyWordmark() {
  return (
    <svg viewBox="0 0 48 44" className="beatly-heart" role="img" aria-label="HeartRisk+ Logo">
      <defs>
        <linearGradient id="heart-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="50%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#4f46e5" />
        </linearGradient>
      </defs>
      <path
        d="M24 42s-20-12.5-20-23.5C4 11.1 10 6 16 6c3.5 0 6.5 2 8 5 1.5-3 4.5-5 8-5 6 0 12 5.1 12 12.5S24 42 24 42z"
        fill="url(#heart-grad)"
        opacity="0.9"
      />
    </svg>
  );
}

/* ── Tiny Pulse (ECG mini for navigation/branding) ── */
export function TinyPulse() {
  return (
    <svg viewBox="0 0 120 32" className="tiny-pulse" aria-hidden="true">
      <motion.path
        d="M0,16 L15,16 L20,16 L25,4 L30,28 L35,10 L40,22 L45,16 L55,16 L65,16 L70,3 L75,29 L80,8 L85,24 L90,16 L120,16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
      />
    </svg>
  );
}

/* ── Story Meter (refined ring for risk score) ── */
export function StoryMeter({ score, label, color }) {
  const angle = Math.min(360, Math.max(0, (score / 100) * 360));
  return (
    <div className="story-meter" role="meter" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100} aria-label="Risk Score">
      <div
        className="story-meter-ring"
        style={{ "--meter-fill": `${angle}deg`, "--meter-color": color }}
      >
        <div className="story-meter-inner">
          <strong>{score}</strong>
          <span>{label || "Score"}</span>
        </div>
      </div>
    </div>
  );
}

/* ── Question Glyph (simplified, context-appropriate icons) ── */
export function QuestionGlyph({ vibe }) {
  const glyphs = {
    vitals: (
      <svg viewBox="0 0 64 64" className="question-glyph" aria-hidden="true">
        <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(99,102,241,0.3)" strokeWidth="1.5" />
        <path d="M18,32 L24,32 L28,18 L32,46 L36,24 L40,38 L44,32 L48,32" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    activity: (
      <svg viewBox="0 0 64 64" className="question-glyph" aria-hidden="true">
        <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(34,211,238,0.3)" strokeWidth="1.5" />
        <path d="M22,42 L32,20 L42,42" fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="26" y1="36" x2="38" y2="36" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    lifestyle: (
      <svg viewBox="0 0 64 64" className="question-glyph" aria-hidden="true">
        <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(16,185,129,0.3)" strokeWidth="1.5" />
        <path d="M32 20 C32 20 22 24 22 32 C22 38 26 42 32 44 C38 42 42 38 42 32 C42 24 32 20 32 20Z" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    clinical: (
      <svg viewBox="0 0 64 64" className="question-glyph" aria-hidden="true">
        <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(245,158,11,0.3)" strokeWidth="1.5" />
        <rect x="26" y="18" width="12" height="28" rx="3" fill="none" stroke="#f59e0b" strokeWidth="2" />
        <line x1="32" y1="24" x2="32" y2="40" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
        <line x1="26" y1="32" x2="38" y2="32" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  };
  return glyphs[vibe] || glyphs.vitals;
}

/* ── ECG Background (replaces BackgroundDoodles) ── */
export function ECGBackground() {
  return (
    <div className="ecg-background" aria-hidden="true">
      <ECGLine className="ecg-line-top" color="rgba(99,102,241,0.12)" height={80} />
      <ECGLine className="ecg-line-mid" color="rgba(34,211,238,0.08)" height={60} />
      <ECGLine className="ecg-line-bot" color="rgba(99,102,241,0.06)" height={70} />
    </div>
  );
}

/* ── Confidence Indicator ── */
export function ConfidenceIndicator({ value = 30 }) {
  const pct = Math.max(0, Math.min(100, value));
  let color = "#ef4444";
  let label = "Low confidence";
  if (pct >= 70) { color = "#10b981"; label = "High confidence"; }
  else if (pct >= 45) { color = "#f59e0b"; label = "Moderate confidence"; }

  return (
    <div className="confidence-indicator">
      <div className="confidence-bar-track">
        <motion.div
          className="confidence-bar-fill"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </div>
      <span className="confidence-label" style={{ color }}>{pct}% — {label}</span>
    </div>
  );
}
