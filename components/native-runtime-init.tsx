"use client";

import { useLayoutEffect } from "react";

declare global {
  interface Window {
    Capacitor?: {
      isNativePlatform?: () => boolean;
    };
  }
}

export function NativeRuntimeInit() {
  useLayoutEffect(() => {
    if (!window.Capacitor?.isNativePlatform?.()) return;
    document.documentElement.dataset.nativeApp = "capacitor";
    document.body.dataset.nativeApp = "capacitor";
    document.body.style.overflowX = "hidden";
    document.body.style.overflowY = "auto";
  }, []);

  return null;
}
