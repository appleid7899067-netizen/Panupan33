"""Evidence Vault — SHA256 + HMAC chain, immutable"""
import hashlib
import hmac
import json
from datetime import datetime
from typing import Optional
from sqlalchemy import create_engine, Column, String, Integer, TIMESTAMP, JSON
from sqlalchemy.orm import declarative_base, sessionmaker
from .config import settings

Base = declarative_base()
SIGNING_KEY = settings.evidence_signing_key.encode()

class EvidenceRow(Base):
    __tablename__ = "evidence"
    id = Column(String, primary_key=True)
    session_id = Column(String, index=True)
    step_id = Column(Integer)
    kind = Column(String)
    payload = Column(JSON)
    payload_hash = Column(String)
    prev_hash = Column(String)
    signature = Column(String)
    created_at = Column(TIMESTAMP, default=datetime.utcnow)

class EvidenceVault:
    def __init__(self, db_url: Optional[str] = None):
        self.engine = create_engine(db_url or settings.database_url, pool_pre_ping=True)
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)

    def _hash(self, payload: dict, prev_hash: str) -> str:
        raw = json.dumps(payload, sort_keys=True, default=str) + prev_hash
        return hashlib.sha256(raw.encode()).hexdigest()

    def _sign(self, h: str) -> str:
        return hmac.new(SIGNING_KEY, h.encode(), hashlib.sha256).hexdigest()

    def store(self, session_id: str, step_id: int, kind: str, payload: dict) -> str:
        with self.Session() as s:
            last = s.query(EvidenceRow).filter_by(session_id=session_id).order_by(EvidenceRow.created_at.desc()).first()
            prev_hash = last.payload_hash if last else "GENESIS"
            h = self._hash(payload, prev_hash)
            sig = self._sign(h)
            evidence_id = h[:16]
            s.add(EvidenceRow(id=evidence_id, session_id=session_id, step_id=step_id, kind=kind, payload=payload, payload_hash=h, prev_hash=prev_hash, signature=sig))
            s.commit()
            return evidence_id

    def get_session(self, session_id: str) -> list:
        with self.Session() as s:
            rows = s.query(EvidenceRow).filter_by(session_id=session_id).order_by(EvidenceRow.created_at.asc()).all()
            return [self._to_dict(r) for r in rows]

    def _to_dict(self, r: EvidenceRow) -> dict:
        return {"id": r.id, "step_id": r.step_id, "kind": r.kind, "payload": r.payload, "hash": r.payload_hash, "prev_hash": r.prev_hash, "signature": r.signature, "created_at": r.created_at.isoformat() if r.created_at else None}

    def verify_chain(self, session_id: str) -> bool:
        rows = self.get_session(session_id)
        prev = "GENESIS"
        for r in rows:
            expected = self._hash(r["payload"], prev)
            if expected != r["hash"] or self._sign(r["hash"]) != r["signature"]:
                return False
            prev = r["hash"]
        return True
