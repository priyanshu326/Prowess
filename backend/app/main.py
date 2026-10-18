"""
Main FastAPI Application Entry Point for SmartKisan.
Production-ready backend for Problem 2.3: Inefficient Irrigation for Indian farmers.
Features:
- AI-Powered Smart Irrigation Decision Engine (IRRIGATE / WAIT / MONITOR)
- Scientifically Grounded Water Budget Calculator (ETc = ET0 * Kc, Deficit, Infiltration)
- Rain-Aware Delay & Waterlogging Risk Mitigation
- Real-Time Weather Integration (OpenWeather / Open-Meteo with caching and offline mock)
- IoT Sensor Telemetry & Sensorless Mode for resource-poor farmers
- Quantified Economic & Water Savings against Documented Baseline
- JWT-Based Authentication with strict farmer-level data isolation
- Interactive Simulation Mode for Judge Testing
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .db.session import init_db, SessionLocal
from .db.seed import seed_demo_farms
from .api.routers import (
    health,
    auth,
    fields,
    sensor_readings,
    irrigation,
    weather,
    dashboard,
    farm_profile,
    observations,
    risk,
    recommendations,
    crops,
    sowing,
    harvest,
    whatif,
    feedback,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Initialize SQLite / PostgreSQL tables
    init_db()

    # 2. Seed initial smallholder demo farms, fields, crop & soil benchmarks
    db = SessionLocal()
    try:
        seed_demo_farms(db)
    finally:
        db.close()

    yield


app = FastAPI(
    title="SmartKisan - AI-Powered Smart Irrigation Platform",
    version=settings.APP_VERSION,
    description="""
# SmartKisan: AI-Powered Smart Irrigation Platform
### Solving Problem 2.3: Inefficient Irrigation for Indian Farmers

SmartKisan provides an intelligent, rain-aware agricultural decision engine that tells farmers:
* **When to irrigate**: Based on real root-zone soil moisture and upcoming rain.
* **How much water to apply**: Exact depths in **millimetres** and volumes in **litres** based on field area and method efficiency.
* **Whether to irrigate now or wait**: Rain-aware scheduling stops pumping when upcoming rain naturally fulfills crop demand.
* **Quantified Savings**: Tracks litres of water, diesel fuel / electricity units, and ₹ cost saved against a documented flood irrigation baseline.

### Key REST APIs:
1. `POST /api/v1/auth/register` — Register a new farmer.
2. `POST /api/v1/auth/login` — Authenticate and receive a JWT token.
3. `POST /api/v1/fields` — Create an agricultural plot with crop, soil, and pump specifications.
4. `GET /api/v1/fields` — List the authenticated farmer's fields (farmer-level data isolation).
5. `POST /api/v1/sensor-readings` — Submit soil moisture telemetry or manual observations.
6. `GET /api/v1/weather/{field_id}` — Retrieve field-specific weather, rainfall forecasts, and ET0.
7. `POST /api/v1/irrigation/recommendation/{field_id}` — Generate explainable, rain-aware irrigation recommendation.
8. `GET /api/v1/irrigation/history/{field_id}` — Retrieve previous recommendations and irrigation events.
9. `POST /api/v1/irrigation/events` — Record actual irrigation performed and update cumulative savings.
10. `GET /api/v1/dashboard/{field_id}` — Field status, water demand, weather risk, and savings dashboard.
11. `POST /api/v1/irrigation/simulate` — Simulation Mode for judges to test scenarios (dry soil, rain in 2h, heavy rain, etc.).
    """,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Enable CORS for React, Streamlit, and mobile web clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Smart Irrigation Core Routers
app.include_router(health.router)
app.include_router(auth.router)
app.include_router(fields.router)
app.include_router(sensor_readings.router)
app.include_router(irrigation.router)
app.include_router(weather.router)
app.include_router(dashboard.router)

# Mount Crop Catalog & Agronomic Analysis Routers
app.include_router(farm_profile.router)
app.include_router(observations.router)
app.include_router(risk.router)
app.include_router(recommendations.router)
app.include_router(crops.router)
app.include_router(sowing.router)
app.include_router(harvest.router)
app.include_router(whatif.router)
app.include_router(feedback.router)


@app.get("/", include_in_schema=False)
def root():
    return {
        "app": "SmartKisan - AI-Powered Smart Irrigation Platform",
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "health": "/health",
        "demo_fields": ["field_karnal_01", "field_akola_02", "field_bharatpur_03"],
        "endpoints": {
            "auth_register": "POST /api/v1/auth/register",
            "auth_login": "POST /api/v1/auth/login",
            "fields_create": "POST /api/v1/fields",
            "fields_list": "GET /api/v1/fields",
            "sensor_readings": "POST /api/v1/sensor-readings",
            "field_weather": "GET /api/v1/weather/{field_id}",
            "irrigation_recommendation": "POST /api/v1/irrigation/recommendation/{field_id}",
            "irrigation_history": "GET /api/v1/irrigation/history/{field_id}",
            "irrigation_events": "POST /api/v1/irrigation/events",
            "dashboard": "GET /api/v1/dashboard/{field_id}",
            "simulate": "POST /api/v1/irrigation/simulate",
        },
    }
