# HeartRisk+

HeartRisk+ is a full-stack heart-risk experience built from the attached project documents.

- `client`: React + Vite premium assessment experience with animated illustrations, guided questions, simulations, and tracking.
- `server`: lightweight Node proxy/BFF for local development and frontend integration.
- `ml_engine`: FastAPI service with a real ensemble pipeline using XGBoost, LightGBM, Random Forest, Logistic Regression, SHAP explanations, simulations, and SQLite history.

## Run locally

1. Install frontend dependencies with `npm install`
2. Start the Python ML API with `python -m uvicorn ml_engine.app.main:app --reload --port 8000`
3. Start the Node proxy with `npm --workspace server run dev`
4. Start the frontend with `npm --workspace client run dev`

## Product coverage

- Guided emotional flow: landing, consent, name, one-question-per-screen, loading, results
- Risk breakdown: model score, clinical rules, lifestyle score, confidence, heart age
- Explainability: SHAP-backed factor cards plus human explanations
- Simulations: targeted lifestyle change scenarios and combined reset
- Action plan: personalised, neutral, clinician-safe recommendations
- Tracking: SQLite-backed prediction history surfaced in the UI
