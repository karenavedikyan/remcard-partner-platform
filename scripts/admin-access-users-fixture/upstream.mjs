#!/usr/bin/env node
/**
 * Loopback synthetic HTTP upstream for ACTUAL Next.js /admin/access/users QA.
 * No DB. No production hosts. No real passwords in responses.
 * Control plane: POST /__qa/scenario, GET /__qa/log, POST /__qa/reset (direct only).
 */
import http from "node:http";

const HOST = "127.0.0.1";
const PORT = Number(process.env.ADMIN_ACCESS_USERS_UPSTREAM_PORT || 0);

const OWNER = {
  id: "qa-owner-1",
  publicId: "RC-OWN-QA1",
  displayName: "Владелец стенда",
  staffRole: "OWNER",
  accessState: "active",
  loginNormalized: "qa.owner",
  credentialDisabledAt: null,
  isBlocked: false,
  createdAt: "2026-10-01T10:00:00.000Z",
};

const ADMIN_A = {
  id: "qa-admin-1",
  publicId: "RC-ADM-QA1",
  displayName: "Администратор А",
  staffRole: "ADMIN",
  accessState: "active",
  loginNormalized: "qa.admin.a",
  credentialDisabledAt: null,
  isBlocked: false,
  createdAt: "2026-10-15T12:00:00.000Z",
};

/** @type {{ mode: string, createDelayMs: number, items: typeof OWNER[], nextId: number, log: object[] }} */
const state = {
  mode: "owner",
  createDelayMs: 0,
  items: [{ ...OWNER }, { ...ADMIN_A }],
  nextId: 2,
  log: [],
};

function denyIfNotLoopback(req, res) {
  const addr = req.socket.localAddress;
  if (addr !== "127.0.0.1" && addr !== "::1" && addr !== "::ffff:127.0.0.1") {
    res.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
    res.end("loopback only");
    return true;
  }
  return false;
}

function json(res, status, body) {
  const payload = JSON.stringify(body);
  if (/passwordHash|eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.|Bearer [A-Za-z0-9._-]+/.test(payload)) {
    res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    res.end("refusing secret leakage");
    return;
  }
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(payload);
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

function sanitizeBody(body) {
  if (!body || typeof body !== "object") return body;
  const copy = { ...body };
  if (typeof copy.newPassword === "string") {
    copy.newPassword = `[len=${copy.newPassword.length}]`;
  }
  if ("password" in copy) copy.password = "[redacted]";
  if ("passwordHash" in copy) delete copy.passwordHash;
  return copy;
}

function pushLog(entry) {
  state.log.push({ ...entry, at: new Date().toISOString() });
}

function viewerForMode() {
  if (state.mode === "admin") {
    return {
      id: "qa-admin-viewer",
      publicId: "RC-ADM-VIEW",
      displayName: "Админ стенда",
      staffRole: "ADMIN",
    };
  }
  if (state.mode === "operator") {
    return {
      id: "qa-op-viewer",
      publicId: "RC-OP-VIEW",
      displayName: "Оператор стенда",
      staffRole: "OPERATOR",
    };
  }
  return {
    id: OWNER.id,
    publicId: OWNER.publicId,
    displayName: OWNER.displayName,
    staffRole: "OWNER",
  };
}

/** OWNER and ADMIN may manage access; OPERATOR/lower denied. */
function actorMayManageAccess() {
  return state.mode === "owner" || state.mode === "admin";
}

function resetOwnerList(empty) {
  state.items = empty ? [{ ...OWNER }] : [{ ...OWNER }, { ...ADMIN_A }];
  state.nextId = 2;
}

export function createUpstreamServer() {
  const server = http.createServer(async (req, res) => {
    if (denyIfNotLoopback(req, res)) return;
    const url = new URL(req.url || "/", `http://${HOST}`);
    const path = url.pathname;
    const method = (req.method || "GET").toUpperCase();

    // Control plane (capture talks to upstream port directly — not via Next BFF).
    if (path === "/__qa/reset" && method === "POST") {
      state.mode = "owner";
      state.createDelayMs = 0;
      resetOwnerList(false);
      state.log = [];
      return json(res, 200, { ok: true });
    }
    if (path === "/__qa/scenario" && method === "POST") {
      try {
        const body = await readBody(req);
        if (typeof body.mode === "string") state.mode = body.mode;
        if (typeof body.createDelayMs === "number") state.createDelayMs = body.createDelayMs;
        if (body.empty === true) resetOwnerList(true);
        if (body.empty === false) resetOwnerList(false);
        if (body.resetLog === true) state.log = [];
        return json(res, 200, { ok: true, mode: state.mode, createDelayMs: state.createDelayMs });
      } catch {
        return json(res, 400, { error: "bad_json" });
      }
    }
    if (path === "/__qa/log" && method === "GET") {
      return json(res, 200, { log: state.log });
    }

    if (path === "/api/auth/me" && method === "GET") {
      pushLog({ method, path, kind: "auth_me" });
      if (state.mode === "unauth") return json(res, 401, { error: "Unauthorized" });
      const v = viewerForMode();
      return json(res, 200, {
        user: {
          id: v.id,
          displayName: v.displayName,
          publicId: v.publicId,
          role: "PRO",
          staffRole: v.staffRole,
        },
      });
    }

    if (path === "/api/pro/admin/access/users" && method === "GET") {
      pushLog({ method, path, kind: "list" });
      if (state.mode === "unauth") return json(res, 401, { error: "Unauthorized" });
      if (state.mode === "network") {
        req.socket.destroy();
        return;
      }
      if (state.mode === "error") return json(res, 503, { error: "Upstream temporarily unavailable" });
      if (!actorMayManageAccess()) return json(res, 403, { error: "Forbidden" });
      return json(res, 200, { viewer: viewerForMode(), items: state.items.map((i) => ({ ...i })) });
    }

    if (path === "/api/pro/admin/access/users" && method === "POST") {
      let body = {};
      try {
        body = await readBody(req);
      } catch {
        return json(res, 400, { error: "bad_json" });
      }
      pushLog({
        method,
        path,
        kind: "create",
        body: sanitizeBody(body),
        passwordLen: typeof body.newPassword === "string" ? body.newPassword.length : null,
      });
      if (state.mode === "unauth") return json(res, 401, { error: "Unauthorized" });
      if (!actorMayManageAccess()) return json(res, 403, { error: "Forbidden" });

      const login = typeof body.login === "string" ? body.login.trim().toLowerCase() : "";
      const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
      const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
      if (displayName.length < 2 || login.length < 3 || newPassword.length < 12) {
        return json(res, 400, { error: "Validation failed" });
      }
      if (state.items.some((i) => i.loginNormalized === login)) {
        return json(res, 409, { error: "LOGIN_CONFLICT" });
      }

      const delay = state.createDelayMs;
      const finish = () => {
        const id = `qa-admin-${state.nextId++}`;
        const item = {
          id,
          publicId: `RC-ADM-QA${state.nextId}`,
          displayName,
          staffRole: "ADMIN",
          accessState: "active",
          loginNormalized: login,
          credentialDisabledAt: null,
          isBlocked: false,
          createdAt: new Date().toISOString(),
        };
        state.items.push(item);
        json(res, 201, { item });
      };
      if (delay > 0) {
        setTimeout(finish, delay);
        return;
      }
      return finish();
    }

    const revokeMatch = path.match(/^\/api\/pro\/admin\/access\/users\/([\w-]+)\/revoke$/);
    if (revokeMatch && method === "POST") {
      const targetId = revokeMatch[1];
      pushLog({ method, path, kind: "revoke", targetId });
      if (state.mode === "unauth") return json(res, 401, { error: "Unauthorized" });
      if (!actorMayManageAccess()) return json(res, 403, { error: "Forbidden" });
      const idx = state.items.findIndex((i) => i.id === targetId);
      if (idx < 0) {
        // Idempotent soft revoke of already-missing/revoked
        return json(res, 200, {
          ok: true,
          idempotent: true,
          item: {
            id: targetId,
            publicId: "RC-GONE",
            displayName: "Уже отключён",
            staffRole: null,
            accessState: "revoked",
            loginNormalized: null,
            credentialDisabledAt: new Date().toISOString(),
            isBlocked: false,
            createdAt: "2026-10-01T00:00:00.000Z",
          },
        });
      }
      const row = state.items[idx];
      if (row.staffRole === "OWNER") {
        return json(res, 403, { error: "Cannot revoke OWNER" });
      }
      const already = row.accessState === "revoked";
      const item = {
        ...row,
        staffRole: null,
        accessState: "revoked",
        credentialDisabledAt: row.credentialDisabledAt ?? new Date().toISOString(),
      };
      state.items[idx] = item;
      return json(res, 200, { ok: true, idempotent: already, item });
    }

    // Harmless stubs for shell chrome that may probe notifications.
    if (path.startsWith("/api/pro/admin/notifications") && method === "GET") {
      return json(res, 200, path.endsWith("/unread-count") ? { count: 0 } : { items: [], total: 0 });
    }

    pushLog({ method, path, kind: "unhandled" });
    return json(res, 404, { error: "not_found", path });
  });

  return server;
}

export function startUpstream(port = PORT) {
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

const isMain =
  process.argv[1] &&
  import.meta.url === new URL(process.argv[1], "file:").href;

if (isMain) {
  startUpstream().then(({ baseUrl }) => {
    console.log(`admin-access-users upstream listening on ${baseUrl}`);
  });
}
