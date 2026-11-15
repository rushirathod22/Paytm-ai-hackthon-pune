import pytest
from services.api.app.integrations.paytm.checksum import PaytmChecksum

def test_paytm_checksum_generation_and_verification():
    key = "TEST_MERCHANT_SECRET_KEY_123"
    params = {
        "mid": "TEST_MID_001",
        "orderId": "ORD-8821",
        "txnAmount": "6000.00",
        "currency": "INR"
    }

    sig = PaytmChecksum.generate_signature(params, key)
    assert isinstance(sig, str)
    assert len(sig) == 64 # SHA256 hex digest length

    # Verify matching signature
    is_valid = PaytmChecksum.verify_signature(params, key, sig)
    assert is_valid is True

    # Tampered parameter fails verification
    tampered_params = params.copy()
    tampered_params["txnAmount"] = "1000.00"
    is_tampered_valid = PaytmChecksum.verify_signature(tampered_params, key, sig)
    assert is_tampered_valid is False

    # Wrong key fails verification
    is_wrong_key_valid = PaytmChecksum.verify_signature(params, "WRONG_KEY", sig)
    assert is_wrong_key_valid is False
