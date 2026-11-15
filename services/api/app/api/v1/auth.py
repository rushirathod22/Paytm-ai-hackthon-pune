from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from services.api.app.db.session import get_db
from services.api.app.db.models import User, Merchant, MerchantUser
from services.api.app.core.auth import (
    create_access_token, get_current_user, get_password_hash, verify_password
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

class DemoLoginRequest(BaseModel):
    role: str = "MERCHANT" # MERCHANT, SUPPORT_AGENT, SUPERVISOR
    email: Optional[str] = None

class LoginResponse(BaseModel):
    ok: bool
    data: dict
    meta: dict
    error: Optional[dict] = None

@router.post("/demo-login")
async def demo_login(req: DemoLoginRequest, db: AsyncSession = Depends(get_db)):
    role = req.role.upper()
    email_map = {
        "MERCHANT": "sharma.sweets@demo.com",
        "SUPPORT_AGENT": "agent.rahul@paytmops.com",
        "SUPERVISOR": "supervisor.priya@paytmops.com"
    }
    target_email = req.email or email_map.get(role, "sharma.sweets@demo.com")

    stmt = select(User).filter(User.email == target_email)
    res = await db.execute(stmt)
    user = res.scalars().first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User for role {role} not found"
        )

    # Get merchant info if merchant
    merchant_info = None
    if user.role == "MERCHANT":
        m_stmt = select(Merchant).join(MerchantUser).filter(MerchantUser.user_id == user.id)
        m_res = await db.execute(m_stmt)
        m = m_res.scalars().first()
        if m:
            merchant_info = {
                "id": m.id,
                "display_name": m.display_name,
                "external_mid": m.external_mid,
                "status": m.status
            }

    token = create_access_token(data={"sub": user.id, "role": user.role, "email": user.email})

    return {
        "ok": True,
        "data": {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "role": user.role
            },
            "merchant": merchant_info
        },
        "meta": {"source_type": "SYNTHETIC_DEMO"},
        "error": None
    }

@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    # Find merchant tenants
    m_stmt = select(Merchant).join(MerchantUser).filter(MerchantUser.user_id == current_user.id)
    m_res = await db.execute(m_stmt)
    merchants = m_res.scalars().all()

    return {
        "ok": True,
        "data": {
            "user": {
                "id": current_user.id,
                "name": current_user.name,
                "email": current_user.email,
                "role": current_user.role
            },
            "merchants": [
                {
                    "id": m.id,
                    "display_name": m.display_name,
                    "external_mid": m.external_mid,
                    "status": m.status
                }
                for m in merchants
            ]
        },
        "meta": {"source_type": "SYNTHETIC_DEMO"},
        "error": None
    }
