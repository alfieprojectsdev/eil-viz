import { SLOPE_STATUS, DEPOSITIONAL_STATUS, OVERALL_STATUS } from "../constants/status";
import "./StatusBadge.css";

// Exact matches only: substring checks once let "NOT CERTIFIED" match
// "CERTIFIED" and render green. Anything unrecognised, PENDING included,
// falls through to danger.
const BADGE_CLASS = {
  [OVERALL_STATUS.CERTIFIED]: "badge-safe",
  [OVERALL_STATUS.REVIEW]: "badge-review",
  [OVERALL_STATUS.NOT_CERTIFIED]: "badge-danger",
  [SLOPE_STATUS.SAFE]: "badge-safe",
  [SLOPE_STATUS.FLAG]: "badge-review",
  [SLOPE_STATUS.SUSCEPTIBLE]: "badge-danger",
  [DEPOSITIONAL_STATUS.SAFE]: "badge-safe",
  [DEPOSITIONAL_STATUS.PRONE]: "badge-danger",
};

function statusBadge(status) {
  return BADGE_CLASS[status] ?? "badge-danger";
}

export default function StatusBadge({ status }) {
  return <span className={`status-badge ${statusBadge(status)}`}>{status}</span>;
}
