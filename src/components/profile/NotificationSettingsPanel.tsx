"use client";

import { useState } from "react";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import styles from "./ProfileEditor.module.css";

type NotificationSettings = {
  leads: boolean;
  bonuses: boolean;
  moderation: boolean;
  channels: string[];
};

type NotificationSettingsPanelProps = {
  telegramLinked: boolean;
  maxLinked: boolean;
  initialSettings: unknown;
};

function parseSettings(raw: unknown): NotificationSettings {
  if (!raw || typeof raw !== "object") {
    return { leads: true, bonuses: true, moderation: true, channels: [] };
  }
  const s = raw as Partial<NotificationSettings>;
  return {
    leads: s.leads !== false,
    bonuses: s.bonuses !== false,
    moderation: s.moderation !== false,
    channels: Array.isArray(s.channels) ? s.channels.filter((c) => typeof c === "string") : [],
  };
}

function channelEnabled(settings: NotificationSettings, channel: "telegram" | "max"): boolean {
  if (settings.channels.length === 0) return true;
  return settings.channels.includes(channel);
}

export function NotificationSettingsPanel({
  telegramLinked,
  maxLinked,
  initialSettings,
}: NotificationSettingsPanelProps) {
  const [settings, setSettings] = useState<NotificationSettings>(
    parseSettings(initialSettings),
  );
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function saveSettings() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await remcardFetch<{ settings: NotificationSettings }>(
        "/api/pro/notification-settings",
        { method: "PATCH", body: settings },
      );
      setSettings(parseSettings(res.settings));
      setMessage("Настройки уведомлений сохранены");
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
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
        error?: string;
      }>("/api/pro/notification-settings/test", { method: "POST", body: {} });
      if (res.ok) {
        setMessage(
          res.delivered?.length
            ? `Тест отправлен: ${res.delivered.join(", ")}. Проверьте мессенджер.`
            : "Запрос принят — проверьте мессенджер.",
        );
      } else {
        setError(res.error || "Не удалось отправить тест");
      }
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Ошибка теста");
    } finally {
      setTesting(false);
    }
  }

  function toggleChannel(channel: "telegram" | "max", on: boolean) {
    setSettings((prev) => {
      const set = new Set(prev.channels.length ? prev.channels : ["telegram", "max"]);
      if (on) set.add(channel);
      else set.delete(channel);
      return { ...prev, channels: [...set] };
    });
  }

  const bothLinked = telegramLinked && maxLinked;

  return (
    <Panel
      title="Уведомления в Telegram и MAX"
      hint="Каналы бота не публикуют ваши контакты в карточке. Публичный Telegram в блоке «Контакты» — отдельно."
    >
      {bothLinked ? (
        <p className={styles.hint}>
          Подключены оба канала — при включённых настройках сообщения могут прийти в оба
          мессенджера.
        </p>
      ) : null}

      <div className={styles.notifGrid}>
        <div className={styles.notifCard}>
          <strong>Telegram</strong>
          <p>{telegramLinked ? "Подключён для уведомлений" : "Не подключён"}</p>
          {!telegramLinked ? (
            <p className={styles.hint}>
              Получите код в боте RemCard (/login), затем подтвердите его на странице входа
              кабинета.
            </p>
          ) : (
            <label className={styles.checkRow}>
              <input
                type="checkbox"
                checked={channelEnabled(settings, "telegram")}
                onChange={(e) => toggleChannel("telegram", e.target.checked)}
              />
              <span>Уведомления в Telegram</span>
            </label>
          )}
        </div>
        <div className={styles.notifCard}>
          <strong>MAX</strong>
          <p>{maxLinked ? "Подключён для уведомлений" : "Не подключён"}</p>
          {!maxLinked ? (
            <p className={styles.hint}>Подключите MAX через код из бота на странице входа.</p>
          ) : (
            <label className={styles.checkRow}>
              <input
                type="checkbox"
                checked={channelEnabled(settings, "max")}
                onChange={(e) => toggleChannel("max", e.target.checked)}
              />
              <span>Уведомления в MAX</span>
            </label>
          )}
        </div>
      </div>

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
