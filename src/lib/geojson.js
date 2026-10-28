// Pulls the bare Polygon geometry out of pasted GeoJSON. Accepts a Polygon,
// a Feature, or a FeatureCollection, whose first Polygon feature is used.
// Throws an Error whose message is shown to the assessor.
export function extractPolygon(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("This isn't valid JSON.");
  }

  let geometry;
  if (parsed?.type === "FeatureCollection") {
    if (!parsed.features?.length) throw new Error("The FeatureCollection is empty.");
    // PHIVOLCS ground truth tools sometimes output a Polyline as the first
    // feature, so look for the Polygon rather than taking features[0].
    const feature = parsed.features.find(f => f?.geometry?.type === "Polygon");
    if (!feature) throw new Error("The FeatureCollection has no Polygon feature.");
    geometry = feature.geometry;
  } else if (parsed?.type === "Feature") {
    geometry = parsed.geometry;
  } else {
    geometry = parsed;
  }

  if (geometry?.type !== "Polygon") {
    throw new Error(`Expected a Polygon, found ${geometry?.type ?? "no geometry"}.`);
  }
  const ring = geometry.coordinates?.[0];
  if (!Array.isArray(ring) || ring.length < 4) {
    throw new Error("The polygon needs at least three corners and a closing point.");
  }
  return { geometry, corners: ring.length - 1 };
}
