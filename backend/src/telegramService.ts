export interface TelegramDeliveryResult {
  configured: boolean;
  sent: boolean;
  status?: number;
  error?: string;
}

export function getTelegramBotUsername() {
  return (process.env.TELEGRAM_BOT_USERNAME || "").replace(/^@/, "").trim() || null;
}

export async function sendTelegramMessage(chatId: string, text: string): Promise<TelegramDeliveryResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) {
    return { configured: false, sent: false, error: "telegram_bot_token_missing" };
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    }),
  });
  const payload = await response.json().catch(() => null) as { description?: string } | null;

  return {
    configured: true,
    sent: response.ok,
    status: response.status,
    error: response.ok ? undefined : payload?.description || "telegram_send_failed",
  };
}
