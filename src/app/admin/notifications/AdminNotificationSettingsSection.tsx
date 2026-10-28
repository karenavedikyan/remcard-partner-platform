"use client";

import { useCallback, useEffect, useState } from "react";
import { RemcardApiError } from "@/lib/api-client";
import {
  isTrustedAdminNotificationBindDeepLink,
  openTrustedAdminNotificationBindDeepLink,
} from "@/lib/admin-notification-bind-url";
import {
  fetchAdminNotificationSettings,
  fetchAdminNotificationBindStatus,
  patchAdminNotificationSettings,
  startAdminNotificationBind,
  type AdminNotificationBindings,
} from "@/lib/prof-admin-notifications-api";
import {
  adminChannelEnabled,
  adminNotificationSettingsPatchPayload,
  parseAdminNotificationSettingsForm,
  setAdminChannelEnabled,
  settingsToForm,
  type AdminNotificationSettingsForm,
} from "@/lib/prof-admin-notification-settings-ui";
import { Button } from "@/components/ui/Button";
import styles from "./AdminNotifications.module.css";

export function AdminNotificationSettingsSection() {
  const [form, setForm] = useState<AdminNotificationSettingsForm | null>(null);
  const [bindings, setBindings] = useState<AdminNotificationBindings | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [bindingBusy, setBindingBusy] = useState<"TELEGRAM" | "MAX" | null>(null);
  const [bindFallbackLink, setBindFallbackLink] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const data = await fetchAdminNotificationSettings();
      setForm(settingsToForm(data.settings));
      setBindings(data.bindings);
    } catch (caught) {
      setLoadError(caught instanceof RemcardApiError ? caught.message : "Не удалось загрузить настройки");
      setForm(null);
      setBindings(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  async function refreshBindings() {
    setSaveError("");
    try {
      const status = await fetchAdminNotificationBindStatus();
      setBindings(status);
      setSaveMessage("Статус привязки обновлён");
    } catch (caught) {
      setSaveError(
        caught instanceof RemcardApiError ? caught.message : "Не удалось обновить статус привязки мессенджеров",
      );
    }
  }

  async function startBind(provider: "TELEGRAM" | "MAX") {
    setBindingBusy(provider);
    setSaveError("");
    setSaveMessage("");
    setBindFallbackLink(null);
    try {
      const res = await startAdminNotificationBind(provider);
      if (res.deepLink) {
        if (!isTrustedAdminNotificationBindDeepLink(res.deepLink)) {
          setSaveError("Сервер вернул небезопасную ссылку привязки. Откройте привязку через кнопку позже или обратитесь в поддержку.");
          return;
        }
        const opened = openTrustedAdminNotificationBindDeepLink(res.deepLink);
        if (opened === "popup_blocked") {
          setBindFallbackLink(res.deepLink);
          setSaveMessage(`${res.hint} Браузер заблокировал окно — откройте ссылку ниже.`);
        } else if (opened === "opened") {
          setSaveMessage(`${res.hint} После подтверждения в боте нажмите «Обновить привязку».`);
        }
      } else {
        setSaveMessage(res.hint);
      }
    } catch (caught) {
      setSaveError(caught instanceof RemcardApiError ? caught.message : "Не удалось начать привязку");
    } finally {
      setBindingBusy(null);
    }
  }

  async function save() {
    if (!form) return;
    const tgLinked = bindings?.telegramLinked === true;
    const maxLinked = bindings?.maxLinked === true;
    if (adminChannelEnabled(form, "telegram") && !tgLinked) {
      setSaveError("Telegram отмечен для доставки, но мессенджер не привязан. Сначала привяжите Telegram или снимите канал.");
      return;
    }
    if (adminChannelEnabled(form, "max") && !maxLinked) {
      setSaveError("MAX отмечен для доставки, но мессенджер не привязан. Сначала привяжите MAX или снимите канал.");
      return;
    }
    setSaving(true);
    setSaveError("");
    setSaveMessage("");
    try {
      const data = await patchAdminNotificationSettings(adminNotificationSettingsPatchPayload(form));
      setForm(settingsToForm(data.settings));
      setBindings(data.bindings);
      setSaveMessage("Настройки сохранены");
    } catch (caught) {
      setSaveError(caught instanceof RemcardApiError ? caught.message : "Не удалось сохранить настройки");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className={styles.stateBox}>Загрузка настроек…</p>;
  }

  if (loadError || !form) {
    return (
      <div className={styles.stateBox} role="alert">
        <p>{loadError || "Настройки недоступны"}</p>
        <button type="button" className={styles.retryButton} onClick={() => void loadSettings()}>
          Повторить
        </button>
      </div>
    );
  }

  const tgLinked = bindings?.telegramLinked === true;
  const maxLinked = bindings?.maxLinked === true;
  const tgChecked = adminChannelEnabled(form, "telegram");
  const maxChecked = adminChannelEnabled(form, "max");

  return (
    <section className={styles.settingsSection} aria-labelledby="admin-notify-settings-title">
      <h2 id="admin-notify-settings-title">Настройки уведомлений</h2>
      <p className={styles.settingsLead}>
        Категории включены на сервере по умолчанию; каналы Telegram и MAX остаются выключенными, пока вы явно не
        включите их после привязки мессенджера и не сохраните. Это настройки администратора платформы — отдельно от
        партнёрского кабинета и клиентского профиля.
      </p>

      <fieldset className={styles.fieldset}>
        <legend>Категории</legend>
        <label className={styles.checkRow}>
          <input
            type="checkbox"
            checked={form.newClients}
            onChange={(e) => setForm({ ...form, newClients: e.target.checked })}
          />
          <span>Новые клиенты</span>
        </label>
        <label className={styles.checkRow}>
          <input
            type="checkbox"
            checked={form.newPartners}
            onChange={(e) => setForm({ ...form, newPartners: e.target.checked })}
          />
          <span>Новые партнёры</span>
        </label>
        <label className={styles.checkRow}>
          <input
            type="checkbox"
            checked={form.partnerActivity}
            onChange={(e) => setForm({ ...form, partnerActivity: e.target.checked })}
          />
          <span>Активность партнёров</span>
        </label>
        <p className={styles.hint}>
          «Активность» — первый принятый визит в партнёрский кабинет за календарный день (Europe/Moscow), только при
          согласии на аналитику; не каждая страница и не чаще одного уведомления на партнёра в день.
        </p>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend>Каналы доставки</legend>
        <p className={styles.hint}>
          Переключатель канала доступен только после привязки. Включённый, но не привязанный канал не доставляет
          уведомления.
        </p>
        <label className={`${styles.checkRow} ${!tgLinked ? styles.checkRowDisabled : ""}`}>
          <input
            type="checkbox"
            checked={tgChecked}
            disabled={!tgLinked}
            aria-describedby={!tgLinked ? "admin-tg-bind-hint" : undefined}
            onChange={(e) => setForm(setAdminChannelEnabled(form, "telegram", e.target.checked))}
          />
          <span>Telegram {tgLinked ? "(привязан)" : "(не привязан — доставка недоступна)"}</span>
        </label>
        {!tgLinked ? (
          <p id="admin-tg-bind-hint" className={styles.channelWarn}>
            Привяжите Telegram к вашему администраторскому аккаунту (staff ADMIN/OWNER, в том числе при User.role=CLIENT).
          </p>
        ) : null}
        <label className={`${styles.checkRow} ${!maxLinked ? styles.checkRowDisabled : ""}`}>
          <input
            type="checkbox"
            checked={maxChecked}
            disabled={!maxLinked}
            aria-describedby={!maxLinked ? "admin-max-bind-hint" : undefined}
            onChange={(e) => setForm(setAdminChannelEnabled(form, "max", e.target.checked))}
          />
          <span>MAX {maxLinked ? "(привязан)" : "(не привязан — доставка недоступна)"}</span>
        </label>
        {!maxLinked ? (
          <p id="admin-max-bind-hint" className={styles.channelWarn}>
            Привяжите MAX через бота уведомлений — только для текущего администратора платформы.
          </p>
        ) : null}
        <div className={styles.bindActions}>
          <Button
            type="button"
            variant="secondary"
            disabled={bindingBusy !== null}
            onClick={() => void startBind("TELEGRAM")}
          >
            {bindingBusy === "TELEGRAM" ? "…" : "Привязать Telegram"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={bindingBusy !== null}
            onClick={() => void startBind("MAX")}
          >
            {bindingBusy === "MAX" ? "…" : "Привязать MAX"}
          </Button>
          <Button type="button" variant="text" onClick={() => void refreshBindings()}>
            Обновить привязку
          </Button>
        </div>
        {bindFallbackLink && isTrustedAdminNotificationBindDeepLink(bindFallbackLink) ? (
          <p className={styles.hint}>
            <a href={bindFallbackLink} target="_blank" rel="noopener noreferrer">
              Открыть ссылку привязки вручную
            </a>
          </p>
        ) : null}
      </fieldset>

      <p className={styles.hint}>
        Частота активности: {form.activityFrequency === "daily" ? "не чаще 1 раза в день" : form.activityFrequency}
      </p>

      {saveError ? (
        <p className={styles.error} role="alert">
          {saveError}
        </p>
      ) : null}
      {saveMessage ? (
        <p className={styles.success} role="status">
          {saveMessage}
        </p>
      ) : null}

      <Button type="button" disabled={saving} onClick={() => void save()}>
        {saving ? "Сохранение…" : "Сохранить"}
      </Button>
    </section>
  );
}
