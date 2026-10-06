const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

export const appConfig = {
  appUrl: trimTrailingSlash(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ),
  remcardApiBaseUrl: trimTrailingSlash(
    process.env.REMCARD_API_BASE_URL ?? "https://remcard.ru",
  ),
  bffSecret: process.env.REMCARD_BFF_SECRET ?? "",
} as const;

export function assertServerOnly(label: string) {
  if (typeof window !== "undefined") {
    throw new Error(`${label} is available on the server only.`);
  }
}
