const API = location.hostname === "localhost" ? "http://localhost:8000" : `${location.protocol}//${location.hostname}:8000`;
async function loadApprovals() {
  try {
    const r = await fetch(`${API}/hitl/pending`);
    const items = await r.json();
    document.getElementById("approvals").innerHTML = items.length
      ? items.map(a => `<div>${a.request_id || a.action_id}: ${a.reason || ""}</div>`).join("")
      : "<p>ไม่มีรายการรออนุมัติ</p>";
  } catch { document.getElementById("approvals").innerHTML = "API offline"; }
}
async function runRedteam() {
  const out = document.getElementById("redteam-out");
  out.textContent = "running...";
  try {
    const r = await fetch(`${API}/redteam/run`, { method: "POST" });
    out.textContent = JSON.stringify(await r.json(), null, 2);
  } catch (e) { out.textContent = String(e); }
}
setInterval(loadApprovals, 5000);
loadApprovals();
