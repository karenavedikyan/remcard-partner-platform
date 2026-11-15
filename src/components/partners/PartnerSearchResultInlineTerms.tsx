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
import { CertificatePolicyCompactChips } from "@/components/certificate-policy/CertificatePolicyCompactChips";

export type PartnerSearchInlineTermsVariant = "agent-financial" | "public-certificate";

type PartnerSearchResultInlineTermsProps = {
  partnerUserId: string;
  variant?: PartnerSearchInlineTermsVariant;
  /** Parent handoff (P25t): latest resolved public summary for find→detail snapshot. */
  onPublicSummaryStateChange?: (partnerUserId: string, state: PartnerCertProgramState) => void;
};

export function PartnerSearchResultInlineTerms({
  partnerUserId,
  variant = "agent-financial",
  onPublicSummaryStateChange,
}: PartnerSearchResultInlineTermsProps) {
  const publicCertificateOnly = variant === "public-certificate";
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
      onPublicSummaryStateChange?.(partnerAtRequest, next);
    });
    return () => {
      cancelled = true;
    };
  }, [partnerUserId, reloadKey, onPublicSummaryStateChange]);

  const retry = () => {
    resetPartnerSearchInlineTermsCache(partnerUserId);
    setReloadKey((key) => key + 1);
  };

  return (
    <section
      className={cardStyles.modalResultInlineTerms}
      aria-labelledby={titleId}
      data-testid={
        publicCertificateOnly
          ? "partner-search-public-certificate-policy-panel"
          : "agent-partner-search-result-terms-panel"
      }
    >
      <div className={cardStyles.modalResultInlineTermsHead}>
        <span className={cardStyles.modalResultInlineTermsTitle} id={titleId}>
          {publicCertificateOnly ? "Условия приёма сертификата" : "Условия для агентов"}
        </span>
        {!publicCertificateOnly && state.status === "loaded" ? (
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
          data-testid={
            publicCertificateOnly
              ? "partner-search-public-certificate-policy-empty"
              : "agent-partner-search-result-terms-empty"
          }
        >
          {publicCertificateOnly
            ? "Партнёр ещё не опубликовал условия приёма сертификата."
            : "Общие условия пока не опубликованы. Можно запросить персональное предложение."}
        </p>
      ) : null}

      {state.status === "loaded" ? (
        <div
          data-testid={
            publicCertificateOnly
              ? "partner-search-public-certificate-policy-summary"
              : "agent-partner-search-result-terms-summary"
          }
        >
          {state.policy ? (
            <div className={cardStyles.modalResultInlineTermsMore}>
              {!publicCertificateOnly ? (
                <span className={cardStyles.modalResultInlineTermsTitle}>Сертификат</span>
              ) : null}
              <CertificatePolicyCompactChips
                summary={state.policy}
                testId={`cp-directory-${partnerUserId}`}
              />
            </div>
          ) : publicCertificateOnly ? (
            <p className={cardStyles.modalResultInlineTermsMuted}>Срок и лимит покупок не опубликованы.</p>
          ) : null}
          {!publicCertificateOnly ? (
            <>
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
            </>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
