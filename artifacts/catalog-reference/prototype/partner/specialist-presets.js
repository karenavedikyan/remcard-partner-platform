// Product-design starting points, not proof of skills or professional credentials.
export const specialistKinds = [
  {
    id: "designer",
    label: "Дизайнер интерьера",
    services: ["design", "planning"],
    stages: ["L1-1"],
  },
  {
    id: "foreman",
    label: "Прораб",
    services: ["renovation"],
    stages: ["L1-7", "L1-8", "L1-9", "L1-11"],
  },
  {
    id: "master",
    label: "Мастер",
    services: ["finishing"],
    stages: ["L1-9"],
    note: "Для мастера показан пример отделочных работ. Если ваша специализация другая, замените категории и этапы.",
  },
  {
    id: "architect",
    label: "Архитектор",
    services: ["planning"],
    stages: ["L1-1", "L1-2"],
  },
  {
    id: "engineer",
    label: "Инженер по коммуникациям",
    services: ["engineering"],
    stages: ["L1-7"],
  },
  {
    id: "supervisor",
    label: "Специалист по приёмке и технадзору",
    services: ["demo-role-supervision"],
    stages: ["L1-0", "L1-11"],
  },
  { id: "other", label: "Свой вариант", services: [], stages: [] },
];
export function ensureSpecialistPresetDictionary(dictionary) {
  if (!dictionary.services.some((item) => item.id === "demo-role-supervision"))
    dictionary.services.push({
      id: "demo-role-supervision",
      label: "Приёмка и технический надзор",
      demo: true,
    });
}
export function applySpecialistPreset(
  values,
  dictionary,
  { merge = false } = {},
) {
  const preset = specialistKinds.find(
    (item) => item.id === values.specialistKind,
  );
  if (!preset || preset.id === "other") return false;
  if (
    !merge &&
    ((values.services || []).length || (values.stages || []).length)
  )
    return false;
  for (const group of ["services", "stages"]) {
    const ids = preset[group].filter((id) =>
      dictionary[group].some((item) => item.id === id),
    );
    values[group] = [...new Set([...(values[group] || []), ...ids])];
  }
  return true;
}
export function specialistPresetSection(values, dictionary, escape) {
  const preset = specialistKinds.find(
    (item) => item.id === values.specialistKind,
  );
  return `<section class="specialist-preset">
    <label class="field">Кто вы как специалист?<select name="specialistKind" data-specialist-kind><option value="">Выберите роль или заполните вручную</option>${specialistKinds.map((item) => `<option value="${item.id}" ${values.specialistKind === item.id ? "selected" : ""}>${item.label}</option>`).join("")}</select></label>
    <p class="small">При первом выборе роли в пустой форме подставим стартовые категории и этапы. Это подсказка, не ограничение: удалите лишнее, добавьте нужное или свой вариант.</p>
    ${preset?.id === "other" ? `<label class="field">Ваша специализация<input type="text" name="specialistTitle" maxlength="80" value="${escape(values.specialistTitle || "")}" placeholder="Например, реставратор"></label><p class="small">Для своего варианта выберите категории и этапы вручную.</p>` : ""}
    ${
      preset && preset.id !== "other"
        ? `<details class="specialist-preset-preview"><summary>Стартовый набор для роли «${escape(preset.label)}»</summary><div class="specialist-preset-content">${preset.note ? `<small>${escape(preset.note)}</small>` : ""}<div class="direction-chips">${[
            "services",
            "stages",
          ]
            .flatMap((group) =>
              preset[group]
                .map((id) => dictionary[group].find((item) => item.id === id))
                .filter(Boolean)
                .map(
                  (item) =>
                    `<span class="direction-chip">${group === "services" ? "Категория" : "Этап"}: ${escape(item.label)}</span>`,
                ),
            )
            .join(
              "",
            )}</div><button type="button" class="btn" data-specialist-apply>Добавить этот набор к выбранному</button><small>Уже выбранные категории и этапы сохранятся.</small></div></details>`
        : ""
    }
    <p class="small" role="status" data-specialist-status>${escape(values.specialistNotice || "")}</p>
  </section>`;
}
