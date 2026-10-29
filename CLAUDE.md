# eil-viz

React 19 + Vite 7 frontend for eil-calc (`../eil-calc`, github.com/alfieprojectsdev/eil-calc).
eil-calc is worked on in its own session. Don't edit it from here; report backend issues instead.

## Layout

- `src/App.jsx`: screen state (entry, loading, result, error), `#geo=` (base64, from the PHAST
  extension; `?geo=` from older builds), cancel. `src/lib/api.js` does the
  `POST /api/v1/assess`, the 5-minute timeout and error classification;
  `src/lib/geojson.js` extracts the Polygon.
- `src/components/`: one component per file, each importing the `.css` file of the same name.
  `ResultScreen` composes the verdict band, check cards, `SlopeView` and `RunoutView`;
  `ResultBoundary` sends a result that can't be drawn to `ErrorScreen`.
- `src/lib/assessment.js`: status → tone (exact match, unknown → danger), the displayed verdict
  (never CERTIFIED unless both checks are SAFE), and thresholds/limits read from the response.
- `src/constants/status.js`: hand-copied mirror of eil-calc's `eil_status.py` enums, plus fallback
  thresholds (14°/16°, 1.5%/10%) for backends that don't report them. Keep it in step.
- `src/index.css`: `--color-*` tokens (neutrals, accent, status, slope scale, profile), the
  print token set, and shared `.btn`/`.card` styles. Components use `var(--color-*)`; the canvas
  heatmap reads resolved values through `src/lib/tokens.js`. Don't put literal colours in components.

## Commands

- `npm run dev` / `npm run build` / `npm run lint`. No tests.
- Node >= 20.19.
- Dev proxy target: `VITE_DEV_API_TARGET` (default `http://127.0.0.1:8000`).

## Constraints

- Same-origin only: the app fetches relative `/api/...`; Vite (dev) or nginx (`EIL_API_UPSTREAM`,
  Docker) forwards it. eil-calc runs with CORS off. Don't reintroduce absolute API URLs.
- No runtime requests to third-party origins. The deploy target is a restricted-egress LAN.
  Fonts are vendored via `scripts/vendor-fonts.sh`; no CDN scripts, styles or fonts.
- Status display is safety-relevant: a failed parcel must never look certified. eil-calc fails
  closed (422 rather than a partial 200); the UI has to surface that, not paper over it.

## Docs

- `README.md`: setup, backend contract, reviewer guide, known limitations (keep them current).
- `docs/redesign-brief.md`: input for the planned redesign in Claude Design.
