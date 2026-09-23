from src.hsm.signer import HSMSigner, SoftwareHSM

def test_sign_verify():
    s = HSMSigner(SoftwareHSM(b"test-key"))
    p = s.sign_payload({"a": 1})
    assert "hsm_signature" in p and s.verify_payload(p)

if __name__ == "__main__":
    test_sign_verify()
    print("✅ hsm")
