export const norm = (v: unknown) =>
  String(v ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("ru")
    .replace(/ё/g, "е")
    .replace(/\s+/g, " ")
    .trim();

export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export const cmp = (a: string, b: string) =>
  String(a).localeCompare(String(b), "ru", { numeric: true });

export function plural(n: number, one: string, few: string, many: string): string {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  return a > 10 && a < 20 ? many : b === 1 ? one : b > 1 && b < 5 ? few : many;
}

export const num = (n: number) => Math.round(n).toLocaleString("ru-RU");
export const rub = (n: number) => `${num(n)} ₽`;

/** Signed delta for markup rows (prototype «+3 050 ₽ с шт.»). */
export function signedRubDelta(n: number) {
  return `${n < 0 ? "−" : "+"}${num(Math.abs(n))} ₽`;
}