# Render Recovery — panupanboss.onrender.com

## สถานะที่ตรวจล่าสุด (2026-09-23)

- `GET /` → **HTTP 200** (ขึ้นแล้ว)
- `/api/health` → 404 (ยังไม่มี health API แยก — ใช้ `/` เป็น healthCheckPath)
- Assets JS/CSS โหลดได้

## ทำไมถึง “ล่ม” บ่อยบน Render Free

1. **Spin down** — Free plan ปิด service หลังไม่ใช้งาน ~15 นาที ครั้งถัดไป cold start ช้า/timeout
2. **Build fail** หลัง push ใหม่ → service ค้างเวอร์ชันเก่าหรือ 502
3. **OOM / memory** ตอน build ใหญ่
4. **Wrong start command** — ต้องเป็น `npm start` (= `node .output/server/index.mjs`) หลัง `vite build`

## วิธีซ่อมเร็ว

1. เปิด [Render Dashboard](https://dashboard.render.com) → service **panupanboss**
2. ดู **Events / Logs** ว่าแดงตรง Build หรือ Runtime
3. กด **Manual Deploy → Clear build cache & deploy**
4. ตรวจ Start Command = `npm start`
5. ตรวจ Build Command = `npm install && npm run build`
6. ตั้ง Health Check Path = `/`
7. ถ้า Free spin-down รบกวน: อัปเกรด Starter หรือยิง cron ทุก 10 นาทีเข้า `https://panupanboss.onrender.com/`

## ใน repo

- `render.yaml` — blueprint แนะนำ
- `scripts/render-build.mjs` — postinstall build เมื่อ `RENDER=true`
- `package.json` → `"start": "node .output/server/index.mjs"`

## ตรวจหลังซ่อม

```bash
curl -sS -o /dev/null -w "%{http_code}\n" https://panupanboss.onrender.com/
# ควรได้ 200
```
