from typing import List, Dict, Any, Optional
from decimal import Decimal
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from services.api.app.db.models import (
    Merchant, Transaction, SettlementBatch, SettlementEntry, SupportCase, CaseEvent, Approval, get_utc_now
)
from services.api.app.domain.reconciliation import (
    ReconciliationEngine, ReconciliationItem, SettlementEntryItem, ReconciliationResult
)
from services.api.app.domain.policy import PolicyEngine
from services.api.app.domain.case_service import CaseService
from services.api.app.domain.verification import VerifierService, VerificationResult

class AgentTools:
    """
    Allowlisted typed tools with tenant scoping and validation.
    """

    @staticmethod
    async def get_merchant_context(db: AsyncSession, merchant_id: str) -> Dict[str, Any]:
        """Tenant-scoped merchant summary."""
        stmt = select(Merchant).filter(Merchant.id == merchant_id)
        res = await db.execute(stmt)
        merchant = res.scalars().first()
        if not merchant:
            return {"error": "Merchant not found"}
        return {
            "merchant_id": merchant.id,
            "display_name": merchant.display_name,
            "masked_phone": merchant.masked_phone,
            "status": merchant.status,
            "external_mid": merchant.external_mid or "TEST_MID_STAGING"
        }

    @staticmethod
    async def find_transactions(
        db: AsyncSession,
        merchant_id: str,
        order_id: Optional[str] = None,
        amount: Optional[Decimal] = None
    ) -> List[Dict[str, Any]]:
        """Tenant-scoped transaction lookup. Never accesses other merchant records."""
        stmt = select(Transaction).filter(Transaction.merchant_id == merchant_id)
        if order_id:
            stmt = stmt.filter(Transaction.order_id == order_id)
        res = await db.execute(stmt)
        txns = res.scalars().all()
        return [
            {
                "id": t.id,
                "order_id": t.order_id,
                "provider_txn_id": t.provider_txn_id,
                "amount": str(t.amount),
                "fee": str(t.fee),
                "tax": str(t.tax),
                "status": t.status,
                "txn_time": t.txn_time.isoformat(),
                "source_type": t.source_type
            }
            for t in txns
        ]

    @staticmethod
    async def get_settlement_entries(
        db: AsyncSession,
        merchant_id: str
    ) -> List[Dict[str, Any]]:
        """Tenant-scoped settlement batches and entries."""
        stmt = select(SettlementEntry).join(SettlementBatch).filter(SettlementBatch.merchant_id == merchant_id)
        res = await db.execute(stmt)
        entries = res.scalars().all()
        return [
            {
                "id": e.id,
                "batch_id": e.batch_id,
                "transaction_id": e.transaction_id,
                "amount": str(e.amount),
                "entry_type": e.entry_type,
                "status": e.status,
                "source_type": e.source_type
            }
            for e in entries
        ]

    @staticmethod
    async def calculate_discrepancy(
        db: AsyncSession,
        merchant_id: str
    ) -> ReconciliationResult:
        """Runs deterministic Decimal reconciliation on authenticated merchant records."""
        # 1. Fetch transactions
        txn_stmt = select(Transaction).filter(Transaction.merchant_id == merchant_id)
        txn_res = await db.execute(txn_stmt)
        txns = txn_res.scalars().all()

        recon_txns = [
            ReconciliationItem(
                transaction_id=t.id,
                order_id=t.order_id,
                provider_txn_id=t.provider_txn_id,
                amount=t.amount,
                fee=t.fee,
                tax=t.tax,
                status=t.status,
                source_type=t.source_type
            )
            for t in txns
        ]

        # 2. Fetch settlement entries
        entry_stmt = select(SettlementEntry).join(SettlementBatch).filter(SettlementBatch.merchant_id == merchant_id)
        entry_res = await db.execute(entry_stmt)
        entries = entry_res.scalars().all()

        recon_entries = [
            SettlementEntryItem(
                entry_id=e.id,
                transaction_id=e.transaction_id,
                amount=e.amount,
                entry_type=e.entry_type,
                source_type=e.source_type
            )
            for e in entries
        ]

        return ReconciliationEngine.calculate(recon_txns, recon_entries)

    @staticmethod
    async def create_support_case(
        db: AsyncSession,
        merchant_id: str,
        category: str,
        summary: str,
        idempotency_key: str,
        priority: str = "HIGH",
        queue: str = "SETTLEMENT_OPS",
        evidence: Optional[Dict[str, Any]] = None
    ) -> SupportCase:
        """Creates or reuses idempotent support case."""
        return await CaseService.create_case(
            db=db,
            merchant_id=merchant_id,
            category=category,
            summary=summary,
            idempotency_key=idempotency_key,
            priority=priority,
            queue=queue,
            evidence=evidence
        )

    @staticmethod
    async def request_approval(
        db: AsyncSession,
        case_id: str,
        action: str,
        requested_by: str,
        reason: str
    ) -> Approval:
        """Creates human approval request and persists checkpoint."""
        approval = Approval(
            case_id=case_id,
            action=action,
            requested_by=requested_by,
            reason=reason,
            status="AWAITING"
        )
        db.add(approval)
        
        # Add event to case
        event = CaseEvent(
            case_id=case_id,
            actor=requested_by,
            event_type="APPROVAL_REQUESTED",
            from_status="INVESTIGATING",
            to_status="AWAITING_APPROVAL",
            visibility="INTERNAL_ONLY",
            payload={"action": action, "reason": reason}
        )
        db.add(event)
        
        # Update case status
        stmt = select(SupportCase).filter(SupportCase.id == case_id)
        c_res = await db.execute(stmt)
        case = c_res.scalars().first()
        if case:
            case.status = "AWAITING_APPROVAL"
            
        await db.commit()
        await db.refresh(approval)
        return approval

    @staticmethod
    async def verify_resolution(
        db: AsyncSession,
        case_id: str
    ) -> VerificationResult:
        """Executes fresh verification read before case closure."""
        stmt = select(SupportCase).filter(SupportCase.id == case_id)
        res = await db.execute(stmt)
        case = res.scalars().first()
        if not case:
            return VerificationResult(False, "Case not found", {})
        return await VerifierService.verify_case(db, case)
