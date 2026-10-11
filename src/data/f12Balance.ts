// V2 Section 7. F12 whole-site water balance inputs (illustrative). Discharge to other basins, the error and the
// reconciliation to Replenishment Needed are computed in src/lib/boundary.ts, not typed here.
export const f12Boundary = {
  factoryId: "F12",
  meteredConsumptionM3: 97000,
  changeInStorageM3: 2000,
  /** Internal recirculation (recycled and reclaimed on site). An internal flow, never an external inflow. */
  internalRecirculationM3: 19000,
  condensateOrigin: "None",
  transfers: "None",
  dischargeDestination: "Buckingham canal system, within consent",
} as const;

/** V2 8: the matched-flow mini example. */
export const flowGuardExample = {
  inletMgPerL: 60, outletMgPerL: 20, inletFlowM3: 150000, outletFlowM3: 150000,
  mismatchedOutletFlowM3: 120000,
} as const;
