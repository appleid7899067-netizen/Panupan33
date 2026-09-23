import re
from pathlib import Path
from dataclasses import dataclass
from enum import Enum
from typing import Optional

try:
    import yaml
except ImportError:
    yaml = None

class Approval(str, Enum):
    AUTO = "auto"
    HUMAN = "human"
    HUMAN_DOUBLE = "human_double"
    REJECT = "reject"

@dataclass
class MissionDecision:
    approval: Approval
    rule: str
    reason: str
    requires: list

DEFAULT_RULES = [
    {"name": "deploy_production", "match": "deploy|production", "approval": "human", "requires": ["test_pass"], "reason": "deploy needs human"},
    {"name": "use_of_force", "match": "force|attack|weapon", "approval": "human_double", "requires": [], "reason": "force needs double approval"},
    {"name": "financial", "match": "payment|transfer|trade", "approval": "human_double", "requires": [], "reason": "financial"},
    {"name": "code_execution", "match": "code|python|print|รัน", "approval": "auto", "requires": [], "reason": "sandbox code"},
    {"name": "general_qa", "match": ".*", "approval": "auto", "requires": [], "reason": "default"},
]

class MissionGate:
    def __init__(self, rules_path: str = "src/mission/rules.yaml"):
        self.rules = DEFAULT_RULES
        p = Path(rules_path)
        if yaml and p.exists():
            try:
                self.rules = yaml.safe_load(p.read_text())["rules"]
            except Exception:
                pass

    def evaluate(self, goal: str, code: str = "", context: Optional[dict] = None) -> MissionDecision:
        context = context or {}
        text = (goal + " " + code).lower()
        for rule in self.rules:
            if re.search(rule["match"], text, re.I):
                return MissionDecision(Approval(rule["approval"]), rule["name"], rule["reason"], rule.get("requires", []))
        return MissionDecision(Approval.AUTO, "default", "ไม่มี rule เฉพาะ", [])
