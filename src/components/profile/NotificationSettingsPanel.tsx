"use client";

import { useCallback, useEffect, useState } from "react";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import {
  channelDeliveryEnabled,
  parseNotificationSettingsUi,
  payloadFromUi,
  setChannelEnabled,
  type NotificationSettingsUi,
} from "@/lib/notification-settings-ui";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import styles from "./ProfileEditor.module.css";

type NotificationSettingsPanelProps = {
  telegramLinked: boolean;
  maxLinked: boolean;
  initialSettings: unknown;
  onLinkedChange?: (state: { telegramLinked: boolean; maxLinked: boolean }) => void;
};

export function NotificationSettingsPanel({
  telegramLinked: telegramLinkedProp,
  maxLinked: maxLinkedProp,
  initialSettings,
  onLinkedChange,
}: NotificationSettingsPanelProps) {
  const [settings, setSettings] = useState<NotificationSettingsUi>(
    parseNotificationSettingsUi(initialSettings),
  );
  const [telegramLinked, setTelegramLinked] = useState(telegramLinkedProp);
  const [maxLinked, setMaxLinked] = useState(maxLinkedProp);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [binding, setBinding] = useState<"TELEGRAM" | "MAX" | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setSettings(parseNotificationSettingsUi(initialSettings));
  }, [initialSettings]);

  useEffect(() => {
    setTelegramLinked(telegramLinkedProp);
    setMaxLinked(maxLinkedProp);
  }, [telegramLinkedProp, maxLinkedProp]);

  const refreshBindStatus = useCallback(async () => {
    try {
      const status = await remcardFetch<{ telegramLinked: boolean; maxLinked: boolean }>(
        "/api/pro/notification-bind/status",
      );
      setTelegramLinked(status.telegramLinked);
      setMaxLinked(status.maxLinked);
      onLinkedChange?.(status);
    } catch {
      // keep last known
    }
  }, [onLinkedChange]);

  async function saveSettings() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await remcardFetch<{ settings: unknown }>("/api/pro/notification-settings", {
        method: "PATCH",
        body: payloadFromUi(settings),
      });
      setSettings(parseNotificationSettingsUi(res.settings));
      setMessage("Настройки уведомлений сохранены");
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  }

  async function startBind(provider: "TELEGRAM" | "MAX") {
    setBinding(provider);
    setError("");
    setMessage("");
    try {
      const res = await remcardFetch<{
        deepLink: string | null;
        startPayload: string;
        hint: string;
      }>("/api/pro/notification-bind/start", {
        method: "POST",
        body: { provider },
      });
      if (res.deepLink) {
        window.open(res.deepLink, "_blank", "noopener,noreferrer");
      }
      setMessage(`${res.hint} После подтверждения в боте нажмите «Обновить статус».`);
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось начать привязку");
    } finally {
      setBinding(null);
    }
  }

  async function sendTest() {
    setTesting(true);
    setError("");
    setMessage("");
    try {
      const res = await remcardFetch<{
        ok: boolean;
        delivered?: string[];
        failed?: string[];
        skipped?: string[];
        error?: string;
      }>("/api/pro/notification-settings/test", { method: "POST", body: {} });

      const parts: string[] = [];
      if (res.delivered?.length) parts.push(`доставлено: ${res.delivered.join(", ")}`);
      if (res.skipped?.length) parts.push(`пропущено (выключено): ${res.skipped.join(", ")}`);
      if (res.failed?.length) parts.push(`ошибка: ${res.failed.join(", ")}`);

      if (res.delivered?.length) {
        setMessage(
          `Запрос выполнен. ${parts.join("; ")}. Проверьте мессенджер — отсутствие сообщения возможно при блокировке бота.`,
        );
      } else {
        setError(res.error || parts.join("; ") || "Ни один канал не отправил тест");
      }
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Ошибка теста");
    } finally {
      setTesting(false);
    }
  }

  const bothLinked = telegramLinked && maxLinked;

  return (
    <Panel
      title="Уведомления в Telegram и MAX"
      hint="Привязка выполняется из текущей сессии через одноразовую ссылку бота. Это не меняет публичные контакты в карточке."
    >
      {bothLinked ? (
        <p className={styles.hint}>
          Подключены оба канала — при включённых категориях сообщения могут прийти в оба мессенджера.
        </p>
      ) : null}

      <div className={styles.notifGrid}>
        <div className={styles.notifCard}>
          <strong>Telegram</strong>
          <p>{telegramLinked ? "Подключён" : "Не подключён"}</p>
          {!telegramLinked ? (
            <Button
              type="button"
              variant="secondary"
              disabled={binding === "TELEGRAM"}
              onClick={() => void startBind("TELEGRAM")}
            >
              {binding === "TELEGRAM" ? "Готовим ссылку…" : "Подключить Telegram"}
            </Button>
          ) : (
            <label className={styles.checkRow}>
              <input
                type="checkbox"
                checked={channelDeliveryEnabled(settings, "telegram")}
                onChange={(e) =>
                  setSettings((s) => setChannelEnabled(s, "telegram", e.target.checked))
                }
              />
              <span>Уведомления в Telegram</span>
            </label>
          )}
        </div>
        <div className={styles.notifCard}>
          <strong>MAX</strong>
          <p>{maxLinked ? "Подключён" : "Не подключён"}</p>
          {!maxLinked ? (
            <>
              <Button
                type="button"
                variant="secondary"
                disabled={binding === "MAX"}
                onClick={() => void startBind("MAX")}
              >
                {binding === "MAX" ? "Готовим код…" : "Подключить MAX"}
              </Button>
              <p className={styles.hint}>
                После нажатия откройте MAX-бота и отправьте команду из подсказки (start payload).
              </p>
            </>
          ) : (
            <label className={styles.checkRow}>
              <input
                type="checkbox"
                checked={channelDeliveryEnabled(settings, "max")}
                onChange={(e) => setSettings((s) => setChannelEnabled(s, "max", e.target.checked))}
              />
              <span>Уведомления в MAX</span>
            </label>
          )}
        </div>
      </div>

      <Button type="button" variant="secondary" onClick={() => void refreshBindStatus()}>
        Обновить статус привязки
      </Button>

      <fieldset className={styles.fieldset}>
        <legend>Категории</legend>
        <label className={styles.checkRow}>
          <input
            type="checkbox"
            checked={settings.moderation}
            onChange={(e) => setSettings((s) => ({ ...s, moderation: e.target.checked }))}
          />
          <span>Профиль и модерация</span>
        </label>
        <label className={styles.checkRow}>
          <input
            type="checkbox"
            checked={settings.leads}
            onChange={(e) => setSettings((s) => ({ ...s, leads: e.target.checked }))}
          />
          <span>Приглашения и условия</span>
        </label>
        <label className={styles.checkRow}>
          <input
            type="checkbox"
            checked={settings.bonuses}
            onChange={(e) => setSettings((s) => ({ ...s, bonuses: e.target.checked }))}
          />
          <span>Покупки и начисления</span>
        </label>
      </fieldset>

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className={styles.success} role="status">
          {message}
        </p>
      ) : null}

      <div className={styles.actions}>
        <Button type="button" disabled={saving} onClick={() => void saveSettings()}>
          {saving ? "Сохранение…" : "Сохранить настройки"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={testing || (!telegramLinked && !maxLinked)}
          onClick={() => void sendTest()}
        >
          {testing ? "Отправка…" : "Проверить уведомление"}
        </Button>
      </div>
    </Panel>
  );
}
