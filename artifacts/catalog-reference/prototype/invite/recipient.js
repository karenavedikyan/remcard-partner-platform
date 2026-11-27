const root = document.documentElement;
const preference = matchMedia("(prefers-color-scheme: dark)");
const themeButton = document.querySelector("[data-testid=button-theme]");
let manualTheme = false;
function setTheme(dark) {
  root.dataset.theme = dark ? "dark" : "light";
  themeButton.setAttribute("aria-label", dark ? "Включить светлую тему" : "Включить тёмную тему");
  themeButton.setAttribute("aria-pressed", String(dark));
}
setTheme(preference.matches);
preference.addEventListener("change", ({ matches }) => { if (!manualTheme) setTheme(matches); });
themeButton.addEventListener("click", () => {
  manualTheme = true;
  setTheme(root.dataset.theme !== "dark");
});

const $ = selector => document.querySelector(selector);
const requested = new URLSearchParams(location.search).get("mode");
const mode = ["agent", "discussion", "inactive"].includes(requested) ? requested : "offer";
root.dataset.mode = mode;
$(`nav [data-mode="${mode}"]`).setAttribute("aria-current", "page");

const title = $("#invite-title");
const sender = $(".sender");
const lead = $(".lead");
const how = $(".how");
const terms = $(".terms");
const mutual = $(".mutual");
const note = $(".note");
const next = $(".next");
const nextTitle = $("#next-title");
const nextStatus = $(".next-copy");
const steps = $(".steps");
const actions = $(".actions");
const primary = $("[data-testid=button-primary]");
const secondaryLabel = $("[data-slot=secondary-label]");
const secondary = $("[data-testid=button-secondary]");
const fine = $(".fine");
const dock = $(".dock");
const dockButton = $("[data-testid=button-dock]");
const dialog = $("dialog");

/* Тексты шагов после входа. Режим «offer» — получатель с товарами и услугами, «agent» — получатель-агент. */
const flows = {
  offer: {
    stepTwo: { label: "Принять условия", decline: true },
    doneTitle: "Вы партнёры",
    doneStatus: "Можно рекомендовать ОПТОВИК клиентам. Остался шаг навстречу.",
    stepThree: { label: "Предложить свои условия", later: true },
    dialog: ["Ваши условия для ОПТОВИКА", "В рабочей версии откроется раздел «Партнёры»: укажете процент по своим категориям и отправите ОПТОВИКУ. В макете ничего не отправляется."],
  },
  agent: {
    stepTwo: { label: "Принять условия", decline: true },
    doneTitle: "Вы партнёры",
    doneStatus: "Можно рекомендовать ОПТОВИК клиентам.",
    stepThree: { label: "Перейти в кабинет" },
    dialog: ["Кабинет партнёра", "В рабочей версии откроется кабинет, где вы выдадите клиенту первый сертификат. В макете ничего не создаётся."],
  },
  discussion: {
    stepTwo: { label: "Присоединиться к обсуждению" },
    doneTitle: "Вы в обсуждении",
    doneStatus: "Осталось согласовать процент — и Алексей начнёт приводить клиентов.",
    stepThree: { label: "Предложить свой процент", later: true },
    dialog: ["Ваш процент для Алексея", "В рабочей версии откроется раздел «Партнёры»: укажете процент по своим категориям и отправите Алексею. В макете ничего не отправляется."],
  },
};
const flow = flows[mode];

if (mode === "agent") {
  mutual.hidden = true;
  setStep(3, "Выдайте первый сертификат", "Вознаграждение увидите в кошельке.");
  note.querySelector("blockquote").textContent = "Будем рады работать вместе!";
}
if (mode === "discussion") {
  sender.textContent = "Агент · Краснодар";
  title.textContent = "Алексей Романов хочет приводить вам клиентов";
  lead.textContent = "Он рекомендует ваши товары и услуги. Вы платите процент только с покупок, которые состоялись.";
  $("[data-slot=flow1]").textContent = "Алексей выдаёт клиенту сертификат";
  $("[data-slot=flow2]").textContent = "Клиент покупает у вас со скидкой";
  $("[data-slot=flow3]").textContent = "Вы платите процент с покупки";
  terms.hidden = true;
  mutual.hidden = true;
  note.querySelector("figcaption").textContent = "Сообщение от Алексея";
  note.querySelector("blockquote").textContent = "Давайте обсудим, что я могу рекомендовать своим клиентам и на каких условиях.";
  setStep(2, "Присоединитесь к обсуждению", "Это ещё не согласие на условия.");
  setStep(3, "Согласуйте процент", "Предложите свой — и Алексей начнёт приводить клиентов.");
  fine.textContent = "Процент пока не согласован: его предлагаете вы.";
}
if (mode === "inactive") {
  title.textContent = "Приглашение больше не действует";
  lead.textContent = "Попросите отправителя прислать новую ссылку.";
  for (const element of [sender, how, terms, mutual, note, next]) element.hidden = true;
}

function setStep(number, label, hint) {
  const item = steps.querySelector(`[data-n="${number}"]`);
  item.querySelector("strong").textContent = label;
  item.querySelector("small").textContent = hint;
}
function setPrimary(label) {
  primary.querySelector("span").textContent = label;
  dockButton.textContent = label;
}
function showDemo(heading, body, closeLabel, onClose) {
  dialog.querySelector("h2").textContent = heading;
  dialog.querySelector("[data-testid=text-dialog]").textContent = body;
  dialog.querySelector("button").textContent = closeLabel;
  dialog.returnValue = "";
  dialog.addEventListener("close", () => { if (dialog.returnValue === "ok") onClose?.(); }, { once: true });
  dialog.showModal();
}
function render(step, announce) {
  next.dataset.step = step;
  steps.querySelectorAll("li").forEach(item => {
    const number = Number(item.dataset.n);
    const state = step === "declined" ? "" : number < step ? "done" : number === step ? "current" : "";
    item.dataset.state = state;
    if (state === "current") item.setAttribute("aria-current", "step"); else item.removeAttribute("aria-current");
  });
  nextStatus.hidden = step !== 3 && step !== "declined";
  fine.hidden = step === 3 || step === "declined";
  secondary.parentElement.hidden = false;
  if (step === 1) {
    nextTitle.textContent = "Как стать партнёром";
    setPrimary("Зарегистрироваться");
    secondaryLabel.textContent = "Уже есть аккаунт?";
    secondary.textContent = "Войти";
  }
  if (step === 2) {
    nextTitle.textContent = "Как стать партнёром";
    setPrimary(flow.stepTwo.label);
    secondaryLabel.textContent = "Не подходит?";
    secondary.textContent = "Отклонить";
    secondary.parentElement.hidden = !flow.stepTwo.decline;
    fine.textContent = mode === "discussion" ? "Процент пока не согласован: его предлагаете вы." : "Условия зафиксированы в этом приглашении.";
  }
  if (step === 3) {
    nextTitle.textContent = flow.doneTitle;
    nextStatus.textContent = flow.doneStatus;
    setPrimary(flow.stepThree.label);
    secondaryLabel.textContent = "Можно и позже —";
    secondary.textContent = "в кабинете";
    secondary.parentElement.hidden = !flow.stepThree.later;
  }
  if (step === "declined") {
    nextTitle.textContent = "Вы не приняли предложение";
    nextStatus.textContent = "Сотрудничество не начато. К условиям можно вернуться, пока ссылка активна.";
    setPrimary("Вернуться к условиям");
    secondary.parentElement.hidden = true;
  }
  steps.hidden = step === "declined";
  if (announce) nextTitle.focus({ preventScroll: step === 2 });
  syncDock();
}
function act(kind) {
  const step = next.dataset.step;
  if (step === "1") {
    const signup = kind === "primary";
    showDemo(signup ? "Регистрация в RemCard" : "Вход в RemCard", "В рабочей версии после этого шага вы вернётесь к приглашению. В макете аккаунт не создаётся и данные не отправляются.", "Вернуться к приглашению", () => render(2, true));
  } else if (step === "2") {
    render(kind === "primary" ? 3 : "declined", true);
  } else if (step === "3") {
    if (kind === "primary") showDemo(flow.dialog[0], flow.dialog[1], "Понятно");
    else showDemo("Кабинет партнёра", "В рабочей версии откроется кабинет. Предложить свои условия можно в любой момент в разделе «Партнёры».", "Понятно");
  } else {
    render(2, true);
  }
}
primary.addEventListener("click", () => act("primary"));
secondary.addEventListener("click", () => act("secondary"));
dockButton.addEventListener("click", () => act("primary"));

/* Мобильная кнопка действия: видна, пока основная кнопка за пределами экрана. */
let primaryVisible = true;
function syncDock() { dock.hidden = mode === "inactive" || primaryVisible; }
if (mode !== "inactive") {
  new IntersectionObserver(([entry]) => { primaryVisible = entry.isIntersecting; syncDock(); }, { threshold: .6 }).observe(primary);
  render(1, false);
}
