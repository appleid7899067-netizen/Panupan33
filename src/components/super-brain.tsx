/**
 * SUPER 3: ONE BRAIN - สมองเดียว 100 โมเดล
 * ต้องให้วิ่งในโมเดลที่ผู้ใช้เลือก ไม่นั้นเสียกันบอบ
 */

import { useState, useEffect } from "react";
import { Brain, Check, DollarSign, Zap, Heart, Clock, Globe, Cpu } from "lucide-react";
import { superBrain, type BrainModel } from "@/lib/super-brain";

export function SuperBrain() {
  const [models, setModels] = useState<BrainModel[]>([]);
  const [selected, setSelected] = useState<BrainModel | null>(null);
  const [wasteStats, setWasteStats] = useState<any>(null);
  const [filter, setFilter] = useState<"all" | "free" | "cheap" | "thai">("all");

  useEffect(() => {
    const interval = setInterval(() => {
      setModels(superBrain?.getEnabledModels() || []);
      setSelected(superBrain?.getSelectedModel() || null);
      setWasteStats(superBrain?.getWasteStats() || null);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const filtered = models.filter(m => {
    if (filter === "free") return m.cost === "free";
    if (filter === "cheap") return m.cost === "cheap" || m.cost === "free";
    if (filter === "thai") return m.supports.thai;
    return true;
  });

  const handleSelect = (id: string) => {
    superBrain?.selectModel(id);
  };

  const handleTest = async () => {
    if (!superBrain) return;
    const result = await superBrain.runInSelectedModel("ทดสอบว่าวิ่งในโมเดลที่เลือกเท่านั้น");
    alert(`${result.model.nameTh} ตอบแล้ว\nประหยัดไป $${result.wastePrevented.toFixed(2)} เพราะไม่รัน 100 โมเดล`);
  };

  return (
    <div className="min-h-[calc(100dvh-8rem)] bg-[#0a0a0a] text-zinc-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-xl font-medium flex items-center gap-2">
              <Brain className="size-5" /> ONE BRAIN • 100 สมองเป็น 1
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              ต้องให้วิ่งในโมเดลที่ผู้ใช้เลือก ไม่นั้นเสียกันบอบ (เปลือง) — เลือก 1 วิ่ง 1 ไม่รัน 100 พร้อมกัน
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-zinc-500">ประหยัดไปแล้ว</div>
            <div className="text-lg font-medium text-green-400">${wasteStats?.totalWastePrevented?.toFixed(2) || "0.00"}</div>
            <div className="text-[11px] text-zinc-600">เพราะไม่รัน 100 โมเดล</div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-3">
            <div className="text-[11px] text-zinc-500 uppercase flex items-center gap-1"><Cpu className="size-3" /> โมเดลทั้งหมด</div>
            <div className="mt-1 text-lg font-medium">100</div>
            <div className="text-[11px] text-zinc-600">รวมทุกค่าย</div>
          </div>
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-3">
            <div className="text-[11px] text-zinc-500 uppercase flex items-center gap-1"><Zap className="size-3" /> เปิดใช้งาน</div>
            <div className="mt-1 text-lg font-medium">{models.length}</div>
            <div className="text-[11px] text-zinc-600">ที่เหลือปิดเพื่อไม่เปลือง</div>
          </div>
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-3">
            <div className="text-[11px] text-zinc-500 uppercase flex items-center gap-1"><Heart className="size-3" /> ฟรี</div>
            <div className="mt-1 text-lg font-medium text-green-400">{models.filter(m => m.cost === "free").length}</div>
            <div className="text-[11px] text-zinc-600">ไม่เสียตังค์</div>
          </div>
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-3">
            <div className="text-[11px] text-zinc-500 uppercase">เลือกแล้ว</div>
            <div className="mt-1 text-sm font-medium truncate">{selected?.nameTh || "ยังไม่เลือก"}</div>
            <div className="text-[11px] text-zinc-600">วิ่งในโมเดลนี้เท่านั้น</div>
          </div>
        </div>

        {/* Selected Model Banner */}
        {selected && (
          <div className="rounded-xl bg-white text-black p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-black text-white grid place-items-center font-medium">
                {selected.name[0]}
              </div>
              <div>
                <div className="font-medium">{selected.nameTh} • เลือกแล้ววิ่งในนี้เท่านั้น</div>
                <div className="text-xs text-zinc-600">{selected.descriptionTh} • {selected.cost === "free" ? "ฟรี ไม่เปลือง" : `${selected.cost}`} • {selected.speed} • {selected.quality}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-1 rounded-full bg-black text-white">วิ่งในโมเดลนี้เท่านั้น</span>
              <button onClick={handleTest} className="text-xs px-3 py-1.5 rounded-full bg-zinc-900 text-white hover:bg-black">
                ทดสอบวิ่ง
              </button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => setFilter("all")} className={`text-xs px-3 py-1.5 rounded-full border ${filter === "all" ? "bg-white text-black border-white" : "bg-zinc-900 text-zinc-400 border-zinc-800"}`}>ทั้งหมด {models.length}</button>
          <button onClick={() => setFilter("free")} className={`text-xs px-3 py-1.5 rounded-full border ${filter === "free" ? "bg-white text-black border-white" : "bg-zinc-900 text-zinc-400 border-zinc-800"}`}>ฟรี {models.filter(m => m.cost === "free").length}</button>
          <button onClick={() => setFilter("cheap")} className={`text-xs px-3 py-1.5 rounded-full border ${filter === "cheap" ? "bg-white text-black border-white" : "bg-zinc-900 text-zinc-400 border-zinc-800"}`}>ถูก+ฟรี</button>
          <button onClick={() => setFilter("thai")} className={`text-xs px-3 py-1.5 rounded-full border ${filter === "thai" ? "bg-white text-black border-white" : "bg-zinc-900 text-zinc-400 border-zinc-800"}`}>ไทยได้ {models.filter(m => m.supports.thai).length}</button>
          <span className="ml-auto text-[11px] text-zinc-600">เลือก 1 วิ่ง 1 ไม่เปลือง ไม่เสียกันบอบ</span>
        </div>

        {/* Models Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((model) => (
            <div
              key={model.id}
              onClick={() => handleSelect(model.id)}
              className={`rounded-xl border p-3 cursor-pointer transition-all ${
                model.isSelected
                  ? "bg-white text-black border-white"
                  : "bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-100"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{model.nameTh}</span>
                    {model.isSelected && <Check className="size-4 shrink-0" />}
                  </div>
                  <div className={`text-xs mt-0.5 truncate ${model.isSelected ? "text-zinc-600" : "text-zinc-500"}`}>
                    {model.descriptionTh}
                  </div>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full border shrink-0 ml-2 ${
                  model.cost === "free" ? "bg-green-500/20 text-green-400 border-green-500/30" :
                  model.cost === "cheap" ? "bg-blue-500/20 text-blue-400 border-blue-500/30" :
                  "bg-amber-500/20 text-amber-400 border-amber-500/30"
                }`}>
                  {model.cost === "free" ? "ฟรี" : model.cost}
                </span>
              </div>
              
              <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                <span className={`text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 ${model.isSelected ? "bg-zinc-900 text-zinc-300" : "bg-zinc-800 text-zinc-400"}`}>
                  <Zap className="size-3" /> {model.speed}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${model.isSelected ? "bg-zinc-900 text-zinc-300" : "bg-zinc-800 text-zinc-400"}`}>
                  {model.quality}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${model.isSelected ? "bg-zinc-900 text-zinc-300" : "bg-zinc-800 text-zinc-400"}`}>
                  {model.contextLength / 1000}k
                </span>
                {model.supports.thai && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">ไทย</span>}
                {model.supports.code && <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">โค้ด</span>}
              </div>

              <div className="mt-2 flex items-center justify-between text-[11px]">
                <span className={model.isSelected ? "text-zinc-600" : "text-zinc-500"}>
                  ใช้ {model.usageCount} ครั้ง • ${model.totalCost.toFixed(3)}
                </span>
                <span className={model.isSelected ? "text-zinc-900 font-medium" : "text-zinc-400"}>
                  {model.provider}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Waste Prevention Banner */}
        <div className="mt-6 rounded-xl bg-green-950/30 border border-green-900/50 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-full bg-green-500/20 grid place-items-center">
              <DollarSign className="size-4 text-green-400" />
            </div>
            <div>
              <div className="text-sm font-medium text-green-300">ประหยัดแล้ว ${wasteStats?.totalWastePrevented?.toFixed(2) || "0.00"} — ไม่เสียกันบอบ</div>
              <div className="text-xs text-green-400/70">เพราะเลือกโมเดลเดียววิ่ง ไม่รัน 100 โมเดลพร้อมกันให้เปลือง</div>
            </div>
          </div>
          <div className="text-right text-xs text-green-400/60">
            <div>วิ่ง {wasteStats?.totalUsage || 0} ครั้ง</div>
            <div>จ่าย ${wasteStats?.totalCost?.toFixed(3) || "0.000"} เท่านั้น</div>
          </div>
        </div>

        <div className="mt-4 text-center text-[11px] text-zinc-600">
          100 โมเดลเป็น 1 สมอง • เลือก 1 วิ่ง 1 ไม่เปลือง • ฟรีด้วย Puter • ยืมได้ทั่วโลก
        </div>
      </div>
    </div>
  );
}
