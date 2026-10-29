#!/usr/bin/env node
/**
 * Isolated local staff upstream for Admin R1 UI QA.
 * Loopback only. No DB. No production proxy. No mutating writes applied.
 */
import http from "node:http";

const PORT = Number(process.env.ADMIN_R1_UPSTREAM_PORT || 3911);

const staffMe = {
  user: {
    id: "local-staff-admin",
    displayName: "Локальный администратор QA",
    role: "PRO",
    staffRole: "ADMIN",
  },
};

function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload),
    "cache-control": "no-store",
  });
  res.end(payload);
}

function pageItems(total, page, pageSize, factory) {
  const start = (page - 1) * pageSize;
  const count = Math.max(0, Math.min(pageSize, total - start));
  return Array.from({ length: count }, (_, i) => factory(start + i));
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://127.0.0.1:${PORT}`);
  const path = url.pathname;
  const method = (req.method || "GET").toUpperCase();

  // Block accidental external-looking hosts; this stub is loopback-only.
  if (method === "POST" && /\/(approve|reject)$/.test(path)) {
    // Accept mock moderation commands without mutating anything durable.
    return json(res, 200, { success: true, localStub: true });
  }

  if (path === "/api/auth/me" && method === "GET") {
    return json(res, 200, staffMe);
  }

  if (path === "/api/pro/admin/notifications/unread-count" && method === "GET") {
    return json(res, 200, { count: 0 });
  }

  if (path === "/api/pro/admin/notifications" && method === "GET") {
    return json(res, 200, { items: [], total: 0 });
  }

  if (path === "/api/pro/admin/analytics" && method === "GET") {
    return json(res, 200, {
      tab: "overview",
      period: url.searchParams.get("period") || "30d",
      visitors: { current: 120, previous: 100, changePercent: 20 },
      registrations: { current: 18, previous: 15, changePercent: 20 },
      requests: { current: 9, previous: 8, changePercent: 12.5 },
      conversionPercent: 15,
      visitsBySection: [],
      registrationsByDay: [],
      requestsByDay: [],
    });
  }

  if (path === "/api/pro/admin/results/summary" && method === "GET") {
    return json(res, 200, {
      periodDays: Number(url.searchParams.get("periodDays") || 30),
      certificatesIssued: 12,
      certificatesUsedFully: 2,
      ordersCount: 3,
      ordersSum: 45000,
      reviewsPublished: 5,
      reviewsPending: 2,
      averagePublishedRating: 4.6,
      definitions: {
        certificate: "Certificate",
        order: "Order",
        note: "Сводка по существующим моделям PROF",
      },
    });
  }

  if (path === "/api/pro/admin/results/remscore" && method === "GET") {
    const page = Math.max(1, Number(url.searchParams.get("page") || 1));
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize") || 40)));
    const total = 87;
    return json(res, 200, {
      total,
      page,
      pageSize,
      averageScore: 64,
      gradeBuckets: { A: 12, B: 40, C: 35 },
      items: pageItems(total, page, pageSize, (i) => ({
        id: `partner-${i}`,
        displayName: `Партнёр ${i + 1}`,
        city: "Краснодар",
        partnerKind: "specialist",
        partnerKindLabel: "Специалист",
        score: 90 - (i % 40),
        grade: i % 5 === 0 ? "A" : i % 3 === 0 ? "B+" : "C",
        avgRating: 4.2,
        reviewCount: 3 + (i % 4),
      })),
      definitions: {
        formula: "RemScore PROF",
        note: "Локальный stub",
      },
    });
  }

  if (path === "/api/pro/admin/certificates" && method === "GET") {
    const page = Math.max(1, Number(url.searchParams.get("page") || 1));
    const pageSize = Math.min(
      100,
      Math.max(1, Number(url.searchParams.get("limit") || url.searchParams.get("pageSize") || 40)),
    );
    const total = 55;
    return json(res, 200, {
      certificates: pageItems(total, page, pageSize, (i) => ({
        id: `cert-${i}`,
        status: "ACTIVE",
        createdAt: new Date(Date.now() - i * 86400000).toISOString(),
        proUser: { id: `partner-${i}`, displayName: `Исполнитель ${i + 1}`, name: `Исполнитель ${i + 1}` },
        clientUser: { displayName: `Клиент ${i + 1}` },
        orders: i % 2 === 0 ? [{ id: `order-${i}` }] : [],
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      periodDays: url.searchParams.get("periodDays")
        ? Number(url.searchParams.get("periodDays"))
        : null,
    });
  }

  if (path === "/api/pro/admin/deals" && method === "GET") {
    const page = Math.max(1, Number(url.searchParams.get("page") || 1));
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize") || 40)));
    const total = 48;
    return json(res, 200, {
      total,
      page,
      pageSize,
      sumAmount: 320000,
      items: pageItems(total, page, pageSize, (i) => ({
        id: `deal-${i}`,
        createdAt: new Date(Date.now() - i * 3600000).toISOString(),
        totalAmount: 5000 + i * 100,
        discountAmount: 0,
        proBonus: 100,
        status: "COMPLETED",
        isSelfScan: false,
        flagged: false,
        certificateId: `cert-${i}`,
        issuer: { id: `partner-${i}`, displayName: `Исполнитель ${i + 1}`, partnerKindLabel: "Специалист" },
        store: { id: `store-${i}`, displayName: `Магазин ${i + 1}`, partnerKindLabel: "Магазин" },
      })),
      definitions: { entity: "Order", note: "Сделки = заказы по сертификатам" },
    });
  }

  if (path === "/api/pro/admin/moderation/reviews" && method === "GET") {
    const page = Math.max(1, Number(url.searchParams.get("page") || 1));
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize") || 25)));
    const total = 2;
    return json(res, 200, {
      total,
      page,
      pageSize,
      counts: { pending: 2, published: 4, rejected: 1 },
      reviews: pageItems(total, page, pageSize, (i) => ({
        id: `review-${i}`,
        rating: 5 - (i % 2),
        text: i === 0 ? "Искусственный отзыв для локальной проверки" : "Второй stub-отзыв",
        status: "PENDING",
        createdAt: new Date().toISOString(),
        author: { id: `client-${i}`, displayName: `Клиент ${i + 1}` },
        partner: { id: `partner-${i}`, displayName: `Партнёр ${i + 1}` },
      })),
    });
  }

  if (path === "/api/pro/admin/clients" && method === "GET") {
    const page = Math.max(1, Number(url.searchParams.get("page") || 1));
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize") || 25)));
    const total = 63;
    return json(res, 200, {
      total,
      page,
      pageSize,
      items: pageItems(total, page, pageSize, (i) => ({
        id: `client-${i}`,
        publicId: `C${1000 + i}`,
        displayName: `Клиент ${i + 1}`,
        city: "Краснодар",
        createdAt: new Date(Date.now() - i * 86400000).toISOString(),
        lastActiveAt: null,
        referredByPartner: null,
        consentPersonalData: true,
        archived: false,
      })),
      definitions: { source: "User CLIENT", note: "Клиенты PROF" },
    });
  }

  if (path === "/api/pro/admin/team" && method === "GET") {
    return json(res, 200, {
      members: [
        {
          id: "local-staff-admin",
          publicId: "S1",
          displayName: "Локальный администратор QA",
          staffRole: "ADMIN",
          staffPosition: "Оператор",
          createdAt: new Date().toISOString(),
        },
      ],
    });
  }

  if (path === "/api/pro/admin/journal" && method === "GET") {
    const page = Math.max(1, Number(url.searchParams.get("page") || 1));
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize") || 40)));
    const total = 12;
    return json(res, 200, {
      total,
      page,
      pageSize,
      items: pageItems(total, page, pageSize, (i) => ({
        id: `audit-${i}`,
        createdAt: new Date(Date.now() - i * 7200000).toISOString(),
        action: "ADMIN_VIEW",
        actorDisplayName: "Локальный администратор QA",
        targetUserId: null,
      })),
      definitions: { source: "AuditLog", note: "Журнал действий" },
    });
  }

  if (path === "/api/pro/admin/management/overview" && method === "GET") {
    const period = url.searchParams.get("period") || "7d";
    return json(res, 200, {
      generatedAt: new Date().toISOString(),
      timezone: "Europe/Moscow",
      period,
      periodLabel: period === "1d" ? "Сегодня" : period === "30d" ? "30 дней" : "7 дней",
      definitions: { note: "Локальный stub обзора" },
      partners: {
        liveRegistered: 42,
        demoRegistered: 3,
        visibleInCatalog: 28,
        catalogCardSurfaces: 31,
      },
      registrationsCompleted: {
        today: { current: 1, comparisonNote: null },
        days7: { current: 5, comparisonNote: "+1 к прошлой неделе" },
        days30: { current: 18, comparisonNote: null },
        byKindInPeriod: { agent: 1, specialist: 3, store: 1, company: 0 },
        seriesDaily: [],
        selectedPeriod: { current: 5, comparisonNote: "+1 к прошлой неделе" },
        selectedPeriodLabel: "За 7 дней",
      },
      activitySeriesDaily: [],
      clients: {
        accountedTotal: 120,
        createdInPeriod: { current: 8, comparisonNote: null },
        historicalDemoWarning: "Демо-клиенты исключены",
      },
      moderation: {
        pendingPartners: 2,
        oldestPendingPartnerAt: null,
        pendingReviews: 2,
      },
      leadsAndRequests: { leadsOpen: 0, leadsNew: 0, requestsToday: 0 },
      activity: {
        profPartnerProfilesUsed: {
          collectionStartedAt: null,
          distinctInPeriod: 11,
          coverageNote: "Локальный stub",
        },
        publicSiteAuthenticatedPartners: {
          distinctInPeriod: null,
          coverageNote: "Недоступно в stub",
        },
        publicPartnerCardViews: { viewsInPeriod: 0, coverageNote: "Недоступно в stub" },
      },
      incompleteLiveRegistration: {
        available: false,
        count: null,
        note: "Недоступно в stub",
      },
    });
  }

  // Partners registry and other GETs: empty safe list payload.
  if (path.startsWith("/api/pro/admin/") && method === "GET") {
    return json(res, 200, {
      items: [],
      partners: [],
      total: 0,
      page: 1,
      pageSize: 40,
      facets: {
        matchedTotal: 0,
        partnerKind: {
          all: 0,
          agent: 0,
          specialist: 0,
          store: 0,
          company: 0,
          unknown: 0,
          facetRule: "stub",
        },
        registration: { active: 0, demo: 0, facetRule: "stub" },
        catalog: { visible: 0, hidden: 0, notPublic: 0, facetRule: "stub" },
        archive: { archived: 0, notArchived: 0, facetRule: "stub" },
      },
    });
  }

  return json(res, 404, { error: `local stub miss: ${method} ${path}` });
});

server.listen(PORT, "127.0.0.1", () => {
  process.stdout.write(`admin-r1-local-staff-upstream listening on 127.0.0.1:${PORT}\n`);
});
