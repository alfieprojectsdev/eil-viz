import { SLOPE_THRESHOLDS } from "../constants/status";
import { tokenRgb } from "./tokens";

// Endpoints of the three gradient segments, as tokens in src/index.css.
const STOP_TOKENS = [
  "--color-slope-safe-low",
  "--color-slope-safe-high",
  "--color-slope-flag-high",
  "--color-slope-susceptible-high",
];

let stops;

function slopeStops() {
  if (!stops) {
    const rgbs = STOP_TOKENS.map(tokenRgb);
    // Don't cache a miss: the stylesheet may not have applied yet.
    if (rgbs.includes(null)) return rgbs.map(rgb => rgb ?? [0, 0, 0]);
    stops = rgbs;
  }
  return stops;
}

function mix(from, to, t) {
  return `rgb(${from.map((v, i) => Math.round(v + t * (to[i] - v))).join(",")})`;
}

// SAFE < 14°: blue-green | FLAG 14-16°: amber | SUSCEPTIBLE > 16°: crimson
export function slopeColor(deg) {
  const [safeLow, safeHigh, flagHigh, susceptibleHigh] = slopeStops();
  if (deg < SLOPE_THRESHOLDS.flag) {
    return mix(safeLow, safeHigh, deg / SLOPE_THRESHOLDS.flag);
  } else if (deg < SLOPE_THRESHOLDS.susceptible) {
    const t = (deg - SLOPE_THRESHOLDS.flag) / (SLOPE_THRESHOLDS.susceptible - SLOPE_THRESHOLDS.flag);
    return mix(safeHigh, flagHigh, t);
  } else {
    const t = Math.min((deg - SLOPE_THRESHOLDS.susceptible) / 9, 1);
    return mix(flagHigh, susceptibleHigh, t);
  }
}
