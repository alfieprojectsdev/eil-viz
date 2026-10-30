// Plan-view geometry. eil-calc returns WGS84 [lon, lat]; the plan view draws
// in metres east and north of a local origin. An equirectangular projection
// around the lot is within a fraction of a percent over the ~2 km the view
// covers, which is far below the 5 m DEM pixel. eil-calc's own distances are
// geodesic, so labels quote its numbers rather than measuring the drawing.

const M_PER_DEG_LAT = 110_574;
const M_PER_DEG_LON_EQUATOR = 111_320;

// ([lon, lat]) → [x east, y north] in metres from (lon0, lat0).
export function makeProjection(lon0, lat0) {
  const kx = M_PER_DEG_LON_EQUATOR * Math.cos((lat0 * Math.PI) / 180);
  return ([lon, lat]) => [(lon - lon0) * kx, (lat - lat0) * M_PER_DEG_LAT];
}

// The outer ring of a GeoJSON Polygon, or null when it isn't one.
export function outerRing(polygon) {
  const ring = polygon?.type === "Polygon" ? polygon.coordinates?.[0] : null;
  return Array.isArray(ring) && ring.length >= 4 && ring.every(isLonLat) ? ring : null;
}

export function isLonLat(p) {
  return Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]);
}

// {lon, lat} objects (path points, peak, edge_point) → [lon, lat], or null.
export function lonLatOf(p) {
  return p && Number.isFinite(p.lon) && Number.isFinite(p.lat) ? [p.lon, p.lat] : null;
}

export function centroidOf(ring) {
  const pts = ring.slice(0, -1);
  return [
    pts.reduce((s, p) => s + p[0], 0) / pts.length,
    pts.reduce((s, p) => s + p[1], 0) / pts.length,
  ];
}

export function bboxOf(points) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of points) {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  return { minX, minY, maxX, maxY };
}

export function growBox(box, by) {
  return { minX: box.minX - by, minY: box.minY - by, maxX: box.maxX + by, maxY: box.maxY + by };
}

// Fits a box in metres into a width × height drawing with `pad` px around
// it, north up. Returns the scale (px per metre) and the point mapper.
export function fitBox(box, width, height, pad) {
  const bw = Math.max(box.maxX - box.minX, 1);
  const bh = Math.max(box.maxY - box.minY, 1);
  const s = Math.min((width - 2 * pad) / bw, (height - 2 * pad) / bh);
  const ox = (width - bw * s) / 2;
  const oy = (height - bh * s) / 2;
  return {
    s,
    pt: ([x, y]) => [ox + (x - box.minX) * s, oy + (box.maxY - y) * s],
  };
}

// The largest 1, 2 or 5 × 10^k that's at most `metres`.
export function niceLength(metres) {
  const mag = 10 ** Math.floor(Math.log10(metres));
  const norm = metres / mag;
  return (norm >= 5 ? 5 : norm >= 2 ? 2 : 1) * mag;
}

export function svgPath(points) {
  return points.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
}

// eil-calc's _viz_contours as { interval, source, lines: [{ coords, index }] }
// with coords still [lon, lat]. Every fifth line is an index contour, drawn
// heavier as on a topographic map. null when the response has none.
export function contourLines(contourSet) {
  const lines = (Array.isArray(contourSet?.lines) ? contourSet.lines : [])
    .filter(l => Array.isArray(l?.coordinates) && l.coordinates.length >= 2 && l.coordinates.every(isLonLat));
  if (!lines.length) return null;
  const interval = Number.isFinite(contourSet.interval_m) ? contourSet.interval_m : null;
  return {
    interval,
    source: typeof contourSet.source === "string" ? contourSet.source : null,
    lines: lines.map(l => ({
      coords: l.coordinates,
      index: interval !== null && Number.isFinite(l.elev_m) && l.elev_m % (interval * 5) === 0,
    })),
  };
}

// [lon, lat] → [column, row] in _viz_grid's cells, from _viz_grid_bounds
// (outer cell edges, row 0 north). null when the bounds can't be used.
export function gridProjection(bounds, rows, cols) {
  const b = bounds;
  if (!b || b.row0_north !== true || ![b.west, b.south, b.east, b.north].every(Number.isFinite) || !rows || !cols) return null;
  const dLon = (b.east - b.west) / cols;
  const dLat = (b.north - b.south) / rows;
  return ([lon, lat]) => [(lon - b.west) / dLon, (b.north - lat) / dLat];
}

// Rows and columns that hold parcel pixels, the steepest pixel, and the count.
export function gridSummary(grid) {
  let minR = Infinity, maxR = -1, minC = Infinity, maxC = -1;
  let max = null, count = 0;
  grid.forEach((row, r) => {
    row.forEach((v, c) => {
      if (typeof v !== "number") return;
      count++;
      minR = Math.min(minR, r); maxR = Math.max(maxR, r);
      minC = Math.min(minC, c); maxC = Math.max(maxC, c);
      if (!max || v > max.v) max = { v, r, c };
    });
  });
  return count ? { minR, maxR, minC, maxC, max, count } : null;
}
