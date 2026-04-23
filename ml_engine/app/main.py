from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from .database import fetch_history, init_db, save_prediction
from .models import HeartRiskEngine
from .schemas import HeartRiskInput, RefinementRequest, SimulationRequest

engine = HeartRiskEngine()


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    engine.fit()
    yield


app = FastAPI(title="HeartRisk+ ML Engine", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "validation_auc": round(engine.validation_auc or 0.0, 3),
        "history_count": len(fetch_history(limit=100)),
        "models": ["xgb", "lgbm", "catboost", "rf", "lr", "meta-logistic", "pattern-logistic"],
    }


@app.post("/predict")
def predict(payload: HeartRiskInput) -> dict:
    try:
        result = engine.predict(payload.model_dump())
        result["history_id"] = save_prediction(payload.name, result)
        return result
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except Exception as error:  # pragma: no cover
        raise HTTPException(status_code=500, detail=f"Prediction failed: {error}") from error


@app.post("/simulate")
def simulate(request: SimulationRequest) -> dict:
    merged = request.payload.model_dump()
    merged.update(request.changes)
    try:
        return engine.predict(merged)
    except Exception as error:  # pragma: no cover
        raise HTTPException(status_code=500, detail=f"Simulation failed: {error}") from error


@app.post("/refine")
def refine(request: RefinementRequest) -> dict:
    try:
        return engine.refine(request.payload.model_dump(), request.answers)
    except Exception as error:  # pragma: no cover
        raise HTTPException(status_code=500, detail=f"Refinement failed: {error}") from error


@app.get("/history")
def history(limit: int = Query(default=8, ge=1, le=24)) -> dict:
    return {"items": list(reversed(fetch_history(limit=limit)))}
