import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("AdminTestUsers A28a presentation contract", () => {
  const client = readFileSync(
    join(process.cwd(), "src/app/admin/test-users/AdminTestUsersClient.tsx"),
    "utf8",
  );

  it("uses canonical filter helper and clear-filter control", () => {
    expect(client).toContain("filterProfTestUsers");
    expect(client).toContain("Сбросить фильтры");
    expect(client).toContain('aria-label="Тип партнёра"');
  });

  it("preserves create draft on failure and blocks duplicate submit while pending", () => {
    expect(client).toContain("setForm(submitted)");
    expect(client).toContain("createGenRef");
    expect(client).toContain("disabled={creating}");
    expect(client).toMatch(/if \(creating\) return;/);
    expect(client).not.toContain("nextDisplayNameForKind");
    expect(client).not.toContain("nextProfTestUserDisplayName");
  });

  it("preserves root create error helper and strict list load controls", () => {
    expect(client).toContain("adminTestUserCreateError");
    expect(client).toContain("parseAdminTestUserListResponse");
    expect(client).toContain("listLoadSeqRef");
    expect(client).toContain("listError");
    expect(client).toContain("Повторить загрузку");
    expect(client).not.toContain("res.items ?? []");
    expect(client).not.toContain("SERVICE_UNAVAILABLE");
  });
});
