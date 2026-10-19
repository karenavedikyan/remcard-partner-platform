/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SpecialistPresetSection } from "./SpecialistPresetSection";

function WorkingPresetHarness() {
  const [kind, setKind] = useState<string>("");
  const [title, setTitle] = useState("");
  return (
    <SpecialistPresetSection
      specialistKind={kind as ""}
      specialistTitle={title}
      persistCustomTitle
      onKindChange={(next) => setKind(next)}
      onTitleChange={setTitle}
      onApplyMerge={() => {}}
    />
  );
}

describe("SpecialistPresetSection", () => {
  it("shows editable custom title for working profile draft", async () => {
    const user = userEvent.setup();
    render(<WorkingPresetHarness />);
    await user.selectOptions(screen.getByLabelText(/Кто вы как специалист/i), "other");
    const input = screen.getByLabelText(/Ваша специализация/i);
    await user.type(input, "X");
    expect(input).toHaveValue("X");
  });

  it("keeps default preset variant without workingProfile styling hook", () => {
    const { container } = render(
      <SpecialistPresetSection
        specialistKind="designer"
        onKindChange={() => {}}
        onApplyMerge={() => {}}
      />,
    );
    expect(container.querySelector('[data-preset-variant="default"]')).toBeTruthy();
    expect(container.querySelector('[data-preset-variant="workingProfile"]')).toBeNull();
  });

  it("applies workingProfile variant only when requested", () => {
    render(
      <SpecialistPresetSection
        specialistKind="designer"
        presentationVariant="workingProfile"
        onKindChange={() => {}}
        onApplyMerge={() => {}}
      />,
    );
    expect(screen.getByTestId("specialist-preset-section")).toHaveAttribute(
      "data-preset-variant",
      "workingProfile",
    );
  });

  it("blocks custom title input in catalog preset (no fake persistence)", () => {
    render(
      <SpecialistPresetSection
        specialistKind="other"
        persistCustomTitle={false}
        onKindChange={() => {}}
        onApplyMerge={() => {}}
      />,
    );
    expect(screen.getByTestId("specialist-preset-custom-title-blocked")).toBeInTheDocument();
    expect(screen.queryByLabelText(/Ваша специализация/i)).toBeNull();
  });
});
