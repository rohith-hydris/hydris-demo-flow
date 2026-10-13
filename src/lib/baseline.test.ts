import { describe, expect, it } from "vitest";
import { approverLabel, BASELINE_APPROVER, canApproveBaseline } from "./baseline";

describe("baseline approver (V2-APPROVE)", () => {
  it("the demo default is the supplier", () => {
    expect(BASELINE_APPROVER).toBe("supplier");
    expect(canApproveBaseline("supplier")).toBe(true);
    expect(canApproveBaseline("brand")).toBe(false);
    expect(approverLabel()).toBe("Approved by supplier");
  });
  it("flipping the approver flips the permission and the label", () => {
    expect(canApproveBaseline("brand", "brand")).toBe(true);
    expect(canApproveBaseline("supplier", "brand")).toBe(false);
    expect(approverLabel("brand")).toBe("Approved by brand");
  });
});
