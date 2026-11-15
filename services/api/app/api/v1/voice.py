from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from services.api.app.db.session import get_db
from services.api.app.db.models import User, Call, Conversation, get_utc_now
from services.api.app.core.auth import get_current_user, get_current_merchant_scope
from services.api.app.agents.supervisor import AgentSupervisor
from services.api.app.integrations.sarvam.client import sarvam_adapter

router = APIRouter(prefix="/voice", tags=["Voice"])

class VoiceSessionCreateRequest(BaseModel):
    conversation_id: Optional[str] = None
    consent: bool = True
    language_code: Optional[str] = "en-IN"

class VoiceTranscriptSubmitRequest(BaseModel):
    session_id: str
    conversation_id: str
    audio_transcript: str
    language_code: Optional[str] = "en-IN"

@router.post("/sessions")
async def create_voice_session(
    req: VoiceSessionCreateRequest,
    current_user: User = Depends(get_current_user),
    scoped_merchant_id: str = Depends(get_current_merchant_scope),
    db: AsyncSession = Depends(get_db)
):
    if req.conversation_id:
        stmt = select(Conversation).filter(
            Conversation.id == req.conversation_id,
            Conversation.merchant_id == scoped_merchant_id
        )
        res = await db.execute(stmt)
        conv = res.scalars().first()
    else:
        conv = None

    if not conv:
        conv = Conversation(
            merchant_id=scoped_merchant_id,
            channel="VOICE"
        )
        db.add(conv)
        await db.flush()

    call = Call(
        conversation_id=conv.id,
        consent=req.consent,
        outcome="COMPLETED"
    )
    db.add(call)
    await db.commit()
    await db.refresh(call)

    # Multilingual Greetings (English, Hindi, Marathi)
    lang = req.language_code or "en-IN"
    greetings = {
        "hi-IN": "नमस्ते! मैं ऑप्स साथी एआई हूँ, आपका व्यापार साथी। कृपया अपनी भुगतान या सेटलमेंट की समस्या बताएं।",
        "mr-IN": "नमस्कार! मी ऑप्स साथी एआय आहे, आपला व्यापारी सहकारी. कृपया आपली पेमेंट किंवा सेटलमेंटची अडचण सांगा.",
        "en-IN": "Namaste! I am OpsSaathi AI, your autonomous merchant operations teammate. Please tell me your payment or settlement issue."
    }
    greeting_text = greetings.get(lang, greetings["en-IN"])

    is_sarvam = sarvam_adapter.is_configured()
    greeting_audio_b64 = None
    if is_sarvam:
        try:
            greeting_audio_b64 = await sarvam_adapter.synthesize_speech(greeting_text, target_language_code=lang)
        except Exception:
            greeting_audio_b64 = None

    return {
        "ok": True,
        "data": {
            "session_id": call.id,
            "conversation_id": conv.id,
            "language_code": lang,
            "greeting_text": greeting_text,
            "greeting_audio_base64": greeting_audio_b64,
            "voice_mode": "sarvam_ai" if is_sarvam else "browser",
            "voice_engine": "SARVAM_BULBUL_V3" if is_sarvam else "BROWSER_SPEECH",
            "speech_recognition_available": True,
            "speech_synthesis_available": True,
            "active_case_id": conv.active_case_id
        },
        "meta": {"source_type": "SYNTHETIC_DEMO"},
        "error": None
    }

@router.post("/transcriptions")
async def submit_voice_transcription(
    req: VoiceTranscriptSubmitRequest,
    current_user: User = Depends(get_current_user),
    scoped_merchant_id: str = Depends(get_current_merchant_scope),
    db: AsyncSession = Depends(get_db)
):
    """
    Submits voice transcription into the shared agent brain.
    Identical logic, tools, and context as text chat.
    If Sarvam AI is configured, returns authentic Indian audio voice bytes.
    """
    if not req.audio_transcript.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Transcript cannot be empty"
        )

    lang = req.language_code or "en-IN"

    # Route through AgentSupervisor
    result = await AgentSupervisor.run(
        db=db,
        merchant_id=scoped_merchant_id,
        user_message=req.audio_transcript,
        conversation_id=req.conversation_id,
        channel="VOICE",
        language_code=lang
    )

    # Generate Sarvam AI audio if configured
    sarvam_audio_b64 = None
    if sarvam_adapter.is_configured():
        try:
            sarvam_audio_b64 = await sarvam_adapter.synthesize_speech(result["message"], target_language_code=lang)
        except Exception:
            sarvam_audio_b64 = None

    return {
        "ok": True,
        "data": {
            **result,
            "session_id": req.session_id,
            "speak_text": result["message"],
            "audio_base64": sarvam_audio_b64,
            "voice_engine": "SARVAM_BULBUL_V3" if sarvam_audio_b64 else "BROWSER_SPEECH"
        },
        "meta": {"source_type": "SYNTHETIC_DEMO"},
        "error": None
    }
