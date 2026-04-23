from __future__ import annotations

import numpy as np
import pandas as pd

from .config import RANDOM_SEED


def _clip_int(values: np.ndarray, low: int, high: int) -> np.ndarray:
    return np.clip(np.round(values).astype(int), low, high)


def generate_synthetic_dataset(rows: int, seed: int = RANDOM_SEED) -> pd.DataFrame:
    rng = np.random.default_rng(seed)

    ages = _clip_int(rng.normal(43, 14, rows), 21, 82)
    genders = rng.choice(["male", "female", "other"], size=rows, p=[0.51, 0.46, 0.03])

    activity = rng.choice(["low", "medium", "high"], size=rows, p=[0.31, 0.45, 0.24])
    sitting = []
    for level in activity:
        if level == "low":
            sitting.append(rng.choice(["high", "medium", "low"], p=[0.60, 0.30, 0.10]))
        elif level == "medium":
            sitting.append(rng.choice(["high", "medium", "low"], p=[0.28, 0.48, 0.24]))
        else:
            sitting.append(rng.choice(["high", "medium", "low"], p=[0.11, 0.33, 0.56]))
    sitting = np.array(sitting)

    stress = []
    for age, move in zip(ages, activity):
        high_bias = 0.25 + (0.07 if age < 35 else 0) + (0.06 if move == "low" else 0)
        medium_bias = 0.48
        stress.append(
            rng.choice(
                ["high", "medium", "low"],
                p=[min(high_bias, 0.6), medium_bias, max(0.05, 1 - min(high_bias, 0.6) - medium_bias)],
            )
        )
    stress = np.array(stress)

    sleep = []
    for strain in stress:
        if strain == "high":
            sleep.append(rng.choice(["poor", "ok", "good"], p=[0.55, 0.32, 0.13]))
        elif strain == "medium":
            sleep.append(rng.choice(["poor", "ok", "good"], p=[0.22, 0.54, 0.24]))
        else:
            sleep.append(rng.choice(["poor", "ok", "good"], p=[0.08, 0.34, 0.58]))
    sleep = np.array(sleep)

    diet = []
    for move, sit in zip(activity, sitting):
        if move == "low" and sit == "high":
            diet.append(rng.choice(["frequent", "moderate", "rare"], p=[0.42, 0.43, 0.15]))
        else:
            diet.append(rng.choice(["frequent", "moderate", "rare"], p=[0.21, 0.48, 0.31]))
    diet = np.array(diet)

    smoking_prob = np.clip(0.10 + (ages - 30) * 0.002 + (genders == "male") * 0.05, 0.04, 0.24)
    smoking = np.where(rng.random(rows) < smoking_prob, "yes", "no")

    diabetes_prob = np.clip(0.04 + (ages - 35) * 0.003 + (activity == "low") * 0.05, 0.02, 0.28)
    diabetes = np.where(rng.random(rows) < diabetes_prob, "yes", "no")
    family_history = np.where(rng.random(rows) < np.clip(0.18 + (ages > 40) * 0.04, 0.12, 0.30), "yes", "no")

    # ── Systolic / Diastolic BP (correlated) ──
    systolic_bp = (
        96
        + ages * 0.72
        + (smoking == "yes") * 7
        + (diabetes == "yes") * 8
        + (stress == "high") * 7
        + (activity == "low") * 6
        + rng.normal(0, 11, rows)
    )
    systolic_bp = _clip_int(systolic_bp, 88, 205).astype(float)

    # Diastolic correlates with systolic: typically systolic * 0.6 + noise
    diastolic_bp = (
        systolic_bp * 0.58
        + 10
        + rng.normal(0, 6, rows)
    )
    diastolic_bp = _clip_int(diastolic_bp, 55, 130).astype(float)

    # ── Cholesterol panel ──
    cholesterol = (
        118
        + ages * 1.45
        + (diet == "frequent") * 16
        + (activity == "low") * 8
        + (family_history == "yes") * 6
        + (diabetes == "yes") * 15
        + rng.normal(0, 22, rows)
    )
    cholesterol = _clip_int(cholesterol, 105, 345).astype(float)

    # HDL: inversely correlated with risk factors
    hdl = (
        58
        - (smoking == "yes") * 8
        - (activity == "low") * 6
        + (activity == "high") * 8
        - (diet == "frequent") * 5
        + (genders == "female") * 10
        + rng.normal(0, 10, rows)
    )
    hdl = _clip_int(hdl, 20, 95).astype(float)

    # LDL: derived from Friedewald-like approximation + noise
    trig_base = (
        100
        + (diet == "frequent") * 45
        + (activity == "low") * 25
        + (diabetes == "yes") * 35
        + ages * 0.5
        + rng.normal(0, 30, rows)
    )
    triglycerides = _clip_int(trig_base, 40, 550).astype(float)

    # Friedewald: LDL = TC - HDL - TG/5 (with noise)
    ldl = cholesterol - hdl - triglycerides / 5 + rng.normal(0, 8, rows)
    ldl = _clip_int(ldl, 40, 280).astype(float)

    # ── Fasting glucose ──
    fasting_glucose = (
        82
        + (diabetes == "yes") * 48
        + (diet == "frequent") * 8
        + (activity == "low") * 5
        + ages * 0.15
        + rng.normal(0, 10, rows)
    )
    fasting_glucose = _clip_int(fasting_glucose, 60, 350).astype(float)

    # ── Missingness patterns (realistic: not everyone has labs) ──
    bp_missing = rng.random(rows) < 0.24
    chol_missing = rng.random(rows) < 0.37
    hdl_missing = rng.random(rows) < 0.45
    ldl_missing = rng.random(rows) < 0.45
    glucose_missing = rng.random(rows) < 0.40
    trig_missing = rng.random(rows) < 0.50
    dias_missing = bp_missing | (rng.random(rows) < 0.15)

    systolic_bp[bp_missing] = np.nan
    diastolic_bp[dias_missing] = np.nan
    cholesterol[chol_missing] = np.nan
    hdl[hdl_missing] = np.nan
    ldl[ldl_missing] = np.nan
    fasting_glucose[glucose_missing] = np.nan
    triglycerides[trig_missing] = np.nan

    # ── Exertion response ──
    life_score = (
        np.select([activity == "low", activity == "medium"], [20, 10], default=0)
        + np.select([sitting == "high", sitting == "medium"], [15, 8], default=0)
        + np.select([stress == "high", stress == "medium"], [15, 8], default=0)
        + np.select([sleep == "poor", sleep == "ok"], [15, 5], default=0)
        + np.select([diet == "frequent", diet == "moderate"], [15, 8], default=0)
    )
    exertion_response = np.full(rows, "easy", dtype=object)
    exertion_response = np.where((activity == "low") & (sitting == "high"), "strained", exertion_response)
    exertion_response = np.where((stress == "high") & (sleep == "poor"), "noticeable", exertion_response)
    exertion_response = np.where((np.nan_to_num(systolic_bp, nan=126.0) >= 145), "strained", exertion_response)
    life_score = life_score + np.select([exertion_response == "strained", exertion_response == "noticeable"], [12, 6], default=0)

    # ── Event label ──
    sbp_filled = np.nan_to_num(systolic_bp, nan=126.0)
    chol_filled = np.nan_to_num(cholesterol, nan=196.0)
    hdl_filled = np.nan_to_num(hdl, nan=50.0)
    glucose_filled = np.nan_to_num(fasting_glucose, nan=92.0)

    rule_score = (
        (smoking == "yes") * 30
        + (family_history == "yes") * 10
        + (sbp_filled >= 140) * 25
        + ((sbp_filled >= 120) & (sbp_filled < 140)) * 10
        + (chol_filled >= 240) * 25
        + (diabetes == "yes") * 20
    ).astype(float)

    latent = (
        -6.4
        + ages * 0.055
        + (genders == "male") * 0.28
        + (smoking == "yes") * 0.9
        + (diabetes == "yes") * 1.05
        + (family_history == "yes") * 0.26
        + np.nan_to_num((systolic_bp - 118) / 24, nan=0.28)
        + np.nan_to_num((cholesterol - 188) / 55, nan=0.16)
        + (hdl_filled < 40) * 0.35
        + (glucose_filled >= 126) * 0.5
        + life_score * 0.018
        + rule_score * 0.012
    )
    probability = 1 / (1 + np.exp(-latent))
    event = (rng.random(rows) < probability).astype(int)

    return pd.DataFrame(
        {
            "age": ages,
            "gender": genders,
            "systolic_bp": systolic_bp,
            "diastolic_bp": diastolic_bp,
            "cholesterol": cholesterol,
            "hdl_cholesterol": hdl,
            "ldl_cholesterol": ldl,
            "fasting_glucose": fasting_glucose,
            "triglycerides": triglycerides,
            "smoking": smoking,
            "diabetes": diabetes,
            "family_history": family_history,
            "activity_level": activity,
            "sitting": sitting,
            "stress": stress,
            "sleep_quality": sleep,
            "diet": diet,
            "exertion_response": exertion_response,
            "event": event,
        }
    )
