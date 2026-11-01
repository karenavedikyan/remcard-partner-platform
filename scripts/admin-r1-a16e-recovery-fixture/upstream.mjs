#!/usr/bin/env node
/**
 * Loopback synthetic upstream for A16c compiled Next.js /admin/notifications settings QA.
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

const defaultSettings = {
  newClients: true,
  newPartners: true,
  partnerActivity: false,
  channels: [],
  activityFrequency: "daily",
};

const defaultBindings = { telegramLinked: false, maxLinked: false };

/** @type {{ scenario: string, settingsSaveDelayMs: number, log: object[] }} */
const state = {
  scenario: "default",
  settingsSaveDelayMs: 0,
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
  const items = unreadOnly ? [baseUnread] : [baseUnread, baseRead];
  return { status: 200, body: { items, nextCursor: null } };
}

function settingsGetPayload() {
  if (state.scenario === "settings-load-fail") {
    return { status: 503, body: { error: "Не удалось загрузить настройки" } };
  }
  const bindings =
    state.scenario === "settings-linked-tg"
      ? { telegramLinked: true, maxLinked: false }
      : defaultBindings;
  const settings =
    state.scenario === "max-enabled-unlinked"
      ? { ...defaultSettings, channels: ["max"] }
      : { ...defaultSettings };
  return {
    status: 200,
    body: { settings, bindings },
  };
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
      state.settingsSaveDelayMs = 0;
      state.log.length = 0;
      return json(res, 200, { ok: true });
    }
    if (path === "/__qa/scenario" && method === "POST") {
      const body = await readBody(req);
      if (typeof body.scenario === "string") state.scenario = body.scenario;
      if (typeof body.settingsSaveDelayMs === "number") state.settingsSaveDelayMs = body.settingsSaveDelayMs;
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
      return json(res, 200, { count: 2 });
    }

    if (path === "/api/pro/admin/notifications" && method === "GET") {
      pushLog({ method, path, kind: "list" });
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
      pushLog({ method, path, kind: "settings_get" });
      const payload = settingsGetPayload();
      return json(res, payload.status, payload.body);
    }

    if (path === "/api/pro/admin/notification-settings" && method === "PATCH") {
      const body = await readBody(req);
      pushLog({ method, path, kind: "settings_patch", bodyKeys: Object.keys(body || {}) });
      if (state.settingsSaveDelayMs > 0) {
        await new Promise((r) => setTimeout(r, state.settingsSaveDelayMs));
      }
      if (state.scenario === "settings-save-fail") {
        return json(res, 503, { error: "Не удалось сохранить настройки" });
      }
      const nextSettings = {
        ...defaultSettings,
        partnerActivity: body?.partnerActivity === true,
        newClients: body?.newClients !== false,
        newPartners: body?.newPartners !== false,
        channels: Array.isArray(body?.channels) ? body.channels : [],
      };
      return json(res, 200, {
        settings: nextSettings,
        bindings: state.scenario === "settings-linked-tg" ? { telegramLinked: true, maxLinked: false } : defaultBindings,
      });
    }

    if (path.startsWith("/api/pro/admin/notification-bind")) {
      if (method === "POST") await readBody(req);
      pushLog({ method, path, kind: "bind" });
      return json(res, 200, { ...defaultBindings, hint: "Synthetic", deepLink: null });
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
