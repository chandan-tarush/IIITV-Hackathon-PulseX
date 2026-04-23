"""Clinical data interpreter using real WHO / AHA / ADA / ATP-III thresholds."""
from __future__ import annotations

from .config import (
    BP_CATEGORIES,
    GLUCOSE_CATEGORIES,
    HDL_CATEGORIES,
    LDL_CATEGORIES,
    TC_CATEGORIES,
    TRIGLYCERIDE_CATEGORIES,
)


def _classify(value, categories):
    """Find the category a numeric value falls into."""
    if value is None:
        return None, None, 0.0
    for name, info in categories.items():
        low, high = info["range"] if "range" in info else (info["systolic"][0], info["systolic"][1])
        if low <= value < high:
            return name, info, info.get("severity", 0.0)
    # Fallback to last category
    last_name = list(categories.keys())[-1]
    last_info = categories[last_name]
    return last_name, last_info, last_info.get("severity", 0.0)


def interpret_bp(systolic, diastolic):
    """Classify blood pressure per AHA/ACC 2017 guidelines."""
    if systolic is None:
        return None
    dias = diastolic if diastolic is not None else 0

    best_cat = "normal"
    best_severity = 0.0

    for cat_name, cat_info in BP_CATEGORIES.items():
        s_low, s_high = cat_info["systolic"]
        d_low, d_high = cat_info["diastolic"]
        sys_match = s_low <= systolic < s_high
        dia_match = d_low <= dias < d_high
        if (sys_match or dia_match) and cat_info["severity"] > best_severity:
            best_cat = cat_name
            best_severity = cat_info["severity"]

    labels = {
        "normal": "Normal blood pressure",
        "elevated": "Elevated blood pressure",
        "stage1_hypertension": "Stage 1 Hypertension",
        "stage2_hypertension": "Stage 2 Hypertension",
        "hypertensive_crisis": "Hypertensive Crisis",
    }

    texts = {
        "normal": f"Your blood pressure reading of {systolic}/{dias} mmHg falls within the normal range (<120/80). This is a protective factor for your cardiovascular system.",
        "elevated": f"Your systolic pressure of {systolic} mmHg is in the elevated range (120–129/<80). This is a precursor to hypertension and responds well to lifestyle changes.",
        "stage1_hypertension": f"Your reading of {systolic}/{dias} mmHg indicates Stage 1 Hypertension (130–139/80–89, AHA). Lifestyle modification is recommended, and medication may be considered based on overall risk.",
        "stage2_hypertension": f"Your reading of {systolic}/{dias} mmHg indicates Stage 2 Hypertension (≥140/90, AHA). This level typically requires both lifestyle changes and medication. A doctor visit is strongly recommended.",
        "hypertensive_crisis": f"Your reading of {systolic}/{dias} mmHg suggests a hypertensive crisis (>180/120, AHA). If accompanied by symptoms like chest pain or shortness of breath, seek emergency care.",
    }

    return {
        "category": best_cat,
        "label": labels[best_cat],
        "severity": best_severity,
        "text": texts[best_cat],
        "systolic": systolic,
        "diastolic": dias,
        "standard": "AHA/ACC 2017",
    }


def interpret_cholesterol(total, hdl, ldl):
    """Classify cholesterol per ATP-III / AHA guidelines."""
    result = {"standard": "ATP-III / AHA", "components": {}}

    if total is not None:
        cat_name, _, severity = _classify(total, TC_CATEGORIES)
        labels = {"desirable": "Desirable", "borderline_high": "Borderline High", "high": "High"}
        result["components"]["total"] = {
            "value": total,
            "category": cat_name,
            "label": labels.get(cat_name, cat_name),
            "severity": severity,
            "text": f"Total cholesterol of {total} mg/dL is classified as {labels.get(cat_name, cat_name).lower()} (ATP-III).",
        }

    if hdl is not None:
        cat_name, cat_info, severity = _classify(hdl, HDL_CATEGORIES)
        labels = {"low": "Low (risk factor)", "moderate": "Moderate", "high": "Protective"}
        result["components"]["hdl"] = {
            "value": hdl,
            "category": cat_name,
            "label": labels.get(cat_name, cat_name),
            "severity": severity,
            "text": f"HDL of {hdl} mg/dL is {labels.get(cat_name, '').lower()}. {cat_info.get('note', '') if cat_info else ''}",
            "note": cat_info.get("note", "") if cat_info else "",
        }

    if ldl is not None:
        cat_name, _, severity = _classify(ldl, LDL_CATEGORIES)
        labels = {"optimal": "Optimal", "near_optimal": "Near Optimal", "borderline_high": "Borderline High", "high": "High", "very_high": "Very High"}
        result["components"]["ldl"] = {
            "value": ldl,
            "category": cat_name,
            "label": labels.get(cat_name, cat_name),
            "severity": severity,
            "text": f"LDL of {ldl} mg/dL is classified as {labels.get(cat_name, cat_name).lower()} (ATP-III).",
        }

    # TC/HDL ratio (Framingham-significant)
    if total is not None and hdl is not None and hdl > 0:
        ratio = round(total / hdl, 1)
        ratio_risk = "optimal" if ratio < 3.5 else "acceptable" if ratio < 5 else "elevated" if ratio < 6 else "high"
        result["tc_hdl_ratio"] = {
            "value": ratio,
            "category": ratio_risk,
            "text": f"Your TC/HDL ratio is {ratio}. A ratio below 3.5 is optimal; yours is {ratio_risk}.",
        }

    if not result["components"]:
        return None
    return result


def interpret_glucose(fasting_glucose):
    """Classify fasting glucose per ADA criteria."""
    if fasting_glucose is None:
        return None

    cat_name, _, severity = _classify(fasting_glucose, GLUCOSE_CATEGORIES)
    labels = {"normal": "Normal fasting glucose", "prediabetes": "Prediabetes range", "diabetes": "Diabetes range"}
    texts = {
        "normal": f"Your fasting glucose of {fasting_glucose} mg/dL is within the normal range (<100 mg/dL, ADA).",
        "prediabetes": f"Your fasting glucose of {fasting_glucose} mg/dL falls in the prediabetes range (100–125 mg/dL, ADA). This is reversible with lifestyle changes including regular movement and dietary adjustments.",
        "diabetes": f"Your fasting glucose of {fasting_glucose} mg/dL is in the diabetes range (≥126 mg/dL, ADA). This requires medical attention and ongoing monitoring.",
    }

    return {
        "category": cat_name,
        "label": labels[cat_name],
        "severity": severity,
        "text": texts[cat_name],
        "value": fasting_glucose,
        "standard": "ADA",
    }


def interpret_triglycerides(value):
    """Classify triglycerides per AHA guidelines."""
    if value is None:
        return None

    cat_name, _, severity = _classify(value, TRIGLYCERIDE_CATEGORIES)
    labels = {"normal": "Normal", "borderline_high": "Borderline High", "high": "High", "very_high": "Very High"}
    texts = {
        "normal": f"Your triglycerides of {value} mg/dL are within the normal range (<150 mg/dL).",
        "borderline_high": f"Your triglycerides of {value} mg/dL are borderline high (150–199 mg/dL). Reducing refined carbs and increasing omega-3 intake can help.",
        "high": f"Your triglycerides of {value} mg/dL are high (200–499 mg/dL, AHA). This increases cardiovascular risk and may require dietary intervention or medication.",
        "very_high": f"Your triglycerides of {value} mg/dL are very high (≥500 mg/dL, AHA). This significantly increases pancreatitis risk. Medical attention is recommended.",
    }

    return {
        "category": cat_name,
        "label": labels[cat_name],
        "severity": severity,
        "text": texts[cat_name],
        "value": value,
        "standard": "AHA",
    }


def compute_clinical_severity(payload):
    """Compute overall clinical severity from all available clinical data.
    Returns a severity score 0-1 and individual interpretations."""
    interpretations = {}
    severities = []
    weights = []

    bp = interpret_bp(payload.get("systolic_bp"), payload.get("diastolic_bp"))
    if bp:
        interpretations["bp"] = bp
        severities.append(bp["severity"])
        weights.append(1.5)  # BP is the strongest single predictor

    chol = interpret_cholesterol(
        payload.get("cholesterol"),
        payload.get("hdl_cholesterol"),
        payload.get("ldl_cholesterol"),
    )
    if chol:
        interpretations["cholesterol"] = chol
        max_chol_severity = max(
            (c.get("severity", 0) for c in chol["components"].values()),
            default=0,
        )
        severities.append(max_chol_severity)
        weights.append(1.2)

    glucose = interpret_glucose(payload.get("fasting_glucose"))
    if glucose:
        interpretations["glucose"] = glucose
        severities.append(glucose["severity"])
        weights.append(1.0)

    trig = interpret_triglycerides(payload.get("triglycerides"))
    if trig:
        interpretations["triglycerides"] = trig
        severities.append(trig["severity"])
        weights.append(0.8)

    if not severities:
        return 0.0, interpretations, 0

    weighted_sum = sum(s * w for s, w in zip(severities, weights))
    total_weight = sum(weights)
    overall = weighted_sum / total_weight if total_weight > 0 else 0.0

    return round(overall, 3), interpretations, len(severities)


def compute_confidence_score(payload):
    """Compute a 0-100 confidence score based on data completeness."""
    base = 30  # lifestyle-only baseline

    clinical_fields = [
        ("systolic_bp", 15),
        ("diastolic_bp", 8),
        ("cholesterol", 12),
        ("hdl_cholesterol", 10),
        ("ldl_cholesterol", 10),
        ("fasting_glucose", 10),
        ("triglycerides", 5),
    ]

    for field, points in clinical_fields:
        val = payload.get(field)
        if val is not None:
            base += points

    return min(100, base)


def compute_framingham_approximation(age, gender, systolic_bp, total_chol, hdl, smoking, diabetes):
    """Simplified Framingham-inspired 10-year CVD risk estimate.
    Based on published Framingham coefficients (D'Agostino et al. 2008).
    This is an APPROXIMATION for guidance — not a clinical calculator."""
    if age is None:
        return None

    # Start with log-linear model coefficients (simplified)
    score = 0.0

    # Age contribution
    if gender == "female":
        score += max(0, (age - 20)) * 0.28
    else:
        score += max(0, (age - 20)) * 0.34

    # Systolic BP
    if systolic_bp is not None:
        if systolic_bp >= 160:
            score += 3.0
        elif systolic_bp >= 140:
            score += 2.0
        elif systolic_bp >= 130:
            score += 1.0
        elif systolic_bp >= 120:
            score += 0.5

    # Total cholesterol
    if total_chol is not None:
        if total_chol >= 280:
            score += 3.0
        elif total_chol >= 240:
            score += 2.0
        elif total_chol >= 200:
            score += 1.0

    # HDL (protective — lower score for higher HDL)
    if hdl is not None:
        if hdl >= 60:
            score -= 1.5
        elif hdl >= 50:
            score -= 0.5
        elif hdl < 40:
            score += 2.0

    # Smoking
    if smoking == "yes":
        score += 3.0 if gender == "male" else 2.5

    # Diabetes
    if diabetes == "yes":
        score += 3.0 if gender == "female" else 2.0

    # Convert to approximate percentage (logistic transform)
    import math
    probability = 1.0 / (1.0 + math.exp(-(score - 8.0) * 0.35))
    ten_year_pct = round(probability * 100, 1)
    ten_year_pct = max(0.5, min(65.0, ten_year_pct))

    category = "low" if ten_year_pct < 5 else "borderline" if ten_year_pct < 7.5 else "intermediate" if ten_year_pct < 20 else "high"

    return {
        "ten_year_percent": ten_year_pct,
        "category": category,
        "note": f"Estimated 10-year cardiovascular risk: {ten_year_pct}% (Framingham-derived approximation).",
    }
