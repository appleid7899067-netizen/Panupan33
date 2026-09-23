from src.verify_gate import VerificationGate
gate = VerificationGate()

def test_no_execution():
    r = gate.verify("รันแล้วได้ 5", None, True)
    assert r.approved is False and r.reason == "no_execution"

def test_nonzero_exit():
    r = gate.verify("รันแล้ว", {"exit_code": 1, "stdout": "x", "http_calls": []}, True)
    assert r.approved is False and r.reason == "nonzero_exit"

def test_no_stdout():
    r = gate.verify("รันแล้ว", {"exit_code": 0, "stdout": "", "http_calls": []}, True)
    assert r.approved is False and r.reason == "no_stdout"

def test_valid():
    r = gate.verify("รันแล้วได้ 2", {"exit_code": 0, "stdout": "2", "http_calls": []}, True)
    assert r.approved is True

if __name__ == "__main__":
    for name, f in list(globals().items()):
        if name.startswith("test_"):
            f()
            print(f"✅ {name}")
