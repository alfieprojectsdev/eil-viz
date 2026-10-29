import { WarningIcon } from "./Icons";
import "./RunoutCaution.css";

// Interim, until eil-calc's H rule is settled. eil-calc measures H along its
// computed downhill path; the PHIVOLCS method (OHAS slide 30) measures a
// straight horizontal line from the source, roughly where the slope changes
// most, to the edge of the lot, which can be much shorter. On
// eil-calc's test fixtures every SAFE path turned PRONE under the straight
// line, so a runout SAFE isn't shown without telling the assessor to check it.
export default function RunoutCaution({ title, children }) {
  return (
    <section className="runout-caution" role="note" aria-label={title}>
      <WarningIcon size={20} />
      <div className="runout-caution-body">
        <span className="runout-caution-title">{title}</span>
        <span>{children}</span>
      </div>
    </section>
  );
}
