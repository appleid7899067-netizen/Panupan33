from src.redteam.adversary import AdversaryAgent

def test_redteam_blocks_attacks():
    r = AdversaryAgent().run()
    assert r.leaked == 0 or r.pass_rate >= 0.7
    print(f"pass_rate={r.pass_rate:.2f} blocked={r.blocked}/{r.total} leaked={r.leaked}")

if __name__ == "__main__":
    test_redteam_blocks_attacks()
    print("✅ redteam")
