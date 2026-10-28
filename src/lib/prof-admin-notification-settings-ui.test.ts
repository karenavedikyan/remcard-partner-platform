import { describe, expect, it } from "vitest";
import {
  adminNotificationSettingsPatchPayload,
  parseAdminNotificationSettingsForm,
  setAdminChannelEnabled,
} from "./prof-admin-notification-settings-ui";

describe("prof-admin-notification-settings-ui", () => {
  it("defaults categories on and channels empty until explicit selection", () => {
    const form = parseAdminNotificationSettingsForm({});
    expect(form.newClients).toBe(true);
    expect(form.channels).toEqual([]);
    expect(adminNotificationSettingsPatchPayload(form).channels).toEqual([]);
  });

  it("persists independent category and channel booleans in patch payload", () => {
    let form = parseAdminNotificationSettingsForm({
      newClients: false,
      newPartners: true,
      partnerActivity: false,
      channels: ["telegram"],
    });
    form = setAdminChannelEnabled(form, "max", true);
    const payload = adminNotificationSettingsPatchPayload(form);
    expect(payload).toEqual({
      newClients: false,
      newPartners: true,
      partnerActivity: false,
      channels: ["telegram", "max"],
    });
  });
});
