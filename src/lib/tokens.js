// The --color-* tokens live in src/index.css. Canvas and Recharts take colours
// as plain strings rather than CSS, so they read the resolved values here.
// Returns { [name]: value }, with one style lookup for all of them. Throws on
// a missing or invalid token: an empty stroke would silently drop a line such
// as the 3×ΔE limit, and an invalid fill would draw black.
export function readTokens(names) {
  const style = getComputedStyle(document.documentElement);
  return Object.fromEntries(names.map(name => {
    const value = style.getPropertyValue(name).trim();
    if (!value) throw new Error(`CSS token ${name} is not defined`);
    if (!CSS.supports("color", value)) throw new Error(`CSS token ${name} is not a colour: ${value}`);
    return [name, value];
  }));
}

let probe;

// [r, g, b] of each token, for code that interpolates between colours.
// Painting one pixel lets the browser convert any colour syntax (oklch
// included).
export function tokenRgbs(names) {
  const values = readTokens(names);
  probe ??= document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  return names.map(name => {
    probe.clearRect(0, 0, 1, 1);
    probe.fillStyle = values[name];
    probe.fillRect(0, 0, 1, 1);
    return Array.from(probe.getImageData(0, 0, 1, 1).data.subarray(0, 3));
  });
}
