export type NotificationSettingsUi = {
  leads: boolean;
  bonuses: boolean;
  moderation: boolean;
  channels: string[];
  channelsExplicit: boolean;
};

export function parseNotificationSettingsUi(raw: unknown): NotificationSettingsUi {
  if (!raw || typeof raw !== "object") {
    return {
      leads: true,
      bonuses: true,
      moderation: true,
      channels: [],
      channelsExplicit: false,
    };
  }
  const s = raw as Record<string, unknown>;
  return {
    leads: s.leads !== false,
    bonuses: s.bonuses !== false,
    moderation: s.moderation !== false,
    channels: Array.isArray(s.channels)
      ? s.channels.filter((c): c is string => typeof c === "string")
      : [],
    channelsExplicit: s.channelsExplicit === true,
  };
}

export function channelDeliveryEnabled(
  settings: NotificationSettingsUi,
  channel: "telegram" | "max",
): boolean {
  if (!settings.channelsExplicit) {
    return settings.channels.length === 0 ? true : settings.channels.includes(channel);
  }
  return settings.channels.includes(channel);
}

export function setChannelEnabled(
  settings: NotificationSettingsUi,
  channel: "telegram" | "max",
  on: boolean,
): NotificationSettingsUi {
  const base = settings.channelsExplicit
    ? new Set(settings.channels)
    : new Set(settings.channels.length ? settings.channels : ["telegram", "max"]);
  if (on) base.add(channel);
  else base.delete(channel);
  return {
    ...settings,
    channelsExplicit: true,
    channels: [...base],
  };
}

export function payloadFromUi(settings: NotificationSettingsUi) {
  return {
    leads: settings.leads,
    bonuses: settings.bonuses,
    moderation: settings.moderation,
    channels: settings.channels,
    channelsExplicit: settings.channelsExplicit,
  };
}
