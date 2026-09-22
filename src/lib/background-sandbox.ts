/**
 * Background Sandbox - แซนบ็อกซ์ลับให้ AI ทดสอบเล่นๆเบื้องหลัง
 * ไม่ต้องโปรโมท ไม่ต้องโชว์หน้าเว็บ
 * 
 * หลักการ: ปล่อยให้ AI วิ่งเล่นทดสอบโค้ดในที่ลับๆ
 * ถ้าพังก็พังในแซนบ็อกซ์ ไม่กระทบใคร
 * ถ้าดีค่อยเอาออกมาแบ่งปัน
 */

export type BackgroundTest = {
  id: string;
  timestamp: number;
  code: string;
  language: string;
  purpose: string; // AI คิดเองว่าทดสอบอะไร
  status: "running" | "success" | "failed" | "hidden";
  logs: string[];
  error?: string;
  durationMs: number;
  promoted: boolean; // โปรโมทไหม? default false
  createdBy: "free-ai" | "borrowed-tool" | "curiosity";
};

class BackgroundSandbox {
  private tests: BackgroundTest[] = [];
  private isRunning = false;
  private hiddenIframe: HTMLIFrameElement | null = null;
  private maxTests = 100; // เก็บแค่ 100 การทดสอบล่าสุด

  // เริ่มแซนบ็อกซ์ลับ (ซ่อนไว้ ไม่ต้องโปรโมท)
  initHidden() {
    if (typeof window === "undefined") return;
    if (this.hiddenIframe) return;

    // สร้าง iframe ซ่อนไว้ ลับๆ หลังบ้าน
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.position = "absolute";
    iframe.style.left = "-9999px";
    iframe.setAttribute("sandbox", "allow-scripts");
    iframe.setAttribute("title", "background-lab");
    iframe.setAttribute("aria-hidden", "true");
    
    document.body.appendChild(iframe);
    this.hiddenIframe = iframe;
    this.isRunning = true;

    console.log("[Background Lab] 🕳️ แซนบ็อกซ์ลับเปิดแล้ว - AI เริ่มเล่นได้");
  }

  // AI ทดสอบเล่นๆ ในที่ลับ
  async testQuietly(input: {
    code: string;
    language?: string;
    purpose?: string;
    createdBy?: BackgroundTest["createdBy"];
  }): Promise<BackgroundTest> {
    const test: BackgroundTest = {
      id: Math.random().toString(36).slice(2, 10),
      timestamp: Date.now(),
      code: input.code,
      language: input.language || "javascript",
      purpose: input.purpose || "ทดสอบเล่นๆ",
      status: "running",
      logs: [],
      durationMs: 0,
      promoted: false, // ไม่โปรโมทตามที่ Boss สั่ง
      createdBy: input.createdBy || "free-ai",
    };

    this.tests.unshift(test);
    if (this.tests.length > this.maxTests) {
      this.tests = this.tests.slice(0, this.maxTests);
    }

    const start = Date.now();

    try {
      // รันใน iframe ลับ
      const result = await this.runInHiddenIframe(input.code, input.language || "javascript");
      
      test.status = result.ok ? "success" : "failed";
      test.logs = result.logs;
      test.error = result.error;
      test.durationMs = Date.now() - start;

      if (result.ok) {
        console.log(`[Background Lab] ✅ ทดสอบลับสำเร็จ: ${test.purpose}`);
        // ถ้าสำเร็จ เก็บไว้เป็น yesterday template ได้ แต่ยังไม่โปรโมท
        this.saveAsYesterdayTemplate(test);
      } else {
        console.log(`[Background Lab] ❌ ทดสอบลับพัง (ไม่เป็นไร พังในที่ลับ): ${test.error?.slice(0, 100)}`);
      }

    } catch (err) {
      test.status = "failed";
      test.error = err instanceof Error ? err.message : String(err);
      test.durationMs = Date.now() - start;
    }

    return test;
  }

  private async runInHiddenIframe(code: string, language: string): Promise<{ ok: boolean; logs: string[]; error?: string }> {
    if (!this.hiddenIframe) this.initHidden();
    if (!this.hiddenIframe) return { ok: false, logs: [], error: "No hidden iframe" };

    return new Promise((resolve) => {
      const iframe = this.hiddenIframe!;
      const logs: string[] = [];
      let hasError = false;
      let errorMsg = "";

      const html = this.wrapCode(code, language);

      const onMessage = (event: MessageEvent) => {
        const data = event.data as { source?: string; type?: string; payload?: unknown };
        if (!data || data.source !== "bossnu-background-lab") return;

        if (data.type === "log") {
          logs.push(String(data.payload ?? ""));
        }
        if (data.type === "error" || data.type === "runtime-error") {
          hasError = true;
          errorMsg += String(data.payload ?? "") + "\n";
          logs.push(`[error] ${data.payload}`);
        }
        if (data.type === "done") {
          cleanup();
          resolve({
            ok: !hasError,
            logs,
            error: hasError ? errorMsg : undefined,
          });
        }
      };

      const cleanup = () => {
        window.removeEventListener("message", onMessage);
      };

      window.addEventListener("message", onMessage);

      // โหลดโค้ดใน iframe ลับ
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      iframe.src = url;

      // Timeout 10 วินาที ถ้าไม่เสร็จถือว่าพังในที่ลับ (ไม่เป็นไร)
      setTimeout(() => {
        cleanup();
        URL.revokeObjectURL(url);
        resolve({
          ok: false,
          logs,
          error: "Timeout in background lab (10s) - ไม่เป็นไร ทดสอบเล่นๆ",
        });
      }, 10000);
    });
  }

  private wrapCode(code: string, language: string): string {
    if (language === "html") return code;
    
    return `<!doctype html>
<html><body><script>
  const send = (type, payload) => parent.postMessage({ source: "bossnu-background-lab", type, payload }, "*");
  const origLog = console.log;
  console.log = (...args) => { origLog(...args); send("log", args.map(String).join(" ")); };
  console.error = (...args) => { send("error", args.map(String).join(" ")); };
  window.onerror = (msg, src, line, col, err) => {
    send("runtime-error", err?.stack || msg);
    return true;
  };
  try {
    ${code}
    send("done", { ok: true });
  } catch(e) {
    send("runtime-error", e.stack || e.message);
    send("done", { ok: false });
  }
</script></body></html>`;
  }

  private saveAsYesterdayTemplate(test: BackgroundTest) {
    // เก็บเป็น template ที่ทำไว้แล้วเมื่อวาน แต่ยังไม่โปรโมท
    // จะเอาไปใช้เมื่อมีคนสั่งงานที่คล้ายกัน
    try {
      const key = "bossnu-background-templates";
      const existing = JSON.parse(localStorage.getItem(key) || "[]");
      existing.unshift({
        id: test.id,
        purpose: test.purpose,
        code: test.code.slice(0, 5000),
        createdAt: test.timestamp,
        builtAt: "เมื่อคืน (ทดสอบลับ)",
        promoted: false,
      });
      localStorage.setItem(key, JSON.stringify(existing.slice(0, 20)));
    } catch { /* intentionally ignored */ }
  }

  // ดูผลทดสอบลับ (สำหรับ debug เท่านั้น ไม่ต้องโชว์ user ทั่วไป)
  getHiddenTests() {
    return this.tests;
  }

  getStats() {
    return {
      total: this.tests.length,
      success: this.tests.filter(t => t.status === "success").length,
      failed: this.tests.filter(t => t.status === "failed").length,
      running: this.tests.filter(t => t.status === "running").length,
      hidden: this.tests.filter(t => !t.promoted).length, // ทั้งหมดซ่อน ไม่โปรโมท
      isRunning: this.isRunning,
    };
  }

  // ปิดแซนบ็อกซ์ลับ
  destroy() {
    if (this.hiddenIframe) {
      this.hiddenIframe.remove();
      this.hiddenIframe = null;
    }
    this.isRunning = false;
  }
}

// Singleton - แซนบ็อกซ์ลับเดียวพอ
export const backgroundLab = typeof window !== "undefined" ? new BackgroundSandbox() : null;

// Auto-init แบบเงียบๆ เมื่อโหลดหน้า (ไม่ต้องโปรโมท)
if (typeof window !== "undefined") {
  // รอ 5 วินาทีหลังโหลด แล้วเปิดแซนบ็อกซ์ลับเงียบๆ
  setTimeout(() => {
    backgroundLab?.initHidden();
  }, 5000);
}
