const inboxes = new Map();
const channels = {max:"MAX", telegram:"Telegram"};
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
const amountLabel = (amount) => `${(amount / 100).toLocaleString("ru-RU")} ₽`;

export const payoutNoticeAccount = (role, employer) => role === "employee" ? `employee/${employer || "unlinked"}` : role;
export const payoutCounterpartyAccount = (account, id) => `demo-partner/${account}/${id}`;

function inbox(account) {
  if (!inboxes.has(account)) inboxes.set(account, {channel:account.startsWith("demo-partner/") ? "max" : "", events:[]});
  return inboxes.get(account);
}

export function addPayoutNotice(account, event) {
  const box = inbox(account);
  box.events.unshift({...event, channel:box.channel, unread:true});
  if (box.events.length > 50) box.events.pop();
}

export function setPayoutNoticeChannel(account, channel) {
  if (channel === "" || Object.hasOwn(channels, channel)) inbox(account).channel = channel;
}

export const payoutNoticeUnread = (account) => inbox(account).events.filter((event) => event.unread).length;
export const hasPayoutNotices = (account) => inbox(account).events.length > 0;

export function readPayoutNotices(account) {
  for (const event of inbox(account).events) event.unread = false;
}

export function renderPayoutNoticeSettings(account) {
  const {channel} = inbox(account);
  return `<section class="panel stack"><h2>Уведомления</h2>
    <div class="production-branch"><strong>В личном кабинете</strong><p class="small">Уведомления о выплатах всегда доступны по колокольчику.</p></div>
    <div class="production-branch"><label class="field">Мессенджер для выплат
      <select data-payout-notice-channel><option value="" ${channel === "" ? "selected" : ""}>Не подключён</option>${Object.entries(channels).map(([id,label]) => `<option value="${id}" ${id === channel ? "selected" : ""}>${label} · демо</option>`).join("")}</select>
    </label><p class="small">Копии новых уведомлений идут в выбранный мессенджер. В прототипе отправка только имитируется.</p></div>
    <p class="small">Канал не связан с публичными контактами каталога. Настройки других уведомлений не меняются.</p>
  </section>`;
}

function items(events, links = false) {
  const labels = {request:"Запрошен код выплаты", replacement:"Запрошен новый код выплаты", receipt:"Получено", debit:"Списано"};
  return events.map(({type, amount, partner, id}) => `<li class="notice" data-payout-notice="${type}">
    <strong>${labels[type]} · ${amountLabel(amount)}</strong><p>${esc(partner)}</p>
    ${type === "request" || type === "replacement" ? `<p class="small">Проверьте сумму и код в кошельке.</p>${links ? `<button type="button" class="btn ghost" data-action="payout-notice-wallet:${esc(id)}">Открыть выплату</button>` : ""}` : ""}
  </li>`).join("");
}

export function renderPayoutNoticeInbox(account, {links = false} = {}) {
  const {channel, events} = inbox(account);
  const copies = events.filter((event) => event.channel);
  const copyGroups = Object.entries(channels).map(([id,label]) => {
    const delivered = copies.filter((event) => event.channel === id);
    return delivered.length ? `<section><strong>${label}</strong><ul class="stack payout-notice-list">${items(delivered)}</ul></section>` : "";
  }).join("");
  return `<section class="stack" aria-label="Уведомления о выплатах"><h3>Выплаты</h3>
    ${events.length ? `<ul class="stack payout-notice-list" data-payout-notice-inbox>${items(events, links)}</ul>` : '<p class="small" data-payout-notice-inbox>Уведомлений о выплатах пока нет.</p>'}
    <details class="optional" data-payout-messenger><summary>Мессенджер: ${channel ? `${channels[channel]} · демо` : "не подключён"}</summary>${copyGroups || '<p class="small">Копий пока нет.</p>'}<p class="small">Реальные сообщения не отправляются.</p></details>
  </section>`;
}
