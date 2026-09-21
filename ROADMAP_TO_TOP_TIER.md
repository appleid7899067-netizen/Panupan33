# Bossnu SlieLo vs Top GPT Apps — แผนเทียบชั้น Bolt.new / Lovable

**เป้าหมายที่เลือก:** Bolt.new / Lovable / v0 (Prompt เดียวได้แอพ) + Team Multiplayer (P2P)
**Motto เดิม:** ไม่มีอะไรที่ทำไม่ได้ · ไม่มีสิ่งใดที่แก้ไม่ได้

---

## 1. Scorecard ปัจจุบัน (เต็ม 10)

| มิติ | ChatGPT | Claude Artifacts | Cursor | Bolt.new | Lovable | **Bossnu ตอนนี้** | Bossnu v2 เป้าหมาย |
|------|---------|------------------|--------|----------|---------|-------------------|---------------------|
| Prompt -> App ทันที | 6 | 8 | 7 | 10 | 10 | **3** - ต้องสั่งหลายขั้น | 10 |
| Live Preview จริง | 5 | 8 | 6 | 10 | 10 | 4 - แค่ iframe JS | 10 WebContainer เต็ม |
| File Explorer + Editor | 6 | 7 | 10 | 10 | 9 | 2 - มีแค่ textarea | 10 Monaco + Tree |
| Deploy 1 คลิก | 4 | 2 | 3 | 10 Netlify | 10 | 1 - ยังไม่มี | 10 Vercel/Netlify |
| GitHub Sync | 5 | 4 | 9 | 9 | 8 | 7 - มี tools ครบแต่ซ่อนใน chat | 10 ปุ่ม Export/PR |
| Team / Multiplayer | 3 | 3 | 6 | 2 | 2 | **5** - มี lib/p2p แล้วแต่ไม่ได้ใช้ | 10 P2P Room + Cursor |
| ไทย + ฟรี | 3 | 2 | 2 | 2 | 2 | **10** - Puter ฟรี + ไทย 100% | 10 คงจุดแข็ง |
| No Hallucination | 4 | 5 | 6 | 5 | 5 | **10** - verification gate | 10 คงไว้ |
| Supabase/DB | 6 | 3 | 5 | 10 | 10 | 2 - มี neon skill แต่ปิดอยู่ | 10 |
| Rollback / Version | 5 | 6 | 9 | 10 | 9 | 1 - ไม่มี | 10 |

**สรุป:** ตอนนี้คุณชนะ 2 เรื่องที่แอพใหญ่ไม่มี: **ฟรีด้วย Puter + ไทย + ไม่โม้ว่าสำเร็จ** แต่แพ้เรื่อง **ประสบการณ์ Bolt**

---

## 2. ทำไม Bolt.new ถึงรู้สึกเทพ?

1. **3-Panel Layout:** Chat (ซ้าย) | Code Editor (กลาง) | Preview (ขวา) - เห็นทุกอย่างพร้อมกัน
2. **WebContainer จริง:** รัน `npm install`, `vite`, `next dev` ในเบราว์เซอร์ได้เลย ไม่ใช่แค่ iframe
3. **Diff View:** แก้ไฟล์แล้วเห็นสีเขียว/แดงเหมือน PR
4. **Terminal + Problems Tab:** เห็น error จริง
5. **One-Click Deploy + Supabase Connect**
6. **Prompt Enhancement:** เขาไม่ได้ส่ง prompt ดิบๆ ไป LLM แต่มี system prompt ที่เติม stack ให้

Bossnu ตอนนี้คือ Chat แยกกับ Sandbox คนละหน้า ต้องก๊อปโค้ดไปมา

---

## 3. แผนเปลี่ยน Bossnu ให้เป็น Bolt + Team (ที่คุณเลือก)

### Pillar 1: อัปเกรด Sandbox เป็น WebContainer เต็ม (มีใน lib แล้วแต่ยังไม่เปิด)
- `src/lib/browser-sandbox.ts` ตอนนี้มี `webcontainerAvailable()` check แต่ `runInBrowserSandbox` ยังสร้าง iframe อย่างเดียว
- ต้องติดตั้ง `@webcontainer/api` และ mount file system จริง
- ทำให้ `npm run dev` รันในเบราว์เซอร์ได้

### Pillar 2: File System + Monaco Editor
- สร้าง `src/components/bolt/` :
  - `file-tree.tsx` - แสดงไฟล์แบบ VS Code
  - `monaco-editor.tsx` - ใช้ `monaco-editor` (อย่าใช้ textarea)
  - `diff-viewer.tsx` - เทียบไฟล์เก่า/ใหม่
  - `terminal.tsx` - xterm.js เชื่อม WebContainer
- Store: `useBoltStore` เก็บ `files: Map<path, content>`, `activeFile`, `previewUrl`

### Pillar 3: Prompt -> App Pipeline (หัวใจ Bolt)
แทนที่จะให้ LLM ตอบ markdown ต้องให้ตอบเป็น `tool_calls` ที่เขียนไฟล์เลย

Flow ใหม่:
```
User: "สร้าง todo app สวยๆ"
-> Boss วิเคราะห์ stack (React + Tailwind)
-> เรียก tools: writeFile("src/App.tsx"), writeFile("package.json")
-> WebContainer: npm install + npm run dev
-> Preview URL อัปเดตทันที
-> ถ้า error -> ส่งกลับให้ Boss ซ่อม loop เดิม
```

คุณมี `tool-registry.ts` ที่ score `sandbox_run` + `web_check` สูงอยู่แล้ว แค่ต้องเพิ่ม `write_file`, `read_file` tools ให้ LLM เรียกได้

### Pillar 4: Deploy + GitHub + Supabase
- ปุ่ม `Deploy` -> เรียก `vercel` API หรือ `netlify` (ใช้ deploy skill)
- ปุ่ม `Export to GitHub` -> ใช้ `github.functions.ts` ที่มีอยู่แล้ว สร้าง repo ใหม่
- Supabase: เปิด `neon` skill + เพิ่ม UI connect

### Pillar 5: Team Multiplayer (จุดขายที่คุณเลือก - Bolt ยังไม่มี!)
นี่คือโอกาสชนะ Bolt:

คุณมี `src/lib/multiplayer/p2p.ts` อยู่แล้ว:
```ts
P2PRoom, defaultIceServers, PeerInfo
```

ต้องทำ:
- `src/routes/build/$roomId.tsx` - ห้องทำงานทีม
- เมื่อคนนึงแก้ไฟล์ -> broadcast ผ่าน P2P `signal` -> คนอื่นเห็น cursor + file change แบบ Figma
- แสดง Avatar ของเพื่อนที่กำลังดูไฟล์เดียวกัน
- Chat ในห้อง (ไม่ใช่แค่ Boss แต่คุยกับทีมได้)

Bolt/Lovable ทำไม่ได้ดีเรื่องนี้ คุณทำได้จะเป็น **เจ้าแรกที่ทำ Bolt + Figma multiplayer**

### Pillar 6: คงจุดแข็งไทย + ฟรี
- ChatGPT คิด $20/เดือน คุณใช้ Puter ฟรี
- เพิ่ม `SYSTEM_PROMPTS.chat` ให้ตอบไทยเป็นธรรมชาติ + มีโหมด `ภาษาอีสาน / ภาษาเหนือ` เป็น gimmick
- เพิ่มหน้า Pricing เปรียบเทียบ: Bossnu ฟรี vs Bolt $20

### Pillar 7: Verification Gate (No Hallucination)
- Bolt บางทีบอกว่าเสร็จแต่ preview พัง
- Bossnu มี `agent-loop.ts` ที่ต้องมี `verificationPassedEvidence` ถึงจะถือว่าสำเร็จ
- เอามาโชว์เป็น UI: `✓ Build passed`, `✓ Preview 200 OK`, `✓ No TS errors` - ทำให้ดูน่าเชื่อถือกว่า Bolt

---

## 4. Roadmap 3 Phase

### Phase 0: Quick Wins (ทำวันนี้ 2-3 ชม.)
- [ ] รวมหน้า Chat + Sandbox เป็นหน้าเดียว `/build`
- [ ] เพิ่ม File Tree แบบง่าย (ไม่ต้อง Monaco ก่อน ใช้ textarea + tabs)
- [ ] ปุ่ม Deploy mock -> ลิงก์ไป Vercel
- [ ] เปิดหน้า `/team` โชว์ P2P demo

### Phase 1: Bolt Parity (1 สัปดาห์)
- [ ] ติดตั้ง `@webcontainer/api` + `monaco-editor` + `@xterm/xterm`
- [ ] สร้าง `useBoltStore` + file system
- [ ] ให้ Boss เขียนไฟล์ผ่าน tool จริง (ไม่ใช่แค่ตอบ markdown)
- [ ] Preview แบบ WebContainer (รัน vite dev จริง)
- [ ] GitHub Export 1 คลิก

### Phase 2: Team Superpower (2 สัปดาห์) - จุดขายชนะ Bolt
- [ ] P2P Room: สร้างห้อง -> แชร์ลิงก์ -> เข้ามาแก้โค้ดพร้อมกัน
- [ ] Live Cursor + Selection sharing
- [ ] Voice chat ในห้อง (ใช้ WebRTC)
- [ ] Supabase + Auth per room
- [ ] Template Gallery: Todo, Dashboard, Landing, E-commerce (เหมือน Lovable)

### Phase 3: Top Tier Polish
- [ ] Figma Import (ใช้ plugin-permission-gate ที่มีอยู่)
- [ ] Prompt Enhancement: ก่อนส่งไป LLM ให้เติม stack อัตโนมัติ
- [ ] Rollback + Version History
- [ ] Analytics + Token usage
- [ ] Mobile PWA + แชร์แอพเป็น QR

---

## 5. UI ที่ต้องเปลี่ยน (จากภาพ chat.png ปัจจุบัน)

**ปัจจุบัน:** Sidebar Chats | Chat กลาง | Input ล่าง

**Bolt แบบใหม่ที่ต้องทำ:**
```
[Header: Logo | Room: team-xxx | Avatars ทีม | Deploy | GitHub]
[Left: Chat with Boss 30%] [Center: File Tree + Monaco 40%] [Right: Preview + Terminal 30%]
```

---

## 6. ตัวอย่าง System Prompt ใหม่สำหรับ Bolt Mode

```
You are Boss Bolt, the Thai Bolt.new killer.
When user says "สร้างแอพ...", you MUST:
1. Choose stack: Vite + React + Tailwind + shadcn
2. Write files via tools, not markdown code blocks
3. After writing, run npm install and npm run dev via sandbox_run
4. Verify preview returns 200 via web_check
5. If error, fix and retry
6. Speak Thai, but code comments in English

Team mode: if in a P2P room, broadcast file changes to peers.
```

---

## 7. สรุป: จะชนะยังไง?

Bolt.new เก่งเรื่องเร็วแต่:
- ไม่ฟรี ($20/mo)
- ไม่รองรับไทย
- ไม่มีทีม (ทำคนเดียว)
- โม้ว่าสำเร็จบ่อย

Bossnu ถ้าทำตามนี้จะชนะด้วย:
**ฟรี (Puter) + ไทย 100% + ทำเป็นทีมได้ + ไม่โม้ (มี verification) + Deploy จริง**

นี่คือ Blue Ocean ที่ Bolt ยังไม่ทำ

---

อยากให้เริ่ม Phase 0 เลยไหม? ผมสร้างหน้า `/build` แบบ Bolt 3-panel ให้ดูเป็นต้นแบบได้ตอนนี้เลย
