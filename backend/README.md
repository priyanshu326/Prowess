# SmartKisan: AI-Powered Smart Irrigation Decision Platform
### Solving Problem 2.3: Inefficient Irrigation for Indian Farmers

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB.svg?style=flat&logo=python)](https://python.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791.svg?style=flat&logo=postgresql)](https://www.postgresql.org/)
[![Pytest](https://img.shields.io/badge/Pytest-43%20Passing-brightgreen.svg?style=flat&logo=pytest)](https://pytest.org)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg?style=flat&logo=docker)](https://www.docker.com)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

---

## 1. Executive Summary

Over **80% of Indian agricultural water** is currently wasted due to unmanaged, calendar-based flood irrigation. Farmers routinely run diesel or electric tubewells on fixed schedules without knowing their true soil water deficit or whether monsoon downpours are imminent. This leads to:
* **Severe Groundwater Depletion**: Excess extraction from critical aquifers.
* **Exorbitant Operating Costs**: Pumping 4 to 6 hours on diesel engines costs ₹350–₹500 per irrigation turn.
* **Crop Diseases & Nutrient Leaching**: Over-irrigation on clay or vertisol soils causes waterlogging, anaerobic root asphyxiation, nitrogen fertilizer runoff, and fungal seedling collar rot (*Pythium* / *Rhizoctonia*).

**SmartKisan** provides an AI-powered smart irrigation platform that answers three essential questions for every farmer:
1. **When to irrigate**: Continuously evaluated against root-zone soil water balance.
2. **How much water to apply**: Exact depths in **millimetres** and volumes in **litres**, adjusted for irrigation efficiency (drip: 90%, sprinkler: 75%, furrow: 60%, flood: 45%).
3. **Whether to irrigate now or wait**: Rain-aware scheduling stops pumping when upcoming rainfall will naturally fulfill crop evapotranspiration.

---

## 2. Technology Stack

* **Backend Framework**: Python 3.11 + FastAPI (high-concurrency async endpoints, OpenAPI / Swagger documentation).
* **Database**: PostgreSQL (production) with SQLAlchemy ORM; SQLite fallback for instant zero-config testing.
* **Validation**: Pydantic V2 schemas with strict dimensional and type verification.
* **Authentication**: JWT (JSON Web Tokens) with bcrypt password hashing and farmer-level plot isolation.
* **Weather Integration**: OpenWeather API & Open-Meteo agro-weather provider with 30-min TTL caching and offline fallback.
* **Decision Engine**: Agronomic rule-based water-budget engine grounded in FAO-56 Penman-Monteith and ICAR benchmarks.
* **Testing**: Comprehensive Pytest suite covering all 9 Demo Acceptance Criteria.
* **Deployment**: Docker container and multi-service `docker-compose.yml` (FastAPI + PostgreSQL).

---

## 3. Scientifically Grounded Water Budget Engine

The decision engine evaluates irrigation requirements using classical soil-water balance physics:

### A. Crop Evapotranspiration ($ET_c$)
$$ET_c = ET_0 \times K_c$$
* $ET_0$: Reference evapotranspiration calculated via FAO-56 Penman-Monteith or Hargreaves method (mm/day).
* $K_c$: Crop coefficient dynamically determined by crop variety and phenological growth stage (e.g. Wheat: 0.35 at emergence, 1.15 at flowering, 0.30 at maturity).

### B. Effective Rainfall ($P_{eff}$)
Using USDA Soil Conservation Service (SCS) formula:
* If $P_{tot} < 5.0\text{ mm}$: $P_{eff} = 0.0$ (evaporates before entering root zone).
* If $5.0 \le P_{tot} \le 75.0\text{ mm}$: $P_{eff} = \max(0.0, P_{tot} \times 0.8 - 4.0\text{ mm})$.
* If $P_{tot} > 75.0\text{ mm}$: $P_{eff} = (75.0 \times 0.8 - 4.0) + (P_{tot} - 75.0) \times 0.5$.

### C. Root-Zone Soil Water Deficit ($SWD$)
$$SWD = \max\left(0.0, \frac{\theta_{FC} - \theta_{current}}{100} \times Z_r \times 1000\right)\text{ mm}$$
* $\theta_{FC}$: Soil Field Capacity percentage (e.g. 14% for Sandy, 22% for Sandy Loam, 34% for Clay Loam, 42% for Black Cotton Soil).
* $\theta_{current}$: Volumetric soil water content percentage from IoT sensor or water-balance estimate.
* $Z_r$: Effective root-zone depth in meters (0.20m–1.20m by crop stage).

### D. Gross Application Requirement ($I_{gross}$)
$$I_{net} = \max(0.0, SWD + ET_{c, 48h} - P_{eff, 48h})$$
$$I_{gross} = \frac{I_{net}}{\text{Efficiency}}$$
* Application Efficiencies: Drip ($90\%$), Sprinkler ($75\%$), Furrow ($60\%$), Flood ($45\%$).

### E. Dimensionally Verified Volume Conversion
$$1\text{ mm depth on }1\text{ m}^2 = 0.001\text{ m} \times 1\text{ m}^2 = 0.001\text{ m}^3 = 1.0\text{ Litre}$$
$$\text{Volume (Litres)} = I_{gross} (\text{mm}) \times \text{Field Area } (\text{m}^2)$$
*(For example, 10 mm depth over 1 Acre [$4,046.86\text{ m}^2$] requires exactly **40,468.6 Litres**).*

### F. Documented Baseline & Quantified Savings
* **Baseline**: Traditional Indian flood irrigation calendar applies a fixed depth of **65.0 mm** per turn.
* **Water Saved (Litres)**: $\max(0, \text{Baseline Litres} - \text{Recommended Litres})$. When decision is `WAIT` or `MONITOR`, 100% of an unneeded flood event is saved!
* **Pumping Hours Saved**: $\text{Water Saved (L)} / \text{Pump Flow Rate (L/h)}$.
* **Diesel Saved**: $\text{Hours Saved} \times 1.25\text{ L/h}$. Cost saved at ₹89/L.
* **Carbon Footprint Avoided**: Diesel emits $2.68\text{ kg CO}_2\text{/Litre}$.

---

## 4. API Endpoints Reference

All endpoints are documented interactively at `/docs` (Swagger UI) and `/redoc`.

| Method | Endpoint | Description | Auth Required |
|---|---|---|:---:|
| `POST` | `/api/v1/auth/register` | Register farmer account with email/phone & language | No |
| `POST` | `/api/v1/auth/login` | Authenticate farmer and receive Bearer JWT token | No |
| `GET` | `/api/v1/auth/me` | Fetch authenticated farmer profile | Yes (Bearer) |
| `POST` | `/api/v1/fields` | Create field plot (area, soil, crop, pump specs) | Yes (Bearer) |
| `GET` | `/api/v1/fields` | List authenticated farmer's fields (data isolation) | Yes (Bearer) |
| `GET` | `/api/v1/fields/{field_id}` | Get specific plot details (forbidden to other users) | Yes (Bearer) |
| `POST` | `/api/v1/sensor-readings` | Ingest IoT soil moisture telemetry or manual checks | Optional |
| `GET` | `/api/v1/weather/{field_id}` | Retrieve field weather, 7-day rain forecast & ET0 | No |
| `POST` | `/api/v1/irrigation/recommendation/{field_id}` | **Generate explainable smart irrigation recommendation** | Optional |
| `GET` | `/api/v1/irrigation/history/{field_id}` | Retrieve past recommendations and performed events | No |
| `POST` | `/api/v1/irrigation/events` | Record executed irrigation and update savings metrics | Optional |
| `GET` | `/api/v1/dashboard/{field_id}` | Field dashboard (moisture status, demand, savings) | No |
| `POST` | `/api/v1/irrigation/simulate` | **Hackathon Judge Simulation Runner** | No |
| `GET` | `/health` | System health check (database, weather latency) | No |

---

## 5. Structured Recommendation Output (Section 3.E Deliverable)

Every call to `POST /api/v1/irrigation/recommendation/{field_id}` returns rich, explainable JSON:

```json
{
  "field_id": "field_karnal_01",
  "decision": "IRRIGATE",
  "recommended_water_depth_mm": 54.1,
  "estimated_water_volume_litres": 547337.8,
  "suggested_irrigation_window": "Early morning (05:00 AM - 08:30 AM) or late evening (after 05:30 PM) to avoid solar evaporative loss",
  "confidence_level": "HIGH",
  "data_quality_status": "LIVE_FUSION",
  "reasons": [
    "Soil moisture (28.5%) is below the critical threshold (45.0%) for Wheat at crown_root_initiation stage.",
    "No meaningful rain forecast in next 72h (0.0 mm expected). Crop evapotranspiration is 2.5 mm/day."
  ],
  "reasons_hi": [
    "गेहूं की crown_root_initiation अवस्था में मिट्टी की नमी (28.5%) आवश्यक स्तर (45.0%) से कम हो गई है।",
    "अगले 3 दिनों में बारिश की कोई संभावना नहीं है। फसल को जल संकट से बचाने के लिए सिंचाई करें।"
  ],
  "expected_rainfall_mm": 0.0,
  "forecast_horizon_hours": 72,
  "crop_growth_stage": "crown_root_initiation",
  "soil_moisture_status": "MODERATE_DEFICIT",
  "soil_moisture_pct": 28.5,
  "etc_crop_water_demand_mm": 2.51,
  "effective_rainfall_mm": 0.0,
  "soil_water_deficit_mm": 19.25,
  "irrigation_efficiency_pct": 45.0,
  "baseline_water_volume_litres": 657614.8,
  "estimated_water_saved_litres": 110277.0,
  "estimated_cost_saved_inr": 490.39,
  "estimated_diesel_saved_litres": 5.51,
  "estimated_pumping_hours_saved": 4.41,
  "warnings": [],
  "timestamp": "2026-10-18T02:46:58Z",
  "next_reassessment_time": "2026-10-20T02:46:58Z"
}
```

---

## 6. Hackathon Features for Judges

1. **Rain-Aware Irrigation**: Prevents irrigation immediately before rainfall. If 25mm of rain is expected tomorrow, decision shifts to `WAIT`, conserving groundwater and saving fuel.
2. **Sensor + Weather Fusion**: Blends field moisture telemetry with gridded meteorological forecasts.
3. **Low-Cost Sensorless Mode**: Farmers without physical IoT probes are fully supported via weather-based soil water balance models, clearly flagged as `WEATHER_ONLY_ESTIMATE` with transparent uncertainty disclosure.
4. **Interactive Simulation Mode (`POST /api/v1/irrigation/simulate`)**: Lets judges test edge cases:
   * `dry_soil_no_rain` -> Triggers `IRRIGATE` with precise single application depth.
   * `adequate_moisture_rain_expected` -> Triggers `WAIT`, saving 100% of the baseline flood.
   * `heavy_rain_tomorrow` -> Triggers `WAIT` with severe waterlogging and urea leaching warnings.
   * `heatwave_high_et` -> Heightened crop water demand ($ET_c = 6.8\text{ mm/day}$).
   * `sandy_soil_fast_drainage` -> High infiltration ($45\text{ mm/hr}$), low water-holding capacity.
   * `clay_soil_waterlogging_risk` -> Low infiltration ($4\text{ mm/hr}$), flags root rot hazard.
   * `sensor_failure_low_confidence` -> Gracefully degrades to conservative weather-only estimate.
5. **Multi-Tenant Farmer Isolation**: Farmer A cannot view or manipulate Farmer B's plots.

---

## 7. Quickstart & Local Setup

### Option A: Local Python Environment
```bash
# 1. Clone repository & enter backend
cd backend

# 2. Install dependencies
pip install -r requirements.txt

# 3. Run automated tests (43 passing tests)
python3 -m pytest tests

# 4. Run interactive live demo
python3 demo_run.py

# 5. Start development server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
Open **http://localhost:8000/docs** in your browser.

### Option B: Docker & Docker Compose
```bash
cd backend
docker-compose up --build
```
This launches both the FastAPI service on port `8000` and a PostgreSQL 15 database on port `5432`.

---

## 8. Automated Pytest Verification

Run the entire test suite:
```bash
pytest tests/ -v
```
All **43 automated unit and integration tests** pass, verifying:
* Dry soil with zero expected rain triggers `IRRIGATE`.
* Adequate moisture with expected rain triggers `WAIT` or `MONITOR`.
* Heavy rainfall prevents irrigation and alerts on waterlogging.
* Crop stage dynamically alters $K_c$ and root depth.
* Different soil types produce appropriately distinct hydraulic behaviour.
* Missing telemetry reduces confidence rating to `LOW` and triggers warnings.
* Water-volume math is dimensionally exact ($1\text{ mm} \times 1\text{ m}^2 = 1\text{ Litre}$).
* Multi-tenant farmer data isolation is strictly enforced via JWT.
* Savings are derived against documented baseline, never invented.
