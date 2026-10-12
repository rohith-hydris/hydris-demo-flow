// V2 Section 16: the connected demo journey, as links only. A navigation aid, not a wizard: every step is a page that already exists.

export interface JourneyStep { id: string; label: string; href: string }

export const JOURNEY_FACTORY = "F12";

export const JOURNEY_STEPS: JourneyStep[] = [
  { id: "risk", label: "Risk", href: `/factories/${JOURNEY_FACTORY}?tab=risk` },
  { id: "assessment", label: "Assessment (Lite finding)", href: "/projects?tab=opportunities" },
  { id: "opportunity", label: "Opportunity", href: "/projects?tab=catalogue" },
  { id: "comparison", label: "Project comparison", href: "/projects?tab=scenarios" },
  { id: "case", label: "Business case", href: "/projects/scenarios/S1" },
  { id: "evidence", label: "Evidence review", href: "/claims" },
  { id: "impact", label: "Impact", href: `/impact?factory=${JOURNEY_FACTORY}` },
  { id: "reporting", label: "Reporting", href: `/copilot?agent=evidence&task=brsr-p6&factory=${JOURNEY_FACTORY}` },
];

/** The step a Projects tab belongs to, so the strip can mark where you are. */
export const STEP_FOR_PROJECTS_TAB: Record<string, string> = { opportunities: "assessment", catalogue: "opportunity", scenarios: "comparison" };
