/* Unified «Мои проекты» — saved calculations (estimate + 20 materials). Browser/rcDemoMemory only. */
(function () {
  const { esc, fmt, money, moneyShort, qs, qsa, go, icon, state, toast, route, renderApp, uid, modal, modalHead, closeModal, activeProject } = window.RC;

  function pageLocation() {
    if (typeof location !== 'undefined') return location;
    if (typeof window !== 'undefined' && window.location) return window.location;
    return null;
  }

  function currentHashParams() {
    if (window.RC && typeof window.RC.parseHash === 'function') return window.RC.parseHash();
    const loc = pageLocation();
    if (!loc || typeof URLSearchParams === 'undefined') return { path: '/', params: {} };
    const h = loc.hash.replace(/^#/, '') || '/';
    const [path, query = ''] = h.split('?');
    return { path, params: Object.fromEntries(new URLSearchParams(query)) };
  }

  const CALC_LS = 'rc_project_calcs_v1';
  const CALC_FORMAT_V = 1;

  let fallbackCalcSessionRecord = null;
  function calcSessionStore() {
    const mem = window.RCDemoMem;
    if (mem && typeof mem.getSelectedRecord === 'function' && typeof mem.setSelectedRecord === 'function') return mem;
    return {
      getSelectedRecord: () => (fallbackCalcSessionRecord ? { ...fallbackCalcSessionRecord } : null),
      setSelectedRecord: (payload) => {
        if (!payload || !payload.recordId) fallbackCalcSessionRecord = null;
        else {
          fallbackCalcSessionRecord = {
            recordId: String(payload.recordId),
            savedAt: payload.savedAt || new Date().toISOString(),
          };
        }
      },
    };
  }

  let calcStorageMode = 'persistent';
  let calcReadonly = false;
  let calcRawPreserved = null;
  let sessionRecordsBuf = null;

  state.calcRecords = state.calcRecords || [];
  state.activeCalcRecordByType = state.activeCalcRecordByType || {};
  state.activeCalcRecordId = state.activeCalcRecordId || null;
  state.calcViewFrozen = state.calcViewFrozen || false;

  let calcReadFailed = false;

  function safeId(raw, max = 80) {
    if (raw == null || raw === '') return null;
    if (typeof raw !== 'string' && typeof raw !== 'number') return null;
    const s = String(raw).trim().slice(0, max);
    if (!s || !/^[a-zA-Z0-9_-]+$/.test(s)) return null;
    return s;
  }

  function safeProjectId(raw) {
    if (raw == null || raw === '') return null;
    return safeId(raw);
  }

  function projectWritable(projectId) {
    if (!projectId) return true;
    const p = state.projects.find((x) => x.id === projectId);
    if (!p) return false;
    if (p.shared) return false;
    return true;
  }

  function isSharedProjectBinding(rec) {
    if (!rec || !rec.projectId) return false;
    const pid = safeProjectId(rec.projectId);
    if (!pid) return false;
    const p = state.projects.find((x) => x.id === pid);
    return !!(p && p.shared);
  }

  function isOrphanProjectBinding(rec) {
    if (!rec || !rec.projectId) return false;
    const pid = safeProjectId(rec.projectId);
    if (!pid) return false;
    return !state.projects.some((p) => p.id === pid);
  }

  function recordEditBlocked(rec) {
    return !!(rec && (recordPayloadLocked(rec) || isOrphanProjectBinding(rec) || isSharedProjectBinding(rec)));
  }

  function defaultProjectForNewRecord() {
    const p = activeProject();
    if (!p || p.shared) return null;
    return p.id;
  }

  function activeIdForType(calcType) {
    return state.activeCalcRecordByType[calcType] || null;
  }

  function setActiveForType(rec, opts = {}) {
    if (!rec) return;
    state.activeCalcRecordByType[rec.calcType] = rec.id;
    state.activeCalcRecordId = rec.id;
    if (!opts.skipHistoryTouch) touchHistoryAfterRecordWrite(rec);
  }

  function calcHistoryUrl(hash) {
    const h = hash && hash.startsWith('#') ? hash : `#${hash || '/'}`;
    const loc = pageLocation();
    if (!loc) return h;
    try {
      const base = `${loc.origin || 'http://127.0.0.1'}${loc.pathname || '/'}${loc.search || ''}`;
      return new URL(h, base).href;
    } catch (e) {
      return `${loc.origin || 'http://127.0.0.1/'}${loc.search || ''}${h}`;
    }
  }

  function mergeHistoryState(recordId) {
    const hist = historyApi();
    const prev = hist && hist.state && typeof hist.state === 'object' ? { ...hist.state } : {};
    if (recordId) prev.rcCalcRecordId = recordId;
    return prev;
  }

  function historyApi() {
    return typeof history !== 'undefined' ? history : null;
  }

  function readCalcHistoryRecordId() {
    const h = historyApi();
    if (!h) return null;
    const st = h.state;
    if (st && typeof st === 'object' && st.rcCalcRecordId) return safeId(st.rcCalcRecordId);
    return null;
  }

  function syncCalcSessionRecord(recordId) {
    if (!recordId) return;
    try {
      calcSessionStore().setSelectedRecord({ recordId, savedAt: new Date().toISOString() });
    } catch (e) { /* ignore */ }
  }

  function stampCurrentHistoryRecord(recordId) {
    const id = safeId(recordId);
    const h = historyApi();
    if (!id || !h) return;
    try {
      const loc = pageLocation();
      h.replaceState(mergeHistoryState(id), '', calcHistoryUrl(loc?.hash || '#/'));
    } catch (e) { /* ignore */ }
  }

  function syncSessionToResolvedRouteRecord() {
    const { path, params } = currentHashParams();
    if (path.startsWith('/calc/materials/') && path !== '/calc/materials') {
      const parts = path.split('/').filter(Boolean);
      const matId = parts[parts.length - 1];
      const rid = resolveMaterialRecordId(matId, params);
      if (rid) syncCalcSessionRecord(rid);
      return;
    }
    if (path === '/calc' || path === '/estimate') {
      const rid = resolveEstimateRecordId(params);
      if (rid) syncCalcSessionRecord(rid);
    }
  }

  function touchHistoryAfterRecordWrite(rec) {
    if (!rec || !rec.id || !historyApi() || !pageLocation()) return;
    const { path, params } = currentHashParams();
    if (rec.calcType.startsWith('material-')) {
      const matId = rec.calcType.replace(/^material-/, '');
      const rid = params.record ? safeId(params.record) : null;
      if (path === `/calc/materials/${matId}` && (!rid || rid === rec.id)) {
        stampCurrentHistoryRecord(rec.id);
        syncCalcSessionRecord(rec.id);
      }
    } else if (rec.calcType === 'estimate-total') {
      const rid = params.record ? safeId(params.record) : null;
      if ((path === '/calc' || path === '/estimate') && (!rid || rid === rec.id)) {
        stampCurrentHistoryRecord(rec.id);
        syncCalcSessionRecord(rec.id);
      }
    }
  }

  function calcNavigate(hash, recordId) {
    const h = hash.startsWith('#') ? hash : `#${hash}`;
    const hist = historyApi();
    const url = calcHistoryUrl(h);
    try {
      if (!hist) {
        go(h);
        return;
      }
      const loc = pageLocation();
      if (loc && loc.hash === h) {
        hist.replaceState(recordId ? mergeHistoryState(recordId) : mergeHistoryState(null), '', url);
      } else {
        hist.pushState(recordId ? mergeHistoryState(recordId) : {}, '', url);
      }
    } catch (e) {
      go(h);
      return;
    }
    renderApp();
  }

  function resolveEstimateRecordId(params = {}) {
    const calcType = 'estimate-total';
    const fromQuery = params.record ? safeId(params.record) : null;
    if (fromQuery) {
      const rec = findRecord(fromQuery);
      if (rec && rec.calcType === calcType) return fromQuery;
    }
    const fromHist = readCalcHistoryRecordId();
    if (fromHist) {
      const rec = findRecord(fromHist);
      if (rec && rec.calcType === calcType) return fromHist;
    }
    if (isForceNewCalcType(calcType)) return null;
    const id = activeIdForType(calcType);
    if (!id) return null;
    const rec = findRecord(id);
    if (rec && rec.calcType === calcType) return id;
    return null;
  }

  function wrongTypeRecordParam(calcType, params) {
    const fromQuery = params.record ? safeId(params.record) : null;
    if (!fromQuery) return false;
    const rec = findRecord(fromQuery);
    return !!(rec && rec.calcType !== calcType);
  }

  function resolveMaterialRecordId(calcId, params) {
    const calcType = `material-${calcId}`;
    const fromQuery = params.record ? safeId(params.record) : null;
    if (fromQuery) {
      const rec = findRecord(fromQuery);
      if (rec && rec.calcType === calcType) return fromQuery;
    }
    const fromHist = readCalcHistoryRecordId();
    if (fromHist) {
      const rec = findRecord(fromHist);
      if (rec && rec.calcType === calcType) return fromHist;
    }
    if (isForceNewCalcType(calcType)) return null;
    const id = activeIdForType(calcType);
    if (!id) return null;
    const rec = findRecord(id);
    if (rec && rec.calcType === calcType) return id;
    return null;
  }

  function previewMemoryStore() {
    const bag = window.rcDemoMemory;
    if (!bag || typeof bag !== 'object') return null;
    if (typeof bag.getItem === 'function' && typeof bag.setItem === 'function') return bag;
    return null;
  }

  function isRcDemoMemoryHost() {
    return previewMemoryStore() !== null;
  }

  function detectStorageBackend() {
    if (previewMemoryStore()) return 'preview-memory';
    try {
      const probe = '__rc_calc_probe__';
      rcDemoMemory.setItem(probe, '1');
      const ok = rcDemoMemory.getItem(probe) === '1';
      rcDemoMemory.removeItem(probe);
      return ok ? 'persistent' : 'preview-memory';
    } catch (e) {
      return 'denied';
    }
  }

  function readRawText() {
    const preview = previewMemoryStore();
    if (preview) {
      try {
        return preview.getItem(CALC_LS);
      } catch (e) {
        calcReadFailed = true;
        return null;
      }
    }
    try {
      return rcDemoMemory.getItem(CALC_LS);
    } catch (e) {
      calcReadFailed = true;
      return null;
    }
  }

  function writeRawText(text) {
    if (calcReadonly) return false;
    if (calcReadFailed) {
      sessionRecordsBuf = text;
      calcStorageMode = 'session';
      return true;
    }
    if (calcStorageMode === 'session') {
      sessionRecordsBuf = text;
      return true;
    }
    const preview = previewMemoryStore();
    if (preview) {
      try {
        preview.setItem(CALC_LS, text);
        return true;
      } catch (e) {
        calcStorageMode = 'session';
        sessionRecordsBuf = text;
        toast('Память браузера недоступна — расчёты только до перезагрузки вкладки');
        return true;
      }
    }
    try {
      rcDemoMemory.setItem(CALC_LS, text);
      return true;
    } catch (e) {
      calcStorageMode = 'session';
      sessionRecordsBuf = text;
      toast('Память браузера недоступна — расчёты только до перезагрузки вкладки');
      return true;
    }
  }

  function formatVersionLabel(v) {
    if (typeof v === 'number' && Number.isFinite(v)) return String(Math.trunc(v));
    if (typeof v === 'string') return v.trim().slice(0, 32) || '?';
    return '?';
  }

  function coerceRecord(row) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) return null;
    const id = safeId(row.id);
    const calcType = typeof row.calcType === 'string' && row.calcType.length <= 64 ? row.calcType : null;
    if (!id || !calcType) return null;
    if (row.formatVersion != null && row.formatVersion !== CALC_FORMAT_V) return null;
    let projectId = null;
    if (row.projectId != null && row.projectId !== '') {
      projectId = safeProjectId(row.projectId);
      if (projectId === null) return null;
    }
    const displayName = typeof row.displayName === 'string' ? row.displayName.slice(0, 120) : defaultName(calcType);
    const inputs = row.inputs && typeof row.inputs === 'object' && !Array.isArray(row.inputs) ? row.inputs : {};
    const savedAt = typeof row.savedAt === 'string' ? row.savedAt : new Date().toISOString();
    const rec = {
      id,
      calcType,
      displayName,
      projectId,
      inputs: JSON.parse(JSON.stringify(inputs)),
      resultSnapshot: row.resultSnapshot != null ? JSON.parse(JSON.stringify(row.resultSnapshot)) : null,
      formatVersion: CALC_FORMAT_V,
      savedAt,
      navPlace: row.navPlace && typeof row.navPlace === 'object' ? { ...row.navPlace } : null,
      incomplete: row.incomplete !== false,
      meta: row.meta && typeof row.meta === 'object' ? JSON.parse(JSON.stringify(row.meta)) : {},
    };
    return stampRecordTypedValidity(rec);
  }

  function isPrimNum(v) {
    return typeof v === 'number' && Number.isFinite(v);
  }

  function validateEstimateSnapshotTyped(snap) {
    if (snap == null) return true;
    if (typeof snap !== 'object' || Array.isArray(snap)) return false;
    for (const key of ['renovation', 'total', 'min', 'max', 'turnkey', 'works', 'materials', 'perM2']) {
      if (snap[key] != null && !isPrimNum(snap[key])) return false;
    }
    if (Array.isArray(snap.comparison)) {
      for (const row of snap.comparison) {
        if (!row || typeof row !== 'object') return false;
        if (row.id != null && typeof row.id !== 'string') return false;
        if (row.label != null && typeof row.label !== 'string' && typeof row.label !== 'number') return false;
        if (row.total != null && !isPrimNum(row.total)) return false;
        if (row.perM2 != null && !isPrimNum(row.perM2)) return false;
        if (row.days != null && !isPrimNum(row.days)) return false;
      }
    }
    return true;
  }

  function validateEstimateRecordTyped(rec) {
    if (!rec || rec.calcType !== 'estimate-total') return { valid: false, reason: 'calcType' };
    const inputs = rec.inputs;
    if (!inputs || typeof inputs !== 'object' || Array.isArray(inputs)) return { valid: false, reason: 'inputs' };
    for (const key of ['area', 'rooms', 'plot']) {
      if (!(key in inputs)) continue;
      const raw = inputs[key];
      if (raw === '' || raw === null) continue;
      if (isPrimNum(raw)) continue;
      if (typeof raw === 'string') {
        const t = raw.trim();
        if (t === '') continue;
        const n = parseFloat(t.replace(',', '.'));
        if (isPrimNum(n)) continue;
      }
      if (typeof raw === 'object') return { valid: false, reason: `inputs.${key}` };
    }
    if (rec.resultSnapshot && !validateEstimateSnapshotTyped(rec.resultSnapshot)) {
      return { valid: false, reason: 'resultSnapshot' };
    }
    return { valid: true };
  }

  function stampRecordTypedValidity(rec) {
    if (!rec) return rec;
    let v = { valid: true };
    if (rec.calcType === 'estimate-total') v = validateEstimateRecordTyped(rec);
    else if (rec.calcType.startsWith('material-')) v = window.RCMatCalc?.validateStoredRecord?.(rec) ?? { valid: true };
    else v = { valid: true };
    rec.dataTypedInvalid = !v.valid;
    rec.dataTypedInvalidReason = v.reason || null;
    return rec;
  }

  function recordPayloadLocked(rec) {
    return !!(rec && rec.dataTypedInvalid);
  }

  function revalidateRecordTyping() {
    state.calcRecords.forEach(stampRecordTypedValidity);
  }

  function parseEnvelope(text) {
    if (text == null || text === '') return { records: [], writable: true };
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      return { records: [], writable: false, preserved: text };
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { records: [], writable: false, preserved: text };
    }
    if (parsed.v !== CALC_FORMAT_V) {
      return { records: [], writable: false, preserved: text, reason: `v${formatVersionLabel(parsed.v)}` };
    }
    if (typeof parsed.v === 'object') {
      return { records: [], writable: false, preserved: text };
    }
    if (!Array.isArray(parsed.records)) return { records: [], writable: false, preserved: text };
    const records = [];
    for (const row of parsed.records) {
      const r = coerceRecord(row);
      if (!r) return { records: [], writable: false, preserved: text };
      records.push(r);
    }
    return { records, writable: true };
  }

  function loadCalcRecords() {
    calcReadonly = false;
    calcRawPreserved = null;
    calcReadFailed = false;
    state.activeCalcRecordByType = {};
    const backend = detectStorageBackend();
    let text = readRawText();
    if (backend === 'denied' && sessionRecordsBuf) text = sessionRecordsBuf;
    const parsed = parseEnvelope(text);
    if (!parsed.writable) {
      calcReadonly = true;
      calcRawPreserved = parsed.preserved;
      state.calcRecords = [];
      calcStorageMode = 'readonly';
      return;
    }
    state.calcRecords = parsed.records;
    parsed.records.forEach((r) => {
      const cur = state.activeCalcRecordByType[r.calcType];
      if (!cur) {
        state.activeCalcRecordByType[r.calcType] = r.id;
        return;
      }
      const prev = parsed.records.find((x) => x.id === cur);
      if (!prev || new Date(r.savedAt) >= new Date(prev.savedAt)) {
        state.activeCalcRecordByType[r.calcType] = r.id;
      }
    });
    if (isRcDemoMemoryHost() || backend === 'preview-memory') calcStorageMode = 'preview-memory';
    else if (backend === 'denied') calcStorageMode = 'session';
    else calcStorageMode = 'persistent';
  }

  function persistCalcRecords() {
    if (calcReadonly) {
      toast('Расчёты только для чтения');
      return false;
    }
    const payload = JSON.stringify({ v: CALC_FORMAT_V, records: state.calcRecords });
    return writeRawText(payload);
  }

  function storageNotice() {
    if (calcReadonly) return 'Сохранённые расчёты не читаются — исходный блок сохранён, правки заблокированы.';
    if (isRcDemoMemoryHost() || calcStorageMode === 'preview-memory') {
      return 'Режим предпросмотра: расчёты в памяти вкладки (rcDemoMemory); после перезагрузки страницы пропадут.';
    }
    if (calcStorageMode === 'session') return 'Память браузера недоступна — расчёты только до перезагрузки вкладки.';
    return 'Только в этом браузере. Синхронизация с аккаунтом не выполняется.';
  }

  function ensureWritable() {
    if (calcReadonly) {
      toast('Расчёты только для чтения');
      return false;
    }
    return true;
  }

  function defaultName(calcType) {
    if (calcType === 'estimate-total') return 'Расчёт всего объекта';
    const id = calcType.replace(/^material-/, '');
    const c = window.RCMatCalc && window.RCMatCalc.calc ? window.RCMatCalc.calc(id) : null;
    return c ? c.title : `Калькулятор ${id}`;
  }

  function calcTypeLabel(calcType) {
    return defaultName(calcType);
  }

  function projectLabel(projectId) {
    if (!projectId) return 'Без проекта';
    const p = state.projects.find((x) => x.id === projectId);
    return p ? p.name : 'Проект (не найден)';
  }

  function findRecord(id) {
    return state.calcRecords.find((r) => r.id === id) || null;
  }

  function upsertRecord(patch) {
    if (!ensureWritable()) return null;
    if (!patch.calcType) return null;
    const now = new Date().toISOString();
    const forceNewType = isForceNewCalcType(patch.calcType);
    const typeActive = forceNewType ? null : activeIdForType(patch.calcType);
    if (patch.id) {
      const byId = findRecord(patch.id);
      if (byId && recordPayloadLocked(byId)) return null;
    }
    let rec = patch.id ? findRecord(patch.id) : null;
    if (rec && rec.calcType !== patch.calcType) rec = null;
    if (!rec && typeActive) rec = findRecord(typeActive);
    if (rec && rec.calcType !== patch.calcType) rec = null;
    if (rec && rec.projectId && !projectWritable(rec.projectId)) return null;
    if (rec && recordPayloadLocked(rec)) return null;
    if (!rec) {
      let projectId = null;
      if (patch.projectId !== undefined) {
        if (patch.projectId === null || patch.projectId === '') projectId = null;
        else {
          projectId = safeProjectId(patch.projectId);
          if (!projectId || !projectWritable(projectId)) return null;
        }
      } else if (state._draftProjectHint) {
        const pid = safeProjectId(state._draftProjectHint);
        projectId = pid && projectWritable(pid) ? pid : defaultProjectForNewRecord();
      } else {
        projectId = defaultProjectForNewRecord();
      }
      rec = {
        id: uid(),
        calcType: patch.calcType,
        displayName: patch.displayName || defaultName(patch.calcType),
        projectId,
        inputs: {},
        resultSnapshot: null,
        formatVersion: CALC_FORMAT_V,
        savedAt: now,
        navPlace: null,
        incomplete: true,
        meta: {},
      };
      state.calcRecords.unshift(rec);
    }
    if (patch.displayName != null) rec.displayName = String(patch.displayName).slice(0, 120);
    if (patch.projectId !== undefined) {
      if (patch.projectId === null || patch.projectId === '') rec.projectId = null;
      else {
        const pid = safeProjectId(patch.projectId);
        if (!pid || !projectWritable(pid)) return null;
        rec.projectId = pid;
      }
    }
    if (patch.inputs) rec.inputs = { ...rec.inputs, ...patch.inputs };
    if (patch.resultSnapshot !== undefined) rec.resultSnapshot = patch.resultSnapshot;
    if (patch.navPlace !== undefined) rec.navPlace = patch.navPlace;
    if (patch.incomplete !== undefined) rec.incomplete = patch.incomplete;
    if (patch.meta) rec.meta = JSON.parse(JSON.stringify({ ...(rec.meta || {}), ...patch.meta }));
    rec.savedAt = now;
    stampRecordTypedValidity(rec);
    setActiveForType(rec);
    if (state._forceNewCalcSession) {
      state._draftSessionTypes = state._draftSessionTypes || {};
      state._draftSessionTypes[patch.calcType] = true;
    }
    persistCalcRecords();
    touchHistoryAfterRecordWrite(rec);
    return rec;
  }

  function copyRecord(id) {
    if (!ensureWritable()) return null;
    const src = findRecord(id);
    if (!src) return null;
    if (recordPayloadLocked(src)) return null;
    const rec = {
      ...JSON.parse(JSON.stringify(src)),
      id: uid(),
      displayName: `${src.displayName} (копия)`.slice(0, 120),
      savedAt: new Date().toISOString(),
    };
    if (isOrphanProjectBinding(src) || isSharedProjectBinding(src)) {
      rec.projectId = null;
    }
    state.calcRecords.unshift(rec);
    persistCalcRecords();
    toast('Создана копия расчёта');
    return rec;
  }

  function renameRecord(id, name) {
    if (!ensureWritable()) return false;
    const rec = findRecord(id);
    if (!rec) return false;
    if (recordEditBlocked(rec)) return false;
    rec.displayName = String(name).slice(0, 120);
    rec.savedAt = new Date().toISOString();
    persistCalcRecords();
    return true;
  }

  function attachRecord(id, projectId) {
    if (!ensureWritable()) return false;
    const rec = findRecord(id);
    if (!rec) return false;
    if (recordPayloadLocked(rec)) return false;
    if (projectId === null || projectId === '') {
      rec.projectId = null;
    } else {
      const pid = safeProjectId(projectId);
      if (!pid || !state.projects.some((p) => p.id === pid && !p.shared)) {
        toast('Проект не найден или доступен только для просмотра');
        return false;
      }
      rec.projectId = pid;
    }
    rec.savedAt = new Date().toISOString();
    persistCalcRecords();
    toast(rec.projectId ? 'Привязали к проекту' : 'Отвязали от проекта');
    return true;
  }

  function hasMeaningfulEstimateInput(inp) {
    if (!inp) return false;
    if (inp.objectType) return true;
    if (inp.segment) return true;
    if (inp.scope === 'room') return true;
    if (inp.area !== '' && inp.area !== undefined && inp.area !== null) return true;
    return false;
  }

  function hasMeaningfulMaterialInput(calcId, vals) {
    if (!vals || typeof vals !== 'object') return false;
    return Object.keys(vals).length > 0;
  }

  function materialComputeReady(calcId, vals) {
    if (!window.RCMatCalc || !window.RCMatCalc.materialComputeReady) return false;
    return window.RCMatCalc.materialComputeReady(calcId, vals);
  }

  function autosaveEstimate(patch, navPlace) {
    const merged = { ...state.estimateInput, ...patch };
    if (!hasMeaningfulEstimateInput(merged)) return null;
    return upsertRecord({
      calcType: 'estimate-total',
      inputs: merged,
      navPlace: navPlace || { path: '#/calc', calcStep: state.calcStep },
      incomplete: true,
      resultSnapshot: null,
    });
  }

  function saveEstimateResult(estimate) {
    if (!estimate) return;
    upsertRecord({
      calcType: 'estimate-total',
      inputs: { ...state.estimateInput },
      resultSnapshot: JSON.parse(JSON.stringify(estimate)),
      navPlace: { path: '#/estimate' },
      incomplete: false,
    });
    state.calcViewFrozen = true;
  }

  function autosaveMaterial(calcId, values, meta, navPlace) {
    if (!hasMeaningfulMaterialInput(calcId, values)) return null;
    const ready = materialComputeReady(calcId, values);
    const patch = {
      calcType: `material-${calcId}`,
      inputs: { ...values },
      meta: meta || {},
      navPlace: navPlace || { path: `#/calc/materials/${calcId}` },
      incomplete: !ready,
    };
    if (!ready) {
      patch.resultSnapshot = null;
    } else {
      // Ready autosave must not keep a stale frozen snapshot; saveMaterialSnapshot re-freezes.
      patch.resultSnapshot = null;
    }
    return upsertRecord(patch);
  }

  function saveMaterialSnapshot(calcId, values, snapshot, meta) {
    if (!materialComputeReady(calcId, values)) return null;
    const rec = upsertRecord({
      calcType: `material-${calcId}`,
      inputs: { ...values },
      resultSnapshot: JSON.parse(JSON.stringify(snapshot)),
      meta: meta || {},
      navPlace: { path: `#/calc/materials/${calcId}` },
      incomplete: false,
    });
    return rec;
  }

  function clearNewCalcSessionFlags() {
    state._forceNewCalcSession = false;
    state._draftProjectHint = null;
    state._estimateDraftProjectHint = null;
    state._draftSessionTypes = null;
  }

  function reconcileAbandonedNewSession(params = {}, calcType) {
    if (!state._forceNewCalcSession || !calcType) return null;
    let id = params.record ? safeId(params.record) : null;
    if (!id) id = readCalcHistoryRecordId();
    if (!id) return null;
    const rec = findRecord(id);
    if (!rec || rec.calcType !== calcType) return null;
    clearNewCalcSessionFlags();
    setActiveForType(rec, { skipHistoryTouch: true });
    return rec;
  }

  function isForceNewCalcType(calcType) {
    return !!(state._forceNewCalcSession && !state._draftSessionTypes?.[calcType]);
  }

  function beginNewEstimateDraft(projectId) {
    const pid = projectId ? safeProjectId(projectId) : null;
    clearNewCalcSessionFlags();
    if (pid) {
      const p = state.projects.find((x) => x.id === pid);
      if (p && !p.shared) {
        state.activeProjectId = pid;
        state._draftProjectHint = pid;
      }
    }
    state._forceNewCalcSession = true;
    state._draftSessionTypes = {};
    state.activeCalcRecordByType = {};
    state.activeCalcRecordId = null;
    if (window.RCCalc && window.RCCalc.beginNewEstimateSession) {
      window.RCCalc.beginNewEstimateSession();
    }
    if (window.RCMatCalc && window.RCMatCalc.beginNewMaterialSession) {
      window.RCMatCalc.beginNewMaterialSession();
    }
    go('#/calc');
  }

  function resumeActiveDraft(calcType) {
    const id = activeIdForType(calcType);
    if (!id) return null;
    const rec = findRecord(id);
    if (!rec || rec.calcType !== calcType) return null;
    return rec;
  }

  function hydrateEstimateDraftFromStorage(params = {}) {
    if (isForceNewCalcType('estimate-total')) return null;
    const rid = resolveEstimateRecordId(params);
    if (!rid) return null;
    const rec = findRecord(rid);
    if (!rec || rec.calcType !== 'estimate-total') return null;
    restoreEstimateRoute(rec);
    return rec;
  }

  function restoreEstimateRoute(rec) {
    if (!rec || rec.calcType !== 'estimate-total') return;
    if (rec.dataTypedInvalid) {
      state.calcViewFrozen = false;
      state.estimate = null;
      return;
    }
    Object.assign(state.estimateInput, rec.inputs);
    setActiveForType(rec, { skipHistoryTouch: true });
    const snapOk = rec.resultSnapshot && validateEstimateSnapshotTyped(rec.resultSnapshot);
    state.calcViewFrozen = !rec.incomplete && snapOk;
    if (snapOk && !rec.incomplete) state.estimate = rec.resultSnapshot;
    else state.estimate = null;
    if (rec.navPlace && rec.navPlace.calcStep) state.calcStep = rec.navPlace.calcStep;
  }

  function openRecord(id) {
    const rec = findRecord(id);
    if (!rec) {
      toast('Расчёт не найден');
      return;
    }
    clearNewCalcSessionFlags();
    setActiveForType(rec);
    state.calcViewFrozen = !!rec.resultSnapshot;
    syncCalcSessionRecord(rec.id);
    if (rec.calcType === 'estimate-total') {
      restoreEstimateRoute(rec);
      if (rec.resultSnapshot && !rec.incomplete) {
        calcNavigate('#/estimate?record=' + encodeURIComponent(rec.id), rec.id);
      } else {
        calcNavigate('#/calc?record=' + encodeURIComponent(rec.id), rec.id);
      }
      if (window.RC?.state) {
        window.RC.state._restoredCalcRecord = rec.id;
        window.RC.state._restoredEstimateRecord = rec.incomplete || !rec.resultSnapshot ? null : rec.id;
      }
    } else {
      const matId = rec.calcType.replace(/^material-/, '');
      if (window.RCMatCalc && window.RCMatCalc.restoreRecord) window.RCMatCalc.restoreRecord(rec);
      calcNavigate(`#/calc/materials/${matId}?record=${encodeURIComponent(rec.id)}`, rec.id);
    }
  }

  function restoreSessionFromStorage() {
    try {
      const s = calcSessionStore().getSelectedRecord();
      if (!s?.recordId) return;
      const rec = findRecord(s.recordId);
      if (rec) setActiveForType(rec, { skipHistoryTouch: true });
    } catch (e) { /* ignore */ }
  }

  function groupedRecords() {
    const groups = new Map();
    state.calcRecords.forEach((r) => {
      const key = r.projectId || '__none__';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(r);
    });
    const order = [...groups.keys()].sort((a, b) => {
      if (a === '__none__') return 1;
      if (b === '__none__') return -1;
      return projectLabel(a).localeCompare(projectLabel(b), 'ru');
    });
    return order.map((key) => ({ projectId: key === '__none__' ? null : key, title: projectLabel(key === '__none__' ? null : key), items: groups.get(key) }));
  }

  function librarySnapshotAmount(r) {
    if (!r || r.dataTypedInvalid || !r.resultSnapshot) return null;
    const snap = r.resultSnapshot;
    const pick = snap.renovation ?? snap.total ?? snap.max ?? snap.min;
    if (typeof pick === 'number' && Number.isFinite(pick)) return pick;
    if (typeof pick === 'string') {
      const t = pick.trim();
      if (!t) return null;
      const n = parseFloat(t.replace(',', '.'));
      if (Number.isFinite(n)) return n;
    }
    return null;
  }

  function renderCalcRow(r) {
    const snapAmt = librarySnapshotAmount(r);
    const frozen = r.dataTypedInvalid
      ? `<span class="pill pill--amber proj-calcs__pill">Повреждённые данные</span>`
      : r.resultSnapshot
        ? (snapAmt != null
          ? `<span class="pill pill--dark proj-calcs__pill">Снимок ${moneyShort(snapAmt)}</span>`
          : `<span class="pill pill--amber proj-calcs__pill">Снимок недоступен</span>`)
        : `<span class="pill proj-calcs__pill">Черновик</span>`;
    const corrupt = recordPayloadLocked(r);
    const orphan = isOrphanProjectBinding(r);
    const sharedParent = isSharedProjectBinding(r);
    const statusPill = orphan
      ? `<span class="pill pill--amber proj-calcs__pill">Маршрут недоступен</span>`
      : (sharedParent ? `<span class="pill pill--amber proj-calcs__pill">Только просмотр</span>` : '');
    return `<article class="evt proj-calcs__row" data-calc-id="${esc(r.id)}"${orphan ? ' data-orphan-parent="1"' : ''}${sharedParent ? ' data-shared-parent="1"' : ''}>
      <button type="button" class="proj-calcs__open" data-act="open" data-id="${esc(r.id)}">
        <div><b class="ink">${esc(r.displayName)}</b><small>${esc(calcTypeLabel(r.calcType))} · ${new Date(r.savedAt).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}${orphan ? ` · привязка: ${esc(projectLabel(r.projectId))}` : ''}${sharedParent ? ' · общий маршрут' : ''}</small></div>
        ${statusPill || frozen}
      </button>
      <div class="proj-calcs__acts row" style="gap:.35rem;flex-wrap:wrap">
        <button type="button" class="btn btn--ghost btn--sm proj-calcs__act" data-act="rename" data-id="${esc(r.id)}"${recordEditBlocked(r) ? ' disabled' : ''}>${icon('pencil')} Переименовать</button>
        <button type="button" class="btn btn--ghost btn--sm proj-calcs__act" data-act="copy" data-id="${esc(r.id)}"${corrupt ? ' disabled title="Копия недоступна: данные расчёта повреждены"' : ''}>${icon('copy')} Копия</button>
        ${orphan ? `<button type="button" class="btn btn--ghost btn--sm proj-calcs__act" data-act="detach" data-id="${esc(r.id)}"${corrupt ? ' disabled title="Отвязка недоступна: данные расчёта повреждены"' : ''}>${icon('unlock')} Отвязать</button>` : `<button type="button" class="btn btn--ghost btn--sm proj-calcs__act" data-act="attach" data-id="${esc(r.id)}"${corrupt ? ' disabled title="Привязка недоступна: данные расчёта повреждены"' : ''}>${icon('layers')} К проекту</button>`}
      </div>
    </article>`;
  }

  let calcProjDialogActive = false;
  let calcProjDialogSession = null;

  function refocusLibraryAction(target) {
    if (!target) return null;
    let el = null;
    if (target.el && target.el.isConnected) el = target.el;
    else if (target.act && target.recordId) {
      const rid = safeId(target.recordId);
      if (rid) el = qs(`[data-act="${target.act}"][data-id="${rid}"]`);
    }
    if (el && typeof el.focus === 'function') {
      el.focus();
      return el;
    }
    return null;
  }

  function detachCalcProjDialogSession(session) {
    if (!session || session.detached) return;
    session.detached = true;
    session.closed = true;
    calcProjDialogActive = false;
    if (session.onKey) document.removeEventListener('keydown', session.onKey, true);
    if (session.modalObserver) session.modalObserver.disconnect();
    if (calcProjDialogSession === session) calcProjDialogSession = null;
  }

  function openCalcDialog(html, { onOpen, opener, focusReturn } = {}) {
    const focusTarget = focusReturn || (opener ? { el: opener } : null);
    const fallbackFocus = opener || (typeof document !== 'undefined' ? document.activeElement : null);
    modal(html, {
      onOpen(root) {
        const dialog = qs('.modal__box', root) || root;
        dialog.classList.add('modal__box--calc-proj');
        const focusables = () => qsa(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
          dialog,
        ).filter((el) => el.getClientRects().length);
        const session = { closed: false, detached: false, onKey: null, modalObserver: null };
        calcProjDialogSession = session;
        const isCalcProjModalOpen = () => {
          const m = qs('#modal');
          return !!(m && m.classList.contains('is-open') && qs('.modal__box--calc-proj', m));
        };
        const teardown = (opts = {}) => {
          if (session.closed && session.detached) return;
          session.closed = true;
          const modalWasOpen = isCalcProjModalOpen();
          detachCalcProjDialogSession(session);
          if (!opts.skipModalClose && modalWasOpen) closeModal();
          if (opts.skipFocus) return;
          const el = refocusLibraryAction(focusTarget);
          if (!el && fallbackFocus && typeof fallbackFocus.focus === 'function' && fallbackFocus.isConnected) {
            fallbackFocus.focus();
          }
        };
        session.onKey = (e) => {
          if (session.detached) return;
          if (!isCalcProjModalOpen()) {
            detachCalcProjDialogSession(session);
            return;
          }
          if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            teardown();
            return;
          }
          if (e.key !== 'Tab') return;
          const nodes = focusables();
          if (!nodes.length) return;
          const first = nodes[0];
          const last = nodes[nodes.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        };
        calcProjDialogActive = true;
        document.addEventListener('keydown', session.onKey, true);
        const modalEl = qs('#modal');
        if (modalEl && typeof MutationObserver !== 'undefined') {
          session.modalObserver = new MutationObserver(() => {
            if (session.detached) return;
            if (!isCalcProjModalOpen()) detachCalcProjDialogSession(session);
          });
          session.modalObserver.observe(modalEl, { attributes: true, childList: true, subtree: true });
        }
        qsa('[data-close]', root).forEach((b) => { b.onclick = () => teardown(); });
        root.onclick = (e) => { if (e.target === root) teardown(); };
        const first = qs('#calc-rename', root) || qs('#calc-attach-pj', root) || focusables()[0];
        if (first) first.focus();
        if (onOpen) onOpen(root, teardown, focusTarget);
      },
    });
  }

  function pageCalculations() {
    const notice = storageNotice();
    const projects = Array.isArray(state.projects) ? state.projects : [];
    const recordInProject = (r, p) => r.projectId === p.id && safeProjectId(r.projectId) === p.id;
    const boundOrphans = state.calcRecords.filter((r) => isOrphanProjectBinding(r));
    const unassigned = state.calcRecords.filter((r) => {
      if (isOrphanProjectBinding(r)) return false;
      if (!r.projectId) return true;
      const pid = safeProjectId(r.projectId);
      if (!pid) return true;
      return !projects.some((p) => p.id === pid);
    });
    const emptyAll = !projects.length && !unassigned.length && !boundOrphans.length;

    const projectBlocks = projects.map((p) => {
      const items = state.calcRecords.filter((r) => recordInProject(r, p));
      const safe = safeProjectId(p.id) || 'unknown';
      return `<section class="proj-calcs__project" data-testid="proj-calcs-project-${esc(safe)}">
        <div class="proj-calcs__project-head">
          <div>
            <h2 class="proj-calcs__group-title">${esc(p.name)}</h2>
            <p class="small muted" style="margin:0">${items.length} сохранённых расчётов</p>
          </div>
          <div class="row proj-calcs__project-links" style="gap:.5rem;flex-wrap:wrap">
            <button type="button" class="btn btn--ghost proj-calcs__act" data-act="open-plan" data-pj="${esc(p.id)}">${icon('route')} План</button>
            <button type="button" class="btn btn--primary proj-calcs__act" data-act="new-calc" data-pj="${esc(p.id)}">${icon('calculator')} Новый расчёт</button>
          </div>
        </div>
        ${items.length ? `<div class="stack" style="gap:.5rem;margin-top:.75rem">${items.map(renderCalcRow).join('')}</div>` : '<p class="small muted" style="margin-top:.75rem" data-testid="proj-calcs-empty-project">Сохранённых расчётов для этого маршрута пока нет.</p>'}
      </section>`;
    }).join('');

    const noneBlock = unassigned.length ? `<section class="proj-calcs__group" data-testid="calc-group-none">
      <h2 class="proj-calcs__group-title">Без проекта</h2>
      <div class="stack" style="gap:.5rem">${unassigned.map(renderCalcRow).join('')}</div>
    </section>` : '';
    const orphanBlock = boundOrphans.length ? `<section class="proj-calcs__group" data-testid="calc-group-unavailable-parent">
      <h2 class="proj-calcs__group-title">Привязка к недоступному маршруту</h2>
      <div class="notice notice--amber" style="margin:.5rem 0 .75rem" data-testid="calc-orphan-parent-notice">${icon('info')}<span>Эти расчёты сохранены с привязкой к маршруту, которого сейчас нет в навигаторе (например после перезагрузки). Редактирование заблокировано — исходные данные сохранены. Скопируйте расчёт или отвяжите его явно, чтобы продолжить работу.</span></div>
      <div class="stack" style="gap:.5rem">${boundOrphans.map(renderCalcRow).join('')}</div>
    </section>` : '';

    return `<section class="section--tight"><div class="wrap proj-calcs">
      <span class="eyebrow eyebrow--red">План ремонта</span>
      <h1 class="mc-h1" style="margin-top:.35rem">Мои проекты</h1>
      <p class="lead" style="margin:.35rem 0 1rem">Все маршруты из навигатора: у каждого — ссылка на план и список сохранённых расчётов. «Без проекта» — только расчёты без привязки; недоступные привязки вынесены отдельно.</p>
      <div class="notice notice--grey proj-calcs__notice" data-testid="calc-storage-notice">${icon('info')}<span>${esc(notice)}</span></div>
      ${emptyAll ? `<div class="empty calc-library-empty" data-testid="calc-library-empty"><h3>Пока нет маршрутов и расчётов</h3><p>Создайте маршрут в <a class="link calc-library-empty__entry" href="#/navigator" data-testid="calc-library-empty-nav">навигаторе</a> или начните <a class="link calc-library-empty__entry" href="#/calc" data-testid="calc-library-empty-calc">калькулятор объекта</a>.</p></div>` : ''}
      ${projectBlocks}
      ${orphanBlock}
      ${noneBlock}
      <p class="xs muted" style="margin-top:1.25rem">Добавление в бюджет маршрута — отдельная явная команда в калькуляторе; автосохранение сюда не создаёт расходов.</p>
    </div></section>`;
  }

  function bindCalculationsPage() {
    const root = qs('#app');
    qsa('[data-act="open"]', root).forEach((b) => (b.onclick = () => openRecord(b.dataset.id)));
    qsa('[data-act="open-plan"]', root).forEach((b) => (b.onclick = () => {
      if (b.dataset.pj) state.activeProjectId = b.dataset.pj;
      go('#/navigator');
    }));
    qsa('[data-act="new-calc"]', root).forEach((b) => (b.onclick = () => beginNewEstimateDraft(b.dataset.pj)));
    qsa('[data-act="detach"]', root).forEach((b) => (b.onclick = () => {
      const rec = findRecord(b.dataset.id);
      if (!rec) return;
      if (recordPayloadLocked(rec)) {
        toast('Отвязка недоступна — данные расчёта повреждены');
        return;
      }
      if (attachRecord(b.dataset.id, null)) renderApp();
    }));
    qsa('[data-act="rename"]', root).forEach((b) => (b.onclick = () => {
      const rec = findRecord(b.dataset.id);
      if (!rec) return;
      if (recordEditBlocked(rec)) return;
      openCalcDialog(`${modalHead('Переименовать')}<label class="field"><span class="field__label">Название</span><input type="text" id="calc-rename" value="${esc(rec.displayName)}" maxlength="120"></label><div class="modal__foot"><button type="button" class="btn btn--ghost" data-close>Отмена</button><button type="button" class="btn btn--primary" id="calc-rename-save">Сохранить</button></div>`, {
        opener: b,
        focusReturn: { act: 'rename', recordId: rec.id },
        onOpen(m, done, focusTarget) {
          const save = () => {
            renameRecord(rec.id, qs('#calc-rename', m).value);
            done({ skipFocus: true });
            renderApp();
            setTimeout(() => refocusLibraryAction(focusTarget), 0);
          };
          qs('#calc-rename-save', m).onclick = save;
          qs('#calc-rename', m).onkeydown = (e) => { if (e.key === 'Enter') save(); };
        },
      });
    }));
    qsa('[data-act="copy"]', root).forEach((b) => (b.onclick = () => {
      const rec = findRecord(b.dataset.id);
      if (!rec) return;
      if (recordPayloadLocked(rec)) {
        toast('Копия недоступна — данные расчёта повреждены');
        return;
      }
      copyRecord(b.dataset.id);
      renderApp();
    }));
    qsa('[data-act="attach"]', root).forEach((b) => (b.onclick = () => {
      const rec = findRecord(b.dataset.id);
      if (!rec) return;
      if (recordPayloadLocked(rec)) {
        toast('Привязка недоступна — данные расчёта повреждены');
        return;
      }
      const opts = state.projects.map((p) => `<option value="${esc(p.id)}" ${rec.projectId === p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('');
      openCalcDialog(`${modalHead('Привязать к проекту')}<label class="field"><span class="field__label">Проект маршрута</span><select id="calc-attach-pj"><option value="">— Без проекта —</option>${opts}</select></label><div class="modal__foot"><button type="button" class="btn btn--ghost" data-close>Отмена</button><button type="button" class="btn btn--primary" id="calc-attach-save">Сохранить</button></div>`, {
        opener: b,
        focusReturn: { act: 'attach', recordId: rec.id },
        onOpen(m, done, focusTarget) {
          qs('#calc-attach-save', m).onclick = () => {
            attachRecord(rec.id, qs('#calc-attach-pj', m).value || null);
            done({ skipFocus: true });
            renderApp();
            setTimeout(() => refocusLibraryAction(focusTarget), 0);
          };
        },
      });
    }));
  }

  function libraryLink(extraClass = '') {
    const n = state.calcRecords.length;
    return `<a class="btn btn--ghost btn--sm btn--block proj-calcs__entry ${extraClass}" href="#/projects/calculations" data-testid="my-projects-calcs-link">${icon('layers')} Мои проекты${n ? ` (${n})` : ''}</a>`;
  }

  loadCalcRecords();
  restoreSessionFromStorage();

  if (historyApi()) {
    window.addEventListener('popstate', () => {
      if (window.RC?.state) {
        window.RC.state._restoredCalcRecord = null;
        window.RC.state._restoredEstimateRecord = null;
      }
      const { path, params } = currentHashParams();
      if (path.startsWith('/calc/materials/') && path !== '/calc/materials') {
        const parts = path.split('/').filter(Boolean);
        const matId = parts[parts.length - 1];
        reconcileAbandonedNewSession(params, `material-${matId}`);
      } else if (path === '/calc' || path === '/estimate') {
        reconcileAbandonedNewSession(params, 'estimate-total');
      }
      renderApp();
      syncSessionToResolvedRouteRecord();
    });
  }

  route('/projects/calculations', pageCalculations);
  document.addEventListener('rc:rendered', (e) => {
    if (e.detail.path === '/projects/calculations') bindCalculationsPage();
  });

  window.RCProjectCalcs = {
    CALC_LS,
    CALC_FORMAT_V,
    loadCalcRecords,
    persistCalcRecords,
    storageNotice,
    ensureWritable,
    upsertRecord,
    copyRecord,
    renameRecord,
    attachRecord,
    findRecord,
    autosaveEstimate,
    saveEstimateResult,
    autosaveMaterial,
    saveMaterialSnapshot,
    openRecord,
    calcNavigate,
    calcHistoryUrl,
    resolveEstimateRecordId,
    resolveMaterialRecordId,
    wrongTypeRecordParam,
    validateEstimateRecordTyped,
    readCalcHistoryRecordId,
    stampCurrentHistoryRecord,
    beginNewEstimateDraft,
    clearNewCalcSessionFlags,
    reconcileAbandonedNewSession,
    isForceNewCalcType,
    resumeActiveDraft,
    revalidateRecordTyping,
    stampRecordTypedValidity,
    recordPayloadLocked,
    isOrphanProjectBinding,
    isSharedProjectBinding,
    recordEditBlocked,
    hydrateEstimateDraftFromStorage,
    restoreEstimateRoute,
    activeIdForType,
    setActiveForType,
    safeProjectId,
    projectWritable,
    libraryLink,
    isRcDemoMemoryHost,
    get calcReadonly() { return calcReadonly; },
    get calcStorageMode() { return calcStorageMode; },
    parseEnvelope,
    coerceRecord,
    defaultName,
  };

  if (window.RC_TEST) {
    window.RCProjectCalcsTest = {
      parseEnvelope,
      coerceRecord,
      persistCalcRecords,
      loadCalcRecords,
      bindCalculationsPage,
      openCalcDialog,
      getCalcProjDialogActive: () => calcProjDialogActive,
      state: () => ({ calcReadonly, calcReadFailed, calcStorageMode, calcRawPreserved, records: state.calcRecords.slice() }),
    };
  }
})();
