//#region node_modules/.nitro/vite/services/ssr/assets/provider-keys-B_SoxQZP.js
var API_KEY_CHANGED_EVENT = "bosses:api-key-changed";
var OPENROUTER_MODELS_EVENT = "bosses:openrouter-models";
var memoryKey = null;
var cachedOpenRouterModels = [];
function sessionGet() {
	try {
		return sessionStorage.getItem("bosses.ai.apiKey");
	} catch {
		return null;
	}
}
function sessionSet(value) {
	try {
		if (value) sessionStorage.setItem("bosses.ai.apiKey", value);
		else sessionStorage.removeItem("bosses.ai.apiKey");
	} catch {}
}
function notifyKeyChanged() {
	if (typeof window === "undefined") return;
	try {
		window.dispatchEvent(new Event(API_KEY_CHANGED_EVENT));
		window.dispatchEvent(new CustomEvent(OPENROUTER_MODELS_EVENT, { detail: cachedOpenRouterModels }));
	} catch {}
}
function getActiveApiKey() {
	return memoryKey ?? sessionGet();
}
function getCachedOpenRouterModels() {
	return cachedOpenRouterModels;
}
function clearActiveApiKey() {
	memoryKey = null;
	cachedOpenRouterModels = [];
	sessionSet(null);
	notifyKeyChanged();
}
function hasOpenRouterKey() {
	return Boolean(getActiveApiKey());
}
function detectKeyShape(key) {
	const value = key.trim();
	if (/^sk-or-/i.test(value)) return {
		provider: "openrouter",
		label: "OpenRouter",
		detail: "OpenRouter key. Boss will list models from OpenRouter and call OpenRouter only."
	};
	if (/^sk-ant-/i.test(value)) return {
		provider: "unknown",
		label: "Anthropic",
		detail: "This slot accepts OpenRouter keys (sk-or-...) only."
	};
	if (/^gsk_/i.test(value)) return {
		provider: "unknown",
		label: "Groq",
		detail: "This slot accepts OpenRouter keys (sk-or-...) only."
	};
	if (/^xai-/i.test(value)) return {
		provider: "unknown",
		label: "xAI",
		detail: "This slot accepts OpenRouter keys (sk-or-...) only."
	};
	if (/^AIza/i.test(value)) return {
		provider: "unknown",
		label: "Google",
		detail: "This slot accepts OpenRouter keys (sk-or-...) only."
	};
	return {
		provider: "unknown",
		label: "Unknown",
		detail: "Need an OpenRouter API key starting with sk-or-."
	};
}
function isChatModel(model) {
	return !/image|audio|video|embedding|rerank|transcription|moderation/i.test(model.id);
}
async function verifyOpenRouterKey(key) {
	const response = await fetch("https://openrouter.ai/api/v1/models", { headers: { Authorization: `Bearer ${key.trim()}` } });
	if (!response.ok) {
		const body = await response.text().catch(() => "");
		return {
			ok: false,
			error: `OpenRouter rejected the key (${response.status})${body ? `: ${body.slice(0, 180)}` : ""}`
		};
	}
	const data = await response.json();
	const models = (Array.isArray(data.data) ? data.data : []).filter(isChatModel);
	if (!models.length) return {
		ok: false,
		error: "OpenRouter key worked, but this account has no chat models to call."
	};
	return {
		ok: true,
		models
	};
}
async function connectApiKey(key) {
	const value = key.trim();
	if (!value) throw new Error("API key is empty.");
	const detection = detectKeyShape(value);
	if (detection.provider !== "openrouter") throw new Error(`${detection.label}: ${detection.detail}`);
	const verified = await verifyOpenRouterKey(value);
	if (!verified.ok) throw new Error(verified.error);
	memoryKey = value;
	cachedOpenRouterModels = verified.models;
	sessionSet(value);
	notifyKeyChanged();
	return {
		detection,
		models: verified.models
	};
}
function chooseOpenRouterModel(models, prompt) {
	if (!models.length) return null;
	const p = prompt.toLowerCase();
	const preferred = /code|coding|debug|bug|error|repo|github|typescript|javascript|python|rust|go|java|sql|deploy|fix|แก้|โค้ด|บั๊ก/.test(p) ? [
		"anthropic/",
		"openai/",
		"google/",
		"deepseek/",
		"qwen/",
		"x-ai/",
		"mistralai/"
	] : [
		"openai/",
		"google/",
		"anthropic/",
		"deepseek/",
		"qwen/"
	];
	for (const prefix of preferred) {
		const found = models.find((m) => m.id.startsWith(prefix) && isChatModel(m));
		if (found) return found;
	}
	return models.find(isChatModel) ?? models[0] ?? null;
}
async function callOpenRouter(opts) {
	const key = getActiveApiKey();
	if (!key) return {
		ok: false,
		error: "No OpenRouter API key is connected."
	};
	const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${key}`,
			"Content-Type": "application/json",
			"HTTP-Referer": typeof location !== "undefined" ? location.origin : "https://developer.puter.com",
			"X-Title": "Bossnu SlieLo"
		},
		body: JSON.stringify({
			model: opts.model,
			messages: opts.messages,
			stream: true
		})
	});
	if (!response.ok) {
		const body = await response.text().catch(() => "");
		return {
			ok: false,
			error: `OpenRouter error ${response.status}: ${body.slice(0, 500)}`
		};
	}
	if (!response.body) return {
		ok: false,
		error: "OpenRouter returned no response stream."
	};
	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let buffer = "";
	let full = "";
	while (true) {
		const { value, done } = await reader.read();
		if (done) break;
		buffer += decoder.decode(value, { stream: true });
		const lines = buffer.split("\n");
		buffer = lines.pop() ?? "";
		for (const raw of lines) {
			const line = raw.trim();
			if (!line.startsWith("data:")) continue;
			const payload = line.slice(5).trim();
			if (!payload || payload === "[DONE]") continue;
			try {
				const piece = JSON.parse(payload).choices?.[0]?.delta?.content ?? "";
				if (piece) {
					full += piece;
					opts.onDelta?.(full);
				}
			} catch {}
		}
	}
	if (!full.trim()) return {
		ok: false,
		error: "OpenRouter returned an empty response."
	};
	return {
		ok: true,
		text: full,
		model: opts.model,
		gateway: "openrouter"
	};
}
//#endregion
export { connectApiKey as a, hasOpenRouterKey as c, clearActiveApiKey as i, verifyOpenRouterKey as l, callOpenRouter as n, getActiveApiKey as o, chooseOpenRouterModel as r, getCachedOpenRouterModels as s, API_KEY_CHANGED_EVENT as t };
