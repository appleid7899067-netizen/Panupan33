# Philosophy

1. **No runtime, no claim**
2. **Evidence or silence**
3. **Fail loud**

| ปัญหา | วิธีแก้ |
|-------|--------|
| LLM อ้าง "รันแล้ว" | Gate ตรวจ stdout |
| LLM อ้าง API works | Gate ตรวจ HTTP |
| ใช้ API ตาย | Registry block |
| แก้หลักฐานย้อนหลัง | SHA256 + HMAC |
