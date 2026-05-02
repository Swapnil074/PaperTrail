// Thin wrapper for sending Telegram messages via HTTP (no polling, webhook only)

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`

export async function sendMessage(
  chatId: number | string,
  text: string,
  parseMode: 'HTML' | 'Markdown' = 'HTML'
): Promise<void> {
  if (!BOT_TOKEN) return

  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: parseMode,
      disable_web_page_preview: true,
    }),
  })
}

export function extractUrls(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g
  return text.match(urlRegex) || []
}

export function isAuthorizedUser(userId: number): boolean {
  const allowedId = process.env.TELEGRAM_ALLOWED_USER_ID
  if (!allowedId) return true // open if not configured
  return userId === parseInt(allowedId, 10)
}
