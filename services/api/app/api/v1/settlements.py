from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from services.api.app.db.session import get_db
from services.api.app.db.models import SettlementBatch, SettlementEntry, User
from services.api.app.core.auth import get_current_user, get_current_merchant_scope

router = APIRouter(prefix="/settlements", tags=["Settlements"])

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
