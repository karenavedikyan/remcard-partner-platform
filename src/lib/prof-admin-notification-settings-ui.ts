import type {
  AdminNotificationMessengerChannel,
  AdminNotificationSettings,
} from "@/lib/prof-admin-notifications-api";

export type AdminNotificationSettingsForm = {
  newClients: boolean;
  newPartners: boolean;
  partnerActivity: boolean;
  channels: AdminNotificationMessengerChannel[];
  activityFrequency: "daily";
};

const CHANNELS: AdminNotificationMessengerChannel[] = ["telegram", "max"];

function normalizeChannels(raw: unknown): AdminNotificationMessengerChannel[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((c): c is AdminNotificationMessengerChannel => c === "telegram" || c === "max");
}

export function parseAdminNotificationSettingsForm(raw: unknown): AdminNotificationSettingsForm {
  if (!raw || typeof raw !== "object") {
    return {
      newClients: true,
      newPartners: true,
      partnerActivity: true,
      channels: [],
      activityFrequency: "daily",
    };
  }
  const s = raw as Record<string, unknown>;
  return {
    newClients: s.newClients !== false,
    newPartners: s.newPartners !== false,
    partnerActivity: s.partnerActivity !== false,
    channels: normalizeChannels(s.channels),
    activityFrequency: s.activityFrequency === "daily" ? "daily" : "daily",
  };
}

export function adminNotificationSettingsPatchPayload(form: AdminNotificationSettingsForm) {
  return {
    newClients: form.newClients,
    newPartners: form.newPartners,
    partnerActivity: form.partnerActivity,
    channels: [...form.channels],
  };
}

export function setAdminChannelEnabled(
  form: AdminNotificationSettingsForm,
  channel: AdminNotificationMessengerChannel,
  on: boolean,
): AdminNotificationSettingsForm {
  const set = new Set(form.channels);
  if (on) set.add(channel);
  else set.delete(channel);
  return { ...form, channels: CHANNELS.filter((c) => set.has(c)) };
}

export function adminChannelEnabled(
  form: AdminNotificationSettingsForm,
  channel: AdminNotificationMessengerChannel,
): boolean {
  return form.channels.includes(channel);
}

export function settingsToForm(settings: AdminNotificationSettings): AdminNotificationSettingsForm {
  return parseAdminNotificationSettingsForm(settings);
}
