"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import { businessHomeCopy, type BusinessHomePartnerType } from "@/lib/business-home/copy";
import {
  initialBusinessHomeMetricSlices,
  metricCountLabel,
  metricHintForStorePrimary,
  metricHintForStoreTertiary,
  partnersCountFromSlice,
  type BusinessHomeMetricsResponse,
  type BusinessHomeMetricSlice,
} from "@/lib/business-home/metrics-types";
import { Button } from "@/components/ui/Button";
import { IconArrowRight, IconArrowUpRight } from "@/components/layout/ThemeIcons";
import { BusinessHomeBranchPicker } from "./BusinessHomeBranchPicker";
import {
  businessHomeMetricsPath,
  readBusinessHomeBranchId,
  writeBusinessHomeBranchId,
} from "@/lib/business-home/home-branch-preference";
import styles from "./SpecialistHomeDashboard.module.css";

type Props = {
  partnerType: BusinessHomePartnerType;
  needsProfileCompletion?: boolean;
  catalogStatus?: string | null;
};

function statHints(
  partnerType: BusinessHomePartnerType,
  slices: [BusinessHomeMetricSlice, BusinessHomeMetricSlice, BusinessHomeMetricSlice],
  activeBranchLabel: string | null,
): [string, string, string] {
  const copy = businessHomeCopy(partnerType);
  if (partnerType === "STORE") {
    return [
      metricHintForStorePrimary(slices[0], activeBranchLabel),
      copy.partnersStatHint(null),
      metricHintForStoreTertiary(slices[2]),
    ];
  }
  const partnersCount = partnersCountFromSlice(slices[2]);
  return [
    "Можно добавить позже",
    "Кроме владельца",
    copy.partnersStatHint(partnersCount),
  ];
}

function sliceErrorMessage(slice: BusinessHomeMetricSlice): string | null {
  if (slice.state === "error") return slice.message;
  if (slice.state === "unavailable") return slice.message;
  return null;
}

export function BusinessOwnerHomeDashboard({
  partnerType,
  needsProfileCompletion,
  catalogStatus,
}: Props) {
  const copy = businessHomeCopy(partnerType);
  const [slices, setSlices] = useState(initialBusinessHomeMetricSlices);
  const [activeBranchLabel, setActiveBranchLabel] = useState<string | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "loaded">("loading");
  const [contextEpoch, setContextEpoch] = useState(0);
  const [homeBranchId, setHomeBranchId] = useState<string | null>(() => readBusinessHomeBranchId());
  const loadGenerationRef = useRef(0);

  const loadMetrics = useCallback(async () => {
    const generation = ++loadGenerationRef.current;
    setLoadState("loading");
    setSlices(initialBusinessHomeMetricSlices);
    setActiveBranchLabel(null);

    try {
      const branchQueryId = readBusinessHomeBranchId() ?? homeBranchId;
      const data = await remcardFetch<BusinessHomeMetricsResponse>(
        businessHomeMetricsPath(branchQueryId),
      );
      if (generation !== loadGenerationRef.current) return;
      setActiveBranchLabel(data.activeBranchLabel);
      const resolvedId = data.selectedBranchId ?? branchQueryId ?? null;
      setSelectedBranchId(resolvedId);
      if (resolvedId && data.metrics.primary.state !== "invalid_branch") {
        writeBusinessHomeBranchId(resolvedId);
        setHomeBranchId(resolvedId);
      }
      setSlices([
        data.metrics.primary,
        data.metrics.secondary,
        data.metrics.tertiary,
      ]);
      setLoadState("loaded");
    } catch (caught) {
      if (generation !== loadGenerationRef.current) return;
      if (caught instanceof RemcardApiError && caught.status === 404) {
        const err = { state: "unavailable" as const, message: caught.message };
        setSlices([err, err, err]);
        setLoadState("loaded");
        return;
      }
      const message =
        caught instanceof RemcardApiError
          ? caught.message
          : "Не удалось загрузить показатели";
      const err = { state: "error" as const, message };
      setSlices([err, { state: "error", message }, { state: "error", message }]);
      setLoadState("loaded");
    }
  }, [contextEpoch, homeBranchId]);

  const branchSelectionRequired =
    loadState === "loaded" &&
    partnerType === "STORE" &&
    (slices[0]?.state === "needs_branch" || slices[0]?.state === "invalid_branch");

  const handleBranchSelected = useCallback((branchId: string) => {
    writeBusinessHomeBranchId(branchId);
    setHomeBranchId(branchId);
    setContextEpoch((n) => n + 1);
  }, []);

  useEffect(() => {
    void loadMetrics();
    return () => {
      loadGenerationRef.current += 1;
    };
  }, [loadMetrics]);

  const hints = statHints(partnerType, slices, activeBranchLabel);
  const metricsFailed =
    loadState === "loaded" &&
    slices.some(
      (s) =>
        s.state === "error" ||
        s.state === "unavailable" ||
        s.state === "needs_branch" ||
        s.state === "invalid_branch",
    );

  return (
    <div className={styles.grid}>
      {catalogStatus === "NEEDS_REVISION" ? (
        <section className={styles.alertBanner} role="status">
          <strong>Нужно исправить профиль</strong>
          <p>Есть замечания модератора — откройте профиль, внесите правки и отправьте повторно.</p>
          <Link href="/profile?section=moderation">Исправить профиль →</Link>
        </section>
      ) : needsProfileCompletion ? (
        <section className={styles.alertBanner} role="status">
          <strong>Дополните профиль</strong>
          <p>Укажите имя представителя, город и направления работы, чтобы отправить карточку на проверку.</p>
          <Link href="/profile">Заполнить профиль →</Link>
        </section>
      ) : null}

      {partnerType === "STORE" ? (
        <BusinessHomeBranchPicker
          selectedBranchId={selectedBranchId}
          branchSelectionRequired={branchSelectionRequired}
          onBranchSelected={handleBranchSelected}
        />
      ) : null}

      <section className={styles.heroTask} aria-labelledby="business-home-hero">
        <div>
          <h2 id="business-home-hero">{copy.heroTitle}</h2>
          <p className={styles.heroLead}>{copy.heroLead}</p>
        </div>
        <Link href={copy.heroHref} className={styles.primaryCtaLink}>
          {copy.heroCta}
          <IconArrowUpRight width={20} height={20} />
        </Link>
      </section>

      <div className={styles.stats} aria-live="polite">
        {copy.stats.map((label, index) => {
          const slice = slices[index]!;
          const err = sliceErrorMessage(slice);
          return (
            <div className={styles.stat} key={label}>
              <span className={styles.statLabel}>{label}</span>
              <strong className={styles.statValue}>{metricCountLabel(slice)}</strong>
              <span className={styles.statHint}>{hints[index]}</span>
              {err ? (
                <p className={styles.statError} role="alert">
                  {err}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

      {metricsFailed ? (
        <div className={styles.retryRow}>
          <Button variant="secondary" onClick={() => void loadMetrics()}>
            Обновить показатели
          </Button>
        </div>
      ) : null}

      <div className={styles.twoCol}>
        <section className={styles.panel}>
          <h2>С чего начать</h2>
          <Link href="/partners" className={styles.actionLine} aria-label="Открыть Партнёры">
            <div>
              <h3>Партнёры</h3>
              <small>Условия сотрудничества</small>
            </div>
            <span className={styles.iconBtn} aria-hidden="true">
              <IconArrowRight width={20} height={20} />
            </span>
          </Link>
          <Link href="/profile" className={styles.actionLine} aria-label="Открыть Профиль">
            <div>
              <h3>Профиль</h3>
              <small>Дополняйте по мере необходимости</small>
            </div>
            <span className={styles.iconBtn} aria-hidden="true">
              <IconArrowRight width={20} height={20} />
            </span>
          </Link>
        </section>

        <section className={styles.panel}>
          <h2>Ничего лишнего на старте</h2>
          <p className={styles.deferredCopy}>
            {catalogStatus === "APPROVED"
              ? "Дополнительные программы и детали карточки настраиваются в профиле по мере необходимости. Начните с одного нужного действия."
              : "Публикация в каталоге, дополнительные программы и подробное описание доступны позже. Начните с одного нужного действия."}
          </p>
          <div className={styles.divider} />
          <Link href="/profile" className={styles.ghostCtaLink}>
            Настроить профиль
          </Link>
        </section>
      </div>
    </div>
  );
}
