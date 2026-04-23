import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { fetchFitnessPlan } from "./lib.api";
import { localize, UI_TEXT } from "./i18n";
import { getHabitLog } from "./healthMemory";

function LoadingShell() {
  return (
    <div className="story-card dark" style={{ textAlign: "center", padding: "2.5rem 1.5rem" }}>
      <div className="report-loading-orb" />
      <h3 style={{ marginTop: "1rem" }}>Designing your exercise plan...</h3>
      <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
        Our AI is analyzing your risk profile, clinical data, and lifestyle to create a safe, personalized plan.
      </p>
    </div>
  );
}

function ExerciseCard({ exercise, index }) {
  return (
    <motion.div
      className="story-card dark"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      style={{ display: "flex", gap: "0.85rem", alignItems: "flex-start" }}
    >
      <span style={{ fontSize: "1.8rem", flexShrink: 0 }}>{exercise.icon || "🏃"}</span>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.35rem" }}>
          <h4 style={{ margin: 0, fontSize: "0.95rem" }}>{exercise.name}</h4>
          <span className="confidence-chip moderate" style={{ fontSize: "0.72rem" }}>{exercise.type}</span>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.35rem", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.78rem", color: "var(--accent-bright)", fontWeight: 600 }}>📅 {exercise.frequency}</span>
          <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>⏱️ {exercise.duration}</span>
        </div>
        <p style={{ fontSize: "0.83rem", color: "var(--text-secondary)", lineHeight: 1.6, marginTop: "0.4rem" }}>{exercise.benefit}</p>
        {exercise.safety_note && (
          <p style={{ fontSize: "0.78rem", color: "var(--warning)", marginTop: "0.25rem" }}>⚠️ {exercise.safety_note}</p>
        )}
      </div>
    </motion.div>
  );
}

function ScheduleView({ schedule }) {
  if (!Array.isArray(schedule) || !schedule.length) return null;
  return (
    <div className="story-card dark" style={{ marginTop: "0.85rem" }}>
      <span className="story-eyebrow">Weekly Schedule</span>
      <div style={{ display: "grid", gap: "0.5rem", marginTop: "0.65rem" }}>
        {schedule.map((day, i) => (
          <div key={day.day} style={{
            display: "flex", alignItems: "center", gap: "0.65rem",
            padding: "0.5rem 0.75rem", borderRadius: "0.6rem",
            background: day.rest ? "rgba(34,197,94,0.06)" : "rgba(99,102,241,0.06)",
            border: `1px solid ${day.rest ? "rgba(34,197,94,0.12)" : "rgba(99,102,241,0.1)"}`,
          }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-primary)", minWidth: "5.5rem" }}>{day.day}</span>
            <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)", flex: 1 }}>
              {Array.isArray(day.activities) ? day.activities.join(" · ") : day.activities}
            </span>
            {day.rest && <span style={{ fontSize: "0.7rem", color: "var(--success)" }}>🌿 Rest</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function ProgressionView({ progression }) {
  if (!progression) return null;
  const phases = Object.entries(progression).filter(([k]) => k !== "milestone");
  return (
    <div className="story-card health" style={{ marginTop: "0.85rem" }}>
      <span className="story-eyebrow">Progression Plan</span>
      <div style={{ display: "grid", gap: "0.65rem", marginTop: "0.65rem" }}>
        {phases.map(([key, val], i) => (
          <div key={key} style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start" }}>
            <span style={{
              width: "1.6rem", height: "1.6rem", borderRadius: "50%",
              background: "rgba(99,102,241,0.15)", display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: "0.72rem", fontWeight: 700, color: "var(--accent-bright)", flexShrink: 0,
            }}>{i + 1}</span>
            <div>
              <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-primary)" }}>{key.replace(/_/g, " ")}</span>
              <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", margin: "0.15rem 0 0" }}>{val}</p>
            </div>
          </div>
        ))}
      </div>
      {progression.milestone && (
        <div style={{
          marginTop: "0.75rem", padding: "0.65rem 0.85rem", borderRadius: "0.6rem",
          background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.15)",
          fontSize: "0.82rem", color: "var(--success)",
        }}>🎯 {progression.milestone}</div>
      )}
    </div>
  );
}

export default function FitnessPanel({ result, form, language }) {
  const [plan, setPlan] = useState(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let alive = true;
    setStatus("loading");
    fetchFitnessPlan({ result, form, language, habitLog: getHabitLog().slice(-7) })
      .then(data => { if (alive) { setPlan(data); setStatus("ready"); } })
      .catch(() => { if (alive) setStatus("error"); });
    return () => { alive = false; };
  }, [result, form, language]);

  if (status === "loading") return <LoadingShell />;
  if (status === "error" || !plan) return (
    <div className="story-card dark"><p>Unable to generate fitness plan right now. Try again later.</p></div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      {/* Hero */}
      <div className="story-card accent" style={{ marginTop: "0.85rem" }}>
        <span className="story-eyebrow">AI Fitness Coach</span>
        <h3>{plan.headline || "Your Personalized Exercise Plan"}</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem", marginTop: "0.65rem" }}>
          <div className="metric-chip">
            <span>🎯 Target</span>
            <strong>{plan.weekly_target_minutes || 150} min/week</strong>
          </div>
          <div className="metric-chip">
            <span>💓 HR Zone</span>
            <strong>{plan.target_hr?.lower || "—"}–{plan.target_hr?.upper || "—"} bpm</strong>
          </div>
          <div className="metric-chip">
            <span>⚡ Intensity</span>
            <strong>{plan.intensity_limit || "moderate"}</strong>
          </div>
        </div>
      </div>

      {/* Warnings */}
      {plan.warnings?.length > 0 && (
        <div style={{ marginTop: "0.85rem", padding: "0.85rem 1rem", borderRadius: "0.85rem", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
          {plan.warnings.map((w, i) => (
            <p key={i} style={{ fontSize: "0.83rem", color: "var(--health)", margin: i > 0 ? "0.4rem 0 0" : 0, lineHeight: 1.55 }}>{w}</p>
          ))}
        </div>
      )}

      {/* Exercises */}
      <div style={{ marginTop: "0.85rem" }}>
        <span className="story-eyebrow" style={{ marginBottom: "0.5rem", display: "block" }}>Recommended Exercises</span>
        <div style={{ display: "grid", gap: "0.6rem" }}>
          {(plan.exercises || []).map((ex, i) => <ExerciseCard key={ex.name || i} exercise={ex} index={i} />)}
        </div>
      </div>

      {/* Schedule */}
      <ScheduleView schedule={plan.weekly_schedule} />

      {/* Progression */}
      <ProgressionView progression={plan.progression} />

      {/* Motivation */}
      {plan.motivation && (
        <div className="story-card warm" style={{ marginTop: "0.85rem", textAlign: "center" }}>
          <span style={{ fontSize: "1.5rem" }}>💪</span>
          <p style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontStyle: "italic", margin: "0.5rem 0 0", lineHeight: 1.6 }}>
            "{plan.motivation}"
          </p>
        </div>
      )}
    </motion.div>
  );
}
