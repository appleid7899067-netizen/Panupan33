import { f as ensurePuter } from "./router-B7-d8jQy.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/puter-models-Dp1fHGPS.js
function flattenModels(value) {
	if (!value) return [];
	if (Array.isArray(value)) return value.flatMap((item) => {
		if (typeof item === "string" && item.trim()) return [{
			id: item.trim(),
			name: item.trim()
		}];
		if (item && typeof item === "object") {
			const rec = item;
			const id = String(rec.id ?? rec.model ?? rec.slug ?? "").trim();
			if (!id) return [];
			return [{
				id,
				name: String(rec.name ?? rec.title ?? id),
				provider: rec.provider ? String(rec.provider) : void 0
			}];
		}
		return [];
	});
	if (typeof value === "object") {
		const rec = value;
		return flattenModels(rec.models ?? rec.data ?? rec.items ?? []);
	}
	return [];
}
async function listLivePuterModels() {
	const puter = await ensurePuter();
	if (typeof puter.ai.listModels !== "function") return [];
	return flattenModels(await puter.ai.listModels());
}
//#endregion
export { listLivePuterModels as t };
