import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WorkingStagesEditor } from "./WorkingStagesEditor";

describe("WorkingStagesEditor add buttons", () => {
  it("«Добавить этап» and «Добавить причину» share one style", () => {
    render(
      <WorkingStagesEditor
        settings={{
          receivingPartnerUserId: "me",
          workingStages: [{ id: "ws_1", label: "Замер" }],
          refusalReasons: ["Дорого"],
          archivedStages: [],
          manualChannels: [],
          version: 1,
        } as never}
      />,
    );
    const stage = screen.getByTestId("ca-settings-add-stage");
    const reason = screen.getByTestId("ca-settings-add-reason");
    expect(stage.className).toBe(reason.className);
    expect(stage).toHaveTextContent("Добавить этап");
    expect(reason).toHaveTextContent("Добавить причину");
  });
});
