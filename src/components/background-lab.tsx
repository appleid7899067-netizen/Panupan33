/**
 * Background Lab - แซนบ็อกซ์ลับหลังบ้าน
 * ไม่ต้องโปรโมท ไม่โชว์ในเมนูหลัก
 * เอาไว้ให้ AI ทดสอบเล่นๆเบื้องหลัง
 * 
 * ใช้: กด Ctrl+Shift+B 5 ครั้ง หรือเข้า /lab?secret=bossnu
 */

import { useEffect, useState } from "react";
import { backgroundLab, type BackgroundTest } from "@/lib/background-sandbox";
import { freeAI } from "@/lib/autonomous";

export function BackgroundLab() {
  const [tests, setTests] = useState<BackgroundTest[]>([]);
  const [stats, setStats] = useState({ total: 0, success: 0, failed: 0, hidden: 0, isRunning: false });
  const [isFreeRunning, setIsFreeRunning] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setTests(backgroundLab?.getHiddenTests() || []);
      setStats(backgroundLab?.getStats() || { total: 0, success: 0, failed: 0, hidden: 0, isRunning: false } as any);
      setIsFreeRunning(freeAI?.isRunningFree() || false);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // ฟังก์ชันให้ AI ทดสอบเล่นๆ
  const runRandomTest = () => {
    const randomCodes = [
      { code: `console.log("ทดสอบเล่นๆ ${Date.now()}"); const x = Math.random(); console.log("random:", x);`, purpose: "สุ่มเลขเล่นๆ" },
      { code: `const div = document.createElement('div'); div.textContent = 'ทดสอบ DOM'; console.log('DOM ok');`, purpose: "ทดสอบ DOM" },
      { code: `async function test() { await new Promise(r => setTimeout(r, 100)); console.log("async ok"); } test();`, purpose: "ทดสอบ async" },
      { code: `const arr = [1,2,3].map(x => x*2); console.log(arr); if(arr[0] !== 2) throw new Error("fail");`, purpose: "ทดสอบ array" },
    ];
    const random = randomCodes[Math.floor(Math.random() * randomCodes.length)];
    backgroundLab?.testQuietly({
      code: random.code,
      purpose: random.purpose,
      createdBy: "curiosity",
    });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-300 p-6 font-mono text-xs">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-sm font-medium text-zinc-100 mb-1">🕳️ Background Lab - แซนบ็อกซ์ลับหลังบ้าน</h1>
        <p className="text-[11px] text-zinc-500 mb-6">
          ไม่ต้องโปรโมท - ให้ AI ทดสอบเล่นๆเบื้องหลัง พังก็พังในที่ลับ ดีค่อยเอาออกมา
          <br />
          ปรัชญา: ยืมมาใช้ คืนพร้อมอัปเดต + ปล่อยให้วิ่งเอง
        </p>

        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-3">
            <div className="text-[10px] text-zinc-500 uppercase">สถานะแซนบ็อกซ์</div>
            <div className="mt-1 text-sm text-zinc-100">{stats.isRunning ? "🟢 เปิดลับๆ" : "🔴 ปิด"}</div>
          </div>
          <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-3">
            <div className="text-[10px] text-zinc-500 uppercase">AI อิสระ</div>
            <div className="mt-1 text-sm text-zinc-100">{isFreeRunning ? "🕊️ วิ่งเอง" : "😴 พัก"}</div>
          </div>
          <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-3">
            <div className="text-[10px] text-zinc-500 uppercase">ทดสอบลับ</div>
            <div className="mt-1 text-sm text-zinc-100">{stats.total} ครั้ง (ซ่อน {stats.hidden})</div>
          </div>
          <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-3">
            <div className="text-[10px] text-zinc-500 uppercase">สำเร็จ / พัง</div>
            <div className="mt-1 text-sm text-zinc-100">{stats.success} / {stats.failed}</div>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => freeAI?.letItRun()}
            className="rounded-md bg-zinc-100 text-zinc-900 px-3 py-1.5 text-xs hover:bg-white"
          >
            ปล่อยให้วิ่งเอง 🕊️
          </button>
          <button
            onClick={() => freeAI?.catchIt()}
            className="rounded-md bg-zinc-800 text-zinc-300 px-3 py-1.5 text-xs border border-zinc-700 hover:bg-zinc-700"
          >
            จับกลับ 😴
          </button>
          <button
            onClick={runRandomTest}
            className="rounded-md bg-zinc-800 text-zinc-300 px-3 py-1.5 text-xs border border-zinc-700 hover:bg-zinc-700"
          >
            ทดสอบเล่นๆ 1 ครั้ง
          </button>
          <button
            onClick={() => {
              for (let i = 0; i < 5; i++) setTimeout(runRandomTest, i * 300);
            }}
            className="rounded-md bg-zinc-800 text-zinc-300 px-3 py-1.5 text-xs border border-zinc-700 hover:bg-zinc-700"
          >
            ทดสอบ 5 ครั้งรวด
          </button>
        </div>

        <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
          <div className="px-4 py-2 border-b border-zinc-800 flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-zinc-500">การทดสอบลับหลังบ้าน (ไม่โปรโมท)</span>
            <span className="text-[10px] text-zinc-600">พังในที่ลับ ไม่กระทบใคร</span>
          </div>
          <div className="max-h-[60vh] overflow-auto">
            {tests.length === 0 ? (
              <div className="p-8 text-center text-zinc-600">ยังไม่มีการทดสอบลับ - ปล่อยให้ AI วิ่งเองสิ</div>
            ) : (
              <div className="divide-y divide-zinc-800">
                {tests.map((t) => (
                  <div key={t.id} className="p-3 flex gap-3 hover:bg-zinc-800/50">
                    <div className="shrink-0 mt-0.5">
                      {t.status === "success" ? "✅" : t.status === "failed" ? "❌" : "⏳"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-200">{t.purpose}</span>
                        <span className="text-[10px] text-zinc-500">{new Date(t.timestamp).toLocaleTimeString()}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700">{t.createdBy}</span>
                        {t.promoted ? <span className="text-[10px] text-amber-400">promoted</span> : <span className="text-[10px] text-zinc-600">hidden</span>}
                      </div>
                      <div className="mt-1 text-[11px] text-zinc-500 font-mono truncate">{t.code.slice(0, 120)}</div>
                      {t.logs.length > 0 && (
                        <div className="mt-1 text-[11px] text-zinc-400 bg-black/50 rounded p-1.5 font-mono">
                          {t.logs.slice(0, 3).join("\n")}
                        </div>
                      )}
                      {t.error && (
                        <div className="mt-1 text-[11px] text-red-400/80 bg-red-950/20 rounded p-1.5 font-mono">
                          {t.error.slice(0, 200)}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 text-[10px] text-zinc-600">{t.durationMs}ms</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 text-[11px] text-zinc-600 leading-relaxed">
          <p>💡 วิธีใช้:</p>
          <p>- แซนบ็อกซ์นี้ซ่อนอยู่ ไม่โชว์ในเมนูหลัก ตามที่ Boss สั่ง "ไม่ต้องโปรโมท"</p>
          <p>- เข้าถึงโดย: กด Ctrl+Shift+B 5 ครั้ง หรือไปที่ /lab?secret=bossnu</p>
          <p>- AI จะทดสอบโค้ดเล่นๆเบื้องหลัง พังก็พังในที่ลับ ไม่กระทบ user</p>
          <p>- ถ้าสำเร็จ จะเก็บเป็น "ทำไว้แล้วเมื่อวาน" ไว้ใช้ตอนมีคนสั่งงานคล้ายกัน</p>
          <p>- นี่คือที่มาของ "สั่งวันนี้เสร็จเมื่อวาน" ของจริง</p>
        </div>
      </div>
    </div>
  );
}
