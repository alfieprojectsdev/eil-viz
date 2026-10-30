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
