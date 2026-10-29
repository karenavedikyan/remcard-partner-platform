/** Independent reviewer: non-agent empty-terms receiver action. Local only. */
import { describe, expect, it } from "vitest";
import { getPartnershipUiActions } from "@/lib/partnership-rules";
import type { Partnership } from "@/lib/types";

describe("Independent reviewer: non-agent empty-terms receiver action", () => {
  it("does not identify a specialist sender as an agent in the action label", () => {
    const invitation = {
      id: "reviewer-p",
      status: "INVITED",
      initiatedBy: "specialist",
      proUserId: "specialist",
      storeUserId: "store",
      terms: [],
      proUser: {
        id: "specialist",
        partnerType: "MASTER",
        partnerActivities: ["SERVICE"],
      },
      storeUser: {
        id: "store",
        partnerType: "STORE",
        partnerActivities: ["STORE"],
      },
    } as unknown as Partnership;
    const action = getPartnershipUiActions(invitation, "store").find(
      (item) => item.kind === "counter_offer",
    );
    expect(action).toBeDefined();
    expect(action?.label).not.toMatch(/агент/i);
  });
});
