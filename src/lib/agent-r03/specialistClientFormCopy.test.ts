import { describe, expect, it } from "vitest";
import { specialistClientFormCopy } from "./specialistClientFormCopy";

describe("specialistClientFormCopy", () => {
  it("uses create copy for new client", () => {
    expect(specialistClientFormCopy(false)).toEqual({
      title: "Добавить клиента",
      submitLabel: "Добавить клиента",
      nameLabel: "Имя клиента *",
    });
  });

  it("uses edit copy for existing client", () => {
    expect(specialistClientFormCopy(true)).toEqual({
      title: "Данные клиента",
      submitLabel: "Сохранить",
      nameLabel: "Имя клиента *",
    });
  });
});
