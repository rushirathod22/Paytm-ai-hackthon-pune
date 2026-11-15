from fastapi import APIRouter, Depends, HTTPException, Header, Query, status
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from services.api.app.db.session import get_db
from services.api.app.db.models import (
    SupportCase, CaseEvent, Approval, User, Transaction, SettlementBatch, SettlementEntry, get_utc_now
)
from services.api.app.core.auth import get_current_user, get_current_merchant_scope, require_role
from services.api.app.domain.case_service import CaseService
from services.api.app.domain.verification import VerifierService
from services.api.app.domain.policy import PolicyEngine
from services.api.app.integrations.sarvam.client import sarvam_adapter

router = APIRouter(prefix="/cases", tags=["Cases"])

class CaseCreateRequest(BaseModel):
    category: str = "SETTLEMENT_MISMATCH"
    priority: str = "HIGH"
    summary: str
    queue: str = "SETTLEMENT_OPS"
    evidence: Optional[Dict[str, Any]] = None

class ApprovalDecisionRequest(BaseModel):
    action: str = "APPROVE_REMEDIATION"
    notes: Optional[str] = None

class RejectDecisionRequest(BaseModel):
    reason: str

class AssignQueueRequest(BaseModel):
    queue: str

@router.get("")
async def list_cases(
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(get_current_user),
    scoped_merchant_id: str = Depends(get_current_merchant_scope),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(SupportCase)
    # Merchants only see their own cases; Support sees all
    if current_user.role == "MERCHANT":
        stmt = stmt.filter(SupportCase.merchant_id == scoped_merchant_id)
    if status_filter:
        stmt = stmt.filter(SupportCase.status == status_filter)

    stmt = stmt.order_by(SupportCase.created_at.desc())
    res = await db.execute(stmt)
    cases = res.scalars().all()

    return {
        "ok": True,
        "data": [
            {
                "id": c.id,
                "case_number": c.case_number,
                "merchant_id": c.merchant_id,
                "category": c.category,
                "priority": c.priority,
                "status": c.status,
                "queue": c.queue,
                "summary": c.summary,
                "created_at": c.created_at.isoformat(),
                "updated_at": c.updated_at.isoformat()
            }
            for c in cases
        ],
        "meta": {"total": len(cases), "source_type": "SYNTHETIC_DEMO"},
        "error": None
    }

@router.post("")
async def create_case(
    req: CaseCreateRequest,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    current_user: User = Depends(get_current_user),
    scoped_merchant_id: str = Depends(get_current_merchant_scope),
    db: AsyncSession = Depends(get_db)
):
    key = idempotency_key or f"case-auto-{scoped_merchant_id}-{get_utc_now().timestamp()}"
    new_case = await CaseService.create_case(
        db=db,
        merchant_id=scoped_merchant_id,
        category=req.category,
        summary=req.summary,
        idempotency_key=key,
        priority=req.priority,
        queue=req.queue,
        evidence=req.evidence,
        actor=current_user.name
    )

    return {
        "ok": True,
        "data": {
            "id": new_case.id,
            "case_number": new_case.case_number,
            "category": new_case.category,
            "priority": new_case.priority,
            "status": new_case.status,
            "queue": new_case.queue,
            "summary": new_case.summary,
            "created_at": new_case.created_at.isoformat()
        },
        "meta": {"source_type": "SYNTHETIC_DEMO"},
        "error": None
    }

@router.get("/{id}")
async def get_case_detail(
    id: str,
    current_user: User = Depends(get_current_user),
    scoped_merchant_id: str = Depends(get_current_merchant_scope),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(SupportCase).filter(SupportCase.id == id)
    if current_user.role == "MERCHANT":
        stmt = stmt.filter(SupportCase.merchant_id == scoped_merchant_id)

    res = await db.execute(stmt)
    case = res.scalars().first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    # Get events
    ev_stmt = select(CaseEvent).filter(CaseEvent.case_id == case.id)
    if current_user.role == "MERCHANT":
        ev_stmt = ev_stmt.filter(CaseEvent.visibility == "MERCHANT_VISIBLE")
    ev_stmt = ev_stmt.order_by(CaseEvent.created_at.asc())
    ev_res = await db.execute(ev_stmt)
    events = ev_res.scalars().all()

    # Get approvals
    app_stmt = select(Approval).filter(Approval.case_id == case.id)
    app_res = await db.execute(app_stmt)
    approvals = app_res.scalars().all()

    return {
        "ok": True,
        "data": {
            "id": case.id,
            "case_number": case.case_number,
            "merchant_id": case.merchant_id,
            "category": case.category,
            "priority": case.priority,
            "status": case.status,
            "queue": case.queue,
            "summary": case.summary,
            "created_at": case.created_at.isoformat(),
            "updated_at": case.updated_at.isoformat(),
            "events": [
                {
                    "id": e.id,
                    "actor": e.actor,
                    "event_type": e.event_type,
                    "from_status": e.from_status,
                    "to_status": e.to_status,
                    "visibility": e.visibility,
                    "payload": e.payload,
                    "created_at": e.created_at.isoformat()
                }
                for e in events
            ],
            "approvals": [
                {
                    "id": a.id,
                    "action": a.action,
                    "requested_by": a.requested_by,
                    "decided_by": a.decided_by,
                    "decision": a.decision,
                    "status": a.status,
                    "reason": a.reason,
                    "created_at": a.created_at.isoformat()
                }
                for a in approvals
            ]
        },
        "meta": {"source_type": "SYNTHETIC_DEMO"},
        "error": None
    }

@router.post("/{id}/approve")
async def approve_case_action(
    id: str,
    req: ApprovalDecisionRequest,
    current_user: User = Depends(require_role(["SUPPORT_AGENT", "SUPERVISOR"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Authorized Support / Supervisor approves remediation.
    Simulates settlement ledger credit for the missing transaction,
    then transitions case to IN_PROGRESS.
    """
    stmt = select(SupportCase).filter(SupportCase.id == id)
    res = await db.execute(stmt)
    case = res.scalars().first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    # Update approval record
    app_stmt = select(Approval).filter(Approval.case_id == case.id, Approval.decision == "PENDING")
    app_res = await db.execute(app_stmt)
    approval = app_res.scalars().first()
    if approval:
        approval.decision = "APPROVED"
        approval.status = "APPROVED"
        approval.decided_by = current_user.name
        approval.reason = req.notes or "Remediation verified and authorized by Operations Supervisor."

    # Update settlement ledger for missing transaction ORD-8821 if this is a settlement mismatch
    if case.category == "SETTLEMENT_MISMATCH":
        txn_stmt = select(Transaction).filter(
            Transaction.merchant_id == case.merchant_id,
            Transaction.order_id == "ORD-8821"
        )
        txn_res = await db.execute(txn_stmt)
        txn = txn_res.scalars().first()

        batch_stmt = select(SettlementBatch).filter(SettlementBatch.merchant_id == case.merchant_id).limit(1)
        batch_res = await db.execute(batch_stmt)
        batch = batch_res.scalars().first()

        if txn and batch:
            # Check if already has entry
            e_stmt = select(SettlementEntry).filter(SettlementEntry.transaction_id == txn.id)
            e_res = await db.execute(e_stmt)
            entry = e_res.scalars().first()
            if not entry:
                new_entry = SettlementEntry(
                    batch_id=batch.id,
                    transaction_id=txn.id,
                    amount=txn.amount,
                    entry_type="PAYMENT",
                    status="SETTLED",
                    source_type="SYNTHETIC_DEMO"
                )
                db.add(new_entry)
                batch.gross += txn.amount
                batch.net += txn.amount

    remediation_reason = req.notes or (
        "Remediation approved by supervisor. Payout credited to settlement ledger."
        if case.category == "SETTLEMENT_MISMATCH"
        else "Supervisor approved replacement Soundbox 4G priority dispatch."
        if case.category == "QR_DEVICE_ISSUE"
        else "Remediation verified and authorized by supervisor."
    )

    # Transition case to IN_PROGRESS
    case = await CaseService.transition_status(
        db=db,
        case=case,
        to_status="IN_PROGRESS",
        actor=current_user.name,
        actor_role=current_user.role,
        reason=remediation_reason,
        payload={"approved_by": current_user.name}
    )

    return {
        "ok": True,
        "data": {
            "case_id": case.id,
            "status": case.status,
            "message": "Remediation approved successfully. Ledger updated. Next step: Run verification."
        },
        "meta": {"source_type": "SYNTHETIC_DEMO"},
        "error": None
    }

@router.post("/{id}/reject")
async def reject_case_action(
    id: str,
    req: RejectDecisionRequest,
    current_user: User = Depends(require_role(["SUPPORT_AGENT", "SUPERVISOR"])),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(SupportCase).filter(SupportCase.id == id)
    res = await db.execute(stmt)
    case = res.scalars().first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    # Update approval
    app_stmt = select(Approval).filter(Approval.case_id == case.id, Approval.decision == "PENDING")
    app_res = await db.execute(app_stmt)
    approval = app_res.scalars().first()
    if approval:
        approval.decision = "REJECTED"
        approval.status = "REJECTED"
        approval.decided_by = current_user.name
        approval.reason = req.reason

    # Add event
    event = CaseEvent(
        case_id=case.id,
        actor=current_user.name,
        event_type="APPROVAL_REJECTED",
        from_status=case.status,
        to_status=case.status,
        visibility="MERCHANT_VISIBLE",
        payload={"reason": req.reason}
    )
    db.add(event)
    await db.commit()

    return {
        "ok": True,
        "data": {"case_id": case.id, "status": case.status, "message": "Approval rejected."},
        "meta": {"source_type": "SYNTHETIC_DEMO"},
        "error": None
    }

@router.post("/{id}/verify")
async def verify_case(
    id: str,
    current_user: User = Depends(get_current_user),
    scoped_merchant_id: str = Depends(get_current_merchant_scope),
    db: AsyncSession = Depends(get_db)
):
    """
    Independent Verification Check.
    Runs fresh read against ledger. Only upon PASS will case transition to RESOLVED.
    """
    stmt = select(SupportCase).filter(SupportCase.id == id)
    res = await db.execute(stmt)
    case = res.scalars().first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    # Run verification check
    ver_res = await VerifierService.verify_case(db, case)

    if ver_res.passed:
        # Move to VERIFYING then RESOLVED
        case.status = "RESOLVED"
        case.updated_at = get_utc_now()
        
        event = CaseEvent(
            case_id=case.id,
            actor="INDEPENDENT_VERIFIER",
            event_type="VERIFICATION_ATTEMPT",
            from_status="IN_PROGRESS",
            to_status="RESOLVED",
            visibility="MERCHANT_VISIBLE",
            payload={"passed": True, "reason": ver_res.reason, "details": ver_res.details}
        )
        db.add(event)
        await db.commit()
        await db.refresh(case)

        # Autonomous resolution callback synthesis via Sarvam AI
        if case.category == "QR_DEVICE_ISSUE":
            callback_msg = (
                f"Namaste Sharma Ji! Good news. Your Paytm Soundbox 4G service request under case {case.case_number} "
                f"has been verified. A priority replacement device has been dispatched to your store. "
                f"Your support case is now resolved. Thank you for choosing Paytm!"
            )
        elif case.category == "REFUND_STATUS":
            callback_msg = (
                f"Namaste Sharma Ji! Good news. Your refund request under case {case.case_number} "
                f"has been verified and approved by the supervisor. Thank you for choosing Paytm!"
            )
        else:
            callback_msg = (
                f"Namaste Sharma Ji! Good news. Your missing payment of Rupees 6,000 for Order ORD-8821 "
                f"has been verified and settled to your bank account. Your support case {case.case_number} "
                f"is now successfully resolved. Thank you for choosing Paytm!"
            )
        callback_audio_b64 = None
        if sarvam_adapter.is_configured():
            try:
                callback_audio_b64 = await sarvam_adapter.synthesize_speech(callback_msg)
            except Exception:
                callback_audio_b64 = None

        merchant_phone = "+91 9545696585"

        return {
            "ok": True,
            "data": {
                "case_id": case.id,
                "case_number": case.case_number,
                "status": "RESOLVED",
                "verified": True,
                "reason": ver_res.reason,
                "verified_at": ver_res.verified_at,
                "callback_message": callback_msg,
                "callback_audio_base64": callback_audio_b64,
                "merchant_phone": merchant_phone,
                "trigger_outbound_call": True
            },
            "meta": {"source_type": "SYNTHETIC_DEMO"},
            "error": None
        }
    else:
        # Verification failed! Remains IN_PROGRESS. Case CANNOT resolve.
        event = CaseEvent(
            case_id=case.id,
            actor="INDEPENDENT_VERIFIER",
            event_type="VERIFICATION_ATTEMPT",
            from_status=case.status,
            to_status=case.status,
            visibility="MERCHANT_VISIBLE",
            payload={"passed": False, "reason": ver_res.reason, "details": ver_res.details}
        )
        db.add(event)
        await db.commit()

        return {
            "ok": False,
            "data": {
                "case_id": case.id,
                "status": case.status,
                "verified": False,
                "reason": ver_res.reason,
                "verified_at": ver_res.verified_at
            },
            "meta": {"source_type": "SYNTHETIC_DEMO"},
            "error": {
                "code": "VERIFICATION_FAILED",
                "message": ver_res.reason
            }
        }
