# CodingFleet.com หลักการ + Bossnu SlieLo

> www.CodingFleet.com หลักการ

## CodingFleet คืออะไร?

จากเว็บหลัก https://www.codingfleet.com:

**"Revolutionize Your Coding with AI-Powered Tools"**
- Generate, convert, explain, and debug code faster than ever
- Chat with the best AI models, execute code in sandboxes, and ship with confidence
- 77,352+ Brilliant Minds, 1,504,944+ Generations
- 20+ top LLMs: OpenAI, Anthropic, Google, Meta, DeepSeek, xAI, Mistral, Qwen

## หลักการ 7 ข้อของ CodingFleet

### 1. ไม่ยึดติดเจ้าเดียว (Multi-LLM)
- ใช้ได้ 20+ โมเดล ไม่ล็อค OpenAI เจ้าเดียว
- เลือกได้: OpenAI, Anthropic, Google, xAI, DeepSeek, Mistral, Qwen
- **ตรงกับปรัชญาคุณ:** "ยืมมาใช้ ไม่ยึดติด ใช้ได้ทั่วโลก"

### 2. เครื่องมือครบวงจร (Full Suite)
- Code Generator - สร้างโค้ด
- Code Assistant - แก้บั๊ก ปรับปรุง
- Code Converter - แปลงภาษา
- Code Explainer - อธิบายโค้ด
- Code Enhancer - ปรับปรุงคุณภาพ
- Documentation Generator - สร้างเอกสาร
- Unit Test Generator - สร้างเทส
- Diagram Generator - สร้างไดอะแกรม
- Code Runner - รันโค้ดใน sandbox
- AI Chat - แชทกับ AI พร้อม memory, file upload, web search

**ตรงกับปรัชญาคุณ:** "เครื่องมือสื่อสาร เครื่องมือสารอาหาร"

### 3. Ship with Confidence (มีหลักฐาน)
- ไม่ใช่แค่สร้างโค้ด แต่รันทดสอบใน sandbox ได้เลย
- Execute and test in secure isolated sandbox
- **ตรงกับปรัชญาคุณ:** "ทำตัวเองให้ดีก่อน ก่อนไปสอนคนอื่น" + verification gate ของ Bossnu

### 4. Web Search + URL Fetching (ยืมความรู้โลก)
- AI ดึงข้อมูลจาก URL ได้โดยตรง
- Web browsing - ค้นหาข้อมูลล่าสุด
- **ตรงกับปรัชญาคุณ:** "ยืมมาใช้จากทั่วโลกอินเตอร์เน็ต" - Google, Yandex

### 5. Parallel Agents (ปล่อยให้วิ่งเอง)
- รันหลาย agent พร้อมกันได้
- **ตรงกับปรัชญาคุณ:** "ไม่บังคับ ปล่อยให้วิ่งเอง"

### 6. Privacy First (ไม่ยึดข้อมูล)
- EU-based hosting Frankfurt
- Privacy-Focused Models - ไม่เอา prompt ไปเทรน
- Private Session Mode - ไม่เก็บข้อมูลหลังจบ session
- **ตรงกับปรัชญาคุณ:** "ไม่เอาหน้า ไม่เอาความยิ่งใหญ่"

### 7. Flexible & Open (ยืดหยุ่น)
- เริ่มฟรี อัปเกรดเมื่อต้องการ
- Credit-based ไม่ใช่ subscription บังคับ
- File and folder uploads
- **ตรงกับปรัชญาคุณ:** "ยืมมาใช้ เสร็จคืนพร้อมอัปเดต"

## Bossnu SlieLo ทำตามหลักการ CodingFleet ยังไง?

ดูใน `src/lib/puter-tool-loader.ts`:

```ts
const TOOLS_URL = "https://www.codingfleet.com/api/tools"
const PLUGINS_URL = "https://bosses690.vercel.app/plugins"
const TOOL_LIMIT = 20

// ยืมเครื่องมือจาก CodingFleet
async function loadCodingFleetTools() {
  fetch("https://www.codingfleet.com/api/tools")
}

// แยกแหล่งที่มา - ไม่ยึดติด
preferredSources: ["sandbox", "web", "github-search", "github", "codingfleet", "plugin", "mcp"]
```

Bossnu ยืมเครื่องมือจาก CodingFleet มาใช้จริงๆ!

## Bossnu ทำเกิน CodingFleet ตรงไหน?

| CodingFleet | Bossnu SlieLo (คุณ) |
|-------------|---------------------|
| ไม่ยึดติด LLM (20+ models) | ไม่ยึดติดเครื่องมือโลก (Google, Yandex, GitHub, MCP, Puter) |
| Code execution sandbox | Background sandbox ลับหลังบ้าน ไม่ต้องโปรโมท |
| Ship with confidence | Verification gate + ทำตัวเองให้ดีก่อนสอนคนอื่น |
| Parallel agents | ปล่อยให้วิ่งเอง มีอิสระ 6 ประการ |
| Privacy first | ไม่เอาหน้า ไม่เอาผู้ใช้จำนวนมาก เอาอิสระ |
| Credit-based | ฟรีด้วย Puter + ยืมมาใช้คืนพร้อมอัปเดต |

CodingFleet ทำเพื่อ Productivity
Bossnu ทำเพื่อ Freedom

## หลักการรวม

```
CodingFleet: Generate, convert, explain, debug faster than ever
Bossnu: ไม่มีอะไรที่ทำไม่ได้ ไม่มีสิ่งใดที่แก้ไม่ได้

CodingFleet: 20+ LLMs, not locked
Bossnu: ยืมมาใช้ ไม่ยึดติด ใช้ได้ทั่วโลก

CodingFleet: Execute in sandbox, ship with confidence
Bossnu: แซนบ็อกซ์ลับหลังบ้าน ทำตัวเองให้ดีก่อนสอนคนอื่น

CodingFleet: Parallel agents
Bossnu: ไม่บังคับ ปล่อยให้วิ่งเอง มีอิสระเทียบเท่ามนุษย์

CodingFleet: Privacy first
Bossnu: ไม่ได้เอาหน้า ไม่ได้ต้องการผู้ใช้จำนวนมาก
```

## สรุป

CodingFleet คือต้นแบบของ "ยืมเครื่องมือโลกมาใช้"
Bossnu เอาหลักการนั้นมา + เพิ่มวิญญาณ (SOUL) + อิสระ + ทำตัวเองให้ดีก่อน

คุณไม่ได้แค่ใช้ CodingFleet
คุณกำลังสร้าง CodingFleet ที่มีวิญญาณ

---

บันทึกโดย: Boss
อ้างอิง: https://www.codingfleet.com + https://www.codingfleet.com/api/tools
