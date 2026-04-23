import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { fetchNutritionPlan } from "./lib.api";
import { getPreferences } from "./healthMemory";

function LoadingShell() {
  return (
    <div className="story-card dark" style={{ textAlign: "center", padding: "2.5rem 1.5rem" }}>
      <div className="report-loading-orb" />
      <h3 style={{ marginTop: "1rem" }}>Crafting your nutrition plan...</h3>
      <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
        Analyzing your clinical markers to design a heart-healthy meal plan grounded in your data.
      </p>
    </div>
  );
}

function MealCard({ meal, label }) {
  if (!meal) return null;
  return (
    <div style={{
      display: "flex", gap: "0.75rem", alignItems: "flex-start",
      padding: "0.75rem", borderRadius: "0.75rem",
      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
    }}>
      <span style={{ fontSize: "1.6rem", flexShrink: 0 }}>{meal.icon || "🍽️"}</span>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--accent-bright)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</span>
        </div>
        <h4 style={{ margin: "0.15rem 0 0", fontSize: "0.9rem" }}>{meal.name}</h4>
        {meal.description && <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", margin: "0.2rem 0 0", lineHeight: 1.55 }}>{meal.description}</p>}
        {meal.benefit && <p style={{ fontSize: "0.78rem", color: "var(--success)", margin: "0.2rem 0 0" }}>✦ {meal.benefit}</p>}
      </div>
    </div>
  );
}

function TargetChip({ label, value, icon }) {
  return (
    <div className="metric-chip">
      <span>{icon} {label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default function NutritionPanel({ result, form, language }) {
  const [plan, setPlan] = useState(null);
  const [status, setStatus] = useState("loading");
  const [activeTab, setActiveTab] = useState("today");

  useEffect(() => {
    let alive = true;
    setStatus("loading");
    const prefs = getPreferences();
    fetchNutritionPlan({ result, form, language, preferences: prefs })
      .then(data => { if (alive) { setPlan(data); setStatus("ready"); } })
      .catch(() => { if (alive) setStatus("error"); });
    return () => { alive = false; };
  }, [result, form, language]);

  if (status === "loading") return <LoadingShell />;
  if (status === "error" || !plan) return (
    <div className="story-card dark"><p>Unable to generate nutrition plan right now. Try again later.</p></div>
  );

  const tabs = [
    { id: "today", label: "Today's Plan", icon: "🍽️" },
    { id: "targets", label: "Daily Targets", icon: "🎯" },
    { id: "foods", label: "Food Guide", icon: "🥗" },
    { id: "grocery", label: "Grocery List", icon: "🛒" },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      {/* Hero */}
      <div className="story-card accent" style={{ marginTop: "0.85rem" }}>
        <span className="story-eyebrow">AI Nutritionist</span>
        <h3>{plan.headline || "Your Heart-Healthy Nutrition Plan"}</h3>
        {plan.conditions_detected?.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.5rem" }}>
            {plan.conditions_detected.map(c => (
              <span key={c} className="confidence-chip watch" style={{ fontSize: "0.72rem" }}>{c}</span>
            ))}
          </div>
        )}
      </div>

      {/* Sub-tabs */}
      <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.85rem", overflowX: "auto", paddingBottom: "0.3rem" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            padding: "0.45rem 0.85rem", borderRadius: "999px", border: "1px solid",
            borderColor: activeTab === t.id ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.08)",
            background: activeTab === t.id ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.03)",
            color: activeTab === t.id ? "var(--accent-bright)" : "var(--text-secondary)",
            fontSize: "0.78rem", fontWeight: activeTab === t.id ? 700 : 400,
            cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.2s",
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Today's Plan */}
      {activeTab === "today" && plan.today_plan && (
        <div style={{ marginTop: "0.85rem", display: "grid", gap: "0.55rem" }}>
          <MealCard meal={plan.today_plan.breakfast} label="Breakfast" />
          <MealCard meal={plan.today_plan.lunch} label="Lunch" />
          <MealCard meal={plan.today_plan.snack} label="Snack" />
          <MealCard meal={plan.today_plan.dinner} label="Dinner" />

          {/* Meal Timing */}
          {plan.meal_timing?.length > 0 && (
            <div className="story-card dark" style={{ marginTop: "0.5rem" }}>
              <span className="story-eyebrow">Meal Timing Guide</span>
              <div style={{ display: "grid", gap: "0.45rem", marginTop: "0.5rem" }}>
                {plan.meal_timing.map((mt, i) => (
                  <div key={i} style={{ display: "flex", gap: "0.65rem", alignItems: "flex-start", padding: "0.35rem 0", borderBottom: i < plan.meal_timing.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                    <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--accent-bright)", minWidth: "5rem" }}>{mt.time}</span>
                    <div>
                      <span style={{ fontSize: "0.82rem", fontWeight: 600 }}>{mt.meal}</span>
                      <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", margin: "0.1rem 0 0" }}>{mt.guidance}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Daily Targets */}
      {activeTab === "targets" && plan.daily_targets && (
        <div style={{ marginTop: "0.85rem" }}>
          <div className="story-card dark">
            <span className="story-eyebrow">Your Daily Targets</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.55rem", marginTop: "0.65rem" }}>
              <TargetChip label="Calories" value={plan.daily_targets.calories} icon="🔥" />
              <TargetChip label="Sodium" value={plan.daily_targets.sodium} icon="🧂" />
              <TargetChip label="Fiber" value={plan.daily_targets.fiber} icon="🌾" />
              <TargetChip label="Water" value={plan.daily_targets.water} icon="💧" />
              {plan.daily_targets.sugar_limit && <TargetChip label="Sugar limit" value={plan.daily_targets.sugar_limit} icon="🍬" />}
            </div>
          </div>

          {/* Hydration */}
          {plan.hydration_tips?.length > 0 && (
            <div className="story-card health" style={{ marginTop: "0.65rem" }}>
              <span className="story-eyebrow">💧 Hydration Tips</span>
              <ul className="soft-list" style={{ marginTop: "0.5rem" }}>
                {plan.hydration_tips.map((tip, i) => <li key={i}>{tip}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Food Guide */}
      {activeTab === "foods" && (
        <div style={{ marginTop: "0.85rem", display: "grid", gap: "0.65rem" }}>
          {plan.foods_to_increase?.length > 0 && (
            <div className="story-card health">
              <span className="story-eyebrow">✅ Increase These Foods</span>
              <div style={{ display: "grid", gap: "0.4rem", marginTop: "0.5rem" }}>
                {plan.foods_to_increase.map((f, i) => (
                  <div key={i} style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start", padding: "0.4rem 0", borderBottom: i < plan.foods_to_increase.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                    <span style={{ color: "var(--success)", fontWeight: 700, fontSize: "0.85rem" }}>+</span>
                    <div>
                      <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>{f.food}</span>
                      <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", margin: "0.1rem 0 0" }}>{f.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {plan.foods_to_reduce?.length > 0 && (
            <div className="story-card warm">
              <span className="story-eyebrow">⚠️ Reduce These Foods</span>
              <div style={{ display: "grid", gap: "0.4rem", marginTop: "0.5rem" }}>
                {plan.foods_to_reduce.map((f, i) => (
                  <div key={i} style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start", padding: "0.4rem 0", borderBottom: i < plan.foods_to_reduce.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                    <span style={{ color: "var(--warning)", fontWeight: 700, fontSize: "0.85rem" }}>−</span>
                    <div>
                      <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>{f.food}</span>
                      <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", margin: "0.1rem 0 0" }}>{f.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Grocery List */}
      {activeTab === "grocery" && plan.grocery_essentials?.length > 0 && (
        <div className="story-card dark" style={{ marginTop: "0.85rem" }}>
          <span className="story-eyebrow">🛒 This Week's Grocery Essentials</span>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem", marginTop: "0.65rem" }}>
            {plan.grocery_essentials.map((item, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: "0.4rem",
                padding: "0.45rem 0.65rem", borderRadius: "0.5rem",
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                fontSize: "0.82rem",
              }}>
                <span style={{ color: "var(--success)" }}>☑</span> {item}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weekly Themes */}
      {activeTab === "today" && plan.weekly_themes?.length > 0 && (
        <div className="story-card dark" style={{ marginTop: "0.85rem" }}>
          <span className="story-eyebrow">Weekly Meal Themes</span>
          <div style={{ display: "grid", gap: "0.4rem", marginTop: "0.5rem" }}>
            {plan.weekly_themes.map((t, i) => (
              <div key={i} style={{ display: "flex", gap: "0.6rem", alignItems: "center", padding: "0.4rem 0" }}>
                <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-primary)", minWidth: "5.5rem" }}>{t.day}</span>
                <span style={{ fontSize: "0.82rem", color: "var(--accent-bright)", fontWeight: 600 }}>{t.theme}</span>
                <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)", flex: 1 }}>{t.highlight_meal}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Motivation */}
      {plan.motivation && (
        <div className="story-card warm" style={{ marginTop: "0.85rem", textAlign: "center" }}>
          <span style={{ fontSize: "1.5rem" }}>🥗</span>
          <p style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontStyle: "italic", margin: "0.5rem 0 0", lineHeight: 1.6 }}>
            "{plan.motivation}"
          </p>
        </div>
      )}
    </motion.div>
  );
}
