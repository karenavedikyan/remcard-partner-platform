/**
 * Stateful synthetic admin notification inbox for A16f QA (not production).
 */

const NOW = "2026-11-01T10:00:00.000Z";

function seedItems() {
  return [
    {
      id: "n-unread-a",
      type: "NEW_PARTNER",
      title: "Новый партнёр зарегистрирован",
      body: "Синтетическая live-регистрация для сверки R1 inbox.",
      createdAt: "2026-10-28T09:00:00.000Z",
      readAt: null,
      actionUrl: "https://prof.remcard.ru/admin/moderation/partners/u-pending",
      meta: null,
    },
    {
      id: "n-unread-b",
      type: "NEW_CLIENT",
      title: "Новый клиент",
      body: "Второе непрочитанное для mark-all и unread filter.",
      createdAt: "2026-10-28T09:30:00.000Z",
      readAt: null,
      actionUrl: null,
      meta: { scope: "ADMIN", kind: "admin.new_client" },
    },
    {
      id: "n-read-c",
      type: "SYSTEM",
      title: "Прочитанное событие",
      body: "Уже прочитано при старте.",
      createdAt: "2026-10-27T12:00:00.000Z",
      readAt: "2026-10-28T10:00:00.000Z",
      actionUrl: null,
      meta: null,
    },
    {
      id: "n-unread-page2",
      type: "NEW_PARTNER",
      title: "Страница 2 — непрочитанное",
      body: "Пагинация unread-only.",
      createdAt: "2026-10-26T08:00:00.000Z",
      readAt: null,
      actionUrl: null,
      meta: null,
    },
  ];
}

/** @typedef {ReturnType<typeof seedItems>[number]} InboxItem */

export function createInboxStore() {
  /** @type {InboxItem[]} */
  let items = seedItems();
  /** @type {{ scenario: string, listFailOnce: boolean, markOneFailOnce: boolean, markAllFail: boolean, listDelayMs: number }} */
  const flags = {
    scenario: "default",
    listFailOnce: false,
    markOneFailOnce: false,
    markAllFail: false,
    listDelayMs: 0,
  };

  function reset() {
    items = seedItems();
    flags.scenario = "default";
    flags.listFailOnce = false;
    flags.markOneFailOnce = false;
    flags.markAllFail = false;
    flags.listDelayMs = 0;
  }

  function cloneItem(item) {
    return { ...item, meta: item.meta ? { ...item.meta } : item.meta };
  }

  function unreadCount() {
    return items.filter((i) => !i.readAt).length;
  }

  function markOne(id) {
    const row = items.find((i) => i.id === id);
    if (!row) return { ok: false, reason: "not_found" };
    if (row.readAt) return { ok: true, already: true };
    row.readAt = NOW;
    return { ok: true };
  }

  function markAll() {
    for (const row of items) {
      if (!row.readAt) row.readAt = NOW;
    }
    return { ok: true };
  }

  /**
   * @param {{ unread?: boolean, cursor?: string | null, limit?: number }} params
   */
  function list({ unread = false, cursor = null, limit = 25 }) {
    if (flags.scenario === "empty") {
      return { items: [], nextCursor: null };
    }
    if (flags.scenario === "list-error") {
      return { error: true, status: 503, message: "Synthetic upstream failure" };
    }

    let pool = items.map(cloneItem);
    if (unread) {
      pool = pool.filter((i) => !i.readAt);
    }

    if (flags.scenario === "paginate-unread" && unread) {
      if (cursor === "page2") {
        const page2 = pool.filter((i) => i.id === "n-unread-page2");
        return { items: page2.slice(0, limit), nextCursor: null };
      }
      const page1 = pool.filter((i) => i.id !== "n-unread-page2");
      return { items: page1.slice(0, limit), nextCursor: page1.length > 0 ? "page2" : null };
    }

    if (flags.scenario === "paginate-all" && !unread) {
      if (cursor === "page2") {
        const page2 = pool.filter((i) => i.id === "n-unread-page2");
        return { items: page2.slice(0, limit), nextCursor: null };
      }
      const page1 = pool.filter((i) => i.id !== "n-unread-page2");
      return { items: page1.slice(0, limit), nextCursor: page1.length > 0 ? "page2" : null };
    }

    return { items: pool.slice(0, limit), nextCursor: null };
  }

  function consumeListFailure() {
    if (!flags.listFailOnce) return false;
    flags.listFailOnce = false;
    return true;
  }

  function shouldFailMarkOne() {
    if (!flags.markOneFailOnce) return false;
    flags.markOneFailOnce = false;
    return true;
  }

  return {
    flags,
    reset,
    unreadCount,
    markOne,
    markAll,
    list,
    consumeListFailure,
    shouldFailMarkOne,
    snapshot() {
      return items.map(cloneItem);
    },
  };
}
