export type ScannerEmptyStep = {
  icon: "scan" | "percent" | "check";
  title: string;
  note: string;
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
      },
      {
        icon: "percent",
        title: "Посмотрите условия",
        note: "Скидка и бонус по категории",
      },
      {
        icon: "check",
        title: "Подтвердите продажу",
        note: "Сумма — и бонус начислен",
      },
    ],
    ctaLabel: "Открыть сканер",
    footNote: "Раздел заполнится сам, когда появятся первые данные.",
  };
}
