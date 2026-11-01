#!/usr/bin/env node
/**
 * Stateful loopback upstream for A16f admin notifications inbox + settings QA.
 */
import http from "node:http";
import { createInboxStore } from "./inbox-store.mjs";

const HOST = "127.0.0.1";

const VIEWER = {
  id: "qa-admin-notify-1",
  publicId: "RC-NOT-QA1",
  displayName: "Админ уведомлений",
  staffRole: "ADMIN",
};

const defaultSettings = {
  newClients: true,
  newPartners: true,
  partnerActivity: false,
  channels: [],
  activityFrequency: "daily",
};

const defaultBindings = { telegramLinked: false, maxLinked: false };

const inbox = createInboxStore();

/** @type {{ settingsSaveDelayMs: number, bindDelayMs: number, log: object[] }} */
const state = {
  settingsSaveDelayMs: 0,
  bindDelayMs: 0,
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

function settingsGetPayload() {
  if (inbox.flags.scenario === "settings-load-fail") {
    return { status: 503, body: { error: "Не удалось загрузить настройки" } };
  }
  const bindings =
    inbox.flags.scenario === "settings-linked-tg"
      ? { telegramLinked: true, maxLinked: false }
      : defaultBindings;
  const settings =
    inbox.flags.scenario === "max-enabled-unlinked"
      ? { ...defaultSettings, channels: ["max"] }
      : { ...defaultSettings };
  return { status: 200, body: { settings, bindings } };
}

export function createUpstreamServer() {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url || "/", `http://${HOST}`);
    const path = url.pathname;
    const method = req.method || "GET";

    if (path === "/__qa/log" && method === "GET") {
      return json(res, 200, {
        log: state.log,
        scenario: inbox.flags.scenario,
        unreadCount: inbox.unreadCount(),
        snapshot: inbox.snapshot(),
      });
    }
    if (path === "/__qa/reset" && method === "POST") {
      inbox.reset();
      state.settingsSaveDelayMs = 0;
      state.bindDelayMs = 0;
      state.log.length = 0;
      return json(res, 200, { ok: true });
    }
    if (path === "/__qa/scenario" && method === "POST") {
      const body = await readBody(req);
      if (typeof body.scenario === "string") inbox.flags.scenario = body.scenario;
      if (body.listFailOnce === true) inbox.flags.listFailOnce = true;
      if (body.markOneFailOnce === true) inbox.flags.markOneFailOnce = true;
      if (body.markAllFail === true) inbox.flags.markAllFail = true;
      if (typeof body.settingsSaveDelayMs === "number") state.settingsSaveDelayMs = body.settingsSaveDelayMs;
      if (typeof body.listDelayMs === "number") inbox.flags.listDelayMs = body.listDelayMs;
      return json(res, 200, { ok: true, scenario: inbox.flags.scenario });
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
      return json(res, 200, { count: inbox.unreadCount() });
    }

    if (path === "/api/pro/admin/notifications" && method === "GET") {
      const unread = url.searchParams.get("unread") === "1";
      const cursor = url.searchParams.get("cursor") || null;
      const limit = Number(url.searchParams.get("limit") || "25");
      pushLog({ method, path, kind: "list", unread, cursor });

      if (inbox.consumeListFailure()) {
        return json(res, 503, { error: "Synthetic list failure after mutation" });
      }
      if (inbox.flags.listDelayMs > 0) {
        await new Promise((r) => setTimeout(r, inbox.flags.listDelayMs));
      }

      const result = inbox.list({ unread, cursor, limit });
      if (result.error) {
        return json(res, result.status, { error: result.message });
      }
      return json(res, 200, { items: result.items, nextCursor: result.nextCursor });
    }

    if (path.startsWith("/api/pro/admin/notifications/") && path.endsWith("/read") && method === "PATCH") {
      const id = decodeURIComponent(path.slice("/api/pro/admin/notifications/".length, -"/read".length));
      pushLog({ method, path, kind: "mark_one", id });
      if (inbox.shouldFailMarkOne()) {
        return json(res, 503, { error: "Synthetic mark-one failure" });
      }
      const outcome = inbox.markOne(id);
      if (!outcome.ok) return json(res, 404, { error: "not_found" });
      return json(res, 200, { ok: true });
    }

    if (path === "/api/pro/admin/notifications/mark-all-read" && method === "POST") {
      pushLog({ method, path, kind: "mark_all" });
      if (inbox.flags.markAllFail) {
        return json(res, 503, { error: "Synthetic mark-all failure" });
      }
      inbox.markAll();
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
      if (inbox.flags.scenario === "settings-save-fail") {
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
        bindings:
          inbox.flags.scenario === "settings-linked-tg"
            ? { telegramLinked: true, maxLinked: false }
            : defaultBindings,
      });
    }

    if (path.startsWith("/api/pro/admin/notification-bind")) {
      if (method === "POST") await readBody(req);
      pushLog({ method, path, kind: "bind" });
      if (state.bindDelayMs > 0) await new Promise((r) => setTimeout(r, state.bindDelayMs));
      return json(res, 200, { ...defaultBindings, hint: "Synthetic", deepLink: null, startPayload: "qa" });
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

export { createInboxStore, inbox };
