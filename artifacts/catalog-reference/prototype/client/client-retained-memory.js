/* Demo-only session state (closure). Host may mirror via preview-memory — no new cookies/IDB. */
(function () {
  const store = {
    cookiePrefs: { necessary: true, analytics: false, marketing: false },
    cookieDraft: null,
    consents: { nav: true, buy: true, msg: true, mkt: false },
    consentLog: [{ id: 'log0', at: '2026-03-12T10:00:00', consent: 'nav', action: 'granted', note: 'Демо: при создании аккаунта' }],
    conciergeLog: [
      { id: 'cq1', date: '2026-11-06T10:00:00', what: 'Весь ремонт под ключ', status: 'in_progress', text: 'Квартира 62 м², комфорт' },
      { id: 'cq2', date: '2026-11-02T14:30:00', what: 'Проверка сметы', status: 'new', text: 'Сравнить 3 КП по электрике' },
      { id: 'cq3', date: '2026-10-20T09:00:00', what: 'Приёмка работ', status: 'done', text: 'Штукатурка, L2-8-1' },
    ],
    shares: {},
    partnerBranch: {},
    enquiries: {
      l1: {
        partner: 'p8',
        thread: [
          { side: 'client', text: 'Нужен монтаж до 25 ноября, ФМР.', at: '2026-11-03T11:00' },
          { side: 'partner', text: 'Можем выехать 18–19 ноября. Замер бесплатно.', at: '2026-11-04T09:30' },
        ],
      },
    },
    avatarDataUrl: null,
    avatarGen: 0,
    refJoinedCount: 3,
    demoDelegation: {},
    calcSelectedRecord: null,
  };

  const newToken = () => Math.random().toString(36).slice(2, 11);

  window.RCDemoMem = {
    get: () => store,
    setAvatar: (url) => { store.avatarDataUrl = url; store.avatarGen += 1; },
    clearAvatar: () => { store.avatarDataUrl = null; store.avatarGen += 1; },
    getAvatar: () => store.avatarDataUrl,
    avatarGen: () => store.avatarGen,
    beginCookieDraft: () => { store.cookieDraft = { ...store.cookiePrefs }; return store.cookieDraft; },
    getCookieDraft: () => store.cookieDraft || { ...store.cookiePrefs },
    discardCookieDraft: () => { store.cookieDraft = null; },
    commitCookieDraft: () => {
      if (!store.cookieDraft) return store.cookiePrefs;
      store.cookiePrefs = { ...store.cookieDraft, necessary: true };
      store.cookieDraft = null;
      return store.cookiePrefs;
    },
    draftCookieToggle: (key, value) => {
      if (!store.cookieDraft) store.cookieDraft = { ...store.cookiePrefs };
      store.cookieDraft[key] = value;
    },
    getConsents: () => ({ ...store.consents }),
    setConsent: (id, on, note) => {
      store.consents[id] = on;
      store.consentLog.push({ id: 'log' + Date.now(), at: new Date().toISOString(), consent: id, action: on ? 'granted' : 'withdrawn', note: note || 'Демо: изменение в сессии' });
    },
    consentLog: () => store.consentLog.slice(),
    branchKey: (id) => store.partnerBranch[id] || null,
    setBranch: (id, b) => { store.partnerBranch[id] = b; },
    cancelConcierge: (id) => {
      const r = store.conciergeLog.find((x) => x.id === id);
      if (r && r.status === 'new') r.status = 'cancelled';
    },
    addConcierge: (row) => store.conciergeLog.unshift(row),
    shareState: (pid) => store.shares[pid] || null,
    ensureShare: (pid, days = 14) => {
      let s = store.shares[pid];
      if (!s || s.revoked) {
        const exp = new Date();
        exp.setDate(exp.getDate() + days);
        s = { token: newToken(), expires: exp.toISOString(), revoked: false, expiryDays: days, projectId: pid };
        store.shares[pid] = s;
      }
      return s;
    },
    setShareExpiry: (pid, days) => {
      const s = store.shares[pid];
      if (!s || s.revoked) return null;
      const exp = new Date();
      exp.setDate(exp.getDate() + days);
      s.expires = exp.toISOString();
      s.expiryDays = days;
      return s;
    },
    revokeShare: (pid) => { if (store.shares[pid]) store.shares[pid].revoked = true; },
    regenerateShare: (pid, days = 14) => {
      const exp = new Date();
      exp.setDate(exp.getDate() + days);
      store.shares[pid] = { token: newToken(), expires: exp.toISOString(), revoked: false, expiryDays: days, projectId: pid };
      return store.shares[pid];
    },
    shareLink: (pid) => {
      const s = store.shares[pid];
      if (!s || s.revoked) return null;
      return `https://remcard.ru/shared/${pid}?t=${s.token}&demo=1`;
    },
    getDemoDelegation: (projectId) => (store.demoDelegation?.[projectId] ? JSON.parse(JSON.stringify(store.demoDelegation[projectId])) : null),
    setDemoDelegation: (projectId, state) => {
      if (!store.demoDelegation) store.demoDelegation = {};
      store.demoDelegation[projectId] = JSON.parse(JSON.stringify(state));
    },
    clearDemoDelegation: (projectId) => {
      if (store.demoDelegation) delete store.demoDelegation[projectId];
    },
    getSelectedRecord: () => (store.calcSelectedRecord ? { ...store.calcSelectedRecord } : null),
    setSelectedRecord: (payload) => {
      if (!payload || !payload.recordId) {
        store.calcSelectedRecord = null;
        return;
      }
      store.calcSelectedRecord = {
        recordId: String(payload.recordId),
        savedAt: payload.savedAt || new Date().toISOString(),
      };
    },
    clearSelectedRecord: () => {
      store.calcSelectedRecord = null;
    },
  };
})();
