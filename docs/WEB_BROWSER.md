# Public browser (forced web_search)

`web_search` ถูกบังคับให้ใช้ **บราวเซอร์สาธารณะ** เท่านั้น:

1. User-Agent แบบ Chrome จริง
2. เข้าได้เฉพาะ **HTTPS โฮสต์สาธารณะ** (บล็อก localhost / private IP / metadata)
3. ค้นผ่าน DuckDuckGo HTML (`html.duckduckgo.com`) แบบ navigate จริง
4. เปิดหน้าผลลัพธ์ด้วย `web_browse` ได้ทุกที่บนอินเทอร์เน็ตสาธารณะ

## Tools

| Tool | พฤติกรรม |
|------|----------|
| `web_search` | บังคับ browser search (DDG) — ไม่พึ่ง OpenAI เป็นหลัก |
| `web_browse` | เปิด URL สาธารณะ ดึง title + ข้อความ |
| `web_check` | HEAD/GET สถานะ HTTPS สาธารณะ |
| `web_fetch` | ดึงเนื้อหาหน้าสาธารณะ |

## SSRF

`assertPublicHttpsUrl` ปฏิเสธ: localhost, `*.local`, RFC1918, link-local, metadata.
