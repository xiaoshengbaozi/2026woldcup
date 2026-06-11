import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "fun.boyzi.cyberball",
  appName: "CYBERBALL",
  webDir: "out",
  server: {
    androidScheme: "https",
  },
  android: {
    backgroundColor: "#05060A",
  },
};

export default config;
