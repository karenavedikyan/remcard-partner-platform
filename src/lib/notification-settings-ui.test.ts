import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  channelDeliveryEnabled,
  payloadFromUi,
  setChannelEnabled,
} from "./notification-settings-ui.ts";

describe("notification-settings-ui", () => {
  it("turning off both channels sets explicit empty list", () => {
    let ui = setChannelEnabled(
      { leads: true, bonuses: true, moderation: true, channels: [], channelsExplicit: false },
      "telegram",
      false,
    );
    ui = setChannelEnabled(ui, "max", false);
    assert.equal(ui.channelsExplicit, true);
    assert.deepEqual(ui.channels, []);
    assert.equal(channelDeliveryEnabled(ui, "telegram"), false);
    assert.equal(channelDeliveryEnabled(ui, "max"), false);
    assert.deepEqual(payloadFromUi(ui), {
      leads: true,
      bonuses: true,
      moderation: true,
      channels: [],
      channelsExplicit: true,
    });
  });

  it("legacy default treats empty as all messengers enabled", () => {
    const ui = {
      leads: true,
      bonuses: true,
      moderation: true,
      channels: [] as string[],
      channelsExplicit: false,
    };
    assert.equal(channelDeliveryEnabled(ui, "telegram"), true);
    assert.equal(channelDeliveryEnabled(ui, "max"), true);
  });
});
