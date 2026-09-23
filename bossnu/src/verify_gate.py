"""Verification Gate — ดัก claim ที่ไม่มีหลักฐาน"""
import re
from dataclasses import dataclass
from typing import Optional

@dataclass
class GateResult:
    approved: bool
    text: str
    reason: Optional[str] = None

class VerificationGate:
    EXECUTION_PATTERNS = [r"รันแล้ว", r"ทำงานได้แล้ว", r"ผ่านแล้ว", r"executed", r"ran successfully", r"ผลลัพธ์คือ", r"ได้ผลว่า"]
    API_PATTERNS = [r"API.*ทำงาน", r"ดึงข้อมูล.*ได้", r"ตอบกลับ.*200", r"API.*works", r"status\s*200"]
    DEPLOY_PATTERNS = [r"deploy.*แล้ว", r"ขึ้น.*แล้ว", r"live.*แล้ว", r"deployed", r"published"]

    def verify(self, llm_response: str, execution: Optional[dict], evidence_chain_ok: bool = True) -> GateResult:
        if not evidence_chain_ok:
            return GateResult(False, self._downgrade(llm_response, "Evidence chain broken"), "chain_broken")
        if not execution:
            if self._has_any_claim(llm_response):
                return GateResult(False, self._downgrade(llm_response, "ไม่มี sandbox execution — คำตอบนี้เป็นข้อเสนอแนะเท่านั้น"), "no_execution")
            return GateResult(True, llm_response)
        if self._matches(llm_response, self.EXECUTION_PATTERNS):
            if execution.get("exit_code") != 0:
                return GateResult(False, self._downgrade(llm_response, f"exit_code = {execution.get('exit_code')}"), "nonzero_exit")
            if not str(execution.get("stdout", "")).strip():
                return GateResult(False, self._downgrade(llm_response, "ไม่มี stdout"), "no_stdout")
        if self._matches(llm_response, self.API_PATTERNS):
            http_calls = execution.get("http_calls") or []
            if not http_calls:
                return GateResult(False, self._downgrade(llm_response, "อ้าง API แต่ไม่มี HTTP call"), "no_http_evidence")
            failed = [c for c in http_calls if not c.get("status") or c["status"] >= 400]
            if failed and len(failed) == len(http_calls):
                err = failed[0].get("error") or failed[0].get("status")
                return GateResult(False, self._downgrade(llm_response, f"HTTP ทั้งหมดล้มเหลว: {err}"), "all_http_failed")
        return GateResult(True, llm_response)

    def _matches(self, text: str, patterns: list) -> bool:
        return any(re.search(p, text, re.IGNORECASE) for p in patterns)

    def _has_any_claim(self, text: str) -> bool:
        return self._matches(text, self.EXECUTION_PATTERNS + self.API_PATTERNS + self.DEPLOY_PATTERNS)

    def _downgrade(self, text: str, reason: str) -> str:
        return f"⚠️ **ยังไม่ผ่านการยืนยัน**\n\nเหตุผล: {reason}\n\n---\n\n{text}\n\n---\n_ข้อความข้างต้นเป็นข้อเสนอแนะ ไม่ใช่ผลลัพธ์ที่ยืนยันแล้ว_"
