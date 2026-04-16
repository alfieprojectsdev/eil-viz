// Slope thresholds (degrees) — must match eil_status.py
export const SLOPE_THRESHOLDS = {
  flag: 14,
  susceptible: 16,
};

// Status string constants — mirror SlopeStatus / DepositionalStatus / OverallStatus enums
export const SLOPE_STATUS = {
  SAFE: "SAFE",
  FLAG: "FLAG FOR REVIEW",
  SUSCEPTIBLE: "SUSCEPTIBLE",
};

export const DEPOSITIONAL_STATUS = {
  SAFE: "SAFE (Beyond Runout)",
  PRONE: "PRONE (Within Runout Zone)",
};

export const OVERALL_STATUS = {
  PENDING: "PENDING",
  CERTIFIED: "CERTIFIED SAFE",
  REVIEW: "MANUAL REVIEW REQUIRED",
};
