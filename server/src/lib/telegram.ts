const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';

export function telegramReady() {
  return Boolean(TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID);
}

export async function sendTelegram(text: string) {
  if (!telegramReady()) return;
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text,
        parse_mode: 'HTML',
      }),
    });
  } catch {}
}

export async function notifyConfigSaved(username: string, slotName: string) {
  await sendTelegram(
    `<b>📊 تحديث إعدادات بوت</b>\n` +
    `المستخدم: <code>${username}</code>\n` +
    `السلوت: <code>${slotName}</code>`
  );
}

export async function notifyNewTicket(ticketId: number, subject: string, username: string) {
  await sendTelegram(
    `<b>🎫 تذكرة جديدة</b>\n` +
    `رقم: <code>#${ticketId}</code>\n` +
    `الموضوع: ${subject}\n` +
    `المستخدم: <code>${username}</code>`
  );
}

export async function notifyTicketReply(ticketId: number, subject: string, author: string) {
  await sendTelegram(
    `<b>💬 رد جديد على تذكرة</b>\n` +
    `رقم: <code>#${ticketId}</code>\n` +
    `الموضوع: ${subject}\n` +
    `المرسل: <code>${author}</code>`
  );
}
