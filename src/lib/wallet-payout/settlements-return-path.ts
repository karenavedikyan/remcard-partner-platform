import { sanitizeReturnTo } from "@/lib/auth-flow";

export type SettlementsSearchParamValue = string | string[] | null | undefined;

export type SettlementsPayoutDeepLinkInput = {
  tab?: SettlementsSearchParamValue;
  counterparty?: SettlementsSearchParamValue;
  request?: SettlementsSearchParamValue;
  receipt?: SettlementsSearchParamValue;
};

export type NormalizedSettlementsPayoutParams = {
  tab: "payouts" | "settlements";
  counterparty: string | null;
  request: string | null;
  receipt: string | null;
};

const PAYOUT_FOCUS_TOKEN = /^[\w-]{1,128}$/;

/** First scalar from Next.js searchParams (duplicate keys → string[]). */
export function firstScalarSearchParamValue(raw: SettlementsSearchParamValue): string | null {
  if (raw == null) return null;
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (typeof item !== "string") continue;
      const trimmed = item.trim();
      if (trimmed) return trimmed;
    }
    return null;
  }
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed || null;
}

/** Allowlisted payout focus ids for returnTo (no open redirect). */
export function sanitizePayoutFocusToken(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed || !PAYOUT_FOCUS_TOKEN.test(trimmed)) {
    return null;
  }
  return trimmed;
}

export function parseSettlementsPayoutSearchParams(
  input: SettlementsPayoutDeepLinkInput,
): NormalizedSettlementsPayoutParams {
  const counterparty = sanitizePayoutFocusToken(firstScalarSearchParamValue(input.counterparty));
  const request = sanitizePayoutFocusToken(firstScalarSearchParamValue(input.request));
  const receipt = sanitizePayoutFocusToken(firstScalarSearchParamValue(input.receipt));
  const tabRaw = firstScalarSearchParamValue(input.tab);
  const tab: "payouts" | "settlements" =
    tabRaw === "payouts" || Boolean(counterparty || request || receipt) ? "payouts" : "settlements";
  return { tab, counterparty, request, receipt };
}

/**
 * Internal return path for /settlements session, consent and onboarding gates.
 * Forwards only tab=payouts and validated payout focus query params.
 */
export function buildSettlementsReturnPath(input: SettlementsPayoutDeepLinkInput): string {
  const { tab, counterparty, request, receipt } = parseSettlementsPayoutSearchParams(input);

  const q = new URLSearchParams();
  if (tab === "payouts") {
    q.set("tab", "payouts");
  }
  if (counterparty) q.set("counterparty", counterparty);
  if (request) q.set("request", request);
  if (receipt) q.set("receipt", receipt);

  const candidate = q.toString() ? `/settlements?${q.toString()}` : "/settlements";
  return sanitizeReturnTo(candidate) ?? "/settlements";
}

/** Query string used by requireProPageUser / login consent redirects on settlements. */
export function settlementsConsentReturnSearchParams(
  input: SettlementsPayoutDeepLinkInput,
): URLSearchParams {
  return new URLSearchParams({
    step: "consents",
    returnTo: buildSettlementsReturnPath(input),
  });
}