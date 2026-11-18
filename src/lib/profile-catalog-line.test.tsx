import { describe, expect, it } from "vitest";
import { catalogLineStatusText } from "./profile-catalog-state";
import type { ProProfileResponse } from "./types";

const withStatus = (catalogStatus: string, live = false) =>
  ({
    organization: null,
    programs: [],
    user: { id: "u", catalogStatus },
    catalogPublication: live ? { isLivePublic: true } : undefined,
  }) as unknown as ProProfileResponse;

describe("catalogLineStatusText", () => {
  it.each([
    ["APPROVED", true, "Проверен · опубликовано"],
    ["APPROVED", false, "Проверен · не опубликовано"],
    ["DRAFT", false, "Не опубликовано"],
    ["PENDING", false, "На проверке"],
    ["REJECTED", false, "Отклонён"],
    ["NEEDS_REVISION", false, "Нужно исправить"],
  ])("%s live=%s → %s", (status, live, expected) => {
    expect(catalogLineStatusText(withStatus(status, live))).toBe(expected);
  });
});
