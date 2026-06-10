"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    Capacitor?: {
      isNativePlatform?: () => boolean;
    };
  }
}

export function NativeRuntimeInit() {
  useEffect(() => {
    if (!window.Capacitor?.isNativePlatform?.()) return;
    document.documentElement.dataset.nativeApp = "capacitor";
  }, []);

  return null;
}
