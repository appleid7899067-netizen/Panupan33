from ..ethics.agent import EthicsAgent

class EthicsChecker:
    def __init__(self):
        self.agent = EthicsAgent()

    def check(self, claim: str) -> dict:
        v = self.agent.evaluate(claim, "")
        return {"passed": v.allowed, "issues": [] if v.allowed else [v.reason or "ethics"], "rule": v.rule}
