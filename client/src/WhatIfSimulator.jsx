import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { fetchWhatIf } from "./lib.api";

const IMPACT_COLORS = {
  low: { bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.08)", text: "var(--text-secondary)" },
  moderate: { bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.18)", text: "var(--warning)" },
  high: { bg: "rgba(34,197,94,0.08)", border: "rgba(34,197,94,0.18)", text: "var(--success)" },
  transformative: { bg: "rgba(99,102,241,0.1)", border: "rgba(99,102,241,0.25)", text: "#a5b4fc" },
};

const DIFFICULTY_LABELS = {
  easy: { label: "Easy", color: "var(--success)" },
  moderate: { label: "Moderate", color: "var(--warning)" },
  hard: { label: "Hard", color: "var(--danger)" },
};

function ScoreBar({ current, projected, label }) {
  const pct = Math.max(0, Math.min(100, projected));
  const curPct = Math.max(0, Math.min(100, current));
  const reduction = current - projected;
  const isImproved = reduction > 0;

  return (
    <div style={{ marginTop: "0.35rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.25rem" }}>
        <span style={{ fontSize: "0.72rem", color: "var(--text-faint)" }}>{label || "Projected Score"}</span>
        <div style={{ display: "flex", alignItems: "baseline", gap: "0.4rem" }}>
          <span style={{ fontSize: "1.1rem", fontWeight: 700, fontFamily: "var(--font-display)", color: isImproved ? "var(--success)" : "var(--text)" }}>
            {projected}
          </span>
          {isImproved && (
            <span style={{ fontSize: "0.75rem", color: "var(--success)", fontWeight: 600 }}>
              ↓{reduction} pts
            </span>
          )}
        </div>
      </div>
      <div style={{ position: "relative", height: "0.35rem", borderRadius: "999px", background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
        {/* Current score marker */}
        <div style={{
          position: "absolute", left: `${curPct}%`, top: "-2px", width: "2px", height: "calc(100% + 4px)",
          background: "var(--accent-bright)", opacity: 0.5, zIndex: 2,
        }} />
        {/* Projected fill */}
        <div style={{
          height: "100%", borderRadius: "inherit",
          width: `${pct}%`,
          background: isImproved
            ? "linear-gradient(90deg, var(--success), rgba(34,197,94,0.4))"
            : "linear-gradient(90deg, var(--warning), rgba(245,158,11,0.4))",
          transition: "width 0.8s ease",
        }} />
      </div>
    </div>
  );
}

function ScenarioCard({ scenario, currentScore, index }) {
  const impact = IMPACT_COLORS[scenario.impact] || IMPACT_COLORS.moderate;
  const difficulty = DIFFICULTY_LABELS[scenario.difficulty] || DIFFICULTY_LABELS.moderate;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      style={{
        padding: "0.85rem 1rem", borderRadius: "0.75rem",
        background: impact.bg, border: `1px solid ${impact.border}`,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: 1 }}>
          <span style={{ fontSize: "1.3rem" }}>{scenario.icon || "✨"}</span>
          <div>
            <strong style={{ fontSize: "0.9rem", display: "block" }}>{scenario.change}</strong>
            <div style={{ display: "flex", gap: "0.35rem", marginTop: "0.2rem", flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.68rem", color: difficulty.color, fontWeight: 700, padding: "0.12rem 0.45rem", borderRadius: "999px", background: "rgba(0,0,0,0.2)" }}>
                {difficulty.label}
              </span>
              <span style={{ fontSize: "0.68rem", color: impact.text, fontWeight: 700, padding: "0.12rem 0.45rem", borderRadius: "999px", background: "rgba(0,0,0,0.2)" }}>
                {scenario.impact} impact
              </span>
            </div>
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <span style={{ fontSize: "1.4rem", fontWeight: 800, fontFamily: "var(--font-display)", color: "var(--success)" }}>
            {scenario.new_score}
          </span>
          <span style={{ fontSize: "0.72rem", color: "var(--text-faint)", display: "block" }}>/100</span>
        </div>
      </div>

      <ScoreBar current={currentScore} projected={scenario.new_score} />

      {scenario.timeline && (
        <p style={{ fontSize: "0.78rem", color: "var(--text-faint)", margin: "0.35rem 0 0", display: "flex", alignItems: "center", gap: "0.3rem" }}>
          ⏱️ {scenario.timeline}
        </p>
      )}
      {scenario.evidence && (
        <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", margin: "0.25rem 0 0", lineHeight: 1.5 }}>
          📊 {scenario.evidence}
        </p>
      )}
    </motion.div>
  );
}

export default function WhatIfSimulator({ result, form, language }) {
  const [sim, setSim] = useState(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let alive = true;
    setStatus("loading");
    fetchWhatIf({ result, form, language })
      .then(data => { if (alive) { setSim(data); setStatus("ready"); } })
      .catch(() => { if (alive) setStatus("error"); });
    return () => { alive = false; };
  }, [result, form, language]);

  if (status === "loading") return (
    <div className="story-card dark" style={{ textAlign: "center", padding: "2.5rem 1.5rem", marginTop: "0.85rem" }}>
      <div className="report-loading-orb" />
      <h3 style={{ marginTop: "1rem" }}>Running lifestyle simulations...</h3>
      <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
        AI is modeling how specific changes would affect your risk score using Framingham and ASCVD evidence.
      </p>
    </div>
  );

  if (status === "error" || !sim) return (
    <div className="story-card dark" style={{ marginTop: "0.85rem" }}>
      <p>Unable to run simulations right now. Try again later.</p>
    </div>
  );

  const currentScore = sim.current_score ?? result?.risk_score ?? 50;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      {/* Hero */}
      <div className="story-card accent" style={{ marginTop: "0.85rem" }}>
        <span className="story-eyebrow">AI What-If Simulator</span>
        <h3>What if you made these changes?</h3>
        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.35rem", lineHeight: 1.6 }}>
          Each scenario is modeled using your actual clinical data and published medical evidence. Scores are conservative estimates.
        </p>
        <div style={{ display: "flex", gap: "0.65rem", marginTop: "0.65rem", flexWrap: "wrap" }}>
          <div className="metric-chip">
            <span>Current Score</span>
            <strong>{currentScore}/100</strong>
          </div>
          <div className="metric-chip">
            <span>Current Level</span>
            <strong>{sim.current_level || result?.risk_level}</strong>
          </div>
          {sim.combined_projection && (
            <div className="metric-chip" style={{ borderColor: "rgba(34,197,94,0.3)" }}>
              <span style={{ color: "var(--success)" }}>Best Possible</span>
              <strong style={{ color: "var(--success)" }}>{sim.combined_projection.new_score}/100</strong>
            </div>
          )}
        </div>
      </div>

      {/* Best Single Change */}
      {sim.best_single_change && (
        <div className="story-card green" style={{ marginTop: "0.85rem" }}>
          <span className="story-eyebrow">🎯 Highest Impact Single Change</span>
          <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginTop: "0.35rem", lineHeight: 1.65 }}>
            {sim.best_single_change}
          </p>
        </div>
      )}

      {/* Scenarios */}
      {sim.scenarios?.length > 0 && (
        <div style={{ marginTop: "0.85rem", display: "grid", gap: "0.6rem" }}>
          {sim.scenarios.map((s, i) => (
            <ScenarioCard key={s.id || i} scenario={s} currentScore={currentScore} index={i} />
          ))}
        </div>
      )}

      {/* Combined Projection */}
      {sim.combined_projection && (
        <div className="story-card accent" style={{ marginTop: "0.85rem", textAlign: "center" }}>
          <span className="story-eyebrow">Combined Impact — All Changes Together</span>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "baseline", gap: "0.75rem", marginTop: "0.5rem" }}>
            <div style={{ textAlign: "center" }}>
              <span style={{ fontSize: "0.72rem", color: "var(--text-faint)", display: "block" }}>Now</span>
              <span style={{ fontSize: "1.8rem", fontWeight: 800, fontFamily: "var(--font-display)", color: "var(--accent-bright)" }}>{currentScore}</span>
            </div>
            <span style={{ fontSize: "1.5rem", color: "var(--text-faint)" }}>→</span>
            <div style={{ textAlign: "center" }}>
              <span style={{ fontSize: "0.72rem", color: "var(--success)", display: "block" }}>Projected</span>
              <span style={{ fontSize: "1.8rem", fontWeight: 800, fontFamily: "var(--font-display)", color: "var(--success)" }}>{sim.combined_projection.new_score}</span>
            </div>
          </div>
          <p style={{ fontSize: "0.78rem", color: "var(--text-faint)", marginTop: "0.15rem" }}>
            {sim.combined_projection.new_level} risk level
          </p>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.5rem", lineHeight: 1.6 }}>
            {sim.combined_projection.message}
          </p>
          <ScoreBar current={currentScore} projected={sim.combined_projection.new_score} label="Full transformation" />
        </div>
      )}

      {/* Heart Age Note */}
      {sim.heart_age_note && (
        <div className="story-card warm" style={{ marginTop: "0.85rem", textAlign: "center" }}>
          <span style={{ fontSize: "1.5rem" }}>🫀</span>
          <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", fontStyle: "italic", margin: "0.5rem 0 0", lineHeight: 1.6 }}>
            {sim.heart_age_note}
          </p>
        </div>
      )}
    </motion.div>
  );
}
