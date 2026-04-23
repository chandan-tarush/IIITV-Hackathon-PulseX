/**
 * Medical-grade SVG illustrations — Red Dark Theme.
 * Includes HeartVeinLanding: animated heart with flowing blood veins.
 */
import { motion } from "motion/react";

/* ── ECG Heartbeat Line (Red) ── */
export function ECGLine({ className = "", color = "rgba(220,38,38,0.5)", width = "100%", height = 60 }) {
  const path = "M0,30 L20,30 L25,30 L30,10 L35,50 L40,20 L45,40 L50,30 L70,30 L80,30 L85,5 L90,55 L95,15 L100,45 L105,30 L130,30 L140,30 L145,8 L150,52 L155,18 L160,42 L165,30 L200,30";
  return (
    <svg className={className} viewBox="0 0 200 60" preserveAspectRatio="none" style={{ width, height, display: "block" }}>
      <motion.path
        d={path} fill="none" stroke={color} strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0.3 }}
        animate={{ pathLength: 1, opacity: 0.7 }}
        transition={{ duration: 2.8, repeat: Infinity, ease: "linear" }}
      />
      <motion.path
        d={path} fill="none" stroke={color} strokeWidth="3"
        strokeLinecap="round" strokeLinejoin="round"
        filter="blur(4px)"
        initial={{ pathLength: 0, opacity: 0.15 }}
        animate={{ pathLength: 1, opacity: 0.35 }}
        transition={{ duration: 2.8, repeat: Infinity, ease: "linear" }}
      />
    </svg>
  );
}

/* ── Pulse Ring (Red) ── */
export function PulseRing({ color = "rgba(220,38,38,0.4)", size = 200 }) {
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      {[0, 1, 2].map((i) => (
        <motion.div key={i}
          style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `1.5px solid ${color}` }}
          animate={{ scale: [1, 1.5 + i * 0.15], opacity: [0.45, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.6, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

/* ── Status Badge ── */
export function StatusBadge({ severity = "low" }) {
  const colors = { low: "#22c55e", mild: "#f87171", moderate: "#f59e0b", high: "#ef4444", critical: "#dc2626" };
  const color = colors[severity] || colors.low;
  return (
    <span className="status-badge" style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
      <motion.span
        style={{ width: "0.5rem", height: "0.5rem", borderRadius: "50%", backgroundColor: color, boxShadow: `0 0 8px ${color}` }}
        animate={{ scale: [1, 1.35, 1] }}
        transition={{ duration: 1.8, repeat: Infinity }}
      />
    </span>
  );
}

/* ── Beatly Wordmark (Red heart gradient) ── */
export function BeatlyWordmark() {
  return (
    <svg viewBox="0 0 48 44" className="beatly-heart" role="img" aria-label="PulseX Logo">
      <defs>
        <linearGradient id="heart-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="50%" stopColor="#dc2626" />
          <stop offset="100%" stopColor="#991b1b" />
        </linearGradient>
        <filter id="heart-glow">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <path
        d="M24 42s-20-12.5-20-23.5C4 11.1 10 6 16 6c3.5 0 6.5 2 8 5 1.5-3 4.5-5 8-5 6 0 12 5.1 12 12.5S24 42 24 42z"
        fill="url(#heart-grad)" filter="url(#heart-glow)" opacity="0.95"
      />
    </svg>
  );
}

/* ── Tiny Pulse (ECG mini, red) ── */
export function TinyPulse() {
  return (
    <svg viewBox="0 0 120 32" className="tiny-pulse" aria-hidden="true">
      <motion.path
        d="M0,16 L15,16 L20,16 L25,4 L30,28 L35,10 L40,22 L45,16 L55,16 L65,16 L70,3 L75,29 L80,8 L85,24 L90,16 L120,16"
        fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
      />
    </svg>
  );
}

/* ── Story Meter ── */
export function StoryMeter({ score, label, color }) {
  const angle = Math.min(360, Math.max(0, (score / 100) * 360));
  return (
    <div className="story-meter" role="meter" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100} aria-label="Risk Score">
      <div className="story-meter-ring" style={{ "--meter-fill": `${angle}deg`, "--meter-color": color }}>
        <div className="story-meter-inner">
          <strong>{score}</strong>
          <span>{label || "Score"}</span>
        </div>
      </div>
    </div>
  );
}

/* ── Question Glyph (red tones) ── */
export function QuestionGlyph({ vibe }) {
  const glyphs = {
    vitals: (
      <svg viewBox="0 0 64 64" className="question-glyph" aria-hidden="true">
        <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(220,38,38,0.25)" strokeWidth="1.5" />
        <path d="M18,32 L24,32 L28,18 L32,46 L36,24 L40,38 L44,32 L48,32"
          fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    activity: (
      <svg viewBox="0 0 64 64" className="question-glyph" aria-hidden="true">
        <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(248,113,113,0.25)" strokeWidth="1.5" />
        <path d="M22,42 L32,20 L42,42" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="26" y1="36" x2="38" y2="36" stroke="#f87171" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    lifestyle: (
      <svg viewBox="0 0 64 64" className="question-glyph" aria-hidden="true">
        <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(220,38,38,0.2)" strokeWidth="1.5" />
        <path d="M32 20 C32 20 22 24 22 32 C22 38 26 42 32 44 C38 42 42 38 42 32 C42 24 32 20 32 20Z"
          fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    clinical: (
      <svg viewBox="0 0 64 64" className="question-glyph" aria-hidden="true">
        <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(245,158,11,0.25)" strokeWidth="1.5" />
        <rect x="26" y="18" width="12" height="28" rx="3" fill="none" stroke="#f59e0b" strokeWidth="2" />
        <line x1="32" y1="24" x2="32" y2="40" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
        <line x1="26" y1="32" x2="38" y2="32" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  };
  return glyphs[vibe] || glyphs.vitals;
}

/* ── ECG Background (red tones) ── */
export function ECGBackground() {
  return (
    <div className="ecg-background" aria-hidden="true">
      <ECGLine className="ecg-line-top" color="rgba(220,38,38,0.14)" height={80} />
      <ECGLine className="ecg-line-mid" color="rgba(239,68,68,0.08)" height={60} />
      <ECGLine className="ecg-line-bot" color="rgba(185,28,28,0.06)" height={70} />
    </div>
  );
}

/* ── Confidence Indicator ── */
export function ConfidenceIndicator({ value = 30 }) {
  const pct = Math.max(0, Math.min(100, value));
  let color = "#ef4444";
  let label = "Low confidence";
  if (pct >= 70) { color = "#22c55e"; label = "High confidence"; }
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

/* ══════════════════════════════════════════════════════════════
   HEART VEIN LANDING — Animated cute 3D heart with blinking eyes,
   smile, flowing blood veins blending into dark background
   ══════════════════════════════════════════════════════════════ */
export function HeartVeinLanding() {
  return (
    <div className="heart-vein-container" aria-hidden="true">
      <div className="heart3d-scene">
        <svg className="heart-vein-svg heart3d-svg" viewBox="0 0 500 520" xmlns="http://www.w3.org/2000/svg">
          <defs>
            {/* 3D heart main gradient — deep crimson to bright candy-red */}
            <radialGradient id="h3d-main" cx="38%" cy="32%" r="65%">
              <stop offset="0%" stopColor="#ff6b6b" stopOpacity="0.92" />
              <stop offset="35%" stopColor="#dc2626" stopOpacity="0.88" />
              <stop offset="70%" stopColor="#991b1b" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#3d0a0a" stopOpacity="0.45" />
            </radialGradient>

            {/* Specular shine top-left */}
            <radialGradient id="h3d-shine" cx="30%" cy="22%" r="35%">
              <stop offset="0%" stopColor="#ffb3b3" stopOpacity="0.55" />
              <stop offset="60%" stopColor="#ff6b6b" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
            </radialGradient>

            {/* Rim / edge glow */}
            <radialGradient id="h3d-rim" cx="50%" cy="50%" r="52%">
              <stop offset="60%" stopColor="#7f1d1d" stopOpacity="0" />
              <stop offset="100%" stopColor="#dc2626" stopOpacity="0.35" />
            </radialGradient>

            {/* Blood flow in veins */}
            <linearGradient id="bg1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1a0305" stopOpacity="0" />
              <stop offset="25%" stopColor="#dc2626" stopOpacity="0.75" />
              <stop offset="55%" stopColor="#ff6b6b" stopOpacity="0.9" />
              <stop offset="80%" stopColor="#dc2626" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#1a0305" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="bg2" x1="100%" y1="0%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#1a0305" stopOpacity="0" />
              <stop offset="25%" stopColor="#dc2626" stopOpacity="0.7" />
              <stop offset="55%" stopColor="#ff6b6b" stopOpacity="0.85" />
              <stop offset="80%" stopColor="#dc2626" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#1a0305" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="bg3" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1a0305" stopOpacity="0" />
              <stop offset="30%" stopColor="#dc2626" stopOpacity="0.65" />
              <stop offset="60%" stopColor="#ff4444" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#1a0305" stopOpacity="0" />
            </linearGradient>

            {/* Vein glow filter */}
            <filter id="vg" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>

            {/* Heart outer glow */}
            <filter id="hg" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="14" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>

            {/* Soft shadow on bottom */}
            <filter id="shadow-btm" x="-20%" y="-10%" width="140%" height="140%">
              <feDropShadow dx="0" dy="18" stdDeviation="18" floodColor="#1a0305" floodOpacity="0.6" />
            </filter>

            {/* Eye white shine */}
            <radialGradient id="eye-shine" cx="30%" cy="25%" r="60%">
              <stop offset="0%" stopColor="#fff" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#ffb3b3" stopOpacity="0.2" />
            </radialGradient>

            {/* Clip for shine layer */}
            <clipPath id="heart-clip">
              <path d="M250,370 C250,370 105,305 72,248 C39,191 54,138 84,118 C114,98 148,108 168,128 C188,148 210,190 250,190 C290,190 312,148 332,128 C352,108 386,98 416,118 C446,138 461,191 428,248 C395,305 250,370 250,370Z" />
            </clipPath>
          </defs>

          {/* ── Outer diffuse halo glow ── */}
          <ellipse cx="250" cy="285" rx="155" ry="130" fill="rgba(220,38,38,0.07)" filter="url(#hg)" />

          {/* ══ VEIN NETWORK — blends into dark bg ══ */}
          {/* Aorta upward arch */}
          <path className="vein-a"
            d="M250,192 C250,162 262,138 278,118 C294,98 324,87 352,95 C382,104 396,132 390,160 C384,188 366,200 348,196"
            fill="none" stroke="url(#bg1)" strokeWidth="6" strokeLinecap="round" filter="url(#vg)" />
          <path d="M250,192 C250,162 262,138 278,118 C294,98 324,87 352,95 C382,104 396,132 390,160 C384,188 366,200 348,196"
            fill="none" stroke="rgba(60,5,5,0.4)" strokeWidth="6" strokeLinecap="round" />

          {/* Right coronary arch */}
          <path className="vein-b"
            d="M305,215 C332,208 358,208 380,218 C402,228 416,252 412,276 C408,300 392,315 372,312 C352,309 339,296 334,280"
            fill="none" stroke="url(#bg2)" strokeWidth="4.5" strokeLinecap="round" filter="url(#vg)" />
          <path d="M305,215 C332,208 358,208 380,218 C402,228 416,252 412,276 C408,300 392,315 372,312 C352,309 339,296 334,280"
            fill="none" stroke="rgba(60,5,5,0.3)" strokeWidth="4.5" strokeLinecap="round" />

          {/* Left coronary arch */}
          <path className="vein-c"
            d="M195,215 C168,208 142,208 120,218 C98,228 84,252 88,276 C92,300 108,315 128,312 C148,309 161,296 166,280"
            fill="none" stroke="url(#bg1)" strokeWidth="4.5" strokeLinecap="round" filter="url(#vg)" />
          <path d="M195,215 C168,208 142,208 120,218 C98,228 84,252 88,276 C92,300 108,315 128,312 C148,309 161,296 166,280"
            fill="none" stroke="rgba(60,5,5,0.3)" strokeWidth="4.5" strokeLinecap="round" />

          {/* Pulmonary upper-left */}
          <path className="vein-d"
            d="M228,185 C215,168 200,152 184,140 C168,128 148,122 132,130 C116,138 110,158 118,176 C126,194 144,200 160,195"
            fill="none" stroke="url(#bg2)" strokeWidth="3.5" strokeLinecap="round" filter="url(#vg)" />

          {/* Descending aorta */}
          <path className="vein-e"
            d="M250,365 C250,396 244,424 234,448 C224,472 208,490 190,498 C172,506 153,502 140,490"
            fill="none" stroke="url(#bg3)" strokeWidth="4" strokeLinecap="round" filter="url(#vg)" />

          {/* Inferior right branch */}
          <path className="vein-f"
            d="M250,365 C262,396 272,424 268,452 C264,480 250,500 262,512"
            fill="none" stroke="url(#bg2)" strokeWidth="3" strokeLinecap="round" filter="url(#vg)" />

          {/* Capillary top-right */}
          <path className="vein-g"
            d="M348,196 C364,182 380,165 390,146 C400,127 400,108 388,96"
            fill="none" stroke="url(#bg1)" strokeWidth="2.5" strokeLinecap="round" filter="url(#vg)" />

          {/* Capillary top-left */}
          <path className="vein-h"
            d="M160,195 C144,181 128,164 118,145 C108,126 108,107 120,95"
            fill="none" stroke="url(#bg2)" strokeWidth="2.5" strokeLinecap="round" filter="url(#vg)" />

          {/* Extra capillary right */}
          <path className="vein-a"
            d="M412,276 C428,268 442,254 448,238 C454,222 450,205 438,196"
            fill="none" stroke="url(#bg1)" strokeWidth="2" strokeLinecap="round" filter="url(#vg)" opacity="0.7" />

          {/* Extra capillary left */}
          <path className="vein-b"
            d="M88,276 C72,268 58,254 52,238 C46,222 50,205 62,196"
            fill="none" stroke="url(#bg2)" strokeWidth="2" strokeLinecap="round" filter="url(#vg)" opacity="0.7" />

          {/* ══ HEART BODY ══ */}
          <g className="heart3d-body" filter="url(#shadow-btm)">
            {/* Deep shadow layer */}
            <path
              d="M250,370 C250,370 105,305 72,248 C39,191 54,138 84,118 C114,98 148,108 168,128 C188,148 210,190 250,190 C290,190 312,148 332,128 C352,108 386,98 416,118 C446,138 461,191 428,248 C395,305 250,370 250,370Z"
              fill="rgba(20,3,3,0.5)" transform="translate(4,8)"
            />

            {/* Main heart shape */}
            <path
              d="M250,370 C250,370 105,305 72,248 C39,191 54,138 84,118 C114,98 148,108 168,128 C188,148 210,190 250,190 C290,190 312,148 332,128 C352,108 386,98 416,118 C446,138 461,191 428,248 C395,305 250,370 250,370Z"
              fill="url(#h3d-main)"
            />

            {/* Rim edge glow */}
            <path
              d="M250,370 C250,370 105,305 72,248 C39,191 54,138 84,118 C114,98 148,108 168,128 C188,148 210,190 250,190 C290,190 312,148 332,128 C352,108 386,98 416,118 C446,138 461,191 428,248 C395,305 250,370 250,370Z"
              fill="none" stroke="rgba(255,120,120,0.22)" strokeWidth="2"
            />

            {/* Shine overlay — clipped to heart */}
            <g clipPath="url(#heart-clip)">
              <ellipse cx="200" cy="185" rx="72" ry="55" fill="url(#h3d-shine)" />
              {/* Secondary specular glint */}
              <ellipse cx="310" cy="175" rx="30" ry="22" fill="rgba(255,180,180,0.12)" />
            </g>

            {/* Inner highlight line (3D curve feel) */}
            <path
              d="M175,148 C162,160 154,178 158,196"
              fill="none" stroke="rgba(255,160,160,0.28)" strokeWidth="5" strokeLinecap="round"
            />

            {/* ── FACE: Eyes ── */}
            {/* Left eye white */}
            <ellipse className="heart3d-eye-left" cx="205" cy="255" rx="14" ry="14" fill="rgba(255,255,255,0.95)" />
            <ellipse cx="205" cy="255" rx="14" ry="14" fill="url(#eye-shine)" />
            {/* Left pupil */}
            <ellipse className="heart3d-pupil-left" cx="207" cy="257" rx="7" ry="7" fill="#1a0305" />
            {/* Left pupil shine */}
            <ellipse cx="210" cy="254" rx="2.5" ry="2.5" fill="white" opacity="0.9" />
            {/* Left blink lid */}
            <rect className="heart3d-blink-left" x="190" y="241" width="30" height="0" rx="14" fill="#c0142a" />

            {/* Right eye white */}
            <ellipse className="heart3d-eye-right" cx="295" cy="255" rx="14" ry="14" fill="rgba(255,255,255,0.95)" />
            <ellipse cx="295" cy="255" rx="14" ry="14" fill="url(#eye-shine)" />
            {/* Right pupil */}
            <ellipse className="heart3d-pupil-right" cx="297" cy="257" rx="7" ry="7" fill="#1a0305" />
            {/* Right pupil shine */}
            <ellipse cx="300" cy="254" rx="2.5" ry="2.5" fill="white" opacity="0.9" />
            {/* Right blink lid */}
            <rect className="heart3d-blink-right" x="280" y="241" width="30" height="0" rx="14" fill="#c0142a" />

            {/* ── FACE: Smile ── */}
            <path
              d="M218,295 C225,310 237,318 250,318 C263,318 275,310 282,295"
              fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="4.5" strokeLinecap="round"
            />

            {/* Cheek blush left */}
            <ellipse cx="175" cy="278" rx="18" ry="10" fill="rgba(255,80,80,0.28)" />
            {/* Cheek blush right */}
            <ellipse cx="325" cy="278" rx="18" ry="10" fill="rgba(255,80,80,0.28)" />
          </g>
        </svg>
      </div>
    </div>
  );
}
