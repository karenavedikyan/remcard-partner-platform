import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SharePreviewDialog } from "./SharePreviewDialog";

describe("SharePreviewDialog client contacts", () => {
  const clientA = {
    displayName: "Client A",
    phone: "89001112233",
    email: "a@test.example",
    city: "Sochi",
  };
  const clientB = {
    displayName: "Client B",
    phone: "89004445566",
    email: "b@test.example",
    city: "Krasnodar",
  };

  it("default off → opt-in → switch client resets toggles", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <SharePreviewDialog
        open
        title="Контакты"
        lines={[]}
        url=""
        onClose={() => {}}
        clientContacts={clientA}
      />,
    );

    const preview = () => screen.getByTestId("share-preview-text").textContent ?? "";
    expect(preview()).toBe("Client A");

    await user.click(screen.getByRole("checkbox", { name: "Телефон" }));
    expect(preview()).toMatch(/900/);

    rerender(
      <SharePreviewDialog
        open
        title="Контакты"
        lines={[]}
        url=""
        onClose={() => {}}
        clientContacts={clientB}
      />,
    );
    expect(preview()).toBe("Client B");
    expect(preview()).not.toMatch(/900/);
  });
});
