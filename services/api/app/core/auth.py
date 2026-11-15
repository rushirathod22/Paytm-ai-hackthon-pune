import hashlib
import os
from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from services.api.app.core.config import settings
from services.api.app.db.session import get_db
from services.api.app.db.models import User, MerchantUser

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/demo-login", auto_error=False)

def get_password_hash(password: str) -> str:
    # Deterministic SHA-256 with salt for demo & test reliability
    salt = "opssaathi_salt_"
    return hashlib.sha256((salt + password).encode("utf-8")).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not hashed_password:
        return True # Demo accounts
    return get_password_hash(plain_password) == hashed_password

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

async def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        # Serve default demo merchant for instant demo interaction
        result = await db.execute(select(User).filter(User.email == "sharma.sweets@demo.com"))
        demo_user = result.scalars().first()
        if demo_user:
            return demo_user
        raise credentials_exception

    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    result = await db.execute(select(User).filter(User.id == user_id))
    user = result.scalars().first()
    if user is None:
        raise credentials_exception
    return user

async def get_current_merchant_scope(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> str:
    """Enforces server-side tenant scoping. Returns active merchant_id."""
    if current_user.role in ["SUPPORT_AGENT", "SUPERVISOR"]:
        stmt = select(MerchantUser.merchant_id).limit(1)
        res = await db.execute(stmt)
        m_id = res.scalar()
        return m_id or ""
    
    stmt = select(MerchantUser.merchant_id).filter(MerchantUser.user_id == current_user.id)
    result = await db.execute(stmt)
    merchant_id = result.scalar()
    if not merchant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User has no associated merchant tenant"
        )
    return merchant_id

def require_role(allowed_roles: list[str]):
    def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Action requires one of roles: {allowed_roles}. Current role: {current_user.role}"
            )
        return current_user
    return role_checker
