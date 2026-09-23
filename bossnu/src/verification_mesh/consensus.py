class MeshConsensus:
    def decide(self, results: dict) -> dict:
        ethics = results.get("ethics", {})
        if not ethics.get("passed", True):
            return {"approved": False, "decision": "ethics_veto", "reason": str(ethics.get("issues"))}
        fails = [k for k, v in results.items() if not v.get("passed", True)]
        if fails:
            return {"approved": False, "decision": "rejected", "reason": f"failed layers: {', '.join(fails)}"}
        return {"approved": True, "decision": "approved", "reason": "all layers passed"}
