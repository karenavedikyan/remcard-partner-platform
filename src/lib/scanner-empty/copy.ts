import type { OnboardingStepAction } from "@/lib/onboarding-step/types";
import { onboardingStepAccessibleName } from "@/lib/onboarding-step/read-only-history";

const SCANNER_FIRST_HINT = "Сначала отсканируйте сертификат";

export type ScannerEmptyStep = {
  icon: "scan" | "percent" | "check";
  title: string;
  note: string;
  action: OnboardingStepAction;
};

export type ScannerEmptyCopy = {
  kicker: string;
  title: string;
  lead: string;
  steps: ScannerEmptyStep[];
  ctaLabel: string;
  footNote: string;
};

/** Prototype `copy("scanner", role)` — same for all supported roles. */
export function scannerEmptyCopy(): ScannerEmptyCopy {
  return {
    kicker: "Как это работает",
    title: "Проверка сертификата — 10 секунд",
    lead: "Сканирование показывает условия. Продажа подтверждается отдельно.",
    steps: [
      {
        icon: "scan",
        title: "Отсканируйте QR",
        note: "Или введите код вручную",
        action: { kind: "button", handler: "openScanner" },
      },
      {
        icon: "percent",
        title: "Посмотрите условия",
        note: "Скидка и бонус по категории",
        action: {
          kind: "button",
          handler: "openScanner",
          noteHint: SCANNER_FIRST_HINT,
          accessibleName: onboardingStepAccessibleName(
            "Посмотрите условия",
            `Скидка и бонус по категории. ${SCANNER_FIRST_HINT}`,
          ),
        },
      },
      {
        icon: "check",
        title: "Подтвердите продажу",
        note: "Сумма — и бонус начислен",
        action: {
          kind: "button",
          handler: "openScanner",
          noteHint: "Подтверждение — в рабочей области сканера",
          accessibleName: onboardingStepAccessibleName(
            "Подтвердите продажу",
            "Сумма — и бонус начислен. Подтверждение — в рабочей области сканера",
          ),
        },
      },
    ],
    ctaLabel: "Открыть сканер",
    footNote: "Раздел заполнится сам, когда появятся первые данные.",
  };
}
