/**
 * Standalone entry สำหรับบิลด์แอปมือถือ (Capacitor → Android APK/AAB).
 * ไม่ใช้ TanStack Router — เรนเดอร์ MobileChat ตรง ๆ เพื่อให้บิลด์เป็น static ไฟล์เดียว.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MobileChat } from "@/components/mobile-chat";
import { PuterProvider } from "@/lib/puter-context";
import "../styles.css";

const root = document.getElementById("mobile-root");
if (!root) throw new Error("#mobile-root not found");

createRoot(root).render(
  <StrictMode>
    <PuterProvider>
      <MobileChat standalone />
    </PuterProvider>
  </StrictMode>,
);
