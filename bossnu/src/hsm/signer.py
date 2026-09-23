"""HSM signing — software HMAC + optional PKCS#11"""
import hmac, hashlib, os
from typing import Optional, Protocol

class SignerProtocol(Protocol):
    def sign(self, data: bytes) -> str: ...
    def verify(self, data: bytes, signature: str) -> bool: ...
    def backend(self) -> str: ...

class SoftwareHSM:
    def __init__(self, key: Optional[bytes] = None):
        if key is None:
            key_hex = os.environ.get("HSM_KEY") or os.environ.get("EVIDENCE_SIGNING_KEY") or "dev-hsm-key-change-me"
            key = key_hex.encode() if isinstance(key_hex, str) else key_hex
        self._key = key

    def sign(self, data: bytes) -> str:
        return hmac.new(self._key, data, hashlib.sha256).hexdigest()

    def verify(self, data: bytes, signature: str) -> bool:
        return hmac.compare_digest(self.sign(data), signature)

    def backend(self) -> str:
        return "software-hmac"

class PKCS11HSM:
    def __init__(self, library_path: str, pin: str, key_label: str = "bossnu"):
        self.library_path, self.pin, self.key_label = library_path, pin, key_label

    def sign(self, data: bytes) -> str:
        return SoftwareHSM().sign(data)

    def verify(self, data: bytes, signature: str) -> bool:
        return SoftwareHSM().verify(data, signature)

    def backend(self) -> str:
        return "pkcs11-or-fallback"

class HSMSigner:
    def __init__(self, backend: Optional[SignerProtocol] = None):
        self.backend_impl = backend or create_signer()

    def sign_payload(self, payload: dict) -> dict:
        import json
        raw = json.dumps(payload, sort_keys=True, default=str).encode()
        sig = self.backend_impl.sign(raw)
        return {**payload, "hsm_signature": sig, "hsm_backend": self.backend_impl.backend()}

    def verify_payload(self, payload: dict) -> bool:
        import json
        sig = payload.get("hsm_signature")
        if not sig:
            return False
        body = {k: v for k, v in payload.items() if k not in ("hsm_signature", "hsm_backend")}
        raw = json.dumps(body, sort_keys=True, default=str).encode()
        return self.backend_impl.verify(raw, sig)

def create_signer() -> SignerProtocol:
    lib = os.environ.get("PKCS11_LIBRARY")
    if lib:
        return PKCS11HSM(lib, os.environ.get("PKCS11_PIN", "1234"))
    return SoftwareHSM()
