const FALLBACK = "Не удалось создать тестового пользователя. Повторите попытку.";

export function adminTestUserCreateError(message: unknown): string {
  if (typeof message !== "string") return FALLBACK;
  const trimmed = message.trim();
  return /[а-яё]/i.test(trimmed) && trimmed.length <= 320 ? trimmed : FALLBACK;
}
