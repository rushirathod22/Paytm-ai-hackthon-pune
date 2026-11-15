from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from services.api.app.db.session import get_db
from services.api.app.db.models import Transaction, User
from services.api.app.core.auth import get_current_user, get_current_merchant_scope

router = APIRouter(prefix="/transactions", tags=["Transactions"])

@router.get("")
async def list_transactions(
    order_id: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(get_current_user),
    scoped_merchant_id: str = Depends(get_current_merchant_scope),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Transaction).filter(Transaction.merchant_id == scoped_merchant_id)
    if order_id:
        stmt = stmt.filter(Transaction.order_id == order_id)
    if status_filter:
        stmt = stmt.filter(Transaction.status == status_filter)

    stmt = stmt.order_by(Transaction.txn_time.desc())
    res = await db.execute(stmt)
    txns = res.scalars().all()

    return {
        "ok": True,
        "data": [
            {
                "id": t.id,
                "order_id": t.order_id,
                "provider_txn_id": t.provider_txn_id,
                "amount": str(t.amount),
                "fee": str(t.fee),
                "tax": str(t.tax),
                "currency": t.currency,
                "status": t.status,
                "txn_time": t.txn_time.isoformat(),
                "source_type": t.source_type
            }
            for t in txns
        ],
        "meta": {"total": len(txns), "source_type": "SYNTHETIC_DEMO"},
        "error": None
    }

@router.get("/{id}")
async def get_transaction(
    id: str,
    current_user: User = Depends(get_current_user),
    scoped_merchant_id: str = Depends(get_current_merchant_scope),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Transaction).filter(
        Transaction.id == id,
        Transaction.merchant_id == scoped_merchant_id
    )
    res = await db.execute(stmt)
    t = res.scalars().first()
    if not t:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")

    return {
        "ok": True,
        "data": {
            "id": t.id,
            "order_id": t.order_id,
            "provider_txn_id": t.provider_txn_id,
            "amount": str(t.amount),
            "fee": str(t.fee),
            "tax": str(t.tax),
            "currency": t.currency,
            "status": t.status,
            "txn_time": t.txn_time.isoformat(),
            "source_type": t.source_type
        },
        "meta": {"source_type": t.source_type},
        "error": None
    }
