import { sanitizeReturnTo } from "@/lib/auth-flow";

export type SettlementsPayoutDeepLinkInput = {
  tab?: string | null;
  counterparty?: string | null;
  request?: string | null;
  receipt?: string | null;
};

const PAYOUT_FOCUS_TOKEN = /^[\w-]{1,128}$/;

/** Allowlisted payout focus ids for returnTo (no open redirect). */
export function sanitizePayoutFocusToken(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed || !PAYOUT_FOCUS_TOKEN.test(trimmed)) {
    return null;
  }
  return trimmed;
}

/**
 * Internal return path for /settlements session, consent and onboarding gates.
 * Forwards only tab=payouts and validated payout focus query params.
 */
export function buildSettlementsReturnPath(input: SettlementsPayoutDeepLinkInput): string {
  const counterparty = sanitizePayoutFocusToken(input.counterparty);
  const request = sanitizePayoutFocusToken(input.request);
  const receipt = sanitizePayoutFocusToken(input.receipt);
  const tab = input.tab?.trim();

  const wantsPayoutsTab =
    tab === "payouts" || Boolean(counterparty || request || receipt);

  const q = new URLSearchParams();
  if (wantsPayoutsTab) {
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