import { StatusPill } from "./StatusPill";

/** V2 ADDENDUM 0: amber badge for any method, parameter or rule that is a proposal, never presented as approved policy. */
export const ProposedBadge = ({ label = "Proposed, under review", className = "" }: { label?: string; className?: string }) => (
  <StatusPill tone="caution" shape="diamond" label={label} className={className} />
);
