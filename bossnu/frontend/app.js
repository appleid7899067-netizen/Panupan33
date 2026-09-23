const API = window.location.hostname === "localhost"
  ? "http://localhost:8000"
  : `${window.location.protocol}//${window.location.hostname}:8000`;
let sessionId = localStorage.getItem("bossnu_session") || crypto.randomUUID();
localStorage.setItem("bossnu_session", sessionId);
const $ = (id) => document.getElementById(id);
const messages = $("messages"), form = $("chat-form"), input = $("chat-input");
const traceList = $("trace-list"), evidenceList = $("evidence-list");
const statusDot = $("status-dot"), statusText = $("status-text");

async function checkHealth() {
  try {
    const r = await fetch(`${API}/health`);
    if (r.ok) {
      statusDot.className = "online";
      const data = await r.json();
      statusText.textContent = `${(data.tools_healthy || []).length} tools healthy`;
    } else throw new Error("bad");
  } catch {
    statusDot.className = "offline";
    statusText.textContent = "offline";
  }
}
checkHealth();
setInterval(checkHealth, 30000);

function addTrace(event, data) {
  const div = document.createElement("div");
  div.className = "trace-item" + (event === "gate_result" ? (data.approved ? " ok" : " err") : "");
  div.textContent = `${event}: ${JSON.stringify(data).slice(0, 120)}`;
  traceList.prepend(div);
}

function renderMarkdown(text) {
  return text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/```(\w+)?\n([\s\S]*?)```/g, "<pre>$2</pre>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br>");
}

function addMessage(text, role, verified) {
  const div = document.createElement("div");
  div.className = `msg ${role}`;
  div.innerHTML = renderMarkdown(text);
  if (role === "boss" && verified !== undefined) {
    const badge = document.createElement("div");
    badge.className = `badge ${verified ? "verified" : "unverified"}`;
    badge.textContent = verified ? "✓ verified" : "⚠ unverified";
    div.appendChild(badge);
  }
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

function renderEvidence(evidence) {
  if (!evidence || !evidence.length) {
    evidenceList.innerHTML = '<p class="muted">ยังไม่มีหลักฐาน</p>';
    return;
  }
  evidenceList.innerHTML = evidence.map(e => `
    <div class="evidence-item">
      <div><strong>${e.kind}</strong> — ${e.id}</div>
      <div class="muted">${e.created_at || ""}</div>
      <div>${JSON.stringify(e.payload).slice(0, 150)}</div>
    </div>`).join("");
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  addMessage(text, "user");
  input.value = "";
  input.disabled = true;
  try {
    const r = await fetch(`${API}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, session_id: sessionId }),
    });
    const data = await r.json();
    addMessage(data.response, "boss", data.verified);
    renderEvidence(data.evidence);
    (data.events || []).forEach(ev => addTrace(ev.event, ev.data));
  } catch (err) {
    addMessage(`❌ Error: ${err.message}`, "boss", false);
  } finally {
    input.disabled = false;
    input.focus();
  }
});
input.focus();
