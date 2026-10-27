// The --color-* tokens live in src/index.css. Canvas and Recharts take colours
// as plain strings rather than CSS, so they read the resolved values here.
export function readToken(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

let probe;

// [r, g, b] of a token, for code that interpolates between colours. Painting
// one pixel lets the browser convert any colour syntax (oklch included).
// Returns null if the token isn't defined.
export function tokenRgb(name) {
  const value = readToken(name);
  if (!value) return null;
  probe ??= document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  probe.clearRect(0, 0, 1, 1);
  probe.fillStyle = "#000";
  probe.fillStyle = value;
  probe.fillRect(0, 0, 1, 1);
  return Array.from(probe.getImageData(0, 0, 1, 1).data.subarray(0, 3));
}
