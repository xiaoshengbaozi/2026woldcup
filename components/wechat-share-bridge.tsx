"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { getUserApiUrl } from "@/lib/user-system";

const WECHAT_SDK_SRC = "https://res.wx.qq.com/open/js/jweixin-1.6.0.js";
const SHARE_TITLE = "赛波CYBERBALL — 2026世界杯看球伴侣";
const SHARE_DESCRIPTION =
  "赛波（CYBERBALL）源于赛博世界波，将实时赛事、AI预测、全球新闻与数据可视化融合为足球时代的数字竞技场。48支参赛队实时赔率、赛程日历、球员档案、小组赛积分榜——一屏尽览。";
const SHARE_IMAGE = "https://ball.boyzi.fun/og/cyberball-og.jpg";

type WechatSignaturePayload = {
  appId: string;
  timestamp: number;
  nonceStr: string;
  signature: string;
};

type WechatJsSdk = {
  config: (options: {
    debug?: boolean;
    appId: string;
    timestamp: number;
    nonceStr: string;
    signature: string;
    jsApiList: string[];
  }) => void;
  ready: (callback: () => void) => void;
  error: (callback: (error: unknown) => void) => void;
  updateAppMessageShareData?: (options: ShareOptions) => void;
  updateTimelineShareData?: (options: Omit<ShareOptions, "desc">) => void;
  onMenuShareAppMessage?: (options: ShareOptions) => void;
  onMenuShareTimeline?: (options: Omit<ShareOptions, "desc">) => void;
};

type ShareOptions = {
  title: string;
  desc: string;
  link: string;
  imgUrl: string;
};

declare global {
  interface Window {
    wx?: WechatJsSdk;
    __cyberballWechatSdkLoading?: Promise<void>;
  }
}

export function WechatShareBridge() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!isWechatBrowser()) return;

    const currentUrl = window.location.href.split("#")[0];
    let cancelled = false;

    loadWechatSdk()
      .then(() => fetchWechatSignature(currentUrl))
      .then((signature) => {
        if (cancelled || !window.wx) return;
        window.wx.config({
          debug: false,
          appId: signature.appId,
          timestamp: signature.timestamp,
          nonceStr: signature.nonceStr,
          signature: signature.signature,
          jsApiList: ["updateAppMessageShareData", "updateTimelineShareData", "onMenuShareAppMessage", "onMenuShareTimeline"],
        });
        window.wx.ready(() => updateWechatShareData(currentUrl));
        window.wx.error((error) => {
          console.warn("[WechatShare] JS-SDK config failed:", error);
        });
      })
      .catch((error) => {
        console.warn("[WechatShare] setup failed:", error);
      });

    return () => {
      cancelled = true;
    };
  }, [pathname, searchParams]);

  return null;
}

function isWechatBrowser() {
  return typeof navigator !== "undefined" && /MicroMessenger/i.test(navigator.userAgent);
}

function loadWechatSdk() {
  if (window.wx) return Promise.resolve();
  if (window.__cyberballWechatSdkLoading) return window.__cyberballWechatSdkLoading;

  window.__cyberballWechatSdkLoading = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = WECHAT_SDK_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("wechat_sdk_load_failed"));
    document.head.appendChild(script);
  });
  return window.__cyberballWechatSdkLoading;
}

async function fetchWechatSignature(url: string) {
  const endpoint = `${getUserApiUrl()}/api/wechat/js-sdk-signature?url=${encodeURIComponent(url)}`;
  const response = await fetch(endpoint, { cache: "no-store" });
  const payload = (await response.json()) as WechatSignaturePayload & { error?: string };
  if (!response.ok) throw new Error(payload.error || `wechat_signature_${response.status}`);
  return payload;
}

function updateWechatShareData(link: string) {
  const shareData: ShareOptions = {
    title: SHARE_TITLE,
    desc: SHARE_DESCRIPTION,
    link,
    imgUrl: SHARE_IMAGE,
  };

  window.wx?.updateAppMessageShareData?.(shareData);
  window.wx?.updateTimelineShareData?.({
    title: SHARE_TITLE,
    link,
    imgUrl: SHARE_IMAGE,
  });
  window.wx?.onMenuShareAppMessage?.(shareData);
  window.wx?.onMenuShareTimeline?.({
    title: SHARE_TITLE,
    link,
    imgUrl: SHARE_IMAGE,
  });
}
