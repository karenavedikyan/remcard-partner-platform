"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import styles from "./AgentPartnerHubModal.module.css";

export type HubModalTab = "find" | "link";

type Props = {
  open: boolean;
  tab: HubModalTab;
  titleFind: string;
  titleLink: string;
  /**
   * Frozen R1 ready chrome: dialog title «Приглашение создано», no find/link tabs.
   * Presentation only — does not change create/share/revoke routes.
   */
  readyMode?: boolean;
  choiceMode?: boolean;
  prototypeMode?: boolean;
  onChooseMethod?: () => void;
  titleReady?: string;
  onTabChange: (tab: HubModalTab) => void;
  onClose: () => void;
  children: ReactNode;
};

export function AgentPartnerHubModal({
  open,
  tab,
  titleFind,
  titleLink,
  readyMode = false,
  choiceMode = false,
  prototypeMode = false,
  onChooseMethod,
  titleReady = "Приглашение создано",
  onTabChange,
  onClose,
  children,
}: Props) {
  const modalTitle = choiceMode ? "Найти партнёра" : readyMode ? titleReady : tab === "link" ? (prototypeMode ? "Пригласить по ссылке" : titleLink) : titleFind;
  const sheetRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const hasOpenedRef = useRef(open);
  if (open) hasOpenedRef.current = true;

  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
      if (event.key === "Tab" && sheetRef.current) {
        const focusable = Array.from(sheetRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        )).filter(node => node.getClientRects().length > 0 && !node.hasAttribute("disabled"));
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      restoreFocusRef.current?.focus();
    };
  }, [open, onClose]);

  const findWide = !readyMode && !choiceMode && tab === "find";

  // Mount lazily, then preserve the search state across subsequent openings.
  // Mounting a closed Hub on first render would issue invisible requests.
  if (!hasOpenedRef.current) return null;

  // Keep children mounted while closed so modal find Hub does not silently
  // re-search on close→open (state + auto-search key survive).
  return (
    <div
      className={[
        styles.backdrop,
        readyMode ? styles.backdropReady : "",
        findWide ? styles.backdropFind : "",
      ]
        .filter(Boolean)
        .join(" ")}
      role="presentation"
      hidden={!open}
      aria-hidden={!open}
      data-open={open ? "true" : "false"}
      style={open ? undefined : { display: "none" }}
      onClick={(e) => {
        if (!open) return;
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={sheetRef}
        className={[
          styles.sheet,
          prototypeMode && findWide ? styles.prototypeFind : "",
          choiceMode ? styles.sheetChoice : !readyMode && tab === "link" ? styles.sheetLink : "",
          readyMode ? styles.sheetReady : "",
          findWide ? styles.sheetFind : "",
        ]
          .filter(Boolean)
          .join(" ")}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid="agent-partner-hub-modal"
        data-ready-mode={readyMode ? "true" : "false"}
        data-hub-tab={readyMode ? "ready" : tab}
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.header}>
          <div>
            <h2 id={titleId}>{modalTitle}</h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            className={styles.closeBtn}
            aria-label="Закрыть"
            onClick={onClose}
          >
            ×
          </button>
        </header>
        {readyMode || choiceMode || prototypeMode ? null : (
          <div
            className={styles.pathTabs}
            role="tablist"
            aria-label="Способ приглашения"
            data-testid="agent-partner-hub-modal-tabs"
          >
            <button
              type="button"
              role="tab"
              aria-selected={tab === "find"}
              data-active={tab === "find"}
              onClick={() => onTabChange("find")}
            >
              Найти в RemCard
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "link"}
              data-active={tab === "link"}
              onClick={() => onTabChange("link")}
            >
              Пригласить по ссылке
            </button>
          </div>
        )}
        <div className={styles.body}>
          {choiceMode ? (
            <div className={styles.methodChoices}>
              <button type="button" className={styles.methodChoice} onClick={() => onTabChange("find")}>
                <span className={styles.methodIcon} aria-hidden="true">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <circle cx="11" cy="11" r="7" />
                    <path d="M20 20l-3-3" strokeLinecap="round" />
                  </svg>
                </span>
                <span className={styles.methodEyebrow}>Уже в RemCard</span>
                <strong>Найти в RemCard</strong>
                <p>
                  Партнёр уже зарегистрирован. Посмотрите витрину по этапам ремонта и направлениям, откройте
                  карточку и предложите сотрудничество.
                </p>
                <span className={styles.methodLink}>
                  Открыть витрину
                  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </span>
              </button>
              <button type="button" className={styles.methodChoice} onClick={() => onTabChange("link")}>
                <span className={`${styles.methodIcon} ${styles.methodIconMuted}`} aria-hidden="true">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M10 13a5 5 0 007 0l1-1a5 5 0 00-7-7l-1 1" strokeLinecap="round" />
                    <path d="M14 11a5 5 0 00-7 0l-1 1a5 5 0 007 7l1-1" strokeLinecap="round" />
                  </svg>
                </span>
                <span className={styles.methodEyebrow}>Ещё не в RemCard</span>
                <strong>Пригласить по ссылке</strong>
                <p>
                  Знакомого магазина, специалиста, агента или компании ещё нет на платформе. Создайте приглашение
                  и отправьте лично.
                </p>
                <span className={styles.methodLink}>
                  Создать приглашение
                  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </span>
              </button>
            </div>
          ) : null}
          {!choiceMode && !readyMode && tab === "find" && onChooseMethod ? <button className={styles.anotherMethod} type="button" onClick={onChooseMethod}>Другой способ приглашения</button> : null}
          <div hidden={choiceMode}>{children}</div>
        </div>
      </div>
    </div>
  );
}
