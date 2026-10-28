import { tokenRgbs } from "./tokens";

// Endpoints of the three bands, as tokens in src/index.css.
const STOP_TOKENS = [
  "--color-slope-safe-low",
  "--color-slope-safe-high",
  "--color-slope-flag-low",
  "--color-slope-flag-high",
  "--color-slope-susceptible-low",
  "--color-slope-susceptible-high",
];

// How far past the susceptible threshold the scale keeps darkening.
export const SUSCEPTIBLE_SPAN_DEG = 9;

function mix(from, to, t) {
  const k = Math.max(0, Math.min(1, t));
  return `rgb(${from.map((v, i) => Math.round(v + k * (to[i] - v))).join(",")})`;
}

// Returns deg → colour. Bands follow eil-calc's comparisons: SAFE up to and
// including the flag threshold, FLAG up to and including the susceptible
// threshold, SUSCEPTIBLE above it. Reads the tokens once per call, so create
// one per draw rather than per cell.
export function makeSlopeColor({ flagDeg, susceptibleDeg }) {
  const [safeLow, safeHigh, flagLow, flagHigh, susLow, susHigh] = tokenRgbs(STOP_TOKENS);
  return (deg) => {
    if (deg <= flagDeg) return mix(safeLow, safeHigh, deg / flagDeg);
    if (deg <= susceptibleDeg) return mix(flagLow, flagHigh, (deg - flagDeg) / (susceptibleDeg - flagDeg));
    return mix(susLow, susHigh, (deg - susceptibleDeg) / SUSCEPTIBLE_SPAN_DEG);
  };
}

// Top of the legend scale, and where a slope sits along it (CSS percent).
export function slopeScaleMax({ susceptibleDeg }) {
  return susceptibleDeg + SUSCEPTIBLE_SPAN_DEG;
}
export function slopeScalePosition(deg, rules) {
  return `${((deg / slopeScaleMax(rules)) * 100).toFixed(2)}%`;
}

// The same scale as a CSS gradient for the legend, using the tokens directly.
export function slopeGradient(rules) {
  const { flagDeg, susceptibleDeg } = rules;
  const at = (deg) => slopeScalePosition(deg, rules);
  return `linear-gradient(to right in oklch, ${[
    `var(--color-slope-safe-low) 0%`,
    `var(--color-slope-safe-high) ${at(flagDeg)}`,
    `var(--color-slope-flag-low) ${at(flagDeg)}`,
    `var(--color-slope-flag-high) ${at(susceptibleDeg)}`,
    `var(--color-slope-susceptible-low) ${at(susceptibleDeg)}`,
    `var(--color-slope-susceptible-high) 100%`,
  ].join(", ")})`;
}
