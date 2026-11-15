import hashlib
import json
from fastapi import APIRouter, Header, HTTPException, Request, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from services.api.app.db.session import get_db
from services.api.app.db.models import WebhookEvent
from services.api.app.integrations.paytm.adapter import paytm_adapter
from services.api.app.core.config import settings

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])

@router.post("/paytm")
async def paytm_webhook(
    request: Request,
    x_paytm_signature: str = Header(None, alias="X-Paytm-Signature"),
    db: AsyncSession = Depends(get_db)
):
    try:
        raw_body = await request.body()
        payload = json.loads(raw_body.decode("utf-8"))
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid JSON payload")

    event_id = payload.get("orderId") or payload.get("MID") or f"evt-{hash(raw_body)}"
    payload_hash = hashlib.sha256(raw_body).hexdigest()

    # Deduplication check
    stmt = select(WebhookEvent).filter(WebhookEvent.payload_hash == payload_hash)
    res = await db.execute(stmt)
    existing = res.scalars().first()
    if existing:
        return {
            "ok": True,
            "data": {"status": "DUPLICATE_IGNORED", "event_id": existing.event_id},
            "meta": {"source_type": "PAYTM_STAGING"},
            "error": None
        }

    # Verify signature if configured
    sig_valid = True
    if paytm_adapter.is_configured() and x_paytm_signature:
        sig_valid = paytm_adapter.verify_webhook_checksum(payload, x_paytm_signature)

    webhook_event = WebhookEvent(
        provider="PAYTM",
        event_id=event_id,
        signature_valid=sig_valid,
        payload_hash=payload_hash,
        payload=payload,
        status="PROCESSED" if sig_valid else "FAILED"
    )
    db.add(webhook_event)
    await db.commit()

    return {
        "ok": sig_valid,
        "data": {
            "event_id": event_id,
            "signature_valid": sig_valid,
            "status": "PROCESSED" if sig_valid else "FAILED"
        },
        "meta": {"source_type": "PAYTM_STAGING"},
        "error": None if sig_valid else {"code": "INVALID_SIGNATURE", "message": "Signature verification failed"}
    }
