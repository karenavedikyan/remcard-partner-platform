const DEFAULT_TELEGRAM_BOT_LOGIN_URL = "https://t.me/RemCardBot?start=login";
const DEFAULT_LEGAL_SITE_URL = "https://remcard.ru";

export function getTelegramBotLoginUrl(): string {
  return process.env.NEXT_PUBLIC_TELEGRAM_BOT_LOGIN_URL?.trim() || DEFAULT_TELEGRAM_BOT_LOGIN_URL;
}

export function getLegalSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_REMCARD_SITE_URL?.trim() || DEFAULT_LEGAL_SITE_URL;
  return raw.replace(/\/+$/, "");
}
