import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProfileTeamPermissionMatrix } from "./ProfileTeamPermissionMatrix";
import { flagsFromActionIds } from "@/lib/prof-i-permissions";

describe("ProfileTeamPermissionMatrix", () => {
  it("adds ledger when cash is enabled", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ProfileTeamPermissionMatrix
        value={flagsFromActionIds(["own"])}
        onChange={onChange}
      />,
    );
    await user.click(screen.getByTestId("team-perm-cash"));
    expect(onChange).toHaveBeenCalled();
    const last = onChange.mock.calls.at(-1)?.[0];
    expect(last.canPayBonusCash).toBe(true);
    expect(last.canViewWallet).toBe(true);
  });
});
