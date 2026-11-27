/*
 * Главный экран (MiniAppRoot.tsx, ветка home) + карта кошелька (MiniAppWalletCard.tsx) + выбор филиала (branch-pick).
 */
(function () {
  'use strict';
  var RCMini = window.RCMini;
  var ui = RCMini.ui;
  var esc = ui.esc;

  /* MiniAppWalletCard.tsx — один к одному */
  function walletCardHtml(c) {
    var p = c.profile;
    var w = p.wallet || { status: 'unavailable', message: '' };
    var confirmed = w.status === 'ok' ? ui.moneyParts(w.confirmedUnpaidRub) : { amount: '—', currency: '' };
    var waiting = w.status === 'ok' ? ui.moneyParts(w.awaitingRub) : { amount: '—', currency: '' };
    return (
      '<div class="cardWrap">' +
      '<button type="button" class="walletCard" data-testid="mini-app-wallet-card" aria-label="Кошелёк RemCard" data-go="card-info">' +
      '<div class="walletHead">' +
      '<span class="walletRibbon">' + esc(p.roleLabel) + '</span>' +
      '<span class="walletLockup" aria-hidden="true">remcard<span class="walletLockupDot">.</span></span>' +
      '</div>' +
      '<span class="walletCardFab" aria-hidden="true">→</span>' +
      '<div class="walletBody">' +
      '<p class="walletLabel">Начислено к получению</p>' +
      '<div class="walletHero">' +
      '<strong class="walletAmount">' + esc(w.status !== 'ok' ? '—' : confirmed.amount) + '</strong>' +
      '<span class="walletUnit">' + esc(confirmed.currency || ' ₽') + '</span>' +
      '</div>' +
      (w.status === 'error' ? '<p class="walletNotice" role="alert">' + esc(w.message) + '</p>' : '') +
      (w.status === 'unavailable' ? '<p class="walletNotice">' + esc(w.message) + '</p>' : '') +
      '<p class="walletLabel walletLabelSecondary">Ожидает подтверждения</p>' +
      '<div class="walletWaitingRow">' +
      '<strong class="walletWaitingAmount">' + esc(waiting.amount) + '</strong>' +
      '<span class="walletWaitingUnit">' + esc(waiting.currency || ' ₽') + '</span>' +
      '</div>' +
      '</div>' +
      '</button>' +
      '</div>'
    );
  }
  RCMini.ui.walletCard = walletCardHtml;

  function actionIcon(id) {
    return id === 'scan_qr' ? ui.icon('scan') : ui.icon('certificate');
  }

  /* dispatchAction() из MiniAppRoot.tsx */
  function dispatchAction(id) {
    var c = RCMini.ctx();
    var p = c.profile;
    if (id === 'create_certificate') {
      if ((p.role === 'store' || p.role === 'company') && !c.branchId && p.branches.length > 1) {
        RCMini.go('branch-pick', { next: 'cert-create', purpose: 'certificate' });
        return;
      }
      RCMini.go('cert-create');
    } else if (id === 'scan_qr') RCMini.go('scan');
    else if (id === 'invite_partner') RCMini.go('invite');
    else if (id === 'open_full_cabinet') RCMini.go('full-cabinet');
  }
  RCMini.dispatchAction = dispatchAction;

  /* Нет прав на рабочее место (bootstrap.workplaceForbidden).
   * В рабочем коде — строка-уведомление над обычной главной. В прототипе по комментарию: без прав не показываем
   * ни баланс, ни действия — только причину и что делать: получить доступ у руководителя. */
  function renderNoAccess(c) {
    var p = c.profile;
    var isCompany = p.role === 'company';
    var isOrg = isCompany || p.role === 'store';
    var place = (c.branch && c.branch.label) || p.workplaceLabel || '';
    var noun = isCompany ? 'филиалу' : 'точке';
    var nounIns = isCompany ? 'филиалом' : 'точкой';
    var h = ui.brand();
    if (p.entityLine || p.displayName) h += '<p class="heroIntro">' + esc(p.entityLine || p.displayName) + '</p>';
    h += '<h1 class="heroTitle">' + (isOrg ? 'Нет доступа к\u00a0' + noun : 'Нет доступа к\u00a0данным') + '</h1>';
    h +=
      '<p class="gateText">' +
      (isOrg && place
        ? 'У вас нет прав на работу с\u00a0' + nounIns + ' «' + esc(place) + '».'
        : 'У вас нет прав на просмотр этих данных.') +
      '</p>';
    h +=
      '<div class="accessAsk" role="status" data-testid="mini-no-access">' +
      '<span class="accessAskIcon" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.6"/><path d="M4.8 20c.8-3.6 3.6-5.6 7.2-5.6s6.4 2 7.2 5.6"/></svg></span>' +
      '<span class="accessAskText"><strong>Получите доступ у\u00a0вашего руководителя</strong>' +
      '<span>Он открывает права сотрудникам в\u00a0полном кабинете RemCard PROF.</span></span>' +
      '</div>';
    if (c.branches.length > 1) {
      h += '<button type="button" class="secondaryBtn" data-testid="mini-app-branch-select" data-go="branch-pick">Выбрать другой филиал</button>';
    }
    return h;
  }

  function renderHome(c) {
    var p = c.profile;
    if (p.workplaceForbidden) return renderNoAccess(c);
    var primary = p.actions.filter(function (a) { return a.prominence === 'primary'; });
    var secondary = p.actions.filter(function (a) { return a.prominence === 'secondary'; });
    var tertiary = p.actions.filter(function (a) { return a.prominence === 'tertiary'; });
    var introLine = p.entityLine || (p.displayName && p.role !== 'store' && p.role !== 'company' ? p.displayName : null);
    var isAgent = p.role === 'agent';

    var wallet = '';
    if (typeof RCMini.slots.homeWallet === 'function') {
      try {
        wallet = RCMini.slots.homeWallet(c);
      } catch (e) {
        if (window.console) console.error(e);
        wallet = null;
      }
    }
    if (wallet == null || wallet === '') wallet = walletCardHtml(c);

    var h = ui.brand();
    if (introLine) h += '<p class="heroIntro">' + esc(introLine) + '</p>';
    h += '<h1 class="heroTitle">' + esc(p.cabinetTitle) + '</h1>';
    h += wallet;

    if ((p.role === 'company' || p.role === 'store') && p.branches.length > 1) {
      h +=
        (p.workplaceLabel
          ? '<button type="button" class="branchButton" data-testid="mini-app-branch-select" data-go="branch-pick">' +
            '<span class="branchButtonLeft">' + ui.icon('pin') + esc(p.workplaceLabel) + '</span>' +
            '<span class="branchButtonRight">Сменить' + ui.icon('chevron') + '</span></button>'
          : /* Филиал не выбран: в рабочем коде та же кнопка с текстом «Выберите филиал»; здесь она заметнее и с пояснением. */
            '<button type="button" class="branchButton branchButtonEmpty" data-testid="mini-app-branch-select" data-go="branch-pick">' +
            '<span class="branchButtonLeft">' + ui.icon('pin') +
            '<span class="branchButtonText"><strong>Выберите филиал</strong><span>Сейчас филиал не выбран</span></span></span>' +
            ui.icon('chevron') + '</button>');
    }
    if (p.role === 'store' && p.workplaceLabel && p.branches.length <= 1) {
      h += '<p class="workplacePin">' + ui.icon('pin') + esc(p.workplaceLabel) + '</p>';
    }

    h += '<section class="quickSection" aria-labelledby="mini-quick-actions">';
    h += '<h2 id="mini-quick-actions" class="quickLabel">БЫСТРЫЕ ДЕЙСТВИЯ</h2>';
    h += '<div class="quickGrid' + (isAgent ? ' quickGridSingle' : '') + '">';
    primary.forEach(function (a) {
      if (isAgent) {
        h +=
          '<button type="button" class="actionRowPrimary" data-testid="mini-action-' + esc(a.id) + '" data-action="' + esc(a.id) + '">' +
          '<span class="actionIconPrimary">' + actionIcon(a.id) + '</span>' +
          '<span>' + esc(a.label) + '</span>' +
          '<span class="actionRowChevron" aria-hidden="true">→</span>' +
          '</button>';
      } else {
        h +=
          '<button type="button" class="actionTile actionTilePrimary" data-testid="mini-action-' + esc(a.id) + '" data-action="' + esc(a.id) + '">' +
          '<span class="actionIconPrimary">' + actionIcon(a.id) + '</span>' +
          '<span>' + esc(a.label) + '</span>' +
          '</button>';
      }
    });
    secondary.forEach(function (a) {
      h +=
        '<button type="button" class="actionTile actionTileSecondary" data-testid="mini-action-' + esc(a.id) + '" data-action="' + esc(a.id) + '">' +
        '<span class="actionIconSecondary">' + actionIcon(a.id) + '</span>' +
        '<span>' + esc(a.label) + '</span>' +
        '</button>';
    });
    h += '</div></section>';

    h += '<nav class="listNav" aria-label="Дополнительные действия">';
    tertiary.forEach(function (a) {
      h +=
        '<button type="button" class="listNavItem" data-testid="mini-action-' + esc(a.id) + '" data-action="' + esc(a.id) + '">' +
        (a.id === 'invite_partner' ? ui.icon('link') : ui.icon('external')) +
        '<span>' + esc(a.label) + '</span>' +
        ui.icon('chevron') +
        '</button>';
    });
    h += '</nav>';
    return h;
  }

  RCMini.registerScreen('home', {
    testid: 'mini-app-home',
    render: renderHome,
    afterRender: function (root, c) {
      if (c.profile.workplaceForbidden) return;
      if (typeof RCMini.slots.bindHomeWallet === 'function') RCMini.slots.bindHomeWallet(root, c);
      root.querySelectorAll('[data-action]').forEach(function (b) {
        b.addEventListener('click', function () {
          dispatchAction(b.getAttribute('data-action'));
        });
      });
    }
  });

  /* branch-pick: MiniAppRoot.tsx, screen === "branch-pick".
   * params: { next?, nextParams?, purpose?, branchIds?: string[] }
   * После выбора: setBranch(id) и возврат к next (если он ниже по стеку — к нему, без дубля), иначе на главную. */
  var pickState = { switching: false, error: null };
  RCMini.registerScreen('branch-pick', {
    testid: 'mini-app-branch-pick',
    render: function (c, params) {
      var list = c.branches;
      var allow = params.branchIds;
      if (typeof allow === 'string') allow = allow.split(',');
      if (allow && allow.length) {
        list = list.filter(function (b) {
          return allow.indexOf(b.id) >= 0;
        });
      }
      var body = '';
      if (pickState.switching) body += '<p class="scanNotice">Обновление мини-кабинета…</p>';
      if (pickState.error) body += '<p class="scanBad" role="alert" data-testid="mini-branch-pick-error">' + esc(pickState.error) + '</p>';
      body += '<div class="branchSheet">';
      list.forEach(function (b) {
        body +=
          '<button type="button"' + (pickState.switching ? ' disabled' : '') +
          ' class="branchOption' + (b.id === c.branchId ? ' branchOptionActive' : '') + '"' +
          ' data-testid="mini-branch-option-' + esc(b.id) + '" data-branch="' + esc(b.id) + '">' +
          esc(b.label) + '</button>';
      });
      body += '</div>';
      /* Из потока (next ≠ home) возврат идёт на тот же экран — подпись «← Назад», с главной — как в рабочем коде. */
      var nested = params.next && params.next !== 'home';
      return ui.subpage({ title: 'Рабочая точка', backLabel: nested ? '← Назад' : undefined, body: body });
    },
    afterRender: function (root, c, params) {
      root.querySelectorAll('[data-branch]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var id = btn.getAttribute('data-branch');
          var next = params.next;
          var nextParams = params.nextParams || {};
          function done() {
            pickState.switching = false;
            pickState.error = null;
            if (next) RCMini.returnTo(next, nextParams);
            else RCMini.home();
          }
          if (id === c.branchId) {
            done();
            return;
          }
          pickState.error = null;
          pickState.switching = true;
          RCMini.rerender();
          setTimeout(function () {
            if (c.profile.branchSwitchError) {
              pickState.switching = false;
              pickState.error = 'Не удалось выбрать филиал. Точка полного кабинета не менялась — повторите выбор.';
              RCMini.rerender();
              return;
            }
            RCMini.setBranch(id);
            done();
          }, 450);
        });
      });
    },
    onBack: function () {
      pickState.switching = false;
      pickState.error = null;
      return false;
    }
  });
  RCMini.on('change', function () {
    pickState.switching = false;
    pickState.error = null;
  });
})();
