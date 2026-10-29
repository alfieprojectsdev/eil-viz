import {
  SLOPE_THRESHOLDS, COVERAGE_THRESHOLDS,
  SLOPE_STATUS, DEPOSITIONAL_STATUS, OVERALL_STATUS,
} from "../constants/status";

// Exact matches only: substring checks once let "NOT CERTIFIED" match
// "CERTIFIED" and render green. Anything unrecognised, PENDING included,
// falls through to danger.
const TONE = {
  [OVERALL_STATUS.CERTIFIED]: "safe",
  [OVERALL_STATUS.REVIEW]: "review",
  [OVERALL_STATUS.NOT_CERTIFIED]: "danger",
  [SLOPE_STATUS.SAFE]: "safe",
  [SLOPE_STATUS.FLAG]: "review",
  [SLOPE_STATUS.SUSCEPTIBLE]: "danger",
  [DEPOSITIONAL_STATUS.SAFE]: "safe",
  [DEPOSITIONAL_STATUS.PRONE]: "danger",
};

export function toneOf(status) {
  return TONE[status] ?? "danger";
}

function finite(v) {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

// Thresholds and limits from the response, falling back to the mirrored
// constants for backends older than eil-calc 04c6a1d.
export function slopeRules(slope) {
  const a = slope?.assessment ?? {};
  return {
    flagDeg: finite(a.threshold_flag_deg) ?? SLOPE_THRESHOLDS.flag,
    susceptibleDeg: finite(a.threshold_susceptible_deg) ?? SLOPE_THRESHOLDS.susceptible,
    flagLimit: finite(a.coverage_limit_flag) ?? COVERAGE_THRESHOLDS.flag,
    susceptibleLimit: finite(a.coverage_limit_susceptible) ?? COVERAGE_THRESHOLDS.susceptible,
  };
}

// { susceptible, flag } as fractions, or null when the backend predates them.
export function slopeCoverage(slope) {
  const m = slope?.metrics ?? {};
  const susceptible = finite(m.coverage_susceptible);
  const flag = finite(m.coverage_flag);
  return susceptible === null || flag === null ? null : { susceptible, flag };
}

// A measured share against `limit`: one decimal, or more when one decimal
// would print a value over its limit as equal to it (1.54% against 1.5%).
// Without `limit` it's a limit or scale itself, printed without trailing
// zeros (10, 1.5).
export function formatPct(fraction, limit) {
  const pct = fraction * 100;
  if (limit === undefined) return String(Number(pct.toFixed(2)));
  let digits = 1;
  if (fraction !== limit) {
    while (digits < 4 && pct.toFixed(digits) === (limit * 100).toFixed(digits)) digits++;
  }
  return pct.toFixed(digits);
}

export function formatMetres(v) {
  return `${Math.round(v)} m`;
}

// Accepts the old single `_viz_transect` key from responses that predate
// `_viz_transects`.
export function transectsOf(dep) {
  if (Array.isArray(dep?._viz_transects)) return dep._viz_transects;
  if (dep?._viz_transect) return [{ metrics: dep.metrics, assessment: dep.assessment, path: dep._viz_transect }];
  return [];
}

// How far eil-calc looked for higher ground, for the no-source wording. The
// distance H runs along the descent path, so it can exceed this.
export function searchRadius(dep) {
  return finite(dep?.assessment?.search_radius_m);
}

// eil-calc returns SAFE with a zero drop and a one-point path when it finds
// no higher ground near the lot. Showing "H 0 m > 3 × ΔE 0 m" for that would
// be false, so the runout view treats it as its own case.
export function noRunoutSource(dep, transects) {
  // eil-calc 84daae6+ flags it; older backends are recognised by shape.
  if (typeof dep?.assessment?.no_source_found === "boolean") return dep.assessment.no_source_found;
  if (transects.length === 0) return true;
  return transects.length === 1
    && transects[0]?.metrics?.delta_e === 0
    && (transects[0]?.path?.length ?? 0) <= 1;
}

// The verdict to display. Follows overall_status, except that CERTIFIED SAFE
// is only shown when both checks also say SAFE, and MANUAL REVIEW only when
// neither check failed: the UI must never show a
// failed parcel as certified, even if the backend's verdict and its checks
// disagree.
export function displayVerdict(compliance) {
  const overall = compliance?.overall_status;
  const slopeTone = toneOf(compliance?.slope_stability?.assessment?.status);
  const runoutTone = toneOf(compliance?.depositional_hazard?.assessment?.status);
  const checksPass = slopeTone === "safe" && runoutTone === "safe";
  const checkFailed = slopeTone === "danger" || runoutTone === "danger";

  if ((overall === OVERALL_STATUS.CERTIFIED && !checksPass) || (overall === OVERALL_STATUS.REVIEW && checkFailed)) {
    return {
      status: OVERALL_STATUS.NOT_CERTIFIED,
      tone: "danger",
      headline: "eil-calc's verdict and its checks disagree",
      detail: `The response says ${overall}, but a check did not pass. Treat the parcel as not certified and report this.`,
    };
  }

  const tone = toneOf(overall);
  if (tone === "danger" && overall !== OVERALL_STATUS.NOT_CERTIFIED) {
    return {
      status: OVERALL_STATUS.NOT_CERTIFIED,
      tone,
      headline: `eil-calc returned an unrecognised verdict: ${overall ?? "none"}`,
      detail: "Treat the parcel as not certified.",
    };
  }

  let headline;
  if (tone === "safe") headline = "Passes both Phase 1 checks";
  else if (tone === "review") headline = slopeTone === "review" ? "The slope check needs a manual review" : "Needs a manual review";
  else if (slopeTone === "danger" && runoutTone === "danger") headline = "Fails both Phase 1 checks";
  else if (slopeTone === "danger") headline = "Fails the slope check";
  else if (runoutTone === "danger") headline = "Fails the runout check";
  else headline = "Not certified";

  return {
    status: overall,
    tone,
    headline,
    detail: "Certification needs both the slope and the runout check to pass.",
  };
}
