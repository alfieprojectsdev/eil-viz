import { toneOf } from "../lib/assessment";
import { TickIcon, ExclaimIcon, CrossIcon } from "./Icons";
import "./StatusBadge.css";

const ICON = { safe: TickIcon, review: ExclaimIcon, danger: CrossIcon };

// Small check-level badge. `label` overrides the text (e.g. "SAFE (beyond
// runout)"); the tone always comes from the raw status.
export default function StatusBadge({ status, label }) {
  const tone = toneOf(status);
  const Icon = ICON[tone];
  return (
    <span className={`status-badge status-badge-${tone}`}>
      <Icon size={14} />
      {label ?? status ?? "UNKNOWN"}
    </span>
  );
}
