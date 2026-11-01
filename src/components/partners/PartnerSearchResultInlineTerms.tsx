"use client";

import { useEffect, useId, useState } from "react";
import type { PartnerCertProgramState } from "@/lib/partner-certificate-program";
import cardStyles from "./PartnerSearchResultCard.module.css";
import {
  formatPartnerSearchInlineTermLine,
  partnerSearchInlinePercentHeadline,
  partnerSearchInlineRemainingCount,
  partnerSearchInlineTermsPreview,
  readPartnerCertificateProgramForSearchCard,
  resetPartnerSearchInlineTermsCache,
  getPartnerSearchInlineTermsViewerEpoch,
} from "./partnerSearchResultInlineTerms";

type PartnerSearchResultInlineTermsProps = {
  partnerUserId: string;
};

export function PartnerSearchResultInlineTerms({ partnerUserId }: PartnerSearchResultInlineTermsProps) {
  const titleId = useId();
  const [state, setState] = useState<PartnerCertProgramState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setReloadKey(0);
  }, [partnerUserId]);

  useEffect(() => {
    let cancelled = false;
    const partnerAtRequest = partnerUserId;
    const epochAtRequest = getPartnerSearchInlineTermsViewerEpoch();
    setState({ status: "loading" });
    void readPartnerCertificateProgramForSearchCard(partnerAtRequest, {
      force: reloadKey > 0,
      viewerEpoch: epochAtRequest,
    }).then((next) => {
      if (cancelled || partnerAtRequest !== partnerUserId) return;
      setState(next);
    });
    return () => {
      cancelled = true;
    };
  }, [partnerUserId, reloadKey]);

  const retry = () => {
    resetPartnerSearchInlineTermsCache(partnerUserId);
    setReloadKey((key) => key + 1);
  };

  return (
    <section
      className={cardStyles.modalResultInlineTerms}
      aria-labelledby={titleId}
      data-testid="agent-partner-search-result-terms-panel"
    >
      <div className={cardStyles.modalResultInlineTermsHead}>
        <span className={cardStyles.modalResultInlineTermsTitle} id={titleId}>
          Условия для агентов
        </span>
        {state.status === "loaded" ? (
          (() => {
            const headline = partnerSearchInlinePercentHeadline(state.items);
            if (!headline) return null;
            return (
              <div className={cardStyles.modalResultInlineTermsRange}>
                <strong data-testid="agent-partner-search-result-terms-percent-headline">
                  {headline}
                </strong>
                <small className={cardStyles.modalResultInlineTermsSub}>
                  Скидка клиенту + бонус агенту
                </small>
              </div>
            );
          })()
        ) : null}
      </div>

      {state.status === "loading" ? (
        <p
          className={cardStyles.modalResultInlineTermsMuted}
          data-testid="agent-partner-search-result-terms-loading"
          aria-live="polite"
        >
          Загрузка…
        </p>
      ) : null}

      {state.status === "error" ? (
        <p className={cardStyles.modalResultInlineTermsError} role="alert">
          <span data-testid="agent-partner-search-result-terms-error">{state.message}</span>{" "}
          <button
            type="button"
            className={cardStyles.modalResultInlineTermsRetry}
            onClick={retry}
            data-testid="agent-partner-search-result-terms-retry"
          >
            Повторить
          </button>
        </p>
      ) : null}

      {state.status === "empty" ? (
        <p
          className={cardStyles.modalResultInlineTermsMuted}
          data-testid="agent-partner-search-result-terms-empty"
        >
          Общие условия пока не опубликованы. Можно запросить персональное предложение.
        </p>
      ) : null}

      {state.status === "loaded" ? (
        <div data-testid="agent-partner-search-result-terms-summary">
          <ul className={cardStyles.modalResultInlineTermsList}>
            {partnerSearchInlineTermsPreview(state.items).map((item) => {
              const line = formatPartnerSearchInlineTermLine(item);
              return (
                <li key={item.category}>
                  <span>{line.label}</span>
                  {line.percentText ? (
                    <b data-testid="agent-partner-search-result-terms-percent">{line.percentText}</b>
                  ) : line.percentUnavailable ? (
                    <span
                      className={cardStyles.modalResultInlineTermsMuted}
                      data-testid="agent-partner-search-result-terms-percent-unavailable"
                    >
                      Нет данных
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
          {partnerSearchInlineRemainingCount(state.items, state.truncated) > 0 ? (
            <p className={cardStyles.modalResultInlineTermsMore}>
              и ещё {partnerSearchInlineRemainingCount(state.items, state.truncated)}{" "}
              {partnerSearchInlineRemainingCount(state.items, state.truncated) === 1
                ? "категория"
                : "категории"}
            </p>
          ) : null}
          <p className={cardStyles.modalResultInlineTermsDisclaimer}>
            Это общий процент на скидку клиенту и бонус агенту, не гарантированный доход. Итоговые
            условия партнёр предложит после приглашения.
          </p>
        </div>
      ) : null}
    </section>
  );
}
