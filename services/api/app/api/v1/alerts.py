from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional

from services.api.app.db.session import get_db
from services.api.app.db.models import MonitoringAlert, User
from services.api.app.core.auth import get_current_user, get_current_merchant_scope

router = APIRouter(prefix="/alerts", tags=["Monitoring & Alerts"])

@router.get("")
async def list_alerts(
    current_user: User = Depends(get_current_user),
    scoped_merchant_id: str = Depends(get_current_merchant_scope),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(MonitoringAlert)
    if current_user.role == "MERCHANT":
        stmt = stmt.filter(MonitoringAlert.merchant_id == scoped_merchant_id)
    stmt = stmt.order_by(MonitoringAlert.detected_at.desc())

    res = await db.execute(stmt)
    alerts = res.scalars().all()

    # If no alerts in DB yet, supply realistic initial proactive monitors
    if not alerts and current_user.role == "MERCHANT":
        return {
            "ok": True,
            "data": [
                {
                    "id": "alt-settl-01",
                    "merchant_id": scoped_merchant_id,
                    "alert_type": "SETTLEMENT_MISMATCH",
                    "severity": "HIGH",
                    "title": "Settlement Anomaly Detected: ₹6,000 Unsettled",
                    "description": "Proactive reconciler detected ₹15,000 in eligible UPI captures, but morning batch #BATCH-2026-1114-01 disbursed ₹9,000. Order #ORD-8821 remains pending.",
                    "evidence": {
                        "expected": "₹15,000.00",
                        "observed": "₹9,000.00",
                        "discrepancy": "₹6,000.00",
                        "affected_order": "ORD-8821"
                    },
                    "recommended_action": "Submit for Settlement Operations Supervisor authorization",
                    "status": "ACTIVE",
                    "detected_at": "2026-11-14T07:30:00Z"
                },
                {
                    "id": "alt-dev-02",
                    "merchant_id": scoped_merchant_id,
                    "alert_type": "DEVICE_CONNECTIVITY",
                    "severity": "LOW",
                    "title": "Soundbox 4G: Indoor Signal Attenuation",
                    "description": "Device #SBOX-4G-9921 reporting 2/4 LTE bars. Recommended: Reposition device closer to counter entrance for instant audio chime latency.",
                    "evidence": {
                        "device_id": "SBOX-4G-9921",
                        "network": "Jio 4G LTE",
                        "bars": "2 / 4"
                    },
                    "recommended_action": "Relocate soundbox towards window or counter front",
                    "status": "ACTIVE",
                    "detected_at": "2026-11-14T10:15:00Z"
                }
            ],
            "meta": {"source_type": "SYNTHETIC_DEMO"},
            "error": None
        }

    return {
        "ok": True,
        "data": [
            {
                "id": a.id,
                "merchant_id": a.merchant_id,
                "alert_type": a.alert_type,
                "severity": a.severity,
                "title": a.title,
                "description": a.description,
                "evidence": a.evidence,
                "recommended_action": a.recommended_action,
                "status": a.status,
                "detected_at": a.detected_at.isoformat() if a.detected_at else None
            }
            for a in alerts
        ],
        "meta": {"source_type": "SYNTHETIC_DEMO"},
        "error": None
    }

@router.get("/{alert_id}")
async def get_alert(
    alert_id: str,
    current_user: User = Depends(get_current_user),
    scoped_merchant_id: str = Depends(get_current_merchant_scope),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(MonitoringAlert).filter(MonitoringAlert.id == alert_id)
    if current_user.role == "MERCHANT":
        stmt = stmt.filter(MonitoringAlert.merchant_id == scoped_merchant_id)

    res = await db.execute(stmt)
    alert = res.scalars().first()
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")

    return {
        "ok": True,
        "data": {
            "id": alert.id,
            "merchant_id": alert.merchant_id,
            "alert_type": alert.alert_type,
            "severity": alert.severity,
            "title": alert.title,
            "description": alert.description,
            "evidence": alert.evidence,
            "recommended_action": alert.recommended_action,
            "status": alert.status,
            "detected_at": alert.detected_at.isoformat() if alert.detected_at else None
        },
        "meta": {"source_type": "SYNTHETIC_DEMO"},
        "error": None
    }
