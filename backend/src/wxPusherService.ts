type WxPusherMessageInput = {
  uid: string;
  summary: string;
  content: string;
  url?: string;
};

export function isWxPusherConfigured() {
  return Boolean(process.env.WXPUSHER_APP_TOKEN);
}

export async function sendWxPusherMessage(input: WxPusherMessageInput) {
  const appToken = process.env.WXPUSHER_APP_TOKEN || "";
  if (!appToken) {
    throw Object.assign(new Error("wxpusher_not_configured"), { statusCode: 503 });
  }

  const response = await fetch("https://wxpusher.zjiecode.com/api/send/message", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      appToken,
      content: input.content,
      summary: input.summary.slice(0, 96),
      contentType: 1,
      uids: [input.uid],
      url: input.url,
    }),
  });
  const payload = await response.json().catch(() => null) as { code?: number; msg?: string } | null;

  if (!response.ok || payload?.code !== 1000) {
    throw new Error(payload?.msg || `wxpusher_send_failed_${response.status}`);
  }

  return payload;
}
