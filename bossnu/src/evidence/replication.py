"""Multi-region evidence replication (3 copies)"""
import json, hashlib
from pathlib import Path
from typing import List, Optional

class EvidenceReplicator:
    def __init__(self, paths: List[str]):
        self.paths = [Path(p) for p in paths]
        for p in self.paths:
            p.mkdir(parents=True, exist_ok=True)

    def replicate(self, evidence_id: str, payload: dict):
        data = json.dumps(payload, sort_keys=True, default=str)
        for p in self.paths:
            (p / f"{evidence_id}.json").write_text(data)

    def verify_all_copies(self, evidence_id: str) -> bool:
        hashes = []
        for p in self.paths:
            f = p / f"{evidence_id}.json"
            if not f.exists():
                return False
            hashes.append(hashlib.sha256(f.read_bytes()).hexdigest())
        return len(set(hashes)) == 1

class MultiRegionReplicator:
    def __init__(self, regions: Optional[dict] = None):
        self.regions = regions or {"sin": "/tmp/bossnu/evidence/sin", "fra": "/tmp/bossnu/evidence/fra", "iad": "/tmp/bossnu/evidence/iad"}
        self.local = EvidenceReplicator(list(self.regions.values()))

    def replicate(self, evidence_id: str, payload: dict) -> dict:
        self.local.replicate(evidence_id, payload)
        status = {name: (Path(path) / f"{evidence_id}.json").exists() for name, path in self.regions.items()}
        return {"evidence_id": evidence_id, "regions": status, "ok": all(status.values())}

    def verify(self, evidence_id: str) -> bool:
        return self.local.verify_all_copies(evidence_id)
