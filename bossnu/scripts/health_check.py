import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))
from src.tool_registry import ToolRegistry

if __name__ == "__main__":
    reg = ToolRegistry()
    results = reg.check_all()
    print("=== Health Check ===")
    for name, tool in results.items():
        status = tool["status"]
        emoji = {"healthy": "✅", "dead": "❌", "requires_key": "🔑"}.get(status, "⚠️")
        print(f"{emoji} {name}: {status}")
