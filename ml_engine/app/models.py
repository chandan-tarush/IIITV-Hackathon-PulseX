from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd
from catboost import CatBoostClassifier
from lightgbm import LGBMClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier

from .clinical_interpreter import (
    compute_clinical_severity,
    compute_confidence_score,
    compute_framingham_approximation,
)
from .config import (
    CATEGORICAL_FIELDS,
    DOCTOR_GUIDANCE,
    INPUT_FIELDS,
    LEVEL_MESSAGES,
    LIFESTYLE_POINTS,
    RANDOM_SEED,
    RISK_BANDS,
    SIMULATION_PATCHES,
    TRAINING_ROWS,
)
from .data_generator import generate_synthetic_dataset


@dataclass(frozen=True)
class SignalWeight:
    headline: str
    detail: str
    score: float


# ── Cross-signal pattern definitions ──
CROSS_SIGNAL_PATTERNS = [
    {
        "id": "sedentary_metabolic",
        "conditions": lambda p: p["activity_level"] == "low" and p["sitting"] == "high" and p["diet"] == "frequent",
        "severity": 0.78,
        "label": "Sedentary-metabolic pattern",
        "cause": "Low movement combined with convenience eating creates sustained insulin resistance and lipid accumulation pressure.",
        "projection": "This pattern is associated with metabolic syndrome development within 3–5 years if sustained, per WHO longitudinal data.",
        "action": "Introduce a 20-minute walk after your largest meal daily — post-meal movement reduces glucose spikes by 30–50%.",
        "action_timeline": "Measurable glucose and triglyceride improvement typically visible within 4–6 weeks.",
    },
    {
        "id": "sedentary_basic",
        "conditions": lambda p: p["activity_level"] == "low" and p["sitting"] == "high",
        "severity": 0.55,
        "label": "Prolonged sedentary pattern",
        "cause": "Extended sitting with minimal movement reduces vascular tone and slows circulation, increasing clot and stiffness risk.",
        "projection": "Sedentary behavior increases all-cause mortality risk by 15–20% independent of exercise sessions (Ekelund et al., Lancet 2016).",
        "action": "Stand and move for 3–5 minutes every hour during sitting periods.",
        "action_timeline": "Vascular function improvements measurable within 2–3 weeks of consistent movement breaks.",
    },
    {
        "id": "recovery_deficit",
        "conditions": lambda p: p["stress"] == "high" and p["sleep_quality"] == "poor",
        "severity": 0.72,
        "label": "Recovery deficit",
        "cause": "Chronic stress combined with poor sleep prevents parasympathetic recovery, keeping heart rate and blood pressure elevated around the clock.",
        "projection": "Sustained recovery deficit increases hypertension risk by 40–60% and is linked to elevated resting heart rate, a direct CVD predictor.",
        "action": "Set a consistent bedtime within ±30 minutes and avoid screens 45 minutes before sleep.",
        "action_timeline": "Sleep regularity improves heart rate variability more than duration alone — expect measurable HRV changes within 3 weeks.",
    },
    {
        "id": "stress_eating",
        "conditions": lambda p: p["diet"] == "frequent" and p["stress"] == "high",
        "severity": 0.58,
        "label": "Stress-driven eating pattern",
        "cause": "Cortisol elevation from chronic stress drives preference for high-calorie, high-sodium foods, creating a reinforcing loop of inflammation and weight gain.",
        "projection": "This loop typically accelerates visceral fat accumulation and worsens lipid profiles within 6–12 months.",
        "action": "Replace one stress-driven meal per day with a prepared home meal — even a simple one breaks the cortisol-food loop.",
        "action_timeline": "Inflammatory markers like CRP begin to improve within 6–8 weeks of dietary consistency.",
    },
    {
        "id": "vascular_stress",
        "conditions": lambda p: p.get("systolic_bp") is not None and p["systolic_bp"] >= 140 and p["stress"] == "high",
        "severity": 0.82,
        "label": "Vascular-stress compound",
        "cause": "Hypertension compounded by chronic stress creates sustained arterial wall damage, accelerating atherosclerosis progression.",
        "projection": "Combined elevated BP and chronic stress increases stroke risk 2–3x compared to either factor alone (Framingham Heart Study data).",
        "action": "Practice 5-minute slow breathing at 6 breaths per minute, once daily — this activates the baroreflex and reduces systolic BP 4–6 mmHg (meta-analysis evidence).",
        "action_timeline": "Blood pressure reduction from breathwork typically measurable within 4 weeks of daily practice.",
    },
    {
        "id": "effort_warning",
        "conditions": lambda p: p["exertion_response"] == "strained",
        "severity": 0.70,
        "label": "Exertional intolerance signal",
        "cause": "Noticing ordinary physical effort (stairs, walking, standing) suggests reduced cardiac reserve or deconditioning — the heart is working harder than it should for basic activities.",
        "projection": "Exertional symptoms that worsen over months may indicate progressive cardiovascular or pulmonary limitation.",
        "action": "Start with gentle, graded movement — 10-minute flat walks — and track whether effort tolerance improves or worsens over 2 weeks.",
        "action_timeline": "If effort tolerance does not improve with gentle activity, medical evaluation is warranted.",
    },
    {
        "id": "inflammatory_load",
        "conditions": lambda p: p["diet"] == "frequent" and p["activity_level"] == "low" and (p.get("fasting_glucose") is not None and p["fasting_glucose"] >= 100),
        "severity": 0.68,
        "label": "Inflammatory metabolic load",
        "cause": "Convenience diet combined with inactivity and elevated glucose creates chronic low-grade inflammation — a direct driver of arterial plaque formation.",
        "projection": "This inflammatory pattern is the leading modifiable pathway to type 2 diabetes and coronary artery disease.",
        "action": "Reduce refined carbohydrate intake by replacing one processed meal daily with vegetables, legumes, and lean protein.",
        "action_timeline": "Fasting glucose and triglycerides typically respond to dietary changes within 4–8 weeks.",
    },
    {
        "id": "lipid_burden",
        "conditions": lambda p: p.get("cholesterol") is not None and p["cholesterol"] >= 240 and p["diet"] == "frequent",
        "severity": 0.62,
        "label": "Dietary lipid burden",
        "cause": "High total cholesterol combined with a convenience-food pattern suggests dietary saturated fat and trans fat are driving LDL elevation.",
        "projection": "Each 1% increase in calories from saturated fat raises LDL ~2 mg/dL. Sustained high LDL accelerates coronary plaque buildup.",
        "action": "Replace one fried or processed meal daily with baked, steamed, or raw preparation.",
        "action_timeline": "LDL reduction of 5–15 mg/dL is realistic within 6–8 weeks of consistent saturated fat reduction.",
    },
    {
        "id": "smoking_compound",
        "conditions": lambda p: p["smoking"] == "yes" and (p.get("systolic_bp") is not None and p["systolic_bp"] >= 130),
        "severity": 0.88,
        "label": "Smoking + hypertension compound",
        "cause": "Smoking damages endothelial lining while hypertension increases wall stress — together they dramatically accelerate atherosclerosis.",
        "projection": "Smokers with hypertension have 4–6x higher cardiovascular event risk than non-smokers with normal BP (WHO Global Burden of Disease).",
        "action": "Smoking cessation is the single highest-impact action available. Even reduction improves endothelial function within weeks.",
        "action_timeline": "Cardiovascular risk begins declining within 24 hours of cessation and drops 50% within 1 year.",
    },
    {
        "id": "diabetic_sedentary",
        "conditions": lambda p: p["diabetes"] == "yes" and p["activity_level"] == "low",
        "severity": 0.75,
        "label": "Diabetic sedentary pattern",
        "cause": "Diabetes combined with inactivity accelerates microvascular damage, neuropathy, and cardiovascular complications.",
        "projection": "Active diabetics have 35–45% lower cardiovascular mortality than sedentary diabetics (Look AHEAD trial data).",
        "action": "Aim for 150 minutes of moderate activity per week — even 10-minute sessions count toward this total.",
        "action_timeline": "Insulin sensitivity improvements detectable within 1–2 weeks of regular activity.",
    },
    {
        "id": "sleep_bp",
        "conditions": lambda p: p["sleep_quality"] == "poor" and p.get("systolic_bp") is not None and p["systolic_bp"] >= 130,
        "severity": 0.60,
        "label": "Sleep-hypertension connection",
        "cause": "Poor sleep quality disrupts nocturnal blood pressure dipping — a protective mechanism where BP naturally falls during deep sleep.",
        "projection": "Non-dipping blood pressure patterns are associated with 20–30% higher cardiovascular event risk (MAPEC study).",
        "action": "Prioritize sleep hygiene: consistent timing, cool dark room, no caffeine after 2 PM.",
        "action_timeline": "Blood pressure dipping pattern typically improves within 2–4 weeks of improved sleep consistency.",
    },
    {
        "id": "age_family",
        "conditions": lambda p: p["age"] >= 50 and p["family_history"] == "yes",
        "severity": 0.50,
        "label": "Age + family history convergence",
        "cause": "After 50, genetic predisposition from family history becomes increasingly impactful as age-related vascular changes compound inherited risk.",
        "projection": "Family history of premature CVD combined with age >50 approximately doubles baseline population risk.",
        "action": "Ensure annual lipid panel and blood pressure monitoring — early detection of changes allows intervention before events.",
        "action_timeline": "Ongoing — prevention is the primary strategy when family history is present.",
    },
]


class HeartRiskEngine:
    def __init__(self) -> None:
        self.training_frame: pd.DataFrame | None = None
        self.feature_columns: list[str] = []
        self.numeric_medians: dict[str, float] = {
            "systolic_bp": 126.0, "diastolic_bp": 78.0, "cholesterol": 196.0,
            "hdl_cholesterol": 52.0, "ldl_cholesterol": 115.0,
            "fasting_glucose": 92.0, "triglycerides": 130.0,
        }
        self.base_models: dict[str, object] = {}
        self.meta_model = LogisticRegression(max_iter=400, solver="liblinear", random_state=RANDOM_SEED)
        self.personalization_model = LogisticRegression(max_iter=400, solver="liblinear", random_state=RANDOM_SEED)
        self.validation_auc: float | None = None

    def fit(self) -> None:
        if self.base_models:
            return

        frame = generate_synthetic_dataset(TRAINING_ROWS, seed=RANDOM_SEED)
        self.training_frame = frame
        for col in ["systolic_bp", "diastolic_bp", "cholesterol", "hdl_cholesterol", "ldl_cholesterol", "fasting_glucose", "triglycerides"]:
            if col in frame.columns:
                self.numeric_medians[col] = float(frame[col].median(skipna=True))

        features = self._prepare_features(frame)
        target = frame["event"].astype(int)
        X_train, X_valid, y_train, y_valid = train_test_split(
            features, target, test_size=0.22, stratify=target, random_state=RANDOM_SEED,
        )

        self.base_models = {
            "xgb": XGBClassifier(n_estimators=72, max_depth=3, learning_rate=0.08, subsample=0.9, colsample_bytree=0.82, reg_lambda=1.0, eval_metric="logloss", random_state=RANDOM_SEED, n_jobs=1),
            "lgbm": LGBMClassifier(n_estimators=72, learning_rate=0.08, num_leaves=24, subsample=0.9, colsample_bytree=0.82, random_state=RANDOM_SEED, verbose=-1, n_jobs=1),
            "rf": RandomForestClassifier(n_estimators=96, max_depth=7, min_samples_leaf=2, random_state=RANDOM_SEED, n_jobs=1),
            "cat": CatBoostClassifier(iterations=70, learning_rate=0.08, depth=4, verbose=False, random_seed=RANDOM_SEED),
            "lr": LogisticRegression(max_iter=400, solver="liblinear", random_state=RANDOM_SEED),
        }
        for model in self.base_models.values():
            model.fit(X_train, y_train)

        stacked_train = self._stack_probabilities(X_train)
        stacked_valid = self._stack_probabilities(X_valid)
        self.meta_model.fit(stacked_train, y_train)
        self.personalization_model.fit(X_train, y_train)

        ensemble_valid = self.meta_model.predict_proba(stacked_valid)[:, 1]
        personalization_valid = self.personalization_model.predict_proba(X_valid)[:, 1]
        final_valid = 0.86 * ensemble_valid + 0.14 * personalization_valid
        self.validation_auc = float(roc_auc_score(y_valid, final_valid))

    def _prepare_features(self, frame: pd.DataFrame) -> pd.DataFrame:
        base = frame[INPUT_FIELDS].copy()
        for col in ["age", "systolic_bp", "diastolic_bp", "cholesterol", "hdl_cholesterol", "ldl_cholesterol", "fasting_glucose", "triglycerides"]:
            if col in base.columns:
                base[col] = pd.to_numeric(base[col], errors="coerce")

        base["bp_known"] = np.where(base["systolic_bp"].notna(), "known", "unknown")
        base["cholesterol_known"] = np.where(base["cholesterol"].notna(), "known", "unknown")
        base["glucose_known"] = np.where(base["fasting_glucose"].notna(), "known", "unknown")

        for col in ["systolic_bp", "diastolic_bp", "cholesterol", "hdl_cholesterol", "ldl_cholesterol", "fasting_glucose", "triglycerides"]:
            if col in base.columns:
                base[col] = base[col].fillna(self.numeric_medians.get(col, 0))
                base[col] = base[col].astype(float)

        base["age"] = base["age"].astype(float)

        encoded = pd.get_dummies(base, columns=CATEGORICAL_FIELDS, dtype=float)
        if not self.feature_columns:
            self.feature_columns = encoded.columns.tolist()
            return encoded
        return encoded.reindex(columns=self.feature_columns, fill_value=0.0)

    def _stack_probabilities(self, features: pd.DataFrame) -> np.ndarray:
        return np.column_stack(
            [self.base_models[name].predict_proba(features)[:, 1] for name in ("xgb", "lgbm", "rf", "cat", "lr")]
        )

    def _rule_score(self, payload: dict) -> int:
        score = 0
        if payload["smoking"] == "yes":
            score += 30
        if payload["family_history"] == "yes":
            score += 12
        if payload["diabetes"] == "yes":
            score += 22

        sbp = payload.get("systolic_bp")
        if sbp is not None:
            if sbp >= 180: score += 35
            elif sbp >= 150: score += 28
            elif sbp >= 140: score += 22
            elif sbp >= 130: score += 14
            elif sbp >= 125: score += 10

        dbp = payload.get("diastolic_bp")
        if dbp is not None:
            if dbp >= 120: score += 15
            elif dbp >= 90: score += 10
            elif dbp >= 80: score += 4

        chol = payload.get("cholesterol")
        if chol is not None and chol >= 260: score += 24
        elif chol is not None and chol >= 220: score += 14

        hdl = payload.get("hdl_cholesterol")
        if hdl is not None and hdl < 40: score += 15
        elif hdl is not None and hdl < 50: score += 6

        ldl = payload.get("ldl_cholesterol")
        if ldl is not None and ldl >= 190: score += 18
        elif ldl is not None and ldl >= 160: score += 12
        elif ldl is not None and ldl >= 130: score += 5

        glucose = payload.get("fasting_glucose")
        if glucose is not None and glucose >= 126: score += 16
        elif glucose is not None and glucose >= 100: score += 8

        trig = payload.get("triglycerides")
        if trig is not None and trig >= 200: score += 10
        elif trig is not None and trig >= 150: score += 4

        return min(score, 100)

    def _life_score(self, payload: dict) -> int:
        return int(
            LIFESTYLE_POINTS["activity_level"][payload["activity_level"]]
            + LIFESTYLE_POINTS["sitting"][payload["sitting"]]
            + LIFESTYLE_POINTS["stress"][payload["stress"]]
            + LIFESTYLE_POINTS["sleep_quality"][payload["sleep_quality"]]
            + LIFESTYLE_POINTS["diet"][payload["diet"]]
            + LIFESTYLE_POINTS["exertion_response"][payload["exertion_response"]]
        )

    def _risk_level(self, risk_score: int) -> str:
        for upper_bound, label in RISK_BANDS:
            if risk_score < upper_bound:
                return label
        return "Very High"

    def _confidence(self, payload: dict) -> int:
        return compute_confidence_score(payload)

    def _heart_age(self, age: int, risk_score: int) -> int:
        return max(age, int(round(age + (risk_score - 24) * 0.55)))

    def _ml_score(self, payload: dict) -> tuple[float, pd.DataFrame]:
        feature_frame = self._prepare_features(pd.DataFrame([payload]))
        stacked = self._stack_probabilities(feature_frame)
        return float(self.meta_model.predict_proba(stacked)[0][1] * 100), feature_frame

    def _personalization_score(self, feature_frame: pd.DataFrame) -> float:
        return float(self.personalization_model.predict_proba(feature_frame)[0][1] * 100)

    def _final_score(self, payload: dict) -> tuple[int, float, int, int, float, pd.DataFrame]:
        ml_score, feature_frame = self._ml_score(payload)
        rule_score = self._rule_score(payload)
        life_score = self._life_score(payload)
        personalization_score = self._personalization_score(feature_frame)

        # Dynamically weight based on clinical data availability
        confidence = self._confidence(payload)
        if confidence >= 70:  # Rich clinical data
            w_ml, w_rule, w_life, w_pers = 0.42, 0.30, 0.16, 0.12
        elif confidence >= 45:  # Some clinical data
            w_ml, w_rule, w_life, w_pers = 0.38, 0.28, 0.20, 0.14
        else:  # Lifestyle only
            w_ml, w_rule, w_life, w_pers = 0.34, 0.22, 0.28, 0.16

        final_score = int(round(np.clip(w_ml * ml_score + w_rule * rule_score + w_life * life_score + w_pers * personalization_score, 0, 100)))
        return final_score, ml_score, rule_score, life_score, personalization_score, feature_frame

    def _detect_patterns(self, payload: dict) -> list[dict]:
        """Detect cross-signal patterns from the payload."""
        detected = []
        for pattern in CROSS_SIGNAL_PATTERNS:
            try:
                if pattern["conditions"](payload):
                    detected.append({
                        "id": pattern["id"],
                        "severity": pattern["severity"],
                        "label": pattern["label"],
                        "cause": pattern["cause"],
                        "projection": pattern["projection"],
                        "action": pattern["action"],
                        "action_timeline": pattern["action_timeline"],
                    })
            except (KeyError, TypeError):
                continue
        detected.sort(key=lambda x: x["severity"], reverse=True)
        return detected

    def _identify_issues(self, payload: dict, patterns: list[dict]) -> dict:
        """Identify the primary and secondary issues from patterns and individual signals."""
        all_factors = []

        # Add pattern-derived issues
        for p in patterns:
            all_factors.append({
                "source": "pattern",
                "id": p["id"],
                "label": p["label"],
                "severity": p["severity"],
                "cause": p["cause"],
                "projection": p["projection"],
                "action": p["action"],
                "action_timeline": p["action_timeline"],
            })

        # Add individual signal issues not covered by patterns
        pattern_ids = {p["id"] for p in patterns}
        age = payload.get("age", 30)
        name = payload.get("name") or "you"

        if payload["smoking"] == "yes" and "smoking_compound" not in pattern_ids:
            all_factors.append({
                "source": "individual", "id": "smoking", "label": "Active smoking",
                "severity": 0.85, "cause": "Smoking directly damages arterial walls and promotes clot formation.",
                "projection": "Smoking is the leading modifiable risk factor for cardiovascular disease worldwide (WHO).",
                "action": "Any reduction in smoking improves endothelial function. Cessation support programs double quit success rates.",
                "action_timeline": "Heart attack risk drops 50% within 1 year of quitting.",
            })

        if payload["diabetes"] == "yes" and "diabetic_sedentary" not in pattern_ids:
            all_factors.append({
                "source": "individual", "id": "diabetes_alone", "label": "Diabetes",
                "severity": 0.70, "cause": "Diabetes causes chronic vascular damage through glycation and inflammation.",
                "projection": "Cardiovascular disease is the leading cause of death in diabetics — tight glucose control reduces this risk.",
                "action": "Monitor fasting glucose regularly and discuss HbA1c targets with your doctor.",
                "action_timeline": "Consistent glucose management shows cardiovascular benefit within 6–12 months.",
            })

        sbp = payload.get("systolic_bp")
        if sbp is not None and sbp >= 140 and "vascular_stress" not in pattern_ids and "smoking_compound" not in pattern_ids and "sleep_bp" not in pattern_ids:
            all_factors.append({
                "source": "individual", "id": "hypertension", "label": f"Hypertension (BP {sbp} mmHg)",
                "severity": 0.72, "cause": f"A systolic reading of {sbp} mmHg means sustained high pressure on arterial walls.",
                "projection": "Uncontrolled hypertension increases stroke risk 4x and heart failure risk 2x (Framingham data).",
                "action": "Reduce sodium intake to <2300mg/day and add 30 minutes of moderate activity most days.",
                "action_timeline": "Dietary sodium reduction can lower systolic BP by 5–8 mmHg within 2–4 weeks.",
            })

        if not all_factors:
            # Nothing significant detected
            all_factors.append({
                "source": "default", "id": "baseline_maintenance", "label": "Standard cardiovascular maintenance",
                "severity": 0.10, "cause": f"At age {age}, maintaining current healthy patterns is the primary goal.",
                "projection": "Continued healthy lifestyle choices maintain low cardiovascular risk over time.",
                "action": "Continue current habits and schedule a preventive cardiovascular check annually.",
                "action_timeline": "Ongoing protective benefit from sustained healthy patterns.",
            })

        all_factors.sort(key=lambda x: x["severity"], reverse=True)
        primary = all_factors[0]
        secondary = all_factors[1] if len(all_factors) > 1 else None

        return {"primary": primary, "secondary": secondary, "all_factors": all_factors[:5]}

    def _generate_narrative(self, payload: dict, issues: dict, clinical_severity: float, confidence: int) -> dict:
        """Generate personalized narrative text based on identified issues."""
        name = payload.get("name") or "You"
        age = payload.get("age", 30)
        primary = issues["primary"]
        secondary = issues.get("secondary")

        severity = primary["severity"]
        if severity < 0.3:
            tone = "reassuring"
        elif severity < 0.55:
            tone = "advisory"
        elif severity < 0.75:
            tone = "concerned"
        else:
            tone = "urgent"

        # Build condition explanation
        condition_parts = [primary["cause"]]
        if secondary:
            condition_parts.append(f"This is compounded by {secondary['label'].lower()}: {secondary['cause'].lower()}")

        condition_text = " ".join(condition_parts)

        # Projection
        projection_text = primary["projection"]
        if secondary:
            projection_text += f" Additionally, {secondary['projection'].lower()}"

        # Confidence statement
        if confidence >= 70:
            confidence_text = f"This assessment is based on both your lifestyle answers and clinical lab values, giving it a confidence level of {confidence}%."
        elif confidence >= 45:
            confidence_text = f"This assessment uses partial clinical data alongside lifestyle information (confidence: {confidence}%). More lab values would sharpen the picture."
        else:
            confidence_text = f"This assessment is based on lifestyle signals alone (confidence: {confidence}%). Providing lab values from a blood test would significantly improve accuracy."

        return {
            "tone": tone,
            "condition": condition_text,
            "projection": projection_text,
            "confidence_text": confidence_text,
        }

    def _feature_strengths(self, payload: dict) -> list[SignalWeight]:
        strengths: list[SignalWeight] = []

        def add(feature: str, score: float, detail: str) -> None:
            headline_map = {
                "age": "Age factor", "systolic_bp": "Blood pressure", "diastolic_bp": "Diastolic pressure",
                "cholesterol": "Total cholesterol", "hdl_cholesterol": "HDL cholesterol",
                "ldl_cholesterol": "LDL cholesterol", "fasting_glucose": "Blood glucose",
                "triglycerides": "Triglycerides", "smoking": "Smoking",
                "diabetes": "Diabetes", "family_history": "Family history",
                "activity_level": "Physical activity", "sitting": "Sedentary time",
                "stress": "Chronic stress", "sleep_quality": "Sleep quality",
                "diet": "Dietary pattern", "exertion_response": "Exertion tolerance",
            }
            strengths.append(SignalWeight(headline_map.get(feature, feature), detail, score))

        age = payload.get("age", 30)
        if age >= 55:
            add("age", 0.62, f"At age {age}, cardiovascular risk naturally increases as arterial elasticity declines. Prevention becomes more urgent, not less.")
        elif age >= 40:
            add("age", 0.28, f"Age {age} marks the period where subclinical vascular changes begin accelerating.")

        if payload["smoking"] == "yes":
            add("smoking", 0.95, "Smoking is the strongest modifiable cardiovascular risk factor — it damages endothelial cells and promotes thrombosis.")
        if payload["diabetes"] == "yes":
            add("diabetes", 0.8, "Diabetes changes the cardiovascular risk equation fundamentally through chronic glycemic damage to blood vessels.")
        if payload["family_history"] == "yes":
            add("family_history", 0.44, "Family history of premature heart disease raises baseline risk independently of lifestyle factors.")

        sbp = payload.get("systolic_bp")
        if sbp is not None and sbp >= 145:
            add("systolic_bp", 0.88, f"Systolic BP of {sbp} mmHg is in the Stage 2 Hypertension range (AHA). This is a strong pressure signal requiring attention.")
        elif sbp is not None and sbp >= 130:
            add("systolic_bp", 0.48, f"Systolic BP of {sbp} mmHg indicates Stage 1 Hypertension (AHA). Lifestyle modification is recommended.")

        dbp = payload.get("diastolic_bp")
        if dbp is not None and dbp >= 90:
            add("diastolic_bp", 0.55, f"Diastolic BP of {dbp} mmHg exceeds the 90 mmHg threshold, indicating hypertension (AHA).")

        chol = payload.get("cholesterol")
        if chol is not None and chol >= 240:
            add("cholesterol", 0.66, f"Total cholesterol of {chol} mg/dL is classified as high (ATP-III). This drives atherosclerotic plaque formation.")
        elif chol is not None and chol >= 200:
            add("cholesterol", 0.34, f"Total cholesterol of {chol} mg/dL is borderline high (ATP-III).")

        hdl = payload.get("hdl_cholesterol")
        if hdl is not None and hdl < 40:
            add("hdl_cholesterol", 0.60, f"HDL of {hdl} mg/dL is low — this is an independent major risk factor (AHA). HDL below 40 removes a key protective mechanism.")

        ldl = payload.get("ldl_cholesterol")
        if ldl is not None and ldl >= 160:
            add("ldl_cholesterol", 0.65, f"LDL of {ldl} mg/dL is high (ATP-III). LDL is the primary driver of arterial plaque buildup.")

        glucose = payload.get("fasting_glucose")
        if glucose is not None and glucose >= 126:
            add("fasting_glucose", 0.70, f"Fasting glucose of {glucose} mg/dL is in the diabetes range (ADA). This significantly elevates cardiovascular risk.")
        elif glucose is not None and glucose >= 100:
            add("fasting_glucose", 0.40, f"Fasting glucose of {glucose} mg/dL indicates prediabetes (ADA). This is reversible with lifestyle changes.")

        trig = payload.get("triglycerides")
        if trig is not None and trig >= 200:
            add("triglycerides", 0.50, f"Triglycerides of {trig} mg/dL are high (AHA). This increases cardiovascular and pancreatitis risk.")

        if payload["activity_level"] == "low":
            add("activity_level", 0.72, "Physical inactivity is the 4th leading risk factor for mortality globally (WHO). Your activity level is below recommended minimums.")
        if payload["sitting"] == "high":
            add("sitting", 0.56, "Prolonged sitting increases all-cause mortality independent of exercise — the body needs regular movement interruptions.")
        if payload["stress"] == "high":
            add("stress", 0.58, "Chronic stress elevates cortisol and catecholamines, raising blood pressure and heart rate around the clock.")
        if payload["sleep_quality"] == "poor":
            add("sleep_quality", 0.60, "Poor sleep quality impairs overnight cardiovascular recovery and is linked to hypertension and metabolic dysfunction.")
        if payload["diet"] == "frequent":
            add("diet", 0.47, "A convenience-food pattern typically delivers excess sodium, trans fats, and refined carbohydrates — all direct cardiovascular stressors.")
        if payload["exertion_response"] == "strained":
            add("exertion_response", 0.74, "Feeling strained during ordinary effort is a lived-in signal of reduced cardiac reserve or deconditioning.")
        elif payload["exertion_response"] == "noticeable":
            add("exertion_response", 0.34, "Noticing effort more than expected suggests the cardiovascular system is working harder than optimal for basic activities.")

        if not strengths:
            add("activity_level", 0.12, "No dominant risk factor detected — this is a protective baseline worth maintaining.")

        return sorted(strengths, key=lambda item: item.score, reverse=True)

    def _derived_signals(self, payload: dict) -> list[dict]:
        return self._detect_patterns(payload)

    def _protective_factors(self, payload: dict) -> list[str]:
        factors = []
        if payload["smoking"] == "no":
            factors.append("Not smoking is protecting your arteries from endothelial damage — this is one of the strongest protective factors.")
        if payload["activity_level"] == "high":
            factors.append("Regular physical activity strengthens cardiac output and improves arterial flexibility.")
        if payload["sleep_quality"] == "good":
            factors.append("Good sleep quality allows proper overnight cardiovascular recovery and blood pressure regulation.")
        if payload["diet"] == "rare":
            factors.append("A home-cooked dietary pattern typically delivers less sodium and better nutrient balance for heart health.")
        if payload["exertion_response"] == "easy":
            factors.append("Handling physical effort easily indicates good cardiac reserve — a reassuring cardiovascular sign.")
        hdl = payload.get("hdl_cholesterol")
        if hdl is not None and hdl >= 60:
            factors.append(f"HDL of {hdl} mg/dL is in the protective range — this actively helps clear cholesterol from arteries.")
        return factors[:4]

    def _suggestions(self, payload: dict, level: str, issues: dict) -> list[dict]:
        """Generate targeted suggestions based on identified issues, not generic tips."""
        suggestions = []
        primary = issues.get("primary", {})

        if primary:
            suggestions.append({
                "tag": "Primary Action",
                "title": primary.get("action", "Consult a healthcare provider"),
                "body": f"This targets your primary finding: {primary.get('label', '')}. {primary.get('action_timeline', '')}",
            })

        secondary = issues.get("secondary")
        if secondary and len(suggestions) < 2:
            suggestions.append({
                "tag": "Supporting Action",
                "title": secondary.get("action", "Monitor and follow up"),
                "body": f"This addresses: {secondary.get('label', '')}. {secondary.get('action_timeline', '')}",
            })

        suggestions.append({"tag": "Medical", "title": "Know your next medical step", "body": DOCTOR_GUIDANCE[level]})
        return suggestions[:3]

    def _daily_story(self, payload: dict, patterns: list[dict]) -> list[str]:
        story = []
        name = payload.get("name") or "Your"

        for p in patterns[:3]:
            story.append(f"{p['label']}: {p['cause']}")

        if not story:
            if payload["activity_level"] != "low" and payload["stress"] != "high":
                story.append(f"{name}'s daily rhythm shows more stability than strain — the current pattern is protective and worth maintaining.")
            else:
                story.append(f"{name}'s routine is placing some pressure on cardiovascular recovery, but this is addressable with targeted changes.")

        return story[:4]

    def _possible_body_signals(self, payload: dict) -> list[str]:
        signals = []
        if payload["sitting"] == "high":
            signals.append("Stiffness, heaviness, or circulatory sluggishness after prolonged sitting — the body's response to sustained venous pooling.")
        if payload["stress"] == "high":
            signals.append("Persistent tension, racing thoughts, or fatigue that doesn't resolve with rest — signs of chronic sympathetic activation.")
        if payload["sleep_quality"] == "poor":
            signals.append("Waking unrefreshed, daytime cognitive fog, and reduced physical stamina — markers of incomplete overnight recovery.")
        if payload["exertion_response"] == "strained":
            signals.append("Breathlessness, chest heaviness, or unusual fatigue during routine activity like climbing stairs — reduced cardiac reserve signals.")
        elif payload["exertion_response"] == "noticeable":
            signals.append("Increased awareness of effort during activities that used to feel effortless — early deconditioning signals.")
        sbp = payload.get("systolic_bp")
        if sbp is not None and sbp >= 140:
            signals.append(f"With BP at {sbp} mmHg: headaches, visual changes, or pressure sensations during physical effort or stress.")
        glucose = payload.get("fasting_glucose")
        if glucose is not None and glucose >= 100:
            signals.append(f"With glucose at {glucose} mg/dL: increased thirst, frequent urination, or energy crashes after meals — early glycemic dysregulation.")
        if not signals:
            signals.append("No concerning body signals detected from your input pattern — a positive finding worth protecting.")
        return signals[:5]

    def _food_guidance(self, payload: dict) -> dict:
        lean_into = [
            "Whole foods: vegetables, legumes, whole grains, nuts, fish — the Mediterranean pattern consistently shows cardiovascular benefit.",
            "Potassium-rich foods (bananas, sweet potatoes, spinach) — potassium helps counterbalance sodium's effect on blood pressure.",
            "Consistent meal timing — irregular eating patterns disrupt glucose regulation and lipid metabolism.",
        ]
        ease_off = [
            "Processed foods high in sodium (>600mg per serving) — excess sodium is the primary dietary driver of hypertension.",
            "Trans fats and deep-fried foods — these directly raise LDL and lower HDL cholesterol.",
            "Added sugars and refined carbohydrates — these drive triglyceride elevation and insulin resistance.",
        ]

        sbp = payload.get("systolic_bp")
        if sbp is not None and sbp >= 130:
            lean_into.insert(0, f"With BP at {sbp} mmHg: prioritize the DASH diet pattern — clinically proven to reduce systolic BP by 8–14 mmHg.")
        if payload["exertion_response"] == "strained":
            lean_into.insert(0, "Lighter, more frequent meals that avoid post-meal sluggishness — heavy meals divert blood flow from muscles to digestion.")

        glucose = payload.get("fasting_glucose")
        if glucose is not None and glucose >= 100:
            ease_off.insert(0, f"With glucose at {glucose} mg/dL: minimize refined carbs and sugary drinks — these cause glucose spikes that damage blood vessel lining over time.")

        chol = payload.get("cholesterol")
        if chol is not None and chol >= 240:
            ease_off.insert(0, f"With cholesterol at {chol} mg/dL: reduce saturated fat intake — each 1% reduction in saturated fat calories lowers LDL by ~2 mg/dL.")

        return {"lean_into": lean_into[:5], "ease_off": ease_off[:5]}

    def _care_flags(self, payload: dict, level: str) -> list[str]:
        flags = []
        if level in {"High", "Very High"}:
            flags.append("This risk level warrants a medical consultation — not for alarm, but because early intervention has the highest return at this stage.")
        sbp = payload.get("systolic_bp")
        if sbp is not None and sbp >= 145:
            flags.append(f"Blood pressure of {sbp} mmHg crosses into territory where medication discussion with a doctor is standard practice (AHA guidelines).")
        if payload["diabetes"] == "yes":
            flags.append("Diabetes fundamentally changes cardiovascular risk management — structured prevention is essential, not optional.")
        if payload["exertion_response"] == "strained":
            flags.append("Exertional strain during routine activities should be evaluated medically — it may indicate cardiac or pulmonary limitation.")
        if payload["smoking"] == "yes":
            flags.append("Smoking is the single most impactful modifiable risk factor — cessation at any age reduces cardiovascular risk.")
        glucose = payload.get("fasting_glucose")
        if glucose is not None and glucose >= 126:
            flags.append(f"Fasting glucose of {glucose} mg/dL is in the diabetes diagnostic range (≥126 mg/dL, ADA) — this needs medical confirmation and management.")
        if not flags:
            flags.append("No urgent flags detected — maintain your current patterns and schedule regular preventive check-ups.")
        return flags[:5]

    def _symptom_watch(self, payload: dict) -> list[str]:
        watch = []
        if payload["exertion_response"] in {"strained", "noticeable"}:
            watch.append("Track whether stairs, brisk walking, or standing up keeps feeling heavier — worsening effort tolerance is a key warning signal.")
        if payload["stress"] == "high":
            watch.append("Monitor for chest tightness during stress episodes — stress cardiomyopathy can mimic cardiac events.")
        sbp = payload.get("systolic_bp")
        if sbp is not None and sbp >= 140:
            watch.append(f"With BP at {sbp} mmHg: watch for morning headaches, vision changes, or nosebleeds — these may indicate sustained hypertensive damage.")
        if payload["sleep_quality"] == "poor":
            watch.append("Pay attention to morning blood pressure — poor sleep often causes elevated morning readings (non-dipping pattern).")
        if not watch:
            watch.append("Continue noticing how your body responds to physical effort — catching changes early is the goal of prevention.")
        return watch[:4]

    def _habit_focus(self, payload: dict) -> list[str]:
        focus = []
        if payload["activity_level"] == "low":
            focus.append("Movement is the single most protective lifestyle factor — even 150 minutes/week of moderate activity reduces CVD risk by 30% (WHO).")
        if payload["diet"] == "frequent":
            focus.append("Dietary pattern is driving metabolic load — simplification (not perfection) is the realistic goal.")
        if payload["stress"] == "high":
            focus.append("The nervous system needs a daily decompression point — without it, cortisol stays elevated and blood pressure doesn't recover.")
        if payload["sleep_quality"] == "poor":
            focus.append("Sleep is when cardiovascular recovery happens — protecting sleep quality has disproportionate health returns.")
        if payload["sitting"] == "high":
            focus.append("Sedentary time is an independent risk factor — even exercisers who sit for 8+ hours daily have elevated risk (Ekelund, Lancet 2016).")
        return focus[:4] or ["Your current habits are protective — the focus should be on sustaining them long-term."]

    def _doctor_visit_script(self, payload: dict, level: str, issues: dict) -> list[str]:
        name = payload.get("name") or "I"
        primary = issues.get("primary", {})
        script = [
            f"{name} used a cardiovascular risk assessment tool and would like to review the findings with you.",
            f"The primary area identified was: {primary.get('label', 'general cardiovascular health')}.",
        ]
        if level in {"High", "Very High"}:
            script.append("The assessment indicated elevated risk that warrants prompt evaluation rather than routine follow-up.")
        sbp = payload.get("systolic_bp")
        if sbp is not None and sbp >= 130:
            script.append(f"Blood pressure was recorded as {sbp} mmHg — please verify and discuss management options.")
        glucose = payload.get("fasting_glucose")
        if glucose is not None and glucose >= 100:
            script.append(f"Fasting glucose was {glucose} mg/dL — please consider confirmatory testing.")
        if payload["exertion_response"] in {"strained", "noticeable"}:
            script.append("There may be exertional symptoms during routine activity — evaluation for cardiac reserve would be valuable.")
        return script[:5]

    def _profile_snapshot(self, payload: dict, risk_level: str) -> dict:
        return {
            "energy_pattern": (
                "likely stretched and inconsistent"
                if payload["sleep_quality"] == "poor" or payload["stress"] == "high"
                else "fairly steady"
            ),
            "movement_profile": (
                "under-moved" if payload["activity_level"] == "low"
                else "decently active" if payload["activity_level"] == "medium" else "protective"
            ),
            "food_profile": (
                "convenience-driven" if payload["diet"] == "frequent"
                else "mixed" if payload["diet"] == "moderate" else "mostly supportive"
            ),
            "watch_level": risk_level.lower(),
        }

    def _heart_health_score(self, payload: dict, risk_score: int) -> int:
        score = 100 - int(round(risk_score * 1.45))
        if payload["activity_level"] == "high": score += 6
        if payload["sleep_quality"] == "good": score += 4
        if payload["diet"] == "rare": score += 4
        if payload["smoking"] == "yes": score -= 8
        if payload["diabetes"] == "yes": score -= 7
        hdl = payload.get("hdl_cholesterol")
        if hdl is not None and hdl >= 60: score += 5
        elif hdl is not None and hdl < 40: score -= 6
        return int(np.clip(score, 18, 96))

    def _attack_scenario(self, payload: dict, risk_score: int, refinement_points: int = 0) -> dict:
        symptom_weight = refinement_points * 1.45
        if payload["exertion_response"] == "strained": symptom_weight += 4.0
        elif payload["exertion_response"] == "noticeable": symptom_weight += 1.8
        if payload["smoking"] == "yes": symptom_weight += 3.4
        if payload["diabetes"] == "yes": symptom_weight += 3.6
        sbp = payload.get("systolic_bp")
        if sbp is not None and sbp >= 145: symptom_weight += 4.0
        chol = payload.get("cholesterol")
        if chol is not None and chol >= 240: symptom_weight += 2.8
        hdl = payload.get("hdl_cholesterol")
        if hdl is not None and hdl < 40: symptom_weight += 2.0
        glucose = payload.get("fasting_glucose")
        if glucose is not None and glucose >= 126: symptom_weight += 2.5

        six_month = float(np.clip(0.6 + risk_score * 0.12 + symptom_weight * 0.45, 0.5, 28.0))
        three_year = float(np.clip(4.0 + risk_score * 0.72 + symptom_weight * 1.2, 3.0, 68.0))
        label = "lower"
        if six_month >= 10 or three_year >= 28: label = "elevated"
        if six_month >= 16 or three_year >= 40: label = "high"

        return {
            "label": label,
            "six_month_percent": round(six_month, 1),
            "three_year_percent": round(three_year, 1),
            "summary": (
                "This is not a diagnosis, but the near-term scenario is serious enough to deserve prompt medical follow-through."
                if label in {"elevated", "high"}
                else "This looks more like a prevention opportunity than an immediate danger — but prevention is most valuable when acted on early."
            ),
        }

    def _followup_questions(self, payload: dict, risk_level: str) -> list[dict]:
        prompts = []
        prompts.append({
            "id": "chest_tightness",
            "question": "Do you ever feel tightness, pressure, or heaviness in the chest during physical effort or stress?",
            "why": "Chest symptoms during exertion may indicate coronary insufficiency — distinguishing exertional from non-exertional symptoms changes the clinical picture.",
        })
        prompts.append({
            "id": "breathless_easy",
            "question": "Do you get unusually breathless doing things that should normally feel easy?",
            "why": "Disproportionate breathlessness suggests reduced cardiac output or pulmonary limitation beyond simple deconditioning.",
        })
        if payload["sleep_quality"] == "poor" or payload["stress"] == "high":
            prompts.append({
                "id": "palpitations",
                "question": "Have you noticed a racing heartbeat, skipped beats, or pounding that keeps catching your attention?",
                "why": "Palpitations with stress/sleep disruption may indicate autonomic dysregulation or arrhythmia — this shapes treatment priority.",
            })
        if payload["sitting"] == "high" or risk_level in {"High", "Very High"}:
            prompts.append({
                "id": "ankle_swelling",
                "question": "Do your feet or ankles ever swell, especially by evening or after sitting?",
                "why": "Peripheral edema with sedentary behavior may indicate venous insufficiency or early heart failure — it changes the urgency level.",
            })
        prompts.append({
            "id": "dizzy_standing",
            "question": "Do you feel dizzy, weak, or lightheaded when standing up quickly?",
            "why": "Orthostatic symptoms may indicate blood pressure dysregulation or autonomic dysfunction — important for treatment decisions.",
        })
        return prompts[:4]

    def _visual_metrics(self, result: dict) -> list[dict]:
        attack = result["heart_attack_scenario"]["three_year_percent"]
        return [
            {"id": "heart_health", "label": "Heart health", "value": result["heart_health_score"], "tone": "mint"},
            {"id": "heart_load", "label": "Heart load", "value": result["risk_score"], "tone": "rose"},
            {"id": "attack_watch", "label": "Event risk", "value": int(round(attack)), "tone": "gold"},
            {"id": "recovery", "label": "Recovery quality", "value": max(12, 100 - result["breakdown"]["lifestyle_score"]), "tone": "blue"},
        ]

    def _refinement_delta(self, answers: dict[str, str]) -> tuple[int, list[str]]:
        score = 0
        confirmed = []
        rules = {
            "chest_tightness": (7, "Chest pressure confirmed — this elevates the urgency of cardiac evaluation."),
            "breathless_easy": (6, "Exertional breathlessness confirmed — suggests reduced cardiac or pulmonary reserve."),
            "palpitations": (4, "Palpitations confirmed — autonomic or rhythm assessment may be warranted."),
            "ankle_swelling": (5, "Peripheral edema confirmed — circulatory assessment should be prioritized."),
            "dizzy_standing": (4, "Orthostatic symptoms confirmed — blood pressure regulation needs evaluation."),
        }
        for key, answer in answers.items():
            if answer == "yes" and key in rules:
                delta, text = rules[key]
                score += delta
                confirmed.append(text)
        return score, confirmed

    def _refinement_delta_v2(self, answers: dict[str, object]) -> tuple[int, list[str]]:
        score = 0
        confirmed = []
        rules = {
            ("chest_tightness", "yes"): (7, "Chest pressure confirmed - this elevates the urgency of cardiac evaluation."),
            ("breathless_easy", "yes"): (6, "Exertional breathlessness confirmed - suggests reduced cardiac or pulmonary reserve."),
            ("palpitations", "yes"): (4, "Palpitations confirmed - autonomic or rhythm assessment may be warranted."),
            ("ankle_swelling", "yes"): (5, "Peripheral edema confirmed - circulatory assessment should be prioritized."),
            ("dizzy_standing", "yes"): (4, "Orthostatic symptoms confirmed - blood pressure regulation needs evaluation."),
            ("chest_pain_frequency", "stress_only"): (3, "Chest pressure appears during stress - worth separating stress load from cardiac triggers."),
            ("chest_pain_frequency", "stairs"): (6, "Chest pressure with stairs or brisk walking suggests a more important exertional symptom pattern."),
            ("chest_pain_frequency", "rest"): (9, "Chest pressure even at rest raises the need for prompt medical review."),
            ("chest_pain_duration", "few_minutes"): (2, "Chest discomfort lasting a few minutes adds weight to the symptom pattern."),
            ("chest_pain_duration", "ten_plus"): (4, "Symptoms lasting 10 minutes or more increase the urgency of clinical follow-up."),
            ("breathlessness_pattern", "stairs"): (3, "Breathlessness on stairs suggests reduced exertional reserve."),
            ("breathlessness_pattern", "flat_walk"): (6, "Breathlessness during a normal flat walk suggests more meaningful functional limitation."),
            ("breathlessness_pattern", "rest"): (8, "Breathlessness even at rest is a higher-risk symptom pattern."),
            ("recovery_after_effort", "two_to_ten"): (2, "Slower recovery after exertion points to reduced conditioning or recovery reserve."),
            ("recovery_after_effort", "over_ten"): (4, "Recovery taking more than 10 minutes suggests a stronger exertional burden."),
            ("palpitations_pattern", "occasional"): (1, "Occasional rhythm awareness was reported."),
            ("palpitations_pattern", "weekly"): (3, "Weekly palpitations suggest a recurring rhythm complaint worth tracking."),
            ("palpitations_pattern", "with_dizziness"): (5, "Palpitations with dizziness increase the need for rhythm-focused evaluation."),
            ("leg_swelling_pattern", "sometimes"): (2, "Intermittent evening swelling suggests some fluid retention or venous pooling."),
            ("leg_swelling_pattern", "most_days"): (5, "Frequent swelling suggests persistent fluid retention and raises follow-up priority."),
            ("snoring_pattern", "sometimes"): (1, "Snoring symptoms may be reducing sleep quality and overnight recovery."),
            ("snoring_pattern", "often"): (3, "Frequent snoring or gasping raises the possibility of sleep-disordered breathing."),
            ("salt_intake", "moderate"): (1, "Diet appears to include a moderate sodium load."),
            ("salt_intake", "high"): (3, "High sodium intake is likely adding pressure to blood pressure control."),
            ("fruit_veg_servings", "0_1"): (3, "Low fruit and vegetable intake reduces dietary cardiovascular protection."),
            ("fruit_veg_servings", "2_3"): (1, "Fruit and vegetable intake is only partly protective right now."),
            ("sugary_drinks", "few_weekly"): (1, "Sugary drinks show up often enough to add metabolic load."),
            ("sugary_drinks", "daily"): (3, "Daily sugary drinks likely add a meaningful glucose and triglyceride burden."),
            ("cigarettes_per_day", "1_5"): (2, "Daily smoking exposure is present even at the lower range."),
            ("cigarettes_per_day", "6_10"): (4, "Daily smoking volume is high enough to steepen cardiovascular risk."),
            ("cigarettes_per_day", "10_plus"): (6, "Heavy daily smoking is a major accelerating cardiovascular factor."),
        }
        for key, answer in answers.items():
            normalized = answer
            if isinstance(answer, (int, float)) and key == "sleep_hours":
                if answer <= 5:
                    normalized = "very_low"
                elif answer <= 6:
                    normalized = "low"
                else:
                    normalized = "ok"

            if key == "sleep_hours" and normalized == "very_low":
                score += 3
                confirmed.append("Sleep duration appears strongly insufficient, which can worsen blood pressure, stress response, and recovery.")
                continue

            if key == "sleep_hours" and normalized == "low":
                score += 1
                confirmed.append("Sleep duration appears slightly low, which may be limiting overnight recovery.")
                continue

            if (key, normalized) not in rules:
                continue

            delta, text = rules[(key, normalized)]
            score += delta
            confirmed.append(text)
        return score, confirmed

    def _apply_refinement(self, payload: dict, result: dict, answers: dict[str, object]) -> dict:
        refinement_points, confirmed = self._refinement_delta_v2(answers)
        refined = result.copy()
        refined_score = int(np.clip(refined["risk_score"] + refinement_points, 0, 100))
        refined_level = self._risk_level(refined_score)
        refined["risk_score"] = refined_score
        refined["risk_level"] = refined_level
        refined["heart_age"] = self._heart_age(int(payload["age"]), refined_score)
        refined["heart_health_score"] = self._heart_health_score(payload, refined_score)
        refined["heart_attack_scenario"] = self._attack_scenario(payload, refined_score, refinement_points)
        refined["care_flags"] = list(dict.fromkeys(confirmed + refined["care_flags"]))[:5]
        refined["confirmed_signals"] = confirmed or ["No additional symptoms confirmed — this helps narrow the clinical picture."]
        refined["message"] = LEVEL_MESSAGES[refined_level]
        refined["emotional_message"] = self._emotional_message(payload, refined_level)
        refined["doctor_guidance"] = DOCTOR_GUIDANCE[refined_level]
        refined["visual_metrics"] = self._visual_metrics(refined)
        refined["profile_snapshot"] = self._profile_snapshot(payload, refined_level)
        refined["followup_answers"] = answers
        refined["refinement_summary"] = (
            "Your adaptive follow-up interview added symptom frequency, recovery, sleep, and habit context that sharpens the clinical picture."
            if confirmed
            else "No major symptoms confirmed — this is useful information that helps rule out several concerns."
        )
        if not confirmed:
            refined["refinement_summary"] = "No major additional warning pattern was confirmed - that is still useful because it narrows the picture."
        refined["report_sections"] = self._report_sections(payload, refined)
        return refined

    def _explanations(self, payload: dict) -> list[dict]:
        return [
            {
                "feature": item.headline.lower().replace(" ", "_"),
                "direction": "up" if item.score >= 0 else "down",
                "magnitude": round(abs(item.score), 3),
                "headline": item.headline,
                "detail": item.detail,
            }
            for item in self._feature_strengths(payload)[:5]
        ]

    def _lime_summary(self, payload: dict) -> list[dict]:
        return [
            {"label": item.headline, "weight": round(item.score, 4), "direction": "up" if item.score >= 0 else "down"}
            for item in self._feature_strengths(payload)[:4]
        ]

    def _simulations(self, payload: dict, baseline: int) -> list[dict]:
        scenarios = []
        for scenario_id, title, patch, summary in SIMULATION_PATCHES:
            modified = {**payload, **patch}
            score, _, _, _, _, _ = self._final_score(modified)
            scenarios.append({
                "id": scenario_id, "title": title, "risk_score": score,
                "delta": baseline - score, "summary": summary, "changes": patch,
            })
        scenarios.sort(key=lambda item: item["risk_score"])
        return scenarios

    def _emotional_message(self, payload: dict, level: str) -> str:
        name = payload.get("name") or "Your"
        age = payload.get("age", 30)
        if level in {"Low", "Mild"}:
            return f"{name}'s cardiovascular profile is reassuring — the current pattern is protective and worth maintaining with consistent habits."
        if level == "Moderate":
            return f"{name}'s profile shows modifiable pressure points. At {age}, targeted adjustments can meaningfully change this trajectory."
        return f"{name}'s profile shows elevated risk that deserves calm, structured attention — not panic, but purposeful action and medical guidance."

    def _report_sections(self, payload: dict, result: dict) -> list[dict]:
        sections = [
            {"title": "Assessment Summary", "items": [result["message"], result["emotional_message"]]},
            {"title": "Risk Projection", "items": [result["heart_attack_scenario"]["summary"]]},
        ]
        if result.get("primary_issue"):
            sections.append({"title": "Primary Finding", "items": [
                f"{result['primary_issue']['label']}: {result['primary_issue']['cause']}",
                f"If unchanged: {result['primary_issue']['projection']}",
            ]})
        sections.extend([
            {"title": "Pattern Analysis", "items": result["daily_story"]},
            {"title": "Body Signals", "items": result["possible_body_signals"]},
            {"title": "Dietary Guidance (Beneficial)", "items": result["food_guidance"]["lean_into"]},
            {"title": "Dietary Guidance (Reduce)", "items": result["food_guidance"]["ease_off"]},
            {"title": "Symptoms to Monitor", "items": result["symptom_watch"]},
            {"title": "Doctor Talking Points", "items": result["doctor_visit_script"]},
        ])
        return sections

    def predict(self, payload: dict) -> dict:
        if not self.base_models:
            self.fit()

        payload = payload.copy()
        for field in ["systolic_bp", "diastolic_bp", "cholesterol", "hdl_cholesterol", "ldl_cholesterol", "fasting_glucose", "triglycerides"]:
            payload.setdefault(field, None)

        final_score, ml_score, rule_score, life_score, personalization_score, _ = self._final_score(payload)
        risk_level = self._risk_level(final_score)
        confidence = self._confidence(payload)

        # Cross-signal pattern detection
        patterns = self._detect_patterns(payload)
        issues = self._identify_issues(payload, patterns)

        # Clinical interpretation
        clinical_severity, clinical_interpretations, clinical_count = compute_clinical_severity(payload)

        # Framingham approximation
        framingham = compute_framingham_approximation(
            payload.get("age"), payload.get("gender"),
            payload.get("systolic_bp"), payload.get("cholesterol"),
            payload.get("hdl_cholesterol"), payload.get("smoking"),
            payload.get("diabetes"),
        )

        # Generate narrative
        narrative = self._generate_narrative(payload, issues, clinical_severity, confidence)

        explanations = self._explanations(payload)
        result = {
            "name": payload.get("name"),
            "risk_score": final_score,
            "risk_level": risk_level,
            "confidence": confidence,
            "heart_age": self._heart_age(int(payload["age"]), final_score),
            "heart_health_score": self._heart_health_score(payload, final_score),
            "message": LEVEL_MESSAGES[risk_level],
            "emotional_message": self._emotional_message(payload, risk_level),
            "narrative": narrative,
            "primary_issue": issues["primary"],
            "secondary_issue": issues.get("secondary"),
            "detected_patterns": patterns[:4],
            "clinical_interpretations": clinical_interpretations,
            "clinical_severity": clinical_severity,
            "framingham": framingham,
            "top_factors": [item["headline"] for item in explanations[:3]],
            "protective_factors": self._protective_factors(payload),
            "derived_signals": self._derived_signals(payload),
            "daily_story": self._daily_story(payload, patterns),
            "possible_body_signals": self._possible_body_signals(payload),
            "breakdown": {
                "ml_score": int(round(ml_score)),
                "rule_score": rule_score,
                "lifestyle_score": life_score,
                "personalization_score": int(round(personalization_score)),
            },
            "explanations": explanations,
            "lime_summary": self._lime_summary(payload),
            "simulations": self._simulations(payload, final_score),
            "suggestions": self._suggestions(payload, risk_level, issues),
            "food_guidance": self._food_guidance(payload),
            "care_flags": self._care_flags(payload, risk_level),
            "doctor_guidance": DOCTOR_GUIDANCE[risk_level],
            "symptom_watch": self._symptom_watch(payload),
            "habit_focus": self._habit_focus(payload),
            "profile_snapshot": self._profile_snapshot(payload, risk_level),
            "doctor_visit_script": self._doctor_visit_script(payload, risk_level, issues),
            "heart_attack_scenario": self._attack_scenario(payload, final_score),
            "followup_questions": self._followup_questions(payload, risk_level),
            "visual_metrics": [],
            "confirmed_signals": [],
            "refinement_summary": "",
            "disclaimer": "For awareness and prevention guidance only. This is not a medical diagnosis.",
            "model_status": {
                "ensemble": ["XGBoost", "LightGBM", "CatBoost", "Random Forest", "Logistic Regression"],
                "personalization": "Pattern-aware Logistic Layer",
                "explainers": ["Cross-signal pattern analysis", "Clinical threshold interpreter", "Framingham-derived estimator"],
                "validation_auc": round(self.validation_auc or 0.0, 3),
                "data_mode": "clinical" if confidence >= 70 else "mixed" if confidence >= 45 else "lifestyle",
                "confidence_score": confidence,
            },
        }
        result["visual_metrics"] = self._visual_metrics(result)
        result["report_sections"] = self._report_sections(payload, result)
        return result

    def refine(self, payload: dict, answers: dict[str, object]) -> dict:
        base = self.predict(payload)
        return self._apply_refinement(payload, base, answers)
