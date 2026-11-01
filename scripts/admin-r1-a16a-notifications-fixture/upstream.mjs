#!/usr/bin/env node
/**
 * Loopback synthetic upstream for compiled Next.js /admin/notifications QA.
 * No DB, no production data, no real messenger sends.
 */
import http from "node:http";

const HOST = "127.0.0.1";

const VIEWER = {
  id: "qa-admin-notify-1",
  publicId: "RC-NOT-QA1",
  displayName: "Админ уведомлений",
  staffRole: "ADMIN",
};

const unreadItem = {
  id: "n-unread-fixture",
  type: "NEW_PARTNER",
  title: "Новый партнёр зарегистрирован",
  body: "Синтетическая live-регистрация для сверки R1 inbox.",
  createdAt: "2026-10-28T09:00:00.000Z",
  readAt: null,
  actionUrl: "https://prof.remcard.ru/admin/moderation/partners/u-pending",
  meta: null,
};

const readItem = {
  ...unreadItem,
  id: "n-read-fixture",
  title: "Прочитанное событие",
  readAt: "2026-10-28T10:00:00.000Z",
};

/** @type {{ log: object[] }} */
const state = { log: [] };

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

export function createUpstreamServer() {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url || "/", `http://${HOST}`);
    const path = url.pathname;
    const method = req.method || "GET";

    if (path === "/__qa/log" && method === "GET") {
      return json(res, 200, { log: state.log });
    }
    if (path === "/__qa/reset" && method === "POST") {
      state.log.length = 0;
      return json(res, 200, { ok: true });
    }

    if (path === "/api/auth/me" && method === "GET") {
      pushLog({ method, path, kind: "auth_me" });
      return json(res, 200, { user: VIEWER });
    }

    if (path === "/api/pro/admin/notifications/unread-count" && method === "GET") {
      pushLog({ method, path, kind: "unread_count" });
      return json(res, 200, { count: 1 });
    }

    if (path === "/api/pro/admin/notifications" && method === "GET") {
      pushLog({ method, path, kind: "list", unread: url.searchParams.get("unread") });
      const unreadOnly = url.searchParams.get("unread") === "1";
      const items = unreadOnly ? [unreadItem] : [unreadItem, readItem];
      return json(res, 200, { items, nextCursor: null });
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
      pushLog({ method, path, kind: "settings_get" });
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
      pushLog({ method, path, kind: "settings_patch" });
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

    if (path.startsWith("/api/pro/admin/notification-bind") && method === "GET") {
      return json(res, 200, { telegramLinked: false, maxLinked: false });
    }

    if (path.startsWith("/api/pro/admin/notification-bind") && method === "POST") {
      await readBody(req);
      return json(res, 200, { hint: "Synthetic bind", deepLink: null });
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
