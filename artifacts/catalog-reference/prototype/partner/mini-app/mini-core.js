/*
 * RemCard мини-кабинет (прототип) — ядро: состояние, роутер, оболочка, утилиты.
 * Контракт window.RCMini — см. mini-notes/BRIEF.md.
 * Без localStorage/sessionStorage/cookies/History API: память — window.rcDemoMemory, навигация — location.hash.
 */
(function () {
  'use strict';

  var ROLES = ['agent', 'specialist', 'store', 'company'];
  var HOSTS = ['telegram', 'max'];
  var THEMES = ['light', 'dark'];
  var CTX_KEYS = { screen: 1, role: 1, host: 1, theme: 1, branch: 1, scenario: 1 };

  var screens = {};
  var listeners = {};
  var scenarios = []; // {group, id, label, patchProfile?}
  var groupLabels = {};
  var state = {
    host: 'telegram',
    role: 'specialist',
    theme: 'light',
    scenario: 'default', // группа 'app' (состояния MiniAppRoot)
    sc: {}, // прочие группы: { invite: 'empty', cert: 'cert-limit', ... }
    branchId: null, // null = не выбран (как activeBranchId из bootstrap)
    branchTouched: false,
    stack: [{ id: 'home', params: {} }]
  };
  var rootEl = null; // .rc-mini
  var lastHash = '';
  var suppressHash = false;

  /* ---------- utils ---------- */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* formatMoneyRub (src/lib/history-format.ts) */
  function money(value) {
    var v = Number(value) || 0;
    var hasFraction = Math.abs(v - Math.round(v)) > 1e-9;
    var formatted = hasFraction
      ? v.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : v.toLocaleString('ru-RU');
    return formatted + ' ₽';
  }
  /* formatHistoryTotalParts (src/lib/wallet-accruals/format.ts) */
  function moneyParts(value) {
    var rub = money(value);
    var suffix = ' ₽';
    if (rub.slice(-suffix.length) === suffix) return { amount: rub.slice(0, -suffix.length), currency: suffix };
    return { amount: rub, currency: '' };
  }

  /* MiniAppIcons.tsx — один к одному */
  var ICONS = {
    certificate:
      '<span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="4" y="6" width="16" height="12" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M8 10h8M8 14h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M16 8l3-2v12l-3-2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></span>',
    scan:
      '<span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 8V6a2 2 0 012-2h2M16 4h2a2 2 0 012 2v2M18 16v2a2 2 0 01-2 2h-2M8 20H6a2 2 0 01-2-2v-2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><rect x="9" y="9" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.8"/></svg></span>',
    chevron:
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" class="mini-chevron"><path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    link:
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M10 13a5 5 0 007.07 0l1.41-1.41a5 5 0 00-7.070-7.07L10 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M14 11a5 5 0 00-7.07 0L5.52 12.41a5 5 0 007.07 7.07L14 19" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    external:
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M14 5h5v5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M10 14L19 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M19 14v5H5V5h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    pin:
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 21s7-4.5 7-11a7 7 0 10-14 0c0 6.5 7 11 7 11z" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="10" r="2.5" stroke="currentColor" stroke-width="1.6"/></svg>',
    copy:
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M6 15H5a2 2 0 01-2-2V5a2 2 0 012-2h8a2 2 0 012 2v1" stroke="currentColor" stroke-width="1.8"/></svg>'
  };
  ICONS.link = ICONS.link.replace('7.070-7.07', '7.07-7.07');
  function icon(name) {
    return ICONS[name] || '';
  }

  /* MiniAppSubpage.tsx */
  function subpage(o) {
    o = o || {};
    var backLabel = o.backLabel || '← К кабинету';
    return (
      '<div class="subpage">' +
      '<button type="button" class="backBtn" data-rcm-back>' + esc(backLabel) + '</button>' +
      '<h1 class="subpageTitle">' + esc(o.title || '') + '</h1>' +
      (o.lead ? '<p class="subpageLead">' + esc(o.lead) + '</p>' : '') +
      (o.body || '') +
      '</div>'
    );
  }

  var toastTimer = null;
  function toast(text) {
    if (!rootEl) return;
    var host = rootEl.parentNode;
    var el = host.querySelector('.rcm-toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'rcm-toast';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      host.appendChild(el);
    }
    el.textContent = String(text == null ? '' : text);
    el.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.classList.remove('is-on');
    }, 2200);
  }

  function copy(text) {
    text = String(text == null ? '' : text);
    function fallback() {
      try {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        var ok = document.execCommand && document.execCommand('copy');
        document.body.removeChild(ta);
        return !!ok;
      } catch (e) {
        return false;
      }
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text).then(
          function () {
            return true;
          },
          function () {
            return fallback();
          }
        );
      }
    } catch (e) {}
    return Promise.resolve(fallback());
  }

  /* ---------- memory ---------- */
  var MEM_PREFIX = 'rc_mini:';
  var mem = {
    get: function (key, fallback) {
      try {
        var raw = window.rcDemoMemory ? window.rcDemoMemory.getItem(MEM_PREFIX + key) : null;
        if (raw == null) return fallback;
        return JSON.parse(raw);
      } catch (e) {
        return fallback;
      }
    },
    set: function (key, value) {
      try {
        if (window.rcDemoMemory) window.rcDemoMemory.setItem(MEM_PREFIX + key, JSON.stringify(value));
      } catch (e) {}
    }
  };

  /* ---------- events ---------- */
  function on(evt, fn) {
    (listeners[evt] = listeners[evt] || []).push(fn);
    return function off() {
      listeners[evt] = (listeners[evt] || []).filter(function (f) {
        return f !== fn;
      });
    };
  }
  function emit(evt, payload) {
    (listeners[evt] || []).slice().forEach(function (fn) {
      try {
        fn(payload);
      } catch (e) {
        if (window.console) console.error(e);
      }
    });
  }

  /* ---------- context ---------- */
  function scenarioDef(group, id) {
    for (var i = 0; i < scenarios.length; i++) if (scenarios[i].group === group && scenarios[i].id === id) return scenarios[i];
    return null;
  }
  function activeScenarioDefs() {
    var out = [];
    var d = scenarioDef('app', state.scenario);
    if (d) out.push(d);
    Object.keys(state.sc).forEach(function (g) {
      var x = scenarioDef(g, state.sc[g]);
      if (x) out.push(x);
    });
    return out;
  }
  function scenario(group) {
    if (!group || group === 'app') return state.scenario === 'default' ? null : state.scenario;
    return state.sc[group] || null;
  }
  function setScenario(group, id) {
    if (!group || group === 'app') {
      set({ scenario: id || 'default' });
      return;
    }
    var prev = state.sc[group] || null;
    var next = id || null;
    if (prev === next) return;
    if (next) state.sc[group] = next;
    else delete state.sc[group];
    mem.set('scenarios', state.sc);
    emit('change', ctx());
    /* сценарии потоков не сбрасывают текущий экран */
    rerender();
  }
  function baseProfile() {
    var D = RCMini.data;
    var p = D && D.buildProfile ? D.buildProfile(state.role, state.host) : { role: state.role, branches: [] };
    activeScenarioDefs().forEach(function (def) {
      if (typeof def.patchProfile !== 'function') return;
      try {
        p = def.patchProfile(p, { host: state.host, role: state.role, theme: state.theme }) || p;
      } catch (e) {
        if (window.console) console.error(e);
      }
    });
    return p;
  }
  function currentBranchId(profile) {
    var ids = (profile.branches || []).map(function (b) {
      return b.id;
    });
    if (state.branchTouched) {
      return state.branchId && ids.indexOf(state.branchId) >= 0 ? state.branchId : state.branchId === null ? null : profile.activeBranchId;
    }
    return profile.activeBranchId == null ? null : profile.activeBranchId;
  }
  function ctx() {
    var profile = baseProfile();
    var branchId = currentBranchId(profile);
    var branches = (profile.branches || []).map(function (b) {
      var o = { id: b.id, label: b.label, active: b.id === branchId };
      if (b.workplaceLabel) o.workplaceLabel = b.workplaceLabel;
      return o;
    });
    var cur = state.stack[state.stack.length - 1];
    var b = null;
    for (var i = 0; i < branches.length; i++) if (branches[i].id === branchId) b = branches[i];
    /* Фикстура: активный b1 подписан «Центральная точка» (workplaceLabel из bootstrap); после смены — подпись выбранного филиала. */
    if (b && b.id !== profile.activeBranchId) profile.workplaceLabel = b.workplaceLabel || b.label;
    if (!b && branches.length > 1) profile.workplaceLabel = null;
    if (profile.workplaceForbidden && profile.workplaceForbiddenBranchId && branchId && branchId !== profile.workplaceForbiddenBranchId) {
      profile.workplaceForbidden = false;
      profile.workplaceForbiddenMessage = null;
    }
    profile.activeBranchId = branchId;
    profile.branches = branches;
    return {
      host: state.host,
      role: state.role,
      theme: state.theme,
      scenario: state.scenario,
      scenarios: (function () {
        var m = { app: state.scenario === 'default' ? null : state.scenario };
        Object.keys(state.sc).forEach(function (g) {
          m[g] = state.sc[g];
        });
        return m;
      })(),
      profile: profile,
      branches: branches,
      branchId: branchId,
      branch: b,
      screen: cur.id,
      params: cur.params,
      depth: state.stack.length
    };
  }

  /* ---------- router ---------- */
  function registerScreen(id, def) {
    screens[id] = def || {};
    if (rootEl && state.stack[state.stack.length - 1].id === id) render();
  }
  function go(id, params) {
    state.stack.push({ id: id, params: params || {} });
    render({ resetScroll: true });
  }
  function replace(id, params) {
    state.stack[state.stack.length - 1] = { id: id, params: params || {} };
    render({ resetScroll: true });
  }
  function back() {
    var cur = state.stack[state.stack.length - 1];
    var def = screens[cur.id];
    if (def && typeof def.onBack === 'function') {
      try {
        if (def.onBack(ctx(), cur.params) === true) return;
      } catch (e) {
        if (window.console) console.error(e);
      }
    }
    if (state.stack.length > 1) state.stack.pop();
    else state.stack = [{ id: 'home', params: {} }];
    render({ resetScroll: true });
  }
  function home() {
    state.stack = [{ id: 'home', params: {} }];
    render({ resetScroll: true });
  }
  /* Возврат к экрану id ниже по стеку (если он там есть), иначе replace. Используется branch-pick. */
  function returnTo(id, params) {
    for (var i = state.stack.length - 2; i >= 0; i--) {
      if (state.stack[i].id === id) {
        state.stack = state.stack.slice(0, i + 1);
        var top = state.stack[i];
        var merged = {};
        var k;
        for (k in top.params) merged[k] = top.params[k];
        for (k in params || {}) merged[k] = params[k];
        top.params = merged;
        render({ resetScroll: true });
        return;
      }
    }
    replace(id, params);
  }
  function rerender(o) {
    render({ resetScroll: !!(o && o.resetScroll) });
  }

  function setBranch(id) {
    state.branchTouched = true;
    state.branchId = id == null ? null : String(id);
    syncHash();
    emit('change', ctx());
  }
  function set(patch) {
    var changed = false;
    patch = patch || {};
    if (patch.host && HOSTS.indexOf(patch.host) >= 0 && patch.host !== state.host) {
      state.host = patch.host;
      changed = true;
    }
    if (patch.role && ROLES.indexOf(patch.role) >= 0 && patch.role !== state.role) {
      state.role = patch.role;
      state.branchTouched = false;
      state.branchId = null;
      changed = true;
    }
    if (patch.theme && THEMES.indexOf(patch.theme) >= 0 && patch.theme !== state.theme) {
      state.theme = patch.theme;
      changed = true;
    }
    /* Сценарии филиалов есть только у магазина и компании (def.roles).
       Роль сменили на неподходящую — сценарий сбрасывается; выбрали такой сценарий — включается подходящая роль.
       Иначе на экране ничего не меняется и непонятно, что показывает сценарий. */
    if (changed && !patch.scenario) {
      var curDef = scenarioDef('app', state.scenario);
      if (curDef && curDef.roles && curDef.roles.indexOf(state.role) < 0) patch.scenario = 'default';
    }
    if (patch.scenario && patch.scenario !== state.scenario) {
      resetLogin();
      cancelRetry();
      state.scenario = patch.scenario;
      state.branchTouched = false;
      state.branchId = null;
      var nextDef = scenarioDef('app', state.scenario);
      if (nextDef && nextDef.roles && nextDef.roles.indexOf(state.role) < 0) state.role = nextDef.roles[0];
      changed = true;
    }
    if (changed) {
      applyRootAttrs();
      emit('change', ctx());
      if (patch.keepScreen) rerender();
      else home();
    }
  }

  function addScenario(def) {
    for (var i = 0; i < scenarios.length; i++) {
      if (scenarios[i].group === def.group && scenarios[i].id === def.id) {
        scenarios[i] = def;
        return;
      }
    }
    scenarios.push(def);
  }
  /* registerScenarios(group, [{id, label, patchProfile?}], groupLabel?) */
  function registerScenarios(group, list, groupLabel) {
    group = group || 'app';
    if (groupLabel) groupLabels[group] = groupLabel;
    (list || []).forEach(function (d) {
      if (!d || !d.id) return;
      var copyDef = {};
      for (var k in d) copyDef[k] = d[k];
      copyDef.group = group;
      addScenario(copyDef);
    });
    emit('scenarios', scenarios.slice());
    if (rootEl) rerender();
  }
  /* registerScenario({id, label, group?, groupLabel?, patchProfile?}) */
  function registerScenario(def) {
    if (!def || !def.id) return;
    registerScenarios(def.group || 'app', [def], def.groupLabel);
  }

  /* ---------- hash ---------- */
  function parseHash() {
    var h = (location.hash || '').replace(/^#/, '');
    var out = {};
    if (!h) return out;
    h.split('&').forEach(function (pair) {
      if (!pair) return;
      var i = pair.indexOf('=');
      var k = decodeURIComponent(i < 0 ? pair : pair.slice(0, i));
      var v = i < 0 ? '' : decodeURIComponent(pair.slice(i + 1).replace(/\+/g, ' '));
      out[k] = v;
    });
    return out;
  }
  function buildHash() {
    var cur = state.stack[state.stack.length - 1];
    var parts = ['screen=' + encodeURIComponent(cur.id), 'role=' + state.role, 'host=' + state.host, 'theme=' + state.theme];
    if (state.scenario && state.scenario !== 'default') parts.push('scenario=' + encodeURIComponent(state.scenario));
    Object.keys(state.sc).forEach(function (g) {
      parts.push('sc-' + encodeURIComponent(g) + '=' + encodeURIComponent(state.sc[g]));
    });
    if (state.branchTouched && state.branchId) parts.push('branch=' + encodeURIComponent(state.branchId));
    var p = cur.params || {};
    Object.keys(p).forEach(function (k) {
      var v = p[k];
      if (CTX_KEYS[k] || k.indexOf('sc-') === 0 || v == null) return;
      if (typeof v === 'object') return; // объекты в hash не пишем
      parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(String(v)));
    });
    return '#' + parts.join('&');
  }
  function syncHash() {
    var h = buildHash();
    if (h === location.hash) {
      lastHash = h;
      return;
    }
    lastHash = h;
    suppressHash = true;
    try {
      location.replace(h);
    } catch (e) {
      location.hash = h;
    }
    setTimeout(function () {
      suppressHash = false;
    }, 0);
  }
  function applyHash() {
    var q = parseHash();
    var h0 = !!(location.hash || '').replace(/^#/, '');
    if (ROLES.indexOf(q.role) >= 0) state.role = q.role;
    if (HOSTS.indexOf(q.host) >= 0) state.host = q.host;
    if (THEMES.indexOf(q.theme) >= 0) state.theme = q.theme;
    state.scenario = q.scenario || 'default';
    /* Ссылка со сценарием филиалов и неподходящей ролью (например, специалист): включаем роль сценария,
       иначе экран выглядит как обычный и непонятно, что показывает сценарий. */
    var hashDef = scenarioDef('app', state.scenario);
    if (hashDef && hashDef.roles && hashDef.roles.indexOf(state.role) < 0) state.role = hashDef.roles[0];
    var sc = {};
    var hasSc = false;
    Object.keys(q).forEach(function (k) {
      if (k.indexOf('sc-') === 0 && q[k]) {
        sc[k.slice(3)] = q[k];
        hasSc = true;
      }
    });
    /* hash — источник истины; память — только если hash пуст (первый вход без параметров) */
    state.sc = hasSc || h0 ? sc : mem.get('scenarios', {}) || {};
    mem.set('scenarios', state.sc);
    if (q.branch) {
      state.branchTouched = true;
      state.branchId = q.branch;
    } else {
      state.branchTouched = false;
      state.branchId = null;
    }
    var params = {};
    Object.keys(q).forEach(function (k) {
      if (!CTX_KEYS[k] && k.indexOf('sc-') !== 0) params[k] = q[k];
    });
    var id = q.screen || 'home';
    state.stack = id === 'home' ? [{ id: 'home', params: params }] : [{ id: 'home', params: {} }, { id: id, params: params }];
    applyRootAttrs();
  }
  function onHashChange() {
    if (suppressHash || location.hash === lastHash) return;
    applyHash();
    emit('change', ctx());
    render({ resetScroll: true });
  }

  /* ---------- render ---------- */
  function applyRootAttrs() {
    if (!rootEl) return;
    rootEl.setAttribute('data-theme', state.theme);
    rootEl.setAttribute('data-host', state.host);
    rootEl.setAttribute('data-role', state.role);
    var page = document.documentElement;
    page.setAttribute('data-rcm-host', state.host);
    page.setAttribute('data-rcm-theme', state.theme);
  }

  function stubScreen(id) {
    return {
      render: function () {
        return subpage({
          title: 'Раздел готовится',
          lead: 'Экран «' + id + '» ещё не подключён в прототипе.',
          body: ''
        });
      }
    };
  }

  /* Вход без авторизации. Шаги и подписи — со страницы входа на сайте (AuthFlow.tsx): способ входа → одноразовый код.
     В рабочем мини-приложении сейчас только кнопка, ведущая на эту страницу сайта; здесь путь показан целиком. */
  var login = { step: 'start', code: '', error: '' };
  function resetLogin() {
    login = { step: 'start', code: '', error: '' };
  }
  function loginHtml(c, g, brand, hostName) {
    if (login.step === 'code') {
      return (
        '<button type="button" class="backBtn" data-rcm-login="back">← Назад</button>' +
        '<p class="loginEyebrow">Вход в кабинет · ' + hostName + '</p>' +
        '<h1 class="heroTitle">Введите одноразовый код</h1>' +
        '<p class="gateText">Бот RemCard отправил код в\u00a0чат ' + hostName + '. Дождитесь сообщения и введите код здесь.</p>' +
        '<form class="loginForm" data-rcm-login-form novalidate>' +
        '<label class="miniField"><span class="miniFieldLabel">Код из 6 цифр</span>' +
        '<input class="miniSelect loginCode" name="login-code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="••••••"' +
        ' aria-label="Код из сообщения" data-testid="mini-login-code" value="' + esc(login.code) + '"' +
        (login.error ? ' aria-invalid="true" aria-describedby="mini-login-error"' : '') + '></label>' +
        (login.error ? '<p class="scanBad" role="alert" id="mini-login-error" data-testid="mini-login-error">' + esc(login.error) + '</p>' : '') +
        '<button type="submit" class="primaryBtn" data-testid="mini-login-confirm">Подтвердить и продолжить</button>' +
        '</form>' +
        '<button type="button" class="loginLink" data-rcm-login="resend">Отправить код ещё раз</button>' +
        '<p class="loginNote">Код подтверждает вход, а не создаёт новый аккаунт. В\u00a0прототипе подойдёт любой код из 6 цифр.</p>'
      );
    }
    var ico = function (d) {
      return '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + d + '</svg>';
    };
    var step = function (n, icon, title, note) {
      return (
        '<li class="loginStep"><span class="loginStepIcon">' + icon + '<b aria-hidden="true">' + n + '</b></span>' +
        '<strong>' + title + '</strong><span>' + note + '</span></li>'
      );
    };
    return (
      '<section class="loginHero" aria-labelledby="mini-login-title">' +
      '<span class="loginHeroArt" aria-hidden="true"><svg viewBox="0 0 36 36" width="150" height="150" focusable="false"><path d="M10 26V12l8-5 8 5v14h-5v-8h-6v8z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg></span>' +
      '<div class="loginHeroTop">' +
      '<span class="loginHeroMark" aria-hidden="true"><svg viewBox="0 0 36 36" width="22" height="22" focusable="false"><path d="M10 26V12l8-5 8 5v14h-5v-8h-6v8z" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/></svg></span>' +
      '<span class="loginHeroBrand">RemCard PROF</span>' +
      '</div>' +
      '<p class="loginHeroHost">Вход через ' + hostName + '</p>' +
      '<h1 class="loginHeroTitle" id="mini-login-title">Войдите в\u00a0кабинет</h1>' +
      '<p class="loginHeroLead">Один раз подтвердите вход\u00a0— дальше мини\u2011кабинет откроется сразу.</p>' +
      '</section>' +
      '<h2 class="quickLabel loginHow" id="mini-login-how">ТРИ ШАГА</h2>' +
      '<ol class="loginSteps" aria-labelledby="mini-login-how">' +
      step(1, ico('<path d="M21 3 10.5 13.5"/><path d="M21 3l-6.5 18-4-7.5L3 9.5z"/>'), 'Нажмите', 'кнопку ниже') +
      step(2, ico('<path d="M4 5.5h16v11H9.5L5 20v-3.5H4z"/><path d="M8.5 11h.01M12 11h.01M15.5 11h.01"/>'), 'Получите код', '6 цифр в\u00a0чате') +
      step(3, ico('<rect x="4.5" y="10.5" width="15" height="10" rx="2.2"/><path d="M8 10.5V8a4 4 0 0 1 7.6-1.7"/>'), 'Введите код', 'и\u00a0вы в\u00a0кабинете') +
      '</ol>' +
      '<button type="button" class="primaryBtn loginGo" data-rcm-login="continue" data-testid="mini-login-continue">' +
      '<span>Продолжить с\u00a0' + hostName + '</span><span class="loginGoArrow" aria-hidden="true">→</span></button>' +
      '<p class="loginJoin">Нет аккаунта? ' +
      '<a class="loginLink" href="' + esc(g.joinUrl) + '" target="_blank" rel="noreferrer" data-rcm-external data-testid="mini-login-join">Зарегистрироваться</a></p>'
    );
  }
  function onLoginAction(action) {
    if (action === 'open') {
      resetLogin();
      set({ scenario: 'login' });
      return;
    }
    if (action === 'continue') {
      login.step = 'code';
      login.error = '';
      render({ resetScroll: true });
      var input = rootEl.querySelector('[data-testid="mini-login-code"]');
      if (input) input.focus({ preventScroll: true });
      return;
    }
    if (action === 'back') {
      resetLogin();
      render({ resetScroll: true });
      return;
    }
    if (action === 'resend') toast('Код отправлен в ' + (state.host === 'max' ? 'MAX' : 'Telegram') + ' ещё раз');
  }
  /* Ввод кода: только цифры; подсказка об ошибке снимается, как только код меняют. */
  function onLoginInput(e) {
    var input = e.target;
    if (!input || input.name !== 'login-code' || !rootEl.contains(input)) return;
    var digits = String(input.value || '').replace(/\D/g, '').slice(0, 6);
    if (digits !== input.value) input.value = digits;
    login.code = digits;
    if (login.error) {
      login.error = '';
      input.removeAttribute('aria-invalid');
      input.removeAttribute('aria-describedby');
      var err = rootEl.querySelector('#mini-login-error');
      if (err) err.remove();
    }
  }
  function onLoginSubmit(e) {
    var form = e.target && e.target.closest && e.target.closest('[data-rcm-login-form]');
    if (!form || !rootEl.contains(form)) return;
    e.preventDefault();
    var input = form.querySelector('[name="login-code"]');
    login.code = String((input && input.value) || '').replace(/\D/g, '').slice(0, 6);
    if (login.code.length !== 6) {
      login.error = 'Введите 6-значный код из бота.';
      rerender();
      var again = rootEl.querySelector('[data-testid="mini-login-code"]');
      if (again) {
        again.focus({ preventScroll: true });
        try {
          again.setSelectionRange(again.value.length, again.value.length);
        } catch (err) {}
      }
      return;
    }
    resetLogin();
    set({ scenario: 'default' });
    toast('Вход выполнен. Мини-кабинет открыт');
  }

  /* Повтор загрузки с экрана ошибки: в прототипе повтор всегда успешен. */
  var retry = { on: false, timer: null };
  function cancelRetry() {
    if (retry.timer) clearTimeout(retry.timer);
    retry = { on: false, timer: null };
  }
  function startRetry() {
    if (retry.on) return;
    retry.on = true;
    render({ resetScroll: true });
    retry.timer = setTimeout(function () {
      cancelRetry();
      set({ scenario: 'default' });
      toast('Мини-кабинет загружен');
    }, 1600);
  }

  /* В рабочем коде здесь строка «Загрузка…». Предложение прототипа: знак, понятная фраза и что именно готовится. */
  function loadingGate() {
    return {
      testid: 'mini-app-loading',
      html:
        '<div class="miniLoad" role="status">' +
        '<span class="miniLoadMark" aria-hidden="true">' +
        '<svg viewBox="0 0 36 36" width="68" height="68" focusable="false"><rect width="36" height="36" rx="8" fill="currentColor"/>' +
        '<path class="miniLoadHouse" pathLength="1" d="M10 26V12l8-5 8 5v14h-5v-8h-6v8z" fill="none" stroke="#fff" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/></svg>' +
        '</span>' +
        '<p class="miniLoadBrand">RemCard PROF</p>' +
        '<h1 class="miniLoadTitle">Готовим ваши данные к\u00a0просмотру</h1>' +
        '<p class="miniLoadLines" aria-hidden="true">' +
        '<span>Считаем начисления и баланс</span>' +
        '<span>Собираем сертификаты клиентов</span>' +
        '<span>Обновляем список партнёров</span>' +
        '</p>' +
        '<span class="miniLoadBar" aria-hidden="true"><i></i></span>' +
        '</div>'
    };
  }

  /* Экраны-состояния до загрузки bootstrap (MiniAppRoot.tsx): loading / unlinked / error */
  function gateHtml(c) {
    var g = c.profile && c.profile.gate;
    if (!g) return null;
    var brand = RCMini.ui.brand();
    if (g.kind === 'loading' || retry.on) return loadingGate();
    var hostName = c.host === 'max' ? 'MAX' : 'Telegram';
    var link = function (url, label) {
      return '<a class="primaryBtn" href="' + esc(url) + '" target="_blank" rel="noreferrer" data-rcm-external>' + esc(label) + '</a>';
    };
    if (g.kind === 'login') {
      return { testid: login.step === 'code' ? 'mini-app-login-code' : 'mini-app-login', html: loginHtml(c, g, brand, hostName) };
    }
    /* Правило прототипа: нет доступа к мини-кабинету — ведём на регистрацию.
       MESSENGER_UNLINKED: аккаунт мессенджера не связан ни с одним кабинетом PROF
       (в рабочем коде — «Аккаунт не подключён» / «Войти и привязать»). */
    if (g.kind === 'unlinked') {
      return {
        testid: 'mini-app-unlinked',
        html:
          brand +
          '<h1 class="heroTitle">Нет доступа к\u00a0мини\u2011кабинету</h1>' +
          '<p class="gateText">Этот аккаунт ' + hostName + ' пока не связан с\u00a0кабинетом RemCard PROF.</p>' +
          '<p class="gateText">Чтобы получить доступ, пройдите регистрацию\u00a0— после неё мини-кабинет будет открываться сразу.</p>' +
          link(g.url, 'Пройти регистрацию') +
          '<button type="button" class="secondaryBtn" data-rcm-login="open" data-testid="mini-app-unlinked-login">Уже зарегистрированы\u00a0— войти</button>'
      };
    }
    /* cabinet_blocked: вход выполнен, но регистрация не доведена до конца — не приняты обязательные соглашения
       или не заполнен профиль (в рабочем коде — «Кабинет ещё не готов. Продолжите на сайте PROF.» без кнопки). */
    if (g.kind === 'blocked') {
      return {
        testid: 'mini-app-blocked',
        html:
          brand +
          '<h1 class="heroTitle">Регистрация не\u00a0завершена</h1>' +
          '<p class="gateText">Чтобы получить доступ к\u00a0мини-кабинету, завершите регистрацию на сайте RemCard PROF:</p>' +
          '<ol class="gateSteps" aria-label="Что сделать"><li>Примите обязательные соглашения</li><li>Заполните профиль</li></ol>' +
          '<p class="gateText">После этого откройте мини-кабинет снова.</p>' +
          link(g.url, 'Завершить регистрацию')
      };
    }
    /* Ошибки входа в мини-кабинет. В рабочем коде — одна строка без действий; здесь по комментарию:
       что случилось, что сделать по шагам и кнопка. */
    var badge = function (d) {
      return '<span class="gateBadge" aria-hidden="true"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" focusable="false">' + d + '</svg></span>';
    };
    var steps = function (items) {
      return '<ol class="gateSteps" aria-label="Что сделать">' + items.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ol>';
    };
    var cabinetUrl = (c.profile && c.profile.fullCabinetUrl) || 'https://prof.remcard.ru/';
    var cabinetBtn = function (cls) {
      return '<a class="' + cls + '" href="' + esc(cabinetUrl) + '" target="_blank" rel="noreferrer" data-rcm-external data-testid="mini-app-error-cabinet">Открыть полный кабинет на сайте</a>';
    };
    if (g.reason === 'load') {
      return {
        testid: 'mini-app-error',
        html:
          brand +
          badge('<path d="M2.5 9.5a14 14 0 0 1 5-3.2M21.5 9.5A14 14 0 0 0 12 6M6 13.5a9 9 0 0 1 3.5-2.2M18 13.5a9 9 0 0 0-2.5-1.8M9.5 17.3a4 4 0 0 1 5 0"/><path d="M12 20.5h.01M3.5 3.5l17 17"/>') +
          '<h1 class="heroTitle" role="alert">Не удалось загрузить мини\u2011кабинет</h1>' +
          '<p class="gateText">Скорее всего, пропала связь. С\u00a0вашими данными всё в\u00a0порядке\u00a0— не получилось только их показать.</p>' +
          steps([
            'Проверьте интернет на\u00a0телефоне',
            'Нажмите «Повторить»',
            'Не помогло\u00a0— закройте мини\u2011кабинет и\u00a0откройте его снова из\u00a0чата с\u00a0ботом'
          ]) +
          '<button type="button" class="primaryBtn" data-rcm-retry data-testid="mini-app-error-retry">Повторить</button>' +
          cabinetBtn('secondaryBtn')
      };
    }
    if (g.reason === 'pilot') {
      return {
        testid: 'mini-app-error',
        html:
          brand +
          badge('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>') +
          '<h1 class="heroTitle" role="alert">Мини\u2011кабинет пока отключён</h1>' +
          '<p class="gateText">Он работает в\u00a0пилотном режиме и\u00a0сейчас недоступен. Сертификаты, приглашения и\u00a0расчёты по-прежнему доступны в\u00a0полном кабинете на\u00a0сайте.</p>' +
          cabinetBtn('primaryBtn')
      };
    }
    if (g.reason === 'host') {
      return {
        testid: 'mini-app-error',
        html:
          brand +
          badge('<path d="M4 5.5h16v11H9.5L5 20v-3.5H4z"/><path d="M8.5 11h.01M12 11h.01M15.5 11h.01"/>') +
          '<h1 class="heroTitle" role="alert">Откройте мини\u2011кабинет в\u00a0мессенджере</h1>' +
          '<p class="gateText">Эта страница работает только внутри Telegram или MAX.</p>' +
          steps([
            'Откройте чат с\u00a0ботом RemCard в\u00a0Telegram или MAX',
            'Запустите мини\u2011кабинет из\u00a0этого чата'
          ]) +
          cabinetBtn('secondaryBtn')
      };
    }
    return { testid: 'mini-app-error', html: brand + '<p role="alert">' + esc(g.message || 'Нет данных') + '</p>' };
  }

  var rendering = false;
  function render(opts) {
    if (!rootEl || rendering) return;
    rendering = true;
    opts = opts || {};
    try {
      var c = ctx();
      var cur = state.stack[state.stack.length - 1];
      var prevScroll = rootEl.scrollTop;
      var gate = gateHtml(c);
      var def = null;
      var html;
      var testid = '';
      if (gate) {
        html = gate.html;
        testid = gate.testid;
      } else {
        def = screens[cur.id] || stubScreen(cur.id);
        try {
          html = def.render(c, cur.params || {}) || '';
        } catch (e) {
          if (window.console) console.error(e);
          html = subpage({ title: 'Ошибка экрана', lead: String(e && e.message ? e.message : e), body: '' });
        }
        testid = def.testid ? (typeof def.testid === 'function' ? def.testid(c, cur.params || {}) : def.testid) : '';
      }
      rootEl.innerHTML =
        '<div class="shell" data-screen="' + esc(gate ? 'gate' : cur.id) + '"' + (testid ? ' data-testid="' + esc(testid) + '"' : '') + '>' + html + '</div>';
      rootEl.scrollTop = opts.resetScroll ? 0 : prevScroll;
      if (def && typeof def.afterRender === 'function') {
        try {
          def.afterRender(rootEl, c, cur.params || {});
        } catch (e) {
          if (window.console) console.error(e);
        }
      }
      syncHash();
      emit('render', { screen: gate ? 'gate' : cur.id, ctx: c, depth: state.stack.length });
    } finally {
      rendering = false;
    }
  }

  /* Делегирование: «← К кабинету» и внешние ссылки (в прототипе не уходим на рабочий сайт). */
  function onRootClick(e) {
    var t = e.target;
    var backEl = t.closest && t.closest('[data-rcm-back]');
    if (backEl && rootEl.contains(backEl)) {
      e.preventDefault();
      back();
      return;
    }
    var retryEl = t.closest && t.closest('[data-rcm-retry]');
    if (retryEl && rootEl.contains(retryEl)) {
      e.preventDefault();
      startRetry();
      return;
    }
    var loginEl = t.closest && t.closest('[data-rcm-login]');
    if (loginEl && rootEl.contains(loginEl)) {
      e.preventDefault();
      onLoginAction(loginEl.getAttribute('data-rcm-login'));
      return;
    }
    var goEl = t.closest && t.closest('[data-go]');
    if (goEl && rootEl.contains(goEl) && !goEl.disabled) {
      e.preventDefault();
      var params = {};
      var raw = goEl.getAttribute('data-params');
      if (raw) {
        try {
          params = JSON.parse(raw);
        } catch (err) {}
      }
      go(goEl.getAttribute('data-go'), params);
      return;
    }
    var ext = t.closest && t.closest('[data-rcm-external]');
    if (ext && rootEl.contains(ext)) {
      e.preventDefault();
      openExternal(ext.getAttribute('href') || ext.getAttribute('data-href') || '');
    }
  }
  /* host.openExternalLink — в прототипе только уведомление, без перехода. */
  function openExternal(url) {
    var name = state.host === 'max' ? 'MAX' : 'Telegram';
    toast(name + ' откроет ссылку: ' + String(url || '').replace(/^https?:\/\//, ''));
  }

  function mount(el) {
    rootEl = el;
    rootEl.addEventListener('click', onRootClick);
    rootEl.addEventListener('submit', onLoginSubmit);
    rootEl.addEventListener('input', onLoginInput);
    applyHash();
    window.addEventListener('hashchange', onHashChange);
    render({ resetScroll: true });
  }

  var RCMini = {
    version: 1,
    registerScreen: registerScreen,
    go: go,
    replace: replace,
    back: back,
    home: home,
    returnTo: returnTo,
    rerender: rerender,
    ctx: ctx,
    set: set,
    setBranch: setBranch,
    on: on,
    emit: emit,
    registerScenario: registerScenario,
    registerScenarios: registerScenarios,
    scenario: scenario,
    setScenario: setScenario,
    scenarios: function () {
      return scenarios.slice();
    },
    scenarioGroups: function () {
      var g = {};
      for (var k in groupLabels) g[k] = groupLabels[k];
      return g;
    },
    data: {},
    mem: mem,
    slots: { homeWallet: null },
    openExternal: openExternal,
    mount: mount,
    root: function () {
      return rootEl;
    },
    ui: {
      esc: esc,
      money: money,
      moneyParts: moneyParts,
      icon: icon,
      subpage: subpage,
      toast: toast,
      copy: copy,
      brand: function () {
        /* MiniAppProfBrand.tsx */
        return (
          '<div class="profBrand" data-testid="mini-app-brand"><span class="profBrandIcon" aria-hidden="true">' +
          '<svg viewBox="0 0 36 36" width="32" height="32" role="img" aria-label=""><rect width="36" height="36" rx="8" fill="currentColor"/>' +
          '<path d="M10 26V12l8-5 8 5v14h-5v-8h-6v8z" fill="none" stroke="#fff" stroke-width="2.2" stroke-linejoin="round"/></svg>' +
          '</span><span class="profBrandText">RemCard PROF</span></div>'
        );
      }
    }
  };
  window.RCMini = RCMini;
})();
