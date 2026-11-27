const examples = {
  store: {
    title: "Клиент выбрал плитку",
    from: "Ваш магазин",
    need: "Нужен мастер по укладке",
    to: "Специалист RemCard",
    more: "А дальше: сантехника, свет, мебель",
  },
  specialist: {
    title: "Клиент начинает ремонт",
    from: "Ваша команда",
    need: "Нужны материалы для работы",
    to: "Магазин RemCard",
    more: "А дальше: двери, кухня, техника",
  },
  agent: {
    title: "Клиент получил ключи",
    from: "Ваша рекомендация",
    need: "Нужна команда для ремонта",
    to: "Компания RemCard",
    more: "А дальше: отделка, материалы, мебель",
  },
};
let selectedExample = "store";

export function renderWelcome({ entryState, roleLabels, button }) {
  const example = examples[selectedExample];
  return `<main id="main" class="registration entry-page welcome-page" tabindex="-1">
    <section class="welcome-hero" aria-labelledby="welcome-title">
      <div class="welcome-copy">
        <p class="welcome-kicker">Для тех, кто помогает с ремонтом</p>
        <h1 id="welcome-title"><span class="welcome-heading-main">Обмениваемся<span class="welcome-heading-accent">клиентами,</span></span><span class="welcome-heading-rest">которым нужен ремонт<br>и всё для него</span></h1>
        <p class="welcome-description">Знакомим наших клиентов с партнёрами RemCard.<br> Помогаем каждому найти своё.</p>
        <p class="welcome-target"><i data-lucide="focus" aria-hidden="true"></i>Только целевые клиенты.</p>
        ${entryState.invite ? '<p class="notice accent welcome-invite-note">Вас приглашает «Дом материалов». Приглашение сохраним до завершения входа.</p>' : ""}
        <div class="welcome-action">${button('Присоединяйся <i data-lucide="arrow-right" aria-hidden="true"></i>', "register", true)}<span>Сначала выберем, какой тип<br>партнёрства подходит вам</span></div>
      </div>
      <div class="welcome-visual">
        <figure class="welcome-photo">
          <img src="./assets/partner-home.webp" width="1200" height="900" alt="Иллюстрация уютной квартиры: ремонт объединяет работу разных партнёров" fetchpriority="high">
          <figcaption>Один клиент. Несколько задач.</figcaption>
        </figure>
        <section class="welcome-example" aria-label="Пример обмена клиентами">
          <div class="welcome-example-top"><span>Посмотрите на примере</span><span class="welcome-example-label">Пример</span></div>
          <div class="welcome-example-tabs" role="group" aria-label="Выберите пример партнёрства">
            <button type="button" data-welcome-example="store" aria-pressed="${selectedExample === "store"}">Магазин</button>
            <button type="button" data-welcome-example="specialist" aria-pressed="${selectedExample === "specialist"}">Специалист</button>
            <button type="button" data-welcome-example="agent" aria-pressed="${selectedExample === "agent"}">Агент</button>
          </div>
          <h2 data-welcome-story-title aria-live="polite">${example.title}</h2>
          <div class="welcome-route"><div><small>Уже с вами</small><strong data-welcome-story-from>${example.from}</strong></div><i data-lucide="arrow-right" aria-hidden="true"></i><div><small data-welcome-story-need>${example.need}</small><strong data-welcome-story-to>${example.to}</strong></div></div>
          <p class="welcome-example-more" data-welcome-story-more>${example.more}</p>
        </section>
      </div>
    </section>
    <section class="welcome-reciprocity" aria-label="Как работает партнёрство">
      <h2>Вы рекомендуете партнёров.<br><span>Партнёры рекомендуют вас.</span></h2>
      <p>Клиентам проще найти нужное.<br>Партнёрам проще найти своих клиентов.</p>
      <button type="button" class="welcome-text-action" data-entry="register">Найти своё место в RemCard <i data-lucide="arrow-up-right" aria-hidden="true"></i></button>
    </section>
    <footer class="welcome-footer">
      <details class="welcome-invitation"><summary>Я пришёл по приглашению</summary><p>После входа или регистрации вернёмся к приглашению. Автоматически принимать его не будем.</p>${button("Показать демоприглашение", "invite")}</details>
      <details class="welcome-prototype-tools"><summary>Сценарии прототипа</summary>
        <p>Это интерактивный прототип. Данные и примеры демонстрационные: аккаунты не создаются, сообщения не отправляются. Изображение квартиры иллюстративное.</p>
        <p>Проверить переход с лендинга:</p><div class="entry-landing-options">${Object.entries(roleLabels).map(([key, label]) => button(label, `landing-${key}`)).join("")}</div>
        <div data-welcome-settings-slot></div>
        <p>Парольный вход действующего сайта доступен только администратору. Вход партнёров в прототипе показан через MAX или Telegram.</p>
      </details>
    </footer>
  </main>`;
}

export function hydrateWelcome(root) {
  const active = Boolean(root.querySelector(".welcome-page"));
  root.classList.toggle("is-entry-welcome", active);
  if (!active) return;
  const header = root.querySelector(".topbar>.row");
  header?.insertAdjacentHTML("afterbegin", '<button type="button" class="btn ghost welcome-header-login" data-entry="sign-in">Войти</button>');
  const slot = root.querySelector("[data-welcome-settings-slot]");
  const settings = root.querySelector(".mobile-demo-settings");
  if (settings) {
    settings.open = false;
    slot.append(settings);
  }
  const review = root.querySelector("#review");
  if (review) {
    review.open = false;
    slot.append(review);
  }
  root.querySelectorAll("[data-welcome-example]").forEach((button) => button.addEventListener("click", () => {
    selectedExample = button.dataset.welcomeExample;
    const example = examples[button.dataset.welcomeExample];
    root.querySelectorAll("[data-welcome-example]").forEach((tab) => tab.setAttribute("aria-pressed", String(tab === button)));
    for (const key of ["title", "from", "need", "to", "more"]) {
      root.querySelector(`[data-welcome-story-${key}]`).textContent = example[key];
    }
  }));
}
