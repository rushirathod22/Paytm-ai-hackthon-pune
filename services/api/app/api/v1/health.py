from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from services.api.app.db.session import get_db, engine, Base
from services.api.app.db.seed import seed_data
from services.api.app.core.config import settings
from services.api.app.integrations.gemini.client import gemini_client
from services.api.app.integrations.paytm.adapter import paytm_adapter

router = APIRouter(tags=["Health"])

@router.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    db_healthy = False
    try:
        await db.execute(text("SELECT 1"))
        db_healthy = True
    except Exception:
        db_healthy = False

    return {
        "ok": True,
        "data": {
            "status": "healthy" if db_healthy else "degraded",
            "version": settings.VERSION,
            "components": {
                "database": "UP" if db_healthy else "DOWN",
                "llm_provider": "GEMINI_LIVE" if gemini_client.is_available() else "MOCK_DETERMINISTIC_FALLBACK",
                "paytm_adapter": "STAGING_CONFIGURED" if paytm_adapter.is_configured() else "SYNTHETIC_FIXTURE_MODE",
                "voice_engine": "BROWSER_SPEECH_API_ACTIVE",
                "demo_mode": settings.DEMO_DATA_MODE
            }
        },
        "meta": {"source_type": "SYNTHETIC_DEMO"},
        "error": None
    }

@router.post("/health/reset-demo")
async def reset_demo_database():
    """Demo Safety Reset Button: Resets demo ledger to initial golden scenario."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    await seed_data()
    return {
        "ok": True,
        "data": {
            "message": "Demo scenario reset successfully. Sharma Sweets has ₹15,000 captures, ₹9,000 settled, and ₹6,000 pending discrepancy."
        },
        "meta": {"source_type": "SYNTHETIC_DEMO"},
        "error": None
    }
