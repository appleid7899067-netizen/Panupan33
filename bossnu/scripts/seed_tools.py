import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))
from src.tool_registry import ToolRegistry

if __name__ == "__main__":
    reg = ToolRegistry()
    try:
        reg.check_all()
    except Exception as e:
        print(f"health partial: {e}")
    reg.save()
    print(f"✅ Seeded {len(reg.tools)} tools")
