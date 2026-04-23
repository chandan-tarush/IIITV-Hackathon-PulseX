# Beatly / HeartRisk+

Beatly is a cardiovascular assessment product with:

- A React + Vite patient-facing app
- A FastAPI ML and rules engine for scoring and clinical interpretation
- A lightweight Node server that handles grounded report writing, adaptive intake phrasing, and assistant chat

The diagnosis path is intentionally **not LLM-driven**. Core scoring, thresholds, and risk classification stay in the ML/rule engine. LLM features are used only for:

- Intake question phrasing
- Rich report writing after scoring
- Conversational explanation of already-grounded findings

## What Changed

The current build includes:

- Adaptive intake tiles that wait for the refined prompt before rendering
- Dynamic question ordering based on prior answers
- English, Hindi, and Hinglish UI options
- Per-section report audio controls
- Confidence-rated result sections
- Server-generated doctor-style narratives grounded in assessment output
- Loading states for slow generation steps

## Architecture

### 1. Client

Path: `client/`

Main responsibilities:

- Intake flow and adaptive question rendering
- Optional clinical/lab input
- Result tabs and section-level audio playback
- Chat assistant UI
- Offline fallback when backend calls fail

Important files:

- `client/src/App.jsx`
- `client/src/data.js`
- `client/src/questionEngine.js`
- `client/src/adaptiveInterview.js`
- `client/src/ReportNarratives.jsx`
- `client/src/ChatBot.jsx`
- `client/src/fallbackEngine.js`
- `client/src/i18n.js`

### 2. Node server

Path: `server/`

Main responsibilities:

- Proxy requests to the ML engine
- Call the configured Groq model for:
  - `/api/intake-question`
  - `/api/report`
  - `/api/assistant`
  - `/api/insights`
- Enforce grounding prompts so the model explains findings instead of inventing diagnoses

Important file:

- `server/index.js`

### 3. ML engine

Path: `ml_engine/`

Main responsibilities:

- Input validation
- Model inference
- Rule-based clinical interpretation
- Risk score and risk level generation
- Follow-up refinement
- Assessment history storage

Important files:

- `ml_engine/app/main.py`
- `ml_engine/app/models.py`
- `ml_engine/app/clinical_interpreter.py`
- `ml_engine/app/config.py`
- `ml_engine/app/schemas.py`
- `ml_engine/app/database.py`

## Medical Positioning

This project is an awareness and decision-support product, not a medical device.

Current medical design:

- Core risk scoring stays in the non-LLM path
- Published-style thresholds and deterministic clinical checks remain in the backend logic
- LLM output is constrained to explanation, intake phrasing, and narrative generation
- Weak sections should be omitted rather than padded with generic text

Important caveat:

- The ML layer is still software, not a clinically validated regulated diagnostic system
- Generated narratives should be treated as grounded explanation of model output, not new diagnosis

## Language Support

Supported interface modes:

- `en` for English
- `hi` for Devanagari Hindi
- `hinglish` for Roman-script Hinglish

Notes:

- `client/src/i18n.js` contains the primary UI dictionary
- Legacy mojibake repair is handled in the localization layer so older broken strings do not leak to the UI
- Hindi should always render in Devanagari, never Roman script

## API Surface

### ML / proxy routes

- `GET /api/health`
- `GET /api/history`
- `POST /api/predict`
- `POST /api/refine`
- `POST /api/simulate`

### LLM-backed grounded routes

- `POST /api/intake-question`
- `POST /api/report`
- `POST /api/assistant`
- `POST /api/insights`

## Environment Variables

### Frontend

- `VITE_API_URL`
  - Default: `/api`
  - Used by the React app to call the server

### Node server

- `PORT`
  - Default: `3001`
- `ML_ENGINE_URL`
  - Default: `http://127.0.0.1:8000`
- `GROQ_API_KEY`
  - Required for live intake/report/chat generation
- `GROQ_MODEL`
  - Default: `llama-3.3-70b-versatile`

## Local Development

### 1. Install JS dependencies

```bash
npm install
```

### 2. Install Python dependencies

```bash
python -m pip install -r ml_engine/requirements.txt
```

### 3. Start the ML engine

```bash
python -m uvicorn ml_engine.app.main:app --reload --port 8000
```

### 4. Start the Node server

```bash
npm --workspace server run dev
```

### 5. Start the client

```bash
npm --workspace client run dev
```

## Production / Deployment

Recommended deployment shape:

### Frontend

- Build with `npm --workspace client run build`
- Serve `client/dist`

### Node server

- Run `npm --workspace server run start`
- Set `PORT`, `ML_ENGINE_URL`, `GROQ_API_KEY`, and optionally `GROQ_MODEL`

### ML engine

- Run FastAPI separately behind an internal URL
- Point `ML_ENGINE_URL` at that internal service

### Reverse proxy

Recommended:

- Frontend served on the main domain
- `/api/*` forwarded to the Node server
- Node server forwards scoring calls to FastAPI

## Security Note

If a model key was ever exposed in the frontend at any point, rotate it.

Best practice now:

- Keep `GROQ_API_KEY` only on the server
- Never ship provider keys in the React bundle

## Audio / Speech

The app uses browser speech synthesis for section playback.

Important behavior:

- Voice quality depends on the voices installed in the user’s OS/browser
- Hindi playback works best when a proper `hi-IN` voice is available
- Each report section has its own listen button

## Documentation

Full deploy-oriented documentation is available in:

- `Beatly_Documentation.html`

It is designed to be readable on desktop and mobile after deployment.

## Current Limitations

- Voice quality is browser-dependent
- LLM narratives are grounded, but still not a substitute for clinician review
- The product has not been verified here by running tests or builds in this pass

## License / Ownership

Project ownership and licensing should be filled in by the team before public release.
