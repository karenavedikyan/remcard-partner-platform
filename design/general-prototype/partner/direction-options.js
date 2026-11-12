// Demo-only shared dictionary. Nothing is sent to the production platform.
export const navigatorExplanation =
  "Клиенты в навигаторе ремонта на remcard.ru выбирают партнёров для каждого этапа. Укажите свою специализацию и этапы, на которых вы выполняете работы или предлагаете товары: так клиент сможет найти вас в нужный момент.";
const normalized = (value) =>
  String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
const key = (value) =>
  normalized(value).toLocaleLowerCase("ru").replace(/ё/g, "е");
let sequence = 0;
export function addDirection(dictionary, group, value) {
  const label = normalized(value);
  if (
    !["products", "services", "stages"].includes(group) ||
    !Array.isArray(dictionary[group])
  )
    return { error: "Выберите категорию или этап." };
  if (label.length < 2 || label.length > 80)
    return { error: "Введите название от 2 до 80 символов." };
  const existing = dictionary[group].find(
    (item) => key(item.label) === key(label),
  );
  if (existing) return { item: existing, created: false };
  const item = {
    id: `demo-custom-${group}-${++sequence}`,
    label,
    custom: true,
  };
  dictionary[group].push(item);
  return { item, created: true };
}
export function customDirectionForm(group, escape, { profile = false } = {}) {
  const stage = group === "stages";
  return `<details class="${profile ? "pw-optional" : "optional"} direction-custom"><summary>${stage ? "Не нашли свой этап?" : "Не нашли свою категорию?"}</summary>
    <p class="${profile ? "pw-muted" : "small"}">Добавьте свой вариант и выберите его. В рабочей версии после сохранения платформа автоматически добавит новое название в общий справочник, чтобы другие партнёры тоже могли его найти.</p>
    <label class="${profile ? "pw-field" : "field"}">${stage ? "Название этапа" : group === "products" ? "Название категории товаров" : "Название работы или услуги"}<input type="text" maxlength="80" data-custom-direction="${escape(group)}" placeholder="${stage ? "Например, восстановление после затопления" : group === "products" ? "Например, осушители для ремонта" : "Например, реставрация лепнины"}"></label>
    <button type="button" class="${profile ? "pw-btn" : "btn"}" ${profile ? `data-pw-action="add-direction" data-pw-add="${escape(group)}"` : `data-direction-add="${escape(group)}"`}>Добавить и выбрать</button>
    <p class="${profile ? "pw-muted" : "small"}" role="status" data-direction-result="${escape(group)}"></p>
    <small>Прототип: новый вариант доступен в этой вкладке, общий справочник рабочего сайта не меняется.</small></details>`;
}
