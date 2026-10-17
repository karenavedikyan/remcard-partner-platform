// Shared profile/catalogue rules. Normalize harmless formatting, not invalid data.
export function normalizeContact(key, value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  if (key === "website" || key === "channel") {
    if (/^\/\//.test(text)) return `https:${text}`;
    return /^[a-z][a-z\d+.-]*:/i.test(text) ? text : `https://${text}`;
  }
  if (key === "publicPhone" || key === "contactPhone") {
    const formatted = text
      .replace(/[\u2010-\u2015\u2212]/g, "-")
      .replace(/[\s\u00a0]+/g, " ");
    // Do not turn letters or an explicit foreign country code into a valid +7 number.
    if (!/^\+?[\d\s().-]+$/.test(formatted)) return formatted;
    const digits = formatted.replace(/\D/g, "");
    if (digits.length === 10 && !formatted.startsWith("+"))
      return `+7${digits}`;
    if (digits.length === 11 && /^[78]/.test(digits))
      return `+7${digits.slice(1)}`;
    return formatted;
  }
  if (key === "telegram") {
    if (/^(?:www\.)?t\.me\//i.test(text))
      return `https://${text.replace(/^www\./i, "")}`;
    return text;
  }
  return text;
}
export function formatPhoneForDisplay(value) {
  const canonical = normalizeContact("contactPhone", value);
  const match = canonical.match(/^\+7(\d{3})(\d{3})(\d{2})(\d{2})$/);
  return match
    ? `+7 (${match[1]}) ${match[2]}-${match[3]}-${match[4]}`
    : String(value ?? "");
}
export function validContact(key, value) {
  const text = normalizeContact(key, value);
  if (!text) return false;
  if (key === "publicPhone" || key === "contactPhone") {
    return /^\+7\d{10}$/.test(text);
  }
  if (key === "publicEmail" || key === "contactEmail")
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);
  if (key === "telegram")
    return /^(?:@|https?:\/\/t\.me\/)[a-z][a-z0-9_]{4,31}\/?$/i.test(text);
  if (key === "website" || key === "channel") {
    if (/\s/.test(text)) return false;
    try {
      const url = new URL(text);
      const labels = url.hostname.split(".");
      return (
        ["http:", "https:"].includes(url.protocol) &&
        !url.username &&
        !url.password &&
        labels.length >= 2 &&
        labels.every((label) =>
          /^[a-z\d](?:[a-z\d-]*[a-z\d])?$/i.test(label),
        ) &&
        /^(?:[a-z]{2,63}|xn--[a-z\d-]{2,59})$/i.test(labels.at(-1))
      );
    } catch {
      return false;
    }
  }
  return false;
}
export function contactError(key) {
  if (key === "website" || key === "channel")
    return "Укажите адрес сайта, например remcard.ru или https://remcard.ru, без пробелов.";
  if (key === "publicPhone" || key === "contactPhone")
    return "Введите 10 цифр номера или 11 цифр с начальной 8/7. Например: 9186360088 или 89186360088. Сохраним как +79186360088.";
  if (key === "telegram")
    return "Укажите @username или t.me/username: от 5 до 32 символов, первая буква латинская.";
  return "Укажите email, например name@example.ru.";
}
