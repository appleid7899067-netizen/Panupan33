import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.bossnu.chat",
  appName: "Boss Chat",
  webDir: "dist-mobile",
  backgroundColor: "#0b0c0e",
  server: {
    androidScheme: "https",
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    Keyboard: {
      resize: "ionic",
    },
    StatusBar: {
      style: "dark",
      backgroundColor: "#0b0c0e",
    },
  },
};

export default config;
