from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status

from services.api.app.db.models import SupportCase, CaseEvent, Approval, get_utc_now
from services.api.app.domain.policy import PolicyEngine

VALID_TRANSITIONS = {
    "NEW": ["TRIAGED", "INVESTIGATING", "CANCELLED"],
    "TRIAGED": ["INVESTIGATING", "ACTION_REQUIRED", "CANCELLED"],
    "INVESTIGATING": ["ACTION_REQUIRED", "AWAITING_APPROVAL", "IN_PROGRESS", "CANCELLED"],
    "ACTION_REQUIRED": ["AWAITING_APPROVAL", "IN_PROGRESS", "ESCALATED"],
    "AWAITING_APPROVAL": ["IN_PROGRESS", "ACTION_REQUIRED", "ESCALATED", "CANCELLED"],
    "IN_PROGRESS": ["PENDING_EXTERNAL", "VERIFYING", "ESCALATED"],
    "PENDING_EXTERNAL": ["IN_PROGRESS", "VERIFYING", "ESCALATED"],
    "VERIFYING": ["RESOLVED", "IN_PROGRESS"],
    "RESOLVED": ["IN_PROGRESS"], # reopen
    "ESCALATED": ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
    "CANCELLED": []
}

class CaseService:
    @staticmethod
    async def create_case(
        db: AsyncSession,
        merchant_id: str,
        category: str,
        summary: str,
        idempotency_key: str,
        priority: str = "HIGH",
        queue: str = "SETTLEMENT_OPS",
        evidence: Optional[Dict[str, Any]] = None,
        actor: str = "AGENT"
    ) -> SupportCase:
        # Check idempotency
        stmt = select(SupportCase).filter(SupportCase.idempotency_key == idempotency_key)
        res = await db.execute(stmt)
        existing_case = res.scalars().first()
        if existing_case:
            return existing_case

        # Generate readable case number
        case_count_stmt = select(SupportCase)
        case_res = await db.execute(case_count_stmt)
        case_idx = len(case_res.scalars().all()) + 1
        case_number = f"OPS-2026-{case_idx:04d}"

        new_case = SupportCase(
            merchant_id=merchant_id,
            case_number=case_number,
            category=category,
            priority=priority,
            status="INVESTIGATING",
            queue=queue,
            summary=summary,
            idempotency_key=idempotency_key
        )
        db.add(new_case)
        await db.flush()

        # Add initial timeline event
        event = CaseEvent(
            case_id=new_case.id,
            actor=actor,
            event_type="STATUS_CHANGE",
            from_status="NEW",
            to_status="INVESTIGATING",
            visibility="MERCHANT_VISIBLE",
            payload={"summary": summary, "evidence": evidence or {}}
        )
        db.add(event)
        await db.commit()
        await db.refresh(new_case)
        return new_case

    @staticmethod
    async def transition_status(
        db: AsyncSession,
        case: SupportCase,
        to_status: str,
        actor: str,
        actor_role: str,
        reason: Optional[str] = None,
        payload: Optional[Dict[str, Any]] = None,
        visibility: str = "MERCHANT_VISIBLE"
    ) -> SupportCase:
        payload = payload or {}
        from_status = case.status

        # Check allowed transitions
        allowed = VALID_TRANSITIONS.get(from_status, [])
        if to_status not in allowed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid state transition from '{from_status}' to '{to_status}'. Allowed: {allowed}"
            )

        # Policy checks
        if to_status == "RESOLVED":
            eval_res = PolicyEngine.evaluate(
                action="RESOLVE_CASE",
                actor_role=actor_role,
                context={"is_verified": payload.get("is_verified", False)}
            )
            if eval_res.decision != "ALLOW":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=eval_res.message
                )

        case.status = to_status
        case.updated_at = get_utc_now()

        event = CaseEvent(
            case_id=case.id,
            actor=actor,
            event_type="STATUS_CHANGE",
            from_status=from_status,
            to_status=to_status,
            visibility=visibility,
            payload={**(payload or {}), "reason": reason}
        )
        db.add(event)
        await db.commit()
        await db.refresh(case)
        return case
