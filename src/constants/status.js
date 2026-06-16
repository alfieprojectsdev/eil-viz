// Slope thresholds (degrees) — must match eil_status.py
export const SLOPE_THRESHOLDS = {
  flag: 14,
  susceptible: 16,
};

// Coverage-fraction thresholds — must match slope_stability.py.
// A parcel is SUSCEPTIBLE if more than `susceptible` of its area exceeds the
// susceptible degree threshold; FLAG if more than `flag` of its area falls in
// the flag degree band. Stored as fractions (0–1); multiply by 100 for percent.
export const COVERAGE_THRESHOLDS = {
  susceptible: 0.015,
  flag: 0.1,
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
