from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator, model_validator


class HeartRiskInput(BaseModel):
    name: str | None = Field(default=None, max_length=48)
    consent: bool = Field(default=False)
    age: int = Field(ge=18, le=100)
    gender: Literal["male", "female", "other"]
    systolic_bp: int | None = Field(default=None, ge=80, le=240)
    diastolic_bp: int | None = Field(default=None, ge=40, le=160)
    cholesterol: int | None = Field(default=None, ge=90, le=400)
    hdl_cholesterol: int | None = Field(default=None, ge=15, le=100)
    ldl_cholesterol: int | None = Field(default=None, ge=40, le=300)
    fasting_glucose: int | None = Field(default=None, ge=50, le=400)
    triglycerides: int | None = Field(default=None, ge=30, le=600)
    smoking: Literal["yes", "no"]
    diabetes: Literal["yes", "no"]
    family_history: Literal["yes", "no"]
    activity_level: Literal["low", "medium", "high"]
    sitting: Literal["high", "medium", "low"]
    stress: Literal["high", "medium", "low"]
    sleep_quality: Literal["poor", "ok", "good"]
    diet: Literal["frequent", "moderate", "rare"]
    exertion_response: Literal["strained", "noticeable", "easy"]

    @field_validator("name")
    @classmethod
    def clean_name(cls, value: str | None) -> str | None:
        if value is None:
            return value
        value = value.strip()
        return value or None

    @model_validator(mode="after")
    def validate_consent(self) -> "HeartRiskInput":
        if not self.consent:
            raise ValueError("Consent is required before generating a health risk estimate.")
        return self


class SimulationRequest(BaseModel):
    payload: HeartRiskInput
    changes: dict[str, Any] = Field(default_factory=dict)


class RefinementRequest(BaseModel):
    payload: HeartRiskInput
    answers: dict[str, Literal["yes", "no"]] = Field(default_factory=dict)
