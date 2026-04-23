import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { localize, UI_TEXT } from "./i18n";
import { fetchDoctorPrep } from "./lib.api";

const copy = (en, hi, hinglish) => ({ en, hi, hinglish });

const SPECIALTIES = [
  { id: "cardiologist", label: copy("Cardiologist", "हृदय रोग विशेषज्ञ", "Cardiologist"), icon: "🫀", query: "cardiologist" },
  { id: "cardiology_clinic", label: copy("Cardiology Clinic", "कार्डियोलॉजी क्लिनिक", "Cardiology Clinic"), icon: "🏥", query: "cardiology clinic" },
  { id: "heart_hospital", label: copy("Heart Hospital", "हृदय अस्पताल", "Heart Hospital"), icon: "❤️‍🩹", query: "heart hospital cardiac center" },
  { id: "ecg_center", label: copy("ECG / Stress Test", "ईसीजी / स्ट्रेस टेस्ट", "ECG / Stress Test"), icon: "📈", query: "ECG stress test cardiac diagnostics" },
];

const URGENCY_CONFIG = {
  urgent: {
    color: "#ef4444",
    bg: "rgba(239,68,68,0.1)",
    border: "rgba(239,68,68,0.25)",
    label: copy("Seek appointment within 1–2 weeks", "1-2 सप्ताह में अपॉइंटमेंट लें", "1-2 hafte mein appointment lo"),
    icon: "🚨",
  },
  soon: {
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.2)",
    label: copy("Schedule within 1–2 months", "1-2 महीने में शेड्यूल करें", "1-2 mahine mein schedule karo"),
    icon: "⚡",
  },
  routine: {
    color: "#22c55e",
    bg: "rgba(34,197,94,0.07)",
    border: "rgba(34,197,94,0.15)",
    label: copy("Annual check-up recommended", "वार्षिक जांच की सलाह दी जाती है", "Annual check-up ki salah di jaati hai"),
    icon: "📅",
  },
};

const EMERGENCY_TEXT = copy(
  "If you experience chest pain or pressure, sudden shortness of breath, pain radiating to arm or jaw, sudden dizziness, or cold sweats — call emergency services (112 / 911) immediately. Do not wait for an appointment.",
  "यदि आपको छाती में दर्द या दबाव, अचानक सांस लेने में कठिनाई, हाथ या जबड़े में फैलता दर्द, अचानक चक्कर आना, या ठंडा पसीना महसूस हो — तुरंत आपातकालीन सेवाओं (112 / 911) को कॉल करें। अपॉइंटमेंट का इंतजार न करें।",
  "Agar aapko chest pain ya pressure, sudden saans phoolna, arm ya jaw mein failta dard, sudden dizziness, ya cold sweats mehsoos ho — turant emergency services (112 / 911) ko call karo. Appointment ka intezaar mat karo."
);

function LLMPrepSection({ prep }) {
  if (!prep) return null;

  return (
    <>
      {/* AI-Generated Opening Script */}
      {prep.opening_script && (
        <div className="story-card accent" style={{ marginTop: "0.85rem" }}>
          <span className="story-eyebrow">🤖 AI-Generated Doctor Script</span>
          <h3>What to say when you walk in</h3>
          <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.7, marginTop: "0.5rem", fontStyle: "italic" }}>
            "{prep.opening_script}"
          </p>
        </div>
      )}

      {/* Urgency Reasoning */}
      {prep.urgency_reasoning && (
        <div className="story-card warm" style={{ marginTop: "0.85rem" }}>
          <span className="story-eyebrow">Clinical Reasoning</span>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.65, marginTop: "0.35rem" }}>
            {prep.urgency_reasoning}
          </p>
        </div>
      )}

      {/* Talking Points */}
      {prep.talking_points?.length > 0 && (
        <div className="story-card dark" style={{ marginTop: "0.85rem" }}>
          <span className="story-eyebrow">Key Talking Points</span>
          <h3>Mention these to your doctor</h3>
          <div style={{ display: "grid", gap: "0.55rem", marginTop: "0.65rem" }}>
            {prep.talking_points.map((tp, i) => (
              <div key={i} style={{
                padding: "0.65rem 0.85rem", borderRadius: "0.65rem",
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
              }}>
                <strong style={{ fontSize: "0.88rem", color: "var(--accent-bright)" }}>{tp.topic}</strong>
                <p style={{ fontSize: "0.83rem", color: "var(--text-secondary)", margin: "0.2rem 0 0", lineHeight: 1.55 }}>
                  💬 "{tp.what_to_say}"
                </p>
                <p style={{ fontSize: "0.78rem", color: "var(--text-faint)", margin: "0.15rem 0 0" }}>
                  ↳ {tp.why_it_matters}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Questions to Ask */}
      {prep.questions_to_ask?.length > 0 && (
        <div className="story-card warm" style={{ marginTop: "0.85rem" }}>
          <span className="story-eyebrow">Personalized Questions</span>
          <h3>Ask your doctor these</h3>
          <div style={{ display: "grid", gap: "0.5rem", marginTop: "0.65rem" }}>
            {prep.questions_to_ask.map((q, i) => (
              <div key={i} style={{
                display: "flex", gap: "0.6rem", alignItems: "flex-start",
                padding: "0.5rem 0.7rem", borderRadius: "0.6rem",
                background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.1)",
              }}>
                <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--warning)", fontFamily: "var(--font-display)", minWidth: "1.4rem", marginTop: "0.15rem" }}>
                  Q{i + 1}
                </span>
                <div>
                  <span style={{ fontSize: "0.85rem", color: "var(--text)", fontWeight: 600 }}>{q.question}</span>
                  <p style={{ fontSize: "0.78rem", color: "var(--text-faint)", margin: "0.1rem 0 0" }}>{q.context}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tests to Request */}
      {prep.tests_to_request?.length > 0 && (
        <div className="story-card health" style={{ marginTop: "0.85rem" }}>
          <span className="story-eyebrow">Recommended Tests</span>
          <h3>Tests to discuss</h3>
          <div style={{ display: "grid", gap: "0.45rem", marginTop: "0.65rem" }}>
            {prep.tests_to_request.map((t, i) => (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                padding: "0.55rem 0", borderBottom: i < prep.tests_to_request.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
              }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: "0.88rem", fontWeight: 600 }}>{t.test}</span>
                  <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", margin: "0.1rem 0 0" }}>{t.reason}</p>
                </div>
                <span className={`confidence-chip ${t.priority === "essential" ? "watch" : t.priority === "recommended" ? "moderate" : "high"}`} style={{ fontSize: "0.68rem", flexShrink: 0 }}>
                  {t.priority}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* What to Bring */}
      {prep.what_to_bring?.length > 0 && (
        <div className="story-card dark" style={{ marginTop: "0.85rem" }}>
          <span className="story-eyebrow">📋 Checklist</span>
          <h3>What to bring</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.35rem", marginTop: "0.55rem" }}>
            {prep.what_to_bring.map((item, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: "0.35rem",
                padding: "0.4rem 0.6rem", borderRadius: "0.5rem",
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                fontSize: "0.8rem",
              }}>
                <span style={{ color: "var(--success)" }}>☑</span> {item}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Follow-up Plan */}
      {prep.follow_up_plan && (
        <div className="story-card green" style={{ marginTop: "0.85rem" }}>
          <span className="story-eyebrow">📅 Follow-up Schedule</span>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.65, marginTop: "0.35rem" }}>
            {prep.follow_up_plan}
          </p>
        </div>
      )}
    </>
  );
}

export default function DoctorRecommendations({ result, form, language }) {
  const [locationStatus, setLocationStatus] = useState("idle");
  const [coords, setCoords] = useState(null);
  const [activeSpecialty, setActiveSpecialty] = useState(SPECIALTIES[0]);
  const [mapKey, setMapKey] = useState(0);
  const [prep, setPrep] = useState(null);
  const [prepStatus, setPrepStatus] = useState("loading");

  const riskLevel = result?.risk_level || "Unknown";
  const urgency = ["High", "Very High"].includes(riskLevel) ? "urgent" :
    ["Moderate"].includes(riskLevel) ? "soon" : "routine";
  const urgencyConfig = URGENCY_CONFIG[urgency];

  // Load LLM-powered doctor prep on mount
  useEffect(() => {
    let alive = true;
    setPrepStatus("loading");
    fetchDoctorPrep({ result, form, language })
      .then(data => { if (alive) { setPrep(data); setPrepStatus("ready"); } })
      .catch(() => { if (alive) setPrepStatus("error"); });
    return () => { alive = false; };
  }, [result, form, language]);

  const requestLocation = () => {
    setLocationStatus("loading");
    if (!navigator.geolocation) { setLocationStatus("error"); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocationStatus("granted"); },
      () => setLocationStatus("denied"),
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const getMapsSearchUrl = (specialty, lat, lng) => {
    if (lat && lng) return `https://www.google.com/maps/search/${encodeURIComponent(specialty.query)}/@${lat},${lng},14z`;
    return `https://www.google.com/maps/search/${encodeURIComponent(specialty.query + " near me")}`;
  };

  const getEmbedUrl = (specialty, lat, lng) => {
    const q = encodeURIComponent(`${specialty.query} near me`);
    if (lat && lng) return `https://maps.google.com/maps?q=${encodeURIComponent(specialty.query)}&ll=${lat},${lng}&z=14&output=embed&t=m`;
    return `https://maps.google.com/maps?q=${q}&output=embed&t=m`;
  };

  return (
    <motion.div key="doctors" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.35 }}>
      {/* Urgency Banner */}
      <div style={{
        marginTop: "0.85rem", padding: "1rem 1.2rem", borderRadius: "1rem",
        background: urgencyConfig.bg, border: `1px solid ${urgencyConfig.border}`,
        display: "flex", gap: "0.75rem", alignItems: "flex-start",
      }}>
        <span style={{ fontSize: "1.4rem", flexShrink: 0 }}>{urgencyConfig.icon}</span>
        <div>
          <p style={{ margin: 0, fontWeight: 700, color: urgencyConfig.color, fontSize: "0.9rem" }}>
            {riskLevel} Risk — {localize(urgencyConfig.label, language)}
          </p>
          {prep?.urgency_reasoning && (
            <p style={{ margin: "0.25rem 0 0", fontSize: "0.83rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
              {prep.urgency_reasoning}
            </p>
          )}
        </div>
      </div>

      {/* LLM Loading */}
      {prepStatus === "loading" && (
        <div className="story-card dark" style={{ marginTop: "0.85rem", textAlign: "center", padding: "2rem" }}>
          <div className="report-loading-orb" />
          <h3 style={{ marginTop: "0.75rem" }}>AI is preparing your doctor visit guide...</h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
            Analyzing your clinical data to create personalized talking points, questions, and test recommendations.
          </p>
        </div>
      )}

      {/* LLM-Powered Prep Content */}
      {prepStatus === "ready" && <LLMPrepSection prep={prep} />}

      {/* Find Nearby Doctors */}
      <div className="story-card dark" style={{ marginTop: "0.85rem" }}>
        <span className="story-eyebrow">{localize(UI_TEXT.findNearby, language)}</span>
        <h3>{localize(UI_TEXT.cardiologistsNearYou, language)}</h3>
        <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginBottom: "0.85rem" }}>
          {localize(UI_TEXT.searchCardioSpecialists, language)}
        </p>

        {/* Specialty Selector */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.85rem" }}>
          {SPECIALTIES.map(sp => (
            <button key={sp.id} onClick={() => { setActiveSpecialty(sp); setMapKey(k => k + 1); }} style={{
              padding: "0.4rem 0.85rem", borderRadius: "999px",
              border: `1px solid ${activeSpecialty.id === sp.id ? "rgba(220,38,38,0.6)" : "rgba(220,38,38,0.18)"}`,
              background: activeSpecialty.id === sp.id ? "rgba(220,38,38,0.18)" : "rgba(220,38,38,0.05)",
              color: activeSpecialty.id === sp.id ? "var(--accent-bright)" : "var(--text-secondary)",
              fontSize: "0.8rem", fontWeight: activeSpecialty.id === sp.id ? 700 : 400,
              cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", gap: "0.35rem",
            }}>
              <span>{sp.icon}</span> {localize(sp.label, language)}
            </button>
          ))}
        </div>

        {/* Location Access */}
        {locationStatus === "idle" && (
          <button className="cta-primary" style={{ width: "100%", marginBottom: "0.75rem" }} onClick={requestLocation}>
            {localize(UI_TEXT.useMyLocation, language)}
          </button>
        )}
        {locationStatus === "loading" && (
          <div style={{ padding: "0.75rem", marginBottom: "0.75rem", borderRadius: "0.75rem", background: "rgba(255,255,255,0.04)", textAlign: "center", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            Detecting your location…
          </div>
        )}
        {locationStatus === "denied" && (
          <div style={{ padding: "0.65rem 0.85rem", marginBottom: "0.75rem", borderRadius: "0.75rem", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", fontSize: "0.82rem", color: "var(--warning)" }}>
            ⚠️ Location access denied. The map will show general results.
          </div>
        )}
        {locationStatus === "granted" && (
          <div style={{ padding: "0.45rem 0.75rem", marginBottom: "0.75rem", borderRadius: "0.75rem", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", fontSize: "0.8rem", color: "var(--success)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            ✓ Location detected — showing specialists near you
          </div>
        )}

        {/* Map Embed */}
        <div style={{ position: "relative", width: "100%", height: "320px", borderRadius: "0.85rem", overflow: "hidden", border: "1px solid rgba(220,38,38,0.15)", background: "rgba(0,0,0,0.3)", marginBottom: "0.85rem" }}>
          {(locationStatus === "granted" || locationStatus === "denied" || locationStatus === "idle") && (
            <iframe
              key={`${activeSpecialty.id}-${mapKey}-${coords?.lat}`}
              title={`Find ${localize(activeSpecialty.label, "en")}`}
              width="100%" height="100%" style={{ border: 0, display: "block" }}
              loading="lazy" referrerPolicy="no-referrer-when-downgrade"
              src={getEmbedUrl(activeSpecialty, coords?.lat, coords?.lng)} allowFullScreen
            />
          )}
          {locationStatus === "loading" && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(6,2,8,0.7)", flexDirection: "column", gap: "0.5rem" }}>
              <div style={{ width: 32, height: 32, border: "3px solid rgba(220,38,38,0.2)", borderTopColor: "#dc2626", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
              <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>Getting your location…</span>
            </div>
          )}
        </div>

        <a href={getMapsSearchUrl(activeSpecialty, coords?.lat, coords?.lng)} target="_blank" rel="noopener noreferrer" className="cta-secondary" style={{ display: "block", textAlign: "center", textDecoration: "none", padding: "0.75rem", marginBottom: "0.5rem" }}>
          🗺️ Open Full Google Maps Search
        </a>

        {locationStatus !== "granted" && (
          <button className="cta-secondary" style={{ width: "100%", fontSize: "0.82rem" }} onClick={requestLocation}>
            📍 {locationStatus === "denied" ? "Retry Location Access" : "Enable Precise Location"}
          </button>
        )}
      </div>

      {/* Emergency Note */}
      <div style={{ marginTop: "0.85rem", padding: "1rem 1.2rem", borderRadius: "1rem", background: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.2)" }}>
        <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--health)", fontWeight: 700, marginBottom: "0.35rem" }}>
          {localize(UI_TEXT.emergencySymptoms, language)}
        </p>
        <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
          {localize(EMERGENCY_TEXT, language)}
        </p>
        {/* LLM red flags */}
        {prep?.red_flags?.length > 0 && (
          <div style={{ marginTop: "0.5rem", display: "grid", gap: "0.3rem" }}>
            {prep.red_flags.map((rf, i) => (
              <span key={i} style={{ fontSize: "0.78rem", color: "var(--danger)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                🚨 {rf}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
