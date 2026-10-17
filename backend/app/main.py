"""
Main FastAPI Application Entry Point for Kisaan Sathi.
Problem 2.1 — Uncertain Sowing and Harvesting Decision Intelligence Platform.
IIT Delhi Hackathon Solution.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .db.session import init_db
from .api.routers import health, weather, sowing, harvest, whatif, crops, feedback


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite / PostgreSQL tables on startup
    init_db()
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="""
# AI-Powered Sowing and Harvesting Risk Intelligence Platform
### Addressing Problem 2.1: Uncertain Sowing and Harvesting

Farmers face delayed monsoons, unseasonal downpours, dry spells, and harvest storms.
This platform provides:
* **Sowing Risk Intelligence**: Pre-emergence washout, seed rot, soil temperature, and germination moisture.
* **Harvest Risk Intelligence**: Wet harvest window, grain discoloration/mold, Mandi price discounts, and combine machinery trafficability.
* **What-If Analysis**: Explicit quantitative trade-offs of acting today versus waiting 3 or 5 days.
* **Transparent Uncertainty**: Lead time confidence decay, missing variable penalties, and zero synthetic claims.
* **Multilingual Agronomic Guidance**: Actionable advice in clear Hindi and English.
* **Zero Data Leakage Validation**: Brier score, recall, and false-alarm metrics on historical reanalysis.
    """,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Enable CORS for Streamlit, Next.js, and React frontends
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all routers
app.include_router(health.router)
app.include_router(weather.router)
app.include_router(sowing.router)
app.include_router(harvest.router)
app.include_router(whatif.router)
app.include_router(crops.router)
app.include_router(feedback.router)


@app.get("/", include_in_schema=False)
def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "health": "/health",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
