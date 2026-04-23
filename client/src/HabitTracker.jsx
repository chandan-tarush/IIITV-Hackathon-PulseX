import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { fetchHabitCoaching } from "./lib.api";
import { logHabit, getTodayHabits, getHabitStreak, getWeekSummary, getHabitLog } from "./healthMemory";

const HABIT_TYPES = [
  { type: "exercise", label: "Exercise", icon: "🏃", options: [
    { value: "walked", label: "Walked" }, { value: "yoga", label: "Yoga" },
    { value: "stretching", label: "Stretched" }, { value: "workout", label: "Workout" },
  ]},
  { type: "meal", label: "Meal Quality", icon: "🥗", options: [
    { value: "healthy", label: "Healthy meal", quality: "healthy" },
    { value: "mixed", label: "Mixed meal", quality: "mixed" },
    { value: "junk", label: "Junk food", quality: "junk" },
  ]},
  { type: "water", label: "Water", icon: "💧", options: [
    { value: 2, label: "2 glasses" }, { value: 4, label: "4 glasses" },
    { value: 6, label: "6 glasses" }, { value: 8, label: "8+ glasses" },
  ]},
  { type: "sleep", label: "Sleep", icon: "😴", options: [
    { value: 5, label: "<6 hrs" }, { value: 6, label: "6-7 hrs" },
    { value: 7, label: "7-8 hrs" }, { value: 8, label: "8+ hrs" },
  ]},
  { type: "stress", label: "Stress Level", icon: "🧘", options: [
    { value: "low", label: "Low", level: "low" }, { value: "moderate", label: "Moderate", level: "moderate" },
    { value: "high", label: "High", level: "high" },
  ]},
];

function StreakBadge({ type, icon }) {
  const streak = getHabitStreak(type);
  if (streak === 0) return null;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "0.25rem",
      padding: "0.2rem 0.55rem", borderRadius: "999px", fontSize: "0.72rem",
      background: streak >= 7 ? "rgba(34,197,94,0.15)" : "rgba(245,158,11,0.12)",
      color: streak >= 7 ? "var(--success)" : "var(--warning)",
      fontWeight: 700,
    }}>
      🔥 {streak} day{streak > 1 ? "s" : ""}
    </span>
  );
}

function TodayLog() {
  const habits = getTodayHabits();
  if (!habits.length) return (
    <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", textAlign: "center", padding: "0.5rem" }}>
      No habits logged today yet. Start tracking below! 👇
    </p>
  );
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
      {habits.map(h => (
        <span key={h.id} style={{
          padding: "0.3rem 0.6rem", borderRadius: "999px", fontSize: "0.72rem",
          background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.15)",
          color: "var(--accent-bright)",
        }}>
          {HABIT_TYPES.find(t => t.type === h.type)?.icon || "📝"} {h.label || h.type}
        </span>
      ))}
    </div>
  );
}

function WeekSnapshot() {
  const summary = getWeekSummary();
  const stats = [
    { label: "Exercise days", value: `${summary.exerciseDays}/7`, icon: "🏃" },
    { label: "Healthy meals", value: summary.healthyMeals, icon: "🥗" },
    { label: "Avg sleep", value: summary.sleepAvg ? `${summary.sleepAvg} hrs` : "—", icon: "😴" },
    { label: "Water intake", value: `${summary.waterGlasses} glasses`, icon: "💧" },
    { label: "Low stress days", value: summary.stressLow, icon: "🧘" },
  ];
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem" }}>
      {stats.map(s => (
        <div key={s.label} className="metric-chip">
          <span>{s.icon} {s.label}</span>
          <strong>{s.value}</strong>
        </div>
      ))}
    </div>
  );
}

export default function HabitTracker({ result, form, language }) {
  const [coaching, setCoaching] = useState(null);
  const [coachStatus, setCoachStatus] = useState("idle");
  const [activeType, setActiveType] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadCoaching = useCallback(() => {
    setCoachStatus("loading");
    fetchHabitCoaching({ result, form, language, habitLog: getHabitLog(), weekSummary: getWeekSummary() })
      .then(data => { setCoaching(data); setCoachStatus("ready"); })
      .catch(() => setCoachStatus("error"));
  }, [result, form, language]);

  useEffect(() => { loadCoaching(); }, [loadCoaching]);

  const handleLog = (habitType, option) => {
    const entry = {
      type: habitType.type,
      value: option.value,
      label: option.label,
      quality: option.quality || null,
      level: option.level || null,
      hours: typeof option.value === "number" && habitType.type === "sleep" ? option.value : null,
      glasses: typeof option.value === "number" && habitType.type === "water" ? option.value : null,
    };
    logHabit(entry);
    setActiveType(null);
    setRefreshKey(k => k + 1);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      {/* AI Coaching Card */}
      {coachStatus === "loading" && (
        <div className="story-card dark" style={{ textAlign: "center", padding: "2rem" }}>
          <div className="report-loading-orb" />
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "0.75rem" }}>Your AI coach is analyzing your habits...</p>
        </div>
      )}

      {coachStatus === "ready" && coaching && (
        <div className="story-card accent" style={{ marginTop: "0.85rem" }}>
          <span className="story-eyebrow">AI Health Coach</span>
          <h3>{coaching.greeting || "Your daily coaching"}</h3>
          {coaching.streak_message && (
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.35rem", lineHeight: 1.6 }}>{coaching.streak_message}</p>
          )}
          {coaching.progress_analysis && (
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.35rem", lineHeight: 1.6 }}>{coaching.progress_analysis}</p>
          )}

          {/* Top Habits */}
          {coaching.top_habits?.length > 0 && (
            <div style={{ display: "grid", gap: "0.5rem", marginTop: "0.85rem" }}>
              {coaching.top_habits.map((h, i) => (
                <div key={h.id || i} style={{
                  padding: "0.65rem 0.85rem", borderRadius: "0.65rem",
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <span style={{ fontSize: "1.1rem" }}>{h.icon || "✨"}</span>
                    <strong style={{ fontSize: "0.88rem" }}>{h.name}</strong>
                  </div>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: "0.25rem 0 0", lineHeight: 1.55 }}>{h.why}</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.35rem" }}>
                    {h.micro_version && <span className="confidence-chip high" style={{ fontSize: "0.68rem" }}>🌱 Start: {h.micro_version}</span>}
                    {h.trigger && <span className="confidence-chip moderate" style={{ fontSize: "0.68rem" }}>⏰ {h.trigger}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Nudge */}
          {coaching.nudge && (
            <div style={{ marginTop: "0.75rem", padding: "0.6rem 0.85rem", borderRadius: "0.6rem", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.15)", fontSize: "0.82rem", color: "var(--warning)" }}>
              💡 {coaching.nudge}
            </div>
          )}

          {/* Celebration */}
          {coaching.celebration && (
            <div style={{ marginTop: "0.5rem", padding: "0.6rem 0.85rem", borderRadius: "0.6rem", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.15)", fontSize: "0.82rem", color: "var(--success)" }}>
              🎉 {coaching.celebration}
            </div>
          )}
        </div>
      )}

      {/* Week Summary */}
      <div className="story-card dark" style={{ marginTop: "0.85rem" }} key={`week-${refreshKey}`}>
        <span className="story-eyebrow">This Week</span>
        <WeekSnapshot />
      </div>

      {/* Today's Log */}
      <div className="story-card dark" style={{ marginTop: "0.85rem" }} key={`today-${refreshKey}`}>
        <span className="story-eyebrow">Today's Progress</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginTop: "0.3rem", marginBottom: "0.5rem" }}>
          {HABIT_TYPES.map(ht => <StreakBadge key={ht.type} type={ht.type} icon={ht.icon} />)}
        </div>
        <TodayLog />
      </div>

      {/* Log Habit Buttons */}
      <div className="story-card dark" style={{ marginTop: "0.85rem" }}>
        <span className="story-eyebrow">Log a Habit</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.65rem" }}>
          {HABIT_TYPES.map(ht => (
            <button key={ht.type} onClick={() => setActiveType(activeType?.type === ht.type ? null : ht)} style={{
              padding: "0.55rem 1rem", borderRadius: "0.65rem",
              border: `1px solid ${activeType?.type === ht.type ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.08)"}`,
              background: activeType?.type === ht.type ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.03)",
              color: activeType?.type === ht.type ? "var(--accent-bright)" : "var(--text-secondary)",
              fontSize: "0.82rem", cursor: "pointer", transition: "all 0.2s",
            }}>
              {ht.icon} {ht.label}
            </button>
          ))}
        </div>

        <AnimatePresence>
          {activeType && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              style={{ marginTop: "0.65rem", overflow: "hidden" }}
            >
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                {activeType.options.map(opt => (
                  <button key={opt.value} onClick={() => handleLog(activeType, opt)} className="option-tile" style={{
                    padding: "0.5rem 0.85rem", fontSize: "0.82rem",
                  }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Refresh coaching */}
      <button onClick={loadCoaching} className="cta-secondary" style={{ width: "100%", marginTop: "0.85rem" }} disabled={coachStatus === "loading"}>
        🔄 Refresh AI Coaching
      </button>
    </motion.div>
  );
}
