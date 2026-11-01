import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("AdminNotifications A16o inbox stale list refresh", () => {
  const client = readFileSync(
    join(process.cwd(), "src/app/admin/notifications/AdminNotificationsClient.tsx"),
    "utf8",
  );

  it("NOTIFICATIONS-inbox-stale-list: refreshAfterMutation owns a new request generation", () => {
    expect(client).toMatch(/const refreshAfterMutation = useCallback\(async \(\) => \{\s*const requestId = \+\+requestSeqRef\.current;/);
  });
});
