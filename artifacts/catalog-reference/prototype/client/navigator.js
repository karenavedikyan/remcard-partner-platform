/* RemCard — навигатор ремонта. Все функции действующего навигатора (см. docs/navigator-functions.md) в новом стиле. */
(function () {
  const { D, NAV, esc, fmt, money, moneyShort, plural, duration, dateRu, uid, qs, qsa, go, icon, stageIcon, ROOM_ICONS, state, activeProject, modal, modalHead, ask, toast, route, renderApp, parseHash } = window.RC;
  const R = window.RC.R ?? (() => true);
  const rcCloseModal = window.RC.closeModal;
  const { applicableL1, pricingLevel, durArea, by, calculateEstimate } = window.RCCalc;
  const E = D.est;
  const L = D.locality;
  const MODES = [['list', 'Подробно', 'Все подэтапы и чек-листы на одном экране'], ['steps', 'По шагам', 'Один подэтап за раз, кнопки «назад / далее»'], ['focus', 'Просто', 'Одна задача на экране — отмечайте и двигайтесь дальше']];
  const PROFILES = [['beginner', 'С подсказками', 'Максимум подсказок, советов и ссылок'], ['pro', 'С бригадой', 'Поручения мастерам, контроль сроков и денег'], ['control', 'Надзор', 'Только чек-листы приёмки, фото и акты']];
  const DIFF = { easy: ['Можно самому', 'pill--green'], medium: ['Средняя', 'pill--amber'], hard: ['Нужен мастер', 'pill--red'] };
  const DOC_TYPES = [['receipt', 'Чек'], ['warranty', 'Гарантия'], ['contract', 'Договор'], ['act', 'Акт'], ['other', 'Прочее']];
  const PHOTO_CATS = [['process', 'Рабочий процесс'], ['hidden', 'Скрытые работы'], ['result', 'Результат'], ['defect', 'Дефект']];
  const view = { search: '', l2Open: null, stepIdx: 0, focusSkip: 0, budgetTab: 'all', liteL2: null, liteCelebrate: null, liteMore: null, liteAllTasks: null, liteTip: null, liteDesc: null, litePrev: false, stageCompletePanel: null, liteSkipIntro: null, liteFocusTask: null, liteTransientProjectId: null, catalogReturnFocus: null };
  const liteTransientApplies = (p) => !!p && view.liteTransientProjectId === p.id;
  const claimLiteTransient = (p) => { if (p) view.liteTransientProjectId = p.id; };
  const liteSkipIntroActive = (p, l1Id) => liteTransientApplies(p) && view.liteSkipIntro === l1Id;
  const STICKY_NAV = 72;
  const PLAN_BUDGET_MAX = 999_999_999_999.99;
  let bulkActionLock = 0;
  let navScrollFocusGen = 0;
  let navPlayMainEnter = false;
  let delegPickerSessionDraft = null;
  let delegPickerReopenPending = false;
  const DELEG_PICKER_VIEW_KINDS = ['points', 'l2', 'l1'];

  // ---------- Проект ----------
  const defaultLocality = () => ({ city: 'krasnodar', localityName: '', localityRegion: '' });
  const projectLocality = (estimate) => (estimate ? L.snapshot(estimate.input) : defaultLocality());
  const projectPlace = (p) => L.displayLabel(p.locality || defaultLocality(), E.cities);
  const placeDisplayHtml = (p, loc) => {
    const label = projectPlace({ ...p, locality: loc });
    return L.isCustom(loc) ? `<span class="locality-text">${esc(label)}</span>` : esc(label);
  };
  function litePlaceSummary(p) {
    const loc = p.locality || projectLocality(p.estimate);
    const custom = L.isCustom(loc);
    return `<p class="lite__place small muted" role="status" id="lite-place-summary">${icon('map-pin')} ${placeDisplayHtml(p, loc)}${custom ? `<span class="lite__approx"> · расчёт ориентировочный</span>` : ''}</p>`;
  }
  const localitySnapEqual = (a, b) => {
    const sa = L.snapshot(a || defaultLocality());
    const sb = L.snapshot(b || defaultLocality());
    return sa.city === sb.city && sa.localityName === sb.localityName && sa.localityRegion === sb.localityRegion;
  };
  const autoProjectName = (objectType, input) => {
    const type = by(E.objectTypes, objectType);
    return `${type.label} · ${L.displayLabel(input, E.cities)}`;
  };
  /** Имя проекта на «Начать»: авто-заголовок обновляется, если в #pname ещё старое авто, иначе — ручное. */
  const PROJECT_NAME_MAX_LEN = 120;
  function resolveSetupProjectName({ typedName, oldAuto, recalculated, estimate, objectType, currentName }) {
    const typed = String(typedName ?? '').trim();
    const old = String(oldAuto ?? '').trim();
    if (recalculated && estimate && old && typed === old) return autoProjectName(objectType, estimate.input);
    if (typed) return typed;
    if (recalculated && estimate && old && String(currentName ?? '').trim() === old) return autoProjectName(objectType, estimate.input);
    return String(currentName ?? '').trim() || typed;
  }
  /** Пересчёт estimate из калькулятора, если в setup сменили населённый пункт. */
  function syncEstimateToLocality(p, snap) {
    if (!p.estimate) return false;
    if (localitySnapEqual(L.snapshot(p.estimate.input), snap)) return false;
    const newInput = { ...p.estimate.input, ...L.toInputFields(snap) };
    p.estimate = calculateEstimate(newInput);
    p.level = p.estimate.level;
    return true;
  }

  function newProject({ objectType, roomType = null, estimate = null, name = '', locality = null }) {
    const type = by(E.objectTypes, objectType);
    const loc = locality || projectLocality(estimate);
    const p = {
      id: uid(),
      name: name || (estimate ? `${type.label} · ${L.displayLabel(estimate.input, E.cities)}` : `Мой ремонт: ${type.label.toLowerCase()}`),
      objectType,
      roomType,
      locality: loc,
      createdAt: Date.now(),
      startDate: new Date().toISOString().slice(0, 10),
      mode: 'list', profile: 'beginner', stageModes: {}, estimate, area: estimate ? estimate.input.area : 60, level: estimate ? estimate.level : 'standard',
      currentL1: null, completedTasks: new Set(), completedL1: new Set(), skippedL1: new Set(), customTasks: [], taskMeta: {}, delegations: [], expenses: [], expensesConfirmed: false, actualStartDate: null, actualEndDate: null, documents: [],
      events: [], notes: {}, photos: {}, workers: {}, qc: new Set(), timers: {}, exec: {}, materials: new Set(), shared: false, concierge: [], ui: 'lite', introSeen: {},
    };
    state.projects.push(p); state.activeProjectId = p.id;
    return p;
  }
  /** Блокирует запись в «захваченный» проект после смены activeProjectId или подмены ссылки в state.projects. */
  function liveProjectMutationGuard(p, projectId, { stageL1Id } = {}) {
    if (!p || p.shared) return { ok: false };
    const live = activeProject();
    if (!live || live.shared) return { ok: false };
    if (live.id !== projectId) return { ok: false };
    const slot = state.projects.find((x) => x.id === projectId);
    if (!slot || slot !== p || slot !== live) return { ok: false };
    if (stageL1Id != null && stageL1Id !== '' && !stages(live).some((s) => s.id === stageL1Id)) return { ok: false };
    return { ok: true, live };
  }
  const stages = (p) => applicableL1(p.objectType, p.roomType);
  const l2of = (p, l1) => l1.stages.filter((s) => s.objectTypes.includes(p.objectType));
  const tasksOf = (p, l2) => [...l2.tasks, ...p.customTasks.filter((t) => t.stageL2Id === l2.id)];
  const l2Done = (p, l2) => { const t = tasksOf(p, l2); return t.length > 0 && t.every((x) => p.completedTasks.has(x.id)); };
  const l1Stats = (p, l1) => { const all = l2of(p, l1).flatMap((l2) => tasksOf(p, l2)); const done = all.filter((t) => p.completedTasks.has(t.id)).length; return { total: all.length, done, pct: all.length ? Math.round(done / all.length * 100) : 0 }; };
  const l1Complete = (p, id) => p.completedL1.has(id) || p.skippedL1.has(id);
  const l1Unlocked = (p, id) => { const s = stages(p); const i = s.findIndex((x) => x.id === id); return i <= 0 || l1Complete(p, s[i - 1].id); };
  const focusL1 = (p) => { const s = stages(p); return s.find((x) => !l1Complete(p, x.id)) || s[s.length - 1]; };
  const currentL1 = (p) => { const s = stages(p); return s.find((x) => x.id === p.currentL1) || focusL1(p); };
  const totals = (p) => { const s = stages(p); const all = s.flatMap((l1) => l2of(p, l1).flatMap((l2) => tasksOf(p, l2))); const done = all.filter((t) => p.completedTasks.has(t.id)).length + s.filter((l1) => p.skippedL1.has(l1.id)).reduce((a, l1) => a + l2of(p, l1).flatMap((l2) => tasksOf(p, l2)).filter((t) => !p.completedTasks.has(t.id)).length, 0); return { total: all.length, done, percent: all.length ? Math.round(done / all.length * 100) : 0, l1: s.length, l1done: s.filter((x) => l1Complete(p, x.id)).length }; };
  const stagePlan = (p, id) => { const e = NAV.stageEstimates.find((x) => x.stageId === id); return e ? (e.workPricePerM2[p.level] + e.materialPricePerM2[p.level]) * p.area : 0; };
  const stageFact = (p, id) => p.expenses.filter((e) => e.stageL1Id === id).reduce((a, e) => a + e.amount, 0);
  function budgetVariance(plan, fact, recorded, complete) {
    if (!recorded) return { kind: 'neutral', label: 'Нет записей', amount: '—', icon: 'receipt' };
    if (fact > plan) return { kind: 'attention', label: 'Перерасход', amount: moneyShort(fact - plan), icon: 'alert-triangle' };
    if (fact < plan) return { kind: complete ? 'saving' : 'neutral', label: complete ? 'Экономия' : 'Остаток по смете', amount: moneyShort(plan - fact), icon: complete ? 'trending-down' : 'wallet' };
    return { kind: 'neutral', label: 'По смете', amount: moneyShort(0), icon: 'check' };
  }
  const planTotal = (p) => p.estimate ? p.estimate.renovation : stages(p).reduce((a, s) => a + stagePlan(p, s.id), 0);
  const factTotal = (p) => p.expenses.reduce((a, e) => a + e.amount, 0);
  const stageDays = (p, id) => { const e = NAV.stageEstimates.find((x) => x.stageId === id); return e ? Math.max(1, Math.round(e.durationDays[p.level] * (durArea(p.area) / 60))) : 7; };
  const levelOf = (pct) => { let cur = D.levels[0], next = D.levels[1]; for (let i = 0; i < D.levels.length; i++) if (pct >= D.levels[i][1]) { cur = D.levels[i]; next = D.levels[i + 1] || null; } return { cur, next }; };
  const modeOf = (p, l1) => p.stageModes[l1.id] || p.mode;
  const l1ById = (p, id) => stages(p).find((x) => x.id === id);
  const l1AllTasks = (p, l1) => l2of(p, l1).flatMap((l2) => tasksOf(p, l2));
  function formatPlanBudgetSum(n) {
    if (!Number.isFinite(n) || n < 0 || n > PLAN_BUDGET_MAX) return '';
    const v = Math.round(n * 100) / 100;
    const frac = Math.abs(v - Math.trunc(v)) > 1e-9;
    const minFrac = v === 0 ? 0 : frac ? 2 : 0;
    return `${v.toLocaleString('ru-RU', { minimumFractionDigits: minFrac, maximumFractionDigits: 2 })} ₽`;
  }
  function parsePlanBudgetInput(raw) {
    const t = String(raw ?? '').trim().replace(',', '.');
    if (!t) return { ok: true, clear: true };
    if (!/^\d+(\.\d{1,2})?$/.test(t)) return { ok: false };
    const n = Number(t);
    if (!Number.isFinite(n) || n < 0 || n > PLAN_BUDGET_MAX) return { ok: false };
    return { ok: true, value: Math.round(n * 100) / 100 };
  }
  function planBudgetInputDisplay(budget) {
    if (budget === undefined || budget === null || budget === '') return '';
    if (!Number.isFinite(budget) || budget < 0) return '';
    return String(Math.round(budget * 100) / 100);
  }
  function planBudgetLabel(meta) {
    if (!meta || meta.budget === undefined || meta.budget === null || meta.budget === '') return '';
    return formatPlanBudgetSum(meta.budget);
  }
  function taskMetaMutationOk(p, ctx) {
    if (!p || !ctx?.projectId) return false;
    if (p.shared) return false;
    const ap = activeProject();
    return !!(ap && ap.id === p.id && ap.id === ctx.projectId);
  }
  function cancelNavScrollFocus() {
    navScrollFocusGen += 1;
  }
  function playNavMainEnter(after) {
    if (reducedMotion()) {
      after?.();
      return;
    }
    requestAnimationFrame(() => {
      const main = qs('#nav-main');
      if (!main) {
        after?.();
        return;
      }
      main.classList.remove('nav-main-enter');
      void main.offsetWidth;
      main.classList.add('nav-main-enter');
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        main.classList.remove('nav-main-enter');
        after?.();
      };
      main.addEventListener('animationend', (e) => {
        if (e.target === main) finish();
      }, { once: true });
      setTimeout(finish, 320);
    });
  }
  function rerenderNavMotion() {
    navPlayMainEnter = true;
    renderApp();
  }
  function projectBulkContextOk(p, ctx) {
    if (!p || !ctx?.projectId || !ctx?.l1Id) return false;
    if (p.shared) return false;
    const ap = activeProject();
    if (!ap || ap.id !== p.id || ap.id !== ctx.projectId) return false;
    return true;
  }
  function stageBulkAllowed(p, l1Id) {
    const l1 = l1ById(p, l1Id);
    if (!l1) return false;
    if (!l1Unlocked(p, l1Id) || l1Complete(p, l1Id)) return false;
    return true;
  }
  function stageCloseAllowed(p, l1Id) {
    if (p.shared) return false;
    const l1 = l1ById(p, l1Id);
    if (!l1 || !l1Unlocked(p, l1Id) || l1Complete(p, l1Id)) return false;
    const st = l1Stats(p, l1);
    return st.total === 0 || st.done >= st.total;
  }
  function bulkCompleteSnapshot(p, l1) {
    const D = window.RCNavDelegationDemo;
    const addedTasks = l1AllTasks(p, l1)
      .map((t) => t.id)
      .filter((id) => !p.completedTasks.has(id) && (!D || D.ownerMayToggleTask(p, id)));
    return {
      projectId: p.id,
      l1Id: l1.id,
      addedTasks,
      hadCompletedL1: p.completedL1.has(l1.id),
      hadSkippedL1: p.skippedL1.has(l1.id),
      hadStageCompletePanel: view.stageCompletePanel === l1.id,
    };
  }
  function l1OwnerChecklistClosed(p, l1) {
    return l1AllTasks(p, l1).every((t) => p.completedTasks.has(t.id));
  }
  function applyBulkStageDone(p, l1) {
    const D = window.RCNavDelegationDemo;
    l1AllTasks(p, l1).forEach((t) => {
      if (D && !D.ownerMayToggleTask(p, t.id)) return;
      p.completedTasks.add(t.id);
    });
    p.skippedL1.delete(l1.id);
    if (l1OwnerChecklistClosed(p, l1)) p.completedL1.add(l1.id);
    else p.completedL1.delete(l1.id);
    return l1OwnerChecklistClosed(p, l1);
  }
  function restoreBulkSnapshot(p, snap) {
    if (!snap?.projectId || snap.projectId !== p.id || !Array.isArray(snap.addedTasks)) return false;
    snap.addedTasks.forEach((id) => p.completedTasks.delete(id));
    if (snap.hadCompletedL1) p.completedL1.add(snap.l1Id);
    else p.completedL1.delete(snap.l1Id);
    if (snap.hadSkippedL1) p.skippedL1.add(snap.l1Id);
    else p.skippedL1.delete(snap.l1Id);
    if (snap.hadStageCompletePanel) view.stageCompletePanel = snap.l1Id;
    else if (view.stageCompletePanel === snap.l1Id) view.stageCompletePanel = null;
    return true;
  }
  function participationLabel(profileId) {
    const row = PROFILES.find(([id]) => id === profileId);
    return row ? row[1] : String(profileId ?? '');
  }
  const RENOVATION_ADVICE_TITLE = 'Советы по ремонту';
  const ADVICE_DISPLAY_MODES = [
    ['adjacent', 'Показывать рядом', 'Советы по экономии и частым ошибкам доступны в боковой панели.'],
    ['ondemand', 'Открывать по кнопке', 'Советы доступны в «Инструменты → Советы по ремонту» и не занимают место на экране.'],
  ];
  function tipsDisplayValue(p) {
    const v = p.tipsDisplay;
    if (v === 'adjacent' || v === 'ondemand') return v;
    return p.profile === 'beginner' ? 'adjacent' : 'ondemand';
  }
  function liteTipsUiValue(p) {
    return tipsDisplayValue(p);
  }
  function renovationAdviceAdjacent(p) {
    return tipsDisplayValue(p) === 'adjacent';
  }
  function liteTipsReadonlyLabel(p) {
    return tipsDisplayValue(p) === 'adjacent' ? 'Советы: рядом' : 'Советы: по кнопке';
  }
  function navigatorSettingsModalMarkup(p) {
    const cur = tipsDisplayValue(p);
    const shared = !!p.shared;
    const head = shared
      ? modalHead('Настройки навигатора', 'Режим просмотра: настройки только для чтения')
      : modalHead('Настройки навигатора', 'Показ советов по ремонту на экране');
    const radios = shared
      ? `<p class="pill pill--soft nav-settings-tips__readonly" role="status" data-testid="nav-settings-tips-readonly">${esc(liteTipsReadonlyLabel(p))}</p>`
      : `<div class="picks picks--1 nav-settings-tips" role="radiogroup" aria-label="${esc(RENOVATION_ADVICE_TITLE)}">
      ${ADVICE_DISPLAY_MODES.map(([id, title, desc]) => `<button type="button" role="radio" aria-checked="${cur === id ? 'true' : 'false'}" class="pick pick--check nav-settings-tips__pick ${cur === id ? 'is-on' : ''}" data-n="tips-display" data-a="${id}" data-testid="nav-settings-tips-${id}"><span class="box">${icon('check')}</span><span class="grow"><b>${esc(title)}</b><span>${esc(desc)}</span></span></button>`).join('')}
    </div>`;
    return `${head}<section class="stack nav-settings-section" aria-labelledby="nav-settings-tips-h">
      <h3 class="text-md" id="nav-settings-tips-h">${esc(RENOVATION_ADVICE_TITLE)}</h3>
      ${radios}
      <p class="small muted nav-settings-tips__helper">Эта настройка меняет только показ советов. Задачи, поручения и прогресс останутся без изменений.</p>
    </section><div class="modal__foot"><button type="button" class="btn btn--ghost" id="nav-settings-back" data-testid="nav-settings-back" style="min-height:2.75rem">${icon('arrow-left')} Назад к действиям</button></div>`;
  }
  function navigatorSettingsModal(p, returnFocusEl) {
    const actionsOpener =
      returnFocusEl && returnFocusEl.focus
        ? returnFocusEl
        : qs('.lite-actions-btn,[data-n="menu"]') || document.activeElement;
    modalNav(navigatorSettingsModalMarkup(p), {
      onOpen(mo) {
        const box = qs('.modal__box', mo);
        if (box) box.classList.add('modal__box--nav-settings');
        qsa('[data-n="tips-display"]', mo).forEach((btn) => {
          btn.onclick = () => {
            if (p.shared) return;
            const value = btn.dataset.a;
            if (value !== 'adjacent' && value !== 'ondemand') return;
            p.tipsDisplay = value;
            teardownNavModalA11y(qs('#modal'));
            closeModal();
            renderApp();
            returnFocusNavModalImmediate(actionsOpener);
          };
        });
        const back = qs('#nav-settings-back', mo);
        if (back) {
          back.onclick = () => {
            teardownNavModalA11y(qs('#modal'));
            closeModal();
            menuModal(p, actionsOpener);
          };
        }
      },
    }, returnFocusEl || actionsOpener);
  }
  function litePanelSummary(titleHtml) {
    return `<summary class="lite-panel__head"><span class="lite-panel__head-main">${titleHtml}</span><span class="lite-panel__chev" aria-hidden="true">${icon('chevron-down')}</span></summary>`;
  }
  const LITE_HEADER_SETTINGS_MQ = '(min-width: 761px)';
  let liteHeaderSettingsWasDesktop = null;
  let liteHeaderSettingsMq = null;
  function liteHeaderSettingsDesktop() {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia(LITE_HEADER_SETTINGS_MQ).matches;
  }
  function syncLiteHeaderSettingsOpen(root) {
    const el = (root || document).querySelector('[data-testid="lite-header-settings"]');
    if (!el) return null;
    const desktop = liteHeaderSettingsDesktop();
    if (desktop) {
      el.open = true;
      el.dataset.liteSettingsLayout = 'desktop';
    } else {
      el.dataset.liteSettingsLayout = 'mobile';
      if (liteHeaderSettingsWasDesktop === true) el.open = false;
    }
    liteHeaderSettingsWasDesktop = desktop;
    return el;
  }
  function bindLiteHeaderSettingsViewport(root) {
    syncLiteHeaderSettingsOpen(root);
    if (liteHeaderSettingsMq || typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    liteHeaderSettingsMq = window.matchMedia(LITE_HEADER_SETTINGS_MQ);
    const onMq = () => syncLiteHeaderSettingsOpen(document);
    if (liteHeaderSettingsMq.addEventListener) liteHeaderSettingsMq.addEventListener('change', onMq);
    else liteHeaderSettingsMq.addListener(onMq);
  }
  function focusLiteTask(taskId) {
    if (!taskId) return;
    const gen = ++navScrollFocusGen;
    const delay = reducedMotion() ? 20 : 180;
    setTimeout(() => {
      if (gen !== navScrollFocusGen) return;
      const row = document.getElementById(`lite-task-${taskId}`) || qs(`[data-lite-task="${taskId}"]`);
      if (!row) return;
      row.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'center' });
      const hit = qs('.task__title', row) || qs('.task__box', row) || row;
      if (hit && hit.focus) hit.focus({ preventScroll: true });
      view.liteFocusTask = null;
    }, delay);
  }
  function scrollToNavMain() {
    const gen = ++navScrollFocusGen;
    const delay = reducedMotion() ? 20 : 200;
    setTimeout(() => {
      if (gen !== navScrollFocusGen) return;
      if (qs('#modal.is-open')) return;
      const m = qs('#nav-main');
      if (!m) return;
      const top = m.getBoundingClientRect().top;
      if (top < STICKY_NAV || top > window.innerHeight * 0.6) {
        const y = window.scrollY + top - STICKY_NAV;
        navScrollToY(y);
      }
      const panel = qs('#stage-complete-panel');
      if (panel) {
        panel.focus({ preventScroll: true });
        return;
      }
      const title = qs('#nav-stage-title', m);
      if (title) title.focus({ preventScroll: true });
      else m.focus({ preventScroll: true });
    }, delay);
  }
  function reducedMotion() {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  function navScrollToY(y) {
    if (reducedMotion()) {
      const html = document.documentElement;
      const prev = html.style.scrollBehavior;
      html.style.scrollBehavior = 'auto';
      try {
        window.scrollTo({ top: y, left: 0, behavior: 'instant' });
      } catch {
        window.scrollTo({ top: y, left: 0, behavior: 'auto' });
      }
      html.style.scrollBehavior = prev;
    } else {
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  }
  function teardownNavModalA11y(root) {
    if (!root?._navModalA11y) return;
    const { onKeydown, prevOnclick } = root._navModalA11y;
    root.removeEventListener('keydown', onKeydown, true);
    if (prevOnclick !== undefined) root.onclick = prevOnclick;
    delete root._navModalA11y;
  }
  function closeModal() {
    teardownNavModalA11y(qs('#modal'));
    rcCloseModal();
  }
  function markNavUxModal(mo) {
    const box = qs('.modal__box', mo);
    if (box) box.classList.add('modal__box--nav-ux');
  }
  function markDelegReportModal(mo) {
    markNavUxModal(mo);
    const box = qs('.modal__box', mo);
    if (box) box.classList.add('modal__box--deleg-report');
  }
  function markTaskMetaModal(mo) {
    markNavUxModal(mo);
    const box = qs('.modal__box', mo);
    if (box) box.classList.add('modal__box--task-meta');
  }
  function liveLiteActionsBtn() {
    return qs('.lite-actions-btn[data-n="menu"]') || qs('.lite-actions-btn');
  }
  function isLiteActionsOpener(el) {
    return !!el && (el.classList?.contains('lite-actions-btn') || el.dataset?.n === 'menu');
  }
  function focusLiveLiteActionsAfterRender() {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const live = liveLiteActionsBtn();
        if (live) live.focus({ preventScroll: true });
      });
    });
  }
  function escAttr(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  function returnFocusNavModalImmediate(returnFocusEl) {
    if (isLiteActionsOpener(returnFocusEl)) {
      const live = liveLiteActionsBtn();
      if (live) {
        live.focus({ preventScroll: true });
        return;
      }
    }
    if (returnFocusEl && document.contains(returnFocusEl)) returnFocusEl.focus({ preventScroll: true });
  }
  function demoFocusCapture(el) {
    if (!el?.dataset?.n) return null;
    const p = activeProject();
    return {
      projectId: p?.id,
      n: el.dataset.n,
      a: el.dataset.a || '',
      liteL2: view.liteL2,
      currentL1: p?.currentL1,
    };
  }
  function demoDelegFocusFromOpenCtx(openCtx) {
    const p = activeProject();
    return {
      projectId: openCtx?.projectId || p?.id,
      n: 'delegate',
      a: openCtx?.l2Id ? `l2:${openCtx.l2Id}` : openCtx?.l1Id ? `l1:${openCtx.l1Id}` : '',
      liteL2: openCtx?.l2Id || view.liteL2,
      currentL1: openCtx?.l1Id || p?.currentL1,
    };
  }
  function demoVisibleLiteL2Id(p) {
    const l1 = currentL1(p);
    if (!l1) return null;
    if (liteTransientApplies(p) && view.liteL2 && liteList(p, l1).some((x) => x.id === view.liteL2)) return view.liteL2;
    const cur = liteL2(p, l1);
    return cur?.id ?? null;
  }
  function taskAnchorL2(p, taskId) {
    for (const l1 of stages(p)) {
      for (const l2 of l2of(p, l1)) {
        if (tasksOf(p, l2).some((t) => t.id === taskId)) return { l1Id: l1.id, l2Id: l2.id };
      }
    }
    return null;
  }
  function resolveAcceptL2Id(p, openCtx) {
    if (openCtx?.l2Id) return openCtx.l2Id;
    const ids = openCtx?.taskIds || [];
    const visible = demoVisibleLiteL2Id(p);
    if (visible && ids.some((id) => taskAnchorL2(p, id)?.l2Id === visible)) return visible;
    const counts = new Map();
    ids.forEach((id) => {
      const a = taskAnchorL2(p, id);
      if (!a?.l2Id) return;
      counts.set(a.l2Id, (counts.get(a.l2Id) || 0) + 1);
    });
    let best = null;
    let top = 0;
    counts.forEach((n, l2Id) => {
      if (n > top) {
        top = n;
        best = l2Id;
      }
    });
    return best;
  }
  function demoAcceptOpenCtx(p, rep, asn) {
    const taskIds = rep?.taskIds || asn?.taskIds || [];
    const l2Id = resolveAcceptL2Id(p, { projectId: p.id, taskIds, l2Id: asn?.l2Id });
    const anchor = taskIds.length ? taskAnchorL2(p, taskIds[0]) : null;
    return {
      projectId: p.id,
      l1Id: anchor?.l1Id || asn?.l1Id || currentL1(p)?.id,
      l2Id,
      taskIds,
    };
  }
  /** Same project + owner is viewing the report’s L2 (do not pull them from another substage). */
  function demoAcceptL2PinOk(p, openCtx) {
    if (!openCtx?.projectId || p.id !== openCtx.projectId) return false;
    const l2Id = resolveAcceptL2Id(p, openCtx);
    if (!l2Id) return false;
    const l1 = currentL1(p);
    if (!l1) return false;
    const anchor = (openCtx.taskIds || []).map((id) => taskAnchorL2(p, id)).find(Boolean);
    if (openCtx.l1Id != null && anchor?.l1Id && openCtx.l1Id !== l1.id && anchor.l1Id !== l1.id) return false;
    const list = liteList(p, l1);
    if (!list.some((x) => x.id === l2Id)) return false;
    return demoVisibleLiteL2Id(p) === l2Id;
  }
  function applyDemoAcceptL2Pin(p, openCtx) {
    if (!openCtx?.projectId || p.id !== openCtx.projectId) return false;
    const l2Id = resolveAcceptL2Id(p, openCtx);
    if (!l2Id) return false;
    claimLiteTransient(p);
    view.liteL2 = l2Id;
    return true;
  }
  function demoPinL2ForAcceptIfVisible(p, openCtx) {
    if (!demoAcceptL2PinOk(p, openCtx)) return false;
    return applyDemoAcceptL2Pin(p, openCtx);
  }
  function liveDelegateTrigger(focusRef) {
    if (!focusRef?.projectId) return null;
    const p = activeProject();
    if (!p || p.id !== focusRef.projectId) return null;
    const D = window.RCNavDelegationDemo;
    const rep = D ? D.pendingReportActive(D.ensureState(p)) : null;
    if (rep) {
      const viewBtn = qs(`[data-n="demo-report-review"][data-a="${escAttr(rep.id)}"]`);
      if (viewBtn && document.contains(viewBtn)) return viewBtn;
    }
    if (focusRef.n === 'demo-report-review' && focusRef.a) {
      const noticeBtn = qs(`[data-n="demo-report-review"][data-a="${escAttr(focusRef.a)}"]`);
      if (noticeBtn && document.contains(noticeBtn)) return noticeBtn;
    }
    const delegateA =
      focusRef.a ||
      (focusRef.liteL2 ? `l2:${focusRef.liteL2}` : focusRef.currentL1 ? `l1:${focusRef.currentL1}` : '');
    if (delegateA) {
      const delegBtn = qs(`[data-n="delegate"][data-a="${escAttr(delegateA)}"]`);
      if (delegBtn && document.contains(delegBtn)) return delegBtn;
    }
    return qs('.nav-ctx-actions [data-n="delegate"]') || null;
  }
  function resolveDelegationFocusTarget(focusRef, returnFocusEl) {
    if (qs('#modal')?.classList?.contains('is-open')) return null;
    return (
      liveDelegateTrigger(focusRef) ||
      (returnFocusEl && document.contains(returnFocusEl) ? returnFocusEl : null) ||
      liveLiteActionsBtn() ||
      null
    );
  }
  function returnFocusDelegationAfterRender(focusRef, returnFocusEl) {
    const run = () => {
      if (qs('#modal')?.classList?.contains('is-open')) return;
      const live = resolveDelegationFocusTarget(focusRef, returnFocusEl);
      if (live) live.focus({ preventScroll: true });
    };
    if (window.RC_TEST && window.__demoFocusSync) run();
    else requestAnimationFrame(() => requestAnimationFrame(run));
  }
  function wireModalA11y(mo, { primarySelector, returnFocusEl, beforeClose } = {}) {
    cancelNavScrollFocus();
    const root = qs('#modal') || mo;
    teardownNavModalA11y(root);
    const box = qs('.modal__box', mo) || mo;
    const primary = primarySelector ? qs(primarySelector, mo) : null;
    const opener = returnFocusEl && returnFocusEl.focus ? returnFocusEl : null;
    const focusables = () =>
      [...qsa('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])', box)].filter(
        (el) => !el.disabled && el.offsetParent !== null
      );
    const closeAndReturn = () => {
      try {
        beforeClose?.();
      } catch (_) {
        /* prototype guard */
      }
      teardownNavModalA11y(root);
      closeModal();
      returnFocusNavModalImmediate(opener);
    };
    const onKeydown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeAndReturn();
        return;
      }
      if (e.key !== 'Tab') return;
      const els = focusables();
      if (!els.length) return;
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    const prevOnclick = root.onclick;
    root._navModalA11y = { onKeydown, prevOnclick };
    root.addEventListener('keydown', onKeydown, true);
    if (primary) primary.focus();
    else focusables()[0]?.focus();
    qsa('[data-close]', mo).forEach((b) => {
      b.onclick = closeAndReturn;
    });
    root.onclick = (e) => {
      if (e.target === root) closeAndReturn();
      else if (prevOnclick) prevOnclick.call(root, e);
    };
    return closeAndReturn;
  }
  function modalNav(html, { onOpen, primarySelector, delegReport, beforeClose } = {}, returnFocusEl) {
    teardownNavModalA11y(qs('#modal'));
    modal(html, {
      onOpen(mo) {
        if (delegReport) markDelegReportModal(mo);
        else markNavUxModal(mo);
        onOpen?.(mo);
        wireModalA11y(mo, {
          primarySelector,
          returnFocusEl,
          beforeClose: typeof beforeClose === 'function' ? beforeClose : null,
        });
      },
    });
  }
  function catalogReturnCtx(p, l1, { l2 = null } = {}) {
    if (!p || !l1?.id) return null;
    const onIntro = !p.introSeen[l1.id] && !liteSkipIntroActive(p, l1.id);
    const nrv = onIntro ? 'intro' : 'step';
    const l2Id = l2?.id || (nrv === 'step' ? demoVisibleLiteL2Id(p) : '') || '';
    if (nrv === 'step' && l2Id) {
      const list = l2of(p, l1);
      if (!list.some((x) => x.id === l2Id)) return null;
    }
    return { nrp: p.id, nrl1: l1.id, nrl2: l2Id, nrv };
  }
  function catalogReturnAppend(ctx) {
    if (!ctx?.nrp) return '';
    const q = new URLSearchParams();
    q.set('nrp', ctx.nrp);
    q.set('nrl1', ctx.nrl1);
    q.set('nrv', ctx.nrv || 'step');
    if (ctx.nrl2) q.set('nrl2', ctx.nrl2);
    const tail = q.toString();
    return tail ? `&${tail}` : '';
  }
  function validateCatalogReturn(params) {
    const nrp = params?.nrp;
    if (!nrp) return null;
    const p = state.projects.find((x) => x.id === nrp);
    if (!p) return null;
    const l1Id = params.nrl1;
    if (!l1Id) return null;
    const l1 = stages(p).find((s) => s.id === l1Id);
    if (!l1) return null;
    const nrv = params.nrv === 'intro' ? 'intro' : 'step';
    if (nrv === 'intro' && (p.introSeen[l1Id] || liteSkipIntroActive(p, l1Id))) return null;
    let l2Id = params.nrl2 || '';
    const list = l2of(p, l1);
    if (l2Id && !list.some((x) => x.id === l2Id)) return null;
    const l2 = l2Id ? list.find((x) => x.id === l2Id) : null;
    const stepLabel =
      nrv === 'intro'
        ? `этап «${l1.title}»`
        : l2
          ? `шаг «${l2.title}»`
          : `этап «${l1.title}»`;
    return {
      nrp: p.id,
      nrl1: l1Id,
      nrl2: l2Id || '',
      nrv,
      hint: `${esc(p.name)} · ${stepLabel}`,
    };
  }
  function performCatalogReturn(params) {
    const ctx = validateCatalogReturn(params);
    if (!ctx) return false;
    const p = state.projects.find((x) => x.id === ctx.nrp);
    if (!p) return false;
    state.activeProjectId = p.id;
    p.currentL1 = ctx.nrl1;
    claimLiteTransient(p);
    view.liteCelebrate = null;
    view.stageCompletePanel = null;
    view.liteFocusTask = null;
    if (ctx.nrv === 'intro') {
      view.liteL2 = null;
      view.liteMore = null;
      view.liteSkipIntro = null;
    } else {
      view.liteL2 = ctx.nrl2 || null;
      view.liteMore = null;
    }
    view.catalogReturnFocus = ctx.nrv === 'intro' ? 'intro' : ctx.nrl2 ? 'l2' : 'l1';
    go('#/navigator');
    renderApp();
    return true;
  }
  function focusAfterCatalogReturn() {
    const kind = view.catalogReturnFocus;
    if (!kind) return;
    view.catalogReturnFocus = null;
    const main = qs('#nav-main');
    if (!main) return;
    let el =
      kind === 'l2'
        ? qs('.now h2', main)
        : kind === 'intro'
          ? qs('.now--intro h2', main) || qs('.now h2', main)
          : qs('#nav-stage-title', main);
    if (!el) el = qs('#nav-stage-title', main);
    if (el) {
      if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
      el.focus({ preventScroll: false });
    }
    scrollToNavMain();
  }
  function catalogGoodsHref(p, l1, { l2 = null } = {}) {
    const ctx = catalogReturnCtx(p, l1, { l2 });
    return `#/catalog?sec=goods&stage=${encodeURIComponent(l1.id)}${catalogReturnAppend(ctx)}`;
  }
  function catalogServicesHref(p, l1, { l2 = null } = {}) {
    const ctx = catalogReturnCtx(p, l1, { l2 });
    return `#/catalog?sec=services&stage=${encodeURIComponent(l1.id)}${catalogReturnAppend(ctx)}`;
  }
  function liteTopActionsHtml(p, lv) {
    const t = totals(p);
    const settingsLabel = R(2) ? `Режим · ${lv.cur[0]}` : `Режим · ${t.percent} %`;
    const levelPill = R(2)
      ? `<span class="pill pill--amber lite-level-pill" title="Уровень маршрута">${icon('award')} ${lv.cur[0]}</span>`
      : '';
    return `<div class="row lite__actions" data-testid="lite-header-actions">
      <details class="lite__actions-settings" data-testid="lite-header-settings">
        <summary class="deleg-disclosure-summary small lite__actions-settings-sum lite__actions-settings-gear" data-testid="lite-settings-gear" aria-label="Настройки: режим, уровень и поиск" title="Настройки">${icon('settings', 'i--20')}<span class="lite__actions-settings-text" aria-hidden="true">${esc(settingsLabel)}</span></summary>
        <div class="lite__actions-bundle row" style="gap:.4rem;flex-wrap:wrap;align-items:center">
          <span class="pill pill--soft lite-mode-label" role="status">${icon('sparkles')} Лёгкий режим</span>
          ${levelPill}
          <button type="button" class="btn btn--ghost btn--sm btn--icon lite__actions-search" data-n="search" aria-label="Поиск по этапам и задачам">${icon('search')}</button>
        </div>
      </details>
      <div class="lite__actions-core row" style="gap:.4rem;flex-wrap:nowrap;align-items:center">
        <button type="button" class="btn btn--ghost btn--sm lite-actions-btn" data-n="menu">${icon('more-horizontal', 'i--16')} Действия</button>
        <button type="button" class="btn btn--ghost btn--sm lite-tools-btn" data-n="lite-tools">${icon('layout-grid')} Инструменты</button>
      </div>
    </div>`;
  }
  function navContextActionsBar(p, l1, { l2 = null } = {}) {
    const delegateA = l2 ? `l2:${l2.id}` : `l1:${l1.id}`;
    const scopeHint = l2
      ? `<span class="nav-ctx-actions__scope muted xs">Подбор для этапа «${esc(l1.title)}»</span>`
      : '';
    const deleg = p.shared
      ? ''
      : `<button type="button" class="nav-ctx-actions__btn link small" data-n="delegate" data-a="${delegateA}">${icon('hand-helping')} Поручить</button>`;
    const scopeClass = l2 ? ' nav-ctx-actions--has-scope' : '';
    return `<div class="nav-ctx-actions${scopeClass}" data-testid="nav-context-actions" role="toolbar" aria-label="Товары, услуги и поручение для этапа">
      <a class="nav-ctx-actions__btn link small" href="${catalogGoodsHref(p, l1, { l2 })}">${icon('shopping-bag')} Найти товары</a>
      <a class="nav-ctx-actions__btn link small" href="${catalogServicesHref(p, l1, { l2 })}">${icon('wrench')} Найти услуги</a>
      ${deleg}
      ${scopeHint}
    </div>`;
  }
  function renameProjectModal(p, returnFocusEl) {
    modalNav(
      `${modalHead('Название проекта')}<div class="stack"><input id="rename-input" value="${esc(p.name)}" placeholder="Мой ремонт" maxlength="${PROJECT_NAME_MAX_LEN}"><div class="row" style="justify-content:flex-end;gap:.5rem"><button type="button" class="btn btn--ghost" data-close>Отмена</button><button type="button" class="btn btn--primary" id="rename-ok">Сохранить</button></div></div>`,
      {
        primarySelector: '#rename-input',
        onOpen(mo) {
          const inp = qs('#rename-input', mo);
          const save = () => {
            const v = inp.value.trim();
            if (!v) return;
            if (v.length > PROJECT_NAME_MAX_LEN) return;
            p.name = v;
            teardownNavModalA11y(qs('#modal'));
            closeModal();
            renderApp();
            focusLiveLiteActionsAfterRender();
          };
          qs('#rename-ok', mo).onclick = save;
          inp.onkeydown = (e) => {
            if (e.key === 'Enter') save();
          };
        },
      },
      returnFocusEl
    );
  }
  function navHelpBlock() {
    return `<details class="nav-help"><summary>${icon('help-circle')} Как закрывать этап и заполнять задачи</summary>
      <ul>
        <li><b>Отметить весь этап выполненным</b> — отмечает только пункты чек-листа (включая свои), закрывает этап как пройденный. Не трогает расходы, поручения, таймеры и приёмку качества.</li>
        <li><b>Пропустить этап</b> — этап считается пропущенным в маршруте; пункты чек-листа могут остаться пустыми (как раньше «Уже сделано — пропустить»).</li>
        <li><b>Ответственный, дата и сумма</b> — в подробностях задачи: меню «⋯» (Lite и Full) или кнопка «Подробнее о задаче» (режим фокуса). Это <em>план</em> по задаче, не фактический расход. Поля необязательны.</li>
      </ul></details>`;
  }
  function stageCompletePanelBlock(p, l1) {
    if (view.stageCompletePanel !== l1.id || !l1Complete(p, l1.id)) return '';
    const s = stages(p), k = s.indexOf(l1), next = s[k + 1];
    const skipped = p.skippedL1.has(l1.id);
    const canUndo = !!p._bulkUndo && p._bulkUndo.l1Id === l1.id;
    return `<div class="card stage-complete-panel nav-fade-in" id="stage-complete-panel" tabindex="-1" role="region" aria-label="Этап закрыт">
      <div class="stage-complete-panel__ico">${icon('circle-check', 'i--24')}</div>
      <h3 class="stage-complete-panel__title">${skipped ? 'Этап отмечен как пропущенный' : 'Этап отмечен выполненным'}</h3>
      <p class="small muted">«${esc(l1.title)}» — ${skipped ? 'в маршруте без отметок чек-листа' : 'все пункты чек-листа отмечены'}. Расходы, поручения и таймеры не менялись.</p>
      <p class="small">${next ? `Следующий открытый этап: <b>${esc(next.title)}</b>. Переход только по кнопке ниже.` : 'Это последний этап маршрута — можно перейти к итогам.'}</p>
      <div class="row" style="gap:.6rem;flex-wrap:wrap;margin-top:1rem">
        ${next ? `<button type="button" class="btn btn--primary" data-n="stage-next" data-a="${next.id}">К следующему этапу ${icon('arrow-right')}</button>` : `<button type="button" class="btn btn--primary" data-n="summary">${icon('trophy')} К итогам ремонта</button>`}
        <button type="button" class="btn btn--ghost" data-n="stage-complete-dismiss" data-a="${l1.id}">Остаться на этапе</button>
        ${canUndo ? `<button type="button" class="btn btn--ghost" data-n="bulk-undo">${icon('rotate-ccw')} Отменить отметку этапа</button>` : ''}
      </div>
    </div>`;
  }

  function startFromEstimate(est) {
    const p = newProject({
      objectType: est.input.objectType,
      roomType: est.input.scope === 'room' ? est.input.roomType : null,
      estimate: est,
      locality: L.snapshot(est.input),
    });
    p.currentL1 = stages(p)[0].id;
    go('#/navigator?setup=1');
  }

  // ---------- Экран старта ----------
  function renderSetupLocality(p) {
    const loc = p.locality || defaultLocality();
    const custom = L.isCustom(loc);
    const vn = custom ? L.validateName(loc.localityName) : { ok: true };
    const vr = custom ? L.validateRegion(loc.localityRegion) : { ok: true };
    const err = custom && (!vn.ok ? vn.msg : !vr.ok ? vr.msg : '');
    const okStart = L.cityStepValid(loc, E.cities);
    return `<div class="setup-locality" style="margin-top:1.25rem">
      <div class="field__label" style="margin-bottom:.5rem">Населённый пункт объекта</div>
      <div class="picks picks--3 picks--setup-city">${E.cities
        .map((c) =>
          `<button type="button" class="pick pick--center ${!custom && loc.city === c.id ? 'is-on' : ''}" data-n="setup-city" data-a="${c.id}"><b>${esc(c.label)}</b>${c.cost !== 1 ? `<span>${c.cost > 1 ? '+' : ''}${Math.round((c.cost - 1) * 100)} % к ценам</span>` : ''}</button>`
        )
        .join('')}<button type="button" class="pick pick--center ${custom ? 'is-on' : ''}" data-n="setup-city" data-a="${L.CUSTOM}"><b>Другой населённый пункт</b><span>село, посёлок, станица…</span></button></div>
      ${
        custom
          ? `<div class="locality-fields" id="setup-locality-fields">
        <label class="field"><span class="field__label">Населённый пункт</span><input type="text" id="setup-loc-name" value="${esc(loc.localityName || '')}" maxlength="100" placeholder="Например, станица Старощербиновская" autocomplete="off"></label>
        <label class="field" style="margin-top:.75rem"><span class="field__label">Регион <span class="muted" style="font-weight:500">· необязательно</span></span><input type="text" id="setup-loc-region" value="${esc(loc.localityRegion || '')}" maxlength="100" placeholder="Краснодарский край" autocomplete="off"></label>
        <p class="locality-caveat">${esc(L.CAVEAT)}</p>
        ${err ? `<p class="locality-err" id="setup-loc-err" role="alert">${esc(err)}</p>` : `<p class="locality-err hide" id="setup-loc-err" role="alert"></p>`}
      </div>`
          : ''
      }
      <p class="small muted setup-place-preview" style="margin-top:.75rem" id="setup-place-preview">${icon('map-pin')} ${placeDisplayHtml(p, loc)}${custom ? ' · расчёт ориентировочный' : ''}</p>
    </div>
    <div class="field" style="margin-top:1.5rem"><div class="field__label">Название проекта <span class="muted" style="font-weight:500">· необязательно</span></div><input id="pname" value="${esc(p.name)}" placeholder="Например, Квартира на Красной"></div>
    <div class="calc__nav"><a class="btn btn--ghost" href="#/calc">${icon('arrow-left')} Назад</a><div class="right"><button class="btn btn--primary btn--lg" data-n="setup-done" ${!okStart ? 'disabled' : ''}>Начать ${icon('arrow-right')}</button></div></div>`;
  }
  function pageSetup(p) {
    if (!p.locality) p.locality = projectLocality(p.estimate);
    const s = stages(p);
    const type = by(E.objectTypes, p.objectType);
    return `<section class="section"><div class="wrap setup setup--lite">
      <span class="eyebrow eyebrow--red">${type.full}${p.roomType ? ` · ${by(E.rooms, p.roomType).label}` : ''} · ${fmt(p.area)} м²</span><h2 style="margin:.4rem 0 1.25rem">Где вы сейчас?</h2>
      <ol class="setup__list">${s.map((l1, k) => `<li><button type="button" class="setup__item ${p.currentL1 === l1.id ? 'is-on' : ''}" data-n="setup-start" data-a="${l1.id}"><span class="path__node">${stageIcon(l1.id)}<b>${k + 1}</b></span><b>${l1.title}</b>${icon('check', 'setup__check')}</button></li>`).join('')}</ol>
      ${renderSetupLocality(p)}
    </div></section>`;
  }
  function pageChooseType() {
    return `<section class="section"><div class="wrap setup">
      <span class="eyebrow eyebrow--red">Навигатор</span><h2 style="margin:.4rem 0 .5rem">С чего начнём?</h2>
      <p>Что ремонтируем?</p>
      <div class="picks" style="margin-top:1.5rem">${NAV.objectTypeOptions.map((t) => `<button type="button" class="pick" data-n="choose-type" data-a="${t.type}"><span class="pick__ico">${icon(by(E.objectTypes, t.type).icon, 'i--20')}</span><b>${t.title}</b><span>${t.subtitle}</span></button>`).join('')}</div>
      <div class="row" style="margin-top:1.5rem;justify-content:space-between"><a class="btn btn--ghost" href="#/calc">${icon('calculator')} Сначала посчитать</a>${state.projects.length ? `<button class="btn btn--ghost" data-n="projects">${icon('layers')} Мои проекты (${state.projects.length})</button>` : ''}</div>
    </div></section>`;
  }

  // ---------- Путь ремонта ----------
  function pathBlock(p, compact = false) {
    const s = stages(p), cur = currentL1(p), t = totals(p), fi = s.indexOf(focusL1(p));
    const l2All = s.flatMap((l1) => l2of(p, l1)), l2DoneN = l2All.filter((l2) => l2Done(p, l2)).length;
    const cnt = (l1, st) => compact ? `${l2of(p, l1).filter((l2) => l2Done(p, l2)).length}/${l2of(p, l1).length}` : `${st.done}/${st.total}`;
    return `<div class="path ${compact ? 'path--compact' : ''}"><div class="path__head"><span class="eyebrow">Путь ремонта</span><h3>Этап ${fi + 1} из ${s.length} · ${t.percent} %</h3>
      <div class="path__bar"><i style="width:${t.percent}%"></i></div>${compact ? '' : `<div class="path__caption"><span>${t.done} из ${t.total} задач</span><span>${t.l1done} ${plural(t.l1done, 'этап', 'этапа', 'этапов')} закрыто</span></div>`}</div>
      <ol class="path__list">${s.map((l1, k) => {
        const done = l1Complete(p, l1.id), unlocked = l1Unlocked(p, l1.id), sel = l1.id === cur.id, st = l1Stats(p, l1);
        const cls = [sel ? 'is-current' : '', done ? 'is-passed' : '', !unlocked && !done ? 'is-locked' : ''].join(' ');
        const em = sel ? 'Вы здесь' : done ? (p.skippedL1.has(l1.id) ? 'Пропущено' : 'Пройдено') : compact ? '' : !unlocked ? 'Закрыт' : `Этап ${k + 1}`;
        return `<li class="path__step ${cls}"><button type="button" class="path__btn" data-n="goto" data-a="${l1.id}" aria-pressed="${sel}"><span class="path__node">${unlocked || done ? stageIcon(l1.id) : icon('lock')}<b>${k + 1}</b></span><span class="path__text"><b>${l1.title}</b>${em ? `<em>${em}</em>` : ''}</span><small class="path__count">${done ? '✓' : cnt(l1, st)}</small></button></li>`;
      }).join('')}</ol></div>`;
  }
  function pathStrip(p) {
    const s = stages(p), cur = currentL1(p);
    return `<div class="path-strip side-mobile">${s.map((l1, k) => { const done = l1Complete(p, l1.id), unlocked = l1Unlocked(p, l1.id); return `<button type="button" class="${l1.id === cur.id ? 'is-current' : ''}" data-n="goto" data-a="${l1.id}"><span class="path__node ${done ? 'is-passed' : ''}" style="${done ? 'border-color:var(--primary);color:var(--primary)' : ''}${l1.id === cur.id ? 'background:var(--primary);border-color:var(--primary);color:#fff' : ''}">${unlocked || done ? stageIcon(l1.id) : icon('lock')}<b>${k + 1}</b></span><span>${l1.title}</span></button>`; }).join('')}</div>`;
  }

  // ---------- Основная страница ----------
  function pageNavigator(params) {
    const p = activeProject();
    if (p && window.RCNavDelegationDemo) window.RCNavDelegationDemo.hydrate(p);
    if (!p) return pageChooseType();
    if (params.setup) return pageSetup(p);
    if (params.stage && stages(p).some((s) => s.id === params.stage)) { p.currentL1 = params.stage; view.l2Open = null; view.stepIdx = 0; }
    const t = totals(p);
    const allL1Closed = t.l1done === t.l1 && t.l1 > 0;
    if (allL1Closed && !params.view && !view.stageCompletePanel) return pageCompletion(p);
    return pageLite(p);
    /* legacy full navigator (retained, not routed in lite-only presentation) */
    const cur = currentL1(p);
    return `<section class="section--tight"><div class="wrap">
      ${p.shared ? `<div class="notice notice--blue" style="margin-bottom:1rem">${icon('eye')}<span>Режим просмотра: вы открыли маршрут по общей ссылке. Изменения не сохраняются.</span> <button class="link small" data-n="unshare" style="margin-left:auto">Выйти</button></div>` : ''}
      ${ctxStrip(p)}
      ${pathStrip(p)}
      <div class="navpage" style="margin-top:1rem">
        <aside class="navpage__side">
          ${pathBlock(p)}
          <div class="side-desktop stack" style="gap:1rem">${sideCards(p)}</div>
        </aside>
        <main class="navpage__main" id="nav-main" tabindex="-1">
          ${p.roomType ? `<div class="notice notice--grey">${icon(ROOM_ICONS[p.roomType])}<span>Показаны этапы для одной комнаты: <b>${by(E.rooms, p.roomType).label}</b>.</span><button class="link small" data-n="room-all" style="margin-left:auto">Показать весь объект</button></div>` : ''}
          ${l1Card(p, cur)}
          ${stageCompletePanelBlock(p, cur)}
          ${l1Unlocked(p, cur.id) || l1Complete(p, cur.id) ? stageBody(p, cur) : ''}
          ${view.stageCompletePanel !== cur.id ? stageCTA(p, cur) : ''}
          <div class="side-mobile stack" style="gap:1rem">${sideCards(p)}</div>
        </main>
      </div></div>
      <button class="btn btn--dark fab" data-n="fab">${icon('target')} К текущему шагу</button></section>`;
  }
  function ctxStrip(p) {
    const t = totals(p), type = by(E.objectTypes, p.objectType), lv = levelOf(t.percent);
    const loc = p.locality || projectLocality(p.estimate);
    const customLoc = L.isCustom(loc);
    const nameHtml = customLoc ? `<b class="locality-text">${esc(p.name)}</b>` : `<b>${esc(p.name)}</b>`;
    return `<div class="ctx">${nameHtml}<span class="sep"></span><span class="muted ctx__place">${type.label} · ${fmt(p.area)} м² · ${icon('map-pin')} ${placeDisplayHtml({ ...p, locality: loc }, loc)}${customLoc ? ' · ориентировочно' : ''}</span><span class="sep"></span><span class="pill pill--amber">${icon('award')} ${lv.cur[0]}</span>
      <div class="row" style="margin-left:auto;gap:.5rem">
        <span class="pill pill--soft lite-mode-label" role="status">${icon('sparkles')} Лёгкий режим</span>
        <select class="btn btn--ghost btn--sm" data-n="profile" style="width:auto;min-height:36px;padding:.3rem .6rem">${PROFILES.map(([id, t]) => `<option value="${id}" ${p.profile === id ? 'selected' : ''}>${t}</option>`).join('')}</select>
        <button class="btn btn--ghost btn--sm btn--icon" data-n="search" aria-label="Поиск по этапам и задачам">${icon('search')}</button>
        <button class="btn btn--ghost btn--sm btn--icon" data-n="menu" aria-label="Действия с проектом">${icon('more-horizontal')}</button></div></div>`;
  }

  // ---------- Карточка этапа L1 ----------
  function l1Card(p, l1) {
    const s = stages(p), k = s.indexOf(l1), st = l1Stats(p, l1), done = l1Complete(p, l1.id), unlocked = l1Unlocked(p, l1.id);
    const plan = p.estimate ? (p.estimate.breakdown.find((b) => b.id === l1.id)?.total ?? stagePlan(p, l1.id)) : stagePlan(p, l1.id);
    const fact = stageFact(p, l1.id), diff = fact - plan;
    const links = D.stageLinks[l1.id] || { specialists: [], buy: [] };
    const canComplete = st.total > 0 && st.done === st.total;
    const mode = modeOf(p, l1);
    return `<div class="l1"><div class="l1__head"><div class="l1__ico ${done ? 'l1__ico--done' : !unlocked ? 'l1__ico--locked' : ''}">${done ? icon('check') : !unlocked ? icon('lock') : stageIcon(l1.id)}</div>
      <div><div class="row row--between"><span class="eyebrow">Этап ${k + 1} из ${s.length}${done ? ' · завершён' : !unlocked ? ' · закрыт' : ''}</span>
        </div>
        <h2 id="nav-stage-title" tabindex="-1" style="margin:.3rem 0 .4rem">${l1.title}</h2><p>${esc(l1.description)}</p>
        ${navContextActionsBar(p, l1)}
        <div class="l1__meta"><span class="pill">${l2of(p, l1).length} подэтапов</span><span class="pill">${st.done}/${st.total} задач</span><span class="pill">${icon('clock')} ≈ ${stageDays(p, l1.id)} дн.</span>${(links.specialists || []).slice(0, 3).map((sp) => `<a class="pill pill--blue" href="#/catalog?kind=specialist&cat=${sp}">${icon('user')} ${D.specializations[sp]}</a>`).join('')}</div>
        <div class="l1__progress" style="margin-top:.9rem"><i style="width:${st.pct}%"></i></div>
        ${!unlocked && !done ? `<div class="notice notice--amber" style="margin-top:1rem">${icon('lock')}<span>Этап откроется после завершения предыдущего — «${s[k - 1].title}». Если работы уже сделаны, отметьте выполнение или пропустите этап.</span><button class="btn btn--sm btn--ghost" data-n="skip-prev" data-a="${l1.id}" style="margin-left:auto;white-space:normal">Предыдущие уже сделаны</button></div>` : ''}
        ${unlocked && !done ? navHelpBlock() : ''}
        <div class="l1__actions l1__actions--stack">
          ${!done && unlocked ? `<button type="button" class="btn btn--primary" data-n="bulk-complete-ask" data-a="${l1.id}">${icon('list-checks')} Отметить весь этап выполненным</button>
          ${canComplete ? `<button type="button" class="btn btn--ghost" data-n="complete-l1" data-a="${l1.id}">${icon('check-check')} Закрыть этап (все задачи уже отмечены)</button>` : `<span class="small muted" style="align-self:center">осталось ${st.total - st.done} ${plural(st.total - st.done, 'задача', 'задачи', 'задач')} в чек-листе</span>`}
          <button type="button" class="btn btn--ghost btn--muted" data-n="skip-l1-ask" data-a="${l1.id}">${icon('arrow-right')} Пропустить этап (без чек-листа)</button>` : ''}
          ${done ? `<span class="pill pill--green">${icon('circle-check')} ${p.skippedL1.has(l1.id) ? 'Этап пропущен' : 'Этап выполнен'}</span><button class="btn btn--ghost btn--sm" data-n="reopen-l1" data-a="${l1.id}">Открыть заново</button>` : ''}
        </div></div></div>
      <div class="l1__budget"><div><span>План</span><b>${moneyShort(plan)}</b></div><div><span>Факт</span><b>${fact ? moneyShort(fact) : '—'}</b></div><div><span>Отклонение</span><b class="${diff > 0 ? 'red' : fact ? 'green' : 'muted'}">${fact ? (diff > 0 ? '+' : '') + moneyShort(diff) : '—'}</b></div></div>
      <div class="l1__tools">
        <button class="btn btn--ghost btn--sm" data-n="expense" data-a="${l1.id}">${icon('receipt')} Добавить расход</button>
        <button class="btn btn--ghost btn--sm" data-n="docs" data-a="${l1.id}">${icon('file-text')} Документы${p.documents.filter((d) => d.stageL1Id === l1.id).length ? ` (${p.documents.filter((d) => d.stageL1Id === l1.id).length})` : ''}</button>
        ${(() => {
          const rep = delegContractorReportsUi(p);
          if (!rep.showEntry) return '';
          return `<button type="button" class="btn btn--ghost btn--sm" data-n="events" data-a="${l1.id}">${icon('message-circle')} ${rep.pendingCount > 1 ? 'От исполнителей' : 'Отчёты исполнителей'}${rep.showBadge ? ` <span class="pill pill--red">${rep.pendingCount}</span>` : ''}</button>`;
        })()}
        ${NAV.materials.some((m) => m.stageL1Id === l1.id) ? `<button class="btn btn--ghost btn--sm" data-n="materials" data-a="${l1.id}">${icon('shopping-bag')} Список покупок</button>` : ''}
        ${NAV.materialCalcItems.some((m) => m.stageL1Id === l1.id) ? `<button class="btn btn--ghost btn--sm" data-n="matcalc" data-a="${l1.id}">${icon('calculator')} Расход материалов</button>` : ''}
        ${NAV.marketPrices.some((m) => m.stageL1Id === l1.id) ? `<button class="btn btn--ghost btn--sm" data-n="prices" data-a="${l1.id}">${icon('trending-up')} Цены на работы</button>` : ''}
        ${links.buy.length ? `<a class="btn btn--ghost btn--sm" href="#/catalog?kind=store&stage=${l1.id}">${icon('store')} Что купить</a>` : ''}
        <button class="btn btn--ghost btn--sm" data-n="delegate" data-a="l1:${l1.id}">${icon('hand-helping')} Поручить этап</button>
      </div></div>`;
  }

  // ---------- Тело этапа по режиму ----------
  function stageBody(p, l1) {
    const mode = modeOf(p, l1), list = l2of(p, l1);
    if (!list.length) return `<div class="empty">Для этого типа объекта подэтапов нет.</div>`;
    if (mode === 'list') {
      const open = view.l2Open && list.some((x) => x.id === view.l2Open) ? view.l2Open : (list.find((l2) => !l2Done(p, l2)) || list[0]).id;
      return list.map((l2, k) => l2Item(p, l1, l2, k, l2.id === open)).join('');
    }
    if (mode === 'steps') {
      const idx = Math.min(view.stepIdx, list.length - 1), l2 = list[idx];
      return `<div class="row row--between"><span class="eyebrow">Подэтап ${idx + 1} из ${list.length}</span><div class="row" style="gap:.4rem"><button class="btn btn--ghost btn--sm btn--icon" data-n="step" data-a="-1" ${idx === 0 ? 'disabled' : ''}>${icon('chevron-left')}</button><button class="btn btn--ghost btn--sm btn--icon" data-n="step" data-a="1" ${idx === list.length - 1 ? 'disabled' : ''}>${icon('chevron-right')}</button></div></div>
        <div class="l1__progress"><i style="width:${(idx + 1) / list.length * 100}%"></i></div>
        ${l2Item(p, l1, l2, idx, true)}
        <div class="row row--between"><button class="btn btn--ghost" data-n="step" data-a="-1" ${idx === 0 ? 'disabled' : ''}>${icon('arrow-left')} Назад</button><button class="btn btn--primary" data-n="step" data-a="1" ${idx === list.length - 1 ? 'disabled' : ''}>Следующий подэтап ${icon('arrow-right')}</button></div>`;
    }
    // focus — одна задача
    const flat = list.flatMap((l2) => tasksOf(p, l2).map((t) => ({ l2, t })));
    const pending = flat.filter((x) => !p.completedTasks.has(x.t.id));
    if (!pending.length) return `<div class="card card--pad-lg nav-focus-empty nav-fade-in" style="text-align:center"><div class="completion" style="padding:0"><div class="big">${icon('check', 'i--24')}</div><h3>Все задачи этапа выполнены</h3><p class="small" style="margin-top:.4rem">Закройте этап — появится панель с переходом к следующему, без автоматического прыжка.</p></div><div class="row" style="justify-content:center;gap:.6rem;margin-top:1rem;flex-wrap:wrap"><button type="button" class="btn btn--primary" data-n="complete-l1" data-a="${l1.id}">${icon('check-check')} Закрыть этап</button><button type="button" class="btn btn--ghost" data-n="bulk-complete-ask" data-a="${l1.id}">${icon('list-checks')} Отметить этап выполненным</button></div></div>`;
    const cur = pending[Math.min(view.focusSkip, pending.length - 1)];
    const timer = NAV.timerConfigs.find((x) => x.taskId === cur.t.id);
    return `<div class="card card--pad-lg"><div class="row row--between"><span class="eyebrow">${icon('target')} Задача ${flat.length - pending.length + 1} из ${flat.length}</span><span class="pill">${esc(cur.l2.title)}</span></div>
      <h2 style="margin:1rem 0 .5rem;font-size:1.5rem">${esc(cur.t.title)}</h2>
      <p class="small">${esc(cur.l2.description)}</p>
      <div class="l2__sub" style="margin-top:.6rem"><span>${icon('user')} ${esc(cur.l2.specialist)}</span><span>${icon('clock')} ${esc(cur.l2.duration)}</span></div>
      ${cur.l2.warnings && cur.l2.warnings[0] && p.profile !== 'control' ? `<div class="tip tip--warn" style="margin-top:1rem">${icon('alert-triangle')}<span>${esc(cur.l2.warnings[0])}</span></div>` : ''}
      ${timer ? timerBlock(p, timer) : ''}
      <div class="row" style="margin-top:1.5rem;gap:.6rem"><button class="btn btn--primary btn--lg" data-n="task" data-a="${cur.t.id}">${icon('check')} Готово</button><button class="btn btn--ghost btn--lg" data-n="focus-skip">Пропустить пока</button><button class="btn btn--ghost btn--lg" data-n="delegate" data-a="task:${cur.t.id}">${icon('hand-helping')} Поручить</button><button class="btn btn--ghost btn--lg btn--icon" data-n="task-detail" data-a="${cur.t.id}" aria-label="Подробнее о задаче">${icon('pencil')}</button></div></div>`;
  }

  // ---------- Подэтап L2 ----------
  function l2Item(p, l1, l2, k, open) {
    const tasks = tasksOf(p, l2), done = tasks.filter((t) => p.completedTasks.has(t.id)).length, all = tasks.length > 0 && done === tasks.length;
    const diff = l2.difficulty ? DIFF[l2.difficulty] : null;
    const qc = NAV.qualityChecklists.find((q) => q.stageL2Id === l2.id);
    const showTips = p.profile !== 'control';
    const links = D.stageLinks[l1.id] || { specialists: [] };
    return `<div class="l2 ${all ? 'is-done' : ''} ${open ? 'is-open is-active' : ''}">
      <button class="l2__head" data-n="l2" data-a="${l2.id}" aria-expanded="${open}"><span class="l2__num">${all ? icon('check') : k + 1}</span>
        <span><span class="l2__title">${hl(l2.title)}</span><span class="l2__sub"><span>${icon('user')} ${esc(l2.specialist)}</span><span>${icon('clock')} ${esc(l2.duration)}</span>${diff ? `<span class="pill ${diff[1]}">${diff[0]}</span>` : ''}${p.workers[l2.id] ? `<span class="pill">${icon('hard-hat')} ${esc(p.workers[l2.id].name)}</span>` : ''}</span></span>
        <span class="l2__right"><span class="pill ${all ? 'pill--green' : ''}">${done}/${tasks.length}</span>${icon('chevron-down', 'l2__chev')}</span></button>
      ${open ? `<div class="l2__body">
        <p class="l2__desc">${esc(l2.description)}</p>
        ${l2.criticalError && showTips ? `<div class="tip tip--warn">${icon('alert-triangle')}<span><b>Критическая ошибка:</b> ${esc(l2.criticalError)}</span></div>` : ''}
        ${navContextActionsBar(p, l1, { l2 })}
        <div class="block"><div class="block__head"><h4>${icon('square-check')} Чек-лист · ${done}/${tasks.length}</h4><div class="row" style="gap:.4rem"><button class="btn btn--ghost btn--sm" data-n="add-task" data-a="${l2.id}">${icon('plus')} Своя задача</button><button class="btn btn--ghost btn--sm" data-n="l2-all" data-a="${l2.id}">${all ? 'Снять отметки' : 'Отметить все'}</button></div></div>
          <ul class="tasks">${tasks.map((t) => taskRow(p, t, l2)).join('')}</ul>
          ${view.sel && view.sel.size ? `<div class="notice notice--red" style="margin-top:.3rem">${icon('hand-helping')}<span>Выбрано ${view.sel.size} ${plural(view.sel.size, 'задача', 'задачи', 'задач')}</span><div class="row" style="margin-left:auto;gap:.4rem"><button class="btn btn--primary btn--sm" data-n="delegate" data-a="sel">Поручить выбранные</button><button class="btn btn--ghost btn--sm" data-n="sel-clear">Сбросить</button></div></div>` : ''}
        </div>
        ${NAV.timerConfigs.filter((t) => tasks.some((x) => x.id === t.taskId)).map((t) => timerBlock(p, t)).join('')}
        ${qc ? qcBlock(p, qc) : ''}
        ${showTips ? tipsBlock(p, l2) : ''}
        ${p.profile === 'beginner' && l2.usefulLinks && l2.usefulLinks.length ? `<div class="block block--soft"><h4>${icon('link')} Полезные ссылки</h4>${l2.usefulLinks.map((u) => `<a class="row small" href="${esc(u.url)}" target="_blank" rel="noopener" style="gap:.5rem;align-items:flex-start">${icon(u.type === 'video' ? 'play-circle' : 'book-open')}<span><b class="ink">${esc(u.title)}</b><br><span class="muted xs">${esc(u.description || '')}</span></span></a>`).join('')}</div>` : ''}
        <div class="grid2">
          <div class="block"><div class="block__head"><h4>${icon('pencil')} Заметки</h4></div><textarea data-n="note" data-a="${l2.id}" placeholder="Договорённости, размеры, артикулы…">${esc(p.notes[l2.id] || '')}</textarea></div>
          <div class="block"><div class="block__head"><h4>${icon('hard-hat')} Кто выполнял</h4><button class="btn btn--ghost btn--sm" data-n="worker" data-a="${l2.id}">${p.workers[l2.id] ? 'Изменить' : 'Указать'}</button></div>
            ${p.workers[l2.id] ? `<div class="small"><b>${esc(p.workers[l2.id].name)}</b><br><a class="link small" href="tel:${esc(p.workers[l2.id].phone)}">${icon('phone')} ${esc(p.workers[l2.id].phone)}</a>${p.workers[l2.id].note ? `<br><span class="muted">${esc(p.workers[l2.id].note)}</span>` : ''}</div>` : `<p class="xs">Имя и телефон мастера — пригодятся для гарантии и повторных работ.</p>`}
            <a class="link small" href="#/catalog?kind=specialist&stage=${l1.id}">${icon('users')} Найти: ${esc(l2.specialist)}</a></div>
        </div>
        <div class="block"><div class="block__head"><h4>${icon('camera')} Фотоотчёт</h4><div class="tabs-mini">${PHOTO_CATS.map(([id, t]) => `<button data-n="photo" data-a="${l2.id}" data-b="${id}">+ ${t}</button>`).join('')}</div></div>
          <div class="photos">${(p.photos[l2.id] || []).map((ph) => `<div class="photo">${icon('camera', 'i--20')}<span>${PHOTO_CATS.find((c) => c[0] === ph.cat)[1]}<br>${dateRu(ph.date)}</span></div>`).join('')}<div class="photo photo--add" data-n="photo" data-a="${l2.id}" data-b="process">${icon('plus', 'i--20')}<span>Добавить фото</span></div></div>
          <p class="xs">Фото скрытых работ (разводка, гидроизоляция) — ваш аргумент в спорах и для гарантии.</p></div>
      </div>` : ''}</div>`;
  }
  function hl(text) { if (!view.search) return esc(text); const re = new RegExp('(' + view.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig'); return esc(text).replace(re, '<span class="hl">$1</span>'); }
  function taskRow(p, t, l2) {
    const done = p.completedTasks.has(t.id), meta = p.taskMeta[t.id] || {}, custom = !!t.custom, sel = view.sel && view.sel.has(t.id);
    const { main } = short(t.title);
    const blocked = delegationTaskToggleBlocked(p, t.id);
    const boxClass = blocked ? 'task__box task__box--deleg-blocked' : 'task__box';
    const boxA11y = taskCheckboxA11y(p, t.id, main, done);
  return `<li class="task ${done ? 'is-done' : ''} ${sel ? 'is-selected' : ''}">
      <span class="${boxClass}" data-n="task" data-a="${t.id}" ${boxA11y}>${icon('check')}</span>
      <span class="task__main"><span class="task__title" data-n="task-detail" data-a="${t.id}">${hl(t.title)}</span>
        ${custom || meta.note ? `<span class="task__meta">${custom ? '<span class="pill">своя</span>' : ''}${meta.note ? `<span class="pill" title="${esc(meta.note)}">${icon('pencil')} заметка</span>` : ''}</span>` : ''}</span>
      <span class="row" style="gap:.35rem;flex-wrap:nowrap;align-self:flex-start"><input type="checkbox" class="task__sel" data-n="sel" data-a="${t.id}" ${sel ? 'checked' : ''} aria-label="Выбрать для поручения"><button class="btn btn--ghost btn--sm btn--icon task__more" data-n="task-detail" data-a="${t.id}" aria-label="Детали задачи" style="width:30px;min-height:30px">${icon('more-horizontal')}</button></span></li>`;
  }
  function timerBlock(p, t) {
    const start = p.timers[t.taskId];
    if (start) { const left = Math.max(0, start + t.durationHours * 3600e3 - Date.now()); const h = Math.round(left / 3600e3); return `<div class="timer timer--active">${icon('hourglass', 'i--24')}<div><b>${esc(t.title)} — идёт</b><span>Осталось ≈ ${h >= 48 ? `${Math.round(h / 24)} дн.` : `${h} ч`} · ${esc(t.warningText)}</span></div><button class="btn btn--ghost btn--sm" data-n="timer-stop" data-a="${t.taskId}">Сбросить</button></div>`; }
    return `<div class="timer">${icon('timer', 'i--24')}<div><b>${esc(t.title)} · ${t.durationHours >= 48 ? `${Math.round(t.durationHours / 24)} дн.` : `${t.durationHours} ч`}</b><span>${esc(t.description)}</span></div><button class="btn btn--dark btn--sm" data-n="timer-start" data-a="${t.taskId}">Запустить таймер</button></div>`;
  }
  function qcBlock(p, qc, { readonly = false } = {}) {
    const done = qc.checks.filter((c) => p.qc.has(c.id)).length;
    const dis = readonly ? ' disabled aria-disabled="true"' : '';
    return `<div class="block"><div class="block__head"><h4>${icon('shield-check')} ${esc(qc.title)} · ${done}/${qc.checks.length}</h4><span class="pill pill--amber">приёмка качества</span></div>
      <div class="qc">${qc.checks.map((c) => `<label class="qc__item ${p.qc.has(c.id) ? 'is-done' : ''}" style="margin:0;color:var(--ink);font-weight:500"><input type="checkbox" data-n="qc" data-a="${c.id}" ${p.qc.has(c.id) ? 'checked' : ''}${dis} style="margin-top:2px"><span>${esc(c.text)} ${c.critical ? '<span class="pill pill--red">критично</span>' : ''}<small>${c.tool ? `Инструмент: ${esc(c.tool)}` : ''}${c.tolerance ? ` · Допуск: ${esc(c.tolerance)}` : ''}</small></span></label>`).join('')}</div></div>`;
  }
  function tipsBlock(p, l2) {
    const open = p.profile === 'beginner';
    const items = [...(l2.sequence ? [['seq', 'list-ordered', 'Когда делать', l2.sequence]] : []), ...(l2.tips || []).map((x) => ['', 'lightbulb', 'Совет', x]), ...(l2.warnings || []).map((x) => ['warn', 'alert-triangle', 'Внимание', x]), ...(l2.lifehacks || []).map((x) => ['hack', 'sparkles', 'Лайфхак', x])];
    if (!items.length) return '';
    return `<details class="block block--soft" ${open ? 'open' : ''}><summary class="block__head" style="cursor:pointer;list-style:none"><h4>${icon('lightbulb')} Советы и предупреждения (${items.length})</h4><span class="xs muted">${open ? '' : 'раскрыть'}</span></summary>
      <div class="tips">${items.map(([cls, ic, lab, txt]) => `<div class="tip ${cls ? 'tip--' + cls : ''}">${icon(ic)}<span><b>${lab}:</b> ${esc(txt)}</span></div>`).join('')}</div></details>`;
  }
  function liteMoreTipsFold(p, l2, { skipWarning = '' } = {}) {
    const warnings = (l2.warnings || []).filter((x) => x !== skipWarning);
    const items = [
      ...(l2.sequence ? [['seq', 'list-ordered', 'Когда делать', l2.sequence]] : []),
      ...(l2.tips || []).map((x) => ['', 'lightbulb', 'Совет', x]),
      ...warnings.map((x) => ['warn', 'alert-triangle', 'Внимание', x]),
      ...(l2.lifehacks || []).map((x) => ['hack', 'sparkles', 'Лайфхак', x]),
    ];
    if (!items.length) return '';
    return `<details class="lite-more-fold lite-more-fold--tips" data-testid="lite-more-tips-fold">
      <summary class="deleg-disclosure-summary small">${icon('lightbulb')} Советы и предупреждения · ${items.length}</summary>
      <div class="lite-more-fold__body lite-more-tips">${items.map(([cls, ic, lab, txt]) => `<div class="tip ${cls ? 'tip--' + cls : ''}">${icon(ic)}<span><b>${lab}:</b> ${esc(txt)}</span></div>`).join('')}</div>
    </details>`;
  }
  function liteMorePanelHtml(p, l1, l2) {
    const qc = NAV.qualityChecklists.find((q) => q.stageL2Id === l2.id);
    const tasks = tasksOf(p, l2);
    const allMarked = tasks.length > 0 && tasks.every((t) => p.completedTasks.has(t.id));
    const prominent = l2.criticalError
      ? `<div class="lite-more-panel__critical" data-testid="lite-more-critical">${icon('alert-triangle')}<span><b>Критически важно:</b> ${esc(l2.criticalError)}</span></div>`
      : (l2.warnings || [])[0]
        ? `<div class="lite-more-panel__critical lite-more-panel__critical--warn" data-testid="lite-more-critical">${icon('alert-triangle')}<span><b>Внимание:</b> ${esc(l2.warnings[0])}</span></div>`
        : '';
    const notesOpen = !!(p.notes[l2.id] || p.workers[l2.id]);
    const photoCount = (p.photos[l2.id] || []).length;
    const linkCount = (l2.usefulLinks || []).length;
    const mediaCount = photoCount + linkCount;
    const mediaOpen = photoCount > 0;
    const noteAttrs = p.shared ? ' readonly disabled aria-readonly="true"' : '';
    const notesWorker = `<div class="grid2 lite-more-notes">
      <div class="block block--quiet"><div class="block__head lite-more-block__head"><h4 class="small">${icon('pencil')} Заметки</h4></div><textarea class="lite-more-notes__area" data-n="note" data-a="${l2.id}" placeholder="Договорённости, размеры, артикулы…"${noteAttrs}>${esc(p.notes[l2.id] || '')}</textarea>${p.shared ? '<p class="xs muted lite-more-notes__ro" style="margin:.35rem 0 0">Режим просмотра — заметки только для чтения.</p>' : ''}</div>
      <div class="block block--quiet"><div class="block__head lite-more-block__head lite-more-worker-head"><h4 class="small">${icon('hard-hat')} Кто выполнял</h4><button type="button" class="btn btn--ghost btn--sm lite-more-worker-btn" data-n="worker" data-a="${l2.id}"${p.shared ? ' disabled aria-disabled="true"' : ''}>${p.workers[l2.id] ? 'Изменить' : 'Указать'}</button></div>${p.workers[l2.id] ? `<div class="small"><b>${esc(p.workers[l2.id].name)}</b><br><a class="link small" href="tel:${esc(p.workers[l2.id].phone)}">${esc(p.workers[l2.id].phone)}</a></div>` : '<p class="xs muted" style="margin:0">Имя и телефон — для гарантии и повторных работ.</p>'}</div>
    </div>`;
    const photosLinks = `<div class="lite-more-fold__body lite-more-media">
        <div class="block block--quiet"><div class="block__head lite-more-block__head"><h4 class="small">${icon('camera')} Фото</h4><div class="tabs-mini lite-more-photo-tabs">${PHOTO_CATS.map(([id, t]) => `<button type="button" data-n="photo" data-a="${l2.id}" data-b="${id}"${p.shared ? ' disabled aria-disabled="true"' : ''}>+ ${t}</button>`).join('')}</div></div>
        <div class="photos">${(p.photos[l2.id] || []).map((ph) => `<div class="photo lite-more-photo"><span class="lite-more-photo__icon" aria-hidden="true">${icon('camera', 'i--20')}</span><span class="lite-more-photo__cap">${PHOTO_CATS.find((c) => c[0] === ph.cat)[1]}<br>${dateRu(ph.date)}</span></div>`).join('')}<button type="button" class="photo photo--add lite-more-photo-add" data-n="photo" data-a="${l2.id}" data-b="process"${p.shared ? ' disabled aria-disabled="true"' : ''} aria-label="Добавить фото в отчёт"><span class="lite-more-photo__icon" aria-hidden="true">${icon('plus', 'i--20')}</span><span class="lite-more-photo__cap">Добавить</span></button></div></div>
      ${l2.usefulLinks && l2.usefulLinks.length ? `<div class="block block--quiet block--soft"><h4 class="small">${icon('link')} Ссылки</h4>${l2.usefulLinks.map((u) => `<a class="row small lite-more-link-row" href="${esc(u.url)}" target="_blank" rel="noopener">${icon(u.type === 'video' ? 'play-circle' : 'book-open')}<b class="ink">${esc(u.title)}</b></a>`).join('')}</div>` : ''}
    </div>`;
    const actions = `<div class="lite-more-panel__actions">
      <button type="button" class="btn btn--ghost btn--sm" data-n="add-task" data-a="${l2.id}">${icon('plus')} Своя задача</button>
      <button type="button" class="btn btn--ghost btn--sm" data-n="concierge" data-a="l2:${l2.id}">${icon('sparkles')} Консьерж</button>
      <a class="btn btn--ghost btn--sm" href="#/catalog?kind=specialist&stage=${l1.id}">${icon('users')} ${esc(l2.specialist)}</a>
      <button type="button" class="btn btn--ghost btn--sm" data-n="l2-all" data-a="${l2.id}">${allMarked ? 'Снять отметки' : 'Отметить все'}</button>
    </div>`;
    return `<div class="now__more lite-more-panel" data-testid="lite-more-panel">
      ${l2.description ? `<p class="small lite-more-panel__desc">${esc(l2.description)}</p>` : ''}
      ${prominent}
      ${liteMoreTipsFold(p, l2, { skipWarning: !l2.criticalError && (l2.warnings || [])[0] ? (l2.warnings || [])[0] : '' })}
      ${qc ? `<div class="lite-more-panel__qc">${qcBlock(p, qc, { readonly: p.shared })}</div>` : ''}
      <details class="lite-more-fold" data-testid="lite-more-notes-fold"${notesOpen ? ' open' : ''}>
        <summary class="deleg-disclosure-summary small">${icon('pencil')} Заметки и исполнитель</summary>
        ${notesWorker}
      </details>
      <details class="lite-more-fold" data-testid="lite-more-media-fold"${mediaOpen ? ' open' : ''}>
        <summary class="deleg-disclosure-summary small">${icon('camera')} Фото и ссылки${mediaCount ? ` · ${mediaCount}` : ''}</summary>
        ${photosLinks}
      </details>
      <details class="lite-more-fold" data-testid="lite-more-actions-fold">
        <summary class="deleg-disclosure-summary small">${icon('more-horizontal')} Дополнительные действия</summary>
        <div class="lite-more-fold__body">${actions}</div>
      </details>
    </div>`;
  }
  function stageCTA(p, l1) {
    const s = stages(p), k = s.indexOf(l1), next = s[k + 1];
    if (!l1Complete(p, l1.id)) return '';
    return `<div class="card card--dark"><div class="row row--between"><div><span class="eyebrow" style="color:rgba(248,252,248,.7)">Этап «${l1.title}» закрыт</span><h3 style="margin-top:.3rem;color:#fff">${next ? `Дальше — ${next.title}` : 'Это был последний этап'}</h3><p class="small" style="margin-top:.3rem">${next ? `${l2of(p, next).length} подэтапов · ≈ ${stageDays(p, next.id)} дн. · ${(D.stageLinks[next.id]?.specialists || []).slice(0, 2).map((x) => D.specializations[x]).join(', ')}` : 'Посмотрите итоги ремонта в цифрах.'}</p></div>
      <div class="row" style="gap:.5rem">${next ? `<button class="btn btn--primary" data-n="goto" data-a="${next.id}">Перейти ${icon('arrow-right')}</button><a class="btn btn--light" href="#/catalog?kind=specialist&stage=${next.id}">${icon('users')} Найти специалистов</a>` : `<button class="btn btn--primary" data-n="summary">${icon('trophy')} Итоги ремонта</button>`}</div></div></div>`;
  }

  // ---------- Боковые карточки (legacy full layout; shared blocks reused in lite) ----------
  function calendarSummaryHtml(p) {
    const startD = new Date(p.startDate);
    const total = stages(p).reduce((a, s) => a + stageDays(p, s.id), 0);
    const endD = new Date(startD.getTime() + total * 864e5);
    const activeTimers = Object.keys(p.timers).map((id) => NAV.timerConfigs.find((x) => x.taskId === id)).filter(Boolean);
    const dateControl = p.shared
      ? `<b>${startD.toLocaleDateString('ru-RU')}</b>`
      : `<input type="date" class="lite-date-input" value="${esc(p.startDate)}" data-n="start-date" aria-label="Дата старта ремонта">`;
    return `<div class="rows lite-rows"><div><span>Старт</span><b>${dateControl}</b></div><div><span>Ожидаемое окончание</span><b id="lite-cal-end">${endD.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</b></div><div><span>Всего по этапам</span><b>${total} дн.</b></div></div>
      ${activeTimers.length ? `<div class="lite-timers" style="margin-top:.5rem">${activeTimers.map((tm) => `<div class="tip tip--seq"><span>${icon('hourglass')} ${esc(tm.title)}: до ${dateRu(p.timers[tm.taskId] + tm.durationHours * 3600e3)}</span></div>`).join('')}</div>` : ''}
      <button type="button" class="btn btn--ghost btn--sm btn--block lite-cal-open" data-n="calendar">План по этапам</button>`;
  }
  function weeklyPlanTaskRows(p) {
    return stages(p)
      .filter((l1) => l1Unlocked(p, l1.id) && !l1Complete(p, l1.id))
      .flatMap((l1) => l2of(p, l1).flatMap((l2) => tasksOf(p, l2).filter((x) => !p.completedTasks.has(x.id)).map((x) => ({ l1, l2, x }))))
      .slice(0, 4);
  }
  function weeklyPlanGroups(rows) {
    const groups = [];
    rows.forEach((w) => {
      const last = groups[groups.length - 1];
      if (last && last.l1.id === w.l1.id && last.l2.id === w.l2.id) last.tasks.push(w.x);
      else groups.push({ l1: w.l1, l2: w.l2, tasks: [w.x] });
    });
    return groups;
  }
  function weeklyPlanStatsHtml(p) {
    const t = totals(p);
    const activeTimerCount = Object.keys(p.timers).length;
    return `<div class="lite-week-plan__stats" role="group" aria-label="Прогресс по всему ремонту">
      <div class="lite-week-plan__stat">
        <span class="lite-week-plan__stat-label">Выполнено</span>
        <b class="lite-week-plan__stat-val">${t.done}</b>
        <span class="lite-week-plan__stat-of">из ${t.total} по ремонту</span>
      </div>
      <div class="lite-week-plan__stat">
        <span class="lite-week-plan__stat-label">Таймеры</span>
        <b class="lite-week-plan__stat-val">${activeTimerCount}</b>
        <span class="lite-week-plan__stat-hint">активных</span>
      </div>
    </div>`;
  }
  function weeklyPlanHtml(p) {
    const weekly = weeklyPlanTaskRows(p);
    const intro = `<p class="lite-week-plan__intro xs muted">Ближайшие задачи открытых этапов</p>`;
    if (!weekly.length) {
      return `<div class="lite-week-plan" data-testid="lite-week-plan">${intro}<p class="small muted lite-week-plan__empty">Все открытые задачи выполнены.</p>${weeklyPlanStatsHtml(p)}</div>`;
    }
    const groups = weeklyPlanGroups(weekly);
    const groupsHtml = groups
      .map(
        (g) => `<section class="lite-week-plan__group">
        <header class="lite-week-plan__group-head">
          <span class="lite-week-plan__l1">${esc(g.l1.title)}</span>
          <span class="lite-week-plan__l2">${esc(g.l2.title)}</span>
        </header>
        <ul class="lite-week-plan__tasks">${g.tasks
          .map(
            (x) => `<li class="lite-week-plan__task"><button type="button" class="lite-week-plan__task-btn" data-n="goto-task" data-a="${esc(g.l1.id)}" data-b="${esc(g.l2.id)}" data-c="${esc(x.id)}"><span class="lite-week-plan__task-title">${esc(short(x.title).main)}</span><span class="lite-week-plan__task-chev" aria-hidden="true">${icon('chevron-right', 'i--16')}</span></button></li>`
          )
          .join('')}</ul>
      </section>`
      )
      .join('');
    return `<div class="lite-week-plan" data-testid="lite-week-plan">${intro}<div class="lite-week-plan__groups">${groupsHtml}</div>${weeklyPlanStatsHtml(p)}</div>`;
  }
  function levelAchievementsHtml(p) {
    const t = totals(p);
    const lv = levelOf(t.percent);
    const ach = D.achievements.map((a) => ({ ...a, on: a.test({ percent: t.percent, completedL1: t.l1done }) }));
    return `<div class="level"><div class="level__ico">${icon('trophy', 'i--20')}</div><div><b>${lv.cur[0]}</b><div class="small muted">${lv.next ? `До «${lv.next[0]}» — ещё ${lv.next[1] - t.percent} %` : 'Максимальный уровень'}</div><div class="l1__progress" style="margin-top:.35rem"><i style="width:${t.percent}%;background:var(--amber)"></i></div></div></div>
      <div class="ach" style="margin-top:.75rem">${ach.map((a) => `<div class="${a.on ? 'is-on' : ''}" title="${esc(a.title)} — ${esc(a.desc)}">${icon(a.on ? 'award' : 'lock')}</div>`).join('')}</div><p class="small muted" style="margin-top:.4rem">${ach.filter((a) => a.on).length} из ${ach.length} достижений</p>`;
  }
  function knowledgeListHtml(items) {
    return `<ul class="lite-know-cat__list">${items.map((x) => `<li class="lite-know-cat__item"><p class="lite-know-cat__text">${esc(x)}</p></li>`).join('')}</ul>`;
  }
  function knowledgeHtml() {
    const saveN = D.savingTips.length;
    const errN = D.commonMistakes.length;
    return `<div class="lite-know-panel" data-testid="lite-know-panel" data-lite-know-acc>
      <p class="lite-know-panel__lead xs muted">Советы по бюджету и частым ошибкам.</p>
      <div class="lite-know-cats">
        <details class="lite-know-cat" data-testid="lite-know-savings">
          <summary class="deleg-disclosure-summary lite-know-cat__sum"><span class="lite-know-cat__label">Экономия</span><span class="lite-know-cat__count muted" aria-hidden="true">${saveN}</span></summary>
          <div class="lite-know-cat__body">${knowledgeListHtml(D.savingTips)}</div>
        </details>
        <details class="lite-know-cat" data-testid="lite-know-mistakes">
          <summary class="deleg-disclosure-summary lite-know-cat__sum"><span class="lite-know-cat__label">Частые ошибки</span><span class="lite-know-cat__count muted" aria-hidden="true">${errN}</span></summary>
          <div class="lite-know-cat__body">${knowledgeListHtml(D.commonMistakes)}</div>
        </details>
      </div>
    </div>`;
  }
  function knowledgeModal(p, returnFocusEl) {
    modalNav(
      `${modalHead(RENOVATION_ADVICE_TITLE, 'Экономия и частые ошибки')}${knowledgeHtml()}<div class="modal__foot"><button type="button" class="btn btn--ghost" data-close style="min-height:2.75rem">Закрыть</button></div>`,
      {
        onOpen(mo) {
          bindKnowledgeAccordion(mo);
        },
      },
      returnFocusEl
    );
  }
  function bindKnowledgeAccordion(root) {
    const scope = root || document;
    qsa('[data-lite-know-acc]', scope).forEach((host) => {
      if (host.dataset.knowBound === '1') return;
      host.dataset.knowBound = '1';
      const blocks = qsa('details.lite-know-cat', host);
      blocks.forEach((d) => {
        d.addEventListener('toggle', () => {
          if (d.open) blocks.forEach((o) => { if (o !== d) o.removeAttribute('open'); });
        });
      });
    });
  }
  function delegReportInboxScopeLine(row, asn) {
    const inReport = (row?.taskIds || []).length;
    const inAsn = (asn?.taskIds || []).length;
    const scope =
      asn?.scopeTitle && inAsn && inReport !== inAsn
        ? `${esc(asn.scopeTitle)} (${inAsn} ${plural(inAsn, 'пункт', 'пункта', 'пунктов')} в поручении)`
        : asn?.scopeTitle
          ? esc(asn.scopeTitle)
          : inAsn
            ? `Поручение: ${inAsn} ${plural(inAsn, 'пункт', 'пункта', 'пунктов')}`
            : '';
    const report = `В отчёте: ${inReport} ${plural(inReport, 'пункт', 'пункта', 'пунктов')}`;
    const parts = [scope, report, 'на проверке'].filter(Boolean);
    return parts.join(' · ');
  }
  function liteRetainedPanels(p) {
    const knowledge = renovationAdviceAdjacent(p)
      ? `<details class="card side-card lite-panel lite-panel--know">${litePanelSummary(`${icon('book-open')} ${RENOVATION_ADVICE_TITLE}`)}<div class="lite-panel__body">${knowledgeHtml()}</div></details>`
      : '';
    const levelPanel = R(2)
      ? `<details class="card side-card lite-panel">${litePanelSummary(`${icon('award')} Уровень и достижения`)}<div class="lite-panel__body">${levelAchievementsHtml(p)}</div></details>`
      : '';
    return `<details class="card side-card lite-panel" open>${litePanelSummary(`${icon('calendar')} Календарь`)}<div class="lite-panel__body">${calendarSummaryHtml(p)}</div></details>
      <details class="card side-card lite-panel">${litePanelSummary(`${icon('footprints')} План на неделю`)}<div class="lite-panel__body">${weeklyPlanHtml(p)}</div></details>
      ${levelPanel}
      ${knowledge}`;
  }
  function sideCards(p) {
    const t = totals(p), lv = levelOf(t.percent), plan = planTotal(p), fact = factTotal(p);
    const pct = plan ? Math.min(100, Math.round(fact / plan * 100)) : 0;
    const est = p.estimate;
    return `
      <div class="card side-card"><h4>${icon('wallet')} ${est ? 'Бюджет по оценке' : 'Бюджет'}</h4>
        ${est ? `<div class="rows"><div><span>Ремонт</span><b>${moneyShort(est.min)} – ${moneyShort(est.max)}</b></div><div><span>Срок</span><b>${duration(est.dmin)} – ${duration(est.dmax)}</b></div><div><span>Уровень</span><b>${by(E.segments, est.input.segment).label}</b></div></div>` : `<p class="xs">План считается по площади ${fmt(p.area)} м² и уровню «${NAV.priceLevelLabels[p.level]}».</p>`}
        <div class="rows" style="margin-top:.5rem"><div><span>Потрачено</span><b class="${fact > plan ? 'red' : ''}">${money(fact)}</b></div><div><span>План</span><b>${money(plan)}</b></div></div>
        <div class="l1__progress" style="margin:.5rem 0"><i style="width:${pct}%;${fact > plan ? 'background:var(--amber)' : ''}"></i></div>
        ${fact > plan ? `<div class="notice notice--amber xs" style="padding:.5rem .7rem">${icon('alert-triangle')}<span>Превышение плана на ${moneyShort(fact - plan)}</span></div>` : ''}
        <div class="row" style="gap:.5rem"><button class="btn btn--dark btn--sm grow" data-n="budget">${icon('receipt')} Расходы</button><a class="btn btn--ghost btn--sm" href="#/calc?step=1">${est ? 'Пересчитать' : 'Оценить'}</a></div>
        ${window.RCProjectCalcs ? window.RCProjectCalcs.libraryLink('proj-calcs-entry') : ''}</div>
      <div class="card side-card"><h4>${icon('calendar')} Календарь ремонта</h4>${calendarSummaryHtml(p)}</div>
      <div class="card side-card"><h4>${icon('footprints')} План на неделю</h4>${weeklyPlanHtml(p)}</div>
      ${R(2) ? `<div class="card side-card"><h4>${icon('award')} Уровень и достижения</h4>${levelAchievementsHtml(p)}</div>` : ''}
      <div class="card side-card"><h4>${icon('wrench')} Инструменты</h4><div class="tools"><a href="#/catalog">${icon('store', 'i--20')}Каталог</a><a href="#/concierge">${icon('sparkles', 'i--20')}Консьерж</a><button class="btn" data-n="matcalc" data-a="all" style="display:flex;flex-direction:column;gap:.4rem;align-items:flex-start;padding:.8rem;border-radius:var(--r-md);border:1px solid var(--line);font-size:var(--text-xs);font-weight:700;min-height:0;color:var(--ink)">${icon('calculator', 'i--20')}Калькуляторы</button></div></div>
      ${renovationAdviceAdjacent(p) ? `<div class="card side-card"><h4>${icon('book-open')} ${RENOVATION_ADVICE_TITLE}</h4>${knowledgeHtml()}</div>` : ''}
      <div class="card side-card card--soft"><h4>${icon('gift')} Пригласить друга</h4><p class="xs">Другу — маршрут и скидки партнёров, вам — бонус консьержа.</p><button class="btn btn--ghost btn--sm btn--block" data-n="invite">Скопировать приглашение</button></div>`;
  }

  // ---------- Лёгкий режим: порционная подача ----------
  // Принцип: минимум текста. На экране один шаг, одна главная кнопка. Подробности — только по запросу.
  const liteList = (p, l1) => l2of(p, l1);
  function liteL2(p, l1) {
    const list = liteList(p, l1);
    if (liteTransientApplies(p) && view.liteL2 && list.some((x) => x.id === view.liteL2)) return list.find((x) => x.id === view.liteL2);
    return list.find((l2) => !l2Done(p, l2)) || list[list.length - 1];
  }
  // Короткая формулировка: убираем скобки и хвост после « — », остальное — в подсказку
  function short(text) {
    const m = String(text).match(/^(.*?)\s*[\(（](.+?)[\)）]\s*(.*)$/);
    if (m) return { main: (m[1] + (m[3] ? ' ' + m[3] : '')).trim(), hint: m[2] };
    const d = String(text).split(/\s[—–-]\s/);
    if (d.length > 1 && d[0].length > 12) return { main: d[0].trim(), hint: d.slice(1).join(' — ').trim() };
    return { main: text, hint: '' };
  }
  const litePlan = (p, l1) => p.estimate ? (p.estimate.breakdown.find((b) => b.id === l1.id)?.total ?? stagePlan(p, l1.id)) : stagePlan(p, l1.id);
  const dots = (n, i, doneFn) => `<div class="dots" aria-hidden="true">${Array.from({ length: n }, (_, j) => `<i class="${j === i ? 'is-cur' : ''} ${doneFn && doneFn(j) ? 'is-done' : ''}"></i>`).join('')}</div>`;

  function pageLite(p) {
    const s = stages(p), cur = currentL1(p), k = s.indexOf(cur);
    const done = l1Complete(p, cur.id), unlocked = l1Unlocked(p, cur.id);
    const list = liteList(p, cur);
    const t = totals(p);
    const lv = levelOf(t.percent);
    let main;
    if (done) {
      main = view.stageCompletePanel === cur.id ? stageCompletePanelBlock(p, cur) : liteStageDone(p, cur);
    }
    else if (!unlocked) main = liteLocked(p, cur);
    else if (!p.introSeen[cur.id] && !liteSkipIntroActive(p, cur.id)) main = liteIntro(p, cur);
    else if (view.liteCelebrate && list.some((x) => x.id === view.liteCelebrate)) main = liteCelebrate(p, cur, list.find((x) => x.id === view.liteCelebrate));
    else if (liteTransientApplies(p) && view.liteL2 && list.some((x) => x.id === view.liteL2) && !l1Complete(p, cur.id)) {
      main = liteNow(p, cur, list.find((x) => x.id === view.liteL2)) + liteNext(p, cur);
    } else if (list.every((l2) => l2Done(p, l2))) main = liteStageFinish(p, cur);
    else main = liteNow(p, cur, liteL2(p, cur)) + liteNext(p, cur);
    return `<section class="section--tight"><div class="wrap lite">
      ${p.shared ? `<div class="notice notice--blue" style="margin-bottom:1rem">${icon('eye')}<span>Режим просмотра</span><button class="link small" data-n="unshare" style="margin-left:auto">Выйти</button></div>` : ''}
      <div class="lite__top">
        <div class="lite__title">${(() => { const loc = p.locality || projectLocality(p.estimate); const custom = L.isCustom(loc); return custom ? `<span class="eyebrow locality-text">${esc(p.name)}</span>` : `<span class="eyebrow">${esc(p.name)}</span>`; })()}${litePlaceSummary(p)}<h2 class="h-sm" id="nav-stage-title" tabindex="-1">Этап ${k + 1} из ${s.length} · ${cur.title}</h2></div>
        ${liteTopActionsHtml(p, lv)}
      </div>
      ${pathStrip(p)}
      <div class="navpage lite__grid" style="margin-top:1rem">
        <aside class="navpage__side">${pathBlock(p, true)}<div class="side-desktop stack" style="gap:.75rem">${liteSide(p, cur)}</div></aside>
        <main class="navpage__main" id="nav-main" tabindex="-1">${p.roomType ? `<div class="notice notice--grey lite-room-notice">${icon(ROOM_ICONS[p.roomType])}<span>Показаны этапы для одной комнаты: <b>${esc(by(E.rooms, p.roomType).label)}</b>.</span><button type="button" class="btn btn--ghost btn--sm lite-room-all" data-n="room-all">Показать весь объект</button></div>` : ''}${main}<div class="side-mobile stack" style="gap:.75rem">${liteSide(p, cur)}</div></main>
      </div></div>
      <button type="button" class="btn btn--dark fab lite-fab" data-n="fab" aria-label="К текущему шагу">${icon('target')}<span class="fab__label">Текущий шаг</span></button></section>`;
  }
  function liteIntroOutlineHtml(p, l1, { testId = false } = {}) {
    const list = liteList(p, l1);
    const tid = testId ? ' data-testid="lite-intro-outline"' : '';
    return `<ol class="lite-intro-outline"${tid}>${list
      .map((l2, j) => {
        const n = tasksOf(p, l2).length;
        const done = l2Done(p, l2);
        return `<li class="lite-intro-outline__item${done ? ' is-done' : ''}"><span class="lite-intro-outline__num" aria-hidden="true">${done ? icon('check') : j + 1}</span><span class="lite-intro-outline__body"><b class="lite-intro-outline__title">${esc(l2.title)}</b><span class="xs muted">${n} ${plural(n, 'пункт', 'пункта', 'пунктов')} · ${esc(l2.duration)}</span></span></li>`;
      })
      .join('')}</ol>`;
  }
  // Вступление к этапу: факты, состав L2, один главный старт
  function liteIntro(p, l1) {
    const list = liteList(p, l1);
    const days = stageDays(p, l1.id);
    const descMore = view.liteDesc === l1.id ? `<p class="small lite-intro__desc-more">${esc(l1.description)}</p>` : '';
    return `<div class="now now--intro lite-intro" data-testid="lite-stage-intro">
      <div class="lite-intro__layout">
        <div class="lite-intro__main">
          <div class="lite-intro__head">
            <div class="now__ico lite-intro__ico">${stageIcon(l1.id)}</div>
            <h2 class="lite-intro__title">${l1.title}</h2>
          </div>
          <p class="small muted lite-intro__desc">${esc(l1.description)}</p>
          <div class="nav-stage-facts" data-testid="lite-intro-facts">
            <div><b>${list.length}</b><span>${plural(list.length, 'шаг', 'шага', 'шагов')}</span></div>
            <div><b>≈ ${days}</b><span>${plural(days, 'день', 'дня', 'дней')}</span></div>
            <div><b>${moneyShort(litePlan(p, l1))}</b><span>по смете</span></div>
          </div>
        </div>
        <aside class="lite-intro__aside" aria-label="Состав этапа">
          <div class="lite-intro__compose lite-intro__compose--desktop card card--soft">
            <h3 class="eyebrow lite-intro__compose-label">Состав этапа</h3>
            ${liteIntroOutlineHtml(p, l1, { testId: true })}
          </div>
          <details class="lite-intro__compose lite-intro__compose--mobile card card--soft">
            <summary class="deleg-disclosure-summary small">Состав этапа · ${list.length} ${plural(list.length, 'шаг', 'шага', 'шагов')}</summary>
            <div class="lite-intro__compose-body">${liteIntroOutlineHtml(p, l1)}</div>
          </details>
        </aside>
      </div>
      ${navContextActionsBar(p, l1)}
      <div class="lite-intro__foot">
        <button type="button" class="btn btn--primary" data-n="stage-begin" data-a="${l1.id}">${icon('play')} Начать этап</button>
      </div>
      <div class="lite-intro__secondary">
        <button type="button" class="link small" data-n="lite-desc" data-a="${l1.id}">${view.liteDesc === l1.id ? 'Скрыть' : 'Что это за этап?'}</button>
        <button type="button" class="btn btn--ghost btn--sm" data-n="bulk-complete-ask" data-a="${l1.id}">${icon('list-checks')} Отметить весь этап выполненным</button>
        <button type="button" class="link small muted" data-n="skip-l1-ask" data-a="${l1.id}">Пропустить этап</button>
      </div>
      ${descMore}</div>`;
  }
  function liteLocked(p, l1) {
    const s = stages(p), k = s.indexOf(l1);
    return `<div class="now now--intro"><div class="now__ico now__ico--muted">${icon('lock')}</div><h2>${l1.title}</h2>
      <p class="small">Сначала — «${s[k - 1].title}».</p>
      <div class="row" style="gap:.6rem"><button class="btn btn--ghost" data-n="skip-prev" data-a="${l1.id}">Предыдущие уже сделаны</button><button class="btn btn--primary" data-n="fab">К текущему шагу</button></div></div>`;
  }
  function liteBulkUndoStrip(p, l1) {
    const snap = p._bulkUndo;
    if (!snap || snap.l1Id !== l1.id || l1Complete(p, l1.id)) return '';
    const n = (snap.addedTasks || []).length;
    if (!n) return '';
    return `<div class="notice notice--soft bulk-undo-strip" data-testid="lite-bulk-undo" style="margin:.65rem 0;padding:.65rem .75rem;display:flex;flex-wrap:wrap;align-items:center;gap:.5rem">
      <span class="small">Отмечено ${n} ${plural(n, 'свой пункт', 'своих пункта', 'своих пунктов')} — порученные не затронуты.</span>
      <button type="button" class="btn btn--ghost btn--sm" data-n="bulk-undo" style="min-height:2.75rem">${icon('rotate-ccw')} Отменить отметку своих пунктов</button>
    </div>`;
  }
  // Текущий шаг
  function liteNow(p, l1, l2) {
    const list = liteList(p, l1), i = list.indexOf(l2), tasks = tasksOf(p, l2), done = tasks.filter((t) => p.completedTasks.has(t.id)).length;
    const warn = l2.criticalError || (l2.warnings || [])[0], tip = warn || (l2.tips || [])[0];
    const timers = NAV.timerConfigs.filter((t) => tasks.some((x) => x.id === t.taskId));
    const more = view.liteMore === l2.id;
    const limit = 5, shown = view.liteAllTasks === l2.id ? tasks : tasks.slice(0, limit);
    const allDone = tasks.length > 0 && done === tasks.length;
    const remain = Math.max(0, tasks.length - done);
    return `<div class="now now--step">
      <div class="now__head">${dots(list.length, i, (j) => l2Done(p, list[j]))}<span class="xs muted">Шаг ${i + 1} из ${list.length}</span></div>
      <h2 class="now__step-title">${esc(l2.title)}</h2>
      <p class="xs muted now__step-meta">${icon('user')} ${esc(l2.specialist)} · ${esc(l2.duration)}</p>
      ${navContextActionsBar(p, l1, { l2 })}
      ${(() => {
        const D = window.RCNavDelegationDemo;
        if (!D || p.shared) return '';
        const ctx = demoDelegScope(p, { l2, l1 });
        return D.scopedDelegationBanner(p, ctx) || '';
      })()}
      ${liteBulkUndoStrip(p, l1)}
      ${tip ? `<button class="tip tip--btn ${warn ? 'tip--warn' : ''} ${view.liteTip === l2.id ? 'is-open' : ''}" data-n="lite-tip" data-a="${l2.id}">${icon(warn ? 'alert-triangle' : 'lightbulb')}<span>${esc(tip)}</span></button>` : ''}
      <ul class="tasks tasks--big">${shown.map((t) => liteTask(p, t)).join('')}</ul>
      ${tasks.length > limit && view.liteAllTasks !== l2.id ? `<button class="link small" data-n="lite-all-tasks" data-a="${l2.id}">Ещё ${tasks.length - limit} ${plural(tasks.length - limit, 'пункт', 'пункта', 'пунктов')}</button>` : ''}
      ${timers.map((t) => timerBlock(p, t)).join('')}
      <div class="lite-step-actions">
        ${allDone
          ? `<button type="button" class="btn btn--primary btn--lg btn--block" data-n="lite-done" data-a="${l2.id}">${icon('arrow-right')} Дальше — подэтап выполнен</button>`
          : `<button type="button" class="btn btn--primary btn--lg btn--block" disabled aria-disabled="true">Осталось ${remain} ${plural(remain, 'пункт', 'пункта', 'пунктов')} чек-листа</button>
          <p class="xs muted lite-step-actions__hint">Отмечайте задачи по одной. Закрытие подэтапа доступно, когда всё отмечено.</p>`}
        ${l1Unlocked(p, l1.id) && !l1Complete(p, l1.id) ? `<button type="button" class="btn btn--ghost btn--block" data-n="bulk-complete-ask" data-a="${l1.id}">${icon('list-checks')} Отметить весь этап выполненным</button>` : ''}
      </div>
      <div class="now__links now__links--compact">
        <button type="button" class="link small" data-n="lite-more" data-a="${l2.id}" aria-expanded="${more}">${icon(more ? 'chevron-up' : 'chevron-down')} Подробнее</button>
        <button type="button" class="link small muted" data-n="lite-skip" data-a="${l2.id}">Пропустить</button>
      </div>
      ${more ? liteMorePanelHtml(p, l1, l2) : ''}
    </div>`;
  }
  function delegationTaskToggleBlocked(p, taskId) {
    const D = window.RCNavDelegationDemo;
    if (!D || D.ownerMayToggleTask(p, taskId)) return null;
    const ph = D.taskPhase(p, taskId);
    const td = D.ensureState(p)?.taskDemo?.[taskId];
    if (ph === 'review') return 'На проверке — отметка недоступна, откройте проверку отчёта';
    if (ph === 'assigned' && td?.returnNote) return 'На доработке у исполнителя — отметка недоступна';
    return 'Поручено исполнителю — отметка недоступна';
  }
  function taskCheckboxA11y(p, taskId, titleMain, done) {
    const blocked = delegationTaskToggleBlocked(p, taskId);
    const label = blocked ? `${titleMain}. ${blocked}` : titleMain;
    return blocked
      ? `role="checkbox" aria-checked="${done}" aria-disabled="true" aria-label="${escAttr(label)}" tabindex="0"`
      : `role="checkbox" aria-checked="${done}" aria-disabled="false" aria-label="${escAttr(label)}" tabindex="0"`;
  }
  function handleDelegatedTaskActivate(p, taskId, el) {
    const D = window.RCNavDelegationDemo;
    const blocked = delegationTaskToggleBlocked(p, taskId);
    if (!blocked) return false;
    const s = D.ensureState(p);
    const ph = D.taskPhase(p, taskId);
    if (ph === 'review') {
      const rep = (s.pendingReports || []).find((r) => r.status === 'pending' && r.taskIds.some((id) => String(id) === String(taskId)));
      if (rep) {
        demoReportReviewModal(p, rep.id, el);
        return true;
      }
    }
    const asnId = s.taskDemo?.[taskId]?.assignmentId;
    if (asnId && D.assignmentById(s, asnId)?.status === 'active') {
      demoAssignmentDetailModal(p, asnId, el);
      return true;
    }
    toast(blocked);
    return true;
  }
  function liteTask(p, t) {
    const done = p.completedTasks.has(t.id);
    const { main, hint } = short(t.title);
    const focusClass = liteTransientApplies(p) && view.liteFocusTask === t.id ? ' is-focus' : '';
    const delegLine = window.RCNavDelegationDemo ? window.RCNavDelegationDemo.taskAttributionLine(p, t.id) : '';
    const boxA11y = taskCheckboxA11y(p, t.id, main, done);
    const blocked = delegationTaskToggleBlocked(p, t.id);
    const boxClass = blocked ? 'task__box task__box--deleg-blocked' : 'task__box';
    return `<li class="task ${done ? 'is-done' : ''}${focusClass}" id="lite-task-${esc(t.id)}" data-lite-task="${esc(t.id)}"><span class="${boxClass}" data-n="task" data-a="${t.id}" ${boxA11y}>${icon('check')}</span>
      <span class="task__main"><span class="task__title" data-n="task" data-a="${t.id}" tabindex="-1">${esc(main)}</span>${delegLine || ''}${hint ? `<span class="task__hint">${esc(hint)}</span>` : ''}</span>
      <button class="btn btn--ghost btn--sm btn--icon task__more" data-n="task-detail" data-a="${t.id}" aria-label="Детали задачи">${icon('more-horizontal')}</button></li>`;
  }
  // Дальше — только названия
  function liteNext(p, l1) {
    const s = stages(p), k = s.indexOf(l1), list = liteList(p, l1), cur = liteL2(p, l1), i = list.indexOf(cur);
    const rest = list.slice(i + 1), prev = list.slice(0, i), nextL1 = s[k + 1];
    const row = (l2, j) => `<li class="${l2Done(p, l2) ? 'is-done' : ''}"><button data-n="lite-open" data-a="${l2.id}"><span class="nextlist__num">${l2Done(p, l2) ? icon('check') : j + 1}</span><b>${esc(l2.title)}</b>${icon('chevron-right')}</button></li>`;
    if (!rest.length && !prev.length && !nextL1) return '';
    return `<div class="nextlist">
      <ol>${prev.length ? `<li class="nextlist__more"><button class="link small muted" data-n="lite-prev-toggle">${view.litePrev ? 'Скрыть пройденные' : `Пройдено: ${prev.length}`}</button></li>` : ''}${view.litePrev ? prev.map(row).join('') : ''}
      ${rest.slice(0, 3).map((l2, j) => row(l2, i + j + 1)).join('')}
      ${rest.length > 3 ? `<li class="nextlist__more">ещё ${rest.length - 3}</li>` : ''}
      ${nextL1 ? `<li class="nextlist__l1"><span class="path__node">${stageIcon(nextL1.id)}</span><b>Потом: ${nextL1.title}</b></li>` : ''}</ol></div>`;
  }
  // Шаг закрыт — пауза
  function liteCelebrate(p, l1, l2) {
    const list = liteList(p, l1), i = list.indexOf(l2), next = list.slice(i + 1).find((x) => !l2Done(p, x)) || list.find((x) => !l2Done(p, x));
    const t = totals(p);
    return `<div class="now now--ok"><div class="now__ico now__ico--ok">${icon('check')}</div>
      <h2>Готово</h2><p class="lead">${esc(l2.title)} · ${t.percent} % пути</p>
      ${next ? `<div class="nextcard"><span class="xs muted">Дальше</span><b>${esc(next.title)}</b><small>${esc(next.duration)}</small></div>` : ''}
      <div class="row" style="gap:.6rem;flex-wrap:wrap"><button class="btn btn--primary btn--lg" data-n="lite-next">${next ? `Продолжить ${icon('arrow-right')}` : `${icon('flag')} Закрыть этап`}</button><a class="btn btn--ghost btn--lg" href="#/">Вернусь позже</a></div>
      <button class="link small" data-n="expense" data-a="${l1.id}">${icon('receipt')} Записать расход</button></div>`;
  }
  // Все шаги этапа сделаны — деньги и закрытие
  function liteStageFinish(p, l1) {
    const s = stages(p), k = s.indexOf(l1), plan = litePlan(p, l1), fact = stageFact(p, l1.id), next = s[k + 1];
    const variance = budgetVariance(plan, fact, p.expenses.some((e) => e.stageL1Id === l1.id), true);
    return `<div class="now now--ok"><div class="now__ico now__ico--ok">${icon('flag')}</div>
      <h2>${l1.title} — сделано</h2>
      <div class="nav-stage-facts"><div><b>${moneyShort(plan)}</b><span>по смете</span></div><div><b class="${fact > plan ? 'red' : ''}">${fact ? moneyShort(fact) : '—'}</b><span>потрачено</span></div><div class="budget-variance budget-variance--${variance.kind}" data-testid="stage-budget-variance"><b>${variance.amount}</b><span>${icon(variance.icon)} ${variance.label}</span></div></div>
      <div class="row" style="gap:.6rem;flex-wrap:wrap"><button class="btn btn--ghost btn--lg" data-n="expense" data-a="${l1.id}">${icon('receipt')} ${fact ? 'Ещё расход' : 'Сколько потратили?'}</button><button class="btn btn--primary btn--lg" data-n="complete-l1" data-a="${l1.id}">${next ? `Дальше ${icon('arrow-right')}` : 'Завершить'}</button></div>
      <div class="row" style="gap:1rem"><button class="link small" data-n="docs" data-a="${l1.id}">${icon('file-text')} Чеки и акты</button><button class="link small muted" data-n="lite-open" data-a="${liteList(p, l1)[0].id}">Шаги этапа</button></div></div>`;
  }
  function liteStageDone(p, l1) {
    const s = stages(p), k = s.indexOf(l1), next = s[k + 1];
    return `<div class="now now--ok"><div class="now__ico now__ico--ok">${icon('check')}</div><h2>${l1.title} — ${p.skippedL1.has(l1.id) ? 'пропущено' : 'сделано'}</h2>
      ${next ? `<div class="nextcard"><span class="xs muted">Дальше</span><b>${next.title}</b><small>${liteList(p, next).length} ${plural(liteList(p, next).length, 'шаг', 'шага', 'шагов')} · ≈ ${stageDays(p, next.id)} дн.</small></div>` : ''}
      <div class="row" style="gap:.6rem;flex-wrap:wrap">${next ? `<button class="btn btn--primary btn--lg" data-n="goto" data-a="${next.id}">К следующему этапу ${icon('arrow-right')}</button>` : `<button class="btn btn--primary btn--lg" data-n="summary">${icon('trophy')} Итоги</button>`}<button class="btn btn--ghost" data-n="reopen-l1" data-a="${l1.id}">Открыть заново</button></div></div>`;
  }
  // Боковая колонка: три короткие карточки
  function liteSide(p, l1) {
    const plan = planTotal(p), fact = factTotal(p), pct = plan ? Math.min(100, Math.round(fact / plan * 100)) : 0;
    const repUi = delegContractorReportsUi(p);
    return `<div class="card side-card side-card--tight lite-money-card" data-testid="lite-money-card"><div class="row row--between lite-money-card__head"><h4 class="lite-money-card__title" style="margin:0">${icon('wallet')} Бюджет ремонта</h4><span class="small lite-money-card__totals"><b class="${fact > plan ? 'red' : ''}">${moneyShort(fact)}</b> <span class="muted">/ ${moneyShort(plan)}</span></span></div>
        <p class="lite-money-card__hint xs muted" data-testid="lite-money-hint">Расходы по всем этапам</p>
        <div class="l1__progress lite-money-card__bar" style="margin:.5rem 0 .65rem"><i style="width:${pct}%;${fact > plan ? 'background:var(--amber)' : ''}"></i></div>
        <div class="row lite-money-card__actions" style="gap:.5rem;flex-wrap:wrap"><button type="button" class="btn btn--dark btn--sm grow lite-money-card__expense" data-n="expense" data-a="${l1.id}">${icon('receipt')} Записать расход</button><button type="button" class="btn btn--ghost btn--sm lite-money-card__all" data-n="budget" data-testid="lite-all-expenses-btn">Все расходы</button></div></div>
      ${repUi.showBadge ? `<button type="button" class="card side-card side-card--tight side-card--btn contractor-reports-card" data-n="events" data-testid="contractor-reports-card"><span class="row" style="gap:.5rem;align-items:center;min-height:2.75rem">${icon('message-circle')}<b>${esc(contractorReportsCardTitle(repUi.pendingCount))}</b><span class="pill pill--red">${repUi.pendingCount}</span></span>${icon('chevron-right')}</button>` : ''}
      <div class="card side-card side-card--tight card--soft lite-quick-help"><div class="stack" style="gap:.4rem"><a class="btn btn--ghost btn--sm btn--block lite-quick-link" href="#/catalog?kind=specialist&stage=${l1.id}">${icon('users')} Найти мастера</a><button type="button" class="btn btn--ghost btn--sm btn--block lite-quick-link" data-n="concierge-l1" data-a="${l1.id}">${icon('sparkles')} Сделайте за меня</button></div></div>
      ${liteRetainedPanels(p)}`;
  }
  const TOOLS_MODAL_HELPER = 'Выберите нужный инструмент: посчитать ремонт, записать расход, найти товары или мастера';
  function toolsModalHead(title, sub = '') {
    return `<div class="modal__head tools-modal__head"><div class="tools-modal__head-main"><h3>${title}</h3>${sub ? `<p class="tools-modal__subtitle small">${esc(sub)}</p>` : ''}</div><button type="button" class="btn btn--ghost btn--icon" data-close aria-label="Закрыть">${icon('x')}</button></div>`;
  }
  // «Инструменты» — всё остальное в одном окне
  function toolsModal(p) {
    const l1 = currentL1(p), t = totals(p), lv = levelOf(t.percent);
    const repUi = delegContractorReportsUi(p);
    const docItems = [
      ['docs', 'file-text', 'Документы', l1.id],
      ['calendar', 'calendar', 'Календарь'],
    ];
    if (repUi.showEntry) {
      const lab = repUi.showBadge ? `Отчёты · ${repUi.pendingCount}` : 'Отчёты исполнителей';
      docItems.push(['events', 'message-circle', lab, l1.id]);
    }
    const G = [
      ['План ремонта', [['href', 'route', 'План маршрута', '#/navigator'], ['href', 'layers', 'Проекты и расчёты', '#/projects/calculations']]],
      ['Деньги', [['budget', 'wallet', 'Бюджет'], ['expense', 'receipt', 'Расход', l1.id], ['prices', 'trending-up', 'Цены на работы', l1.id]]],
      ['Расчёты', [['href', 'calculator', 'Калькулятор объекта', '#/calc'], ['href', 'grid-3x3', 'Отдельные калькуляторы', '#/calc/materials']]],
      ['Покупки', [['materials', 'shopping-bag', 'Список покупок', l1.id], ['href', 'store', 'Каталог', `#/catalog?kind=store&stage=${l1.id}`]]],
      ['Документы и сроки', docItems],
      ['Люди', [['delegate', 'hand-helping', 'Поручить этап', `l1:${l1.id}`], ['concierge-l1', 'sparkles', 'Консьерж', l1.id], ['href', 'users', 'Мастера', `#/catalog?kind=specialist&stage=${l1.id}`]]],
      ['Справка', [['knowledge', 'book-open', RENOVATION_ADVICE_TITLE]]],
      ['Проект', [['search', 'search', 'Поиск'], ['share', 'share', 'Поделиться'], ['summary', 'file-text', 'Итоги'], ['invite', 'gift', 'Пригласить'], ['fab', 'target', 'Текущий шаг']]],
    ];
    const toolsSub = R(2) ? `${p.name} · ${lv.cur[0]} · ${t.percent} %` : `${p.name} · ${t.percent} %`;
    modal(`${toolsModalHead('Инструменты', toolsSub)}
      <p class="tools-modal__helper" data-testid="tools-modal-helper">${TOOLS_MODAL_HELPER}</p>
      <div class="toolgrid">${G.map(([g, items]) => `<div><span class="eyebrow">${g}</span><div class="toolgrid__items">${items.map(([n, ic, lab, a]) => n === 'href' ? `<a href="${a}">${icon(ic)}<span>${lab}</span></a>` : `<button data-n="${n}" ${a ? `data-a="${a}"` : ''}>${icon(ic)}<span>${lab}</span></button>`).join('')}</div></div>`).join('')}</div>`, {
      onOpen(m) {
        const box = qs('.modal__box', m);
        if (box) box.classList.add('modal__box--tools', 'modal__box--nav-ux');
        qsa('button[data-n]', m).forEach((b) => (b.onclick = (ev) => { closeModal(); onClick(ev); }));
        qsa('a', m).forEach((a) => (a.onclick = () => closeModal()));
      },
    });
  }

  // ---------- Завершение ----------
  function projectOutcome(p) {
    const list = stages(p), plan = planTotal(p), fact = factTotal(p), recorded = p.expenses.length > 0;
    const closed = list.every((l1) => l1Complete(p, l1.id));
    const final = closed && !!p.expensesConfirmed;
    const skippedCount = list.filter((l1) => p.skippedL1.has(l1.id)).length;
    const variance = budgetVariance(plan, fact, recorded || final, final && !skippedCount);
    if (final && skippedCount && fact < plan) variance.label = 'Ниже исходной сметы';
    const rows = list.map((l1) => {
      const stageBudget = litePlan(p, l1), spent = stageFact(p, l1.id);
      const known = p.expenses.some((e) => e.stageL1Id === l1.id);
      return { id: l1.id, title: l1.title, plan: stageBudget, fact: spent, delta: spent - stageBudget, known, skipped: p.skippedL1.has(l1.id) };
    });
    const relevant = rows.filter((r) => r.known && !r.skipped);
    const over = relevant.reduce((sum, r) => sum + Math.max(0, r.delta), 0);
    const saving = relevant.reduce((sum, r) => sum + Math.max(0, -r.delta), 0);
    const start = p.actualStartDate ? Date.parse(p.actualStartDate + 'T00:00:00Z') : NaN;
    const end = p.actualEndDate ? Date.parse(p.actualEndDate + 'T00:00:00Z') : NaN;
    const elapsed = Number.isFinite(start) && Number.isFinite(end) && end >= start ? Math.round((end - start) / 864e5) + 1 : null;
    const durationNote = elapsed == null ? 'Укажите фактические даты начала и завершения'
      : p.estimate && elapsed > p.estimate.dmax ? `Дольше оценки на ${elapsed - p.estimate.dmax} ${plural(elapsed - p.estimate.dmax, 'день', 'дня', 'дней')}`
      : p.estimate && elapsed < p.estimate.dmin ? `На ${p.estimate.dmin - elapsed} ${plural(p.estimate.dmin - elapsed, 'день', 'дня', 'дней')} быстрее нижней границы оценки`
      : p.estimate ? 'В пределах расчётного срока' : 'По указанным вами датам';
    const yard = p.objectType === 'yard';
    const area = yard ? p.estimate?.plot : p.area;
    const unit = yard ? '₽/сотка' : '₽/м²';
    const l2Ids = new Set(list.flatMap((l1) => l2of(p, l1)).map((l2) => l2.id));
    const checks = NAV.qualityChecklists.filter((q) => l2Ids.has(q.stageL2Id)).flatMap((q) => q.checks);
    const criticalMissing = checks.filter((c) => c.critical && !p.qc.has(c.id)).length;
    return { plan, fact, recorded, final, variance, rows, over, saving, elapsed, durationNote, unit,
      perUnit: (recorded || final) && area > 0 ? Math.round(fact / area) : null,
      recordedStages: rows.filter((r) => p.expenses.some((e) => e.stageL1Id === r.id)).length,
      criticalMissing, hasChecks: checks.length > 0, skipped: rows.filter((r) => r.skipped).length,
      receipts: p.documents.filter((d) => d.type === 'receipt').length,
      warranties: p.documents.filter((d) => d.type === 'warranty').length,
      acts: p.documents.filter((d) => d.type === 'act').length };
  }
  function outcomeContent(p) {
    const r = projectOutcome(p), v = r.variance;
    const percent = r.plan > 0 && (r.recorded || r.final) ? `${Math.abs((r.fact - r.plan) / r.plan * 100).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} % ${r.fact > r.plan ? 'сверх сметы' : r.fact < r.plan ? 'от сметы' : 'отклонение'}` : 'Процент без сметы не рассчитываем';
    const affected = r.rows.filter((x) => x.known && !x.skipped && x.delta !== 0).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 3);
    return `<div class="completion-outcome" data-testid="project-outcome">
      <div class="summary-grid outcome-kpis">
        <div class="kpi"><span class="eyebrow">Расходы по записям</span><b data-testid="outcome-spent">${r.recorded || r.final ? moneyShort(r.fact) : 'Нет записей'}</b><span>План ремонта ${moneyShort(r.plan)}</span></div>
        <div class="kpi budget-variance budget-variance--${v.kind}" data-testid="outcome-variance"><span class="eyebrow">${icon(v.icon)} ${v.label}</span><b>${v.amount}</b><span>${r.recorded || r.final ? percent : 'Добавьте платежи для сравнения'}</span></div>
        <div class="kpi"><span class="eyebrow">Фактически ${r.unit}</span><b data-testid="outcome-per-unit">${r.perUnit == null ? '—' : fmt(r.perUnit)}</b><span>Весь записанный бюджет на единицу площади${p.estimate?.yard || p.estimate?.shell ? ', включая участок и коробку' : ''}</span></div>
        <div class="kpi"><span class="eyebrow">Фактический срок</span><b data-testid="outcome-duration">${r.elapsed == null ? 'Нет дат' : `${r.elapsed} ${plural(r.elapsed, 'день', 'дня', 'дней')}`}</b><span>${r.durationNote}${p.estimate ? ` · оценка ${p.estimate.dmin}–${p.estimate.dmax} дней` : ''}</span><button type="button" class="link small" data-n="summary-dates">${r.elapsed == null ? 'Указать даты' : 'Изменить даты'}</button></div>
      </div>
      <div class="outcome-data-note">
        <label><input type="checkbox" data-n="expenses-confirmed" ${p.expensesConfirmed ? 'checked' : ''}${p.shared ? ' disabled aria-disabled="true"' : ''}> Все расходы внесены</label>
        <p class="small">${r.final ? 'Итоговая разница рассчитана по подтверждённым вами расходам.' : `Записи о расходах есть по ${r.recordedStages} из ${r.rows.length} этапов. Пока все платежи не внесены, остаток не считаем итоговой экономией.`}${r.skipped ? ` Пропущено ${r.skipped} ${plural(r.skipped, 'этап', 'этапа', 'этапов')}: меньший объём работ не выдаём за экономию по этапам.` : ''}</p>
      </div>
      <div class="outcome-details">
        <section class="outcome-block"><h3>Где изменился бюджет</h3>
          <div class="outcome-split"><div><span>Перерасход по этапам</span><b class="amber">${moneyShort(r.over)}</b></div><div><span>${r.final ? 'Экономия' : 'Ниже сметы по записям'}</span><b class="${r.final ? 'green' : ''}">${moneyShort(r.saving)}</b></div></div>
          <p class="small">Показываем отдельно, чтобы экономия на одном этапе не скрывала перерасход на другом. Этапы без записей и пропущенные не создают фиктивную экономию.</p>
          ${affected.length ? `<div class="rows">${affected.map((x) => `<div><span>${esc(x.title)}<br><small>Смета ${moneyShort(x.plan)} · факт ${moneyShort(x.fact)}</small></span><b class="${x.delta > 0 ? 'amber' : r.final ? 'green' : ''}">${x.delta > 0 ? 'Перерасход' : r.final ? 'Экономия' : 'Ниже сметы'}<br>${moneyShort(Math.abs(x.delta))}</b></div>`).join('')}</div>` : '<p class="small">Нет записанных отклонений по этапам.</p>'}
          <button type="button" class="btn btn--ghost btn--sm" data-n="budget">Разобрать расходы</button>
        </section>
        <section class="outcome-block"><h3>Что важно после ремонта</h3>
          <div class="rows"><div><span>Чеки</span><b>${r.receipts}</b></div><div><span>Акты</span><b>${r.acts}</b></div><div><span>Гарантийные документы</span><b class="${r.warranties ? '' : 'amber'}">${r.warranties ? r.warranties : 'Не добавлены'}</b></div></div>
          <p class="small">${r.hasChecks ? r.criticalMissing ? `Критичные проверки без отметки: ${r.criticalMissing}. Проверьте их перед окончательным расчётом с мастерами.` : 'Все критичные проверки качества отмечены.' : 'Для этого объекта нет отдельного чек-листа качества.'}</p>
          <p class="small">Сохраните акты, гарантии и контакты исполнителей для обслуживания. В прототипе документы — записи с названиями, загрузка файлов пока демонстрационная.</p>
          <button type="button" class="btn btn--ghost btn--sm" data-n="view-route">Проверить маршрут и документы</button>
        </section>
      </div>
    </div>`;
  }
  function pageCompletion(p) {
    const t = totals(p), skipped = p.skippedL1.size;
    return `<section class="section"><div class="wrap" style="max-width:1080px"><div class="card completion">
      <div class="big">${icon('trophy', 'i--24')}</div><span class="eyebrow eyebrow--red">Итоги вашего проекта</span><h1 style="font-size:2.2rem;margin:.4rem 0 .6rem">${skipped ? 'Маршрут закрыт' : 'Ремонт завершён'}</h1><p class="lead">${esc(p.name)} · ${t.l1done} из ${t.l1} этапов закрыты${skipped ? `, ${skipped} пропущено` : ''}. Главное: бюджет, сроки и документы для дальнейшего обслуживания.</p>
      ${outcomeContent(p)}
      <div class="row" style="justify-content:center;gap:.6rem"><button class="btn btn--primary" data-n="summary">${icon('file-text')} Итоги в цифрах</button><button class="btn btn--ghost" data-n="share">${icon('share')} Поделиться</button><button class="btn btn--ghost" data-n="pdf">${icon('download')} Скачать PDF</button><button class="btn btn--ghost" data-n="view-route">Открыть маршрут</button></div>
      <p class="xs" style="margin-top:1.25rem">Нужна гарантия, клининг или обслуживание? <a class="link" href="#/concierge">Консьерж поможет</a>.</p></div></div></section>`;
  }

  // ---------- Модальные окна ----------
  function bulkCompleteConfirmModal(p, l1, returnFocusEl) {
    const openCtx = { projectId: p.id, l1Id: l1.id };
    const st = l1Stats(p, l1);
    const D = window.RCNavDelegationDemo;
    const bulk = D ? D.countOwnEligibleBulk(p, l1, l1AllTasks) : { own: Math.max(0, st.total - st.done), delegated: 0, total: st.total };
    const remain = bulk.own;
    const canClose = remain > 0 && bulk.delegated === 0 && l1Stats(p, l1).done + remain >= bulk.total;
    const btnLabel =
      remain === 0
        ? 'Нет своих пунктов для отметки'
        : bulk.delegated
          ? 'Отметить только свои пункты'
          : canClose
            ? 'Отметить и закрыть этап'
            : 'Отметить свои пункты';
    modal(`${modalHead('Отметить весь этап выполненным?', `Этап «${l1.title}»`)}
      <p class="small modal__lead">Будет отмечено <b>${remain}</b> ${plural(remain, 'свой пункт', 'своих пункта', 'своих пунктов')} из <b>${bulk.total}</b>${bulk.delegated ? ` · <b>${bulk.delegated}</b> останутся поручены исполнителю — этап не закроется, пока они не выполнены.` : ''}.</p>
      <div class="notice notice--grey xs modal__notice">${icon('info')}<span>Только чек-лист. Не создаём расходы, не меняем поручения, даты, таймеры и приёмку качества. Это не подтверждение качества работ.</span></div>
      <div class="modal__foot"><button type="button" class="btn btn--ghost" data-close>Отмена</button><button type="button" class="btn btn--primary" id="bulk-ok" ${remain ? '' : 'disabled'}>${icon('list-checks')} ${btnLabel}</button></div>`, {
      onOpen(mo) {
        markNavUxModal(mo);
        const finish = wireModalA11y(mo, { primarySelector: '#bulk-ok', returnFocusEl });
        qs('#bulk-ok', mo).onclick = () => {
          if (bulkActionLock && Date.now() - bulkActionLock < 400) return;
          const cur = activeProject();
          if (!projectBulkContextOk(cur, openCtx) || !stageBulkAllowed(cur, openCtx.l1Id)) {
            toast('Проект или этап изменились — откройте подтверждение снова');
            finish();
            return;
          }
          const l1Now = l1ById(cur, openCtx.l1Id);
          if (!l1Now) {
            toast('Этап недоступен');
            finish();
            return;
          }
          bulkActionLock = Date.now();
          cur._bulkUndo = bulkCompleteSnapshot(cur, l1Now);
          const closed = applyBulkStageDone(cur, l1Now);
          if (closed) {
            view.stageCompletePanel = l1Now.id;
            view.liteL2 = null;
            view.liteCelebrate = null;
          } else {
            view.stageCompletePanel = null;
          }
          finish();
          renderApp();
          toast(closed ? 'Чек-лист этапа отмечен, этап закрыт' : 'Отмечены только свои пункты — порученные задачи остались');
          if (closed) scrollToNavMain();
        };
      },
    });
  }
  function skipStageConfirmModal(p, l1, returnFocusEl) {
    const openCtx = { projectId: p.id, l1Id: l1.id };
    const st = l1Stats(p, l1), open = st.total - st.done;
    modal(`${modalHead('Пропустить этап?', `Этап «${l1.title}»`)}
      <p class="small">Этап будет отмечен как <b>пропущенный</b> в маршруте. ${open ? `В чек-листе останется ${open} ${plural(open, 'пункт', 'пункта', 'пунктов')} без отметки.` : 'Чек-лист уже полный — пропуск только меняет статус этапа.'}</p>
      <div class="notice notice--amber xs">${icon('alert-triangle')}<span>Не путать с «Отметить весь этап выполненным» — там отмечаются все пункты чек-листа.</span></div>
      <div class="modal__foot"><button type="button" class="btn btn--ghost" data-close>Отмена</button><button type="button" class="btn btn--primary" id="skip-ok">Пропустить этап</button></div>`, {
      onOpen(mo) {
        markNavUxModal(mo);
        const finish = wireModalA11y(mo, { primarySelector: '#skip-ok', returnFocusEl });
        qs('#skip-ok', mo).onclick = () => {
          const cur = activeProject();
          if (!projectBulkContextOk(cur, openCtx) || !stageBulkAllowed(cur, openCtx.l1Id)) {
            toast('Проект или этап изменились — откройте подтверждение снова');
            finish();
            return;
          }
          cur.skippedL1.add(openCtx.l1Id);
          cur.completedL1.delete(openCtx.l1Id);
          cur._bulkUndo = null;
          view.stageCompletePanel = openCtx.l1Id;
          view.liteL2 = null;
          finish();
          renderApp();
          scrollToNavMain();
        };
      },
    });
  }
  function taskDetailModal(p, taskId, focusField, returnFocusEl) {
    const found = stages(p).flatMap((l1) => l2of(p, l1).flatMap((l2) => tasksOf(p, l2).map((t) => ({ l1, l2, t })))).find((x) => x.t.id === taskId);
    if (!found) return;
    const openCtx = { projectId: p.id, taskId };
    const { l1, l2, t } = found, m = p.taskMeta[taskId] || {};
    const budgetDisp = planBudgetInputDisplay(m.budget);
    modal(`${modalHead(esc(t.title), `${l1.title} · ${esc(l2.title)} · план по задаче`)}
      ${t.description ? `<p class="small" style="margin-bottom:1rem">${esc(t.description)}</p>` : ''}
      <p class="xs muted">Плановые поля необязательны и не попадают в журнал фактических расходов.</p>
      <div class="grid2"><div><label for="m-date">Плановая дата</label><input type="date" id="m-date" value="${m.plannedDate || ''}"></div><div><label for="m-budget">Плановая сумма, ₽</label><input type="text" inputmode="decimal" id="m-budget" value="${esc(budgetDisp)}" placeholder="по желанию" autocomplete="off"></div></div>
      <div style="margin-top:.75rem"><label for="m-exec">Ответственный</label><input id="m-exec" value="${esc(m.executor || '')}" placeholder="Я / имя мастера / компания"></div>
      <div style="margin-top:.75rem"><label for="m-note">Заметка</label><textarea id="m-note" placeholder="Что важно не забыть">${esc(m.note || '')}</textarea></div>
      ${t.custom ? `<div style="margin-top:.75rem"><label for="m-title">Название своей задачи</label><input id="m-title" value="${esc(t.title)}"></div>` : ''}
      <div class="modal__foot">${t.custom ? `<button class="btn btn--ghost" id="m-del">${icon('trash')} Удалить</button>` : ''}<button class="btn btn--ghost" data-close>Отмена</button><button class="btn btn--ghost" id="m-deleg">${icon('hand-helping')} Поручить</button><button class="btn btn--primary" id="m-save">Сохранить</button></div>`, {
      onOpen(mo) {
        markTaskMetaModal(mo);
        const finish = wireModalA11y(mo, { primarySelector: '#m-save', returnFocusEl });
        const focusId = focusField === 'date' ? 'm-date' : focusField === 'budget' ? 'm-budget' : focusField === 'executor' ? 'm-exec' : 'm-exec';
        const focusEl = qs('#' + focusId, mo) || qs('#m-save', mo);
        if (focusEl) focusEl.focus();
        qs('#m-save', mo).onclick = () => {
          const cur = activeProject();
          if (!taskMetaMutationOk(cur, openCtx)) {
            toast('Режим просмотра или проект изменился — сохранение отменено');
            finish();
            return;
          }
          const prev = cur.taskMeta[taskId] || {};
          const meta = { ...prev, plannedDate: qs('#m-date', mo).value, executor: qs('#m-exec', mo).value.trim(), note: qs('#m-note', mo).value.trim() };
          const bp = parsePlanBudgetInput(qs('#m-budget', mo).value);
          if (!bp.ok) {
            toast('Плановая сумма: до 2 знаков после запятой, не больше 999 999 999 999,99 ₽, или очистите поле');
            return;
          }
          if (bp.clear) delete meta.budget;
          else meta.budget = bp.value;
          cur.taskMeta[taskId] = meta;
          if (t.custom) t.title = qs('#m-title', mo).value.trim() || t.title;
          finish();
          renderApp();
          toast('План по задаче сохранён');
        };
        qs('#m-deleg', mo).onclick = () => {
          const cur = activeProject();
          if (!taskMetaMutationOk(cur, openCtx)) return toast('Режим просмотра — изменения недоступны');
          teardownNavModalA11y(qs('#modal') || mo);
          delegateModal(cur, { taskIds: [taskId], title: t.title }, returnFocusEl);
        };
        const del = qs('#m-del', mo);
        if (del) {
          del.onclick = () => {
            const cur = activeProject();
            if (!taskMetaMutationOk(cur, openCtx)) {
              toast('Режим просмотра или проект изменился');
              finish();
              return;
            }
            cur.customTasks = cur.customTasks.filter((x) => x.id !== taskId);
            cur.completedTasks.delete(taskId);
            finish();
            renderApp();
          };
        }
      },
    });
  }
  function allProjectOpenTaskIds(p) {
    return stages(p)
      .flatMap((l1) => l2of(p, l1).flatMap((l2) => tasksOf(p, l2).map((t) => t.id)))
      .filter((id) => !p.completedTasks.has(id));
  }
  function delegFindL2(p, l2Id) {
    return stages(p).flatMap((l1) => l2of(p, l1).map((l2) => ({ l1, l2 }))).find((x) => x.l2.id === l2Id) || null;
  }
  function delegLeafIds(p, { scopeKind, taskIds = [], l1Ids = [], l2Ids = [], l1 = null, l2 = null, exactTaskPick = false } = {}) {
    if (scopeKind === 'points' || exactTaskPick) return taskIds.map(String);
    if (scopeKind === 'project') return allProjectOpenTaskIds(p);
    const l1List = l1Ids.length ? l1Ids.map((id) => l1ById(p, id)).filter(Boolean) : l1 ? [l1] : [];
    const l2List = l2Ids.length ? l2Ids.map((id) => delegFindL2(p, id)).filter(Boolean) : l2 ? [delegFindL2(p, l2.id)].filter(Boolean) : [];
    if (scopeKind === 'l1') return l1List.flatMap((l1x) => l2of(p, l1x).flatMap((l2x) => tasksOf(p, l2x).map((t) => t.id)));
    if (scopeKind === 'l2') return l2List.flatMap(({ l2: l2x }) => tasksOf(p, l2x).map((t) => t.id));
    return taskIds.map(String);
  }
  function delegScopeTitle(p, { scopeKind, taskIds = [], l1Ids = [], l2Ids = [] } = {}) {
    if (scopeKind === 'project') return 'Весь ремонт';
    if (scopeKind === 'points') {
      const n = taskIds.length;
      return n === 1 ? '1 пункт' : `${n} ${plural(n, 'пункт', 'пункта', 'пунктов')}`;
    }
    if (scopeKind === 'l2') {
      const names = l2Ids.map((id) => delegFindL2(p, id)?.l2.title).filter(Boolean);
      if (names.length <= 2) return names.map((t) => `«${t}»`).join(', ');
      return `${names.length} ${plural(names.length, 'подэтап', 'подэтапа', 'подэтапов')}`;
    }
    if (scopeKind === 'l1') {
      const names = l1Ids.map((id) => l1ById(p, id)?.title).filter(Boolean);
      if (names.length <= 2) return names.map((t) => `«${t}»`).join(', ');
      return `${names.length} ${plural(names.length, 'этап', 'этапа', 'этапов')}`;
    }
    return '';
  }
  function delegApplicableL1Ids(p) {
    return stages(p)
      .filter((l1) => l2of(p, l1).some((l2) => tasksOf(p, l2).some((t) => !p.completedTasks.has(t.id))))
      .map((l1) => l1.id);
  }
  function delegApplicableL2Rows(p) {
    return stages(p).flatMap((l1) =>
      l2of(p, l1)
        .filter((l2) => tasksOf(p, l2).some((t) => !p.completedTasks.has(t.id)))
        .map((l2) => ({ l1, l2 }))
    );
  }
  function delegApplicableLeafRows(p) {
    return delegApplicableL2Rows(p).flatMap(({ l1, l2 }) =>
      tasksOf(p, l2)
        .filter((t) => !p.completedTasks.has(t.id))
        .map((t) => ({ l1, l2, t }))
    );
  }
  function defaultPickTaskIdsForL2(p, l2) {
    if (!l2 || !window.RCNavDelegationDemo) return [];
    const D = window.RCNavDelegationDemo;
    const raw = tasksOf(p, l2)
      .map((t) => t.id)
      .filter((id) => !p.completedTasks.has(id));
    const ctx = demoDelegScope(p, { l2, scopeKind: 'points', taskIds: raw });
    return D.eligibleTaskIds(p, ctx, raw).ids;
  }
  function demoDelegScope(p, { taskIds = [], l2 = null, l1 = null, l1Ids = [], l2Ids = [], scopeKind = null, forAssign = false, scopeTitle = '', exactTaskPick = false } = {}) {
    const kind =
      scopeKind ||
      (exactTaskPick ? 'points' : taskIds.length ? 'points' : l2Ids.length || l2 ? 'l2' : l1Ids.length || l1 ? 'l1' : 'project');
    const l2Resolved = l2Ids.length ? l2Ids : l2 ? [l2.id] : [];
    const l1Resolved = l1Ids.length ? l1Ids : l1 ? [l1.id] : l2 ? [stages(p).find((x) => l2of(p, x).some((y) => y.id === l2.id))?.id].filter(Boolean) : [];
    const ids = delegLeafIds(p, {
      scopeKind: exactTaskPick ? 'points' : kind,
      taskIds,
      l1Ids: l1Resolved,
      l2Ids: l2Resolved,
      l1,
      l2,
      exactTaskPick,
    });
    const title = scopeTitle || delegScopeTitle(p, { scopeKind: exactTaskPick ? 'points' : kind, taskIds: ids, l1Ids: l1Resolved, l2Ids: l2Resolved });
    const rawCtx = {
      projectId: p.id,
      l1Id: l1Resolved[0] || null,
      l2Id: l2Resolved[0] || null,
      l1Ids: l1Resolved.slice(),
      l2Ids: l2Resolved.slice(),
      taskIds: ids,
      scopeKind: kind,
      scopeTitle: title,
    };
    if (!forAssign) return rawCtx;
    const D = window.RCNavDelegationDemo;
    if (D) {
      const { ids: eligible, skipped } = D.eligibleTaskIds(p, rawCtx, ids);
      return { ...rawCtx, taskIds: eligible, excludedBusy: skipped?.busy || 0, excludedPending: skipped?.pending || 0 };
    }
    return rawCtx;
  }
  function delegateScopeLabel(kind) {
    return { points: 'Пункты', l2: 'Подэтапы', l1: 'Этапы', project: 'Все доступные работы' }[kind] || kind;
  }
  function delegPickerViewKind(kind) {
    return DELEG_PICKER_VIEW_KINDS.includes(kind) ? kind : 'points';
  }
  function delegPickerOpenTaskIds(p, l2) {
    return tasksOf(p, l2)
      .filter((t) => !p.completedTasks.has(t.id))
      .map((t) => String(t.id));
  }
  function delegPickerSelectable(p, taskId) {
    const D = window.RCNavDelegationDemo;
    if (!D) return !p.completedTasks.has(taskId);
    const probe = { projectId: p.id, taskIds: [taskId], scopeKind: 'points' };
    return D.eligibleTaskIds(p, probe, [taskId]).ids.length > 0;
  }
  function delegPickerL2SelectableIds(p, l2) {
    return delegPickerOpenTaskIds(p, l2).filter((id) => delegPickerSelectable(p, id));
  }
  function delegPickerL1SelectableIds(p, l1) {
    return l2of(p, l1).flatMap((l2) => delegPickerL2SelectableIds(p, l2));
  }
  function delegParentPickState(ids, pickSet) {
    const sel = ids.filter((id) => pickSet.has(String(id)));
    if (!ids.length) return { checked: false, indeterminate: false };
    if (sel.length === 0) return { checked: false, indeterminate: false };
    if (sel.length === ids.length) return { checked: true, indeterminate: false };
    return { checked: false, indeterminate: true };
  }
  function delegSelectableAllProjectIds(p) {
    return allProjectOpenTaskIds(p).filter((id) => delegPickerSelectable(p, id));
  }
  function delegExactScopeTitle(p, taskIds) {
    const n = taskIds.length;
    if (!n) return 'Ничего не выбрано';
    const allSel = delegSelectableAllProjectIds(p);
    if (n === allSel.length && allSel.length > 0) return 'Все доступные работы';
    if (n === 1) return short(taskTitleById(p, taskIds[0]) || '1 пункт').main;
    if (n <= 3) return taskIds.map((id) => short(taskTitleById(p, id) || id).main).join('; ');
    return `${n} ${plural(n, 'пункт', 'пункта', 'пунктов')}`;
  }
  function taskTitleById(p, id) {
    const row = delegApplicableLeafRows(p).find((r) => String(r.t.id) === String(id));
    return row ? row.t.title : p.customTasks.find((t) => String(t.id) === String(id))?.title || '';
  }
  function delegInitialPickTaskIds(p, { taskIds = [], l2 = null, l1 = null, wholeRepair = false } = {}) {
    if (taskIds.length) return taskIds.map(String).filter((id) => delegPickerSelectable(p, id));
    if (wholeRepair) return allProjectOpenTaskIds(p).filter((id) => delegPickerSelectable(p, id));
    if (l2) return delegPickerL2SelectableIds(p, l2);
    if (l1) return delegPickerL1SelectableIds(p, l1);
    return [];
  }
  function delegPickerOpenerSig(p, { taskIds = [], l2 = null, l1 = null, wholeRepair = false } = {}) {
    const t = [...taskIds].map(String).filter(Boolean).sort().join(',');
    return `p:${p.id}|wr:${wholeRepair ? 1 : 0}|l1:${l1?.id || ''}|l2:${l2?.id || ''}|t:${t}`;
  }
  function delegScopePickerHtml(p, st) {
    const pickSet = new Set((st.pickTaskIds || []).map(String));
    const viewKind = delegPickerViewKind(st.scopeKind || 'points');
    const { focusL2Id = null, focusL1Id = null, openL1 = {}, openL2 = {} } = st;
    const showTaskRows = viewKind !== 'l1';
    const showL2Stack = viewKind !== 'l1';
    const l1Ids = delegApplicableL1Ids(p);
    const l1WantsOpen = (l1Id, l1x) => {
      if (Object.prototype.hasOwnProperty.call(openL1, l1Id)) return !!openL1[l1Id];
      if (l1Id === focusL1Id) return true;
      if (focusL2Id && l2of(p, l1x).some((l2) => l2.id === focusL2Id)) return true;
      return false;
    };
    const groups = l1Ids
      .map((l1Id) => {
        const l1x = l1ById(p, l1Id);
        const l1Sel = delegPickerL1SelectableIds(p, l1x);
        const l1St = delegParentPickState(l1Sel, pickSet);
        const l1Open = l1WantsOpen(l1Id, l1x);
        const l2Html = showL2Stack
          ? l2of(p, l1x)
          .filter((l2) => delegPickerOpenTaskIds(p, l2).length)
          .map((l2) => {
            const l2Sel = delegPickerL2SelectableIds(p, l2);
            const l2St = delegParentPickState(l2Sel, pickSet);
            const l2Open = Object.prototype.hasOwnProperty.call(openL2, l2.id) ? !!openL2[l2.id] : l2.id === focusL2Id;
            const tasks = tasksOf(p, l2).filter((t) => !p.completedTasks.has(t.id));
            const taskHtml = showTaskRows
              ? tasks
                .map((t) => {
                  const id = String(t.id);
                  const can = delegPickerSelectable(p, id);
                  const on = pickSet.has(id);
                  const busy = !can;
                  return `<label class="deleg-scope-pick__row demo-deleg-hit row${busy ? ' deleg-scope-pick__row--busy' : ''}"><input type="checkbox" class="deleg-pick-task" value="${esc(id)}" ${on ? 'checked' : ''} ${busy ? 'disabled aria-disabled="true"' : ''} aria-label="${escAttr(short(t.title).main)}"><span class="small">${esc(short(t.title).main)}${busy ? '<span class="xs muted"> · занято</span>' : ''}</span></label>`;
                })
                .join('')
              : '';
            return `<details class="deleg-scope-pick__group deleg-scope-pick__group--l2" ${l2Open ? 'open' : ''}>
              <summary class="deleg-scope-pick__group-sum small">
                <span class="deleg-scope-pick__sum-main">
                  <label class="deleg-scope-pick__parent row" data-deleg-parent-stop="1">
                    <input type="checkbox" class="deleg-pick-l2" value="${esc(l2.id)}" ${l2St.checked ? 'checked' : ''} aria-checked="${l2St.indeterminate ? 'mixed' : l2St.checked ? 'true' : 'false'}" ${l2Sel.length ? '' : 'disabled aria-disabled="true"'}>
                    <span><b>${esc(l2.title)}</b><span class="muted"> · ${l2Sel.length} ${plural(l2Sel.length, 'пункт', 'пункта', 'пунктов')}</span></span>
                  </label>
                </span>
                <span class="deleg-scope-pick__sum-disclosure" aria-hidden="true"></span>
              </summary>
              <div class="stack deleg-scope-pick__tasks" style="gap:.2rem;margin:.25rem 0 .5rem;padding-left:.15rem">${taskHtml}</div>
            </details>`;
          })
          .join('')
          : '';
        return `<details class="deleg-scope-pick__group deleg-scope-pick__group--l1" ${l1Open ? 'open' : ''}>
          <summary class="deleg-scope-pick__group-sum small">
            <span class="deleg-scope-pick__sum-main">
              <label class="deleg-scope-pick__parent row" data-deleg-parent-stop="1">
                <input type="checkbox" class="deleg-pick-l1" value="${esc(l1Id)}" ${l1St.checked ? 'checked' : ''} aria-checked="${l1St.indeterminate ? 'mixed' : l1St.checked ? 'true' : 'false'}" ${l1Sel.length ? '' : 'disabled aria-disabled="true"'}>
                <span><b>${esc(l1x.title)}</b><span class="muted"> · ${l1Sel.length} ${plural(l1Sel.length, 'пункт', 'пункта', 'пунктов')}</span></span>
              </label>
            </span>
            <span class="deleg-scope-pick__sum-disclosure" aria-hidden="true"></span>
          </summary>
          <div class="deleg-scope-pick__l2stack">${l2Html}</div>
        </details>`;
      })
      .join('');
    return `<div class="deleg-scope-pick deleg-scope-pick--tree" data-testid="deleg-scope-picker">${groups || '<p class="small muted">Нет открытых пунктов.</p>'}</div>`;
  }
  function delegApplyParentPick(p, pickSet, ids, checked) {
    ids.forEach((id) => {
      if (checked) {
        if (delegPickerSelectable(p, id)) pickSet.add(String(id));
      } else pickSet.delete(String(id));
    });
  }
  function delegReadPicker(mo) {
    return {
      taskIds: qsa('.deleg-pick-task:checked', mo).map((x) => x.value),
      l2Ids: qsa('.deleg-pick-l2:checked', mo).map((x) => x.value),
      l1Ids: qsa('.deleg-pick-l1:checked', mo).map((x) => x.value),
    };
  }
  function delegSyncParentIndeterminate(mo) {
    qsa('.deleg-pick-l1, .deleg-pick-l2', mo).forEach((inp) => {
      const mixed = inp.getAttribute('aria-checked') === 'mixed';
      inp.indeterminate = mixed;
    });
  }
  function delegContractorReportsUi(p) {
    if (!p || p.shared || !window.RCNavDelegationDemo) {
      return { pending: [], history: [], hasAssignments: false, showEntry: false, showBadge: false, pendingCount: 0 };
    }
    const D = window.RCNavDelegationDemo;
    const s = D.ensureState(p);
    const pending = (s.pendingReports || []).filter((r) => r.status === 'pending');
    const history = s.history || [];
    const hasAssignments = (s.assignments || []).length > 0;
    const hasEngagement = hasAssignments || pending.length > 0 || history.length > 0;
    return {
      pending,
      history,
      hasAssignments,
      showEntry: hasEngagement,
      showBadge: pending.length > 0,
      pendingCount: pending.length,
    };
  }
  function contractorReportsCardTitle(pendingCount) {
    return pendingCount > 1 ? 'От исполнителей' : 'От мастера';
  }
  function demoDelegNavSnap() {
    const p = activeProject();
    return {
      activeProjectId: state.activeProjectId,
      projectId: p?.id ?? null,
      currentL1: p?.currentL1 ?? null,
      liteL2: view.liteL2 ?? null,
    };
  }
  function demoDelegReportGuard(cur, guard) {
    const D = window.RCNavDelegationDemo;
    if (!D || !guard?.projectId) return false;
    if (!D.projectGuardOk(cur, guard.projectId)) return false;
    const s = D.ensureState(cur);
    const rep = guard.reportId
      ? (s.pendingReports || []).find((r) => r.id === guard.reportId && r.status === 'pending')
      : D.pendingReportActive(s);
    if (guard.reportId && !rep) return false;
    if (guard.assignmentId && rep && rep.assignmentId !== guard.assignmentId) return false;
  return true;
  }
  function demoDelegModalGuard(cur, guard, { checkStep = true, matchAssignmentId = null } = {}) {
    const D = window.RCNavDelegationDemo;
    if (!D || !guard?.projectId || !guard.openCtx) return false;
    if (!D.projectGuardOk(cur, guard.projectId)) return false;
    if (!D.contextOk(cur, guard.openCtx)) return false;
    if (matchAssignmentId) {
      const asn = D.assignmentById(D.ensureState(cur), matchAssignmentId);
      if (!asn || asn.status !== 'active') return false;
    }
    if (checkStep && guard.navSnap) {
      const snap = demoDelegNavSnap();
      if (snap.activeProjectId !== guard.navSnap.activeProjectId) return false;
      if (snap.projectId !== guard.navSnap.projectId) return false;
      if (snap.currentL1 !== guard.navSnap.currentL1) return false;
      const pinL2 = guard.openCtx.l2Ids?.length === 1 ? guard.openCtx.l2Ids[0] : guard.openCtx.l2Id;
      if (pinL2 != null && snap.liteL2 !== guard.navSnap.liteL2) return false;
    }
    return true;
  }
  function demoDelegPendingToast(cur, D, returnFocusEl, reportId) {
    const s = D.ensureState(cur);
    const rep = reportId ? D.pendingReportById(s, reportId) : D.pendingReportActive(s);
    if (!rep) return false;
    toast('Сначала проверьте текущий отчёт');
    demoReportReviewModal(cur, rep.id, returnFocusEl);
    return true;
  }
  function wireDelegDataNInModal(mo, returnFocusEl, { projectId } = {}) {
    if (!mo) return;
    const D = window.RCNavDelegationDemo;
    if (!D) return;
    qsa('[data-n="demo-sim-report"]', mo).forEach((btn) => {
      btn.onclick = (ev) => {
        ev.preventDefault();
        const cur = activeProject();
        const pid = projectId || cur?.id;
        if (!cur || !pid || !D.projectGuardOk(cur, pid)) return toast('Проект изменился');
        const asnId = btn.dataset.b || btn.dataset.a;
        if (!asnId) return;
        const asn = D.assignmentById(D.ensureState(cur), asnId);
        if (!asn) return toast('Поручение не найдено');
        const st = D.ensureState(cur);
        const pend = D.pendingReportForAssignment(st, asnId);
        if (pend) return demoDelegPendingToast(cur, D, returnFocusEl || btn, pend.id);
        demoSimulateReportModal(cur, D.openCtxFromAssignment(cur, asn), returnFocusEl || btn);
      };
    });
    qsa('[data-n="demo-report-review"]', mo).forEach((btn) => {
      btn.onclick = (ev) => {
        ev.preventDefault();
        const cur = activeProject();
        const pid = projectId || cur?.id;
        const reportId = btn.dataset.a;
        if (!cur || !reportId || !pid || !D.projectGuardOk(cur, pid)) return toast('Проект изменился');
        demoReportReviewModal(cur, reportId, returnFocusEl || btn);
      };
    });
    qsa('[data-n="demo-assign-detail"]', mo).forEach((btn) => {
      btn.onclick = (ev) => {
        ev.preventDefault();
        const cur = activeProject();
        const pid = projectId || cur?.id;
        const asnId = btn.dataset.a;
        if (!cur || !asnId || !pid || !D.projectGuardOk(cur, pid)) return toast('Проект изменился');
        demoAssignmentDetailModal(cur, asnId, returnFocusEl || btn);
      };
    });
    qsa('[data-n="demo-deleg-list"]', mo).forEach((btn) => {
      btn.onclick = (ev) => {
        ev.preventDefault();
        const cur = activeProject();
        const pid = projectId || cur?.id;
        if (!cur || !pid || !D.projectGuardOk(cur, pid)) return toast('Проект изменился');
        demoDelegWorkListModal(cur, btn.dataset.a || 'reports', returnFocusEl || btn);
      };
    });
  }
  function delegPreviewTaskNames(p, taskIds, limit = 6) {
    const names = (taskIds || [])
      .map((id) => stages(p).flatMap((l1) => l2of(p, l1).flatMap((l2) => tasksOf(p, l2))).find((t) => t.id === id))
      .filter(Boolean)
      .map((t) => esc(short(t.title).main));
    if (!names.length) return '<p class="xs muted">Нет подходящих пунктов.</p>';
    const head = names.slice(0, limit).map((n) => `<li class="small">${n}</li>`).join('');
    const more = names.length > limit ? `<li class="small muted">…ещё ${names.length - limit}</li>` : '';
    return `<ul class="list deleg-preview-names" data-testid="deleg-preview-names" style="margin:.35rem 0 0">${head}${more}</ul>`;
  }
  function demoDelegTaskRows(p, scope) {
    const D = window.RCNavDelegationDemo;
    if (!D) return '';
    const pool = scope.taskIds.filter((id) => !p.completedTasks.has(id));
    return pool
      .map((id) => {
        const t = stages(p).flatMap((l1) => l2of(p, l1).flatMap((l2) => tasksOf(p, l2))).find((x) => x.id === id);
        if (!t) return '';
        return `<label class="demo-deleg-taskpick demo-deleg-hit row"><input type="checkbox" class="demo-deleg-taskpick__box" name="demo-task-pick" value="${esc(t.id)}" checked><span class="small">${esc(short(t.title).main)}</span></label>`;
      })
      .join('');
  }
  function demoDelegExecutorPanel(p, assignmentId) {
    if (p.shared || !window.RCNavDelegationDemo) return '';
    const D = window.RCNavDelegationDemo;
    const s = D.ensureState(p);
    const asn = D.assignmentById(s, assignmentId);
    if (!asn || asn.status !== 'active') return '';
    const rep = D.pendingReportForAssignment(s, asn.id);
    const pendingBlock = rep
      ? `<div class="notice notice--amber demo-deleg-pending" data-testid="demo-deleg-pending" style="margin:.5rem 0 .75rem;padding:.65rem .75rem"><span class="small">Отчёт на проверке по этому поручению.</span><button type="button" class="btn btn--ghost btn--sm" data-n="demo-report-review" data-a="${escAttr(rep.id)}" style="min-height:2.75rem">Проверить</button></div>`
      : '';
    return `<details class="demo-deleg-panel card card--soft" data-testid="demo-delegation-panel" style="margin-top:1rem;padding:.65rem .85rem;border:1px solid var(--line)">
      <summary class="deleg-disclosure-summary eyebrow">Демо: действия исполнителя</summary>
      <p class="xs muted" style="margin:.35rem 0 .5rem">Демо: только в этой сессии · снимок ${asn.taskIds.length} ${plural(asn.taskIds.length, 'задачи', 'задач', 'задач')}</p>
      ${pendingBlock}
      <div class="row" style="gap:.5rem;flex-wrap:wrap;margin-top:.5rem">
        <button type="button" class="btn btn--ghost btn--sm" data-n="demo-sim-report" data-b="${escAttr(asn.id)}" style="min-height:2.75rem">Смоделировать отчёт</button>
      </div>
    </details>`;
  }
  function demoDelegPanel(p, scope) {
    if (scope?.assignmentId) return demoDelegExecutorPanel(p, scope.assignmentId);
    return '';
  }
  function demoSimulateReportModal(p, openCtx, returnFocusEl) {
    const D = window.RCNavDelegationDemo;
    const st = D.ensureState(p);
    let asn = openCtx?.assignmentId ? D.assignmentById(st, openCtx.assignmentId) : null;
    if (!asn) asn = D.assignmentForContext(st, openCtx);
    if (!asn) return toast('Сначала создайте поручение для этого объёма');
    openCtx = D.openCtxFromAssignment(p, asn);
    if (D.pendingReportForAssignment(st, asn.id)) return demoDelegPendingToast(p, D, returnFocusEl);
    const guard = { projectId: p.id, openCtx, assignmentId: asn.id, navSnap: demoDelegNavSnap() };
    const focusRef = demoDelegFocusFromOpenCtx(openCtx) || demoFocusCapture(returnFocusEl);
    const returnNote = D.lastReturnNote(st, asn.id);
    const options = asn.taskIds
      .filter((id) => !p.completedTasks.has(id))
      .map((id) => {
        const t = stages(p).flatMap((l1) => l2of(p, l1).flatMap((l2) => tasksOf(p, l2))).find((x) => x.id === id);
        return t
          ? `<label class="demo-deleg-taskpick demo-deleg-hit row"><input type="checkbox" class="demo-deleg-taskpick__box" name="demo-rpt-task" value="${esc(t.id)}" checked><span class="small">${esc(short(t.title).main)}</span></label>`
          : '';
      })
      .join('');
    modalNav(
      `${modalHead('Отчёт исполнителя (демо)', `${esc(asn.executor)} · без отправки`)}
      <p class="xs muted">Отчёт не отмечает задачи выполненными — только уведомление владельцу.</p>
      ${returnNote ? `<div class="notice notice--grey xs" data-testid="demo-return-note"><b>Замечание при возврате:</b> ${esc(returnNote)}</div>` : ''}
      <div class="stack" style="gap:.4rem;margin:.75rem 0">${options}</div>
      <label for="demo-rpt-comment">Комментарий исполнителя</label>
      <textarea id="demo-rpt-comment" placeholder="Что сделано" style="min-height:4.5rem;margin-top:.35rem"></textarea>
      <div class="modal__foot"><button type="button" class="btn btn--ghost" data-close>Отмена</button><button type="button" class="btn btn--primary" id="demo-rpt-send" style="min-height:2.75rem">Отправить отчёт (демо)</button></div>`,
      {
        delegReport: true,
        primarySelector: '#demo-rpt-send',
        onOpen(mo) {
          qs('#demo-rpt-send', mo).onclick = () => {
            const cur = activeProject();
            if (!demoDelegModalGuard(cur, guard, { matchAssignmentId: asn.id })) return toast('Проект или контекст изменились');
            const picked = qsa('input[name="demo-rpt-task"]:checked', mo).map((x) => x.value);
            const comment = qs('#demo-rpt-comment', mo).value;
            const r = D.simulateReport(cur, openCtx, { taskIds: picked, comment });
            if (!r.ok) {
              if (r.reason === 'pending_report') return demoDelegPendingToast(cur, D, returnFocusEl);
              return toast('Не удалось сохранить отчёт');
            }
            teardownNavModalA11y(qs('#modal') || mo);
            closeModal();
            renderApp();
            toast(r.idempotent ? 'Отчёт уже отправлен (демо)' : `${asn.executor} сообщил о выполнении ${r.report.taskIds.length} задач`);
            returnFocusDelegationAfterRender(focusRef, returnFocusEl);
          };
        },
      },
      returnFocusEl
    );
  }
  function demoDelegWorkListModal(p, kind, returnFocusEl) {
    const D = window.RCNavDelegationDemo;
    const s = D.ensureState(p);
    const isRep = kind === 'reports';
    const items = isRep
      ? (s.pendingReports || []).filter((r) => r.status === 'pending')
      : D.activeAssignments(s);
    const head = isRep ? 'Отчёты на проверке' : 'Активные поручения';
    const body = items.length
      ? items
          .map((row) => {
            if (isRep) {
              return `<button type="button" class="btn btn--ghost btn--block deleg-work-row" data-n="demo-report-review" data-a="${escAttr(row.id)}" style="justify-content:flex-start;min-height:2.75rem;text-align:left"><span><b>${esc(row.executor)}</b><br><span class="small muted">${row.taskIds.length} ${plural(row.taskIds.length, 'задача', 'задачи', 'задач')}</span></span></button>`;
            }
            return `<button type="button" class="btn btn--ghost btn--block deleg-work-row" data-n="demo-assign-detail" data-a="${escAttr(row.id)}" style="justify-content:flex-start;min-height:2.75rem;text-align:left"><span><b>${esc(row.executor)}</b><br><span class="small muted">${esc(row.scopeTitle || 'поручение')}</span></span></button>`;
          })
          .join('')
      : '<p class="small muted">Пока ничего нет.</p>';
    modalNav(
      `${modalHead(head, esc(p.name))}<div class="stack" style="gap:.35rem" data-testid="demo-deleg-work-list">${body}</div><div class="modal__foot"><button type="button" class="btn btn--ghost" data-close>Закрыть</button></div>`,
      {
        onOpen(mo) {
          qsa('.deleg-work-row', mo).forEach((btn) => {
            btn.onclick = () => {
              teardownNavModalA11y(qs('#modal') || mo);
              closeModal();
              onClick({ target: btn, preventDefault() {} });
            };
          });
        },
      },
      returnFocusEl
    );
  }
  function demoAssignmentDetailModal(p, assignmentId, returnFocusEl) {
    const D = window.RCNavDelegationDemo;
    const s = D.ensureState(p);
    const asn = D.assignmentById(s, assignmentId);
    if (!asn) return toast('Поручение недоступно');
    const left = asn.taskIds.filter((id) => !p.completedTasks.has(id));
    const list = asn.taskIds
      .map((id) => stages(p).flatMap((l1) => l2of(p, l1).flatMap((l2) => tasksOf(p, l2))).find((t) => t.id === id))
      .filter(Boolean)
      .map((t) => `<li class="small">${esc(t.title)}</li>`)
      .join('');
    const returnNote = D.lastReturnNote(s, asn.id);
    const reworkOpen = D.assignmentOpenRework(p, asn);
    const returnLabel = reworkOpen ? 'На доработке:' : 'Предыдущее замечание:';
    modalNav(
      `${modalHead('Поручение', esc(asn.scopeTitle || 'Объём работ'))}
      <p class="small"><b>${esc(asn.executor)}</b> · осталось ${left.length} ${plural(left.length, 'задача', 'задачи', 'задач')}</p>
      ${returnNote ? `<p class="small demo-assign-return-note" data-testid="demo-assign-return-note" style="margin:.35rem 0"><span class="muted">${returnLabel}</span> ${esc(returnNote)}</p>` : ''}
      <ul class="list" style="max-height:40vh;overflow:auto;margin:.5rem 0">${list}</ul>
      ${demoDelegExecutorPanel(p, asn.id)}
      <div class="modal__foot" style="flex-wrap:wrap;gap:.5rem">
        <button type="button" class="btn btn--ghost" data-close>Закрыть</button>
        <button type="button" class="btn btn--ghost" id="demo-withdraw-ask" style="min-height:2.75rem;color:var(--primary)">Снять поручение</button>
      </div>`,
      {
        primarySelector: '#demo-withdraw-ask',
        onOpen(mo) {
          const guard = { projectId: p.id, assignmentId: asn.id };
          wireDelegDataNInModal(mo, returnFocusEl, guard);
          qs('#demo-withdraw-ask', mo).onclick = () => {
            const cur = activeProject();
            if (!D.projectGuardOk(cur, guard.projectId)) return toast('Проект изменился');
            const execLabel = D.assignmentById(D.ensureState(cur), guard.assignmentId)?.executor || asn.executor;
            modalNav(
              `${modalHead('Снять поручение?', esc(execLabel))}<p class="small">Задачи вернутся в ваш чек-лист. Прогресс и принятые работы не удаляются.</p>
              <div class="modal__foot"><button type="button" class="btn btn--ghost" data-close>Отмена</button><button type="button" class="btn btn--primary" id="demo-withdraw-ok">Снять поручение</button></div>`,
              {
                onOpen(m2) {
                  qs('#demo-withdraw-ok', m2).onclick = () => {
                    const live = activeProject();
                    if (!live || !D.projectGuardOk(live, guard.projectId)) return toast('Проект изменился');
                    const st = D.ensureState(live);
                    if (st.projectId !== guard.projectId) return toast('Проект изменился');
                    const asnLive = D.assignmentById(st, guard.assignmentId);
                    if (!asnLive || asnLive.status !== 'active') return toast('Поручение недоступно');
                    const ctxLive = D.openCtxFromAssignment(live, asnLive);
                    const r = D.withdrawAssignment(live, guard.assignmentId, ctxLive);
                    if (!r.ok) {
                      if (r.reason === 'pending_report') return demoDelegPendingToast(live, D, returnFocusEl, r.reportId);
                      if (r.reason === 'project') return toast('Проект изменился');
                      return toast('Нельзя снять поручение сейчас');
                    }
                    teardownNavModalA11y(qs('#modal'));
                    closeModal();
                    renderApp();
                    toast(`Поручение снято · ${r.released} ${plural(r.released, 'задача', 'задачи', 'задач')} снова ваши`);
                    returnFocusNavModalImmediate(returnFocusEl);
                  };
                },
              },
              mo
            );
          };
        },
      },
      returnFocusEl
    );
  }
  function demoReportReviewModal(p, reportId, returnFocusEl) {
    const D = window.RCNavDelegationDemo;
    const s = D.ensureState(p);
    const rep = D.pendingReportById(s, reportId);
    if (!rep) return toast('Отчёт недоступен');
    const asn = D.assignmentById(s, rep.assignmentId);
    const openCtx = demoAcceptOpenCtx(p, rep, asn);
    const guard = {
      projectId: p.id,
      reportId: rep.id,
      assignmentId: rep.assignmentId,
      openCtx,
    };
    const focusRef = demoDelegFocusFromOpenCtx(openCtx) || demoFocusCapture(returnFocusEl);
    const names = rep.taskIds
      .map((id) => stages(p).flatMap((l1) => l2of(p, l1).flatMap((l2) => tasksOf(p, l2))).find((t) => t.id === id))
      .filter(Boolean)
      .map((t) => `<li class="small">${esc(t.title)}</li>`)
      .join('');
    modalNav(
      `${modalHead('Проверка отчёта', 'Полезные итоги поручения')}
      <p class="small"><b>${esc(rep.executor)}</b> · ${new Date(rep.at).toLocaleString('ru-RU')}</p>
      ${rep.comment ? `<p class="small muted" style="margin:.5rem 0">${esc(rep.comment)}</p>` : ''}
      <ul class="list" style="margin:.75rem 0">${names}</ul>
      <label for="demo-return-note">Замечание при возврате</label>
      <textarea id="demo-return-note" placeholder="Обязательно при возврате" style="min-height:3.5rem;margin-top:.35rem"></textarea>
      <div class="modal__foot"><button type="button" class="btn btn--ghost" data-close>Отмена</button><button type="button" class="btn btn--ghost" id="demo-rpt-return" style="min-height:2.75rem">Вернуть с замечанием</button><button type="button" class="btn btn--primary" id="demo-rpt-accept" style="min-height:2.75rem">Принять выполнение</button></div>`,
      {
        delegReport: true,
        primarySelector: '#demo-rpt-accept',
        onOpen(mo) {
          let accepted = false;
          qs('#demo-rpt-accept', mo).onclick = () => {
            const cur = activeProject();
            if (accepted) return;
            if (!demoDelegReportGuard(cur, guard)) return toast('Проект или контекст изменились');
            const pinL2 = demoAcceptL2PinOk(cur, openCtx);
            const r = D.acceptReport(cur, reportId, { projectId: guard.projectId, assignmentId: guard.assignmentId });
            if (!r.ok) return toast('Отчёт уже обработан');
            if (pinL2) applyDemoAcceptL2Pin(cur, openCtx);
            accepted = true;
            teardownNavModalA11y(qs('#modal') || mo);
            closeModal();
            renderApp();
            toast(`Принято: ${r.count} ${plural(r.count, 'задача', 'задачи', 'задач')}`);
            returnFocusDelegationAfterRender(focusRef, returnFocusEl);
          };
          qs('#demo-rpt-return', mo).onclick = () => {
            const cur = activeProject();
            if (!demoDelegReportGuard(cur, guard)) return toast('Проект или контекст изменились');
            const note = qs('#demo-return-note', mo).value;
            const r = D.returnReport(cur, reportId, note, { projectId: guard.projectId, assignmentId: guard.assignmentId });
            if (!r.ok) return toast(r.reason === 'note' ? 'Укажите замечание' : 'Отчёт уже обработан');
            teardownNavModalA11y(qs('#modal') || mo);
            closeModal();
            renderApp();
            toast('Задачи возвращены исполнителю');
            returnFocusDelegationAfterRender(focusRef, returnFocusEl);
          };
        },
      },
      returnFocusEl
    );
  }
  function delegateModal(p, { taskIds = [], title = '', l2 = null, l1 = null, wholeRepair = false } = {}, returnFocusEl) {
    const scopeL1 = l1 || (l2 ? stages(p).find((x) => l2of(p, x).some((y) => y.id === l2.id)) : currentL1(p));
    const curL2 = l2 || (scopeL1 ? liteL2(p, scopeL1) : null);
    const defaultKind = taskIds.length ? 'points' : l2 ? 'l2' : l1 ? 'l1' : wholeRepair ? 'l1' : 'l2';
    let scopeKind = delegPickerViewKind(defaultKind);
    const openerSig = delegPickerOpenerSig(p, { taskIds, l2, l1, wholeRepair });
    const seededIds = delegInitialPickTaskIds(p, { taskIds, l2, l1, wholeRepair });
    const draft =
      delegPickerReopenPending &&
      delegPickerSessionDraft?.projectId === p.id &&
      delegPickerSessionDraft?.openerSig === openerSig
        ? delegPickerSessionDraft
        : null;
    delegPickerReopenPending = false;
    let pickState = {
      scopeKind: draft ? delegPickerViewKind(draft.scopeKind) : scopeKind,
      pickTaskIds: draft ? draft.pickTaskIds.map(String) : seededIds,
      focusL2Id: draft?.focusL2Id ?? (curL2 ? curL2.id : null),
      focusL1Id: draft?.focusL1Id ?? (scopeL1 ? scopeL1.id : null),
      openL1: draft?.openL1 ? { ...draft.openL1 } : {},
      openL2: draft?.openL2 ? { ...draft.openL2 } : {},
      pickerFocus: null,
      pickerScrollTop: draft?.pickerScrollTop || 0,
    };
    scopeKind = pickState.scopeKind;
    const buildCtx = () => {
      const picked = pickState;
      const ids = picked.pickTaskIds.map(String);
      const title = delegExactScopeTitle(p, ids);
      return demoDelegScope(p, {
        scopeKind: 'points',
        taskIds: ids,
        l2Ids: [],
        l1Ids: [],
        scopeTitle: title,
        exactTaskPick: true,
        forAssign: true,
      });
    };
    const guard = { projectId: p.id, openCtx: buildCtx(), navSnap: demoDelegNavSnap() };
    const allSelectableN = delegSelectableAllProjectIds(p).length;
    const scopeChips = DELEG_PICKER_VIEW_KINDS.map((id) => {
      const on = id === scopeKind;
      return `<button type="button" class="chip ${on ? 'is-on' : ''}" data-deleg-scope="${id}">${delegateScopeLabel(id)}</button>`;
    }).join('');
    const renderPreview = (ctx) => {
      const n = ctx.taskIds.length;
      const exBusy = ctx.excludedBusy ? ` · занято: ${ctx.excludedBusy}` : '';
      const exPend = ctx.excludedPending ? ` · на проверке: ${ctx.excludedPending}` : '';
      const viewLabel = delegateScopeLabel(scopeKind);
      return `<div id="deleg-scope-preview" data-testid="deleg-scope-preview">
        <p class="small muted" style="margin:0">Режим: ${esc(viewLabel)}</p>
        <p class="small" style="margin:.2rem 0 0"><b>${esc(ctx.scopeTitle || 'Ничего не выбрано')}</b></p>
        <p class="small muted" style="margin:.25rem 0 0">В поручение: <b data-testid="deleg-scope-preview-count">${n}</b> ${plural(n, 'пункт', 'пункта', 'пунктов')}${exBusy}${exPend}</p>
      </div>`;
    };
    let openCtx = buildCtx();
    const pickLabel = `Выбрать пункты · ${openCtx.taskIds.length} ${plural(openCtx.taskIds.length, 'пункт', 'пункта', 'пунктов')}`;
    const pickerHead = openCtx.taskIds.length ? delegPreviewTaskNames(p, openCtx.taskIds, 8) : '';
    const delegCloseHook = { run: null };
    modalNav(
      `${modalHead('Поручить', 'Локальное демо-поручение без отправки сообщений')}
      <div class="deleg-modal-body">
      <div class="deleg-scope-view"><span class="xs muted">Показать</span><div class="chips" id="deleg-scope-chips" style="margin-top:.35rem">${scopeChips}</div></div>
      ${renderPreview(openCtx)}
      <details class="deleg-scope-pick-wrap card card--soft" open style="margin:.75rem 0;padding:.55rem .75rem;border:1px solid var(--line)">
        <summary class="deleg-disclosure-summary small" id="deleg-pick-summary" data-testid="deleg-pick-summary">${icon('list-checks')} ${esc(pickLabel)}</summary>
        <div class="row row--between deleg-scope-pick__toolbar" style="gap:.5rem;flex-wrap:wrap;align-items:center;margin:.35rem 0 .25rem">
          <div class="deleg-scope-picker-names" data-testid="deleg-scope-picker-names">${pickerHead}</div>
          <button type="button" class="btn btn--ghost btn--sm" id="deleg-pick-clear" style="min-height:2.75rem">Сбросить</button>
        </div>
        <label class="deleg-scope-pick__select-all row deleg-scope-pick__parent" data-testid="deleg-pick-select-all" style="margin:.15rem 0 .35rem">
          <input type="checkbox" class="deleg-pick-all" id="deleg-pick-all" aria-label="Выбрать весь доступный объём">
          <span class="small"><b>Все доступные работы</b><span class="muted"> · ${allSelectableN} ${plural(allSelectableN, 'пункт', 'пункта', 'пунктов')}</span></span>
        </label>
        <div id="deleg-scope-picker-host" class="deleg-scope-picker-host">${delegScopePickerHtml(p, pickState)}</div>
      </details>
      <div style="margin-top:.75rem"><label for="d-name">Исполнитель (обязательно)</label><input id="d-name" class="demo-deleg-input" placeholder="Например, Сергей" maxlength="80" style="min-height:2.75rem"></div>
      <details class="deleg-scope-hint" style="margin-top:.5rem">
        <summary class="deleg-disclosure-summary xs muted">Подробнее о поручении</summary>
        <p class="xs muted" style="margin:.35rem 0 0">Новые пункты можно будет поручить отдельно. Отчёт исполнителя — в карточке поручения после создания.</p>
      </details>
      </div>
      <div class="modal__foot"><button type="button" class="btn btn--ghost" data-close>Отмена</button><button type="button" class="btn btn--primary" id="deleg-create" style="min-height:2.75rem" ${openCtx.taskIds.length ? '' : 'disabled'}>${icon('hand-helping')} Создать поручение</button></div>`,
      {
        delegReport: true,
        primarySelector: '#d-name',
        beforeClose: () => delegCloseHook.run?.(),
        onOpen(mo) {
          const D = window.RCNavDelegationDemo;
          const stashPickerDraft = () => {
            delegPickerSessionDraft = {
              projectId: p.id,
              openerSig,
              scopeKind: pickState.scopeKind,
              pickTaskIds: [...pickState.pickTaskIds],
              openL1: { ...pickState.openL1 },
              openL2: { ...pickState.openL2 },
              focusL2Id: pickState.focusL2Id,
              focusL1Id: pickState.focusL1Id,
              pickerScrollTop: pickState.pickerScrollTop || 0,
            };
            delegPickerReopenPending = true;
          };
          const capturePickerUi = (host) => {
            if (!host) return;
            const ae = document.activeElement;
            pickState.pickerFocus = null;
            if (ae && host.contains(ae)) {
              if (ae.classList.contains('deleg-pick-task')) pickState.pickerFocus = { kind: 'task', id: ae.value };
              else if (ae.classList.contains('deleg-pick-l2')) pickState.pickerFocus = { kind: 'l2', id: ae.value };
              else if (ae.classList.contains('deleg-pick-l1')) pickState.pickerFocus = { kind: 'l1', id: ae.value };
            }
            pickState.pickerScrollTop = host.scrollTop;
            qsa('.deleg-scope-pick__group--l1', host).forEach((el) => {
              const id = qs('.deleg-pick-l1', el)?.value;
              if (id) pickState.openL1[id] = el.hasAttribute('open');
            });
            qsa('.deleg-scope-pick__group--l2', host).forEach((el) => {
              const id = qs('.deleg-pick-l2', el)?.value;
              if (id) pickState.openL2[id] = el.hasAttribute('open');
            });
          };
          const escPickerSel = (id) => (typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(String(id)) : String(id).replace(/\\/g, '\\\\').replace(/"/g, '\\"'));
          const restorePickerUi = (host) => {
            if (!host) return;
            qsa('.deleg-scope-pick__group--l1', host).forEach((el) => {
              const id = qs('.deleg-pick-l1', el)?.value;
              if (!id) return;
              const want = Object.prototype.hasOwnProperty.call(pickState.openL1, id) ? !!pickState.openL1[id] : el.hasAttribute('open');
              if (want) el.setAttribute('open', '');
              else el.removeAttribute('open');
            });
            qsa('.deleg-scope-pick__group--l2', host).forEach((el) => {
              const id = qs('.deleg-pick-l2', el)?.value;
              if (!id) return;
              const want = Object.prototype.hasOwnProperty.call(pickState.openL2, id) ? !!pickState.openL2[id] : el.hasAttribute('open');
              if (want) el.setAttribute('open', '');
              else el.removeAttribute('open');
            });
            if (pickState.pickerScrollTop) host.scrollTop = pickState.pickerScrollTop;
            const f = pickState.pickerFocus;
            if (f?.id) {
              const sel =
                f.kind === 'task'
                  ? `.deleg-pick-task[value="${escPickerSel(f.id)}"]`
                  : f.kind === 'l2'
                    ? `.deleg-pick-l2[value="${escPickerSel(f.id)}"]`
                    : `.deleg-pick-l1[value="${escPickerSel(f.id)}"]`;
              host.querySelector(sel)?.focus({ preventScroll: true });
            }
          };
          let delegSelectAllProgrammatic = false;
          const syncSelectAllControl = () => {
            const allSel = delegSelectableAllProjectIds(p);
            const allInp = qs('#deleg-pick-all', mo);
            if (!allInp) return;
            const n = pickState.pickTaskIds.length;
            const full = allSel.length > 0 && n === allSel.length;
            const partial = n > 0 && n < allSel.length;
            delegSelectAllProgrammatic = true;
            try {
              if (allInp.checked !== full) allInp.checked = full;
              allInp.indeterminate = partial;
              allInp.setAttribute('aria-checked', partial ? 'mixed' : full ? 'true' : 'false');
            } finally {
              delegSelectAllProgrammatic = false;
            }
          };
          const syncPickTasksFromDom = () => {
            const tasks = qsa('.deleg-pick-task', mo);
            if (!tasks.length) return;
            const pickSet = new Set(pickState.pickTaskIds.map(String));
            tasks.forEach((inp) => {
              const id = String(inp.value);
              if (inp.checked) pickSet.add(id);
              else pickSet.delete(id);
            });
            pickState.pickTaskIds = [...pickSet];
          };
          const syncFromPicker = ({ rerender = true, readDom = true } = {}) => {
            const host = qs('#deleg-scope-picker-host', mo);
            if (readDom) syncPickTasksFromDom();
            pickState.scopeKind = scopeKind;
            openCtx = buildCtx();
            guard.openCtx = openCtx;
            if (rerender) {
              if (host) {
                capturePickerUi(host);
                host.innerHTML = delegScopePickerHtml(p, pickState);
                restorePickerUi(host);
              }
              delegSyncParentIndeterminate(mo);
            }
            syncSelectAllControl();
            const prev = qs('#deleg-scope-preview', mo);
            if (prev) prev.outerHTML = renderPreview(openCtx);
            const names = qs('[data-testid="deleg-scope-picker-names"]', mo);
            if (names) names.innerHTML = openCtx.taskIds.length ? delegPreviewTaskNames(p, openCtx.taskIds, 8) : '';
            const sum = qs('#deleg-pick-summary', mo);
            if (sum) {
              const n = openCtx.taskIds.length;
              sum.innerHTML = `${icon('list-checks')} Выбрать пункты · ${n} ${plural(n, 'пункт', 'пункта', 'пунктов')}`;
            }
            const btn = qs('#deleg-create', mo);
            if (btn) {
              const off = !openCtx.taskIds.length;
              btn.disabled = off;
              btn.setAttribute('aria-disabled', off ? 'true' : 'false');
              if (off) btn.setAttribute('disabled', '');
              else btn.removeAttribute('disabled');
            }
            qsa('.deleg-pick-task', mo).forEach((inp) => {
              inp.onchange = () => syncFromPicker({ readDom: true });
            });
            qsa('.deleg-pick-l1', mo).forEach((inp) => {
              inp.onchange = () => {
                const l1x = l1ById(p, inp.value);
                if (!l1x) return;
                const pickSet = new Set(pickState.pickTaskIds.map(String));
                delegApplyParentPick(p, pickSet, delegPickerL1SelectableIds(p, l1x), inp.checked);
                pickState.pickTaskIds = [...pickSet];
                syncFromPicker({ readDom: false });
              };
            });
            qsa('.deleg-pick-l2', mo).forEach((inp) => {
              inp.onchange = () => {
                const found = delegFindL2(p, inp.value);
                if (!found) return;
                const pickSet = new Set(pickState.pickTaskIds.map(String));
                delegApplyParentPick(p, pickSet, delegPickerL2SelectableIds(p, found.l2), inp.checked);
                pickState.pickTaskIds = [...pickSet];
                syncFromPicker({ readDom: false });
              };
            });
            qsa('[data-deleg-parent-stop]', mo).forEach((lab) => {
              lab.onclick = (ev) => ev.stopPropagation();
            });
            bindSelectAllInput();
          };
          const setViewKind = (kind) => {
            scopeKind = delegPickerViewKind(kind);
            pickState.scopeKind = scopeKind;
            qsa('[data-deleg-scope]', mo).forEach((b) => b.classList.toggle('is-on', b.dataset.delegScope === scopeKind));
            syncFromPicker({ readDom: false });
          };
          const clearBtn = qs('#deleg-pick-clear', mo);
          if (clearBtn) {
            clearBtn.onclick = () => {
              pickState.pickTaskIds = [];
              delegPickerSessionDraft = null;
              delegPickerReopenPending = false;
              syncFromPicker({ readDom: false });
            };
          }
          const onSelectAll = (inp) => {
            const allInp = inp || qs('#deleg-pick-all', mo);
            if (!allInp) return;
            const all = delegSelectableAllProjectIds(p);
            pickState.pickTaskIds = allInp.checked ? all.map(String) : [];
            syncFromPicker({ readDom: false, rerender: true });
          };
          const bindSelectAllInput = () => {
            const allInp = qs('#deleg-pick-all', mo);
            if (!allInp || allInp.dataset.delegPickAllWired === '1') return;
            allInp.dataset.delegPickAllWired = '1';
            allInp.addEventListener('change', () => {
              if (delegSelectAllProgrammatic) return;
              onSelectAll(allInp);
            });
          };
          bindSelectAllInput();
          qsa('[data-deleg-scope]', mo).forEach((b) => {
            b.onclick = () => {
              if (b.disabled) return;
              setViewKind(b.dataset.delegScope);
            };
          });
          delegCloseHook.run = () => {
            syncFromPicker({ readDom: true, rerender: false });
            stashPickerDraft();
          };
          syncFromPicker({ readDom: false });
          qs('#deleg-create', mo).onclick = () => {
            syncFromPicker({ readDom: true });
            const cur = activeProject();
            if (!demoDelegModalGuard(cur, guard)) return toast('Проект или контекст изменились');
            const exec = qs('#d-name', mo).value.trim();
            if (!exec) return toast('Укажите исполнителя');
            const r = D.startAssignment(cur, openCtx, exec, openCtx.taskIds);
            if (!r.ok) {
              if (r.reason === 'pending_report') return demoDelegPendingToast(cur, D, returnFocusEl);
              if (r.reason === 'overlap') return toast(`Нет свободных задач (${r.excluded || 0} уже поручены)`);
              if (r.reason === 'exists') return toast('Поручение с таким объёмом уже есть — откройте его в списке');
              return toast(r.reason === 'tasks' ? 'Нет подходящих задач' : 'Не удалось создать поручение');
            }
            if (view.sel) view.sel.clear();
            delegPickerSessionDraft = null;
            delegPickerReopenPending = false;
            D.persist(cur);
            teardownNavModalA11y(qs('#modal') || mo);
            closeModal();
            renderApp();
            const msg = r.idempotent ? 'Поручение уже создано' : `Поручено ${r.count} ${plural(r.count, 'задача', 'задачи', 'задач')} — ${exec}`;
            toast(msg);
            if (r.assignmentId) demoAssignmentDetailModal(cur, r.assignmentId, returnFocusEl || qs('[data-n="delegate"]'));
            else returnFocusNavModalImmediate(returnFocusEl);
          };
        },
      },
      returnFocusEl
    );
  }
  function conciergeModal(p, { what = 'весь ремонт', taskIds = [], l2 = null, l1 = null } = {}) {
    modal(`${modalHead('Поручить консьержу RemCard', 'Подберём исполнителя, согласуем смету и проконтролируем')}
      <div><label>Что поручаем</label><div class="chips" id="c-scope">${[['task', what.startsWith('весь') ? 'Задачу / подэтап' : what.charAt(0).toUpperCase() + what.slice(1)], ['stage', 'Весь этап'], ['all', 'Весь ремонт']].map(([id, t], k) => `<button class="chip ${k === 0 ? 'is-on' : ''}" data-sc="${id}">${t}</button>`).join('')}</div></div>
      <div style="margin-top:.75rem"><label>Комментарий</label><textarea id="c-text" placeholder="Сроки, пожелания, бюджет"></textarea></div>
      <div style="margin-top:.75rem"><label>Как с вами связаться</label><div class="grid2"><input id="c-phone" placeholder="+7 ___ ___-__-__"><select id="c-msg"><option>MAX</option><option>Telegram</option><option>WhatsApp</option><option>Звонок</option></select></div></div>
      <div class="modal__foot"><button class="btn btn--ghost" data-close>Отмена</button><button class="btn btn--primary" id="c-send">${icon('send')} Отправить запрос</button></div>`, {
      onOpen(mo) { qsa('[data-sc]', mo).forEach((b) => b.onclick = () => qsa('[data-sc]', mo).forEach((x) => x.classList.toggle('is-on', x === b))); qs('#c-send', mo).onclick = () => { p.concierge.push({ id: uid(), what, text: qs('#c-text', mo).value, date: Date.now() }); closeModal(); toast('Запрос отправлен консьержу — ответим в течение часа'); }; },
    });
  }
  function expenseCatLabel(catId) {
    return D.expenseCats.find((c) => c[0] === catId)?.[1] || catId;
  }
  function expenseStageTitle(p, stageL1Id) {
    return stages(p).find((s) => s.id === stageL1Id)?.title || '—';
  }
  function expenseCategoryRecords(p, catId) {
    return [...p.expenses]
      .filter((e) => e.category === catId)
      .sort((a, b) => (b.date || '').localeCompare(a.date || '') || String(b.id || '').localeCompare(String(a.id || '')));
  }
  function expenseEmptyDraft(l1Id) {
    return { amount: '', date: new Date().toISOString().slice(0, 10), comment: '', stageId: l1Id };
  }
  function expenseModalPresetsHtml(presets) {
    if (!presets.length) return '';
    return `<p class="expense-modal__label">Быстрый выбор</p><div class="expense-modal__presets chips" data-testid="expense-presets">${presets
      .map((pr, i) => `<button type="button" class="chip expense-modal__preset" data-pr="${i}" data-pr-cat="${esc(pr[1])}">${esc(pr[0])} · ${fmt(pr[2])} ₽</button>`)
      .join('')}</div>`;
  }
  function expenseCategorySummaryHtml(p, catId) {
    const label = expenseCatLabel(catId);
    const rows = expenseCategoryRecords(p, catId);
    const total = rows.reduce((a, e) => a + e.amount, 0);
    const list = rows.length
      ? `<ul class="expense-modal__list">${rows
        .map(
          (e) => `<li class="expense-modal__record" data-testid="expense-saved-record"><span class="expense-modal__record-amt">${money(e.amount)}</span><span class="expense-modal__record-meta"><time datetime="${esc(e.date)}">${esc(dateRu(e.date))}</time><span class="expense-modal__record-stage">${esc(expenseStageTitle(p, e.stageL1Id))}</span><span class="expense-modal__record-comment">${esc(e.comment)}</span></span></li>`
        )
        .join('')}</ul>`
      : `<p class="expense-modal__empty" data-testid="expense-category-empty">В категории «${esc(label)}» записей пока нет.</p>`;
  return `<section class="expense-modal__saved" data-testid="expense-category-saved" aria-live="polite"><h4 class="expense-modal__saved-title">Расходы категории «${esc(label)}»</h4><p class="expense-modal__saved-meta" data-testid="expense-category-meta">${rows.length} ${plural(rows.length, 'запись', 'записи', 'записей')} · ${money(total)}</p>${list}</section>`;
  }
  function expenseModalMarkup(p, l1Id, initialCat = 'work') {
    const l1 = NAV.stagesL1.find((x) => x.id === l1Id);
    const presets = (D.expensePresets[l1Id] || []).filter((pr) => pr[1] === initialCat);
    const today = new Date().toISOString().slice(0, 10);
    return `${modalHead('Добавить расход', `Этап «${esc(l1?.title || '')}»`)}
      <div class="expense-modal" data-testid="expense-modal">
        <div id="e-presets-mount">${expenseModalPresetsHtml(presets)}</div>
        <div class="expense-modal__form">
          <p class="expense-modal__label" id="e-cat-label">Категория</p>
          <div class="chips expense-modal__cats" id="e-cat" role="tablist" aria-labelledby="e-cat-label">${D.expenseCats
      .map(([id, t], k) => `<button type="button" class="chip expense-modal__cat ${id === initialCat ? 'is-on' : ''}" data-cat="${id}" role="tab" aria-selected="${id === initialCat ? 'true' : 'false'}">${esc(t)}</button>`)
      .join('')}</div>
          <div class="grid2 expense-modal__grid">
            <div><label for="e-amount">Сумма, ₽</label><input type="number" id="e-amount" inputmode="decimal" min="0" step="1" placeholder="0" autocomplete="off"></div>
            <div><label for="e-date">Дата</label><input type="date" id="e-date" value="${today}"></div>
          </div>
          <div class="expense-modal__field"><label for="e-comment">Комментарий</label><input id="e-comment" placeholder="За что платили" autocomplete="off"></div>
          <div class="expense-modal__field"><label for="e-stage">Этап</label><p class="expense-modal__field-hint xs muted" id="e-stage-hint">Можно выбрать любой этап ремонта</p><select id="e-stage" aria-describedby="e-stage-hint">${stages(p)
      .map((s) => `<option value="${s.id}" ${s.id === l1Id ? 'selected' : ''}>${esc(s.title)}</option>`)
      .join('')}</select></div>
        </div>
        <div class="modal__foot expense-modal__foot expense-modal__foot--primary"><button type="button" class="btn btn--ghost" data-close>Отмена</button><button type="button" class="btn btn--primary" id="e-save">Сохранить расход</button></div>
        <div id="e-saved-wrap">${expenseCategorySummaryHtml(p, initialCat)}</div>
      </div>`;
  }
  function bindExpenseModal(mo, p, l1Id, projectId) {
    const drafts = Object.fromEntries(D.expenseCats.map(([id]) => [id, expenseEmptyDraft(l1Id)]));
    let activeCat = 'work';
    const box = qs('.modal__box', mo);
    if (box) box.classList.add('modal__box--expense', 'modal__box--nav-ux');
    const readForm = () => ({
      amount: qs('#e-amount', mo).value,
      date: qs('#e-date', mo).value,
      comment: qs('#e-comment', mo).value,
      stageId: qs('#e-stage', mo).value,
    });
    const writeForm = (d) => {
      qs('#e-amount', mo).value = d.amount;
      qs('#e-date', mo).value = d.date;
      qs('#e-comment', mo).value = d.comment;
      qs('#e-stage', mo).value = d.stageId;
    };
    const persistDraft = () => {
      drafts[activeCat] = readForm();
    };
    const refreshSavedList = () => {
      const wrap = qs('#e-saved-wrap', mo);
      if (wrap) wrap.innerHTML = expenseCategorySummaryHtml(p, activeCat);
    };
    const selectedStageId = () => qs('#e-stage', mo)?.value || l1Id;
    const refreshPresets = () => {
      const mount = qs('#e-presets-mount', mo);
      if (!mount) return;
      const stageId = selectedStageId();
      const catPresets = (D.expensePresets[stageId] || []).filter((pr) => pr[1] === activeCat);
      mount.innerHTML = expenseModalPresetsHtml(catPresets);
      qsa('[data-pr]', mount).forEach((b) => {
        b.onclick = () => {
          const pr = catPresets[+b.dataset.pr];
          if (!pr) return;
          qs('#e-comment', mo).value = pr[0];
          qs('#e-amount', mo).value = String(pr[2]);
          persistDraft();
        };
      });
    };
    const setCat = (next) => {
      if (next === activeCat) return;
      persistDraft();
      activeCat = next;
      qsa('[data-cat]', mo).forEach((b) => {
        const on = b.dataset.cat === activeCat;
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      writeForm(drafts[activeCat]);
      refreshPresets();
      refreshSavedList();
    };
    qsa('[data-cat]', mo).forEach((b) => {
      b.onclick = () => setCat(b.dataset.cat);
    });
    const stageSel = qs('#e-stage', mo);
    if (stageSel) {
      stageSel.onchange = () => {
        persistDraft();
        drafts[activeCat].stageId = selectedStageId();
        refreshPresets();
      };
    }
    refreshPresets();
    qs('#e-save', mo).onclick = () => {
      persistDraft();
      const d = drafts[activeCat];
      const guard = liveProjectMutationGuard(p, projectId, { stageL1Id: d.stageId });
      if (!guard.ok) {
        toast('Режим просмотра или проект изменился — сохранение отменено');
        return;
      }
      const amount = Number(d.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        toast('Укажите положительную сумму');
        return;
      }
      if (!d.date) {
        toast('Укажите дату');
        return;
      }
      guard.live.expensesConfirmed = false;
      guard.live.expenses.push({
        id: uid(),
        stageL1Id: d.stageId,
        category: activeCat,
        amount,
        comment: d.comment.trim() || expenseCatLabel(activeCat),
        date: d.date,
      });
      closeModal();
      renderApp();
      toast(`Расход ${money(amount)} добавлен`);
    };
  }
  function expenseModal(p, l1Id) {
    if (p.shared) {
      toast('Режим просмотра — изменения недоступны');
      return;
    }
    const projectId = p.id;
    modal(expenseModalMarkup(p, l1Id), {
      onOpen(mo) {
        bindExpenseModal(mo, p, l1Id, projectId);
      },
    });
  }
  function budgetAllRecordsHtml(p, { readonly = false } = {}) {
    const rows = [...p.expenses].sort(
      (a, b) => (b.date || '').localeCompare(a.date || '') || String(b.id || '').localeCompare(String(a.id || ''))
    );
    if (!rows.length) {
      const hint = readonly
        ? 'Записей пока нет.'
        : 'Записей пока нет — добавьте расход кнопкой «Записать расход» в боковой колонке или ниже.';
      return `<p class="small budget-modal__empty" data-testid="budget-records-empty">${hint}</p>`;
    }
    return `<p class="budget-modal__records-meta xs muted" data-testid="budget-records-count">${rows.length} ${plural(rows.length, 'запись', 'записи', 'записей')} по всем этапам</p><div class="budget-modal__records rows" data-testid="budget-all-records">${rows
      .map((e) => {
        const cat = expenseCatLabel(e.category);
        const st = expenseStageTitle(p, e.stageL1Id);
        const del = readonly
          ? ''
          : ` <button type="button" class="btn btn--ghost btn--sm btn--icon budget-modal__del" data-del="${e.id}" aria-label="Удалить">${icon('x')}</button>`;
        return `<div class="budget-modal__record"><span>${esc(e.comment)} <span class="xs muted">· ${esc(cat)} · ${esc(st)} · ${esc(dateRu(e.date))}</span></span><b>${money(e.amount)}${del}</b></div>`;
      })
      .join('')}</div>`;
  }
  function budgetModalMarkup(p) {
    const plan = planTotal(p), fact = factTotal(p), s = stages(p);
    const readonly = !!p.shared;
    const variance = budgetVariance(plan, fact, p.expenses.length > 0 || !!p.expensesConfirmed, !!p.expensesConfirmed && s.every((l1) => p.completedL1.has(l1.id)));
    const byCat = D.expenseCats.map(([id, t]) => [t, p.expenses.filter((e) => e.category === id).reduce((a, e) => a + e.amount, 0)]);
    const rows = s.map((l1) => ({ l1, plan: p.estimate ? (p.estimate.breakdown.find((b) => b.id === l1.id)?.total ?? stagePlan(p, l1.id)) : stagePlan(p, l1.id), fact: stageFact(p, l1.id) }));
    const loc = p.locality || projectLocality(p.estimate);
    const approx = L.isCustom(loc) ? `<p class="locality-caveat" style="margin-top:.75rem">${esc(L.CAVEAT)}</p>` : '';
    const addBtn = readonly ? '' : `<button type="button" class="btn btn--primary" id="b-add">${icon('plus')} Добавить расход</button>`;
    return `${modalHead('Расходы по проекту', 'Один общий журнал · план из расчёта, факт из ваших записей')}
      ${approx}
      <div class="kpis" style="grid-template-columns:1fr 1fr 1fr"><div class="kpi"><span class="eyebrow">План</span><b style="font-size:1.2rem">${moneyShort(plan)}</b></div><div class="kpi"><span class="eyebrow">Факт</span><b style="font-size:1.2rem" class="${fact > plan ? 'red' : ''}">${moneyShort(fact)}</b></div><div class="kpi budget-variance budget-variance--${variance.kind}" data-testid="project-budget-variance"><span class="eyebrow">${icon(variance.icon)} ${variance.label}</span><b style="font-size:1.2rem">${variance.amount}</b></div></div>
      ${fact > plan ? `<div class="notice notice--amber" style="margin-top:.75rem">${icon('alert-triangle')}<span>Превышение плана на ${moneyShort(fact - plan)}. Проверьте этапы с отклонением.</span></div>` : ''}
      <h4 style="margin:1.25rem 0 .5rem">По категориям</h4><div class="rows">${byCat.map(([t, v]) => `<div><span>${t}</span><b>${money(v)}</b></div>`).join('')}</div>
      <h4 style="margin:1.25rem 0 .5rem">По этапам</h4><div class="bars">${rows.map((r) => `<div class="bar"><span class="bar__ico">${stageIcon(r.l1.id)}</span><span>${r.l1.title}</span><span class="bar__track"><i style="width:${r.plan ? Math.min(100, r.fact / r.plan * 100) : 0}%;${r.fact > r.plan ? 'background:var(--amber)' : ''}"></i></span><b>${moneyShort(r.fact)} <span class="xs muted">/ ${moneyShort(r.plan)}</span></b></div>`).join('')}</div>
      <h4 class="budget-modal__all-title" style="margin:1.25rem 0 .5rem">Все записи</h4>${budgetAllRecordsHtml(p, { readonly })}
      <div class="modal__foot budget-modal__foot"><button type="button" class="btn btn--ghost" data-close>Закрыть</button>${addBtn}</div>`;
  }
  function bindBudgetModal(mo, p, projectId) {
    const box = qs('.modal__box', mo);
    if (box) box.classList.add('modal__box--budget', 'modal__box--nav-ux');
    const add = qs('#b-add', mo);
    if (add) {
      add.onclick = () => {
        if (!liveProjectMutationGuard(p, projectId).ok) {
          toast('Режим просмотра или проект изменился — сохранение отменено');
          return;
        }
        expenseModal(p, currentL1(p).id);
      };
    }
    qsa('[data-del]', mo).forEach((b) => {
      b.onclick = () => {
        const guard = liveProjectMutationGuard(p, projectId);
        if (!guard.ok) {
          toast('Режим просмотра или проект изменился — сохранение отменено');
          return;
        }
        const delId = b.dataset.del;
        guard.live.expensesConfirmed = false;
        guard.live.expenses = guard.live.expenses.filter((e) => e.id !== delId);
        budgetModal(guard.live);
        renderApp();
      };
    });
  }
  function budgetModal(p) {
    const projectId = p.id;
    modal(budgetModalMarkup(p), {
      onOpen(mo) {
        bindBudgetModal(mo, p, projectId);
      },
    });
  }
  function docsModal(p, l1Id) {
    const l1 = NAV.stagesL1.find((x) => x.id === l1Id), docs = p.documents.filter((d) => d.stageL1Id === l1Id);
    modal(`${modalHead('Документы этапа', l1.title)}
      ${docs.length ? `<div class="rows" style="margin-bottom:1rem">${docs.map((d) => `<div><span>${icon('file-text')} ${esc(d.title)} <span class="pill">${DOC_TYPES.find((x) => x[0] === d.type)[1]}</span></span><b>${d.amount ? money(d.amount) : ''}</b></div>`).join('')}</div>` : '<p class="small" style="margin-bottom:1rem">Чеки, договоры, гарантийные талоны и акты — всё в одном месте и доступно по общей ссылке.</p>'}
      <div><label>Тип</label><div class="chips" id="doc-type">${DOC_TYPES.map(([id, t], k) => `<button class="chip ${k === 0 ? 'is-on' : ''}" data-dt="${id}">${t}</button>`).join('')}</div></div>
      <div class="grid2" style="margin-top:.75rem"><div><label>Название</label><input id="doc-title" placeholder="Чек Леруа Мерлен"></div><div><label>Сумма, ₽ (необязательно)</label><input type="number" id="doc-amount" min="0"></div></div>
      <div class="photo photo--add" style="aspect-ratio:auto;padding:1rem;margin-top:.75rem">${icon('camera', 'i--20')}<span>Прикрепить файл или фото (в прототипе — заглушка)</span></div>
      <div class="modal__foot"><button class="btn btn--ghost" data-close>Закрыть</button><button class="btn btn--primary" id="doc-save">Сохранить</button></div>`, {
      onOpen(mo) { let type = 'receipt'; qsa('[data-dt]', mo).forEach((b) => b.onclick = () => { type = b.dataset.dt; qsa('[data-dt]', mo).forEach((x) => x.classList.toggle('is-on', x === b)); }); qs('#doc-save', mo).onclick = () => { const title = qs('#doc-title', mo).value.trim(); if (!title) return toast('Укажите название'); p.documents.push({ id: uid(), stageL1Id: l1Id, type, title, amount: +qs('#doc-amount', mo).value || 0 }); closeModal(); renderApp(); toast('Документ добавлен'); }; },
    });
  }
  function eventsModal(p, l1Id, returnFocusEl) {
    const l1 = l1Id ? NAV.stagesL1.find((x) => x.id === l1Id) : currentL1(p);
    const sub = l1 ? l1.title : esc(p.name);
    if (p.shared) {
      modalNav(
        `${modalHead('Отчёты исполнителей', sub)}<p class="small muted" style="margin:0">В режиме просмотра отчёты и поручения недоступны.</p><div class="modal__foot"><button type="button" class="btn btn--ghost" data-close>Закрыть</button></div>`,
        {},
        returnFocusEl
      );
      return;
    }
    const D = window.RCNavDelegationDemo;
    if (!D) {
      modal(`${modalHead('Отчёты исполнителей', sub)}<p class="small muted">Поручения в демо недоступны.</p><div class="modal__foot"><button class="btn btn--ghost" data-close>Закрыть</button></div>`);
      return;
    }
    const { pending, history, hasAssignments } = delegContractorReportsUi(p);
    const pendingHtml = pending.length
      ? `<div class="stack contractor-reports-pending" style="gap:.35rem" data-testid="contractor-reports-pending">${pending
          .map((row) => {
            const asn = D.assignmentById(D.ensureState(p), row.assignmentId);
            const scopeLine = delegReportInboxScopeLine(row, asn);
            return `<button type="button" class="btn btn--ghost btn--block contractor-reports-row deleg-work-row" data-n="demo-report-review" data-a="${escAttr(row.id)}" style="justify-content:flex-start;min-height:2.75rem;text-align:left"><span class="contractor-reports-row__main"><b class="contractor-reports-row__name">${esc(row.executor)}</b><span class="small muted contractor-reports-row__scope">${scopeLine}</span></span>${icon('chevron-right', 'i--16')}</button>`;
          })
          .join('')}</div>`
      : '';
    const historyHtml = history.length
      ? `<div class="contractor-reports-history" data-testid="contractor-reports-history" style="margin-top:.85rem;padding-top:.65rem;border-top:1px solid var(--line)"><span class="xs muted eyebrow" style="display:block;margin-bottom:.35rem">История</span><ul class="contractor-reports-history__list">${history
          .slice()
          .reverse()
          .slice(0, 8)
          .map((row) => {
            const st =
              row.status === 'accepted'
                ? 'Принят'
                : row.status === 'returned'
                  ? 'Возврат на доработку'
                  : row.status === 'pending'
                    ? 'На проверке'
                    : String(row.status || '');
            return `<li class="contractor-reports-history__item small"><b>${esc(row.executor || 'Исполнитель')}</b> · ${esc(st)}<span class="muted"> · ${row.taskIds?.length || 0} ${plural(row.taskIds?.length || 0, 'пункт', 'пункта', 'пунктов')}</span></li>`;
          })
          .join('')}</ul></div>`
      : '';
    const emptyHtml = !pending.length
      ? hasAssignments
        ? '<p class="small muted contractor-reports-empty" data-testid="contractor-reports-empty">Отчётов на проверке пока нет. Когда исполнитель отправит отчёт по поручению, он появится здесь.</p>'
        : '<p class="small muted contractor-reports-empty" data-testid="contractor-reports-empty">Поручений и отчётов исполнителей пока нет.</p>'
      : '';
    modalNav(
      `${modalHead('Отчёты исполнителей', sub)}
      ${pendingHtml || emptyHtml}
      ${historyHtml}
      <div class="modal__foot"><button type="button" class="btn btn--ghost" data-close style="min-height:2.75rem">Закрыть</button></div>`,
      {
        delegReport: true,
        onOpen(mo) {
          qsa('.contractor-reports-row', mo).forEach((btn) => {
            btn.onclick = () => {
              teardownNavModalA11y(qs('#modal') || mo);
              closeModal();
              onClick({ target: btn, preventDefault() {} });
            };
          });
        },
      },
      returnFocusEl
    );
  }
  function materialsModal(p, l1Id) {
    const l1 = NAV.stagesL1.find((x) => x.id === l1Id), list = NAV.materials.filter((m) => m.stageL1Id === l1Id);
    modal(`${modalHead('Список покупок', l1.title)}<ul class="tasks">${list.map((m) => `<li class="task ${p.materials.has(m.id) ? 'is-done' : ''}"><span class="task__box" data-mat="${m.id}">${icon('check')}</span><span><span class="task__title">${esc(m.name)} <span class="xs muted">· ${esc(m.unit)}</span></span>${m.hint ? `<div class="xs muted">${esc(m.hint)}</div>` : ''}</span><span></span></li>`).join('')}</ul>
      <div class="modal__foot"><a class="btn btn--ghost" href="#/catalog?kind=store&stage=${l1Id}" data-close>${icon('store')} Магазины партнёров</a><button class="btn btn--primary" data-close>Готово</button></div>`, {
      onOpen(mo) { qsa('[data-mat]', mo).forEach((b) => b.onclick = () => { const id = b.dataset.mat; p.materials.has(id) ? p.materials.delete(id) : p.materials.add(id); b.closest('.task').classList.toggle('is-done'); }); },
    });
  }
  function matCalcModal(p, l1Id) {
    const items = l1Id === 'all' ? NAV.materialCalcItems : NAV.materialCalcItems.filter((m) => m.stageL1Id === l1Id);
    const render = (area) => items.map((m) => { const need = m.consumptionPerM2 * area; const packs = Math.ceil(need * 1.1 / m.packageSize); return `<div class="evt"><div><b class="ink">${esc(m.name)}</b><small>${fmt(m.consumptionPerM2 * 1000) / 1000} ${m.unit}/м² · упаковка ${m.packageSize} ${m.unit} · ${esc(m.brands || '')}</small>${m.hint ? `<small>${esc(m.hint)}</small>` : ''}</div><div style="text-align:right"><b>${packs} ${plural(packs, 'уп.', 'уп.', 'уп.')}</b><small>${fmt(need * 10) / 10} ${m.unit} + 10 %</small></div></div>`; }).join('');
    modal(`${modalHead('Калькулятор расхода материалов', 'С запасом 10 %')}
      <div class="row" style="margin-bottom:1rem"><label style="margin:0">Площадь обработки, м²</label><input type="number" id="mc-area" value="${p.area}" min="1" style="max-width:140px"></div>
      <div class="stack" id="mc-list" style="gap:.5rem">${render(p.area)}</div>
      <a class="link small" href="#/calc/materials" data-close style="display:inline-flex;gap:.3rem;align-items:center;margin-top:.75rem">${icon('calculator')} Подробные калькуляторы: плитка, обои, стяжка, двери и ещё 16 ${icon('arrow-right')}</a>
      <div class="modal__foot"><button class="btn btn--ghost" data-close>Закрыть</button><a class="btn btn--primary" href="#/catalog?kind=store" data-close>${icon('store')} Где купить</a></div>`, {
      onOpen(mo) { qs('#mc-area', mo).oninput = (e) => { qs('#mc-list', mo).innerHTML = render(+e.target.value || 0); }; },
    });
  }
  function pricesModal(p, l1Id) {
    const l1 = NAV.stagesL1.find((x) => x.id === l1Id), list = NAV.marketPrices.filter((m) => m.stageL1Id === l1Id);
    modal(`${modalHead('Средние цены на работы', `${l1.title} · Краснодар, 2026`)}<table class="table"><thead><tr><th>Работа</th><th>Ед.</th><th>Мин</th><th>Средняя</th><th>Макс</th></tr></thead><tbody>${list.map((m) => `<tr><td>${esc(m.name)}</td><td>${esc(m.unit)}</td><td>${fmt(m.priceMin)}</td><td><b>${fmt(m.priceAvg)}</b></td><td>${fmt(m.priceMax)}</td></tr>`).join('')}</tbody></table>
      <p class="xs" style="margin-top:.75rem">Ориентир для проверки смет. Если мастер просит заметно больше — спросите, что входит.</p><div class="modal__foot"><button class="btn btn--ghost" data-close>Закрыть</button><a class="btn btn--primary" href="#/catalog?kind=specialist&stage=${l1Id}" data-close>Найти мастера</a></div>`);
  }
  function workerModal(p, l2Id) {
    const w = p.workers[l2Id] || {};
    modal(`${modalHead('Кто выполнял работы')}<div class="grid2"><div><label>Имя</label><input id="w-name" value="${esc(w.name || '')}" placeholder="Сергей"></div><div><label>Телефон</label><input id="w-phone" value="${esc(w.phone || '')}" placeholder="+7 ___"></div></div><div style="margin-top:.75rem"><label>Заметка</label><input id="w-note" value="${esc(w.note || '')}" placeholder="Гарантия 2 года, договор №…"></div>
      <div class="modal__foot">${w.name ? `<button class="btn btn--ghost" id="w-del">Удалить</button>` : ''}<button class="btn btn--ghost" data-close>Отмена</button><button class="btn btn--primary" id="w-save">Сохранить</button></div>`, {
      onOpen(mo) { qs('#w-save', mo).onclick = () => { const name = qs('#w-name', mo).value.trim(); if (!name) return toast('Укажите имя'); p.workers[l2Id] = { name, phone: qs('#w-phone', mo).value.trim(), note: qs('#w-note', mo).value.trim() }; closeModal(); renderApp(); }; const d = qs('#w-del', mo); if (d) d.onclick = () => { delete p.workers[l2Id]; closeModal(); renderApp(); }; },
    });
  }
  function searchModal(p) {
    modal(`${modalHead('Поиск по маршруту', 'Этапы, подэтапы и задачи')}<input id="s-q" placeholder="Например: стяжка, розетки, гидроизоляция" value="${esc(view.search)}" autofocus><div id="s-res" class="stack" style="margin-top:1rem;gap:.4rem"></div>`, {
      onOpen(mo) {
        const q = qs('#s-q', mo), res = qs('#s-res', mo);
        const run = () => { const v = q.value.trim().toLowerCase(); view.search = v; if (v.length < 2) { res.innerHTML = '<p class="small">Введите минимум 2 символа.</p>'; return; } const hits = []; stages(p).forEach((l1) => l2of(p, l1).forEach((l2) => { if (l2.title.toLowerCase().includes(v) || l2.description.toLowerCase().includes(v)) hits.push({ l1, l2 }); tasksOf(p, l2).forEach((t) => { if (t.title.toLowerCase().includes(v)) hits.push({ l1, l2, t }); }); })); res.innerHTML = hits.length ? hits.slice(0, 20).map((h) => `<button class="evt" data-h1="${h.l1.id}" data-h2="${h.l2.id}" style="text-align:left;width:100%"><div><b class="ink">${hl(h.t ? h.t.title : h.l2.title)}</b><small>${h.l1.title} · ${h.t ? esc(h.l2.title) : 'подэтап'}</small></div>${icon('chevron-right')}</button>`).join('') : '<p class="small">Ничего не найдено.</p>'; qsa('[data-h1]', res).forEach((b) => b.onclick = () => { p.currentL1 = b.dataset.h1; view.l2Open = b.dataset.h2; p.stageModes[b.dataset.h1] = 'list'; closeModal(); renderApp(); setTimeout(() => { const el = qs('.l2.is-open'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 50); }); };
        q.oninput = run; run(); q.focus();
      },
    });
  }
  function menuModalRow(id, ic, label, { testid = '', danger = false } = {}) {
    const tid = testid ? ` data-testid="${testid}"` : '';
    const extra = danger ? ' menu-modal__row--danger' : '';
    return `<button type="button" class="menu-modal__row${extra}" id="${id}"${tid}>${icon(ic, 'menu-modal__ico')}<span class="menu-modal__label">${label}</span></button>`;
  }
  function menuModalSection(title, slug, rowsHtml) {
    if (!rowsHtml) return '';
    return `<section class="menu-modal__section" aria-labelledby="menu-sec-${slug}"><h4 class="menu-modal__section-title" id="menu-sec-${slug}">${esc(title)}</h4><div class="menu-modal__section-body">${rowsHtml}</div></section>`;
  }
  function menuModalMarkup(p) {
    const shared = !!p.shared;
    const head = shared
      ? modalHead('Просмотр маршрута', 'Режим просмотра: изменения не сохраняются')
      : `<div class="modal__head menu-modal__head"><div class="menu-modal__head-main"><h3>Проект</h3><p class="menu-modal__project-name">${esc(p.name)}</p></div><button type="button" class="btn btn--ghost btn--icon" data-close aria-label="Закрыть">${icon('x')}</button></div>`;
    const projectRows = shared
      ? menuModalRow('mm-nav-settings', 'settings', 'Настройки навигатора', { testid: 'mm-nav-settings' })
      : `${menuModalRow('mm-nav-settings', 'settings', 'Настройки навигатора', { testid: 'mm-nav-settings' })}
      ${menuModalRow('mm-rename', 'pencil', 'Переименовать')}
      ${menuModalRow('mm-projects', 'layers', `Мои проекты (${state.projects.length}) · новый проект`)}
      ${menuModalRow('mm-project-save-info', 'info', 'О сохранении проекта', { testid: 'mm-project-save-info' })}`;
    const teamRows = shared
      ? ''
      : `${menuModalRow('mm-delegate-project', 'hand-helping', 'Поручить весь ремонт')}
      ${menuModalRow('mm-deleg-work', 'clipboard-list', 'Поручения и отчёты')}`;
    const progressRows = shared
      ? menuModalRow('mm-pdf', 'download', 'Скачать PDF с прогрессом')
      : `${menuModalRow('mm-share', 'share', 'Поделиться прогрессом (ссылка для просмотра)')}
      ${menuModalRow('mm-pdf', 'download', 'Скачать PDF с прогрессом')}
      ${menuModalRow('mm-summary', 'file-text', 'Итоги ремонта в цифрах')}`;
    const resetFooter = shared
      ? ''
      : `<footer class="menu-modal__footer" aria-label="Опасные действия">${menuModalRow('mm-reset', 'rotate-ccw', 'Сбросить прогресс', { danger: true })}</footer>`;
    const body = `${menuModalSection('Проект', 'project', projectRows)}${menuModalSection('Работа и команда', 'team', teamRows)}${menuModalSection('Прогресс и доступ', 'progress', progressRows)}${resetFooter}`;
    return `${head}<div class="menu-modal" data-testid="menu-modal">${body}</div>`;
  }
  function menuModal(p, returnFocusEl) {
    const opener =
      returnFocusEl && returnFocusEl.focus
        ? returnFocusEl
        : qs('.lite-actions-btn,[data-n="menu"]') || document.activeElement;
    modalNav(menuModalMarkup(p), {
      onOpen(mo) {
        const box = qs('.modal__box', mo);
        if (box) box.classList.add('modal__box--menu');
        const navSettings = qs('#mm-nav-settings', mo);
        if (navSettings) {
          navSettings.onclick = () => {
            teardownNavModalA11y(qs('#modal'));
            closeModal();
            navigatorSettingsModal(p, opener);
          };
        }
        const delegAll = qs('#mm-delegate-project', mo);
        if (delegAll) {
          delegAll.onclick = () => {
            teardownNavModalA11y(qs('#modal'));
            closeModal();
            delegateModal(p, { wholeRepair: true }, opener);
          };
        }
        const delegWork = qs('#mm-deleg-work', mo);
        if (delegWork) {
          delegWork.onclick = () => {
            teardownNavModalA11y(qs('#modal'));
            closeModal();
            demoDelegWorkListModal(p, 'assignments', opener);
          };
        }
        const rename = qs('#mm-rename', mo);
        if (rename) rename.onclick = () => renameProjectModal(p, opener);
        const share = qs('#mm-share', mo);
        if (share) share.onclick = () => shareModal(p, opener);
        const pdf = qs('#mm-pdf', mo);
        if (pdf) {
          pdf.onclick = () => {
            teardownNavModalA11y(qs('#modal'));
            closeModal();
            returnFocusNavModalImmediate(opener);
            toast('PDF с прогрессом формируется — в прототипе это заглушка');
          };
        }
        const summary = qs('#mm-summary', mo);
        if (summary) summary.onclick = () => summaryModal(p, opener);
        const projects = qs('#mm-projects', mo);
        if (projects) projects.onclick = () => projectsModal(opener);
        const reset = qs('#mm-reset', mo);
        if (reset) {
          reset.onclick = () =>
            modalNav(
              `${modalHead('Сбросить прогресс?', 'Отметки, расходы и заметки будут удалены. Действие необратимо.')}<div class="modal__foot"><button type="button" class="btn btn--ghost" data-close>Отмена</button><button type="button" class="btn btn--primary" id="rs">Сбросить</button></div>`,
              {
                primarySelector: '#rs',
                onOpen(m2) {
                  qs('#rs', m2).onclick = () => {
                    const keep = { objectType: p.objectType, roomType: p.roomType, estimate: p.estimate, name: p.name, locality: p.locality };
                    state.projects = state.projects.filter((x) => x.id !== p.id);
                    newProject(keep);
                    teardownNavModalA11y(qs('#modal'));
                    closeModal();
                    renderApp();
                    focusLiveLiteActionsAfterRender();
                    toast('Прогресс сброшен');
                  };
                },
              },
              opener
            );
        }
      },
    }, opener);
  }
  function shareModal(p, returnFocusEl) {
    const opener = returnFocusEl || document.activeElement;
    const link = `https://remcard.ru/shared/${p.id}`;
    modalNav(
      `${modalHead('Поделиться прогрессом', 'Ссылка открывает маршрут в режиме просмотра: этапы, фото, документы — без права менять')}<div class="row"><input value="${link}" readonly><button class="btn btn--dark" id="sh-copy">Копировать</button></div><div class="chips" style="margin-top:.75rem"><button class="chip">MAX</button><button class="chip">Telegram</button><button class="chip">WhatsApp</button></div><div class="modal__foot"><button class="btn btn--ghost" id="sh-preview">${icon('eye')} Посмотреть как гость</button><button class="btn btn--primary" data-close>Готово</button></div>`,
      {
        onOpen(mo) {
          qs('#sh-copy', mo).onclick = () => {
            if (navigator.clipboard) navigator.clipboard.writeText(link).catch(() => {});
            toast('Ссылка скопирована');
          };
          qs('#sh-preview', mo).onclick = () => {
            p.shared = true;
            teardownNavModalA11y(qs('#modal'));
            closeModal();
            renderApp();
            focusLiveLiteActionsAfterRender();
          };
        },
      },
      opener
    );
  }
  const SUMMARY_RENAME_STATUS =
    'Название обновлено в прототипе. Проект доступен в «Мои проекты».';
  const SUMMARY_STORAGE_NOTE =
    'Изменения остаются в демо-памяти этой вкладки браузера. Прототип не синхронизирует проект с аккаунтом и не пишет на сервер.';
  function summaryModalMarkup(p, { statusMessage = '' } = {}) {
    const shared = !!p.shared;
    const headSub = shared ? esc(p.name) : 'Сводка бюджета, сроков и документов';
    const statusVisible = !!statusMessage;
    const rename = shared
      ? `<p class="summary-modal__readonly-name" data-testid="summary-readonly-name"><span class="summary-modal__label">Проект</span> ${esc(p.name)}</p>`
      : `<section class="summary-modal__rename" data-testid="summary-rename-block" aria-labelledby="summary-rename-label">
      <p class="summary-modal__status" data-testid="summary-rename-status" role="status" tabindex="-1"${statusVisible ? '' : ' hidden'}>${statusVisible ? esc(statusMessage) : ''}</p>
      <label id="summary-rename-label" class="summary-modal__label" for="summary-rename-input">Название проекта</label>
      <input id="summary-rename-input" class="summary-modal__input" type="text" value="${esc(p.name)}" maxlength="${PROJECT_NAME_MAX_LEN}" autocomplete="off" />
      <p id="summary-rename-error" class="summary-modal__error" role="alert"></p>
      <button type="button" class="btn btn--primary summary-modal__save" id="summary-rename-save">Сохранить изменения</button>
      <p class="summary-modal__storage-note xs muted">${SUMMARY_STORAGE_NOTE}</p>
      <a class="btn btn--ghost btn--sm summary-modal__projects-link" href="#/projects/calculations" data-testid="summary-projects-link">${icon('layers')} Мои проекты</a>
    </section>`;
    return `${modalHead('Полезные итоги ремонта', headSub)}
      <div class="summary-modal" data-testid="summary-modal">${rename}${outcomeContent(p)}</div>
      <div class="modal__foot summary-modal__foot"><button type="button" class="btn btn--ghost" id="sm-pdf">${icon('download')} PDF</button><button type="button" class="btn btn--primary" data-close>Закрыть</button></div>`;
  }
  function bindSummaryModal(mo, p, projectId, opener) {
    const box = qs('.modal__box', mo);
    if (box) box.classList.add('modal__box--summary', 'modal__box--nav-ux');
    qs('#sm-pdf', mo).onclick = () => toast('PDF формируется — в прототипе заглушка');
    qsa('button[data-n]', mo).forEach((button) => {
      button.onclick = (event) => {
        closeModal();
        onClick(event);
      };
    });
    const projectsLink = qs('[data-testid="summary-projects-link"]', mo);
    if (projectsLink) projectsLink.onclick = () => closeModal();
    const confirmed = qs('[data-n="expenses-confirmed"]', mo);
    if (confirmed && !p.shared) {
      confirmed.onchange = (event) => {
        const guard = liveProjectMutationGuard(p, projectId);
        if (!guard.ok) {
          event.target.checked = !!p.expensesConfirmed;
          toast('Режим просмотра или проект изменился — сохранение отменено');
          return;
        }
        guard.live.expensesConfirmed = event.target.checked;
        renderApp();
        summaryModal(guard.live, opener);
      };
    }
    if (p.shared) return;
    const inp = qs('#summary-rename-input', mo);
    const err = qs('#summary-rename-error', mo);
    const status = qs('[data-testid="summary-rename-status"]', mo);
    const saveBtn = qs('#summary-rename-save', mo);
    if (!inp || !saveBtn) return;
    const showError = (msg) => {
      if (err) {
        err.textContent = msg;
        err.hidden = !msg;
      }
    };
    saveBtn.onclick = () => {
      const guard = liveProjectMutationGuard(p, projectId);
      if (!guard.ok) {
        showError('Режим просмотра или проект изменился — сохранение отменено.');
        return;
      }
      const v = inp.value.trim();
      if (!v) {
        showError('Укажите название проекта.');
        inp.focus();
        return;
      }
      if (v.length > PROJECT_NAME_MAX_LEN) {
        showError(`Название не длиннее ${PROJECT_NAME_MAX_LEN} символов.`);
        inp.focus();
        return;
      }
      showError('');
      guard.live.name = v;
      renderApp();
      if (status) {
        status.textContent = SUMMARY_RENAME_STATUS;
        status.hidden = false;
        status.focus();
      }
    };
    inp.onkeydown = (ev) => {
      if (ev.key === 'Enter') saveBtn.click();
    };
  }
  function summaryModal(p, returnFocusEl, { statusMessage = '' } = {}) {
    const opener =
      returnFocusEl && returnFocusEl.focus ? returnFocusEl : qs('.lite-actions-btn,[data-n="menu"]') || document.activeElement;
    const projectId = p.id;
    modalNav(summaryModalMarkup(p, { statusMessage }), {
      primarySelector: p.shared ? '[data-close]' : '#summary-rename-input',
      onOpen(mo) {
        bindSummaryModal(mo, p, projectId, opener);
      },
    }, opener);
  }
  function outcomeDatesModal(p) {
    modal(`${modalHead('Фактические сроки ремонта', 'Не дата создания проекта, а даты реального выполнения работ')}
      <div class="grid2"><div><label for="outcome-start">Начало работ</label><input type="date" id="outcome-start" value="${p.actualStartDate || ''}"></div><div><label for="outcome-end">Завершение работ</label><input type="date" id="outcome-end" value="${p.actualEndDate || ''}"></div></div>
      <p class="small" id="outcome-date-error" role="alert"></p><div class="modal__foot"><button class="btn btn--ghost" data-close>Отмена</button><button class="btn btn--primary" id="outcome-dates-save">Сохранить даты</button></div>`, { onOpen(mo) {
        qs('#outcome-dates-save', mo).onclick = () => {
          const start = qs('#outcome-start', mo).value, end = qs('#outcome-end', mo).value;
          if (!start || !end || end < start || end > new Date().toLocaleDateString('en-CA')) { qs('#outcome-date-error', mo).textContent = 'Укажите обе даты: завершение не раньше начала и не позже сегодняшнего дня.'; return; }
          p.actualStartDate = start; p.actualEndDate = end; closeModal(); renderApp(); toast('Фактические сроки обновлены');
        };
      } });
  }
  function projectsModal(returnFocusEl) {
    const opener = returnFocusEl || document.activeElement;
    modalNav(
      `${modalHead('Мои проекты')}<div class="stack" style="gap:.5rem">${state.projects.map((p) => { const t = totals(p); return `<button type="button" class="evt" data-pj="${p.id}" style="text-align:left;width:100%;${p.id === state.activeProjectId ? 'border-color:var(--primary)' : ''}"><div><b class="ink">${esc(p.name)}</b><small>${by(E.objectTypes, p.objectType).full} · ${fmt(p.area)} м² · ${t.percent} %</small></div>${p.id === state.activeProjectId ? '<span class="pill pill--red">активный</span>' : icon('chevron-right')}</button>`; }).join('')}</div>
      <div class="modal__foot"><button type="button" class="btn btn--ghost" data-close>Закрыть</button><button type="button" class="btn btn--primary" id="pj-new">${icon('plus')} Новый проект</button></div>`,
      {
        onOpen(mo) {
          qsa('[data-pj]', mo).forEach(
            (b) =>
              (b.onclick = () => {
                state.activeProjectId = b.dataset.pj;
                teardownNavModalA11y(qs('#modal'));
                closeModal();
                renderApp();
                focusLiveLiteActionsAfterRender();
              })
          );
          qs('#pj-new', mo).onclick = () => {
            state.activeProjectId = null;
            teardownNavModalA11y(qs('#modal'));
            closeModal();
            go('#/navigator');
            renderApp();
            focusLiveLiteActionsAfterRender();
          };
        },
      },
      opener
    );
  }
  function calendarStageRows(p, startIso) {
    let d = new Date(startIso).getTime();
    return stages(p).map((l1) => {
      const days = stageDays(p, l1.id);
      const from = d;
      d += days * 864e5;
      return { l1, from, to: d, days };
    });
  }
  function calendarEndLabel(startIso, p) {
    const total = stages(p).reduce((a, s) => a + stageDays(p, s.id), 0);
    const endD = new Date(new Date(startIso).getTime() + total * 864e5);
    return endD.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  function calendarModal(p) {
    const savedStart = p.startDate;
    const rows = calendarStageRows(p, savedStart);
  const activeTimers = Object.keys(p.timers).map((id) => NAV.timerConfigs.find((x) => x.taskId === id)).filter(Boolean);
    const startField = p.shared
      ? `<p class="small"><b>${new Date(savedStart).toLocaleDateString('ru-RU')}</b></p>`
      : `<label class="field stack" style="gap:.35rem"><span class="small muted">Старт ремонта</span><input type="date" id="cal-start-date" class="lite-date-input" value="${esc(savedStart)}" aria-label="Старт ремонта"></label>`;
    modal(`${modalHead('Календарь ремонта', 'Сроки по этапам; сохранение даты — только по кнопке «Сохранить»')}
      ${startField}
      <p class="small muted" id="cal-end-preview">Ожидаемое окончание: <b>${calendarEndLabel(savedStart, p)}</b></p>
      ${activeTimers.length ? `<div class="lite-timers" style="margin:.5rem 0">${activeTimers.map((tm) => `<div class="tip tip--seq"><span>${icon('hourglass')} ${esc(tm.title)}</span></div>`).join('')}</div>` : ''}
      <h4 class="small" style="margin:1rem 0 .5rem">План по этапам</h4>
      <div class="rows" id="cal-stage-rows">${rows.map((r) => `<div><span>${stageIcon(r.l1.id)} ${esc(r.l1.title)} <span class="small muted">· ${r.days} дн.</span></span><b>${dateRu(r.from)} – ${dateRu(r.to)}</b></div>`).join('')}</div>
      <div class="modal__foot"><button type="button" class="btn btn--ghost" data-close>Отмена</button>${p.shared ? '' : `<button type="button" class="btn btn--primary" id="cal-start-save">Сохранить</button>`}</div>`, {
      onOpen(mo) {
        markNavUxModal(mo);
        const inp = qs('#cal-start-date', mo);
        const redraw = (iso) => {
          const nextRows = calendarStageRows(p, iso);
          const host = qs('#cal-stage-rows', mo);
          if (host) {
            host.innerHTML = nextRows.map((r) => `<div><span>${stageIcon(r.l1.id)} ${esc(r.l1.title)} <span class="small muted">· ${r.days} дн.</span></span><b>${dateRu(r.from)} – ${dateRu(r.to)}</b></div>`).join('');
          }
          const prev = qs('#cal-end-preview', mo);
          if (prev) prev.innerHTML = `Ожидаемое окончание: <b>${calendarEndLabel(iso, p)}</b>`;
        };
        if (inp) inp.oninput = () => redraw(inp.value || savedStart);
        const saveBtn = qs('#cal-start-save', mo);
        if (saveBtn) {
          saveBtn.onclick = () => {
            const v = inp?.value || savedStart;
            if (v && v !== p.startDate) {
              p.startDate = v;
              renderApp();
              toast('Дата старта обновлена');
            }
            closeModal();
          };
        }
      },
    });
  }

  // ---------- Обработчики ----------
  function onClick(e) {
    const el = e.target.closest('[data-n]'); if (!el) return;
    const p = activeProject(); const n = el.dataset.n, a = el.dataset.a, b = el.dataset.b;
    if (n === 'choose-type') { const pr = newProject({ objectType: a, locality: defaultLocality() }); pr.currentL1 = stages(pr)[0].id; return go('#/navigator?setup=1'); }
    if (n === 'projects') return projectsModal();
    if (!p) return;
    if (p.shared && !['unshare', 'goto', 'goto-task', 'l2', 'menu', 'nav-settings', 'search', 'fab', 'mode', 'stage-mode', 'step', 'budget', 'calendar', 'ui', 'lite-open', 'lite-more', 'lite-tools', 'lite-all-tasks', 'lite-tip', 'lite-desc', 'lite-prev-toggle', 'stage-next', 'stage-complete-dismiss', 'summary', 'view-route', 'knowledge'].includes(n)) return toast('Режим просмотра — изменения недоступны');
    if (n === 'setup-city') {
      const nm = qs('#pname');
      if (nm) p.name = nm.value;
      if (a === L.CUSTOM) p.locality = { city: L.CUSTOM, localityName: p.locality?.localityName || '', localityRegion: p.locality?.localityRegion || '' };
      else p.locality = { city: a, localityName: '', localityRegion: '' };
      return renderApp();
    }
    const rerender = () => renderApp();
    const rerenderMotion = () => rerenderNavMotion();
    const toMain = scrollToNavMain;
    switch (n) {
      case 'setup-start': { p.currentL1 = a; const s = stages(p); const k = s.findIndex((x) => x.id === a); p.skippedL1 = new Set(s.slice(0, k).map((x) => x.id)); qsa('[data-n="setup-start"]').forEach((x) => x.classList.toggle('is-on', x === el)); return; }
      case 'setup-profile': p.profile = a; qsa('[data-n="setup-profile"]').forEach((x) => x.classList.toggle('is-on', x === el)); return;
      case 'setup-mode': p.mode = a; qsa('[data-n="setup-mode"]').forEach((x) => x.classList.toggle('is-on', x === el)); return;
      case 'setup-done': {
        const draftLoc = p.locality || defaultLocality();
        if (!L.cityStepValid(draftLoc, E.cities)) return toast('Укажите населённый пункт');
        const nm = qs('#pname');
        const typedName = nm ? nm.value : p.name;
        const oldAuto = p.estimate ? autoProjectName(p.objectType, p.estimate.input) : '';
        let snap = { ...draftLoc };
        const nameEl = qs('#setup-loc-name');
        const regionEl = qs('#setup-loc-region');
        if (L.isCustom(snap)) {
          snap = L.snapshot({ ...snap, localityName: nameEl ? nameEl.value : snap.localityName, localityRegion: regionEl ? regionEl.value : '' });
        } else {
          snap = L.snapshot(snap);
        }
        p.locality = snap;
        const recalculated = syncEstimateToLocality(p, snap);
        p.name = resolveSetupProjectName({
          typedName,
          oldAuto,
          recalculated,
          estimate: p.estimate,
          objectType: p.objectType,
          currentName: p.name,
        });
        return go('#/navigator');
      }
      case 'goto': p.currentL1 = a; view.l2Open = null; view.stepIdx = 0; view.focusSkip = 0; view.liteL2 = null; view.liteCelebrate = null; view.liteMore = null; view.stageCompletePanel = null; go('#/navigator'); rerender(); toMain(); return;
      case 'ui': return;
      case 'stage-begin': { p.introSeen[a] = true; if (liteSkipIntroActive(p, a)) { view.liteSkipIntro = null; view.liteFocusTask = null; } claimLiteTransient(p); rerender(); toMain(); return; }
      case 'stage-exec': { p.introSeen[a] = true; if (liteSkipIntroActive(p, a)) { view.liteSkipIntro = null; view.liteFocusTask = null; } claimLiteTransient(p); if (b !== 'later') l2of(p, NAV.stagesL1.find((x) => x.id === a)).forEach((l2) => { if (!p.exec[l2.id]) p.exec[l2.id] = b; }); rerender(); toMain(); return; }
      case 'lite-open': claimLiteTransient(p); view.liteL2 = a; view.liteCelebrate = null; view.liteMore = null; rerenderMotion(); return;
      case 'lite-skip': { const l1 = currentL1(p); const list = l2of(p, l1); const i = list.findIndex((x) => x.id === a); const nx = list.slice(i + 1).find((x) => !l2Done(p, x)) || list.slice(0, i).find((x) => !l2Done(p, x)); if (!nx) return toast('Это единственный незакрытый шаг этапа'); claimLiteTransient(p); view.liteL2 = nx.id; view.liteMore = null; rerenderMotion(); return; }
      case 'lite-done': {
        const l2 = NAV.stagesL1.flatMap((x) => x.stages).find((x) => x.id === a);
        if (!l2 || !l2Done(p, l2)) {
          const ts = l2 ? tasksOf(p, l2) : [];
          const left = ts.filter((t) => !p.completedTasks.has(t.id)).length;
          toast(left ? `Отметьте ещё ${left} ${plural(left, 'пункт', 'пункта', 'пунктов')} чек-листа` : 'Отметьте пункты чек-листа по шагу');
          return;
        }
        view.liteCelebrate = a;
        view.liteMore = null;
        rerender();
        toMain();
        return;
      }
      case 'lite-next': { const l1 = currentL1(p); const list = l2of(p, l1); const cur = list.findIndex((x) => x.id === view.liteCelebrate); view.liteCelebrate = null; const nx = list.slice(cur + 1).find((x) => !l2Done(p, x)) || list.find((x) => !l2Done(p, x)); claimLiteTransient(p); view.liteL2 = nx ? nx.id : null; rerenderMotion(); return; }
      case 'lite-more': view.liteMore = view.liteMore === a ? null : a; return rerender();
      case 'lite-tip': view.liteTip = view.liteTip === a ? null : a; return rerender();
      case 'lite-desc': view.liteDesc = view.liteDesc === a ? null : a; return rerender();
      case 'lite-prev-toggle': view.litePrev = !view.litePrev; return rerender();
      case 'lite-all-tasks': view.liteAllTasks = a; return rerender();
      case 'lite-tools': return toolsModal(p);
      case 'concierge-l1': { const l1 = NAV.stagesL1.find((x) => x.id === a); return conciergeModal(p, { what: `этап «${l1.title}»`, l1 }); }
      case 'goto-task': {
        const taskId = el.dataset.c || '';
        const l1 = l1ById(p, a);
        const l2 = l1 ? l2of(p, l1).find((x) => x.id === b) : null;
        p.currentL1 = a;
        claimLiteTransient(p);
        view.liteL2 = b;
        view.liteSkipIntro = a;
        view.liteCelebrate = null;
        view.liteMore = null;
        view.l2Open = null;
        if (taskId && l2) {
          const tasks = tasksOf(p, l2);
          const idx = tasks.findIndex((t) => t.id === taskId);
          if (idx >= 5) view.liteAllTasks = b;
          view.liteFocusTask = taskId;
        }
        rerender();
        toMain();
        if (taskId) focusLiteTask(taskId);
        return;
      }
      case 'fab': {
        const f = focusL1(p);
        p.currentL1 = f.id;
        const l2 = l2of(p, f).find((x) => !l2Done(p, x)) || l2of(p, f)[0];
        if (l2) {
          claimLiteTransient(p);
          view.liteL2 = l2.id;
          view.liteSkipIntro = f.id;
        }
        view.liteCelebrate = null;
        view.liteMore = null;
        rerender();
        toMain();
        return;
      }
      case 'mode': return;
      case 'stage-mode': return;
      case 'step': view.stepIdx = Math.max(0, view.stepIdx + (+a)); return rerender();
      case 'focus-skip': view.focusSkip++; return rerender();
      case 'l2': view.l2Open = view.l2Open === a ? '__none' : a; return rerender();
      case 'task': {
        const D = window.RCNavDelegationDemo;
        if (D && !D.ownerMayToggleTask(p, a)) return handleDelegatedTaskActivate(p, a, el);
        p.completedTasks.has(a) ? p.completedTasks.delete(a) : p.completedTasks.add(a);
        view.focusSkip = 0;
        return rerender();
      }
      case 'task-detail': return taskDetailModal(p, a, el.dataset.f, el);
      case 'bulk-complete-ask': { const l1 = l1ById(p, a); if (!l1 || !l1Unlocked(p, a) || l1Complete(p, a)) return; return bulkCompleteConfirmModal(p, l1, el); }
      case 'skip-l1-ask': { const l1 = l1ById(p, a); if (!l1) return; return skipStageConfirmModal(p, l1, el); }
      case 'skip-l1': { const l1 = l1ById(p, a); if (l1) return skipStageConfirmModal(p, l1, el); return; }
      case 'stage-next': view.stageCompletePanel = null; p.currentL1 = a; view.l2Open = null; view.stepIdx = 0; view.liteL2 = null; view.liteCelebrate = null; rerenderMotion(); return;
      case 'stage-complete-dismiss': view.stageCompletePanel = null; rerender(); return;
      case 'bulk-undo': {
        const snap = p._bulkUndo;
        if (!snap) return;
        if (!projectBulkContextOk(p, { projectId: snap.projectId, l1Id: snap.l1Id }) || !restoreBulkSnapshot(p, snap)) {
          p._bulkUndo = null;
          view.stageCompletePanel = null;
          toast('Нельзя отменить — проект изменился');
          return rerender();
        }
        p._bulkUndo = null;
        view.stageCompletePanel = null;
        toast('Отметка этапа отменена');
        return rerender();
      }
      case 'sel': { view.sel = view.sel || new Set(); el.checked ? view.sel.add(a) : view.sel.delete(a); return rerender(); }
      case 'sel-clear': view.sel = new Set(); return rerender();
      case 'l2-all': {
        const l2 = NAV.stagesL1.flatMap((x) => x.stages).find((x) => x.id === a);
        const ts = tasksOf(p, l2);
        const D = window.RCNavDelegationDemo;
        const own = ts.filter((t) => !D || D.ownerMayToggleTask(p, t.id));
        const blocked = ts.length - own.length;
        const all = own.length > 0 && own.every((t) => p.completedTasks.has(t.id));
        own.forEach((t) => (all ? p.completedTasks.delete(t.id) : p.completedTasks.add(t.id)));
        if (blocked) toast(`${blocked} ${plural(blocked, 'задача поручена', 'задачи поручены', 'задач поручено')} — не отмечены`);
        return rerender();
      }
      case 'add-task': { ask('Своя задача', { placeholder: 'Например, заказать замер кухни', label: 'Добавить' }).then((title) => { if (title) { p.customTasks.push({ id: 'C-' + uid(), stageL2Id: a, title, custom: true }); rerender(); } }); return; }
      case 'exec': p.exec[a] = p.exec[a] === b ? null : b; return rerender();
      case 'exec-pro': p.exec[a] = 'pro'; rerender(); return go(`#/catalog?kind=specialist&stage=${b}`);
      case 'complete-l1': {
        if (bulkActionLock && Date.now() - bulkActionLock < 400) return;
        if (!stageCloseAllowed(p, a)) {
          if (p.shared) return toast('Режим просмотра — изменения недоступны');
          const l1 = l1ById(p, a);
          const st = l1 ? l1Stats(p, l1) : null;
          if (!l1 || !l1Unlocked(p, a) || l1Complete(p, a)) return toast('Этап нельзя закрыть сейчас');
          if (st && st.total > st.done) {
            const left = st.total - st.done;
            return toast(`Сначала отметьте ${left} ${plural(left, 'пункт', 'пункта', 'пунктов')} чек-листа`);
          }
          return toast('Этап нельзя закрыть сейчас');
        }
        bulkActionLock = Date.now();
        p.skippedL1.delete(a);
        p.completedL1.add(a);
        p._bulkUndo = null;
        view.stageCompletePanel = a;
        view.liteL2 = null;
        view.liteCelebrate = null;
        toast('Этап закрыт');
        rerender();
        toMain();
        return;
      }
      case 'skip-prev': { const s = stages(p); const k = s.findIndex((x) => x.id === a); s.slice(0, k).forEach((x) => { if (!l1Complete(p, x.id)) p.skippedL1.add(x.id); }); return rerender(); }
      case 'reopen-l1': p.completedL1.delete(a); p.skippedL1.delete(a); p.currentL1 = a; p._bulkUndo = null; view.stageCompletePanel = null; return rerender();
      case 'room-all': p.roomType = null; return rerender();
      case 'expense': return expenseModal(p, a);
      case 'budget': return budgetModal(p);
      case 'docs': return docsModal(p, a);
      case 'events': return eventsModal(p, a, el);
      case 'materials': return materialsModal(p, a);
      case 'matcalc': return matCalcModal(p, a);
      case 'prices': return pricesModal(p, a);
      case 'worker': return workerModal(p, a);
      case 'photo': { (p.photos[a] = p.photos[a] || []).push({ cat: b, date: Date.now() }); toast('Фото добавлено в отчёт (в прототипе — без загрузки файла)'); return rerender(); }
      case 'timer-start': p.timers[a] = Date.now(); toast('Таймер запущен'); return rerender();
      case 'timer-stop': delete p.timers[a]; return rerender();
      case 'delegate': {
        if (a === 'sel') return delegateModal(p, { taskIds: [...(view.sel || [])] }, el);
        const [kind, id] = a.split(':');
        if (kind === 'task') return delegateModal(p, { taskIds: [id], title: NAV.stagesL1.flatMap((x) => x.stages).flatMap((x) => x.tasks).concat(p.customTasks).find((t) => t.id === id)?.title || '' }, el);
        if (kind === 'l2') return delegateModal(p, { l2: NAV.stagesL1.flatMap((x) => x.stages).find((x) => x.id === id) }, el);
        if (kind === 'l1') return delegateModal(p, { l1: NAV.stagesL1.find((x) => x.id === id) }, el);
        if (kind === 'project') return delegateModal(p, { wholeRepair: true }, el);
        return;
      }
      case 'demo-report-review': return demoReportReviewModal(p, a, el);
      case 'demo-deleg-list': return demoDelegWorkListModal(p, a || 'reports', el);
      case 'demo-assign-detail': return demoAssignmentDetailModal(p, a, el);
      case 'demo-sim-report': {
        const D = window.RCNavDelegationDemo;
        const asnId = el.dataset.b || a;
        const asn = D?.assignmentById(D.ensureState(p), asnId);
        if (!asn) return toast('Поручение не найдено');
        const openCtx = D.openCtxFromAssignment(p, asn);
        if (D.pendingReportForAssignment(D.ensureState(p), asnId)) return demoDelegPendingToast(p, D, el, D.pendingReportForAssignment(D.ensureState(p), asnId).id);
        return demoSimulateReportModal(p, openCtx, el);
      }
      case 'concierge': { const [, id] = a.split(':'); const l2 = NAV.stagesL1.flatMap((x) => x.stages).find((x) => x.id === id); return conciergeModal(p, { what: `подэтап «${l2.title}»`, l2 }); }
      case 'search': return searchModal(p);
      case 'menu': return menuModal(p, el);
      case 'share': return shareModal(p, el);
      case 'unshare': p.shared = false; return rerender();
      case 'pdf': return toast('PDF формируется — в прототипе заглушка');
      case 'summary': return summaryModal(p, el);
      case 'summary-dates': return outcomeDatesModal(p);
      case 'view-route': return go('#/navigator?view=route');
      case 'calendar': return calendarModal(p);
      case 'knowledge': return knowledgeModal(p, el);
      case 'nav-settings': return navigatorSettingsModal(p, el);
      case 'invite': { if (navigator.clipboard) navigator.clipboard.writeText('Я веду ремонт в RemCard — попробуй: remcard.ru/?ref=' + p.id).catch(() => {}); return toast('Приглашение скопировано'); }
    }
  }
  function onChange(e) {
    const el = e.target.closest('[data-n]'); if (!el) return; const p = activeProject(); if (!p) return;
    if (p.shared && (el.dataset.n === 'profile' || el.dataset.n === 'tips-display' || el.dataset.n === 'start-date' || el.dataset.n === 'note' || el.dataset.n === 'expenses-confirmed')) return;
    if (el.dataset.n === 'profile') { p.profile = el.value; renderApp(); }
    if (el.dataset.n === 'start-date') { p.startDate = el.value; renderApp(); }
    if (el.dataset.n === 'note') { p.notes[el.dataset.a] = el.value; }
    if (el.dataset.n === 'qc') { const id = el.dataset.a; el.checked ? p.qc.add(id) : p.qc.delete(id); renderApp(); }
    if (el.dataset.n === 'expenses-confirmed') {
      const guard = liveProjectMutationGuard(p, p.id);
      if (!guard.ok) {
        el.checked = !!p.expensesConfirmed;
        return;
      }
      guard.live.expensesConfirmed = el.checked;
      renderApp();
    }
  }
  function bindSetup() {
    const p = activeProject();
    if (!p || !parseHash().params.setup) return;
    if (!p.locality) p.locality = projectLocality(p.estimate);
    const pname = qs('#pname');
    if (pname) pname.oninput = () => { p.name = pname.value; };
    const sync = () => {
      const nameEl = qs('#setup-loc-name');
      if (!nameEl) return;
      const regionEl = qs('#setup-loc-region');
      p.locality.localityName = nameEl.value;
      p.locality.localityRegion = regionEl ? regionEl.value : '';
      const vn = L.validateName(p.locality.localityName);
      const vr = L.validateRegion(p.locality.localityRegion);
      const ok = L.cityStepValid(p.locality, E.cities);
      const btn = qs('[data-n="setup-done"]');
      if (btn) btn.disabled = !ok;
      const err = qs('#setup-loc-err');
      if (err) {
        const msg = !vn.ok ? vn.msg : !vr.ok ? vr.msg : '';
        err.textContent = msg;
        err.classList.toggle('hide', !msg);
      }
      const preview = qs('#setup-place-preview');
      if (preview) preview.innerHTML = `${icon('map-pin')} ${placeDisplayHtml(p, p.locality)}${L.isCustom(p.locality) ? ' · расчёт ориентировочный' : ''}`;
    };
    const nameEl = qs('#setup-loc-name');
    if (nameEl) {
      nameEl.oninput = sync;
      nameEl.onkeydown = (ev) => {
        if (ev.key === 'Enter' && L.cityStepValid(p.locality, E.cities)) qs('[data-n="setup-done"]')?.click();
      };
      const regionEl = qs('#setup-loc-region');
      if (regionEl) {
        regionEl.oninput = sync;
        regionEl.onkeydown = (ev) => {
          if (ev.key === 'Enter' && L.cityStepValid(p.locality, E.cities)) qs('[data-n="setup-done"]')?.click();
        };
      }
      sync();
    }
  }
  document.addEventListener('rc:rendered', (e) => {
    const app = qs('#app');
    app.onclick = e.detail.path.startsWith('/navigator') ? onClick : null;
    app.onchange = e.detail.path.startsWith('/navigator') ? onChange : null;
    if (e.detail.path.startsWith('/navigator')) {
      bindLiteHeaderSettingsViewport(app);
      bindKnowledgeAccordion(app);
      if (view.catalogReturnFocus) {
        requestAnimationFrame(() => focusAfterCatalogReturn());
      } else if (window.RC.takeNavigatorSameHashReselect?.()) {
        scrollToNavMain();
      } else if (navPlayMainEnter) {
        navPlayMainEnter = false;
        playNavMainEnter(() => scrollToNavMain());
      }
      bindSetup();
      app.onkeydown = (ev) => {
        if (ev.key === ' ' || ev.key === 'Enter') {
          const t = ev.target.closest('.task__box');
          if (t) { ev.preventDefault(); t.click(); }
        }
      };
    }
  });
  route('/navigator', pageNavigator);
  // Для главной: где человек сейчас
  function nextStep(p) {
    const s = stages(p), l1 = focusL1(p), k = s.indexOf(l1), t = totals(p);
    if (t.l1done === t.l1 && t.l1 > 0) return null;
    const l2 = l2of(p, l1).find((x) => !l2Done(p, x)) || null;
    return { l1, l2, k, n: s.length, percent: t.percent };
  }
  window.RCNav = {
    startFromEstimate,
    newProject,
    stages,
    totals,
    pathBlock,
    currentL1,
    focusL1,
    nextStep,
    validateCatalogReturn,
    performCatalogReturn,
    catalogReturnCtx,
  };
  if (window.RC_TEST) {
    window.RCNavTest = {
      pageLite,
      pageSetup,
      pageNavigator,
      onClick,
      litePlaceSummary,
      projectPlace,
      bindSetup,
      defaultLocality,
      syncEstimateToLocality,
      autoProjectName,
      localitySnapEqual,
      resolveSetupProjectName,
      getNavView: () => view,
      setNavView: (patch) => Object.assign(view, patch),
      resetNavView: () => {
        view.stageCompletePanel = null;
        view.liteL2 = null;
        view.liteCelebrate = null;
        view.liteMore = null;
      },
      liteRetainedPanels,
      sideCards,
      levelAchievementsHtml,
      liveProjectMutationGuard,
      calendarSummaryHtml,
      weeklyPlanHtml,
      knowledgeHtml,
      bindKnowledgeAccordion,
      weeklyPlanTaskRows,
      weeklyPlanGroups,
      liteMorePanelHtml,
      delegContractorReportsUi,
      delegReportInboxScopeLine,
      eventsModal,
      liteSide,
      toolsModal,
      expenseModal,
      expenseModalMarkup,
      bindExpenseModal,
      expenseCategorySummaryHtml,
      expenseCategoryRecords,
      budgetAllRecordsHtml,
      budgetModalMarkup,
      bindBudgetModal,
      budgetModal,
      outcomeContent,
      menuModalMarkup,
      menuModal,
      summaryModal,
      summaryModalMarkup,
      bindSummaryModal,
      PROJECT_NAME_MAX_LEN,
      renameProjectModal,
      modalNav,
      liveLiteActionsBtn,
      focusLiveLiteActionsAfterRender,
      focusLiteTask,
      bulkCompleteConfirmModal,
      taskDetailModal,
      wireModalA11y,
      teardownNavModalA11y,
      closeModal,
      formatPlanBudgetSum,
      parsePlanBudgetInput,
      scrollToNavMain,
      navScrollToY,
      getNavScrollFocusGen: () => navScrollFocusGen,
      rerenderNavMotion,
      playNavMainEnter,
      demoDelegScope,
      delegLeafIds,
      delegSelectableAllProjectIds,
      delegPickerOpenerSig,
      delegScopeTitle,
      delegScopePickerHtml,
      demoDelegNavSnap,
      demoDelegModalGuard,
      demoDelegReportGuard,
      demoFocusCapture,
      demoDelegFocusFromOpenCtx,
      demoVisibleLiteL2Id,
      demoAcceptL2PinOk,
      applyDemoAcceptL2Pin,
      demoAcceptOpenCtx,
      resolveAcceptL2Id,
      taskAnchorL2,
      demoPinL2ForAcceptIfVisible,
      liveDelegateTrigger,
      resolveDelegationFocusTarget,
      returnFocusDelegationAfterRender,
      demoDelegPanel,
      demoDelegExecutorPanel,
      demoDelegWorkListModal,
      demoAssignmentDetailModal,
      delegPreviewTaskNames,
      demoSimulateReportModal,
      demoReportReviewModal,
      wireDelegDataNInModal,
      delegateModal,
      navContextActionsBar,
      catalogGoodsHref,
      catalogServicesHref,
      validateCatalogReturn,
      performCatalogReturn,
      catalogReturnCtx,
      focusAfterCatalogReturn,
      liteTipsUiValue,
      tipsDisplayValue,
      renovationAdviceAdjacent,
      navigatorSettingsModalMarkup,
      navigatorSettingsModal,
      RENOVATION_ADVICE_TITLE,
      onChange,
      syncLiteHeaderSettingsOpen,
      bindLiteHeaderSettingsViewport,
      liteHeaderSettingsDesktop,
    };
  }
  window.__RCNavUxTest = {
    parsePlanBudgetInput,
    formatPlanBudgetSum,
    planBudgetLabel,
    taskMetaMutationOk,
    cancelNavScrollFocus,
    l1AllTasks,
    applyBulkStageDone,
    bulkCompleteSnapshot,
    restoreBulkSnapshot,
    projectBulkContextOk,
    stageCloseAllowed,
    teardownNavModalA11y,
  };
})();
