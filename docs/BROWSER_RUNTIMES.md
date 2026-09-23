# Browser multi-language runtimes

รันโค้ดบน**บราวเซอร์จริง** + **จำการติดตั้ง** (ครั้งที่ 2 ไม่พลาด / ไม่โหลดซ้ำโดยไม่จำเป็น)

## ภาษาที่รองรับ

| ภาษา | เอนจิน |
|------|--------|
| JavaScript / TypeScript | iframe |
| HTML / CSS | iframe |
| Python | Pyodide (CDN) |
| Lua | Fengari |
| SQL | sql.js |
| Ruby / PHP | lite subset (+ memory) |
| Shell | echo/printf subset |
| JSON / Markdown | native |

## เครื่องมือ

- `sandbox_run` — รันโค้ด (auto-install runtime)
- `sandbox_install` — ติดตั้งภาษา (หรือ `all`)
- `sandbox_languages` — รายการภาษา + สถานะ memory

Memory key: `localStorage["bossnu.browserRuntimes.v1"]`
