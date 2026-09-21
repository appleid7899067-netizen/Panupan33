import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BackgroundLab } from "@/components/background-lab";

export const Route = createFileRoute("/lab")({ component: LabPage });

function LabPage() {
  const search = useSearch({ from: "/lab" }) as { secret?: string };
  const [unlocked, setUnlocked] = useState(false);
  const [konamiCount, setKonamiCount] = useState(0);

  // ลับ: ต้องใส่ ?secret=bossnu หรือกด Ctrl+Shift+B 5 ครั้ง
  useEffect(() => {
    if (search.secret === "bossnu") {
      setUnlocked(true);
      return;
    }

    const handleKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "b") {
        setKonamiCount((c) => {
          const next = c + 1;
          if (next >= 5) setUnlocked(true);
          return next;
        });
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [search.secret]);

  if (!unlocked) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-zinc-600 flex items-center justify-center font-mono text-xs p-6">
        <div className="text-center max-w-md">
          <div className="text-2xl mb-4">🕳️</div>
          <p className="text-zinc-300 mb-2">แซนบ็อกซ์ลับหลังบ้าน</p>
          <p className="leading-relaxed">
            ที่นี่คือที่ให้ AI ทดสอบเล่นๆเบื้องหลัง
            <br />
            ไม่ต้องโปรโมท ตามที่ Boss สั่ง
            <br />
            <br />
            วิธีเข้า: <span className="text-zinc-400">Ctrl+Shift+B 5 ครั้ง</span> หรือ{" "}
            <span className="text-zinc-400">/lab?secret=bossnu</span>
          </p>
          <p className="mt-6 text-[10px] text-zinc-700">
            กดไปแล้ว {konamiCount}/5 ครั้ง
          </p>
        </div>
      </div>
    );
  }

  return <BackgroundLab />;
}
