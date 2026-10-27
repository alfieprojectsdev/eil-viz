# eil-viz

React 19 + Vite 7 frontend for eil-calc (`../eil-calc`, github.com/alfieprojectsdev/eil-calc).
eil-calc is worked on in its own session. Don't edit it from here; report backend issues instead.

## Layout

- `src/App.jsx`: sidebar, GeoJSON parsing, `?geo=` (base64, from the PHAST extension), `POST /api/v1/assess`.
- `src/components/EILViz.jsx`: the whole dashboard (~850 lines), including its CSS in one `<style>` block.
- `src/constants/status.js`: hand-copied mirror of eil-calc's `eil_status.py` enums and the
  thresholds in `slope_stability.py` (14°/16°, 1.5%/10%). Keep it in step when the backend changes.
- `src/index.css`: `--color-*` oklch tokens. EILViz still hard-codes many rgba/hex colours inline.

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
