import re
from typing import Optional

class LogicChecker:
    def check(self, claim: str, execution: Optional[dict]) -> dict:
        issues = []
        if "ไม่สามารถ" in claim and "สำเร็จ" in claim:
            issues.append("ขัดแย้ง")
        if execution and execution.get("exit_code") != 0 and re.search(r"สำเร็จ|success", claim, re.I):
            issues.append(f"exit={execution['exit_code']} แต่บอกสำเร็จ")
        return {"passed": len(issues) == 0, "issues": issues}
