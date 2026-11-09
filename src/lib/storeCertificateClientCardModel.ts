import type { StoreCertificate } from "@/lib/certificate-types";
import { certificateStatusLabel } from "@/lib/certificate-labels";

export type StoreCertCardState = "active" | "used" | "expired" | "cancelled" | "unavailable";

export type StoreCertificateClientCardModel = {
  active: boolean;
  state: StoreCertCardState;
  title: string;
  pctTextValue: string;
  pctSubtitleText: string;
  visibleCode: string;
  certificateUrl: string;
  termTextValue: string;
  statusLabelText: string;
  stampText: string | null;
};

function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

function parseValidUntil(validUntil: string | null): Date | null {
  if (!validUntil) return null;
  const d = new Date(validUntil);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isPastValidUntil(validUntil: string | null): boolean {
  const d = parseValidUntil(validUntil);
  if (!d) return false;
  return d.getTime() < Date.now();
}

function hasInvalidNonemptyValidUntil(validUntil: string | null): boolean {
  if (!validUntil || !String(validUntil).trim()) return false;
  return parseValidUntil(validUntil) === null;
}

const USABLE_STATUSES = new Set(["ACTIVE", "USED_PARTIALLY"]);

export function deriveStoreCertCardState(cert: StoreCertificate): StoreCertCardState {
  const status = String(cert.status ?? "").trim().toUpperCase();
  if (!status) return "unavailable";
  if (status === "CANCELLED") return "cancelled";
  if (status === "EXPIRED") return "expired";
  if (status === "USED_FULLY") return "used";
  if (hasInvalidNonemptyValidUntil(cert.validUntil)) return "unavailable";
  if (isPastValidUntil(cert.validUntil)) return "expired";
  if (cert.maxUsages > 0 && cert.usageCount >= cert.maxUsages) return "used";
  if (!USABLE_STATUSES.has(status)) return "unavailable";
  return "active";
}

function partnerDiscountPercents(cert: StoreCertificate): number[] {
  return (cert.partners ?? []).flatMap((p) =>
    (p.categories ?? []).map((c) => c.discountPercent).filter((n) => Number.isFinite(n) && n >= 0),
  );
}

function resolveHeadlineDiscount(cert: StoreCertificate): number | null {
  const partnerPcts = partnerDiscountPercents(cert);
  const fromCert = cert.discountPercent;
  if (fromCert != null && Number.isFinite(fromCert) && fromCert >= 0) {
    return fromCert;
  }
  if (partnerPcts.length) return Math.max(...partnerPcts);
  return null;
}

function pctText(cert: StoreCertificate): string {
  const headline = resolveHeadlineDiscount(cert);
  if (headline == null) return "—";
  const fromCert = cert.discountPercent;
  if (fromCert != null && Number.isFinite(fromCert) && fromCert >= 0) {
    return `−${headline} %`;
  }
  const partnerPcts = partnerDiscountPercents(cert);
  const minPct = partnerPcts.length ? Math.min(...partnerPcts) : headline;
  if (!partnerPcts.length || minPct === headline) {
    return `−${headline} %`;
  }
  return `до −${headline} %`;
}

function cardTitle(cert: StoreCertificate): string {
  return cert.issuerKindSnapshot === "AGENT" ? "Сертификат Ремкард" : "Скидочный сертификат";
}

function pctSubtitle(cert: StoreCertificate): string {
  const names = [...new Set((cert.partners ?? []).map((p) => p.storeName).filter(Boolean))];
  if (names.length === 1) return `в ${names[0]}`;
  const n = cert.partners?.length ?? 0;
  if (n === 0) return "у партнёров RemCard";
  return `у ${n} ${plural(n, "партнёра", "партнёров", "партнёров")}`;
}

function longDate(validUntil: string): string {
  return new Date(validUntil)
    .toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })
    .replace(" г.", "");
}

function termText(validUntil: string | null): string {
  if (!validUntil) return "Бессрочный";
  const parsed = parseValidUntil(validUntil);
  if (!parsed) return "Срок не указан";
  return `до ${longDate(validUntil)}`;
}

function usageStatusLabel(cert: StoreCertificate, state: StoreCertCardState): string {
  if (state === "unavailable") return "Недоступен";
  if (state === "expired") return "Истёк";
  if (state === "cancelled") return "Отозван";
  if (state === "used") return "Использован";
  if (cert.maxUsages > 0) {
    return `${cert.usageCount} из ${cert.maxUsages}`;
  }
  const status = String(cert.status ?? "");
  if (!status) return "—";
  return certificateStatusLabel(cert.status);
}

function stampForState(state: StoreCertCardState): string | null {
  if (state === "unavailable") return "Недоступен";
  if (state === "expired") return "Истёк";
  if (state === "used") return "Использован";
  if (state === "cancelled") return "Отозван";
  return null;
}

export function buildStoreCertificateClientCardModel(
  cert: StoreCertificate,
  visibleCode: string,
  certificateUrl: string,
): StoreCertificateClientCardModel {
  const state = deriveStoreCertCardState(cert);
  return {
    active: state === "active",
    state,
    title: cardTitle(cert),
    pctTextValue: pctText(cert),
    pctSubtitleText: pctSubtitle(cert),
    visibleCode,
    certificateUrl,
    termTextValue: termText(cert.validUntil),
    statusLabelText: usageStatusLabel(cert, state),
    stampText: stampForState(state),
  };
}
