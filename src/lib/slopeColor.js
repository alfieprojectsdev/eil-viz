import { SLOPE_THRESHOLDS } from "../constants/status";
import { tokenRgbs } from "./tokens";

// Endpoints of the three gradient segments, as tokens in src/index.css.
const STOP_TOKENS = [
  "--color-slope-safe-low",
  "--color-slope-safe-high",
  "--color-slope-flag-high",
  "--color-slope-susceptible-high",
];

function mix(from, to, t) {
  return `rgb(${from.map((v, i) => Math.round(v + t * (to[i] - v))).join(",")})`;
}

// Returns deg → colour. Reads the tokens once per call, so create one per
// draw rather than per cell; a token edit shows on the next draw.
// SAFE < 14°: blue-green | FLAG 14-16°: amber | SUSCEPTIBLE > 16°: crimson
export function makeSlopeColor() {
  const [safeLow, safeHigh, flagHigh, susceptibleHigh] = tokenRgbs(STOP_TOKENS);
  return (deg) => {
    if (deg < SLOPE_THRESHOLDS.flag) {
      return mix(safeLow, safeHigh, deg / SLOPE_THRESHOLDS.flag);
    } else if (deg < SLOPE_THRESHOLDS.susceptible) {
      const t = (deg - SLOPE_THRESHOLDS.flag) / (SLOPE_THRESHOLDS.susceptible - SLOPE_THRESHOLDS.flag);
      return mix(safeHigh, flagHigh, t);
    } else {
      const t = Math.min((deg - SLOPE_THRESHOLDS.susceptible) / 9, 1);
      return mix(flagHigh, susceptibleHigh, t);
    }
  };
}
