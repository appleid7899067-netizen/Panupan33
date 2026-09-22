# Yandex Integration

BossnuGrok ตั้ง Yandex เป็น search engine เริ่มต้นผ่าน Search Router

## Flow

User Goal -> Web Search Skill -> Search Router -> Yandex -> Results -> AI Summary

## ตั้งค่า

localStorage.setItem("search_engine", "yandex");
localStorage.setItem("yandex_api_key", "YOUR_KEY");
localStorage.setItem("yandex_user", "YOUR_USER");

ถ้าไม่มี credentials ระบบจะลอง browser fallback ผ่าน CORS proxy แบบ best-effort

## เปลี่ยน engine

import { setSearchEngine } from "@/lib/bossnugrok/search-router";

setSearchEngine("yandex");
setSearchEngine("duckduckgo");
setSearchEngine("brave");

## Security

สำหรับ production ไม่ควรเก็บ secret ใน localStorage หากหลีกเลี่ยงได้ ควรย้าย Yandex request ไป server route และเก็บ key ใน environment variables

อย่าถือว่า Yandex API ฟรีหรือไม่มี rate limit โดยอัตโนมัติ เพราะโควตาและเงื่อนไขขึ้นกับบริการและบัญชีที่ใช้งาน

พัฒนาโดย ภาณุพันธ์ และ สลี่ ออลา
