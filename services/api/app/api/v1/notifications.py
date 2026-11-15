from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional

from services.api.app.db.session import get_db
from services.api.app.db.models import Notification, User
from services.api.app.core.auth import get_current_user, get_current_merchant_scope

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("")
async def list_notifications(
    current_user: User = Depends(get_current_user),
    scoped_merchant_id: str = Depends(get_current_merchant_scope),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Notification).filter(Notification.merchant_id == scoped_merchant_id).order_by(Notification.created_at.desc())
    res = await db.execute(stmt)
    notifs = res.scalars().all()

    if not notifs:
        return {
            "ok": True,
            "data": [
                {
                    "id": "notif-01",
                    "merchant_id": scoped_merchant_id,
                    "title": "Investigation Case Created: OPS-2026-0001",
                    "message": "OpsSaathi AI opened settlement investigation for missing ₹6,000 (Order #ORD-8821). Assigned to Settlement Operations.",
                    "category": "INVESTIGATION",
                    "reference_id": "OPS-2026-0001",
                    "is_read": False,
                    "created_at": "2026-11-14T10:15:00Z"
                },
                {
                    "id": "notif-02",
                    "merchant_id": scoped_merchant_id,
                    "title": "Proactive Alert: Settlement Anomaly Detected",
                    "message": "₹6,000 discrepancy flagged between eligible captures and batch payout.",
                    "category": "ALERT",
                    "reference_id": "alt-settl-01",
                    "is_read": False,
                    "created_at": "2026-11-14T07:30:00Z"
                }
            ],
            "meta": {"source_type": "SYNTHETIC_DEMO"},
            "error": None
        }

    return {
        "ok": True,
        "data": [
            {
                "id": n.id,
                "merchant_id": n.merchant_id,
                "title": n.title,
                "message": n.message,
                "category": n.category,
                "reference_id": n.reference_id,
                "is_read": n.is_read,
                "created_at": n.created_at.isoformat() if n.created_at else None
            }
            for n in notifs
        ],
        "meta": {"source_type": "SYNTHETIC_DEMO"},
        "error": None
    }

@router.post("/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    scoped_merchant_id: str = Depends(get_current_merchant_scope),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Notification).filter(
        Notification.id == notification_id,
        Notification.merchant_id == scoped_merchant_id
    )
    res = await db.execute(stmt)
    notif = res.scalars().first()
    if not notif:
        return {
            "ok": True,
            "data": {"id": notification_id, "is_read": True},
            "meta": {"source_type": "SYNTHETIC_DEMO"},
            "error": None
        }

    notif.is_read = True
    await db.commit()

    return {
        "ok": True,
        "data": {"id": notif.id, "is_read": True},
        "meta": {"source_type": "SYNTHETIC_DEMO"},
        "error": None
    }
