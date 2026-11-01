#!/usr/bin/env node
/**
 * Loopback synthetic upstream for A16b compiled Next.js /admin/notifications QA.
 */
import http from "node:http";

const HOST = "127.0.0.1";

const VIEWER = {
  id: "qa-admin-notify-1",
  publicId: "RC-NOT-QA1",
  displayName: "Админ уведомлений",
  staffRole: "ADMIN",
};

const baseUnread = {
  id: "n-unread-fixture",
  type: "NEW_PARTNER",
  title: "Новый партнёр зарегистрирован",
  body: "Синтетическая live-регистрация для сверки R1 inbox.",
  createdAt: "2026-10-28T09:00:00.000Z",
  readAt: null,
  actionUrl: "https://prof.remcard.ru/admin/moderation/partners/u-pending",
  meta: null,
};

const baseRead = {
  ...baseUnread,
  id: "n-read-fixture",
  title: "Прочитанное событие",
  readAt: "2026-10-28T10:00:00.000Z",
};

/** @type {{ scenario: string, listDelayMs: number, log: object[] }} */
const state = {
  scenario: "default",
  listDelayMs: 0,
  log: [],
};

function json(res, status, body) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

function pushLog(entry) {
  state.log.push({ ...entry, at: new Date().toISOString() });
}

function listPayload(url) {
  const unreadOnly = url.searchParams.get("unread") === "1";
  const cursor = url.searchParams.get("cursor");

  if (state.scenario === "error") {
    return { status: 503, body: { error: "Synthetic upstream failure" } };
  }
  if (state.scenario === "empty") {
    return { status: 200, body: { items: [], nextCursor: null } };
  }
  if (state.scenario === "long") {
    const longUnread = {
      ...baseUnread,
      title: `${"Очень длинный заголовок уведомления ".repeat(6)}конец`,
      body: `${"Длинный текст тела уведомления для проверки переносов и отсутствия горизонтального переполнения. ".repeat(8)}`,
    };
    return {
      status: 200,
      body: { items: unreadOnly ? [longUnread] : [longUnread, baseRead], nextCursor: null },
    };
  }
  if (state.scenario === "paginate") {
    if (cursor === "page2") {
      return { status: 200, body: { items: [{ ...baseUnread, id: "p2", title: "Страница 2 — непрочитанное" }], nextCursor: null } };
    }
    return {
      status: 200,
      body: {
        items: [{ ...baseUnread, id: "p1", title: "Страница 1 — непрочитанное" }],
        nextCursor: unreadOnly ? "page2" : null,
      },
    };
  }

  const items = unreadOnly ? [baseUnread] : [baseUnread, baseRead];
  return { status: 200, body: { items, nextCursor: null } };
}

export function createUpstreamServer() {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url || "/", `http://${HOST}`);
    const path = url.pathname;
    const method = req.method || "GET";

    if (path === "/__qa/log" && method === "GET") {
      return json(res, 200, { log: state.log, scenario: state.scenario });
    }
    if (path === "/__qa/reset" && method === "POST") {
      state.scenario = "default";
      state.listDelayMs = 0;
      state.log.length = 0;
      return json(res, 200, { ok: true });
    }
    if (path === "/__qa/scenario" && method === "POST") {
      const body = await readBody(req);
      if (typeof body.scenario === "string") state.scenario = body.scenario;
      if (typeof body.listDelayMs === "number") state.listDelayMs = body.listDelayMs;
      return json(res, 200, { ok: true, scenario: state.scenario });
    }

    if (path === "/api/auth/me" && method === "GET") {
      return json(res, 200, {
        user: {
          id: VIEWER.id,
          displayName: VIEWER.displayName,
          publicId: VIEWER.publicId,
          role: "PRO",
          staffRole: VIEWER.staffRole,
        },
      });
    }

    if (path === "/api/pro/admin/notifications/unread-count" && method === "GET") {
      return json(res, 200, { count: state.scenario === "empty" ? 0 : 2 });
    }

    if (path === "/api/pro/admin/notifications" && method === "GET") {
      pushLog({ method, path, kind: "list", unread: url.searchParams.get("unread"), cursor: url.searchParams.get("cursor") });
      if (state.listDelayMs > 0) {
        await new Promise((r) => setTimeout(r, state.listDelayMs));
      }
      const payload = listPayload(url);
      return json(res, payload.status, payload.body);
    }

    if (path.startsWith("/api/pro/admin/notifications/") && path.endsWith("/read") && method === "PATCH") {
      pushLog({ method, path, kind: "mark_one" });
      return json(res, 200, { ok: true });
    }

    if (path === "/api/pro/admin/notifications/mark-all-read" && method === "POST") {
      pushLog({ method, path, kind: "mark_all" });
      return json(res, 200, { ok: true });
    }

    if (path === "/api/pro/admin/notification-settings" && method === "GET") {
      return json(res, 200, {
        settings: {
          newClients: true,
          newPartners: true,
          partnerActivity: false,
          channels: [],
          activityFrequency: "daily",
        },
        bindings: { telegramLinked: false, maxLinked: false },
      });
    }

    if (path === "/api/pro/admin/notification-settings" && method === "PATCH") {
      await readBody(req);
      return json(res, 200, {
        settings: {
          newClients: true,
          newPartners: true,
          partnerActivity: false,
          channels: [],
          activityFrequency: "daily",
        },
        bindings: { telegramLinked: false, maxLinked: false },
      });
    }

    if (path.startsWith("/api/pro/admin/notification-bind")) {
      if (method === "POST") await readBody(req);
      return json(res, 200, { telegramLinked: false, maxLinked: false, hint: "Synthetic", deepLink: null });
    }

    pushLog({ method, path, kind: "unhandled" });
    return json(res, 404, { error: "not_found", path });
  });
}

export function startUpstream(port = 0) {
  return new Promise((resolve, reject) => {
    const server = createUpstreamServer();
    server.listen(port, HOST, () => {
      const addr = server.address();
      const bound = typeof addr === "object" && addr ? addr.port : port;
      resolve({ server, host: HOST, port: bound, baseUrl: `http://${HOST}:${bound}` });
    });
    server.on("error", reject);
  });
}
