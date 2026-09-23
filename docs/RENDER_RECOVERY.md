# Render — ไล่เวอร์ชันเก่า / ขึ้นของใหม่

## สถานะ

- เว็บอาจยังเสิร์ฟ **build เก่าที่สำเร็จครั้งสุดท้าย** แม้ main มีโค้ดใหม่แล้ว
- ถ้า deploy ล้ม → Render **ไม่สลับ** ไปเวอร์ชันใหม่ (ค้างของเก่า)

## ทำบน Dashboard (ต้องทำมือ 1 ครั้ง)

1. เปิด https://dashboard.render.com → service **panupanboss**
2. ตรวจว่าเชื่อม repo `appleid7899067-netizen/Panupan33` branch **main**
3. **Settings**
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/`
4. **Manual Deploy** → **Clear build cache & deploy**
5. รอ Logs:
   - ต้องเห็น `[render-build] ... skipping vite build in postinstall`
   - แล้ว `vite build` ในขั้น Build Command ต้องผ่าน
6. Deploy เขียวแล้ว hard-refresh เว็บ (Ctrl+Shift+R)

## ตรวจว่าขึ้นของใหม่

```bash
curl -sS https://panupanboss.onrender.com/boss-build.txt
# ควรเห็น boss-build=...
```

ถ้ายัง 404 = ยังเป็น build เก่าที่ยังไม่มีไฟล์นี้

## Commit ล่าสุดที่ควรขึ้น

- `667bc41` boss-engine runners
- `b4c8a75` agent-loop wire
- `afbe6cf` puter-tool-loader regex fix
- `37402a0` postinstall ไม่ vite-build แล้ว
