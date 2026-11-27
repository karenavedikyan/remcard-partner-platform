/*
 * Запуск мини-кабинета + панель «Демо» и шапка мессенджера (служебная оболочка макета).
 */
(function () {
  'use strict';
  var RCMini = window.RCMini;
  var esc = RCMini.ui.esc;
  var demoBody = document.getElementById('rcmDemoBody');
  var hostBack = document.getElementById('rcmHostBack');
  var hostSub = document.getElementById('rcmHostSub');

  var ROLE_LABELS = RCMini.data.roleLabels;
  var GROUP_ORDER = ['app', 'cert', 'invite', 'wallet', 'scan'];
  var GROUP_FALLBACK = { app: 'Состояние', cert: 'Сертификат', invite: 'Приглашения', wallet: 'Кошелёк', scan: 'Проверка QR' };

  function seg(name, items, current) {
    return (
      '<div class="rcm-seg" role="group" data-seg="' + name + '">' +
      items
        .map(function (it) {
          return (
            '<button type="button" data-val="' + esc(it[0]) + '" aria-pressed="' + (it[0] === current ? 'true' : 'false') + '">' +
            esc(it[1]) + '</button>'
          );
        })
        .join('') +
      '</div>'
    );
  }

  function renderDemo() {
    var c = RCMini.ctx();
    var h = '';
    h += '<div class="rcm-group"><div class="rcm-label">Мессенджер</div>' + seg('host', [['telegram', 'Telegram'], ['max', 'MAX']], c.host) + '</div>';
    h +=
      '<div class="rcm-group"><div class="rcm-label">Роль</div>' +
      seg('role', RCMini.data.roles.map(function (r) { return [r, ROLE_LABELS[r]]; }), c.role) +
      '</div>';

    var all = RCMini.scenarios();
    var labels = RCMini.scenarioGroups();
    var groups = [];
    all.forEach(function (s) {
      if (groups.indexOf(s.group) < 0) groups.push(s.group);
    });
    groups.sort(function (a, b) {
      var ia = GROUP_ORDER.indexOf(a), ib = GROUP_ORDER.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
    if (groups.length) {
      h += '<div class="rcm-group"><div class="rcm-label">Сценарии</div>';
      groups.forEach(function (g) {
        var list = all.filter(function (s) { return s.group === g; });
        var cur = RCMini.scenario(g);
        h += '<p class="rcm-sub">' + esc(labels[g] || GROUP_FALLBACK[g] || g) + '</p>';
        h += '<select data-scenario-group="' + esc(g) + '" aria-label="' + esc(labels[g] || GROUP_FALLBACK[g] || g) + '">';
        if (!list.some(function (s) { return s.id === 'default' || s.id === 'normal'; })) {
          h += '<option value="">Обычно</option>';
        }
        list.forEach(function (s) {
          var isDefault = s.id === 'default' || s.id === 'normal';
          var selected = cur ? cur === s.id : isDefault;
          h += '<option value="' + (isDefault ? '' : esc(s.id)) + '"' + (selected ? ' selected' : '') + '>' + esc(s.label || s.id) + '</option>';
        });
        h += '</select>';
        if (g === 'app' && cur) {
          var curDef = list.filter(function (s) { return s.id === cur; })[0];
          if (curDef && curDef.roles) {
            h += '<p class="rcm-hint" data-testid="demo-scenario-roles">Сценарий только для: ' +
              curDef.roles.map(function (r) { return esc(ROLE_LABELS[r] || r); }).join(', ') +
              '. Роль включена автоматически.</p>';
          }
        }
      });
      h += '</div>';
    }

    if (c.screen === 'scan' && !c.profile.gate) {
      h += '<div class="rcm-group"><div class="rcm-label">Камера: навести на QR</div><div class="rcm-seg" data-qr>';
      [['RC-FIXTURE', 'Действует'], ['RC-USED', 'Использован'], ['RC-B2-ONLY', 'Другой филиал'], ['RC-NOPE-00', 'Не найден']].forEach(function (q) {
        h += '<button type="button" data-qr-code="' + esc(q[0]) + '">' + esc(q[1]) + '</button>';
      });
      h += '</div></div>';
    }
    demoBody.innerHTML = h;
  }

  demoBody.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    var segEl = b.closest('[data-seg]');
    if (segEl) {
      var patch = {};
      patch[segEl.getAttribute('data-seg')] = b.getAttribute('data-val');
      /* смена мессенджера не сбрасывает экран — как один и тот же кабинет в другом боте */
      if (segEl.getAttribute('data-seg') === 'host') patch.keepScreen = true;
      RCMini.set(patch);
      return;
    }
    if (b.hasAttribute('data-qr-code')) {
      RCMini.simulateQr(b.getAttribute('data-qr-code'));
      if (window.matchMedia('(max-width: 520px)').matches) document.body.classList.remove('rcm-demo-open');
    }
  });
  demoBody.addEventListener('change', function (e) {
    var s = e.target.closest('select[data-scenario-group]');
    if (!s) return;
    RCMini.setScenario(s.getAttribute('data-scenario-group'), s.value || null);
  });
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-demo-open]')) document.body.classList.add('rcm-demo-open');
    else if (e.target.closest('[data-demo-close]')) document.body.classList.remove('rcm-demo-open');
  });

  /* Шапка мессенджера: BackButton Telegram/MAX показывается вне главной (host.onBack в MiniAppRoot). */
  function renderHostBar(e) {
    var c = RCMini.ctx();
    var screen = e && e.screen ? e.screen : c.screen;
    var showBack = screen !== 'home' && screen !== 'gate';
    hostBack.textContent = showBack ? (c.host === 'max' ? '‹ Назад' : '‹ Назад') : c.host === 'max' ? '✕' : 'Закрыть';
    hostBack.setAttribute('aria-label', showBack ? 'Назад' : 'Закрыть');
    hostSub.textContent = c.host === 'max' ? 'мини-приложение MAX' : 'мини-приложение';
  }
  hostBack.addEventListener('click', function () {
    var c = RCMini.ctx();
    if (c.screen !== 'home' && !c.profile.gate) {
      /* host.onBack(back) в MiniAppRoot ведёт на главную */
      RCMini.back();
    } else {
      RCMini.ui.toast('В мессенджере мини-приложение закроется');
    }
  });

  RCMini.on('render', function (e) {
    renderDemo();
    renderHostBar(e);
  });
  RCMini.on('scenarios', function () {
    if (RCMini.root()) renderDemo();
  });

  RCMini.mount(document.getElementById('app'));
})();
