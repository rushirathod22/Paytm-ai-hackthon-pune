from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging

from services.api.app.core.config import settings
from services.api.app.db.session import engine, Base
from services.api.app.db.seed import seed_data
from services.api.app.api.v1.auth import router as auth_router
from services.api.app.api.v1.merchants import router as merchants_router
from services.api.app.api.v1.transactions import router as transactions_router
from services.api.app.api.v1.settlements import router as settlements_router
from services.api.app.api.v1.agent import router as agent_router
from services.api.app.api.v1.voice import router as voice_router
from services.api.app.api.v1.cases import router as cases_router
from services.api.app.api.v1.webhooks import router as webhooks_router
from services.api.app.api.v1.health import router as health_router
from services.api.app.api.v1.investigations import router as investigations_router
from services.api.app.api.v1.alerts import router as alerts_router
from services.api.app.api.v1.notifications import router as notifications_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("opssaathi")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing OpsSaathi AI Backend...")
    # Initialize DB tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    # Seed data if demo mode
    if settings.DEMO_DATA_MODE:
        try:
            await seed_data()
        except Exception as e:
            logger.warning(f"Seed initialization notice: {e}")
    yield
    logger.info("Shutting down OpsSaathi AI Backend...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Autonomous Merchant Operations Teammate - Engineering Source of Truth",
    lifespan=lifespan
)

# CORS Middleware
origins = [
    settings.FRONTEND_ORIGIN,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Standard Error Handling
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global unhandled error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "ok": False,
            "data": None,
            "meta": {"source_type": "SYNTHETIC_DEMO"},
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": str(exc)
            }
        }
    )

# Include v1 Routers
api_v1_prefix = "/api/v1"
app.include_router(auth_router, prefix=api_v1_prefix)
app.include_router(merchants_router, prefix=api_v1_prefix)
app.include_router(transactions_router, prefix=api_v1_prefix)
app.include_router(settlements_router, prefix=api_v1_prefix)
app.include_router(agent_router, prefix=api_v1_prefix)
app.include_router(voice_router, prefix=api_v1_prefix)
app.include_router(cases_router, prefix=api_v1_prefix)
app.include_router(investigations_router, prefix=api_v1_prefix)
app.include_router(alerts_router, prefix=api_v1_prefix)
app.include_router(notifications_router, prefix=api_v1_prefix)
app.include_router(webhooks_router, prefix=api_v1_prefix)
app.include_router(health_router, prefix=api_v1_prefix)

@app.get("/")
async def root():
    return {
        "ok": True,
        "product": "OpsSaathi AI",
        "tagline": "Don't just respond. Investigate. Act. Verify.",
        "team": "Two Bits",
        "version": settings.VERSION,
        "docs_url": "/docs"
    }
