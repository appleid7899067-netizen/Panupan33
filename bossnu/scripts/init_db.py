import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))
from src.evidence import EvidenceVault, Base

if __name__ == "__main__":
    vault = EvidenceVault()
    Base.metadata.create_all(vault.engine)
    print("✅ Database initialized")
