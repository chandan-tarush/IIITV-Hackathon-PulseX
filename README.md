# 🚀 Beatly — AI Cardiovascular Risk Assessment Engine

> A full-stack, intelligent cardiovascular assessment system combining **machine learning, clinical logic, and adaptive questioning** to deliver personalized and explainable health insights.

---

## 🧠 Why Beatly?

Most health tools are static.

Beatly behaves like an **intelligent diagnostic assistant** that:

- Adapts questions dynamically in real time  
- Understands relationships between lifestyle, clinical, and behavioral signals  
- Combines ML predictions with rule-based medical logic  
- Generates explainable, doctor-style outputs  
- Works even in degraded/offline environments  

---

## 🆕 What’s New (Current Version)

- Adaptive intake tiles 
- Dynamic question ordering based on responses  
- Multilingual UI (English, Hindi, Hinglish)  
- intelligence based-generated doctor-style reports (grounded, not hallucinated)  
- Confidence-rated result sections  
- Section-wise audio playback  
- Chat assistant for explanation of results  
- Improved loading states for heavy computations  

---

## 🏗️ System Architecture

![Architecture](./assets/architecture-diagram.png)

A modular full-stack system:

- **Frontend** → React + Vite (UI, adaptive flow, visualization)  
- **Node Server** → Proxy + LLM orchestration + report generation  
- **ML Engine** → FastAPI (core scoring + clinical interpretation)  
- **Storage** → SQLite (history tracking)  

---

## 🔄 How It Works

![System Flow](./assets/system-flow.png)

1. User enters basic details  
2. Adaptive questioning begins  
3. Optional clinical inputs improve accuracy  
4. ML + rule engine processes signals  
5. Risk score + insights generated  
6. Follow-up refinement improves precision  
7. LLM generates grounded explanation (not diagnosis)  

---

## ⚙️ Intelligence Pipeline

![Backend Pipeline](./assets/backend-pipeline.png)

Each assessment flows through:

- Input validation  
- ML ensemble prediction  
- Clinical rule evaluation  
- Lifestyle scoring  
- Cross-signal pattern detection  
- Dynamic weighting  
- Narrative generation  

---

## 🧠 Adaptive Question Engine

![Question Logic](./assets/question-logic.png)

- No fixed forms  
- Context-aware branching  
- Questions evolve after every answer  

👉 Example:  
Low activity + high sitting → deeper probing of stress and recovery  

---

## 🔍 Pattern Detection System

![Pattern Detection](./assets/pattern-detection.png)

Detects hidden health patterns using:

- Lifestyle signals  
- Clinical inputs  
- Behavioral trends  

Each pattern includes:
- Severity  
- Cause  
- Risk trajectory  
- Actionable recommendations  

---

## 📊 Risk Scoring Model

![Risk Scoring](./assets/risk-scoring.png)

Final score combines:

- ML prediction  
- Clinical thresholds  
- Lifestyle scoring  
- Pattern-based adjustments  

👉 Weights dynamically adapt based on data confidence  

---

## 📈 Risk Levels

![Risk Levels](./assets/risk-levels.png)

| Score | Level |
|------|------|
| 0–4 | Low |
| 5–9 | Mild |
| 10–19 | Moderate |
| 20–29 | High |
| 30+ | Very High |

---

## 📦 Output System

![Output System](./assets/output-system.png)

Beatly delivers:

- Primary & secondary risk insights  
- Clinical interpretation  
- Personalized recommendations  
- “What-if” simulations  
- Follow-up refinement  
- AI-generated narrative reports  

---

## 🤖 AI + ML Design Philosophy

**Critical principle: Diagnosis is NOT LLM-driven**

### ML / Rule Engine (Core)
- Risk scoring  
- Clinical thresholds  
- Deterministic logic  
- Pattern detection  

### LLM (Controlled Usage)
- Intake question phrasing  
- Report writing (post-analysis)  
- Conversational explanation  

👉 The model explains results — it does NOT generate them.

---

## 🌐 Language Support

- English (`en`)  
- Hindi (`hi`)  
- Hinglish (`hinglish`)  

✔ Hindi rendered in Devanagari  
✔ Localization handled via `i18n.js`

---

## 📴 Offline Fallback

If backend fails:

- Assessment runs fully on frontend  
- Scoring logic replicated  
- No interruption to user experience  

---

## 🔌 API Endpoints

### Core Assessment

- `POST /api/predict` → Main assessment  
- `POST /api/refine` → Follow-up refinement  
- `GET /api/history` → Previous results  
- `GET /api/health` → System status  
- `POST /api/simulate` → What-if simulation  

### LLM-backed (Grounded)

- `POST /api/intake-question`  
- `POST /api/report`  
- `POST /api/assistant`  
- `POST /api/insights`  

---

## 📁 Project Structure

```
client/        → React frontend  
server/        → Node proxy + LLM orchestration  
ml_engine/     → FastAPI + ML pipeline  
assets/        → diagrams & visuals  
```

---

## ⚙️ Run Locally

```bash
npm install
python -m pip install -r ml_engine/requirements.txt
python -m uvicorn ml_engine.app.main:app --reload --port 8000
npm --workspace server run dev
npm --workspace client run dev
```

---

## 🔐 Environment Variables

### Frontend
- `VITE_API_URL=/api`

### Server
- `PORT=3001`
- `ML_ENGINE_URL=http://127.0.0.1:8000`
- `GROQ_API_KEY=your_key`
- `GROQ_MODEL=llama-3.3-70b-versatile`

---

## 🚀 Deployment Overview

- Frontend → static build (`client/dist`)  
- Server → Node runtime  
- ML Engine → FastAPI service  
- Reverse proxy routes `/api/*`  

---

## 🔊 Audio System

- Browser-based speech synthesis  
- Section-wise playback  
- Best experience with proper system voices  

---

## ⚠️ Limitations

- Not a clinically validated diagnostic tool  
- Voice quality depends on device/browser  
- LLM output is constrained but not perfect  
- Requires proper API key setup for full features  

---

## 📄 Detailed Documentation

👉 [View Complete Documentation](./Beatly_Documentation.html)

---

## ⚠️ Disclaimer

This system is for **awareness and educational purposes only**.  
It is NOT a substitute for professional medical advice.

---

## 👤 Author

chandan
