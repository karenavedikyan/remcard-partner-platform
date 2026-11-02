"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import { getAppUrl } from "@/lib/config";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TextAreaField, TextField } from "@/components/ui/FormField";
import { AgentDiscussionInviteWizard } from "@/components/partners/AgentDiscussionInviteWizard";
import {
  AgentDiscussionInviteResult,
  type AgentDiscussionInviteCreatedSnapshot,
  buildDiscussionInviteShareText,
} from "@/components/partners/AgentDiscussionInviteResult";
import styles from "./PartnerInviteDialog.module.css";

type DiscussionInviteRow = {
  id: string;
  recipientLabel: string;
  cooperationSubject: string;
  status: string;
  role: "author" | "participant";
  expiresAt: string;
  createdAt: string;
  joinedAt: string | null;
  canProposeTerms: boolean;
};

type Props = {
  showSectionTitle?: boolean;
  onOpenDiscussion?: (inviteId: string) => void;
  /** Prototype presentation: shared 3-step discussion wizard. Default keeps flat form. */
  presentationWizard?: boolean;
  onSubmittingChange?: (submitting: boolean) => void;
  /** P12: notify hub chrome when ready composition is shown. */
  onReadyChange?: (ready: boolean) => void;
  /**
   * P23l: unsaved wizard draft (step>1 or filled fields, not yet ready).
   * Hub gates close/tab Stay without bumping discussionInvitePanelKey.
   */
  onDirtyChange?: (dirty: boolean) => void;
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Ожидает",
  JOINED: "Присоединились",
  REVOKED: "Отозвано",
  EXPIRED: "Истекло",
};

export function PartnerDiscussionInvitePanel({
  showSectionTitle = true,
  onOpenDiscussion,
  presentationWizard = false,
  onSubmittingChange,
  onReadyChange,
  onDirtyChange,
}: Props) {
  const router = useRouter();
  const openDiscussion =
    onOpenDiscussion ??
    ((inviteId: string) => {
      router.push(`/partners?discussion=${encodeURIComponent(inviteId)}`);
    });
  const [recipientLabel, setRecipientLabel] = useState("");
  const [cooperationSubject, setCooperationSubject] = useState("");
  const [creating, setCreating] = useState(false);
  const createInFlight = useRef(false);
  const mounted = useRef(false);
  useLayoutEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useLayoutEffect(() => {
    onSubmittingChange?.(creating);
    return () => onSubmittingChange?.(false);
  }, [creating, onSubmittingChange]);
  const [error, setError] = useState("");
  const [createdUrl, setCreatedUrl] = useState("");
  const [createdExpires, setCreatedExpires] = useState("");
  const [shareHint, setShareHint] = useState("");
  const [createdSnapshot, setCreatedSnapshot] = useState<AgentDiscussionInviteCreatedSnapshot | null>(
    null,
  );
  const [shareOpen, setShareOpen] = useState(false);
  const [invites, setInvites] = useState<DiscussionInviteRow[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  /** R1 ready hides history until «Открыть карточку приглашения». */
  const [historyRevealed, setHistoryRevealed] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const historyRef = useRef<HTMLDivElement>(null);
  const highlightedCardRef = useRef<HTMLLIElement>(null);
  const onWizardStepChange = useCallback((step: number) => {
    setWizardStep(step);
  }, []);

  const loadInvites = useCallback(async () => {
    setLoadingInvites(true);
    try {
      const data = await remcardFetch<{ invites: DiscussionInviteRow[] }>(
        "/api/partnership/discussion-invite",
      );
      setInvites(data.invites ?? []);
    } catch {
      setInvites([]);
    } finally {
      setLoadingInvites(false);
    }
  }, []);

  useEffect(() => {
    void loadInvites();
  }, [loadInvites]);

  const showWizardReady = presentationWizard && createdSnapshot;

  useEffect(() => {
    onReadyChange?.(Boolean(showWizardReady));
    return () => {
      onReadyChange?.(false);
    };
  }, [onReadyChange, showWizardReady]);

  const inviteDraftDirty =
    Boolean(presentationWizard) &&
    !createdSnapshot &&
    (wizardStep > 1 || Boolean(recipientLabel.trim()) || Boolean(cooperationSubject.trim()));

  // Layout effect so Hub dirty ref is current before paint / before the next close click.
  useLayoutEffect(() => {
    onDirtyChange?.(inviteDraftDirty);
    return () => {
      onDirtyChange?.(false);
    };
  }, [inviteDraftDirty, onDirtyChange]);

  const createLink = useCallback(async () => {
    if (createInFlight.current) return;
    createInFlight.current = true;
    setError("");
    setShareHint("");
    setCreating(true);
    const trimmedRecipient = recipientLabel.trim();
    const trimmedSubject = cooperationSubject.trim();
    try {
      const result = await remcardFetch<{
        token: string;
        expiresAt: string;
        previewPath: string;
        id?: string;
      }>("/api/partnership/discussion-invite", {
        method: "POST",
        body: {
          recipientLabel: trimmedRecipient,
          cooperationSubject: trimmedSubject,
        },
      });
      // Closing/discarding can remount a fresh draft while this POST finishes.
      // Never mark that new parent's chrome ready from the detached old panel.
      if (!mounted.current) return;
      const url = `${getAppUrl()}${result.previewPath}`;
      setCreatedUrl(url);
      setCreatedExpires(result.expiresAt);
      if (presentationWizard) {
        // Apply R1 ready chrome (title/tabs) before mounting the ready section so
        // heading focus is not stolen by a later hub re-render.
        flushSync(() => {
          onReadyChange?.(true);
        });
        // Snapshot the successful request payload — not a later editable draft.
        setCreatedSnapshot({
          recipientLabel: trimmedRecipient,
          cooperationSubject: trimmedSubject,
          url,
          expiresAt: result.expiresAt,
          inviteId: result.id,
        });
        setShareOpen(false);
        setHistoryRevealed(false);
      }
      await loadInvites();
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось создать ссылку");
      // Keep review/wizard; never show fake ready on error.
    } finally {
      createInFlight.current = false;
      setCreating(false);
    }
  }, [cooperationSubject, loadInvites, onReadyChange, presentationWizard, recipientLabel]);

  // Resolve inviteId from list when create response omitted it (existing API shape).
  useEffect(() => {
    if (!createdSnapshot || createdSnapshot.inviteId) return;
    const match = invites.find(
      (row) =>
        row.role === "author" &&
        row.status === "PENDING" &&
        row.recipientLabel === createdSnapshot.recipientLabel &&
        row.cooperationSubject === createdSnapshot.cooperationSubject,
    );
    if (match) {
      setCreatedSnapshot((prev) => (prev ? { ...prev, inviteId: match.id } : prev));
    }
  }, [createdSnapshot, invites]);

  async function copyUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setShareHint("Ссылка скопирована");
    } catch {
      setShareHint("Скопируйте ссылку вручную из поля ниже");
    }
  }

  async function copyMessageAndUrl(snapshot: AgentDiscussionInviteCreatedSnapshot) {
    try {
      await navigator.clipboard.writeText(buildDiscussionInviteShareText(snapshot));
      setShareHint("Текст и ссылка скопированы");
    } catch {
      setShareHint("Скопируйте текст вручную из поля ниже");
    }
  }

  function openInviteCard() {
    setHistoryRevealed(true);
    requestAnimationFrame(() => {
      const card = highlightedCardRef.current;
      const hist = historyRef.current;
      if (card && typeof card.scrollIntoView === "function") {
        card.scrollIntoView({ block: "nearest", inline: "nearest" });
      }
      if (hist && typeof hist.scrollIntoView === "function") {
        hist.scrollIntoView({ block: "nearest", inline: "nearest" });
      }
    });
  }

  async function revokeInvite(id: string) {
    setRevokingId(id);
    setError("");
    try {
      await remcardFetch(`/api/partnership/discussion-invite/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      await loadInvites();
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось отозвать ссылку");
    } finally {
      setRevokingId(null);
    }
  }

  function formatExpiry(iso: string) {
    try {
      return new Intl.DateTimeFormat("ru-RU", { dateStyle: "long" }).format(new Date(iso));
    } catch {
      return iso;
    }
  }

  const showHistory = !showWizardReady || historyRevealed;

  return (
    <div className={styles.linkPanel} data-testid="agent-r04-modal-discussion-link">
      <Panel
        title={
          presentationWizard
            ? undefined
            : showSectionTitle
              ? "Приглашение к обсуждению"
              : undefined
        }
        hint={
          presentationWizard
            ? undefined
            : "Для знакомого партнёра. Ссылка не подключает программу и не согласует проценты — только приглашение обсудить сотрудничество."
        }
      >
        {showWizardReady ? (
          <AgentDiscussionInviteResult
            snapshot={createdSnapshot}
            shareOpen={shareOpen}
            status={shareHint}
            proposedTerms={null}
            onToggleShare={() => setShareOpen((open) => !open)}
            onCopyUrl={() => void copyUrl(createdSnapshot.url)}
            onCopyMessageAndUrl={() => void copyMessageAndUrl(createdSnapshot)}
            onOpenInviteCard={openInviteCard}
            formatExpiry={formatExpiry}
          />
        ) : presentationWizard ? (
          <AgentDiscussionInviteWizard
            recipientLabel={recipientLabel}
            cooperationSubject={cooperationSubject}
            onRecipientLabelChange={setRecipientLabel}
            onCooperationSubjectChange={setCooperationSubject}
            creating={creating}
            error={error}
            onCreate={() => void createLink()}
            onStepChange={onWizardStepChange}
          />
        ) : (
          <>
            <p className={styles.hint}>
              Имя или название — подсказка для вас и получателя, а не поиск пользователя на
              платформе. После входа получатель явно присоединится к обсуждению; условия
              согласуются отдельно, если потребуется.
            </p>
            <TextField
              label="Имя или название партнёра"
              value={recipientLabel}
              onChange={(e) => setRecipientLabel(e.target.value)}
              required
              maxLength={120}
            />
            <TextAreaField
              label="Предмет сотрудничества"
              value={cooperationSubject}
              onChange={(e) => setCooperationSubject(e.target.value)}
              required
              maxLength={500}
              hint="Кратко: о чём хотите договориться. Получатель увидит этот текст на странице ссылки."
            />
            {error ? (
              <p className={styles.error} role="alert">
                {error}
              </p>
            ) : null}
            <div className={styles.actions}>
              <Button
                disabled={creating || !recipientLabel.trim() || !cooperationSubject.trim()}
                onClick={() => void createLink()}
              >
                {creating ? "Создаём…" : "Создать ссылку"}
              </Button>
            </div>
          </>
        )}
        {!presentationWizard && createdUrl ? (
          <div className={styles.notice} data-testid="discussion-invite-created">
            <p>
              <strong>Ссылка создана</strong>
            </p>
            <p>Действует до {createdExpires ? formatExpiry(createdExpires) : "—"}</p>
            <TextField label="Ссылка" value={createdUrl} readOnly data-testid="discussion-invite-created-url" />
            {shareHint ? <p className={styles.hint}>{shareHint}</p> : null}
            <div className={styles.actions}>
              <Button variant="secondary" onClick={() => void copyUrl(createdUrl)}>
                Скопировать ссылку
              </Button>
            </div>
          </div>
        ) : null}
      </Panel>

      {showHistory ? (
        <div ref={historyRef}>
          <Panel
            className={styles.discussionLinksPanel}
            title="Ваши ссылки к обсуждению"
            hint="Ожидающие ссылки можно отозвать до присоединения получателя."
          >
            {loadingInvites ? (
              <p className={styles.hint}>Загружаем список…</p>
            ) : invites.length === 0 ? (
              <p className={styles.hint}>Пока нет созданных ссылок.</p>
            ) : (
              <ul className={styles.linkList} data-testid="discussion-invite-list">
                {invites.map((row) => {
                  const highlighted =
                    Boolean(createdSnapshot?.inviteId) && row.id === createdSnapshot?.inviteId;
                  return (
                    <li
                      key={row.id}
                      className={styles.linkListItem}
                      ref={highlighted ? highlightedCardRef : undefined}
                      data-highlighted={highlighted ? "true" : undefined}
                      data-testid={highlighted ? "discussion-invite-card-active" : undefined}
                    >
                      <div>
                        <strong>{row.recipientLabel}</strong>
                        <p className={styles.hint}>{row.cooperationSubject}</p>
                        <p className={styles.hint}>
                          {row.role === "author" ? "Вы создали" : "Вы участник"} · до{" "}
                          {formatExpiry(row.expiresAt)}
                        </p>
                      </div>
                      <div className={styles.actions}>
                        <StatusBadge
                          label={STATUS_LABEL[row.status] ?? row.status}
                          tone={row.status === "JOINED" ? "active" : "neutral"}
                        />
                        {row.status === "JOINED" && row.canProposeTerms ? (
                          <Button variant="secondary" onClick={() => openDiscussion(row.id)}>
                            Открыть обсуждение
                          </Button>
                        ) : null}
                        {row.role === "author" && row.status === "PENDING" ? (
                          <Button
                            variant="text"
                            disabled={revokingId === row.id}
                            onClick={() => void revokeInvite(row.id)}
                          >
                            {revokingId === row.id ? "Отзываем…" : "Отозвать"}
                          </Button>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>
      ) : null}
    </div>
  );
}
