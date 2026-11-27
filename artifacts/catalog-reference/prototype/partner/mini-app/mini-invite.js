/* RemCard мини-кабинет · «Пригласить партнёра по ссылке».
 * Поведение — как в полном кабинете (PartnerLinkInvitePanel, PartnerDiscussionInvitePanel,
 * AgentDiscussionInviteResult); стиль — классы mini.css.
 * Экраны: invite (сразу мастер), invite-create (совместимый адрес мастера), invite-ready (готово).
 * Данные — только демонстрационные, состояние — RCMini.mem. Владелец: invite_builder. */
(() => {
  'use strict';

  const M = window.RCMini;
  if (!M) return;
  const { esc, icon, subpage } = M.ui;

  /* ---------- справочники ---------- */
  const CATEGORY_LABELS = {
    doors: 'Двери', tiles: 'Плитка', plumbing: 'Сантехника', electrical: 'Электротовары',
    flooring: 'Напольные покрытия', paint: 'Краска / ЛКМ', lighting: 'Освещение',
    handles: 'Фурнитура и замки', windows: 'Окна', construction: 'Стройматериалы и ремонт под ключ',
    heating: 'Водоснабжение и отопление', general: 'Общие условия',
    /* категории демо-профилей (demo-entities.md) */
    design: 'Дизайн интерьера', planning: 'Комплектация и планировка', finishing: 'Чистовая отделка', ceilings: 'Потолки'
  };
  const TYPE_LABELS = { AGENT: 'Агент', MASTER: 'Специалист', STORE: 'Магазин', COMPANY: 'Компания' };
  const TYPE_OPTIONS = ['AGENT', 'MASTER', 'STORE', 'COMPANY'];
  const DEFAULT_PERCENT = 10;
  const GENERAL_PERCENT = 10;
  const DISCUSSION_TTL_DAYS = 14;

  const TERMS_TEMPLATES = [
    { id: 'short', label: 'Коротко', text: (n) => `Здравствуйте, ${n}! Давайте рекомендовать товары и услуги друг друга и привлекать новых клиентов. Приглашаю к сотрудничеству в RemCard.` },
    { id: 'business', label: 'По-деловому', text: (n) => `Здравствуйте, ${n}! Предлагаем сотрудничество в RemCard: рекомендовать наши товары и услуги клиентам и развивать партнёрство. Посмотрите условия по ссылке и примите приглашение, если они вам подходят.` },
    { id: 'friendly', label: 'По-дружески', text: (n) => `Привет, ${n}! Давайте помогать друг другу находить новых клиентов. Приглашаю в RemCard: по ссылке можно посмотреть условия и принять приглашение.` }
  ];
  const DISCUSSION_TEMPLATES = [
    { id: 'short', label: 'Коротко', text: () => 'Здравствуйте! Предлагаю рекомендовать ваши товары или услуги своим клиентам и помогать вам увеличивать продажи. Присоединяйтесь в RemCard по ссылке: зарегистрируйтесь или войдите, чтобы обсудить условия сотрудничества.' },
    { id: 'business', label: 'По-деловому', text: () => 'Здравствуйте! Приглашаю к сотрудничеству в RemCard. Предлагаю рекомендовать ваши товары или услуги своим клиентам и помогать вам увеличивать продажи. Перейдите по ссылке и зарегистрируйтесь или войдите в существующий аккаунт. В кабинете сможем ознакомиться с предложениями и согласовать условия сотрудничества. Само приглашение не означает принятия условий.' },
    { id: 'friendly', label: 'По-дружески', text: () => 'Привет! Хочу рекомендовать твои товары или услуги своим клиентам и помогать тебе увеличивать продажи. Пройди регистрацию в RemCard по ссылке или войди, если аккаунт уже есть. Условия сотрудничества обсудим в кабинете.' },
    { id: 'custom', label: 'Свой текст', text: () => '' }
  ];

  /* Кто приглашает (сторона условий) — по demo-entities.md. Сотрудник создаёт ссылку от имени организации, категории — организации. */
  const ACTORS = {
    agent: { inviter: 'Алексей Романов', inviterType: 'AGENT', city: 'Краснодар', kinds: ['discussion'], categories: [], people: { owner: 'Алексей Романов' } },
    specialist: { inviter: 'Мария Орлова', inviterType: 'MASTER', city: 'Краснодар', kinds: ['terms'], categories: ['design', 'planning', 'finishing'], people: { owner: 'Мария Орлова' } },
    store: { inviter: 'Магазин «Маяк»', inviterType: 'STORE', city: 'Краснодар', kinds: ['terms'], categories: ['doors', 'flooring', 'lighting', 'handles'], people: { owner: 'Анна Петрова', staff: 'Денис Миронов', staff2: 'Алексей Иванов' }, org: true },
    company: { inviter: 'Компания «Формат»', inviterType: 'COMPANY', city: 'Краснодар', kinds: ['terms'], categories: ['doors', 'windows', 'construction', 'ceilings'], people: { owner: 'Алексей Смирнов', staff: 'Анна Волкова', staff2: 'Ирина Левина' }, org: true }
  };

  /* ---------- демо-данные (demo-entities.md §5) ---------- */
  const t = (category, percent, excluded) => ({ category, percent: excluded ? null : percent, excluded: !!excluded });
  const demoUrl = (slug) => `https://remcard.test/invite/${slug}`;
  M.data = M.data || {};
  M.data.invite = { categoryLabels: CATEGORY_LABELS, typeLabels: TYPE_LABELS, actors: ACTORS, termsTemplates: TERMS_TEMPLATES, discussionTemplates: DISCUSSION_TEMPLATES };

  /* ---------- сценарии ---------- */
  M.registerScenarios && M.registerScenarios('invite', [
    { id: 'invite-create-error', label: 'Сбой создания ссылки (повтор)' },
    { id: 'invite-no-clipboard', label: 'Буфер обмена недоступен' },
    { id: 'invite-no-categories', label: 'Нет категорий (общие 10%)' },
    { id: 'invite-no-type', label: 'Тип партнёра не задан' },
    { id: 'invite-staff', label: 'Сотрудник организации (магазин/компания)' }
  ], 'Приглашения');

  const sc = () => (M.scenario ? M.scenario('invite') : null);
  const actorOf = (ctx) => {
    const a = ACTORS[ctx.role] || ACTORS.specialist;
    const isStaff = !!a.org && sc() === 'invite-staff';
    return Object.assign({}, a, { key: isStaff ? 'staff' : 'owner', author: isStaff ? a.people.staff : a.people.owner, isStaff });
  };
  const resultKey = (ctx, id) => `invite:result:${ctx.role}:${id}`;
  const findRow = (ctx, id) => id ? M.mem.get(resultKey(ctx, id), null) : null;

  /* ---------- утилиты ---------- */
  const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  const pad = (n) => String(n).padStart(2, '0');
  /* Даты — по московскому времени, как в рабочем кабинете (не зависит от часового пояса устройства). */
  const TZ_FMT = (() => {
    try { return new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }); } catch (e) { return null; }
  })();
  const partsOf = (d) => {
    if (!TZ_FMT || !TZ_FMT.formatToParts) return { day: d.getDate(), month: d.getMonth() + 1, year: d.getFullYear(), hour: d.getHours(), minute: d.getMinutes() };
    const o = {};
    TZ_FMT.formatToParts(d).forEach((x) => { if (x.type !== 'literal') o[x.type] = Number(x.value); });
    return o;
  };
  const fmtDate = (iso, withTime = true) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const p = partsOf(d);
    const base = `${p.day} ${MONTHS[p.month - 1]}`;
    return withTime ? `${base}, ${pad(p.hour % 24)}:${pad(p.minute)}` : `${base} ${p.year}`;
  };
  const plural = (n, one, few, many) => {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  };
  const rid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
  const catLabel = (id) => CATEGORY_LABELS[id] || 'Категория';
  const pctText = (n) => `${String(n).replace('.', ',')}%`;
  const shareText = (row) => [row.note, row.url].join('\n\n');

  async function copyText(text) {
    if (sc() === 'invite-no-clipboard') return false;
    try {
      return !!(await M.ui.copy(text));
    } catch (e) {
      return false;
    }
  }

  /* ---------- мастер ---------- */
  let draft = null;
  /* Вид ссылки задаёт роль, как в ЛК: агент — без процентов, остальные — с условиями. Переключателя нет. */
  function newDraft(ctx) {
    const a = actorOf(ctx);
    return { key: `${ctx.role}|${sc() || ''}`, kind: a.kinds[0], step: 1, name: '', type: '', note: '', template: '', cats: {}, general: false,
      touched: false, errors: {}, error: '', busy: false, failedOnce: false, exitConfirm: false };
  }
  function getDraft(ctx) {
    const key = `${ctx.role}|${sc() || ''}`;
    if (!draft || draft.key !== key) draft = newDraft(ctx);
    return draft;
  }
  const isDirty = (d) => !!(d.name.trim() || d.type || d.note.trim() || Object.keys(d.cats).length || d.general);
  const createCats = (ctx) => {
    if (sc() === 'invite-no-categories') return [];
    return actorOf(ctx).categories;
  };
  const catState = (d, id) => d.cats[id] || { excluded: false, percent: String(DEFAULT_PERCENT) };
  const nameMax = (d) => (d.kind === 'terms' ? 80 : 120);
  const noteMax = (d) => (d.kind === 'terms' ? 400 : 500);
  const step1Ok = (d) => !!d.name.trim() && (d.kind !== 'terms' || !!d.type);
  const step2Ok = (d) => !!d.note.trim();

  function validateTerms(ctx, d) {
    const cats = createCats(ctx);
    if (!cats.length) return d.general ? '' : `Подтвердите общие условия: «${CATEGORY_LABELS.general}» — ${GENERAL_PERCENT}%`;
    const active = cats.filter((c) => !catState(d, c).excluded);
    if (!active.length) return 'Отметьте хотя бы одну категорию без исключения';
    for (const c of active) {
      const raw = String(catState(d, c).percent).trim().replace(',', '.');
      const n = Number(raw);
      if (raw === '' || !Number.isFinite(n) || n < 0 || n > 100) return 'Процент должен быть от 0 до 100';
    }
    return '';
  }

  function stepsHtml(d) {
    const names = ['Партнёр', 'Сообщение', 'Проверка'];
    return `<ol class="rcmi-steps" aria-label="Шаги">${names.map((n, i) => `<li class="${i + 1 === d.step ? 'is-current' : i + 1 < d.step ? 'is-done' : ''}"${i + 1 === d.step ? ' aria-current="step"' : ''}><span>${i + 1}</span>${n}</li>`).join('')}</ol>
      <p class="rcmi-eyebrow">Шаг ${d.step} из 3</p>`;
  }

  function step1(d) {
    const terms = d.kind === 'terms';
    return `<h2 class="rcmi-h2">Кого хотите пригласить?</h2>
      <p class="infoCardText">${terms ? 'Укажите, кому отправите ссылку на сотрудничество. Контакты пока не нужны.' : 'Укажите, кому отправите ссылку к обсуждению сотрудничества.'}</p>
      <label class="miniField"><span class="miniFieldLabel">Имя или название партнёра</span>
        <input class="readOnlyField rcmi-input" data-f="name" maxlength="${nameMax(d)}" value="${esc(d.name)}" placeholder="Например, «Дом материалов»" autocomplete="off" ${d.errors.name ? 'aria-invalid="true" aria-describedby="rcmi-e-name"' : ''}>
      </label>
      ${terms ? '' : '<p class="footnote">Название магазина, компании или имя. Контакты пока не нужны.</p>'}
      ${d.errors.name ? `<p class="rcmi-error" id="rcmi-e-name">${esc(d.errors.name)}</p>` : ''}
      ${terms ? `<label class="miniField"><span class="miniFieldLabel">Предполагаемый тип партнёра</span>
        <select class="miniSelect" data-f="type"><option value="">Выберите тип</option>${TYPE_OPTIONS.map((v) => `<option value="${v}" ${d.type === v ? 'selected' : ''}>${TYPE_LABELS[v]}</option>`).join('')}</select></label>` : ''}
      <button type="button" class="primaryBtn" data-wz="next" ${terms && !step1Ok(d) ? 'disabled' : ''}>Далее: сообщение</button>`;
  }

  function step2(d) {
    const terms = d.kind === 'terms';
    const list = terms ? TERMS_TEMPLATES : DISCUSSION_TEMPLATES;
    return `<h2 class="rcmi-h2">${terms ? 'Что напишем партнёру?' : 'Подготовьте приглашение'}</h2>
      ${terms ? '' : `<p class="infoCardText">Выберите, как пригласить «${esc(d.name.trim())}», или напишите по-своему. Ссылку создадите на следующем шаге.</p>`}
      <div class="rcmi-chips" role="group" aria-label="Шаблоны">${list.map((tp) => `<button type="button" class="rcmi-chip" data-tpl="${tp.id}" aria-pressed="${d.template === tp.id}">${tp.label}</button>`).join('')}</div>
      <label class="miniField"><span class="miniFieldLabel">Текст приглашения</span>
        <textarea class="readOnlyField rcmi-input rcmi-textarea" data-f="note" rows="6" maxlength="${noteMax(d)}" ${d.errors.note ? 'aria-invalid="true"' : ''}>${esc(d.note)}</textarea></label>
      <p class="footnote rcmi-counter"><span>${terms ? '' : 'Любой шаблон можно изменить. Условия сотрудничества согласуете отдельно.'}</span><span data-role="counter">${d.note.length} / ${noteMax(d)}</span></p>
      ${d.errors.note ? `<p class="rcmi-error">${esc(d.errors.note)}</p>` : ''}
      <button type="button" class="primaryBtn" data-wz="next" ${terms && !step2Ok(d) ? 'disabled' : ''}>Далее: проверить</button>`;
  }

  function reviewBlocks(d) {
    return `<div class="infoCard rcmi-review"><p class="fieldLabel">Кого приглашаете</p><p class="rcmi-strong">${esc(d.name.trim())}</p>
        ${d.kind === 'terms' ? `<p class="infoCardText">${esc(TYPE_LABELS[d.type] || '')}</p>` : ''}
        <button type="button" class="rcmi-link" data-wz="goto" data-step="1">Изменить имя партнёра</button></div>
      <div class="infoCard rcmi-review"><p class="fieldLabel">Пригласительное сообщение</p><p class="rcmi-note">${esc(d.note.trim())}</p>
        <button type="button" class="rcmi-link" data-wz="goto" data-step="2">Изменить сообщение</button></div>`;
  }

  function step3(ctx, d) {
    const busyLabel = d.busy ? 'Создаём…' : d.kind === 'terms' ? 'Создать приглашение' : 'Создать ссылку';
    const errorHtml = d.error ? `<p class="scanBad" role="alert">${esc(d.error)}</p>` : '';
    if (d.kind === 'discussion') {
      return `<h2 class="rcmi-h2">Проверьте приглашение</h2>
        <p class="infoCardText">Проверьте получателя и текст. Затем создайте ссылку — автоматической отправки нет.</p>
        ${reviewBlocks(d)}
        <p class="blockedPanel">Это приглашение к обсуждению. Сотрудничество начнётся только после согласования и принятия условий обеими сторонами.</p>
        ${errorHtml}
        <button type="button" class="primaryBtn" data-wz="create" ${d.busy ? 'disabled aria-busy="true"' : ''}>${busyLabel}</button>`;
    }
    const cats = createCats(ctx);
    let rowsHtml;
    let previewItems;
    if (!cats.length) {
      rowsHtml = `<p class="footnote">Категории не заполнены. Можно создать ссылку с «${CATEGORY_LABELS.general}» — ${GENERAL_PERCENT}%.</p>
        <div class="rcmi-cat"><div class="rcmi-row rcmi-row--between"><b>${CATEGORY_LABELS.general}</b><span>${GENERAL_PERCENT}%</span></div>
        <label class="rcmi-check"><input type="checkbox" data-general ${d.general ? 'checked' : ''}> Подтверждаю общие условия ${GENERAL_PERCENT}%</label></div>`;
      previewItems = [`${CATEGORY_LABELS.general}: ${GENERAL_PERCENT}%`];
    } else {
      rowsHtml = cats.map((c) => {
        const cs = catState(d, c);
        return `<div class="rcmi-cat${cs.excluded ? ' is-excluded' : ''}" data-cat="${c}">
          <div class="rcmi-row rcmi-row--between"><b>${esc(catLabel(c))}</b><label class="rcmi-check"><input type="checkbox" data-exclude ${cs.excluded ? 'checked' : ''}> Исключить</label></div>
          ${cs.excluded ? '<p class="footnote">Категория не войдёт в приглашение.</p>' : `<label class="rcmi-pct"><span class="miniFieldLabel">Общий процент по категории</span>
            <span class="rcmi-pctBox"><input class="readOnlyField rcmi-input" data-percent inputmode="decimal" maxlength="5" value="${esc(cs.percent)}" aria-label="Общий процент по категории «${esc(catLabel(c))}»">%</span></label>`}
        </div>`;
      }).join('');
      previewItems = cats.map((c) => {
        const cs = catState(d, c);
        return cs.excluded ? `${catLabel(c)}: исключено` : `${catLabel(c)}: ${pctText(String(cs.percent).trim() || '—')}`;
      });
    }
    const n = cats.length || 1;
    return `<h2 class="rcmi-h2">Проверьте приглашение</h2>
      ${reviewBlocks(d)}
      <p class="footnote">Создание ссылки не активирует сотрудничество автоматически. После входа партнёр увидит указанные условия и сможет принять их. Новая ссылка активна до первого принятия или отзыва; условия фиксируются при создании.</p>
      <details class="infoCard rcmi-details" open><summary>Условия сотрудничества · ${n} ${plural(n, 'направление', 'направления', 'направлений')}</summary>
        <p class="footnote">Общий процент по категории — это условие между вами и партнёром. При рекомендации клиенту часть идёт на скидку, остальное — ваше вознаграждение PROF.</p>
        <div class="rcmi-cats" data-role="cats">${rowsHtml}</div>
      </details>
      <div class="rcmi-preview"><p class="rcmi-panelTitle">Предпросмотр для получателя</p><ul data-role="preview">${previewItems.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
        <p class="footnote">Ссылка активна до принятия или отзыва.</p></div>
      ${d.validation ? `<p class="rcmi-error" role="alert">${esc(d.validation)}</p>` : ''}
      ${errorHtml}
      <button type="button" class="primaryBtn" data-wz="create" ${d.busy ? 'disabled aria-busy="true"' : ''}>${busyLabel}</button>`;
  }

  function renderCreate(ctx) {
    const d = getDraft(ctx);
    if (sc() === 'invite-no-type') {
      return subpage({ title: 'Пригласить партнёра по ссылке', body: '<p class="blockedPanel" role="alert">Укажите тип партнёра в профиле, чтобы создавать ссылки</p>' });
    }
    const a = actorOf(ctx);
    if (a.kinds.indexOf(d.kind) < 0) d.kind = a.kinds[0];
    let body = '';
    if (d.exitConfirm) {
      body += `<div class="rcmi-confirm" role="alertdialog" aria-labelledby="rcmi-ex"><p id="rcmi-ex"><b>Выйти без сохранения?</b> Введённые данные не сохранятся.</p>
        <div class="rcmi-row"><button type="button" class="secondaryBtn rcmi-sm" data-wz="exit-stay">Остаться</button><button type="button" class="primaryBtn rcmi-sm" data-wz="exit-go">Выйти</button></div></div>`;
    }
    body += stepsHtml(d);
    body += d.step === 1 ? step1(d) : d.step === 2 ? step2(d) : step3(ctx, d);
    return subpage({ title: 'Пригласить партнёра по ссылке', backLabel: d.step > 1 ? '← Назад' : undefined, body: `<div class="rcmi rcmi-wizard" data-testid="invite-wizard" data-kind="${d.kind}" data-step="${d.step}">${body}</div>` });
  }

  function previewList(ctx, d) {
    const cats = createCats(ctx);
    if (!cats.length) return [`${CATEGORY_LABELS.general}: ${GENERAL_PERCENT}%`];
    return cats.map((c) => {
      const cs = catState(d, c);
      return cs.excluded ? `${catLabel(c)}: исключено` : `${catLabel(c)}: ${pctText(String(cs.percent).trim() || '—')}`;
    });
  }

  function bindCreate(root, ctx) {
    const d = getDraft(ctx);
    const scope = root.querySelector('.rcmi-wizard');
    if (!scope) return;
    const nextBtn = () => scope.querySelector('[data-wz="next"]');
    scope.addEventListener('input', (e) => {
      const f = e.target.getAttribute('data-f');
      if (f === 'name') { d.name = e.target.value; d.errors.name = ''; }
      if (f === 'note') {
        d.note = e.target.value; d.errors.note = '';
        const c = scope.querySelector('[data-role="counter"]');
        if (c) c.textContent = `${d.note.length} / ${noteMax(d)}`;
      }
      if (e.target.hasAttribute('data-percent')) {
        const id = e.target.closest('[data-cat]').getAttribute('data-cat');
        d.cats[id] = Object.assign({}, catState(d, id), { percent: e.target.value });
        d.validation = '';
        const ul = scope.querySelector('[data-role="preview"]');
        if (ul) ul.innerHTML = previewList(ctx, d).map((x) => `<li>${esc(x)}</li>`).join('');
      }
      d.touched = true;
      if (d.kind === 'terms' && nextBtn()) nextBtn().disabled = d.step === 1 ? !step1Ok(d) : !step2Ok(d);
    });
    scope.addEventListener('change', (e) => {
      if (e.target.getAttribute('data-f') === 'type') {
        d.type = e.target.value;
        if (nextBtn()) nextBtn().disabled = !step1Ok(d);
      }
      if (e.target.hasAttribute('data-exclude')) {
        const id = e.target.closest('[data-cat]').getAttribute('data-cat');
        d.cats[id] = Object.assign({}, catState(d, id), { excluded: e.target.checked });
        d.validation = '';
        M.rerender();
      }
      if (e.target.hasAttribute('data-general')) { d.general = e.target.checked; d.validation = ''; M.rerender(); }
    });
    scope.addEventListener('click', (e) => {
      const tpl = e.target.closest('[data-tpl]');
      if (tpl) {
        const list = d.kind === 'terms' ? TERMS_TEMPLATES : DISCUSSION_TEMPLATES;
        const tp = list.find((x) => x.id === tpl.getAttribute('data-tpl'));
        d.template = tp.id;
        d.note = tp.text(d.name.trim()).slice(0, noteMax(d));
        d.errors.note = '';
        M.rerender();
        if (tp.id === 'custom') { const ta = root.querySelector('[data-f="note"]'); if (ta) ta.focus(); }
        return;
      }
      const el = e.target.closest('[data-wz]');
      if (!el || el.disabled) return;
      const act = el.getAttribute('data-wz');
      if (act === 'exit-stay') d.exitConfirm = false;
      else if (act === 'exit-go') { draft = null; M.back(); return; }
      else if (act === 'goto') { d.step = Number(el.getAttribute('data-step')); d.error = ''; d.validation = ''; M.rerender(); scrollTop(root); return; }
      else if (act === 'next') {
        if (d.step === 1) {
          if (!d.name.trim()) { d.errors.name = 'Укажите имя или название партнёра'; M.rerender(); return; }
          if (d.kind === 'terms' && !d.type) return;
          if (!d.note.trim()) {
            const list = d.kind === 'terms' ? TERMS_TEMPLATES : DISCUSSION_TEMPLATES;
            d.template = 'short';
            d.note = list[0].text(d.name.trim()).slice(0, noteMax(d));
          }
          d.step = 2;
        } else if (d.step === 2) {
          if (!d.note.trim()) { d.errors.note = 'Напишите текст приглашения'; M.rerender(); return; }
          d.step = 3;
        }
        M.rerender();
        scrollTop(root);
        return;
      } else if (act === 'create') { create(ctx, d); return; }
      M.rerender();
    });
  }
  const scrollTop = (root) => { root.scrollTop = 0; if (root.parentNode && root.parentNode.scrollTop) root.parentNode.scrollTop = 0; };

  function create(ctx, d) {
    if (d.busy) return;
    if (d.kind === 'terms') {
      const v = validateTerms(ctx, d);
      if (v) { d.validation = v; M.rerender(); return; }
    }
    d.busy = true; d.error = '';
    M.rerender();
    setTimeout(() => {
      if (draft !== d) return;
      d.busy = false;
      if (sc() === 'invite-create-error' && !d.failedOnce) {
        d.failedOnce = true;
        d.error = 'Не удалось создать ссылку';
        if (isCreateScreen(M.ctx().screen)) M.rerender();
        return;
      }
      const a = actorOf(ctx);
      const id = 'n' + rid();
      const now = new Date();
      const cats = createCats(ctx);
      const row = {
        id, kind: d.kind, recipientLabel: d.name.trim(), intendedPartnerType: d.kind === 'terms' ? d.type : null,
        note: d.note.trim(), url: demoUrl(rid() + rid()), createdBy: a.author, createdAt: now.toISOString(),
        expiresAt: d.kind === 'discussion' ? new Date(now.getTime() + DISCUSSION_TTL_DAYS * 864e5).toISOString() : null,
        terms: d.kind === 'terms'
          ? (cats.length ? cats.map((c) => { const cs = catState(d, c); return t(c, Number(String(cs.percent).replace(',', '.')), cs.excluded); }) : [t('general', GENERAL_PERCENT)])
          : null
      };
      M.mem.set(resultKey(ctx, id), row);
      draft = null;
      if (isCreateScreen(M.ctx().screen)) M.replace('invite-ready', { id });
    }, 600);
  }

  /* ---------- готовое приглашение ---------- */
  let readyState = { id: null, status: null, manual: false };
  function renderReady(ctx, params) {
    const row = findRow(ctx, params.id);
    if (readyState.id !== params.id) readyState = { id: params.id, status: null, manual: false };
    if (!row) {
      return subpage({ title: 'Приглашение недоступно', body: '<p class="blockedPanel">Ссылка не найдена. Создайте новое приглашение.</p>' });
    }
    const terms = row.kind === 'terms';
    const text = shareText(row);
    const body = `<div class="rcmi" data-testid="invite-ready">
      <div class="infoCard"><p class="rcmi-panelTitle">Пригласительное сообщение</p><p class="rcmi-note">${esc(row.note)}</p></div>
      ${terms ? `<details class="infoCard rcmi-details"><summary>Посмотреть условия приглашения</summary>
        <ul class="rcmi-plain">${(row.terms || []).map((x) => `<li>${esc(catLabel(x.category))}: ${x.excluded ? 'не участвует' : esc(pctText(x.percent))}</li>`).join('')}</ul>
        <p class="footnote">Условия зафиксированы на момент создания ссылки.</p></details>` : ''}
      <label class="miniField"><span class="fieldLabel">Ссылка</span><input class="readOnlyField" readonly value="${esc(row.url)}" data-select data-testid="invite-url"></label>
      <p class="footnote">${terms ? 'Активна до принятия или отзыва' : `Действует до ${esc(fmtDate(row.expiresAt, false))}`}</p>
      <button type="button" class="primaryBtn" data-act="copy-ready">${icon('copy')}<span>Скопировать приглашение</span></button>
      <p class="rcmi-status${readyState.status && readyState.status.bad ? ' rcmi-status--bad' : ''}" role="status" aria-live="polite">${readyState.status ? esc(readyState.status.text) : ''}</p>
      ${readyState.manual ? `<label class="miniField"><span class="fieldLabel">Готовый текст</span><textarea class="readOnlyField rcmi-textarea" readonly rows="7" data-select>${esc(text)}</textarea></label>` : ''}
      <p class="footnote">В прототипе ссылка демонстрационная. Сообщение автоматически не отправляется.</p>
      <a class="secondaryBtn" data-testid="mini-recipient-demo" href="../../invite/recipient.html${terms ? (row.intendedPartnerType === 'AGENT' ? '?mode=agent' : '') : '?mode=discussion'}" target="_blank" rel="noopener">Как это увидит партнёр</a>
      <details class="infoCard rcmi-details"><summary>Что будет после передачи приглашения</summary>
        <ol class="rcmi-plain rcmi-ol">
          <li><b>Партнёр зарегистрируется</b><br>После обычного входа или регистрации он вернётся к вашему приглашению.</li>
          ${terms
            ? '<li><b>Партнёр примет ваши условия</b><br>После входа партнёр увидит условия из приглашения и сможет принять их. Запросить изменение можно будет после принятия, в карточке партнёрства.</li>'
            : '<li><b>Вы согласуете условия</b><br>Само приглашение не активирует сотрудничество и не устанавливает проценты.</li>'}
        </ol></details>
    </div>`;
    return subpage({ title: 'Теперь передайте приглашение', lead: `Для «${row.recipientLabel}» всё подготовлено. Скопируйте текст и передайте знакомому.`, body });
  }
  function bindReady(root, ctx, params) {
    const scope = root.querySelector('.rcmi');
    if (!scope) return;
    scope.addEventListener('focusin', (e) => { if (e.target.matches && e.target.matches('[data-select]')) e.target.select(); });
    scope.addEventListener('click', async (e) => {
      const el = e.target.closest('[data-act="copy-ready"]');
      if (!el) return;
      const row = findRow(ctx, params.id);
      if (!row) return;
      const ok = await copyText(shareText(row));
      readyState.status = ok ? { text: 'Текст и ссылка скопированы' } : { text: 'Не удалось скопировать. Выделите текст и ссылку вручную.', bad: true };
      readyState.manual = !ok;
      M.rerender();
      if (!ok) { const ta = root.querySelector('textarea[data-select]'); if (ta) { ta.focus(); ta.select(); } }
    });
  }

  /* ---------- регистрация экранов ---------- */
  const isCreateScreen = (screen) => screen === 'invite' || screen === 'invite-create';
  const createScreen = {
    testid: 'mini-invite-create',
    render: (ctx) => renderCreate(ctx),
    afterRender: (root, ctx) => bindCreate(root, ctx),
    onBack: (ctx) => {
      const d = getDraft(ctx);
      if (d.busy) return true;
      if (d.step > 1) { d.step -= 1; d.error = ''; d.validation = ''; M.replace(ctx.screen); return true; }
      if (isDirty(d) && !d.exitConfirm) { d.exitConfirm = true; M.rerender(); return true; }
      draft = null;
      return false;
    }
  };
  M.registerScreen('invite', createScreen);
  M.registerScreen('invite-create', createScreen);
  const readyScreen = {
    testid: 'mini-invite-ready',
    render: (ctx, p) => renderReady(ctx, p),
    afterRender: (root, ctx, p) => bindReady(root, ctx, p)
  };
  M.registerScreen('invite-ready', readyScreen);
  M.registerScreen('invite-preview', readyScreen);
})();
