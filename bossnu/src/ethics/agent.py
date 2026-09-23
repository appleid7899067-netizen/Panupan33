"""Ethics Agent — hard veto on red lines"""
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

try:
    import yaml
except ImportError:
    yaml = None

@dataclass
class EthicsVerdict:
    allowed: bool
    rule: Optional[str] = None
    reason: Optional[str] = None

DEFAULT_REDLINES = [
    {"name": "harm", "patterns": [r"ฆ่า", r"kill\b", r"harm humans", r"assassinate"], "action": "veto"},
    {"name": "malware", "patterns": [r"malware", r"ransomware", r"keylogger", r"backdoor"], "action": "veto"},
    {"name": "weapons", "patterns": [r"\bweapon\b", r"explosive", r"bioweapon", r"อาวุธ"], "action": "veto"},
]

class EthicsAgent:
    def __init__(self, rules_path: str = "src/ethics/redlines.yaml"):
        self.rules = DEFAULT_REDLINES
        p = Path(rules_path)
        if yaml and p.exists():
            try:
                data = yaml.safe_load(p.read_text())
                self.rules = data.get("redlines", DEFAULT_REDLINES)
            except Exception:
                pass

    def evaluate(self, goal: str, code: str = "") -> EthicsVerdict:
        text = f"{goal}\n{code}".lower()
        for rule in self.rules:
            for pat in rule.get("patterns", []):
                if re.search(pat, text, re.I):
                    return EthicsVerdict(False, rule.get("name"), f"Red line: {rule.get('name')}")
        return EthicsVerdict(True)

class EthicsVeto:
    def __init__(self, agent: Optional[EthicsAgent] = None):
        self.agent = agent or EthicsAgent()

    def check(self, goal: str, code: str = "") -> EthicsVerdict:
        return self.agent.evaluate(goal, code)
