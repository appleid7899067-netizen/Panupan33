# คู่มือออกแอป Android — Boss Chat (โคลนสไตล์ ChatGPT)

> สรุปสั้น: โคลนแอป ChatGPT จาก Play Store มาตรง ๆ ไม่ได้ (ติดลิขสิทธิ์ + แกะโค้ดไม่ได้)
> แต่รีโพนี้มี **แอปแชท AI ที่เขียนใหม่เอง หน้าตา/การใช้งานแบบ ChatGPT** พร้อมแล้ว
> ใช้โมเดลฟรีผ่าน Puter — เอกสารนี้คือวิธีเอาขึ้นมือถือ Android และ Play Store

## 1. สิ่งที่อยู่ในรีโพแล้ว

| ส่วน | ไฟล์/คำสั่ง | หมายเหตุ |
|---|---|---|
| หน้าแชทมือถือ | `src/components/mobile-chat.tsx` + route `/app` | mobile-first, ประวัติในเครื่อง, สตรีมคำตอบ, พูดแทนพิมพ์, เลือกโมเดล |
| บิลด์เว็บแบบ static | `npm run build:mobile` → `dist-mobile/` | ไม่พึ่ง server ฝั่งเว็บหลัก |
| โปรเจกต์ Android | `android/` + `capacitor.config.ts` | appId `com.bossnu.chat` |
| ไอคอนแอป | `mobile/icon-source.png`, `mobile/icon-512.png` | แตกใส่ `mipmap-*` ทุกขนาดแล้ว |

```bash
npm run build:mobile     # บิลด์ dist-mobile/
npm run mobile:android   # บิลด์ + sync เข้าโปรเจกต์ android/
npx cap open android     # เปิดใน Android Studio
```

## 2. ทางเลือกที่ 1 — ติดตั้งเป็น PWA (เร็วสุด, ไม่ต้องผ่าน Play Store)

1. เปิดเว็บที่ deploy แล้วบนมือถือ Android (Chrome) ไปที่ `/app`
2. เมนู ⋮ → **เพิ่มลงในหน้าจอหลัก / Install app**
3. ได้ไอคอนเปิดเต็มจอเหมือนแอปเนทีฟ ใช้งานได้ครบ **รวมถึงล็อกอิน Puter**

## 3. ทางเลือกที่ 2 — ขึ้น Play Store ด้วย TWA/Bubblewrap (แนะนำ)

วิธีนี้ห่อเว็บ `/app` เป็นแอป Play Store ตรง ๆ — **ล็อกอิน Puter ทำงาน 100%**
เพราะรันใน Chrome เบราว์เซอร์ ไม่ใช่ WebView

1. Deploy เว็บหลักขึ้น HTTPS ก่อน (ดู `render.yaml` / Vercel) เช่น `https://boss.example.com`
2. ติดตั้ง Bubblewrap: `npm i -g @bubblewrap/cli`
3. สร้างโปรเจกต์ TWA:
   ```bash
   bubblewrap init --manifest=https://boss.example.com/__grok/manifest.webmanifest
   # ตอนถาม start URL ให้ใส่ https://boss.example.com/app
   ```
4. เอาไฟล์ `assetlinks.json` ที่ Bubblewrap สร้างให้ ไปวางที่
   `https://boss.example.com/.well-known/assetlinks.json` แล้วยืนยันว่าเปิดได้
5. `bubblewrap build` → ได้ไฟล์ `.aab` นำไปอัปโหลด Play Console

## 4. ทางเลือกที่ 3 — แอป Native ด้วย Capacitor (APK/AAB)

โปรเจกต์ `android/` เตรียมไว้ให้แล้ว เหลือแค่บิลด์ใน Android Studio
(ต้องมี JDK 17 + Android SDK — ทำบนเครื่องตัวเอง ไม่ใช่ใน sandbox นี้)

1. `npm run mobile:android` แล้ว `npx cap open android`
2. เสียบมือถือจริงหรือเปิด Emulator กด **Run** เพื่อทดสอบ
3. เมนู **Build → Generate App Bundle/APK** → สร้าง keystore ครั้งแรก
   (เก็บไฟล์ `.jks` + รหัสให้ดี หาย = อัปเดตแอปเดิมไม่ได้)
4. ได้ไฟล์ `.aab` ใน `android/app/build/outputs/` เอาไปอัปโหลด Play Console

> ⚠️ ข้อควรระวัง: หน้าล็อกอิน Puter เปิดเป็น popup — ใน WebView ของ Capacitor
> อาจไม่เด้ง ถ้าเจอปัญหานี้ให้ใช้ **ทางเลือกที่ 2 (TWA)** แทน หรือเปิดล็อกอิน
> ผ่านเบราว์เซอร์ภายนอกแล้วกลับเข้าแอป

## 5. เช็คลิสต์ก่อนส่ง Play Console

- [ ] ชื่อแอป + คำอธิบายสั้น/ยาว (ภาษาไทย + อังกฤษ)
- [ ] ไอคอน 512×512 — ใช้ `mobile/icon-512.png` ได้เลย
- [ ] Feature graphic 1024×500 + ภาพหน้าจอ (แคปจากมือถือจริงอย่างน้อย 2 ภาพ)
- [ ] Privacy Policy — ระบุว่า: ประวัติแชทเก็บในเครื่องผู้ใช้, ข้อความที่ส่งถูกส่งไป
      Puter/ผู้ให้บริการโมเดลที่เลือกเพื่อสร้างคำตอบ, ไม่ขายข้อมูล
- [ ] Content rating questionnaire + กลุ่มเป้าหมาย + ประเทศที่เปิดขาย
- [ ] ทดสอบบนมือถือจริง: ส่งแชท / สลับโมเดล / ลบประวัติ / หมุนจอ / ออฟไลน์

## 6. เปลี่ยนชื่อ/แพ็กเกจแอป

- ชื่อที่แสดง: `capacitor.config.ts` → `appName`
- Application ID: `capacitor.config.ts` → `appId` **และ**
  `android/app/build.gradle` → `applicationId` (ต้องตรงกัน)
- หลังเปลี่ยนให้รัน `npx cap sync android` ใหม่อีกรอบ
