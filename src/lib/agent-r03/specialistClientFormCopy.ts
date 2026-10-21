export function specialistClientFormCopy(editing: boolean) {
  return {
    title: editing ? "Данные клиента" : "Добавить клиента",
    submitLabel: editing ? "Сохранить" : "Добавить клиента",
    nameLabel: "Имя клиента *",
  };
}
