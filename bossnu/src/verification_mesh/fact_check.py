import re
from typing import Optional

class FactChecker:
    EXECUTION_CLAIM = re.compile(r"รันแล้ว|executed|ran successfully|ผลลัพธ์คือ")
    API_CLAIM = re.compile(r"API.*ทำงาน|status\s*200|ดึงข้อมูล.*ได้")

    def check(self, claim: str, evidence: Optional[dict], execution: Optional[dict]) -> dict:
        issues = []
        if self.EXECUTION_CLAIM.search(claim):
            if not execution or not execution.get("stdout"):
                issues.append("อ้างว่ารันแล้วแต่ไม่มี stdout")
        if self.API_CLAIM.search(claim):
            http = (execution or {}).get("http_calls", [])
            if not http:
                issues.append("อ้าง API แต่ไม่มี HTTP call")
        return {"passed": len(issues) == 0, "issues": issues}
