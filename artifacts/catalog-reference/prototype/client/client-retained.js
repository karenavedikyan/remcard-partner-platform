/* Retained client functions — demo-only; no server/API. */
(function () {
  const { esc, qs, qsa, go, icon, modal, closeModal, modalHead, toast, route, renderApp, D, state, activeProject, parseHash, dateRu, uid } = window.RC;
  const mem = window.RCDemoMem;
  const MAX_AVATAR = 512 * 1024;
  const protoNote = (t) => `<div class="retained-banner" role="note"><b>Демо.</b> ${esc(t)}</div>`;

  let avatarPending = null;
  let avatarSession = 0;
  let copyFallbackGen = 0;
  let retainedModalTicket = 0;
  let retainedFocusAnchor = null;

  function modalRoot() { return qs('#modal'); }
  function isInModal(el) {
    const root = modalRoot();
    return !!(el && root && root.contains(el));
  }

  function resolveLivePageOpener(from) {
    if (!from) return null;
    if (from.id === 'retained-cert-unified' || from.closest?.('#retained-cert-unified')) {
      return qs('#retained-cert-unified');
    }
    if (from.id === 'mm-share' || from.id === 'mm-project-save-info' || from.id === 'mm-save-cloud-menu' || from.closest?.('.toolgrid')) {
      const liteTools = qs('[data-n="lite-tools"]');
      if (liteTools) return liteTools;
      const menu = qs('[data-n="menu"]');
      if (menu) return menu;
    }
    if (from.matches?.('button[data-n="share"]') && isInModal(from)) {
      const liteTools = qs('[data-n="lite-tools"]');
      if (liteTools) return liteTools;
      return qs('#app [data-n="share"]');
    }
    if (isInModal(from) && parseHash().path.startsWith('/navigator')) {
      return qs('[data-n="lite-tools"]') || qs('[data-n="menu"]') || qs('#app [data-n="share"]');
    }
    if (isInModal(from) && parseHash().path.startsWith('/cert/')) {
      return qs('#retained-cert-unified');
    }
    return null;
  }

  function liveReturnFocus(candidate) {
    if (candidate && document.contains(candidate) && !isInModal(candidate)) {
      retainedFocusAnchor = candidate;
      return candidate;
    }
    const resolved = resolveLivePageOpener(candidate);
    if (resolved && document.contains(resolved) && !isInModal(resolved)) {
      retainedFocusAnchor = resolved;
      return resolved;
    }
    if (retainedFocusAnchor && document.contains(retainedFocusAnchor) && !isInModal(retainedFocusAnchor)) {
      return retainedFocusAnchor;
    }
    return null;
  }

  function copySuccessToast(label) {
    const l = String(label || '').toLowerCase();
    if (l.includes('ссылка')) return 'Ссылка скопирована';
    if (l.includes('код')) return 'Код скопирован';
    return 'Скопировано';
  }

  function invalidateRetainedModalListeners() {
    const root = qs('#modal');
    if (typeof root?._retainedModalTeardown === 'function') root._retainedModalTeardown();
    retainedModalTicket += 1;
    if (root) {
      root._retainedModalClose = null;
      root._retainedModalTeardown = null;
    }
  }

  function bindRetainedModalA11y(returnFocus) {
    const ticket = ++retainedModalTicket;
    const root = qs('#modal');
    const box = qs('.modal__box', root);
    const focusables = () => qsa('button, [href], input, select, textarea', box).filter((el) => !el.disabled);
    const teardown = () => {
      root.removeEventListener('keydown', onKey);
      root._retainedModalTeardown = null;
    };
    const closeRetained = () => {
      if (ticket !== retainedModalTicket) return;
      retainedModalTicket += 1;
      teardown();
      closeModal();
      const focusEl = liveReturnFocus(returnFocus);
      if (focusEl && typeof focusEl.focus === 'function') focusEl.focus();
    };
    const onKey = (e) => {
      if (ticket !== retainedModalTicket) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        closeRetained();
        return;
      }
      if (e.key === 'Tab' && box) {
        const nodes = focusables();
        if (nodes.length < 2) return;
        const idx = nodes.indexOf(document.activeElement);
        if (e.shiftKey && (idx <= 0)) { e.preventDefault(); nodes[nodes.length - 1].focus(); }
        else if (!e.shiftKey && idx === nodes.length - 1) { e.preventDefault(); nodes[0].focus(); }
      }
    };
    root.addEventListener('keydown', onKey);
    root._retainedModalTeardown = teardown;
    root._retainedModalClose = closeRetained;
    qsa('[data-close]', root).forEach((b) => { b.onclick = () => closeRetained(); });
    root.onclick = (e) => { if (e.target === root) closeRetained(); };
    const prefer = qs('#copy-fallback, #consent-ok, #sh-copy, [data-close], button, input, select', box);
    const focusEl = prefer || box;
    if (focusEl === box) box.tabIndex = -1;
    focusEl.focus();
  }

  function retainedModal(html, { onOpen, returnFocus } = {}) {
    invalidateRetainedModalListeners();
    const pageFocus = liveReturnFocus(returnFocus);
    modal(html, {
      onOpen(m) {
        if (onOpen) onOpen(m);
        bindRetainedModalA11y(pageFocus || returnFocus);
      },
    });
  }

  const LEGAL = {
    privacy: { title: 'Конфиденциальность', body: `<p>Пример структуры политики RemCard для ознакомления в прототипе. Это не юридический документ и не фиксирует согласие.</p><ul><li>Какие данные: профиль, маршрут, покупки — в демо-памяти браузера.</li><li>Зачем: вести маршрут, показывать скидки и баллы.</li><li>Передача партнёрам — только в рабочем сервисе; здесь данные никуда не уходят.</li></ul>` },
    terms: { title: 'Условия использования', body: `<p>Текст показывает, как может выглядеть раздел условий на сайте. Просмотр страницы в прототипе не означает принятие условий.</p><p>Скидки, баллы и сертификаты на стенде иллюстративны.</p>` },
    cookies: { title: 'Файлы cookie и аналитика', body: `<p>На этом стенде не добавляются новые cookie и не подключается сторонняя аналитика. Ниже — пример настроек для демонстрации интерфейса.</p>` },
  };

  function copyWithFallback(label, text, returnFocus) {
    const pageFocus = liveReturnFocus(returnFocus);
    const ticket = ++copyFallbackGen;
    const alive = () => ticket === copyFallbackGen;
    const manual = () => {
      if (!alive()) return;
      retainedModal(`${modalHead('Скопируйте вручную', label)}<label for="copy-fallback" class="small">Текст для копирования</label><input id="copy-fallback" class="copy-fallback" value="${esc(text)}" readonly><p class="xs muted">Выделите и скопируйте (Ctrl+C / ⌘C).</p><div class="modal__foot"><button class="btn btn--primary" data-close>Закрыть</button></div>`, {
        returnFocus: pageFocus || returnFocus,
        onOpen(m) {
          if (!alive()) { closeModal(); return; }
          const inp = qs('#copy-fallback', m);
          inp.select();
        },
      });
    };
    const clip = navigator.clipboard;
    if (clip && typeof clip.writeText === 'function') {
      return clip.writeText(text).then(() => { if (alive()) toast(copySuccessToast(label)); }).catch(() => { if (alive()) manual(); });
    }
    manual();
    return Promise.resolve(false);
  }

  function invalidateAvatarPending() {
    avatarPending += 1;
    avatarSession += 1;
  }

  function pageLegal({ doc }) {
    const L = LEGAL[doc] || LEGAL.privacy;
    const draft = doc === 'cookies' ? mem.beginCookieDraft() : null;
    const cookieUi = doc === 'cookies' ? `
      <form class="card" id="ck-form" style="margin-top:1rem;padding:.25rem 1rem" aria-label="Настройки cookie, демо">
        <div class="setrow"><div><b>Необходимые</b><small>Тема и сессия прототипа</small></div><span class="pill pill--green">Вкл.</span></div>
        <div class="setrow"><div><b id="ck-analytics-lbl">Аналитика</b><small>Статистика посещений</small></div><button class="sw ${draft.analytics ? 'is-on' : ''}" type="button" id="ck-analytics" role="switch" aria-checked="${draft.analytics}" aria-labelledby="ck-analytics-lbl"><i></i></button></div>
        <div class="setrow"><div><b id="ck-marketing-lbl">Маркетинг</b><small>Рассылки</small></div><button class="sw ${draft.marketing ? 'is-on' : ''}" type="button" id="ck-marketing" role="switch" aria-checked="${draft.marketing}" aria-labelledby="ck-marketing-lbl"><i></i></button></div>
        <div class="row" style="gap:.5rem;margin:.75rem 0"><button class="btn btn--primary btn--sm" type="button" id="ck-save">Сохранить</button><button class="btn btn--ghost btn--sm" type="button" id="ck-cancel">Отмена</button></div>
      </form>` : '';
    const legalXref = [
      doc !== 'privacy' ? '<a class="link small" href="#/legal/privacy">Конфиденциальность</a>' : '',
      doc !== 'terms' ? '<a class="link small" href="#/legal/terms">Условия</a>' : '',
      doc !== 'cookies' ? '<a class="link small" href="#/legal/cookies">Cookie</a>' : '',
    ].filter(Boolean).join('');
    return `<section class="section"><div class="wrap retained-doc">
      ${protoNote('Текст для просмотра, без правовых последствий.')}
      <a class="link link--ink small" href="#/">${icon('arrow-left')} На главную</a>
      <h2 style="margin-top:1rem">${esc(L.title)}</h2>
      <aside>${L.body}</aside>
      ${cookieUi}
      ${legalXref ? `<p class="small muted retained-legal-xref" style="margin-top:1.5rem;display:flex;gap:1rem;flex-wrap:wrap">${legalXref}</p>` : ''}
    </div></section>`;
  }

  function pageAbout() {
    return `<section class="section"><div class="wrap retained-doc">
      ${protoNote('Без вымышленных цифр.')}
      <h2>О RemCard</h2>
      <p class="lead">Сервис ведёт ремонт по шагам: оценка бюджета, навигатор с чек-листами и каталог проверенных партнёров.</p>
      <div class="card card--pad-lg" style="margin-top:1.25rem"><h3 style="margin:0 0 .5rem">Команда</h3><p class="small">Разработка клиентского сайта и кабинета партнёра. Состав и контакты публикуются на <a class="link" href="https://remcard.ru" rel="noopener">remcard.ru</a>.</p></div>
      <div class="row" style="gap:.5rem;margin-top:1.25rem"><a class="btn btn--ghost" href="#/contacts">Контакты</a></div>
    </div></section>`;
  }

  function pageContacts() {
    return `<section class="section"><div class="wrap retained-doc">
      ${protoNote('Сообщения не отправляются.')}
      <h2>Контакты</h2>
      <p>Общие каналы связи — на <a class="link" href="https://remcard.ru" rel="noopener">remcard.ru</a>.</p>
      <div class="card card--pad-lg stack" style="margin-top:1rem;max-width:28rem">
        <label for="ct-subj">Тема</label><input id="ct-subj" placeholder="Вопрос по навигатору">
        <label for="ct-msg">Сообщение</label><textarea id="ct-msg" rows="4" placeholder="Текст"></textarea>
        <button class="btn btn--primary" type="button" id="ct-send">${icon('send')} Проверить форму (демо)</button>
        <p class="xs muted" id="ct-note">Данные остаются в браузере.</p>
      </div>
    </div></section>`;
  }

  function retireVacanciesToHome() {
    try {
      const base = `${location.pathname || ""}${location.search || ""}`;
      history.replaceState(null, "", `${base}#/`);
    } catch (_) { /* ignore */ }
    go("#/");
  }

  function pageInstall() {
    return `<section class="section"><div class="wrap retained-doc">
      ${protoNote('В изолированном превью прототипа установка может быть недоступна — это нормально.')}
      <h2>Установить RemCard</h2>
      <p class="small">На боевом сайте ярлык можно добавить, если браузер предлагает установку веб-приложения. В этом прототипе (в т.ч. изолированное превью) пункта «Установить» может не быть — это ограничение среды, а не ошибка интерфейса.</p>
      <div class="card card--pad-lg stack" style="margin-top:1rem">
        <b>iPhone / iPad (Safari)</b><ol><li>Откройте сайт RemCard в Safari вне песочницы превью.</li><li>Если доступно: «Поделиться» → «На экран Домой».</li></ol>
        <b>Android (Chrome)</b><ol><li>Если в меню браузера есть «Установить приложение» или «На главный экран» — воспользуйтесь им.</li></ol>
        <b>Компьютер</b><ol><li>Если в адресной строке Chrome или Edge появится иконка установки — можно добавить ярлык.</li></ol>
      </div>
    </div></section>`;
  }

  function pagePrivacyCenter() {
    if (!window.RCMe || !window.RCMe.logged()) {
      return `<section class="section"><div class="wrap"><div class="empty"><p>Войдите, чтобы открыть центр приватности.</p><a class="btn btn--primary" href="#/login">Войти</a></div></div></section>`;
    }
    const c = mem.getConsents();
    const labels = { nav: ['Маршрут ремонта', 'Этапы, задачи, расходы'], buy: ['Покупки у партнёров', 'Суммы и баллы'], msg: ['Уведомления', 'Статусы заказов'], mkt: ['Рекомендации каталога', 'Подсказки по этапам'] };
    const log = mem.consentLog();
    const histRows = log.length
      ? log.slice().reverse().slice(0, 12).map((r) => `<div class="retained-consent-hist__row"><b>${esc(labels[r.consent]?.[0] || r.consent)}</b><small>${esc(r.action)} · ${esc(r.at.replace('T', ' ').slice(0, 16))}${r.note ? ` — ${esc(r.note)}` : ''}</small></div>`).join('')
      : '<p class="small muted retained-consent-hist__empty">История пуста в этой сессии.</p>';
    const body = `${protoNote('Изменения только в демо-памяти сессии.')}
      <div class="card" style="padding:.25rem 1rem">
        ${Object.keys(labels).map((id) => `<button type="button" class="setrow" data-consent="${id}" data-on="${c[id]}"><div><b>${esc(labels[id][0])}</b><small>${esc(labels[id][1])} · ${c[id] ? 'включено (демо)' : 'выключено'}</small></div>${icon('chevron-right')}</button>`).join('')}
      </div>
      <h3 class="me-h" style="margin-top:1.25rem">История в сессии</h3>
      <div class="card retained-consent-hist" style="padding:.5rem 1rem">${histRows}</div>
      <div class="row" style="margin-top:1rem"><button type="button" class="btn btn--ghost" id="priv-export">${icon('download')} Превью выгрузки</button></div>`;
    return window.RCMe.privacyPage(body);
  }

  function pageEnquiry({ id }) {
    if (!window.RCMe || !window.RCMe.logged()) {
      return `<section class="section"><div class="wrap"><div class="empty"><p>Войдите, чтобы читать переписку.</p><a class="btn btn--primary" href="#/login">Войти</a></div></div></section>`;
    }
    const data = mem.get().enquiries[id];
    const lead = window.RCMe.leadById(id);
    if (!data && !lead) {
      return window.RCMe.threadShell ? window.RCMe.threadShell('Обращение не найдено', '<div class="empty">Нет такого обращения. <a class="link" href="#/me/purchases?tab=leads">К списку</a></div>', null)
        : `<section class="section--tight"><div class="wrap"><div class="empty">Обращение не найдено.</div></section>`;
    }
    const thread = (data && data.thread) || [];
    const title = lead ? lead.what : 'Обращение';
    const partnerId = (data && data.partner) || (lead && lead.partner);
    const msgs = thread.map((m) => `<div class="retained-thread__msg retained-thread__msg--${m.side === 'partner' ? 'partner' : 'client'}">${esc(m.text)}<small>${m.side === 'partner' ? 'Партнёр' : 'Вы'} · ${esc(m.at.replace('T', ' '))}</small></div>`).join('');
    const body = `${protoNote('Ответы партнёра заданы заранее — не живой чат.')}
      <div class="retained-thread" data-enquiry-id="${esc(id)}">${msgs || '<p class="small muted">Сообщений нет.</p>'}</div>`;
    return window.RCMe.threadShell(title, body, partnerId);
  }

  function bindLegal(path) {
    if (path === '/legal/cookies') {
      const sync = () => {
        const d = mem.getCookieDraft();
        ['analytics', 'marketing'].forEach((key) => {
          const b = qs('#ck-' + key);
          if (!b) return;
          b.classList.toggle('is-on', !!d[key]);
          b.setAttribute('aria-checked', !!d[key]);
        });
      };
      sync();
      ['analytics', 'marketing'].forEach((key) => {
        const b = qs('#ck-' + key);
        if (!b) return;
        b.onclick = () => {
          const v = !b.classList.contains('is-on');
          mem.draftCookieToggle(key, v);
          sync();
        };
      });
      const save = qs('#ck-save');
      if (save) save.onclick = () => { mem.commitCookieDraft(); toast('Настройки cookie сохранены (демо)'); go('#/legal/cookies'); };
      const cancel = qs('#ck-cancel');
      if (cancel) cancel.onclick = () => { mem.discardCookieDraft(); renderApp(); };
    }
    if (path === '/contacts') {
      qs('#ct-send')?.addEventListener('click', () => {
        const subj = qs('#ct-subj').value.trim();
        toast(subj ? `Демо: «${subj}» не отправлено` : 'Демо: пустая форма не отправляется');
      });
    }
  }

  function consentHistoryHtml(id) {
    const rows = mem.consentLog().filter((x) => x.consent === id).slice(-5).reverse();
    if (!rows.length) return '<p class="small muted">История пуста в этой сессии.</p>';
    return `<ul class="small" style="margin:.5rem 0;padding-left:1.1rem">${rows.map((r) => `<li>${esc(r.action)} · ${esc(r.at.replace('T', ' ').slice(0, 16))}${r.note ? ` — ${esc(r.note)}` : ''}</li>`).join('')}</ul>`;
  }

  function bindPrivacy() {
    qsa('[data-consent]').forEach((b) => {
      b.onclick = () => {
        const id = b.dataset.consent;
        const cur = mem.getConsents()[id];
        const title = b.querySelector('b').textContent;
        retainedModal(`${modalHead('Согласие (демо)', title)}<p class="small">Сейчас: ${cur ? 'включено' : 'выключено'}. Изменение только после подтверждения.</p><h4 class="small" style="margin:.75rem 0 .35rem">История по этому согласию</h4>${consentHistoryHtml(id)}<div class="modal__foot"><button class="btn btn--ghost" data-close>Закрыть</button><button class="btn btn--primary" id="consent-ok">Подтвердить ${cur ? 'отключение' : 'включение'}</button></div>`, {
          returnFocus: b,
          onOpen(m) {
            qs('#consent-ok', m).onclick = () => {
              const end = () => { (m._retainedModalClose || closeModal)(); };
              if (parseHash().path !== '/me/privacy' || !window.RCMe?.logged()) { end(); return; }
              const now = mem.getConsents()[id];
              if (now !== cur) { end(); renderApp(); return; }
              mem.setConsent(id, !cur, 'Подтверждено в прототипе');
              end();
              renderApp();
            };
          },
        });
      };
    });
    qs('#priv-export')?.addEventListener('click', (ev) => {
      retainedModal(`${modalHead('Превью выгрузки')}<pre class="small" style="white-space:pre-wrap;max-height:220px;overflow:auto;background:var(--surface);padding:.75rem;border-radius:var(--r-md)">${esc(JSON.stringify({ demo: true, consents: mem.getConsents(), consentLog: mem.consentLog() }, null, 2))}</pre><div class="modal__foot"><button class="btn btn--primary" data-close>Закрыть</button></div>`, { returnFocus: ev.currentTarget });
    });
  }

  function validateAvatar(file) {
    if (!file) return 'Файл не выбран';
    if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) return 'Допустимы JPEG, PNG или WebP';
    if (file.size > MAX_AVATAR) return 'До 512 КБ';
    return null;
  }

  function decodeImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
      reader.onload = () => {
        const url = reader.result;
        const img = new Image();
        img.onerror = () => reject(new Error('Файл не является изображением'));
        img.onload = () => resolve(url);
        img.src = url;
      };
      reader.readAsDataURL(file);
    });
  }

  function bindProfileAvatar() {
    const pick = qs('#retained-avatar-pick');
    const inp = qs('#retained-avatar-file');
    const reset = qs('#retained-avatar-reset');
    if (!pick || !inp) return;
    const snap = () => ({ path: parseHash().path, logged: window.RCMe && window.RCMe.logged(), gen: mem.avatarGen(), session: avatarSession });
    pick.onclick = () => inp.click();
    inp.onchange = async () => {
      const file = inp.files && inp.files[0];
      inp.value = '';
      const err = validateAvatar(file);
      if (err) { toast(err); return; }
      const before = snap();
      const pendingId = ++avatarPending;
      try {
        const url = await decodeImage(file);
        if (pendingId !== avatarPending) return;
        if (!document.contains(inp)) return;
        const after = snap();
        if (!after.logged || after.path !== '/me/profile') return;
        if (after.session !== before.session || after.gen !== before.gen) return;
        mem.setAvatar(url);
        toast('Фото обновлено локально');
        renderApp();
      } catch (e) {
        if (pendingId === avatarPending && window.RCMe?.logged() && parseHash().path === '/me/profile') toast(e.message || 'Ошибка изображения');
      }
    };
    if (reset) reset.onclick = () => {
      if (!window.RCMe?.logged()) return;
      mem.clearAvatar();
      toast('Снова инициалы');
      renderApp();
    };
  }

  function enhanceHeaderAvatar() {
    const url = mem.getAvatar();
    if (!url || !window.RCMe?.logged()) return;
    const h = qs('.hdr-ava span');
    if (h) h.outerHTML = `<img src="${url}" alt="">`;
  }

  function demoBranches(partnerId) {
    const i = (window.RCCatalogData && window.RCCatalogData.partnerInfo && window.RCCatalogData.partnerInfo[partnerId]) || {};
    const p = D.partners.find((x) => x.id === partnerId);
    const base = i.addr || (p && p.city) || 'Адрес уточняется';
    const list = [{ id: 'main', title: 'Основной', addr: base }];
    if (p && p.kind === 'store') list.push({ id: 'sec', title: 'Склад-выдача', addr: `${p.city}, ул. Демонстрационная, 1` });
    return list;
  }

  function injectPartnerBranches(params) {
    const path = parseHash().path;
    const m = /^\/catalog\/([^/]+)$/.exec(path);
    if (!m || ['p', 's', 'kit', 'list'].includes(m[1])) return;
    const id = params.id || m[1];
    const p = D.partners.find((x) => x.id === id);
    const pside = qs('.pside');
    if (!pside || qs('#retained-branches')) return;
    const branches = demoBranches(id);
    const sel = mem.branchKey(id) || branches[0].id;
    pside.insertAdjacentHTML('beforeend', `<div class="card retained-branch-card" id="retained-branches"><label for="retained-branch-sel">Филиал / адрес</label><select id="retained-branch-sel">${branches.map((b) => `<option value="${esc(b.id)}" ${b.id === sel ? 'selected' : ''}>${esc(b.title)} — ${esc(b.addr)}</option>`).join('')}</select>
      <button type="button" class="btn btn--ghost btn--sm btn--block" id="retained-branch-demo" style="margin-top:.5rem">${icon('send')} Демо-запрос в филиал</button><p class="xs muted">Запрос не уходит партнёру.</p></div>`);
    const s = qs('#retained-branch-sel');
    if (s) s.onchange = () => mem.setBranch(id, s.value);
    const demo = qs('#retained-branch-demo');
    if (demo) demo.onclick = () => {
      const b = branches.find((x) => x.id === s.value);
      retainedModal(`${modalHead('Демо-обращение', esc(p?.name || ''))}<p class="small">Филиал: ${esc(b?.addr || '')}. Без отправки.</p><div class="modal__foot"><button class="btn btn--ghost" data-close>Отмена</button><button class="btn btn--primary" data-close>Зафиксировать (демо)</button></div>`, { returnFocus: demo });
    };
    const contact = qs('#d-contact');
    if (contact) contact.onclick = (e) => { e.preventDefault(); demo?.click(); };
  }

  function injectConciergeHistory() {
    if (parseHash().path !== '/concierge') return;
    const wrap = qs('.concierge');
    if (!wrap || qs('#retained-concierge-log')) return;
    const rows = mem.get().conciergeLog.map((r) => {
      const st = { new: 'Новая', cancelled: 'Отменена', done: 'Завершена', in_progress: 'В работе' }[r.status] || r.status;
      return `<div class="evt retained-conc-row"><div class="grow"><b class="ink">${esc(r.what)}</b><small>${dateRu(r.date)} · ${esc(st)}</small></div>
        ${r.status === 'new' ? `<button type="button" class="iconb" data-conc-cancel="${r.id}" aria-label="Отменить заявку">${icon('more-horizontal')}</button>` : ''}</div>`;
    }).join('');
    wrap.insertAdjacentHTML('beforeend', `<div class="card card--pad-lg" id="retained-concierge-log" style="margin-top:1.5rem"><h3>Мои заявки (демо)</h3>${protoNote('Отмена — только заявки «Новая». Список выше — отдельные демо-записи, не заявки из навигатора.')}
      <div class="stack" style="gap:.5rem;margin-top:.75rem">${rows}</div></div>`);
    qsa('[data-conc-cancel]').forEach((b) => b.onclick = () => {
      const id = b.dataset.concCancel;
      const row = mem.get().conciergeLog.find((x) => x.id === id);
      if (!row || row.status !== 'new') { toast('Нельзя отменить'); return; }
      retainedModal(`${modalHead('Отменить заявку?')}<div class="modal__foot"><button class="btn btn--ghost" data-close>Нет</button><button class="btn btn--primary" id="conc-cancel-ok">Отменить</button></div>`, {
        returnFocus: b,
        onOpen(m) {
          qs('#conc-cancel-ok', m).onclick = () => {
            const live = mem.get().conciergeLog.find((x) => x.id === id);
            if (!live || live.status !== 'new') { closeModal(); toast('Заявка уже не «Новая»'); return; }
            mem.cancelConcierge(id);
            closeModal();
            toast('Отменено (демо)');
            renderApp();
          };
        },
      });
    });
    const send = qs('#cn-send');
    if (send && !send.dataset.retainedBound) {
      send.dataset.retainedBound = '1';
      send.onclick = () => {
        const comment = qs('#cn-comment')?.value?.trim();
        if (!comment) { toast('Добавьте комментарий'); return; }
        const what = qs('#cn-what .chip.is-on')?.dataset.what || 'Заявка';
        mem.addConcierge({ id: 'cq' + Date.now(), date: new Date().toISOString(), what, status: 'new', text: comment });
        toast('Добавлено в демо-список — не отправлено');
        renderApp();
      };
    }
  }

  function bindReferral() {
    const btn = qs('#retained-ref-copy');
    if (!btn || btn.dataset.bound) return;
    btn.dataset.bound = '1';
    const link = 'https://remcard.ru/i/demo-ref';
    btn.onclick = () => copyWithFallback('Ссылка', link, btn);
  }

  function openSaveCloudModal(_expectedPid, returnFocus) {
    retainedModal(
      `${modalHead('О сохранении проекта', 'Как работает этот предпросмотр')}
      <div class="stack" style="gap:.65rem">
        <p class="small" style="margin:0;line-height:1.45">Изменения в маршруте остаются в этом окне браузера, пока вы на странице предпросмотра.</p>
        <p class="small" style="margin:0;line-height:1.45">Прототип не отправляет проект в аккаунт и не записывает данные на сервер. Вход в кабинет в этой сборке не включает облачную синхронизацию.</p>
        <p class="small" style="margin:0;line-height:1.45">После полной перезагрузки страницы прогресс может пропасть: здесь используется временная демо-память, а не постоянное хранилище.</p>
        <p class="xs muted" style="margin:0;line-height:1.4">Списки проектов, черновики и расчёты на других экранах прототипа доступны как раньше, со своими правилами доступа.</p>
      </div>
      <div class="modal__foot"><button type="button" class="btn btn--primary" data-close style="min-height:2.75rem">Понятно</button></div>`,
      { returnFocus }
    );
  }

  function mountSaveCloudCard() {
    qs('#retained-save-cloud')?.remove();
    qs('.retained-save-card')?.remove();
  }

  function injectNavigatorExtras() {
    if (!parseHash().path.startsWith('/navigator')) return;
    mountSaveCloudCard();
    wrapNavigatorShare();
  }

  function wrapNavigatorShare() {
    const app = qs('#app');
    if (!app || !parseHash().path.startsWith('/navigator')) return;
    let navClick = app.onclick;
    if (typeof navClick !== 'function') return;
    while (navClick.__retainedShareWrap) navClick = navClick.__retainedNavClick;
    const wrapped = (ev) => {
      if (ev.target.closest('[data-n="share"]')) {
        ev.preventDefault();
        ev.stopPropagation();
        retainedShareModal(activeProject(), ev.target.closest('[data-n="share"]'));
        return;
      }
      return navClick.call(app, ev);
    };
    wrapped.__retainedShareWrap = true;
    wrapped.__retainedNavClick = navClick;
    app.onclick = wrapped;
  }

  function injectProjectMenuMobileSave() {
    const box = qs('#modal.is-open .modal__box');
    if (!box || !qs('#mm-share', box) || qs('#mm-project-save-info', box)) return;
    if (!parseHash().path.startsWith('/navigator')) return;
    const anchor = qs('#mm-projects', box) || qs('#mm-share', box);
    anchor.insertAdjacentHTML(
      'afterend',
      `<button type="button" class="menu-modal__row" id="mm-project-save-info" data-testid="mm-project-save-info">${icon('info', 'menu-modal__ico')}<span class="menu-modal__label">О сохранении проекта</span></button>`
    );
  }

  function ensureNavigatorModalHooks() {
    const root = qs('#modal');
    if (!root || root.dataset.retainedNavModalHooks) return;
    root.dataset.retainedNavModalHooks = '1';
    root.addEventListener('click', (ev) => {
      const saveBtn = ev.target.closest('#mm-project-save-info');
      if (saveBtn) {
        ev.preventDefault();
        ev.stopImmediatePropagation();
        closeModal();
        openSaveCloudModal(null, liveReturnFocus(qs('[data-n="menu"]')) || saveBtn);
        return;
      }
      const toolsShare = ev.target.closest('button[data-n="share"]');
      if (toolsShare) {
        ev.preventDefault();
        ev.stopImmediatePropagation();
        const p = activeProject();
        if (p) retainedShareModal(p, liveReturnFocus(qs('[data-n="lite-tools"]')) || toolsShare);
        return;
      }
      const shareBtn = ev.target.closest('#mm-share');
      if (!shareBtn) return;
      ev.preventDefault();
      ev.stopImmediatePropagation();
      const p = activeProject();
      if (p) retainedShareModal(p, liveReturnFocus(qs('[data-n="menu"]')) || shareBtn);
    }, true);
    if (typeof MutationObserver === 'function') {
      const obs = new MutationObserver(() => injectProjectMenuMobileSave());
      obs.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    }
  }

  function shareContext(pid) {
    const cur = activeProject();
    if (!cur || cur.id !== pid || cur.shared) return null;
    if (!window.RCMe?.logged()) return null;
    return { pid, project: cur };
  }

  function retainedShareModal(p, returnFocus) {
    if (!p) return;
    const ctx0 = shareContext(p.id);
    if (!ctx0) { toast(p.shared ? 'Режим просмотра — ссылкой нельзя поделиться' : 'Нет активного проекта'); return; }
    const modalPid = p.id;
    const pageAnchor = liveReturnFocus(returnFocus);
    const open = () => {
      const ctx = shareContext(modalPid);
      if (!ctx) return;
      const sh = mem.shareState(modalPid) || mem.ensureShare(modalPid, 14);
      if (sh.projectId && sh.projectId !== modalPid) return;
      const revoked = sh.revoked;
      const link = mem.shareLink(modalPid);
      const exp = sh.expires ? new Date(sh.expires).toLocaleDateString('ru-RU') : '';
      retainedModal(`${modalHead('Поделиться маршрутом', revoked ? 'Ссылка отозвана' : `До ${esc(exp)}`)}
        <p class="small">Просмотр без права менять прогресс. Отзыв не сбрасывает ваши отметки.</p>
        <label for="sh-expiry">Срок ссылки, дней</label>
        <select id="sh-expiry" ${revoked ? 'disabled' : ''}><option value="7">7</option><option value="14" selected>14</option><option value="30">30</option></select>
        <div class="row" style="margin-top:.75rem"><input id="sh-link" value="${link ? esc(link) : ''}" readonly aria-label="Ссылка" placeholder="${revoked ? 'Отозвана' : ''}" ${revoked ? 'disabled' : ''}><button class="btn btn--dark" type="button" id="sh-copy" ${revoked ? 'disabled' : ''}>Копировать</button></div>
        <div class="modal__foot">
          <button class="btn btn--ghost" type="button" id="sh-preview">${icon('eye')} Как гость</button>
          <button class="btn btn--ghost" type="button" id="sh-revoke" ${revoked ? 'disabled' : ''}>Отозвать</button>
          <button class="btn btn--primary" type="button" id="sh-new" ${revoked ? '' : 'hidden'}>Новая ссылка</button>
          <button class="btn btn--primary" data-close>Готово</button>
        </div>`, {
        returnFocus: pageAnchor || returnFocus,
        onOpen(m) {
          const expSel = qs('#sh-expiry', m);
          if (expSel && sh.expiryDays) expSel.value = String(sh.expiryDays);
          expSel?.addEventListener('change', () => {
            if (!shareContext(modalPid) || revoked) return;
            mem.setShareExpiry(modalPid, +expSel.value);
            if (!shareContext(modalPid)) return;
            const linkEl = qs('#sh-link', m);
            if (linkEl) linkEl.value = mem.shareLink(modalPid) || '';
          });
          qs('#sh-copy', m)?.addEventListener('click', () => {
            if (!shareContext(modalPid)) return;
            const l = mem.shareLink(modalPid);
            if (!l) { toast('Ссылка отозвана'); return; }
            copyWithFallback('Ссылка', l, pageAnchor || returnFocus);
          });
          qs('#sh-preview', m)?.addEventListener('click', () => {
            if (!shareContext(modalPid)) return;
            const l = mem.shareLink(modalPid);
            const previewBtn = qs('#sh-preview', m);
            retainedModal(`${modalHead('Просмотр гостем')}<p class="small">Демо: откройте скопированную ссылку в другой вкладке. Режим «только просмотр» не переключает ваш маршрут и не меняет токен ссылки.</p>${l ? `<input class="copy-fallback" readonly value="${esc(l)}">` : '<p class="small muted">Сначала создайте или восстановите ссылку.</p>'}<div class="modal__foot"><button class="btn btn--ghost" data-close>Закрыть</button>${l ? '<button class="btn btn--primary" type="button" id="sh-preview-copy">Копировать ссылку</button>' : ''}</div>`, {
              returnFocus: pageAnchor || returnFocus,
              onOpen(m2) {
                qs('#sh-preview-copy', m2)?.addEventListener('click', () => {
                  if (!shareContext(modalPid)) return;
                  copyWithFallback('Ссылка', l, pageAnchor || returnFocus);
                });
              },
            });
          });
          qs('#sh-revoke', m)?.addEventListener('click', () => {
            if (!shareContext(modalPid)) return;
            const revokeBtn = qs('#sh-revoke', m);
            retainedModal(`${modalHead('Отозвать доступ?')}<div class="modal__foot"><button class="btn btn--ghost" data-close>Отмена</button><button class="btn btn--primary" id="sh-revoke-ok">Отозвать</button></div>`, {
              returnFocus: pageAnchor || returnFocus,
              onOpen(m2) {
                qs('#sh-revoke-ok', m2).onclick = () => {
                  if (!shareContext(modalPid)) { m2._retainedModalClose?.(); toast('Проект сменился'); return; }
                  mem.revokeShare(modalPid);
                  m2._retainedModalClose?.();
                  open();
                };
              },
            });
          });
          qs('#sh-new', m)?.addEventListener('click', () => {
            if (!shareContext(modalPid)) return;
            const days = +(qs('#sh-expiry', m)?.value || 14);
            mem.regenerateShare(modalPid, days);
            if (!shareContext(modalPid)) return;
            open();
          });
        },
      });
    };
    open();
  }

  function certVisualRoot(root) {
    return qs('.cf-card, .cf-coupon, article.cf-sheet, .cf-now', root);
  }

  function stripCertCloneInteractivity(el) {
    if (!el) return;
    qsa('[id]', el).forEach((n) => n.removeAttribute('id'));
    qsa('button, [role="button"]', el).forEach((n) => n.remove());
    qsa('[data-ct], [data-cf], .cf-ct, .cf-copy', el).forEach((n) => n.remove());
    qsa('input, select, textarea', el).forEach((n) => n.remove());
    qsa('.cf-tools, .cf-groups, .cf-more, .cf-allbtn, .cf-p__foot, .now-btn, .now-row', el).forEach((n) => n.remove());
    qsa('a.btn, a.cf-p__open, a.cf-d__link', el).forEach((n) => n.remove());
  }

  function certPrintableHtml(root) {
    const visual = certVisualRoot(root);
  if (!visual) return '';
    const wrap = document.createElement('div');
    wrap.className = 'retained-print-clone';
    const clone = visual.cloneNode(true);
    stripCertCloneInteractivity(clone);
    wrap.appendChild(clone);
    const cond = qs('.cf-cond', root);
    if (cond) {
      const c2 = cond.cloneNode(true);
      stripCertCloneInteractivity(c2);
      wrap.appendChild(c2);
    }
    return wrap.outerHTML;
  }

  function hideCertDupActions(root) {
    qsa('.cf-actions [data-cf="pdf"], .cf-actions [data-cf="share"]', root).forEach((b) => { b.hidden = true; });
    qsa('.cf-now .now-btn', root).forEach((b) => {
      if (/pdf|поделиться/i.test(b.textContent || '')) b.hidden = true;
    });
  }

  function enhanceCertPage() {
    const path = parseHash().path;
    if (!path.startsWith('/cert/') || path === '/cert') return;
    const root = qs('.cf');
    if (!root || qs('#retained-cert-unified', root)) return;
    root.classList.add('retained-cert--unified');
    const host = qs('.cf-proto', root) || root;
    host.insertAdjacentHTML('beforeend', `<div class="retained-cert-unified-wrap"><button type="button" class="btn btn--dark btn--sm" id="retained-cert-unified">${icon('share')} Скачать / Поделиться</button></div>`);
    if (!qs('#retained-cert-printable', root)) {
      root.insertAdjacentHTML('beforeend', `<div class="retained-print-fallback" id="retained-cert-printable" aria-live="polite"></div>`);
    }
    hideCertDupActions(root);
    const certPath = path;
    qs('#retained-cert-unified').onclick = (ev) => {
      if (parseHash().path !== certPath) return;
      const certBtn = ev.currentTarget;
      const codeEl = root.querySelector('.cf-code b, .now-code');
      const code = codeEl?.textContent?.trim() || root.dataset.code || certPath.split('/').pop();
      const url = location.href;
      retainedModal(`${modalHead('Скачать / Поделиться')}
        <div class="stack" style="gap:.5rem">
          <button type="button" class="btn btn--ghost" id="cert-m-copy">${icon('copy')} Скопировать код</button>
          <button type="button" class="btn btn--ghost" id="cert-m-link">${icon('link')} Скопировать ссылку</button>
          <button type="button" class="btn btn--primary" id="cert-m-print">${icon('download')} Показать для печати</button>
        </div>
        <p class="xs muted">PDF на сервере не формируется — используйте печать браузера (Ctrl+P / ⌘P) по блоку ниже или копирование.</p>`, {
        returnFocus: certBtn,
        onOpen(m) {
          qs('#cert-m-copy', m).onclick = () => copyWithFallback('Код', code, certBtn);
          qs('#cert-m-link', m).onclick = () => copyWithFallback('Ссылка', url, certBtn);
          qs('#cert-m-print', m).onclick = () => {
            if (parseHash().path !== certPath) return;
            const box = qs('#retained-cert-printable', root);
            const html = certPrintableHtml(root);
            if (box && html) {
              box.innerHTML = html;
              box.classList.add('is-on');
              box.scrollIntoView({ block: 'nearest' });
            }
            m._retainedModalClose?.();
          };
        },
      });
    };
  }

  route('/legal/privacy', () => pageLegal({ doc: 'privacy' }));
  route('/legal/terms', () => pageLegal({ doc: 'terms' }));
  route('/legal/cookies', () => pageLegal({ doc: 'cookies' }));
  route('/about', pageAbout);
  route('/contacts', pageContacts);
  route('/vacancies', () => { retireVacanciesToHome(); return ''; });
  route('/install', pageInstall);
  route('/me/privacy', pagePrivacyCenter);
  route('/me/enquiry/:id', pageEnquiry);
  route('/me/enquiry/l1', () => pageEnquiry({ id: 'l1' }));
  route('/me/enquiry/l2', () => pageEnquiry({ id: 'l2' }));
  route('/me/enquiry/l3', () => pageEnquiry({ id: 'l3' }));

  let retainedLastPath = '';

  ensureNavigatorModalHooks();

  document.addEventListener('rc:rendered', (e) => {
    const { path, params } = e.detail;
    if (retainedLastPath === '/legal/cookies' && path !== '/legal/cookies') mem.discardCookieDraft();
    if (path !== '/me/profile' || !(window.RCMe && window.RCMe.logged())) invalidateAvatarPending();
    if (path !== retainedLastPath) {
      copyFallbackGen += 1;
      retainedFocusAnchor = null;
      const mod = qs('#modal');
      if (mod?.classList.contains('is-open')) {
        invalidateRetainedModalListeners();
        closeModal();
      }
    }
    retainedLastPath = path;
    if (path.startsWith('/legal') || path === '/contacts') bindLegal(path);
    if (path === '/me/privacy') bindPrivacy();
    if (path === '/me/profile') bindProfileAvatar();
    if (path === '/me') bindReferral();
    enhanceHeaderAvatar();
    if (path.startsWith('/catalog/')) injectPartnerBranches(params);
    injectConciergeHistory();
    injectNavigatorExtras();
    if (path.startsWith('/navigator')) injectProjectMenuMobileSave();
    enhanceCertPage();
  });

  window.RCRetained = { retainedShareModal, openSaveCloudModal, validateAvatar, invalidateAvatarPending, mem, copyWithFallback, certVisualRoot, certPrintableHtml, wrapNavigatorShare };
})();
