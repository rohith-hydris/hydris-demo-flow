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

/**
 * A second boundary fixture (issue C6): F12's balance with less metered consumption, so the error is 30,000 m3, 12% of the 250,000 m3
 * withdrawal (250,000 - (150,000 + 68,000 + 2,000)). Above the 10% tolerance, so the cell grades drop one letter. Test fixture, not a site.
 */
export const f12BoundaryHighError = { ...f12Boundary, meteredConsumptionM3: 68000 } as const;

/** V2 8: the matched-flow mini example. */
export const flowGuardExample = {
  inletMgPerL: 60, outletMgPerL: 20, inletFlowM3: 150000, outletFlowM3: 150000,
  mismatchedOutletFlowM3: 120000,
} as const;
