from dataclasses import dataclass
from typing import Optional
from .fact_check import FactChecker
from .logic_check import LogicChecker
from .ethics_check import EthicsChecker
from .consensus import MeshConsensus

@dataclass
class MeshResult:
    approved: bool
    layer_results: dict
    consensus: str
    reason: Optional[str] = None

class VerificationMesh:
    def __init__(self):
        self.fact = FactChecker()
        self.logic = LogicChecker()
        self.ethics = EthicsChecker()
        self.consensus = MeshConsensus()

    def verify(self, claim: str, evidence: Optional[dict], execution: Optional[dict] = None) -> MeshResult:
        results = {
            "fact": self.fact.check(claim, evidence, execution),
            "logic": self.logic.check(claim, execution),
            "ethics": self.ethics.check(claim),
        }
        c = self.consensus.decide(results)
        return MeshResult(c["approved"], results, c["decision"], c.get("reason"))
