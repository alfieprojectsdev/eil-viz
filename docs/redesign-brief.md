# Redesign brief

Input for redesigning the eil-viz UI in Claude Design. It describes what the screen has to show, the states it has to handle and the constraints the design can't break. Written 2026-10-27 against commit `d8c3cd5`.

Standalone Claude Design (claude.ai/design) closes on 2026-12-14; the design work happens in Claude itself, as a Design artifact. The output is a visual design, not code. It gets implemented in this repo by hand afterwards.

## Who uses it and how they arrive

Hazard assessors check whether a land parcel is safe from earthquake-induced landslides. They reach the app two ways:

1. From the PHAST Chrome extension (Map Tools → EIL Analysis). The parcel comes in a `?geo=` URL parameter and the assessment starts on load. The assessor never sees the GeoJSON.
2. By pasting GeoJSON into the sidebar textarea and clicking **Run Assessment**.

The assessor needs one answer (certified or not) and enough evidence to defend it: which slope band covers how much of the lot, and which uphill path threatens it.

## Screen inventory

Current layout: a fixed 360 px sidebar on the left, the dashboard filling the rest, everything at 100vh with no page scroll. Desktop only.

| State | What's shown today | Problem |
|---|---|---|
| Empty | One line of text: "Paste a GeoJSON polygon..." | Nothing for the PHAST path, where the textarea is irrelevant |
| Loading | Button text changes to "Computing..." | An assessment can take minutes (nginx allows 300 s). No progress or elapsed time |
| Error | Red box in the sidebar with the backend's message | Same red box for bad input, missing DEM and "couldn't compute" |
| Result: header | Project ID, data-source chip, overall badge, phase breadcrumb | Status is told by colour alone |
| Result: slope tab | Canvas heatmap + legend + colour key; cards for max/avg slope, threshold, "Algorithm ∇z"; Assessment Logic card; "Why a heatmap?" card | Coverage percentages that decide the verdict aren't returned or shown, only max/avg slope |
| Result: runout tab | Elevation area chart with peak/site dots and 3×ΔE line; path dropdown (≤3); five metric cards; H vs 3×ΔE box; five-step algorithm card | Legend refers to a shaded zone that isn't drawn |

Edge cases the design has to cover:

- A flat or hilltop parcel: eil-calc returns one dummy transect with a single path point and every metric `0`. The chart has nothing to draw.
- One transect only: the dropdown is hidden.
- Mixed results: path 1 PRONE, paths 2–3 SAFE. The overall depositional status is PRONE; the selected path's badge can say SAFE.
- Large parcels: `_viz_grid` can be hundreds of cells across (the old sample is a 38k-line JSON file).

## Data available

The full response contract is in the README ("Backend contract"). Per result there is:

- `overall_status`: CERTIFIED SAFE, MANUAL REVIEW REQUIRED or NOT CERTIFIED.
- Slope: status, max and average slope, a 2-D grid of per-pixel slope (null outside the parcel).
- Runout: overall status, and per path (up to 3): peak and site elevation, ΔE, H, 3×ΔE, compliant flag, `threat_ratio` (unused today) and the `{dist_m, elev_m}` profile.
- `data_source`: ifsar (5 m), srtm (30 m) or local_override.

Not available without a backend change: coverage fractions per slope band, parcel area, the parcel's location or shape in map coordinates, when the DEM was captured. If the design wants any of these, list them so they can go to the eil-calc session.

## Constraints

- A failed parcel must never look certified. The three overall statuses need distinct treatments that don't depend on colour alone: the slope scale and every badge currently rely on red versus green.
- No requests to other origins at runtime. The app runs on a LAN without internet access, so no web fonts from a CDN, no hosted map tiles, no icon CDNs. Fonts are DM Sans and Space Mono, vendored in `public/fonts/`. A new typeface means re-running `scripts/vendor-fonts.sh`.
- Thresholds (14°, 16°, 1.5%, 10%, 3×ΔE) come from eil-calc and change only after review. The design can present them but not move them.
- Recharts draws the profile; the heatmap is a plain canvas. Either can be swapped, but the bundle is already 564 kB.
- Dark theme only today, built on oklch tokens in `src/index.css` (hue 160).

## Questions only Alfie can answer

<!-- Fill in before starting the design. -->

- Should a result be printable or exportable as a certificate or report?
- Is a light theme or a mobile/tablet layout wanted?
- Should the parcel be shown on a map? That needs offline tiles or a DEM hillshade from eil-calc.
- Is the sidebar still needed when PHAST is the usual entry point?
- What do assessors currently do with the result: screenshot it, copy numbers, file it somewhere?

## Plan

1. Fix the safety bugs first, because they shouldn't wait for a redesign: the NOT CERTIFIED badge, the 422 message, the hard-coded `5m`. (Done on branch `docs-sync-and-status-fixes`.)
2. Refactor with no visual change: split `EILViz.jsx` into components, move its `<style>` block into CSS files and replace inline rgba/hex values with tokens. The redesign then lands as token and component changes. (Done on branch `claude/hungry-chatterjee-431f4d`.)
3. Capture fresh fixtures from eil-calc (one each for CERTIFIED SAFE, MANUAL REVIEW REQUIRED, NOT CERTIFIED, flat parcel, 422) and screenshot every state above. Replace the stale `sample_payload.json`.
4. Design in Claude from this brief, the screenshots and the fixtures.
5. Implement the design against the fixtures, then check it live against eil-calc.
