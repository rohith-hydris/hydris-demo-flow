import type { Role } from "./roles";

// Who approves the delivery baseline. Product rules R1 to R5: approving a plan is a Forecast decision (R1), grants no claim
// entitlement (R2), adds no external funder as a participant (R3), needs passing mandatory gates (R4) and uses no real funder data (R5).

/** Decision V2-APPROVE is pending. Flip this when the team decides. */
export const BASELINE_APPROVER: "supplier" | "brand" = "supplier";

export const canApproveBaseline = (role: Role, approver: "supplier" | "brand" = BASELINE_APPROVER): boolean => role === approver;

export const approverLabel = (approver: "supplier" | "brand" = BASELINE_APPROVER): "Approved by supplier" | "Approved by brand" =>
  approver === "supplier" ? "Approved by supplier" : "Approved by brand";
