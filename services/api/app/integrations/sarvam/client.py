import os
import re
import logging
import httpx
from typing import Optional, Dict, Any
from services.api.app.core.config import settings

logger = logging.getLogger(__name__)

def clean_text_for_voice(text: str, max_chars: int = 480, target_language_code: str = "en-IN") -> str:
    """
    Cleans markdown formatting, removes noisy symbols, expands currency,
    and cleanly truncates to Sarvam's strict 500 character limit at sentence boundaries.
    Supports English (en-IN), Hindi (hi-IN), and Marathi (mr-IN).
    """
    if not text:
        return ""
    
    # 1. Expand currency symbols
    if target_language_code in ("hi-IN", "mr-IN"):
        t = text.replace("₹", "रुपये ")
    else:
        t = text.replace("₹", "Rupees ")
    
    # 2. Strip markdown headers, bold, italics, backticks, bullets
    t = re.sub(r"[*_#`~>\[\]]", " ", t)
    t = t.replace("•", ". ")
    
    # 3. Collapse multiple whitespace
    t = re.sub(r"\s+", " ", t).strip()
    
    # 4. If fits within max_chars, return directly
    if len(t) <= max_chars:
        return t
    
    # 5. Split by sentence (including Devanagari purna viram '।') and accumulate up to max_chars
    sentences = re.split(r"(?<=[.!?।])\s+", t)
    selected = []
    accumulated_len = 0
    for s in sentences:
        s_clean = s.strip()
        if not s_clean:
            continue
        if accumulated_len + len(s_clean) + 1 <= max_chars:
            selected.append(s_clean)
            accumulated_len += len(s_clean) + 1
        else:
            break
            
    if selected:
        return " ".join(selected)
        
    # Fallback to word-boundary truncation
    truncated = t[:max_chars].rsplit(" ", 1)[0]
    return f"{truncated}."
            
    if selected:
        return " ".join(selected)
        
    # Fallback to word-boundary truncation
    truncated = t[:max_chars].rsplit(" ", 1)[0]
    return f"{truncated}."

class SarvamVoiceAdapter:
    """
    Adapter for Sarvam AI Indian Speech-to-Text and Text-to-Speech.
    API Specs:
    - TTS: model="bulbul:v3", speaker="priya" / "anushka"
    - STT: model="saaras:v3"
    """

    def __init__(self):
        self.api_key = settings.SARVAM_API_KEY or os.environ.get("SARVAM_API_KEY")
        self.base_url = "https://api.sarvam.ai"

    def is_configured(self) -> bool:
        return bool(self.api_key and self.api_key.startswith("sk_"))

    async def transcribe_audio(self, audio_bytes: bytes, language_code: str = "en-IN") -> Dict[str, Any]:
        """
        Transcribes speech audio into text using Sarvam AI Saaras v3 model.
        """
        if not self.is_configured():
            logger.info("Sarvam API key not set; using client speech recognition.")
            return {"transcript": "", "language_code": language_code}

        headers = {
            "api-subscription-key": self.api_key
        }
        files = {
            "file": ("audio.wav", audio_bytes, "audio/wav")
        }
        data = {
            "model": "saaras:v3",
            "language_code": language_code
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(f"{self.base_url}/speech-to-text", headers=headers, files=files, data=data)
                res.raise_for_status()
                return res.json()
        except Exception as e:
            logger.warning(f"Sarvam STT notice: {e}. Falling back.")
            return {"transcript": "", "error": str(e)}

    async def synthesize_speech(self, text: str, target_language_code: str = "en-IN") -> Optional[str]:
        """
        Synthesizes text into high-quality Indian English or Hindi speech audio base64.
        Uses Sarvam bulbul:v3 with speaker 'priya'.
        Sanitizes text and guarantees <= 480 characters for Sarvam API compliance.
        """
        if not self.is_configured():
            return None

        clean_text = clean_text_for_voice(text, max_chars=480, target_language_code=target_language_code)
        if not clean_text:
            return None

        headers = {
            "api-subscription-key": self.api_key,
            "Content-Type": "application/json"
        }
        payload = {
            "inputs": [clean_text],
            "target_language_code": target_language_code,
            "speaker": "priya",
            "model": "bulbul:v3"
        }

        try:
            async with httpx.AsyncClient(timeout=12.0) as client:
                res = await client.post(f"{self.base_url}/text-to-speech", headers=headers, json=payload)
                res.raise_for_status()
                data = res.json()
                audios = data.get("audios", [])
                if audios:
                    return audios[0] # base64 wav string
                return None
        except Exception as e:
            logger.warning(f"Sarvam TTS notice: {e}")
            return None

sarvam_adapter = SarvamVoiceAdapter()
