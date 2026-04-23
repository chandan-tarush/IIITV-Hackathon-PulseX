from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

DATABASE_PATH = DATA_DIR / "heart_risk_history.db"
TRAINING_ROWS = 3200
RANDOM_SEED = 42

NUMERIC_FIELDS = ["age", "systolic_bp", "diastolic_bp", "cholesterol", "hdl_cholesterol", "ldl_cholesterol", "fasting_glucose", "triglycerides"]
CATEGORICAL_FIELDS = [
    "gender",
    "smoking",
    "diabetes",
    "family_history",
    "activity_level",
    "sitting",
    "stress",
    "sleep_quality",
    "diet",
    "exertion_response",
    "bp_known",
    "cholesterol_known",
    "glucose_known",
]
INPUT_FIELDS = [
    "age",
    "gender",
    "systolic_bp",
    "diastolic_bp",
    "cholesterol",
    "hdl_cholesterol",
    "ldl_cholesterol",
    "fasting_glucose",
    "triglycerides",
    "smoking",
    "diabetes",
    "family_history",
    "activity_level",
    "sitting",
    "stress",
    "sleep_quality",
    "diet",
    "exertion_response",
]

LIFESTYLE_POINTS = {
    "activity_level": {"low": 20, "medium": 10, "high": 0},
    "sitting": {"high": 15, "medium": 8, "low": 0},
    "stress": {"high": 15, "medium": 8, "low": 0},
    "sleep_quality": {"poor": 15, "ok": 5, "good": 0},
    "diet": {"frequent": 15, "moderate": 8, "rare": 0},
    "exertion_response": {"strained": 12, "noticeable": 6, "easy": 0},
}

RISK_BANDS = [
    (5, "Low"),
    (10, "Mild"),
    (20, "Moderate"),
    (30, "High"),
    (101, "Very High"),
]

# ── AHA / ACC Blood Pressure Classification (2017 Guidelines) ──
BP_CATEGORIES = {
    "normal":              {"systolic": (0, 120), "diastolic": (0, 80),  "severity": 0.0},
    "elevated":            {"systolic": (120, 130), "diastolic": (0, 80),  "severity": 0.2},
    "stage1_hypertension": {"systolic": (130, 140), "diastolic": (80, 90), "severity": 0.45},
    "stage2_hypertension": {"systolic": (140, 180), "diastolic": (90, 120), "severity": 0.72},
    "hypertensive_crisis": {"systolic": (180, 300), "diastolic": (120, 200), "severity": 0.95},
}

# ── ATP-III / AHA Cholesterol Classification (mg/dL) ──
TC_CATEGORIES = {
    "desirable":      {"range": (0, 200),   "severity": 0.0},
    "borderline_high": {"range": (200, 240), "severity": 0.35},
    "high":           {"range": (240, 600),  "severity": 0.7},
}

HDL_CATEGORIES = {
    "low":      {"range": (0, 40),   "severity": 0.6,  "note": "Major cardiovascular risk factor"},
    "moderate": {"range": (40, 60),  "severity": 0.2,  "note": "Acceptable but not protective"},
    "high":     {"range": (60, 200), "severity": 0.0,  "note": "Protective against heart disease"},
}

LDL_CATEGORIES = {
    "optimal":        {"range": (0, 100),   "severity": 0.0},
    "near_optimal":   {"range": (100, 130), "severity": 0.15},
    "borderline_high": {"range": (130, 160), "severity": 0.4},
    "high":           {"range": (160, 190), "severity": 0.65},
    "very_high":      {"range": (190, 500), "severity": 0.85},
}

# ── ADA Glucose Classification (mg/dL, fasting) ──
GLUCOSE_CATEGORIES = {
    "normal":       {"range": (0, 100),   "severity": 0.0},
    "prediabetes":  {"range": (100, 126), "severity": 0.4},
    "diabetes":     {"range": (126, 500), "severity": 0.8},
}

# ── AHA Triglycerides Classification (mg/dL) ──
TRIGLYCERIDE_CATEGORIES = {
    "normal":        {"range": (0, 150),   "severity": 0.0},
    "borderline_high": {"range": (150, 200), "severity": 0.3},
    "high":          {"range": (200, 500), "severity": 0.6},
    "very_high":     {"range": (500, 2000), "severity": 0.85},
}

LEVEL_MESSAGES = {
    "Low": "Your heart profile looks calm and well supported right now.",
    "Mild": "A few gentle adjustments could give your heart even more breathing room.",
    "Moderate": "Your daily routine is putting quiet pressure on your heart.",
    "High": "Your heart is carrying a meaningful amount of stress and deserves attention.",
    "Very High": "Your heart risk is elevated enough that a clinician conversation is worth prioritising.",
}

DOCTOR_GUIDANCE = {
    "Low": "Stay consistent, keep moving, and repeat a preventive check every 1 to 2 years.",
    "Mild": "Monitor blood pressure and glucose trends, and discuss them at your next routine visit.",
    "Moderate": "A check-in with a doctor is sensible, especially if blood pressure, sugar, or stress stay elevated.",
    "High": "Please plan a doctor visit soon to review blood pressure, labs, and prevention options.",
    "Very High": "Please speak with a doctor promptly. This tool is for awareness, not diagnosis.",
}

SIMULATION_PATCHES = [
    (
        "exercise_more",
        "Move more and sit less",
        {"activity_level": "high", "sitting": "low"},
        "Building movement into your week relieves pressure from both circulation and metabolism.",
    ),
    (
        "sleep_recovery",
        "Improve sleep and lower stress",
        {"sleep_quality": "good", "stress": "low"},
        "Recovery habits help the heart quiet down and improve long-term resilience.",
    ),
    (
        "food_reset",
        "Shift toward home-cooked meals",
        {"diet": "rare"},
        "Small nutrition changes often compound faster than people expect.",
    ),
    (
        "full_reset",
        "Adopt the strongest combined reset",
        {
            "activity_level": "high",
            "sitting": "low",
            "stress": "low",
            "sleep_quality": "good",
            "diet": "rare",
            "smoking": "no",
        },
        "This shows the upside of consistent prevention across your whole routine.",
    ),
]
