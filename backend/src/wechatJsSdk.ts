import { createHash, randomBytes } from "crypto";

const WECHAT_API_BASE = "https://api.weixin.qq.com/cgi-bin";
const TOKEN_SAFETY_WINDOW_MS = 5 * 60 * 1000;

type CachedCredential = {
  value: string;
  expiresAt: number;
};

let accessTokenCache: CachedCredential | null = null;
let jsapiTicketCache: CachedCredential | null = null;

export function isWechatJsSdkConfigured() {
  return Boolean(process.env.WECHAT_MP_APP_ID && process.env.WECHAT_MP_APP_SECRET);
}

export async function createWechatJsSdkSignature(pageUrl: string) {
  const appId = process.env.WECHAT_MP_APP_ID || "";
  if (!appId || !process.env.WECHAT_MP_APP_SECRET) {
    throw Object.assign(new Error("wechat_js_sdk_not_configured"), { statusCode: 503 });
  }

  const normalizedUrl = normalizeShareUrl(pageUrl);
  const ticket = await getJsapiTicket();
  const nonceStr = randomBytes(12).toString("hex");
  const timestamp = Math.floor(Date.now() / 1000);
  const raw = [
    `jsapi_ticket=${ticket}`,
    `noncestr=${nonceStr}`,
    `timestamp=${timestamp}`,
    `url=${normalizedUrl}`,
  ].join("&");
  const signature = createHash("sha1").update(raw).digest("hex");

  return {
    appId,
    timestamp,
    nonceStr,
    signature,
    url: normalizedUrl,
  };
}

async function getAccessToken() {
  if (isCacheValid(accessTokenCache)) return accessTokenCache.value;

  const appId = process.env.WECHAT_MP_APP_ID || "";
  const appSecret = process.env.WECHAT_MP_APP_SECRET || "";
  const response = await fetch(
    `${WECHAT_API_BASE}/token?grant_type=client_credential&appid=${encodeURIComponent(appId)}&secret=${encodeURIComponent(appSecret)}`
  );
  const payload = (await response.json()) as { access_token?: string; expires_in?: number; errcode?: number; errmsg?: string };
  if (!response.ok || !payload.access_token) {
    throw Object.assign(new Error(payload.errmsg || "wechat_access_token_failed"), { statusCode: 502 });
  }

  accessTokenCache = {
    value: payload.access_token,
    expiresAt: Date.now() + Number(payload.expires_in || 7200) * 1000,
  };
  return accessTokenCache.value;
}

async function getJsapiTicket() {
  if (isCacheValid(jsapiTicketCache)) return jsapiTicketCache.value;

  const accessToken = await getAccessToken();
  const response = await fetch(`${WECHAT_API_BASE}/ticket/getticket?access_token=${encodeURIComponent(accessToken)}&type=jsapi`);
  const payload = (await response.json()) as { ticket?: string; expires_in?: number; errcode?: number; errmsg?: string };
  if (!response.ok || !payload.ticket || payload.errcode) {
    throw Object.assign(new Error(payload.errmsg || "wechat_jsapi_ticket_failed"), { statusCode: 502 });
  }

  jsapiTicketCache = {
    value: payload.ticket,
    expiresAt: Date.now() + Number(payload.expires_in || 7200) * 1000,
  };
  return jsapiTicketCache.value;
}

function isCacheValid(cache: CachedCredential | null): cache is CachedCredential {
  return Boolean(cache?.value && cache.expiresAt - TOKEN_SAFETY_WINDOW_MS > Date.now());
}

function normalizeShareUrl(value: string) {
  if (!value) throw Object.assign(new Error("missing_url"), { statusCode: 400 });

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw Object.assign(new Error("invalid_url"), { statusCode: 400 });
  }

  parsed.hash = "";
  if (!["https:", "http:"].includes(parsed.protocol)) {
    throw Object.assign(new Error("invalid_url_protocol"), { statusCode: 400 });
  }

  return parsed.toString();
}
