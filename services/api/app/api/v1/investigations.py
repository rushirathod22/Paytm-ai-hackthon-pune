from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from services.api.app.db.session import get_db
from services.api.app.db.models import InvestigationRun, SupportCase, CaseEvent, User, get_utc_now
from services.api.app.core.auth import get_current_user, get_current_merchant_scope
from services.api.app.domain.case_service import CaseService

router = APIRouter(prefix="/investigations", tags=["Investigations"])

class EscalateRequest(BaseModel):
    notes: Optional[str] = "Merchant requested supervisor escalation after automated settlement investigation."
    priority: Optional[str] = "HIGH"

@router.get("/{investigation_id}")
async def get_investigation(
    investigation_id: str,
    current_user: User = Depends(get_current_user),
    scoped_merchant_id: str = Depends(get_current_merchant_scope),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(InvestigationRun).filter(InvestigationRun.id == investigation_id)
    if current_user.role == "MERCHANT":
        stmt = stmt.filter(InvestigationRun.merchant_id == scoped_merchant_id)

    res = await db.execute(stmt)
    inv = res.scalars().first()
    if not inv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investigation record not found")

    case_number = None
    if inv.case_id:
        c_stmt = select(SupportCase).filter(SupportCase.id == inv.case_id)
        c_res = await db.execute(c_stmt)
        c = c_res.scalars().first()
        if c:
            case_number = c.case_number

    return {
        "ok": True,
        "data": {
            "investigation_id": inv.id,
            "merchant_id": inv.merchant_id,
            "complaint_category": inv.complaint_category,
            "expected_amount": str(inv.expected_amount),
            "actual_credited_amount": str(inv.actual_credited_amount) if inv.actual_credited_amount else None,
            "status": inv.status,
            "case_id": inv.case_id,
            "case_number": case_number,
            "summary_explanation": inv.summary_explanation,
            "evidence_summary": inv.evidence_summary,
            "created_at": inv.created_at.isoformat(),
            "updated_at": inv.updated_at.isoformat()
        },
        "meta": {"source_type": "SYNTHETIC_DEMO"},
        "error": None
    }

@router.get("/{investigation_id}/timeline")
async def get_investigation_timeline(
    investigation_id: str,
    current_user: User = Depends(get_current_user),
    scoped_merchant_id: str = Depends(get_current_merchant_scope),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(InvestigationRun).filter(InvestigationRun.id == investigation_id)
    if current_user.role == "MERCHANT":
        stmt = stmt.filter(InvestigationRun.merchant_id == scoped_merchant_id)

    res = await db.execute(stmt)
    inv = res.scalars().first()
    if not inv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investigation record not found")

    timeline = (inv.evidence_summary or {}).get("timeline", [])
    return {
        "ok": True,
        "data": {
            "investigation_id": inv.id,
            "timeline": timeline
        },
        "meta": {"source_type": "SYNTHETIC_DEMO"},
        "error": None
    }

@router.post("/{investigation_id}/escalate")
async def escalate_investigation(
    investigation_id: str,
    req: EscalateRequest,
    current_user: User = Depends(get_current_user),
    scoped_merchant_id: str = Depends(get_current_merchant_scope),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(InvestigationRun).filter(InvestigationRun.id == investigation_id)
    if current_user.role == "MERCHANT":
        stmt = stmt.filter(InvestigationRun.merchant_id == scoped_merchant_id)

    res = await db.execute(stmt)
    inv = res.scalars().first()
    if not inv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investigation record not found")

    # If case exists, transition status to ESCALATED
    if inv.case_id:
        c_stmt = select(SupportCase).filter(SupportCase.id == inv.case_id)
        c_res = await db.execute(c_stmt)
        case = c_res.scalars().first()
        if case:
            case.status = "ESCALATED"
            case.priority = req.priority or "HIGH"
            case.updated_at = get_utc_now()
            event = CaseEvent(
                case_id=case.id,
                actor=current_user.name,
                event_type="STATUS_CHANGE",
                from_status="INVESTIGATING",
                to_status="ESCALATED",
                visibility="MERCHANT_VISIBLE",
                payload={"notes": req.notes, "escalated_by": current_user.name}
            )
            db.add(event)
    else:
        # Create support case
        case = await CaseService.create_case(
            db=db,
            merchant_id=inv.merchant_id,
            category="SETTLEMENT_MISMATCH",
            summary=f"Escalated Settlement Investigation #{inv.id}: {inv.complaint_category}",
            idempotency_key=f"escalate-{inv.id}",
            priority=req.priority or "HIGH",
            queue="SETTLEMENT_OPS",
            evidence=inv.evidence_summary
        )
        inv.case_id = case.id

    inv.status = "ESCALATED"
    inv.updated_at = get_utc_now()
    await db.commit()

    return {
        "ok": True,
        "data": {
            "investigation_id": inv.id,
            "case_id": inv.case_id,
            "queue": "SETTLEMENT_OPS",
            "status": "ESCALATED",
            "message": "Investigation successfully escalated to Settlement Operations Supervisor."
        },
        "meta": {"source_type": "SYNTHETIC_DEMO"},
        "error": None
    }
