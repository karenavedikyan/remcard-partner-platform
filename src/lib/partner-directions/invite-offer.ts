import {
  CERTIFICATE_POLICY_DEFAULT_PURCHASE_LIMIT,
  CERTIFICATE_POLICY_DEFAULT_VALIDITY_DAYS,
  CERTIFICATE_POLICY_MAX_EXCLUSIONS_LENGTH,
  CERTIFICATE_POLICY_MAX_PURCHASE_LIMIT,
  CERTIFICATE_POLICY_MAX_VALIDITY_DAYS,
} from "@/lib/certificate-policy/defaults";
import type { CertificatePolicyTerms } from "@/lib/certificate-policy/types";
import type { InviteTermInput } from "@/lib/types";
import type { InviteDirection } from "./direction";

export const INVITE_NOTE_MAX_LENGTH = 1000;

/** Restrictions sent with an invitation: an exact per-invitation offer, never a general-policy edit. */
export type InviteOfferForm = {
  validityDays: string;
  purchaseLimit: string;
  minimumPurchase: string;
  promotionsCompatible: boolean;
  exclusionsText: string;
};

export type InviteOfferRestrictions = {
  validityDays: number;
  purchaseLimit: number;
  minimumPurchaseAmount: number | null;
  promotionsCompatible: boolean;
  exclusionsText: string | null;
};

export function defaultInviteOfferForm(): InviteOfferForm {
  return {
    validityDays: String(CERTIFICATE_POLICY_DEFAULT_VALIDITY_DAYS),
    purchaseLimit: String(CERTIFICATE_POLICY_DEFAULT_PURCHASE_LIMIT),
    minimumPurchase: "",
    promotionsCompatible: false,
    exclusionsText: "",
  };
}

export function inviteOfferFormFromTerms(
  terms: Pick<
    CertificatePolicyTerms,
    "validityDays" | "purchaseLimit" | "minimumPurchaseAmount" | "promotionsCompatible" | "exclusionsText"
  >,
): InviteOfferForm {
  return {
    validityDays: String(terms.validityDays),
    purchaseLimit: String(terms.purchaseLimit),
    minimumPurchase: terms.minimumPurchaseAmount == null ? "" : String(terms.minimumPurchaseAmount),
    promotionsCompatible: terms.promotionsCompatible,
    exclusionsText: terms.exclusionsText ?? "",
  };
}

function parseWholeNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const value = Number(trimmed);
  return Number.isSafeInteger(value) ? value : null;
}

export function parseInviteOfferForm(
  form: InviteOfferForm,
): { ok: true; restrictions: InviteOfferRestrictions } | { ok: false; message: string } {
  const validityDays = parseWholeNumber(form.validityDays);
  if (validityDays === null || validityDays < 1 || validityDays > CERTIFICATE_POLICY_MAX_VALIDITY_DAYS) {
    return { ok: false, message: `Срок скидки: от 1 до ${CERTIFICATE_POLICY_MAX_VALIDITY_DAYS} дней.` };
  }
  const purchaseLimit = parseWholeNumber(form.purchaseLimit);
  if (purchaseLimit === null || purchaseLimit < 1 || purchaseLimit > CERTIFICATE_POLICY_MAX_PURCHASE_LIMIT) {
    return { ok: false, message: `Число покупок: от 1 до ${CERTIFICATE_POLICY_MAX_PURCHASE_LIMIT}.` };
  }
  let minimumPurchaseAmount: number | null = null;
  if (form.minimumPurchase.trim() !== "") {
    minimumPurchaseAmount = parseWholeNumber(form.minimumPurchase);
    if (minimumPurchaseAmount === null) {
      return { ok: false, message: "Минимальная сумма покупки: целое число не меньше 0." };
    }
  }
  const exclusions = form.exclusionsText.trim();
  if (exclusions.length > CERTIFICATE_POLICY_MAX_EXCLUSIONS_LENGTH) {
    return { ok: false, message: `Исключения: не больше ${CERTIFICATE_POLICY_MAX_EXCLUSIONS_LENGTH} символов.` };
  }
  return {
    ok: true,
    restrictions: {
      validityDays,
      purchaseLimit,
      minimumPurchaseAmount,
      promotionsCompatible: form.promotionsCompatible,
      exclusionsText: exclusions || null,
    },
  };
}

export function normalizeInviteNote(raw: string): { ok: true; note: string | null } | { ok: false; message: string } {
  const note = raw.replace(/\r\n/g, "\n").trim();
  if (note.length > INVITE_NOTE_MAX_LENGTH) {
    return { ok: false, message: `Комментарий не длиннее ${INVITE_NOTE_MAX_LENGTH} символов.` };
  }
  return { ok: true, note: note || null };
}

export type DirectionalInviteBody =
  | {
      targetUserId: string;
      note: string | null;
      direction: "INVITER_RECEIVES";
      terms: InviteTermInput[];
      certificatePolicy: InviteOfferRestrictions;
    }
  | {
      targetUserId: string;
      note: string | null;
      direction: "INVITER_ISSUES";
      cooperationRequest: true;
      terms: [];
    };

export function buildDirectionalInviteBody(input: {
  targetUserId: string;
  direction: InviteDirection;
  note: string | null;
  terms: InviteTermInput[];
  restrictions: InviteOfferRestrictions | null;
}): DirectionalInviteBody {
  if (input.direction === "INVITER_ISSUES") {
    return {
      targetUserId: input.targetUserId,
      note: input.note,
      direction: "INVITER_ISSUES",
      cooperationRequest: true,
      terms: [],
    };
  }
  if (!input.restrictions) {
    throw new Error("Receiving invitations require certificate restrictions");
  }
  return {
    targetUserId: input.targetUserId,
    note: input.note,
    direction: "INVITER_RECEIVES",
    terms: input.terms,
    certificatePolicy: input.restrictions,
  };
}
