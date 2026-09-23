"""Tool Registry — health check + block dead APIs"""
import json
import requests
from pathlib import Path
from datetime import datetime

class ToolRegistry:
    def __init__(self, path: str = "tools.json"):
        self.path = Path(path)
        self.tools = json.loads(self.path.read_text()) if self.path.exists() else {}

    def save(self):
        self.path.write_text(json.dumps(self.tools, indent=2, ensure_ascii=False))

    def health_check(self, name: str) -> dict:
        tool = self.tools.get(name)
        if not tool:
            return {"status": "not_found"}
        if tool.get("deprecated_since"):
            tool["status"] = "dead"
            tool["last_check"] = datetime.utcnow().isoformat()
            return tool
        try:
            r = requests.get(tool["health_url"], timeout=8, headers={"User-Agent": "Mozilla/5.0 Bossnu/1.0"})
            if r.status_code == 200:
                tool["status"] = "healthy"
            elif r.status_code in (401, 403):
                tool["status"] = "requires_key"
            else:
                tool["status"] = f"degraded_{r.status_code}"
        except Exception as e:
            tool["status"] = "dead"
            tool["last_error"] = str(e)[:200]
        tool["last_check"] = datetime.utcnow().isoformat()
        return tool

    def check_all(self) -> dict:
        for name in list(self.tools):
            self.health_check(name)
        self.save()
        return self.tools

    def can_use(self, name: str) -> tuple:
        tool = self.tools.get(name)
        if not tool:
            return False, "unknown tool"
        if tool["status"] == "dead":
            return False, f"{name} dead"
        if tool["status"] == "requires_key":
            return False, f"{name} requires API key"
        if str(tool["status"]).startswith("degraded"):
            return False, f"{name} degraded"
        return True, "ok"

    def healthy_list(self) -> list:
        return [n for n in self.tools if self.can_use(n)[0]]

    def context_for_llm(self) -> str:
        lines = ["=== AVAILABLE TOOLS ==="]
        for name in self.healthy_list():
            t = self.tools[name]
            lines.append(f"- {name}: {t['url']} ({t.get('category','')})")
        dead = [n for n, t in self.tools.items() if t.get("status") == "dead"]
        if dead:
            lines.append("\n=== FORBIDDEN (dead) ===")
            for n in dead:
                lines.append(f"- {n}: DEAD")
        return "\n".join(lines)
