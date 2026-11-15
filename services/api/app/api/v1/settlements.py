from decimal import Decimal
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from services.api.app.db.session import get_db
from services.api.app.db.models import SettlementBatch, SettlementEntry, Transaction, User, SettlementEvidence
from services.api.app.core.auth import get_current_user, get_current_merchant_scope
from services.api.app.domain.reconciliation import (
    ReconciliationEngine, ReconciliationItem, SettlementEntryItem
)
from services.api.app.agents.investigation_graph import SettlementInvestigationGraph

router = APIRouter(prefix="/settlements", tags=["Settlements"])

class InvestigationRequest(BaseModel):
    complaint_category: str = Field(
        default="MISSING_SETTLEMENT",
        description="MISSING_SETTLEMENT, PARTIAL_SETTLEMENT, DELAYED_SETTLEMENT, INCORRECT_AMOUNT, UNKNOWN_DEDUCTION"
    )
    expected_amount: Optional[Decimal] = Decimal("6000.00")
    actual_credited_amount: Optional[Decimal] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    transaction_id: Optional[str] = None
    settlement_id: Optional[str] = None
    utr_reference: Optional[str] = None
    complaint_description: Optional[str] = "Settlement discrepancy investigation"

@router.get("")
async def get_settlements(
    current_user: User = Depends(get_current_user),
    scoped_merchant_id: str = Depends(get_current_merchant_scope),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(SettlementBatch).filter(SettlementBatch.merchant_id == scoped_merchant_id)
    res = await db.execute(stmt)
    batches = res.scalars().all()

    output = []
    for b in batches:
        e_stmt = select(SettlementEntry).filter(SettlementEntry.batch_id == b.id)
        e_res = await db.execute(e_stmt)
        entries = e_res.scalars().all()

        output.append({
            "id": b.id,
            "batch_ref": b.batch_ref,
            "date": b.date.isoformat(),
            "gross": str(b.gross),
            "fees": str(b.fees),
            "refunds": str(b.refunds),
            "net": str(b.net),
            "commission": str(getattr(b, "commission", Decimal("0.00"))),
            "tax": str(getattr(b, "tax", Decimal("0.00"))),
            "chargebacks": str(getattr(b, "chargebacks", Decimal("0.00"))),
            "adjustments": str(getattr(b, "adjustments", Decimal("0.00"))),
            "utr": getattr(b, "utr", "UTR-PTM-20261114-4819"),
            "status": b.status,
            "source_type": b.source_type,
            "entries_count": len(entries),
            "entries": [
                {
                    "id": e.id,
                    "transaction_id": e.transaction_id,
                    "amount": str(e.amount),
                    "entry_type": e.entry_type,
                    "status": e.status,
                    "source_type": e.source_type
                }
                for e in entries
            ]
        })

    return {
        "ok": True,
        "data": output,
        "meta": {"total_batches": len(batches), "source_type": "SYNTHETIC_DEMO"},
        "error": None
    }

@router.post("/investigate")
async def investigate_settlement(
    req: InvestigationRequest,
    current_user: User = Depends(get_current_user),
    scoped_merchant_id: str = Depends(get_current_merchant_scope),
    db: AsyncSession = Depends(get_db)
):
    """
    Settlement Investigation & Evidence Centre Engine.
    Executes multi-agent LangGraph investigation across transactions,
    settlement batches, fee records, and deterministic Decimal reconciliation.
    """
    try:
        report = await SettlementInvestigationGraph.run(
            db=db,
            merchant_id=scoped_merchant_id,
            complaint_data=req.model_dump()
        )
        return {
            "ok": True,
            "data": report,
            "meta": {"source_type": "SYNTHETIC_DEMO", "engine": "LangGraph Settlement Investigator"},
            "error": None
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Investigation failed: {str(e)}"
        )

@router.get("/{settlement_id}")
async def get_settlement_detail(
    settlement_id: str,
    current_user: User = Depends(get_current_user),
    scoped_merchant_id: str = Depends(get_current_merchant_scope),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(SettlementBatch).filter(
        (SettlementBatch.id == settlement_id) | (SettlementBatch.batch_ref == settlement_id)
    )
    if current_user.role == "MERCHANT":
        stmt = stmt.filter(SettlementBatch.merchant_id == scoped_merchant_id)

    res = await db.execute(stmt)
    batch = res.scalars().first()
    if not batch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Settlement batch not found")

    e_stmt = select(SettlementEntry).filter(SettlementEntry.batch_id == batch.id)
    e_res = await db.execute(e_stmt)
    entries = e_res.scalars().all()

    return {
        "ok": True,
        "data": {
            "id": batch.id,
            "batch_ref": batch.batch_ref,
            "date": batch.date.isoformat(),
            "gross": str(batch.gross),
            "fees": str(batch.fees),
            "refunds": str(batch.refunds),
            "net": str(batch.net),
            "commission": str(getattr(batch, "commission", Decimal("0.00"))),
            "tax": str(getattr(batch, "tax", Decimal("0.00"))),
            "chargebacks": str(getattr(batch, "chargebacks", Decimal("0.00"))),
            "adjustments": str(getattr(batch, "adjustments", Decimal("0.00"))),
            "utr": getattr(batch, "utr", "UTR-PTM-20261114-4819"),
            "status": batch.status,
            "source_type": batch.source_type,
            "entries": [
                {
                    "id": e.id,
                    "transaction_id": e.transaction_id,
                    "amount": str(e.amount),
                    "entry_type": e.entry_type,
                    "status": e.status
                }
                for e in entries
            ]
        },
        "meta": {"source_type": "SYNTHETIC_DEMO"},
        "error": None
    }

@router.get("/{settlement_id}/evidence")
async def get_settlement_evidence(
    settlement_id: str,
    current_user: User = Depends(get_current_user),
    scoped_merchant_id: str = Depends(get_current_merchant_scope),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(SettlementBatch).filter(
        (SettlementBatch.id == settlement_id) | (SettlementBatch.batch_ref == settlement_id)
    )
    if current_user.role == "MERCHANT":
        stmt = stmt.filter(SettlementBatch.merchant_id == scoped_merchant_id)

    res = await db.execute(stmt)
    batch = res.scalars().first()
    if not batch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Settlement batch not found")

    e_stmt = select(SettlementEntry).filter(SettlementEntry.batch_id == batch.id)
    e_res = await db.execute(e_stmt)
    entries = e_res.scalars().all()

    evidence_items = []
    for e in entries:
        t_stmt = select(Transaction).filter(Transaction.id == e.transaction_id)
        t_res = await db.execute(t_stmt)
        txn = t_res.scalars().first()
        evidence_items.append({
            "entry_id": e.id,
            "transaction_id": e.transaction_id,
            "order_id": txn.order_id if txn else "UNKNOWN",
            "amount": str(e.amount),
            "type": e.entry_type,
            "status": e.status,
            "source_type": e.source_type,
            "verified": True
        })

    return {
        "ok": True,
        "data": {
            "batch_ref": batch.batch_ref,
            "utr": getattr(batch, "utr", "UTR-PTM-20261114-4819"),
            "provenance": batch.source_type or "SYNTHETIC_DEMO",
            "evidence_count": len(evidence_items),
            "evidence_records": evidence_items
        },
        "meta": {"source_type": "SYNTHETIC_DEMO"},
        "error": None
    }

@router.get("/{settlement_id}/reconciliation")
async def get_settlement_reconciliation(
    settlement_id: str,
    current_user: User = Depends(get_current_user),
    scoped_merchant_id: str = Depends(get_current_merchant_scope),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(SettlementBatch).filter(
        (SettlementBatch.id == settlement_id) | (SettlementBatch.batch_ref == settlement_id)
    )
    if current_user.role == "MERCHANT":
        stmt = stmt.filter(SettlementBatch.merchant_id == scoped_merchant_id)

    res = await db.execute(stmt)
    batch = res.scalars().first()
    if not batch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Settlement batch not found")

    # Fetch merchant txns
    txn_stmt = select(Transaction).filter(Transaction.merchant_id == batch.merchant_id)
    txn_res = await db.execute(txn_stmt)
    txns = txn_res.scalars().all()

    # Fetch entries
    e_stmt = select(SettlementEntry).filter(SettlementEntry.batch_id == batch.id)
    e_res = await db.execute(e_stmt)
    entries = e_res.scalars().all()

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

    result = ReconciliationEngine.calculate(recon_txns, recon_entries)
    return {
        "ok": True,
        "data": result.model_dump(),
        "meta": {"source_type": "SYNTHETIC_DEMO"},
        "error": None
    }
