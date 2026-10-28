import { CheckCircleIcon, WarningIcon, StopIcon } from "./Icons";
import "./VerdictStamp.css";

const ICON = { safe: CheckCircleIcon, review: WarningIcon, danger: StopIcon };

// The overall verdict. Certified is outlined, review is dashed, not
// certified is a solid block, so the three differ in shape as well as hue.
export default function VerdictStamp({ status, tone }) {
  const Icon = ICON[tone] ?? StopIcon;
  return (
    <div className={`verdict-stamp verdict-stamp-${tone}`}>
      <Icon size={28} />
      <span>{status}</span>
    </div>
  );
}
