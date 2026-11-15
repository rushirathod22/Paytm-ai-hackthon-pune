from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from services.api.app.db.session import get_db
from services.api.app.db.models import Merchant, User
from services.api.app.core.auth import get_current_user, get_current_merchant_scope

router = APIRouter(prefix="/merchants", tags=["Merchants"])

@router.get("/{id}")
async def get_merchant(
    id: str,
    current_user: User = Depends(get_current_user),
    scoped_merchant_id: str = Depends(get_current_merchant_scope),
    db: AsyncSession = Depends(get_db)
):
    # Enforce IDOR protection: merchant user can only access their own tenant
    if current_user.role == "MERCHANT" and id != scoped_merchant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: cannot access another merchant tenant"
        )

    stmt = select(Merchant).filter(Merchant.id == id)
    res = await db.execute(stmt)
    merchant = res.scalars().first()
    if not merchant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Merchant not found")

    return {
        "ok": True,
        "data": {
            "id": merchant.id,
            "display_name": merchant.display_name,
            "masked_phone": merchant.masked_phone,
            "external_mid": merchant.external_mid,
            "status": merchant.status,
            "created_at": merchant.created_at.isoformat()
        },
        "meta": {"source_type": "SYNTHETIC_DEMO"},
        "error": None
    }
