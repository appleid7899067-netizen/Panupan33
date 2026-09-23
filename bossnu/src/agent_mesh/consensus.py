from dataclasses import dataclass
from typing import List
from enum import Enum

class Vote(str, Enum):
    APPROVE = "approve"
    REJECT = "reject"
    ABSTAIN = "abstain"

@dataclass
class AgentVote:
    agent_role: str
    vote: Vote
    reasoning: str
    can_veto: bool = False

@dataclass
class ConsensusResult:
    decision: str
    vetoes: list
    approvals: int
    rejections: int
    reason: str

class ConsensusEngine:
    """1 veto = stop immediately"""
    def decide(self, votes: List[AgentVote]) -> ConsensusResult:
        vetoes = [v for v in votes if v.vote == Vote.REJECT and v.can_veto]
        if vetoes:
            return ConsensusResult("rejected", [v.agent_role for v in vetoes], 0, len(vetoes),
                                   f"Veto by: {', '.join(v.agent_role for v in vetoes)}")
        approves = [v for v in votes if v.vote == Vote.APPROVE]
        rejects = [v for v in votes if v.vote == Vote.REJECT]
        total = len([v for v in votes if v.vote != Vote.ABSTAIN])
        if total == 0:
            return ConsensusResult("needs_human", [], 0, 0, "ไม่มี votes")
        if len(approves) / total >= 0.75 and not rejects:
            return ConsensusResult("approved", [], len(approves), 0, f"{len(approves)}/{total} อนุมัติ")
        return ConsensusResult("needs_human", [], len(approves), len(rejects), "ไม่ consensus")
