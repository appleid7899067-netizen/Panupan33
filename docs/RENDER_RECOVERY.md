# Render Recovery — panupanboss.onrender.com

## อาการล่าสุด (2026-09-23) — 2 รอบติด

```
Exited with status 1 while building your code.
npm error command failed
npm error command sh -c node scripts/render-build.mjs
Source: b212954
```

**สาเหตุ:** `postinstall` → `scripts/render-build.mjs` รัน `vite build` ระหว่าง `npm install` บน Render → พัง status 1

**แก้แล้ว:** `render-build.mjs` **ไม่รัน vite build ใน postinstall** แล้ว (exit 0) — build จริงอยู่ที่ Build Command เท่านั้น

## ตั้งค่า Dashboard

| ช่อง | ค่า |
|------|-----|
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` |
| **Health Check Path** | `/` |
| **Node** | `22` |

## หลังมี commit แก้ postinstall

1. Manual Deploy → **Clear build cache & deploy**
2. Logs ควรเห็น: `[render-build] ... skipping vite build in postinstall`
3. จากนั้นขั้น `npm run build` ต้องเขียว
4. เปิด https://panupanboss.onrender.com/ ได้ 200

## Free plan spin-down

Cold start ช้าหลังไม่ใช้ ~15 นาที — ไม่ใช่ build fail คนละอาการ
