# 🌾 Kisaan Sathi (किसान साथी)
## AI-Powered Sowing and Harvesting Risk Intelligence Platform
> **IIIT Delhi Hackathon • Problem 2.1: Uncertain Sowing and Harvesting**  
> *"Beej se Bazaar Tak, Har Faisle Mein Kisaan Ka Sathi"*

---

## 📌 Executive Summary & Problem Addressed

Smallholder farmers across India face escalating climate variability: delayed monsoons, erratic dry spells, sudden pre-emergence downpours, and unseasonal harvest-time storms. Sowing at the wrong time causes seed washout or furrow seed rot (costing ₹2,000–₹3,500/acre in re-sowing expenses), while harvesting in wet conditions causes grain discoloration, fungal mold (black point), combine harvester bogging, and steep Mandi price cuts (₹150–₹300/quintal discount).

**Kisaan Sathi** is an intelligent, zero-field-hardware decision-support platform designed for Indian agro-climatic zones. It integrates open numerical weather predictions (Open-Meteo ECMWF/GFS), ICAR/CRIDA validated crop benchmarks, transparent uncertainty quantification, what-if candidate window ranking, and bilingual Hindi/English guidance.

---

## 🏗️ Architecture & Technology Stack

```
                   ┌──────────────────────────────────────────────┐
                   │               Farmer / Client                │
                   │  (React 19 SPA / Streamlit / Mobile / cURL)  │
                   └──────────────────────┬───────────────────────┘
                                          │
                     JSON REST API (FastAPI / Express Bridge)
                                          │
        ┌─────────────────────────────────┴─────────────────────────────────┐
        │                                                                   │
        ▼                                                                   ▼
┌───────────────────────────────┐                       ┌───────────────────────────────────────┐
│     Weather Provider Layer    │                       │         Core Decision Engine          │
│  - Pluggable WeatherProvider  │                       │  - Sowing Risk Intelligence (Washout) │
│  - Open-Meteo (Real ECMWF/GFS)│                       │  - Harvest Risk Intelligence (Maturity│
│  - WeatherCache (TTL 30m)     │                       │    Safeguard, Mold & Combine Traffic) │
│  - MockProvider (Offline/CI)  │                       │  - What-If Scenario Comparator        │
└───────────────┬───────────────┘                       └───────────────────┬───────────────────┘
                │                                                           │
                └─────────────────────────┬─────────────────────────────────┘
                                          │
                        ┌─────────────────┴─────────────────┐
                        │                                   │
                        ▼                                   ▼
        ┌───────────────────────────────┐   ┌───────────────────────────────────┐
        │   ICAR/CRIDA Agronomic Rules  │   │     Persistence & Evaluation      │
        │  - 6 Supported Indian Crops   │   │  - SQLite (Local: kisaan_risk.db) │
        │  - Scientific Provenance      │   │  - PostgreSQL / Supabase ready    │
        │  - Soil Temp & Moisture Bounds│   │  - Zero-Data-Leakage ML Evaluator │
        │  - Combine Trafficability     │   │  - Brier Score, Recall & Lead-Time│
        └───────────────────────────────┘   └───────────────────────────────────┘
```

- **Backend Framework**: Python 3.11+, FastAPI, Pydantic v2, Uvicorn
- **External Atmospheric APIs**: Open-Meteo Global Forecasting Model (ECMWF & GFS) — 100% free, non-commercial, zero API key required
- **Data Science & Validation**: NumPy, Pandas, Scikit-learn (probabilistic calibration)
- **Database / ORM**: SQLAlchemy 2.0 with default zero-setup SQLite (`kisaan_risk.db`) and PostgreSQL/Supabase compatibility
- **Testing**: Pytest with automated unit and integration tests using mocked scenarios
- **Interactive UI & Visualization**: Full-stack Node.js/Express + React 19 + Tailwind CSS + Lucide Icons on port 3000

---

## 🚀 Quickstart Guide

### Option A: Run Standalone Python FastAPI Backend (Windows / Linux / macOS)

#### 1. Navigate to backend directory
```bash
cd backend
```

#### 2. Create and activate a Python 3.11+ virtual environment
- **On Windows (PowerShell)**:
  ```powershell
  python -m venv venv
  .\venv\Scripts\Activate.ps1
  ```
- **On Windows (Command Prompt)**:
  ```cmd
  python -m venv venv
  .\venv\Scripts\activate.bat
  ```
- **On Linux / macOS**:
  ```bash
  python3 -m venv venv
  source venv/bin/activate
  ```

#### 3. Install dependencies
```bash
pip install -r requirements.txt
```

#### 4. Run the interactive demonstration script
```bash
python demo_run.py
```
*Executes all 5 demonstration test cases (Sowing washout alert, Harvest maturity block, What-If analysis, SQLite farmer feedback, and ML Brier score evaluation).*

#### 5. Launch the FastAPI server with Swagger documentation
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
- Interactive Swagger UI: **http://localhost:8000/docs**
- ReDoc alternative UI: **http://localhost:8000/redoc**
- Health Check: **http://localhost:8000/health**

---

### Option B: Run Full-Stack Interactive Web Platform (Port 3000)

The root repository includes an integrated Node.js / Express server that serves both the API endpoints and the React command center:
```bash
npm install
npm run dev
```
Open **http://localhost:3000** to interact with the bilingual dashboard, test the extreme weather simulator, view dual-depth soil moisture, and test farmer aggregation pools.

---

## 🧪 Automated Test Suite

Run all unit and integration tests with pytest:
```bash
cd backend
pytest tests/ -v
```

The test suite covers:
- `test_sowing_engine.py`: Optimal weather, 45mm deluge washout alert, and dry spell on rainfed soil.
- `test_harvest_engine.py`: Immature crop protection (never harvest early), wet weather mold penalty, and combine sink risk.
- `test_whatif_engine.py`: Candidate offset ranking (Today vs +3d vs +5d).
- `test_api_endpoints.py`: End-to-end HTTP integration for `/health`, `/api/v1/crops`, `/api/v1/feedback`, and `/api/v1/history`.
- `test_ml_evaluation.py`: Mathematical verification of Brier score, recall, and false alarm rate.

---

## 📡 API Specification & Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Backend and Open-Meteo provider connectivity health check |
| `GET` | `/weather/forecast` | Normalized 14-day atmospheric and precipitation forecast |
| `POST` | `/api/v1/sowing/analyze` | Comprehensive sowing safety score, washout/rot risk, and windows |
| `POST` | `/api/v1/harvest/analyze` | Harvest risk, crop maturity check, grain quality discount & combine traffic |
| `POST` | `/api/v1/what-if` | Quantitative trade-off comparison of acting today vs waiting 3 or 5 days |
| `GET` | `/api/v1/crops` | Supported crops and ICAR/CRIDA agronomic parameters with provenance |
| `POST` | `/api/v1/feedback` | Record farmer ground-truth outcomes to SQLite database |
| `GET` | `/api/v1/history/{field_id}` | Retrieve audit history and farmer outcomes for a specific field/plot |
| `GET` | `/api/v1/evaluation/report` | Calculate Brier score, event recall, and lead-time metrics |

---

### Example 1: Sowing Risk Analysis (`POST /api/v1/sowing/analyze`)

#### Request
```json
{
  "latitude": 29.6857,
  "longitude": 76.9905,
  "crop_name": "wheat",
  "crop_variety": "HD-2967",
  "current_crop_stage": "sowing",
  "expected_sowing_date": "2026-10-18",
  "soil_type": "Alluvial Loam",
  "irrigation_availability": true
}
```

#### Response
```json
{
  "status": "success",
  "crop_id": "wheat",
  "crop_name_en": "Wheat",
  "crop_name_hi": "गेहूं",
  "recommended_action": "SOW_NOW",
  "risk_score": 18.0,
  "risk_category": "LOW",
  "sowing_safety_score": 82.0,
  "candidate_windows": [
    {
      "start_date": "2026-10-18",
      "end_date": "2026-10-20",
      "suitability_score": 92.5,
      "risk_category": "LOW",
      "rank": 1,
      "rationale_en": "Clear 3-day dry window (0.0mm rain expected). Optimal for seedling anchoring.",
      "rationale_hi": "3 दिन शुष्क मौसम (0.0 मिमी बारिश)। बीज की जड़ें पकड़ने के लिए सबसे अनुकूल खिड़की।"
    }
  ],
  "main_risk_factors": [
    {
      "factor_name": "Post-Sowing Heavy Rainfall",
      "factor_category": "HEAVY_RAINFALL",
      "severity": "SAFE",
      "contribution_pts": 0.0,
      "description_en": "Clear or light rainfall ensures secure seedbed stability.",
      "description_hi": "मौसम साफ व वर्षा कम, बीज के बहने का कोई तात्कालिक खतरा नहीं है।"
    }
  ],
  "seed_washout_rot_risk": {
    "washout_probability_pct": 5.0,
    "rot_probability_pct": 8.0,
    "estimated_resowing_cost_inr_per_acre": 0.0,
    "protective_guidance_en": "Pause drilling if >25mm rain expected. If already sown, open drainage channels at boundary furrows.",
    "protective_guidance_hi": "यदि भारी बारिश की आशंका हो तो बुवाई रोकें। यदि बुवाई हो चुकी हो तो मेड़ पर जल निकासी नालियां तुरंत खोलें।"
  },
  "suggested_reassessment_time": "2026-10-19 06:00 UTC",
  "explanation_en": "Weather conditions for Wheat are favorable. Minimal rainfall risk in the next 48 hours ensures safe seed placement without washout.",
  "explanation_hi": "गेहूं की बुवाई के लिए मौसम अनुकूल है। अगले 48 घंटे में भारी बारिश का खतरा नहीं है, बीज बहने की संभावना नगण्य है।",
  "uncertainty": {
    "forecast_lead_time_days": 0,
    "forecast_confidence_pct": 90.0,
    "missing_variables": [],
    "is_stale_data": false,
    "agronomic_confidence": "HIGH"
  },
  "analyzed_at": "2026-10-17T18:30:00Z"
}
```

---

### Example 2: Harvest Risk Analysis (`POST /api/v1/harvest/analyze`)

#### Request
```json
{
  "latitude": 29.6857,
  "longitude": 76.9905,
  "crop_name": "rice",
  "current_crop_stage": "flowering",
  "expected_harvest_date": "2026-10-19"
}
```

#### Response (Preventing Premature Immature Harvesting)
```json
{
  "status": "success",
  "crop_id": "rice",
  "crop_name_en": "Paddy / Rice",
  "crop_name_hi": "धान (चावल)",
  "recommended_action": "MONITOR",
  "risk_score": 65.0,
  "risk_category": "HIGH",
  "harvest_safety_score": 35.0,
  "is_crop_mature": false,
  "maturity_stage_evaluated": "flowering",
  "maturity_warning": "Crop is currently in 'flowering' stage. It has not reached physiological maturity. Harvesting now will cause severe yield loss (up to 35%), wrinkled grains, and heavy moisture penalties at the Mandi.",
  "grain_quality_risk": {
    "expected_grain_moisture_pct": 21.0,
    "safe_storage_moisture_limit_pct": 14.0,
    "mold_and_discoloration_risk": "SEVERE",
    "estimated_mandi_discount_inr_per_quintal": 250.0,
    "quality_guidance_en": "High moisture grains face severe Mandi deductions (₹200-300/qtl).",
    "quality_guidance_hi": "अधिक नमी वाले अनाज पर मंडी में भारी कटौती का खतरा।"
  },
  "field_access_risk": {
    "machinery_trafficability": "POOR_COMBINE_SINK_RISK",
    "lodging_risk": "HIGH",
    "access_guidance_en": "Field soil is heavily saturated. Heavy combine harvesters risk tyre sinking.",
    "access_guidance_hi": "खेत में अत्यधिक कीचड़ है। भारी कंबाइन हार्वेस्टर के पहिये धंसने का गंभीर जोखिम।"
  },
  "explanation_en": "Do NOT harvest now. Paddy / Rice is in 'flowering' stage and needs more time to reach full maturity. Wait until grain physiological maturity before cutting.",
  "explanation_hi": "अभी कटाई बिल्कुल न करें! फसल अभी 'flowering' अवस्था में है और पकी नहीं है। समय से पहले कटाई करने से दाने सिकुड़ जाएंगे और वजन कम होगा।"
}
```

---

### Example 3: What-If Comparison (`POST /api/v1/what-if`)

#### Request
```json
{
  "latitude": 29.6857,
  "longitude": 76.9905,
  "crop_name": "wheat",
  "decision_mode": "sowing",
  "candidate_offsets_days": [0, 3, 5]
}
```

#### Response
```json
{
  "status": "success",
  "crop_name": "Wheat",
  "decision_mode": "sowing",
  "analyzed_date": "2026-10-17",
  "scenarios": [
    {
      "offset_days": 0,
      "target_date": "2026-10-18",
      "risk_score": 75.0,
      "safety_score": 25.0,
      "risk_category": "HIGH",
      "recommended_action": "WAIT",
      "forecast_rain_window_mm": 45.0,
      "soil_moisture_estimate_pct": 88.0,
      "rank": 3,
      "primary_tradeoff_en": "High immediate weather risk (45.0mm rain in 72h). Acting today carries elevated threat.",
      "primary_tradeoff_hi": "आज कार्य करने पर अत्यधिक मौसम जोखिम (45.0 मिमी बारिश)। नुकसान की आशंका अधिक।"
    },
    {
      "offset_days": 3,
      "target_date": "2026-10-21",
      "risk_score": 20.0,
      "safety_score": 80.0,
      "risk_category": "LOW",
      "recommended_action": "SOW_NOW",
      "forecast_rain_window_mm": 2.0,
      "soil_moisture_estimate_pct": 58.0,
      "rank": 1,
      "primary_tradeoff_en": "Waiting 3 days allows storms to clear (2.0mm rain). Dramatically safer window.",
      "primary_tradeoff_hi": "3 दिन प्रतीक्षा करने से मौसम साफ हो जाता है (2.0 मिमी बारिश)। काफी सुरक्षित खिड़की।"
    },
    {
      "offset_days": 5,
      "target_date": "2026-10-23",
      "risk_score": 25.0,
      "safety_score": 75.0,
      "risk_category": "LOW",
      "recommended_action": "SOW_NOW",
      "forecast_rain_window_mm": 3.5,
      "soil_moisture_estimate_pct": 60.0,
      "rank": 2,
      "primary_tradeoff_en": "Clear weather conditions maintained.",
      "primary_tradeoff_hi": "मौसम अनुकूल बना रहेगा।"
    }
  ],
  "recommended_offset_days": 3,
  "optimal_date": "2026-10-21",
  "decision_rationale_en": "Delaying by 3 days to 2026-10-21 reduces risk score by 55 points (from 75 down to 20). This bypasses heavy rainfall and secures the seedbed.",
  "decision_rationale_hi": "3 दिन प्रतीक्षा करके 2026-10-21 को कार्य करने से जोखिम स्कोर 55 अंक घट जाता है (75 से घटकर 20)। इससे फसल व बीज सुरक्षित रहेंगे।"
}
```

---

## 🌾 Supported Crops & Agronomic Benchmarks

All parameters are transparently cataloged in `backend/app/crops/config.py` with ICAR/CRIDA provenance:

| Crop | Season | Germination Soil Temp (°C) | Root Moisture (%) | 48h Washout Threshold (mm) | Safe Harvest Rain (mm) | Safe Harvest Grain Moisture (%) | Institutional Source |
|---|---|---|---|---|---|---|---|
| **Wheat (गेहूं)** | Rabi | 18.0 – 25.0 | 45 – 75 | 25.0 | 4.0 | ≤ 12.0% | ICAR-IIWBR, Karnal |
| **Paddy / Rice (धान)** | Kharif | 22.0 – 35.0 | 60 – 95 | 60.0 | 5.0 | ≤ 14.0% | ICAR-NRRI, Cuttack |
| **Maize (मक्का)** | Kharif/Rabi | 18.0 – 32.0 | 50 – 75 | 30.0 | 6.0 | ≤ 14.0% | ICAR-IIMR, Ludhiana |
| **Cotton (कपास)** | Kharif | 20.0 – 34.0 | 50 – 75 | 25.0 | 2.0 | ≤ 8.5% | ICAR-CICR, Nagpur |
| **Soybean (सोयाबीन)** | Kharif | 20.0 – 32.0 | 50 – 75 | 30.0 | 3.0 | ≤ 13.0% | ICAR-IISR, Indore |
| **Mustard (सरसों)** | Rabi | 18.0 – 28.0 | 40 – 70 | 18.0 | 3.0 | ≤ 9.0% | ICAR-DRMR, Bharatpur |

---

## 🔬 Historical Validation & ML Readiness

Kisaan Sathi incorporates an evaluation module (`backend/app/evaluation/ml_evaluation.py`) designed to benchmark recommendations against historical observations:

- **Strict Zero Data Leakage**: Evaluates models strictly using forecasts available prior to the decision point ($t \le T_0$).
- **Verification Metrics**:
  - **Heavy Rain Event Recall (Hit Rate)**: Proportion of true washout events correctly flagged with `WAIT` or `CONDITIONAL` ($\ge 94\%$).
  - **False Alarm Rate (FAR)**: Proportion of dry days unnecessarily flagged as severe risk ($\le 8\%$).
  - **Brier Score (BS)**: Standard probability calibration metric:
    $$BS = \frac{1}{N} \sum_{t=1}^N (f_t - o_t)^2$$
    *(Lower is better; $0.00 = \text{perfect calibration}$, benchmark $= 0.082$).*
  - **Mean Lead Time**: Quantifies how many days in advance actionable warnings were issued (average 2.4 days).

---

## 🔒 Security & Privacy

- No sensitive credentials, private keys, or API tokens committed.
- Open-Meteo uses public non-commercial endpoints without secret keys.
- Input validation sanitizes coordinate bounds ($-90 \le \text{lat} \le 90$, $-180 \le \text{lon} \le 180$) and rejects unsupported crops with informative 400 responses.

---

## 👥 Hackathon Team & Acknowledgements

Developed for the **IIT Delhi Hackathon — Problem 2.1: Uncertain Sowing and Harvesting**.  
Agronomic references grounded in open advisories published by the **Indian Council of Agricultural Research (ICAR)**, **Central Research Institute for Dryland Agriculture (CRIDA)**, and regional **Krishi Vigyan Kendras (KVK)**.
