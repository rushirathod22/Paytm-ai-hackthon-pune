import hmac
import hashlib
import json
from typing import Dict, Any, Union

class PaytmChecksum:
    """
    Paytm Checksum utility conforming to Paytm Payments API specification.
    Computes HMAC-SHA256 hash using merchant key.
    """

    @staticmethod
    def generate_signature(params: Union[Dict[str, Any], str], key: str) -> str:
        if isinstance(params, dict):
            # Sort keys and concatenate values with '|'
            keys = sorted(params.keys())
            param_str = "|".join(str(params[k]) for k in keys if params[k] is not None)
        else:
            param_str = str(params)

        signature = hmac.new(
            key.encode("utf-8"),
            param_str.encode("utf-8"),
            hashlib.sha256
        ).hexdigest()
        return signature

    @staticmethod
    def verify_signature(params: Union[Dict[str, Any], str], key: str, checksum: str) -> bool:
        if not checksum or not key:
            return False
        expected = PaytmChecksum.generate_signature(params, key)
        return hmac.compare_digest(expected, checksum)
