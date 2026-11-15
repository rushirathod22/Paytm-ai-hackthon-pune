import logging
import os
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

class TelephonyProvider:
    """
    Telephony Adapter for Outbound Phone Calling (Exotel / Twilio).
    Per PRD Section 2.2 & 11:
    - In-browser voice session is the primary MVP.
    - Outbound PSTN calling requires explicit user consent and funded credentials.
    """

    def __init__(self):
        self.provider = os.environ.get("TELEPHONY_PROVIDER", "browser") # "exotel" | "twilio" | "browser"
        self.account_sid = os.environ.get("TWILIO_ACCOUNT_SID")
        self.auth_token = os.environ.get("TWILIO_AUTH_TOKEN")
        self.from_number = os.environ.get("TELEPHONY_FROM_NUMBER")

    def is_configured(self) -> bool:
        return bool(self.account_sid and self.auth_token and self.from_number)

    async def initiate_outbound_call(
        self,
        to_phone: str,
        callback_url: str,
        merchant_name: str
    ) -> Dict[str, Any]:
        """
        Initiates an outbound phone call to the merchant.
        """
        if not self.is_configured():
            logger.info("PSTN telephony not configured. Defaulting to in-browser voice session.")
            return {
                "ok": True,
                "mode": "browser_voice_fallback",
                "message": f"Browser voice active. If telephony credentials are added, outbound PSTN call will dial {to_phone}.",
                "call_sid": f"mock-call-{hash(to_phone)}"
            }

        # Example Twilio call initiation
        import httpx
        url = f"https://api.twilio.com/2010-04-01/Accounts/{self.account_sid}/Calls.json"
        data = {
            "To": to_phone,
            "From": self.from_number,
            "Url": callback_url
        }
        try:
            async with httpx.AsyncClient(auth=(self.account_sid, self.auth_token)) as client:
                res = await client.post(url, data=data)
                return res.json()
        except Exception as e:
            logger.error(f"Telephony call initiation error: {e}")
            return {"ok": False, "error": str(e)}

telephony_provider = TelephonyProvider()
