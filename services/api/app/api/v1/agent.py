from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from services.api.app.db.session import get_db
from services.api.app.db.models import User, Conversation, Message
from services.api.app.core.auth import get_current_user, get_current_merchant_scope
from services.api.app.agents.supervisor import AgentSupervisor

router = APIRouter(prefix="/agent", tags=["Agent"])

class AgentMessageRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    channel: str = "CHAT"

@router.post("/messages")
async def send_agent_message(
    req: AgentMessageRequest,
    current_user: User = Depends(get_current_user),
    scoped_merchant_id: str = Depends(get_current_merchant_scope),
    db: AsyncSession = Depends(get_db)
):
    if not req.message.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message content cannot be empty"
        )

    result = await AgentSupervisor.run(
        db=db,
        merchant_id=scoped_merchant_id,
        user_message=req.message,
        conversation_id=req.conversation_id,
        channel=req.channel
    )

    return {
        "ok": True,
        "data": result,
        "meta": {"source_type": "SYNTHETIC_DEMO"},
        "error": None
    }

@router.get("/conversations/{id}/messages")
async def get_conversation_history(
    id: str,
    current_user: User = Depends(get_current_user),
    scoped_merchant_id: str = Depends(get_current_merchant_scope),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Message).filter(Message.conversation_id == id).order_by(Message.created_at.asc())
    res = await db.execute(stmt)
    msgs = res.scalars().all()

    return {
        "ok": True,
        "data": [
            {
                "id": m.id,
                "role": m.role,
                "content": m.content,
                "created_at": m.created_at.isoformat(),
                "meta": m.meta
            }
            for m in msgs
        ],
        "meta": {"total": len(msgs)},
        "error": None
    }
