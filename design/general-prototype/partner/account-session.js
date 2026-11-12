// Prototype interactions only. No authentication API or browser storage.
let listeners;

export function renderAccountMenu({ name, role, escape, icon }) {
  const initials = String(name || "Партнёр").trim().split(/\s+/).slice(0, 2)
    .map((part) => part[0]).join("").toUpperCase();
  return `<div class="session-account" data-session-account>
    <button type="button" class="session-trigger" data-session-action="toggle"
      data-testid="account-menu-trigger" aria-label="Меню аккаунта"
      aria-haspopup="menu" aria-expanded="false" aria-controls="account-session-menu">
      <span class="session-avatar" aria-hidden="true">${escape(initials)}</span>
      <span class="session-trigger-caption"><strong>${escape(name)}</strong><small>${escape(role)}</small></span>
      ${icon("chevron-down")}
    </button>
    <div class="session-menu" id="account-session-menu" role="menu" aria-label="Действия аккаунта" hidden>
      <div class="session-menu-identity" role="presentation"><strong>${escape(name)}</strong><span>${escape(role)}</span></div>
      <button type="button" class="session-menu-item" role="menuitem" data-session-action="current" data-testid="account-logout">
        ${icon("log-out")}<span><strong>Выйти</strong><small>Только на этом устройстве</small></span>
      </button>
      <button type="button" class="session-menu-item" role="menuitem" data-session-action="all" data-testid="account-logout-all">
        ${icon("monitor-off")}<span><strong>Выйти на всех устройствах</strong><small>Включая это устройство</small></span>
      </button>
    </div>
  </div>`;
}

export function renderProfileSessionActions({ icon }) {
  return `<section class="session-profile" aria-labelledby="session-profile-title" data-testid="profile-session-actions">
    <div><h2 id="session-profile-title">Вход в аккаунт</h2><p>Завершите сеанс на этом устройстве или на всех сразу.</p></div>
    <div class="session-profile-buttons">
      <button type="button" class="btn" data-session-action="current" data-testid="profile-logout">${icon("log-out")}Выйти</button>
      <button type="button" class="btn" data-session-action="all" data-testid="profile-logout-all">${icon("monitor-off")}Выйти на всех устройствах</button>
    </div>
  </section>`;
}

export function renderSignedOut({ all, icon }) {
  return `<main id="main" class="registration session-signed-out" tabindex="-1" data-testid="signed-out">
    <section class="panel session-signed-out-panel">
      <span class="session-exit-icon" aria-hidden="true">${icon(all ? "monitor-off" : "log-out")}</span>
      <h1>${all ? "Вы вышли на всех устройствах" : "Вы вышли из аккаунта"}</h1>
      <p class="muted">${all ? "Для продолжения работы на любом устройстве войдите снова." : "На этом устройстве сеанс завершён. На остальных устройствах вход сохранён."}</p>
      <button type="button" class="btn primary" data-session-action="sign-in" data-testid="prototype-sign-in">Войти в аккаунт ${icon("arrow-right")}</button>
      <small class="session-prototype-note">Демонстрация в прототипе. Реальные сеансы не изменяются; кнопка входа вернёт вас в тот же демоаккаунт.</small>
    </section>
  </main>`;
}

export function hydrateAccountSession({ icon, openDialog, closeDialog, signOut, signIn }) {
  listeners?.abort();
  listeners = new AbortController();
  const { signal } = listeners;
  const trigger = document.querySelector("[data-testid=account-menu-trigger]");
  const menu = document.querySelector("#account-session-menu");

  function closeMenu(restoreFocus = false) {
    if (!menu || menu.hidden) return;
    menu.hidden = true;
    trigger?.setAttribute("aria-expanded", "false");
    if (restoreFocus) trigger?.focus({ preventScroll: true });
  }

  function confirmAllDevices() {
    closeMenu(true);
    openDialog("Выйти на всех устройствах?", `<div class="session-confirm stack" data-testid="logout-all-confirmation">
      <p>Сеансы на всех устройствах, включая это, будут завершены. Чтобы продолжить работу, потребуется войти снова.</p>
      <p class="small">Данные профиля, сертификаты, заказы и история останутся в аккаунте.</p>
      <div class="session-confirm-actions">
        <button type="button" class="btn" data-session-action="cancel" data-testid="logout-all-cancel">Отмена</button>
        <button type="button" class="btn primary" data-session-action="confirm-all" data-testid="logout-all-confirm">${icon("monitor-off")}Выйти на всех устройствах</button>
      </div>
      <small class="session-prototype-note">В прототипе показан сценарий выхода. Рабочие сессии не отзываются.</small>
    </div>`);
    document.querySelector("[data-testid=logout-all-cancel]")?.focus();
  }

  document.addEventListener("click", (event) => {
    const action = event.target.closest("[data-session-action]")?.dataset.sessionAction;
    if (!action) {
      if (!event.target.closest("[data-session-account]")) closeMenu();
      return;
    }
    if (action === "toggle" && menu) {
      const open = menu.hidden;
      menu.hidden = !open;
      trigger.setAttribute("aria-expanded", String(open));
      if (open) menu.querySelector("[role=menuitem]")?.focus();
    } else if (action === "current") {
      closeMenu();
      signOut("current");
    } else if (action === "all") {
      confirmAllDevices();
    } else if (action === "cancel") {
      closeDialog();
    } else if (action === "confirm-all") {
      closeDialog();
      signOut("all");
    } else if (action === "sign-in") {
      signIn();
    }
  }, { signal });

  document.addEventListener("keydown", (event) => {
    if (!menu || menu.hidden) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu(true);
      return;
    }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const items = [...menu.querySelectorAll("[role=menuitem]")];
    const current = items.indexOf(document.activeElement);
    const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1
      : (current + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
    items[next]?.focus();
  }, { signal });

  document.addEventListener("focusin", (event) => {
    if (!event.target.closest("[data-session-account]")) closeMenu();
  }, { signal });
}
