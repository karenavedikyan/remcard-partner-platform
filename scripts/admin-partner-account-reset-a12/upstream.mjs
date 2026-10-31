#!/usr/bin/env node
/**
 * Synthetic upstream for A12 admin partner account-delete UI capture.
 * Loopback only — no production data.
 */
import http from "node:http";
import { createHmac } from "node:crypto";

const PORT = Number(process.env.ADMIN_A12_UPSTREAM_PORT || 3922);
const JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret-at-least-16-chars";

const partners = [
  {
    id: "P-A12-1",
    publicId: "RC-A12DEMO",
    displayName: "Синтетический партнёр A12",
    partnerType: "STORE",
    partnerKind: "store",
    city: "Краснодар",
    registrationLabel: "ACTIVE",
    catalogVisibility: "VISIBLE",
    partnerSearchVisibility: "AUTO",
    lifecycle: { projectArchivedAt: null, catalogHiddenAt: null },
    partnershipCounts: { total: 2, active: 1, invited: 0, pending: 0, paused: 0, ended: 1 },
    publicCatalogLinks: [{ label: "Карточка партнёра", path: "/p/a12" }],
  },
  {
    id: "P-A12-2",
    publicId: "RC-A12ARCH",
    displayName: "Архивный синтетик",
    partnerType: "MASTER",
    partnerKind: "specialist",
    city: "Сочи",
    registrationLabel: "DEMO",
    catalogVisibility: "ARCHIVED",
    partnerSearchVisibility: "HIDDEN",
    lifecycle: { projectArchivedAt: "2026-01-01T00:00:00.000Z", catalogHiddenAt: "2026-01-01T00:00:00.000Z" },
    partnershipCounts: { total: 0, active: 0, invited: 0, pending: 0, paused: 0, ended: 0 },
    publicCatalogLinks: [],
  },
];

const deleted = new Set();
const tokens = new Map();

function json(res, status, body) {
  const raw = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "content-type,x-csrf-token,cookie",
    "access-control-allow-methods": "GET,POST,OPTIONS",
  });
  res.end(raw);
}

function issueToken(partnerId, reason) {
  const payload = Buffer.from(
    JSON.stringify({
      kind: "account_delete",
      partnerId,
      reason,
      exp: Date.now() + 15 * 60_000,
    }),
  ).toString("base64url");
  const sig = createHmac("sha256", JWT_SECRET).update(payload).digest("base64url");
  const token = `${payload}.${sig}`;
  tokens.set(token, { partnerId, reason, used: false });
  return token;
}

const server = http.createServer((req, res) => {
  if (req.method === "OPTIONS") return json(res, 204, {});
  const url = new URL(req.url || "/", `http://127.0.0.1:${PORT}`);
  const path = url.pathname;

  if (path === "/api/auth/me" && req.method === "GET") {
    const cookie = req.headers.cookie || "";
    if (!cookie.includes("remcard-token=")) {
      return json(res, 401, { error: "UNAUTHORIZED" });
    }
    return json(res, 200, {
      user: {
        id: "qa-a12-admin",
        publicId: "RC-A12ADM",
        displayName: "A12 Synthetic Admin",
        role: "CLIENT",
        staffRole: "ADMIN",
      },
    });
  }

  if (path === "/api/csrf" && req.method === "GET") {
    return json(res, 200, { ok: true });
  }

  if (path === "/api/pro/admin/partners/registry" && req.method === "GET") {
    const items = partners.filter((p) => !deleted.has(p.id));
    return json(res, 200, {
      items,
      total: items.length,
      nextCursor: null,
      facets: {
        matchedTotal: items.length,
        partnerKind: {
          all: items.length,
          agent: 0,
          specialist: items.filter((p) => p.partnerKind === "specialist").length,
          store: items.filter((p) => p.partnerKind === "store").length,
          company: 0,
          unknown: 0,
          facetRule: "synthetic",
        },
        registration: {
          active: items.filter((p) => p.registrationLabel === "ACTIVE").length,
          demo: items.filter((p) => p.registrationLabel === "DEMO").length,
          facetRule: "synthetic",
        },
        catalog: { visible: 1, hidden: 0, notPublic: 0, facetRule: "synthetic" },
        archive: {
          archived: items.filter((p) => p.lifecycle?.projectArchivedAt).length,
          notArchived: items.filter((p) => !p.lifecycle?.projectArchivedAt).length,
          facetRule: "synthetic",
        },
      },
    });
  }

  const lifecyclePreview = path.match(/^\/api\/pro\/admin\/partners\/([^/]+)\/lifecycle\/preview$/);
  if (lifecyclePreview && req.method === "GET") {
    const id = lifecyclePreview[1];
    const action = url.searchParams.get("action") || "archive_project";
    return json(res, 200, {
      preview: {
        displayName: partners.find((p) => p.id === id)?.displayName || id,
        effects: [`Синтетический эффект ${action}`],
        warnings: [],
        confirmToken: `life:${id}:${action}`,
      },
    });
  }

  const lifecycleApply = path.match(/^\/api\/pro\/admin\/partners\/([^/]+)\/lifecycle$/);
  if (lifecycleApply && req.method === "POST") {
    return json(res, 200, { ok: true });
  }

  const delPreview = path.match(/^\/api\/pro\/admin\/partners\/([^/]+)\/account-delete\/preview$/);
  if (delPreview && req.method === "POST") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const parsed = JSON.parse(body || "{}");
      const id = delPreview[1];
      const partner = partners.find((p) => p.id === id);
      if (!partner || deleted.has(id)) return json(res, 404, { error: "Партнёр не найден" });
      const reason = String(parsed.reason || "");
      if (reason.trim().length < 3) {
        return json(res, 400, { error: "Укажите причину удаления аккаунта (минимум 3 символа)" });
      }
      return json(res, 200, {
        preview: {
          publicId: partner.publicId,
          displayName: partner.displayName,
          partnerType: partner.partnerType,
          effects: [
            "Старый аккаунт будет закрыт, данные профиля обезличены, привязки входа освобождены.",
            "При следующем входе через прежний сервис человек сможет зарегистрироваться заново.",
            "Новый аккаунт не получит старые партнёрства, историю, роли и бонусы.",
          ],
          warnings: [
            "Это общая учётная запись: удаление затрагивает всю учётную запись, включая клиентский кабинет, если он есть.",
          ],
          loginServices: ["MAX", "Telegram"],
          counts: { partnerships: 2, orders: 1, certificates: 0, settlements: 1 },
          hasClientCabinet: true,
          confirmToken: issueToken(id, reason.trim()),
        },
      });
    });
    return;
  }

  const delApply = path.match(/^\/api\/pro\/admin\/partners\/([^/]+)\/account-delete$/);
  if (delApply && req.method === "POST") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const parsed = JSON.parse(body || "{}");
      const id = delApply[1];
      const partner = partners.find((p) => p.id === id);
      if (!partner) return json(res, 404, { error: "Партнёр не найден" });
      if (String(parsed.publicIdConfirm || "") !== partner.publicId) {
        return json(res, 400, { error: "Публичный ID не совпадает — удаление не выполнено" });
      }
      const tok = tokens.get(String(parsed.confirmToken || ""));
      if (!tok || tok.used || tok.partnerId !== id) {
        return json(res, 409, {
          error: "Подтверждение устарело или не совпадает с просмотром. Запросите последствия заново.",
        });
      }
      tok.used = true;
      deleted.add(id);
      return json(res, 200, {
        ok: true,
        message:
          "Аккаунт удалён. Партнёр может зарегистрироваться заново через прежний сервис входа. Новый аккаунт не связан со старой историей.",
      });
    });
    return;
  }

  return json(res, 404, { message: `stub miss ${req.method} ${path}` });
});

server.listen(PORT, "127.0.0.1", () => {
  process.stdout.write(`a12-account-reset-upstream on 127.0.0.1:${PORT}\n`);
});
