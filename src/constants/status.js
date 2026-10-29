// Slope thresholds (degrees). Fallback only: eil-calc reports these in
// slope_stability.assessment, and lib/assessment.js prefers the response.
// Must match slope_stability.py.
export const SLOPE_THRESHOLDS = {
  flag: 14,
  susceptible: 16,
};

// Coverage-fraction limits. Fallback only, as above: eil-calc 04c6a1d and
// later report them as assessment.coverage_limit_*. A parcel is SUSCEPTIBLE
// if more than `susceptible` of its pixels are steeper than the susceptible
// threshold; FLAG if more than `flag` fall in the flag band. Fractions (0–1).
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
  NOT_CERTIFIED: "NOT CERTIFIED",
  REVIEW: "MANUAL REVIEW REQUIRED",
};

// DEM source → label shown in the header chip. Keys mirror the source_type
// values smart_fetcher.py returns; resolution is that of each nationwide DEM.
export const DATA_SOURCE_LABELS = {
  ifsar: "IfSAR DEM · 5 m",
  srtm: "SRTM DEM · 30 m",
  local_override: "Local DEM",
};

// 422 detail.module → the check named on the error screen.
export const MODULE_LABELS = {
  slope_stability: "Slope stability",
  depositional_hazard: "Depositional runout",
  orchestrator: "Combining the results",
};

// The project_id App.jsx sends. The header hides it: it names the UI, not
// the parcel.
export const DEFAULT_PROJECT_ID = "web-ui-assessment";
