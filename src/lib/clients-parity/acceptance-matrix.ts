import { CLIENTS_CONTRACT_BLOCKERS, CLIENTS_PARITY_PROTOTYPE_SHA } from "./contracts";

export type AcceptanceStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "PASS"
  | "FAIL"
  | "BLOCKED"
  | "EXCLUDED";

export type AcceptanceRow = {
  id: string;
  status: AcceptanceStatus;
  note: string;
  blockerId?: string;
};

const receivingBlocked = "BLK-RECEIVING-APPEALS";
const observerBlocked = "BLK-OBSERVER-REFERRED";
const personalBlocked = "BLK-OBSERVER-PERSONAL-PERSIST";

function row(id: string, status: AcceptanceStatus, note: string, blockerId?: string): AcceptanceRow {
  return { id, status, note, blockerId };
}

/** C01–C56 registry for implementation author (REMCLIENTS-PARITY-20261113-V1). */
export function buildClientsAcceptanceMatrix(): AcceptanceRow[] {
  return [
    row("C01", "IN_PROGRESS", "Раздел маршрутизирован через ClientsDirectionWorkspace в кабинете."),
    row("C02", "IN_PROGRESS", "Агент: только ObserverPartnersWorkspace, без AgentClientsList/CRM."),
    row("C03", "IN_PROGRESS", "Специалист/бизнес: вкладки направлений как в эталоне."),
    row("C04", "NOT_STARTED", "Сохранение контекста фильтров/раскрытий между переходами — не реализовано."),
    row("C05", "EXCLUDED", "107–112 агент: принимающие виды не подключены."),
    row("C06", "PASS", "Демо-переключатели ролей и каталог страниц не добавлены."),
    row("C07", "BLOCKED", "Принимающий список.", receivingBlocked),
    row("C08", "BLOCKED", "KPI принимающего.", receivingBlocked),
    row("C09", "BLOCKED", "Поиск/фильтры принимающего.", receivingBlocked),
    row("C10", "BLOCKED", "Активные/архив/корзина принимающего.", receivingBlocked),
    row("C11", "BLOCKED", "Выбор строк принимающего.", receivingBlocked),
    row("C12", "BLOCKED", "Массовые действия принимающего.", receivingBlocked),
    row("C13", "BLOCKED", "Массовое редактирование принимающего.", receivingBlocked),
    row("C14", "BLOCKED", "Карточка обращения.", receivingBlocked),
    row("C15", "BLOCKED", "Системные статусы.", receivingBlocked),
    row("C16", "BLOCKED", "Рабочие этапы.", receivingBlocked),
    row("C17", "BLOCKED", "Действия отказа/review.", receivingBlocked),
    row("C18", "BLOCKED", "Аналитика воронки.", receivingBlocked),
    row("C19", "BLOCKED", "Ручное создание.", receivingBlocked),
    row("C20", "BLOCKED", "Сертификат new/repeat/invalid.", receivingBlocked),
    row("C21", "BLOCKED", "Сканер сценарии.", receivingBlocked),
    row("C22", "BLOCKED", "Форма покупки.", receivingBlocked),
    row("C23", "BLOCKED", "Черновик покупки и категории профиля.", receivingBlocked),
    row("C24", "BLOCKED", "Подтверждение покупки.", receivingBlocked),
    row("C25", "NOT_STARTED", "Переходы покупка/квитанция без preview-домена — не проверено."),
    row("C26", "IN_PROGRESS", "Компактные карточки партнёров: UI + CSS, данные BLOCKED."),
    row("C27", "IN_PROGRESS", "Метрики карточки в разметке; без API нет данных.", observerBlocked),
    row("C28", "IN_PROGRESS", "Локальный CSS compact ~125px ориентир."),
    row("C29", "IN_PROGRESS", "details Показать/Скрыть по партнёру (session state); vitest toggle."),
    row("C30", "IN_PROGRESS", "openPartners в session; reload → свёрнуто."),
    row("C31", "IN_PROGRESS", "Checkbox группы/mixed + select-all; vitest."),
    row("C32", "BLOCKED", "Раскрытые клиенты.", observerBlocked),
    row("C33", "IN_PROGRESS", "Фильтры q/period, chips, grouped/flat layout; vitest."),
    row("C34", "BLOCKED", "Семантика filterObserverAppeals vs API.", observerBlocked),
    row(
      "C35",
      "IN_PROGRESS",
      "UI-only: форма alias/tag/note, cancel OK; save disabled — НЕ persistence PASS.",
      personalBlocked,
    ),
    row(
      "C36",
      "IN_PROGRESS",
      "UI-only: bulk edit panel + cancel; save disabled — НЕ persistence PASS.",
      personalBlocked,
    ),
    row(
      "C37",
      "IN_PROGRESS",
      "UI-only: confirm archive/trash/restore; confirm → BLOCKED_PERSISTENCE, no data change.",
      personalBlocked,
    ),
    row("C38", "BLOCKED", "BLOCKED_PERSISTENCE для личных полей.", personalBlocked),
    row("C39", "IN_PROGRESS", "Partner detail view + back (fixture nav).", observerBlocked),
    row("C40", "IN_PROGRESS", "Client public detail view + back (fixture nav).", observerBlocked),
    row("C41", "NOT_STARTED", "Защита URL/id — серверная, не расширена в UI."),
    row("C42", "IN_PROGRESS", "CSS module tokens; numeric spot-test only (observer-visual-tokens.test.ts)."),
    row("C43", "NOT_STARTED", "Полный computed-style diff per component — нет overlay PASS."),
    row("C44", "IN_PROGRESS", "4/8/12/16/44px spot-check в CSS + vitest."),
    row("C45", "NOT_STARTED", "Light/dark screenshot pairs — QA bc-0a64ca5a."),
    row("C46", "NOT_STARTED", "Viewport matrix screenshots — QA."),
    row("C47", "NOT_STARTED", "getBoundingClientRect ≤1px — QA overlay."),
    row("C48", "NOT_STARTED", "Screenshot overlay PASS — QA audit."),
    row("C49", "NOT_STARTED", "Overflow/regression sweep."),
    row("C50", "IN_PROGRESS", "focus-visible на disclosure/summary, tabs, checkbox aria-checked mixed."),
    row("C51", "NOT_STARTED", "loading/error сетевые сценарии observer."),
    row("C52", "PASS", "Демо-датасет не подключён к production UI."),
    row("C53", "NOT_STARTED", "Rerender focus на формах."),
    row("C54", "NOT_STARTED", "Регрессии других разделов не прогонялись."),
    row("C55", "PASS", "Нет реальных финансовых операций в этой итерации."),
    row("C56", "PASS", "БД/backend/права не менялись."),
  ];
}

export function acceptanceMatrixSummary(rows: AcceptanceRow[]) {
  const counts: Record<AcceptanceStatus, number> = {
    NOT_STARTED: 0,
    IN_PROGRESS: 0,
    PASS: 0,
    FAIL: 0,
    BLOCKED: 0,
    EXCLUDED: 0,
  };
  for (const r of rows) counts[r.status] += 1;
  return { prototypeSha: CLIENTS_PARITY_PROTOTYPE_SHA, counts, rows, blockers: CLIENTS_CONTRACT_BLOCKERS };
}
