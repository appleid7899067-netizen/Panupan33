"""Prometheus metrics — every Dubai layer"""
from collections import defaultdict
from typing import Optional
import time

class Metrics:
    def __init__(self):
        self.counters = defaultdict(int)
        self.histograms = defaultdict(list)
        self.gauges = {}

    def inc(self, name: str, labels: Optional[dict] = None, value: int = 1):
        self.counters[self._key(name, labels)] += value

    def observe(self, name: str, value: float, labels: Optional[dict] = None):
        key = self._key(name, labels)
        self.histograms[key].append(value)
        if len(self.histograms[key]) > 1000:
            self.histograms[key] = self.histograms[key][-500:]

    def set_gauge(self, name: str, value: float, labels: Optional[dict] = None):
        self.gauges[self._key(name, labels)] = value

    def timed(self, name: str, labels: Optional[dict] = None):
        metrics_self = self
        class _T:
            def __enter__(self_inner):
                self_inner.t0 = time.perf_counter()
                return self_inner
            def __exit__(self_inner, *a):
                metrics_self.observe(name, (time.perf_counter() - self_inner.t0) * 1000, labels)
        return _T()

    def _key(self, name: str, labels: Optional[dict]) -> str:
        if not labels:
            return name
        parts = ",".join(f'{k}="{v}"' for k, v in sorted(labels.items()))
        return f"{name}{{{parts}}}"

    def export_prometheus(self) -> str:
        lines = ["# HELP bossnu_dubai Dubai-grade layer metrics"]
        for k, v in sorted(self.counters.items()):
            lines.append(f"bossnu_counter_{k} {v}")
        for k, vals in sorted(self.histograms.items()):
            if vals:
                lines.append(f"bossnu_hist_{k}_count {len(vals)}")
                lines.append(f"bossnu_hist_{k}_sum {sum(vals):.4f}")
        for k, v in sorted(self.gauges.items()):
            lines.append(f"bossnu_gauge_{k} {v}")
        return "\n".join(lines) + "\n"

metrics = Metrics()
