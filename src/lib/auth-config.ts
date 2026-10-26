const DEFAULT_TELEGRAM_BOT_LOGIN_URL = "https://t.me/RemCardBot?start=login_prof";
const DEFAULT_MAX_BOT_LOGIN_URL = "https://max.ru/id230808706225_bot?start=login_prof";
const DEFAULT_LEGAL_SITE_URL = "https://remcard.ru";

export const PROF_BOT_LOGIN_START = "login_prof";

/** Force contextual MAX/TG start payload without changing bot identity or other query params. */
export function normalizeProfBotLoginUrl(raw: string, requiredStart: string = PROF_BOT_LOGIN_START): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  try {
    const u = new URL(trimmed);
    if (u.username || u.password) return trimmed;
    if (u.protocol !== "http:" && u.protocol !== "https:") return trimmed;
    u.searchParams.set("start", requiredStart);
    return u.toString();
  } catch {
    return trimmed;
  }
}

export function getTelegramBotLoginUrl(): string {
  const raw = process.env.NEXT_PUBLIC_TELEGRAM_BOT_LOGIN_URL?.trim() || DEFAULT_TELEGRAM_BOT_LOGIN_URL;
  return normalizeProfBotLoginUrl(raw);
}

export function getMaxBotLoginUrl(): string {
  const raw = process.env.NEXT_PUBLIC_MAX_BOT_URL?.trim() || DEFAULT_MAX_BOT_LOGIN_URL;
  return normalizeProfBotLoginUrl(raw);
}

export function getLegalSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_REMCARD_SITE_URL?.trim() || DEFAULT_LEGAL_SITE_URL;
  return raw.replace(/\/+$/, "");
}
