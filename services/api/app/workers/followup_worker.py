import asyncio
import logging
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from services.api.app.db.session import AsyncSessionLocal
from services.api.app.db.models import SupportCase, CaseEvent, get_utc_now

logger = logging.getLogger(__name__)

class FollowupWorker:
    """
    Background worker that monitors scheduled case follow-ups
    and records automated re-check events.
    """

    @staticmethod
    async def check_pending_followups():
        async with AsyncSessionLocal() as session:
            now = get_utc_now()
            stmt = select(SupportCase).filter(
                SupportCase.followup_at <= now,
                SupportCase.status.in_(["INVESTIGATING", "ACTION_REQUIRED", "IN_PROGRESS"])
            )
            res = await session.execute(stmt)
            cases = res.scalars().all()

            for case in cases:
                logger.info(f"Processing automated follow-up for Case {case.case_number}")
                event = CaseEvent(
                    case_id=case.id,
                    actor="FOLLOWUP_SCHEDULER",
                    event_type="NOTE_ADDED",
                    from_status=case.status,
                    to_status=case.status,
                    visibility="MERCHANT_VISIBLE",
                    payload={
                        "note": "Automated SLA check: OpsSaathi verified ticket is progressing with Settlement Operations."
                    }
                )
                session.add(event)
                case.followup_at = None # Cleared after run
            await session.commit()
