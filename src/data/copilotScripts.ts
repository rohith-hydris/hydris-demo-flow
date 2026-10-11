import type { Role } from "@/src/lib/roles";
import type { CheckResult, ReviewStates } from "@/src/lib/types";

// The copilot's scripted conversations (PRODUCT 4.7 and sections 7 to 9), as data.
//
// Rule 1 of the PRD: code computes, scripted text explains. Every figure below is a {{token}} that src/lib/tokens.ts
// fills from the data layer when the answer plays, so text and screens cannot disagree. What stays literal is narrative
// that the spec states as a finding ("2 of 5 photos match images already submitted for another claim").

export type AgentId = "copilot" | "evidence" | "validation";
export type ScriptId = "C1" | "C2" | "C3" | "C4" | "C5" | "C6" | "C7" | "C8" | "C9" | "V1" | "V2" | "V3" | "V4" | "V5" | "E1" | "E2";

export interface AgentDef { id: AgentId; name: string; blurb: string; brandOnly: boolean; placeholder: string }

export const agents: AgentDef[] = [
  { id: "copilot", name: "Stewardship Copilot", brandOnly: false, placeholder: "Ask about risk, ranking, impact or suppliers",
    blurb: "Answers questions about risk, ranking, impact and suppliers, with a source on every figure." },
  { id: "evidence", name: "Evidence & Disclosure agent", brandOnly: false, placeholder: "Ask for a report or an evidence check",
    blurb: "Checks report readiness and drafts cited reports. No evidence, no number." },
  { id: "validation", name: "Validation agent", brandOnly: true, placeholder: "Ask to validate a claim, report or inspection",
    blurb: "Validates claims, audit reports and field inspections before they count as evidence." },
];

// ---- Fixed replies (PRODUCT 2 and 4.7) -----------------------------------------------------------------------------------
export const FALLBACK_REPLY = "In this demo I can answer the suggested questions. Pick one below to continue.";
export const ROUTE_TO_VALIDATION = "That is a validation question. I'm switching you to the Validation agent.";
export const ROUTE_TO_EVIDENCE = "That is an evidence and reporting question. I'm switching you to the Evidence & Disclosure agent.";
export const ROUTE_TO_COPILOT = "That is a question for the Stewardship Copilot. I'm switching you to it.";
export const UNSCRIPTED_ITEM_REPLY = "The demo has scripted checks for a few items only, and this one is not among them. Pick one below to continue.";
export const NO_METER_DATA_REPLY = "No evidence, no number. There is no water meter log by source loaded for this site in the demo, so I can't draft its BRSR Principle 6 section.";

// ---- Types for the answer blocks -------------------------------------------------------------------------------------------
export type CitationSpec = { label: string; href?: string; trace?: { kind: "ledger"; id: string } };

export type LocalActionId =
  | "request-evidence" | "confirm-flag" | "override" | "confirm-inspection" | "request-retake"
  | "ask-missing-weeks" | "ask-current-audit" | "business-case" | "request-uploads";

export type ActionSpec =
  | { kind: "navigate"; label: string; href: string; primary?: boolean }
  | { kind: "local"; label: string; id: LocalActionId; done: string; reasonRequired?: boolean; primary?: boolean; roles?: Role[] };

export interface CheckSpec { name: string; result: CheckResult; reason?: string; cite?: CitationSpec }

export type BlockSpec =
  | { kind: "text"; text: string; /** Skip this block when the site is outside the scope in force. */ when?: { site: string } }
  | { kind: "ranking"; count: number }
  | { kind: "avgGrid" }
  | { kind: "table"; columns: string[]; rows: string[][] }
  | { kind: "offTrack" }
  | { kind: "techTable" }
  | { kind: "checklist"; title: string; /** V2 14: the five states this verdict sets. Others are unchanged. */ states: Partial<ReviewStates>; /** Project whose current states fill the unchanged rows. */ project?: string; checks: CheckSpec[]; verdict: { label: string; tone: "negative" | "caution" | "positive" | "neutral"; effect: string } }
  | { kind: "inspection"; id: string; states: Partial<ReviewStates> }
  | { kind: "affected" }
  | { kind: "liteImport" }
  | { kind: "readiness" }
  | { kind: "brsr" }
  | { kind: "gapReport" }
  | { kind: "citations"; items: CitationSpec[] }
  | { kind: "actions"; items: ActionSpec[] };

export interface ScriptDef {
  id: ScriptId; agent: AgentId;
  /** Who is offered this as a suggested prompt. */
  roles: Role[];
  prompt: string; promptByRole?: Partial<Record<Role, string>>;
  /** A shorter label for the left rail. */
  short: string;
  /** Loose keyword match: any inner list whose words all appear (case-insensitive) selects this script. */
  match: string[][];
  /** Tool names shown as chips while the answer works (demo labels for the tool-only copilot). */
  tools: string[];
  /** A site that must be in scope for this script to run. */
  requiresSite?: string;
  /** A routing script plays another script after a short note (C5 hands over to V3). */
  routeTo?: ScriptId; routeNote?: string;
  blocks: BlockSpec[];
}

const chk = (name: string, result: CheckResult, reason?: string): CheckSpec => ({ name, result, reason });

export const scripts: ScriptDef[] = [
  // ============================================================ Stewardship Copilot (section 7)
  {
    id: "C1", agent: "copilot", roles: ["brand", "supplier"], short: "Which sites first?",
    prompt: "Which sites should we act on first?", promptByRole: { supplier: "Which of our factories should we act on first?" },
    match: [["act", "first"], ["which", "sites"], ["prioriti"], ["which", "factories", "first"]],
    tools: ["get_site_ranking", "get_basin_risk"],
    blocks: [
      { kind: "text", text: "Start with **{{rank.1.name}}**, then **{{rank.2.name}}**. {{rank.top2.tiers}}" },
      { kind: "ranking", count: 5 },
      { kind: "text", text: "{{rank.1.name}} is in Band {{rank.1.band}} (R {{rank.1.R}}) with the largest footprint in the band (I {{rank.1.I}}). Rank shows priority for action, not performance." },
      { kind: "citations", items: [{ label: "Module 02 · Ranking", href: "/ranking" }, { label: "Module 01 · Basin Risk", href: "/factories/{{rank.1.id}}?tab=risk" }] },
      { kind: "actions", items: [{ kind: "navigate", label: "Open ranking", href: "/ranking", primary: true }] },
    ],
  },
  {
    id: "C2", agent: "copilot", roles: ["brand", "supplier"], short: "What is our water impact?",
    prompt: "What is our water impact?",
    match: [["water", "impact"], ["pwi"], ["positive", "water"]],
    tools: ["get_portfolio_pwi", "get_pwi_grid"],
    blocks: [
      { kind: "text", text: "{{scope.pwiName}} is **{{portfolio.unweighted}}** unweighted and **{{portfolio.rnWeighted}}** RN-weighted. {{portfolio.weightingNote}}" },
      { kind: "avgGrid" },
      { kind: "text", text: "The weakest area {{scope.phrase}} is **{{weakest.1.label}}** (average cell score {{weakest.1.avg}}), followed by **{{weakest.2.label}}** ({{weakest.2.avg}})." },
      { kind: "text", when: { site: "F12" }, text: "The next best project for {{site.F12.name}} is a basin Quality project (P3 Quality scores {{F12.P3Q}} today because none is registered)." },
      { kind: "text", when: { site: "F12" }, text: "{{site.F12.name}} sits in the internal status band **{{F12.statusBand}}**. Internal status. Not an external certification." },
      { kind: "text", text: "No site is Net Positive. A client-facing claim needs external assurance." },
      { kind: "citations", items: [{ label: "Module 03 · Impact", href: "/factories/F12?tab=impact" }, { label: "Impact Ledger", href: "/factories/F12?tab=impact" }] },
      { kind: "actions", items: [{ kind: "navigate", label: "Open factory", href: "/factories/F12?tab=impact" }] },
    ],
  },
  {
    id: "C3", agent: "copilot", roles: ["brand", "supplier"], short: "Why did Ambattur's score drop?",
    prompt: "Why did Ambattur's sub-basin score drop last month?",
    match: [["ambattur", "drop"], ["sub-basin", "drop"], ["score", "drop"], ["why", "dropped"], ["why", "drop"]],
    tools: ["get_ledger_diff"], requiresSite: "F12",
    blocks: [
      { kind: "text", text: "Sub-basin Availability at **{{site.F12.name}}** moved from **{{ledger.LE-2291.p2a}}** to **{{ledger.LE-2347.p2a}}**. Site PWI moved from {{F12.priorPwi}} to {{F12.pwi}}." },
      {
        kind: "table", columns: ["Entry", "Period", "P2 Availability", "What changed"],
        rows: [
          ["{{ledger.LE-2291.id}}", "{{ledger.LE-2291.period}}", "{{ledger.LE-2291.p2a}}", "Desilting at {{ledger.LE-2291.fills}} fills per year"],
          ["{{ledger.LE-2347.id}}", "{{ledger.LE-2347.period}}", "{{ledger.LE-2347.p2a}}", "Desilting recomputed to {{ledger.LE-2347.fills}} fills per year after an IMD rainfall update"],
        ],
      },
      { kind: "text", text: "No project was removed. The change came from an updated input, not a lost project." },
      { kind: "citations", items: [{ label: "LE-2291", trace: { kind: "ledger", id: "LE-2291" } }, { label: "LE-2347", trace: { kind: "ledger", id: "LE-2347" } }] },
      { kind: "actions", items: [{ kind: "navigate", label: "Open factory", href: "/factories/F12?tab=impact" }] },
    ],
  },
  {
    id: "C4", agent: "copilot", roles: ["brand", "supplier"], short: "Who is off-track?",
    prompt: "Which suppliers are off-track?", promptByRole: { supplier: "Which of our plants are off-track?" },
    match: [["off-track"], ["off track"], ["suppliers", "track"], ["plants", "track"], ["needs", "attention"]],
    tools: ["get_alerts", "get_tier_history", "get_benefits"],
    blocks: [
      { kind: "text", text: "{{offtrack.sentence}}" },
      { kind: "offTrack" },
      { kind: "text", text: "{{offtrack.onTrackSentence}}" },
      { kind: "actions", items: [{ kind: "navigate", label: "Open alerts", href: "/portfolio#alerts", primary: true }] },
    ],
  },
  {
    id: "C5", agent: "copilot", roles: ["brand"], short: "Can I trust the Ambattur inspection?",
    prompt: "Can I trust the inspection at Ambattur?",
    match: [["trust", "inspection"], ["inspection", "ambattur"], ["trust", "ambattur"]],
    tools: [], requiresSite: "F12", routeTo: "V3", routeNote: ROUTE_TO_VALIDATION, blocks: [],
  },
  {
    id: "C6", agent: "copilot", roles: ["brand"], short: "Which technology fits Karur?",
    prompt: "Which technology fits Karur Finishing Works?",
    match: [["technology", "karur"], ["tech", "karur"], ["technology", "fit"], ["which", "technology"]],
    tools: ["match_technology"], requiresSite: "F04",
    blocks: [
      { kind: "text", text: "Three technologies pass the hard filters for **{{site.F04.name}}**. Match is {{match.weights}}." },
      { kind: "techTable" },
      { kind: "citations", items: [{ label: "Module 06 · Technology match" }, { label: "Illustrative scores" }] },
      {
        kind: "actions", items: [
          { kind: "local", label: "Draft a prove-and-scale business case", id: "business-case", done: "Business case drafted below.", primary: true },
          { kind: "navigate", label: "Open factory", href: "/factories/F04" },
        ],
      },
    ],
  },

  // ============================================================ V2 addendum scripts (section 15)
  {
    id: "C7", agent: "copilot", roles: ["brand", "supplier"], short: "Which projects close Ambattur gaps?",
    prompt: "Which projects would close Ambattur's gaps?",
    match: [["projects", "gaps"], ["project", "close", "gap"], ["close", "gaps"], ["scenarios"]],
    tools: ["get_scenarios", "get_pwi_grid"], requiresSite: "F12",
    blocks: [
      { kind: "text", text: "I compared three scenarios for **{{site.F12.name}}** with the no-project baseline (PWI {{scenario.S0.pwi}}, volumetric balance {{scenario.S0.balance}}). Every figure is a **Forecast** and a **Demo estimate**, not a measured result." },
      {
        kind: "table", columns: ["Scenario", "Opportunities", "Site PWI forecast (low)", "Volumetric balance (low)", "Capex", "Payback"],
        rows: ["S1", "S2", "S3"].map((id) => [`${id} {{scenario.${id}.name}}`, `{{scenario.${id}.items}}`, `{{scenario.${id}.pwiBoth}}`, `{{scenario.${id}.balanceBoth}}`, `{{scenario.${id}.capex}}`, `{{scenario.${id}.payback}}`]),
      },
      { kind: "text", text: "**Efficiency and reuse (S2) raise volumetric balance** ({{scenario.insight.reuseBalance}} points) **but barely move PWI** ({{scenario.insight.reusePwi}} points), because P1 Availability is already near its cap. **Basin projects move PWI** ({{scenario.insight.basinPwi}} points under S1). Where there is no financial payback, the stewardship value still counts." },
      { kind: "citations", items: [{ label: "Module 03 · Impact", href: "/factories/F12?tab=impact" }, { label: "Scenarios S1 to S3", href: "/projects?tab=scenarios" }, { label: "Demo estimates" }] },
      { kind: "actions", items: [{ kind: "navigate", label: "Open scenarios", href: "/projects?tab=scenarios", primary: true }] },
    ],
  },
  {
    id: "C8", agent: "copilot", roles: ["brand", "supplier"], short: "What changed since the BRSR report?",
    prompt: "What changed since the BRSR report was released?",
    match: [["since", "brsr"], ["changed", "brsr"], ["brsr", "released"], ["what changed"]],
    tools: ["get_ledger_diff", "get_affected_outputs"], requiresSite: "F12",
    blocks: [
      { kind: "text", text: "The released **BRSR Principle 6 FY2025-26** snapshot is **unchanged**. The IMD rainfall update ({{ledger.LE-2347.id}}) changed PRJ-101 desilting from {{affected.fillsBefore}} to {{affected.fillsAfter}} fills per year, and **{{affected.flagged}} draft outputs are flagged for review**." },
      { kind: "affected" },
      { kind: "text", text: "{{affected.banner}}" },
      { kind: "citations", items: [{ label: "LE-2347", trace: { kind: "ledger", id: "LE-2347" } }, { label: "Affected outputs", href: "/factories/F12?tab=impact" }] },
      { kind: "actions", items: [{ kind: "navigate", label: "Open affected outputs", href: "/factories/F12?tab=impact", primary: true }] },
    ],
  },
  {
    id: "C9", agent: "copilot", roles: ["brand", "supplier"], short: "Import the Lite findings",
    prompt: "Import the Lite findings for Ambattur",
    match: [["import", "lite"], ["lite", "findings"], ["import", "findings"]],
    tools: ["list_lite_findings", "import_opportunity"], requiresSite: "F12",
    blocks: [
      { kind: "text", text: "{{lite.summary}}" },
      { kind: "liteImport" },
      { kind: "citations", items: [{ label: "LA-0187 (12 Aug 2026)" }, { label: "Projects · Opportunities", href: "/projects?tab=opportunities" }] },
      { kind: "actions", items: [{ kind: "navigate", label: "Open opportunities", href: "/projects?tab=opportunities", primary: true }] },
    ],
  },

  // ============================================================ Validation agent (section 8, brand only)
  {
    id: "V1", agent: "validation", roles: ["brand"], short: "Noyyal check dam (PRJ-201)",
    prompt: "Validate the Noyyal check dam claim (PRJ-201)",
    match: [["prj-201"], ["noyyal", "check dam"]],
    tools: ["get_project_claim", "run_claim_checks"], requiresSite: "F02",
    blocks: [
      { kind: "text", text: "I ran eight checks on **{{project.PRJ-201.name}}** ({{project.PRJ-201.id}}), claimed at {{project.PRJ-201.claimed}} at {{site.F02.name}}." },
      {
        kind: "checklist", title: "Sub-basin project claim: PRJ-201", project: "PRJ-201",
        states: { evidenceAcceptance: "Rejected", calculationValidity: "Needs recalculation", benefitState: "Not validated", claimEligibility: "Allocation conflict" },
        checks: [
          chk("Project inside the sub-basin polygon", "Pass"),
          chk("Hydrologically connected to the site's source", "Pass"),
          chk("Baseline and counterfactual recorded", "Pass"),
          chk("Additional to legal requirement", "Pass"),
          chk("Photo not reused (perceptual hash)", "Fail", "2 of 5 photos match images already submitted for another claim."),
          chk("Photo inside the project geofence", "Fail", "Capture location is 4.2 km from the registered site."),
          chk("Monitoring log current", "Warn", "Last check 71 days ago; claim lapses at 90 days."),
          chk("No double claim", "Fail", "Another brand also claims 40% of this check dam."),
        ],
        verdict: {
          label: "Fail. Claim flagged.", tone: "negative",
          effect: "Claimed {{project.PRJ-201.claimed}}; counted {{project.PRJ-201.counted}}. Low value shown: {{project.PRJ-201.low}}. Effect on {{site.F02.name}}: P2 Availability stays at {{F02.P2A}}, status {{F02.P2A.state}}.",
        },
      },
      { kind: "citations", items: [{ label: "PRJ-201", href: "/factories/F02?tab=projects" }] },
      {
        kind: "actions", items: [
          { kind: "local", label: "Request evidence from supplier", id: "request-evidence", done: "Evidence request sent to the supplier (demo)." },
          { kind: "local", label: "Confirm flag", id: "confirm-flag", done: "Flag confirmed and logged.", primary: true },
          { kind: "local", label: "Override with reason", id: "override", reasonRequired: true, done: "Override logged with your reason." },
        ],
      },
    ],
  },
  {
    id: "V2", agent: "validation", roles: ["brand"], short: "Pallikaranai wetland (PRJ-103)",
    prompt: "Validate the Pallikaranai wetland claim (PRJ-103)",
    match: [["prj-103"], ["pallikaranai"]],
    tools: ["get_project_claim", "run_claim_checks"], requiresSite: "F12",
    blocks: [
      { kind: "text", text: "I ran eight checks on **{{project.PRJ-103.name}}** ({{project.PRJ-103.id}}), a basin claim of {{project.PRJ-103.claimed}} at {{project.PRJ-103.share}} attribution." },
      {
        kind: "checklist", title: "Basin project claim: PRJ-103", project: "PRJ-103",
        states: { evidenceAcceptance: "Accepted" },
        checks: [
          chk("Inside the basin polygon", "Pass"),
          chk("Connected to the site's source", "Pass"),
          chk("Collective agreement on file", "Pass"),
          chk("Funding share evidence supports the attribution", "Pass"),
          chk("No double claim (shares across partners total 100%)", "Pass"),
          chk("Independent verifier engaged", "Pass"),
          chk("Inundation area measured from satellite water data (JRC)", "Warn", "Mean depth is an engineering estimate, grade B."),
          chk("Monitoring log current", "Pass"),
        ],
        verdict: {
          label: "Validated with one warning", tone: "caution",
          effect: "Counted {{project.PRJ-103.counted}} ({{project.PRJ-103.claimed}} x {{project.PRJ-103.share}}). Low value shown: {{project.PRJ-103.low}}. Effect: P3 Availability {{F12.P3A}}.",
        },
      },
      { kind: "citations", items: [{ label: "PRJ-103", href: "/factories/F12?tab=projects" }] },
      { kind: "actions", items: [{ kind: "navigate", label: "Open project", href: "/factories/F12?tab=projects" }] },
    ],
  },
  {
    id: "V3", agent: "validation", roles: ["brand"], short: "Ambattur inspection (INS-0412)",
    prompt: "Can I trust the Ambattur inspection (INS-0412)?",
    match: [["ins-0412"], ["trust", "ambattur", "inspection"]],
    tools: ["get_inspection_report", "run_step_checks"], requiresSite: "F12",
    blocks: [
      { kind: "text", text: "**{{inspection.INS-0412.id}}** at {{site.F12.name}} has {{inspection.INS-0412.steps}} steps. Trust score {{inspection.INS-0412.trust}}, report status **{{inspection.INS-0412.status}}**." },
      { kind: "inspection", id: "INS-0412", states: { evidenceAcceptance: "Pending" } },
      { kind: "citations", items: [{ label: "INS-0412", href: "/factories/F12?tab=evidence" }] },
      {
        kind: "actions", items: [
          { kind: "local", label: "Confirm", id: "confirm-inspection", done: "Inspection confirmed and logged.", primary: true },
          { kind: "local", label: "Override with reason", id: "override", reasonRequired: true, done: "Override logged with your reason." },
          { kind: "local", label: "Request retake", id: "request-retake", done: "Step {{inspection.INS-0412.failStep}} sent back to the field team." },
        ],
      },
    ],
  },
  {
    id: "V4", agent: "validation", roles: ["brand"], short: "Tiruppur lab report",
    prompt: "Validate the ETP lab report for Tiruppur Mill",
    match: [["lab report", "tiruppur"], ["etp lab report"], ["lab report", "f01"]],
    tools: ["get_report_file", "run_report_checks"], requiresSite: "F01",
    blocks: [
      { kind: "text", text: "I ran six checks on the lab report for **{{site.F01.name}}**." },
      {
        kind: "checklist", title: "Audit report: ETP lab report, Tiruppur Mill",
        states: { evidenceAcceptance: "Rejected" },
        checks: [
          chk("Lab is NABL accredited", "Pass"),
          chk("Report period covers FY2025-26", "Pass"),
          chk("Weekly sample coverage", "Fail", "{{doc.F01-D04.detail}}."),
          chk("Hash unchanged since upload", "Pass"),
          chk("Plausible units and ranges", "Pass"),
          chk("OCEMS against lab COD agree within tolerance", "Warn", "{{doc.F01-D03.detail}}"),
        ],
        verdict: {
          label: "Failed check. Not accepted as full-year evidence.", tone: "negative",
          effect: "{{site.F01.name}} evidence grade stays {{F01.grade}}. Until the missing weeks arrive, its Quality cells should carry Low confidence.",
        },
      },
      { kind: "citations", items: [{ label: "Lab reports, FY2025-26", href: "/factories/F01?tab=evidence" }] },
      { kind: "actions", items: [{ kind: "local", label: "Ask supplier for the missing weeks", id: "ask-missing-weeks", done: "Request for the missing weeks sent to the supplier (demo).", primary: true }] },
    ],
  },
  {
    id: "V5", agent: "validation", roles: ["brand"], short: "Avinashi audit report",
    prompt: "Check the Avinashi ETP audit report",
    match: [["avinashi", "audit"], ["avinashi", "etp"], ["audit report", "f02"]],
    tools: ["get_report_file", "run_report_checks"], requiresSite: "F02",
    blocks: [
      { kind: "text", text: "I ran five checks on the third-party ETP audit report for **{{site.F02.name}}**." },
      {
        kind: "checklist", title: "Audit report: third-party ETP audit, Avinashi Road Dye House",
        states: { evidenceAcceptance: "Rejected" },
        checks: [
          chk("Auditor accreditation", "Pass"),
          chk("Report date within period", "Fail", "The report is dated {{doc.F02-D11.period}}, which is out of period."),
          chk("Signatures and stamps present", "Pass"),
          chk("Findings consistent with OCEMS trend", "Warn"),
          chk("ZDHC tier consistent with report", "Warn", "The tier dropped {{F02.tierChangeAge}} days ago."),
        ],
        verdict: { label: "Expired / out of period", tone: "caution", effect: "A current third-party audit is needed." },
      },
      { kind: "citations", items: [{ label: "Third-party ETP audit report", href: "/factories/F02?tab=evidence" }] },
      { kind: "actions", items: [{ kind: "local", label: "Ask supplier for a current audit", id: "ask-current-audit", done: "Request for a current audit sent to the supplier (demo).", primary: true }] },
    ],
  },

  // ============================================================ Evidence & Disclosure agent (section 9)
  {
    id: "E1", agent: "evidence", roles: ["brand", "supplier"], short: "BRSR Principle 6, Ambattur",
    prompt: "Give me the BRSR Principle 6 water report for Ambattur Denim Unit",
    match: [["brsr"], ["principle 6"], ["water report"]],
    tools: ["get_document_readiness", "get_water_balance", "draft_brsr_p6"],
    blocks: [
      { kind: "text", text: "I will draft **BRSR Principle 6 (water)** for **{{brsr.site}}**, FY2025-26. First I check that the evidence is ready." },
      { kind: "brsr" },
    ],
  },
  {
    id: "E2", agent: "evidence", roles: ["brand", "supplier"], short: "Evidence gap report",
    prompt: "Evidence gap report for Kongu Knit Processing", promptByRole: { supplier: "Evidence gap report for Coromandel Denim Mills" },
    match: [["gap report"], ["evidence gap"], ["evidence", "missing"], ["documents", "missing"]],
    tools: ["get_document_readiness", "build_gap_report"],
    blocks: [
      { kind: "text", text: "Here is the evidence gap report for **{{gap.supplier}}**. Nothing is estimated: a gap stays a gap until a document is on file." },
      { kind: "gapReport" },
    ],
  },
];

// ---- "Validate with agent" deep links (PRODUCT 4.4, 4.6, 8) -----------------------------------------------------------------
// The item preloaded by /copilot?agent=validation&claim=...|report=...|inspection=...  Items without a script get a plain reply.
export const validationTargets: Record<string, ScriptId> = {
  "claim:PRJ-201": "V1",
  "claim:PRJ-103": "V2",
  "inspection:INS-0412": "V3",
  "report:F01-D04": "V4",
  "report:F02-D11": "V5",
};

// ---- C6 data: technology match (PRODUCT 7, C6). Scores are illustrative; Match is computed in src/lib/match.ts ----------
export interface Technology { id: string; name: string; technicalFit: number; expectedBenefit: number; operationalStability: number; dataQuality: number; nearMissOn?: string }

export const technologies: Technology[] = [
  { id: "tertiary", name: "Hydris tertiary polishing module", technicalFit: 0.9, expectedBenefit: 0.8, operationalStability: 0.6, dataQuality: 0.8 },
  { id: "ec", name: "Electrocoagulation retrofit", technicalFit: 0.8, expectedBenefit: 0.7, operationalStability: 0.6, dataQuality: 0.8 },
  { id: "mbr", name: "Membrane bioreactor upgrade", technicalFit: 0.7, expectedBenefit: 0.85, operationalStability: 0.4, dataQuality: 0.8, nearMissOn: "stability" },
];

/** The "prove-and-scale" business case (C6 button). TN removal improvements are illustrative pilot data, in percentage points. */
export const pilot = { low: 8, expected: 12, high: 15, targetPlants: ["F04", "F09"], source: "Illustrative pilot data" } as const;

export const businessCase: { title: string; sections: { heading: string; text: string; placeholder?: boolean }[] } = {
  title: "Prove-and-scale business case",
  sections: [
    { heading: "Recommendation", text: "Adopt the **{{tech.top.name}}** (match {{tech.top.match}}) at {{site.F04.name}}." },
    { heading: "Proof", text: "The pilot plant result is a TN removal improvement of **+{{pilot.expected}} percentage points** at the expected case." },
    { heading: "Target plants", text: "{{site.F04.name}} and {{site.F09.name}}." },
    { heading: "Projected impact", text: "TN removal improves by **+{{pilot.low}}** (low), **+{{pilot.expected}}** (expected) and **+{{pilot.high}}** (high) percentage points." },
    { heading: "Cost and payback", text: "[Placeholder: cost to be supplied]", placeholder: true },
    { heading: "Risks", text: "Operational stability is the weakest score for this option ({{tech.top.weakest}}). Prove it at one plant before scaling." },
    { heading: "Rollout", text: "Prove at {{site.F04.name}}, then extend to {{site.F09.name}}." },
    { heading: "The ask", text: "Approve a pilot at {{site.F04.name}}." },
  ],
};

// ---- E1 data: the BRSR Principle 6 draft (PRODUCT 9, E1) ----------------------------------------------------------------------
// [[ ]] marks a figure: it is highlighted and every sentence carries a citation chip that opens the source panel.
export interface DraftSentence { id: string; text: string; cite: string; source: { title: string; formula: string[]; docs: string[]; note?: string } }

export const brsrDraft: { title: string; sentences: DraftSentence[]; footer: string } = {
  title: "BRSR Principle 6, water: {{brsr.site}}, FY2025-26",
  sentences: [
    {
      id: "withdrawal", cite: "Water meter log, 12 of 12 months",
      text: "Total freshwater withdrawal was [[{{water.F12.withdrawal}}]].",
      source: { title: "Total freshwater withdrawal", formula: ["Sum of metered withdrawal across all sources"], docs: ["F12-D06"] },
    },
    {
      id: "breakdown", cite: "Meter log, by source",
      text: "By source: municipal [[{{water.F12.municipal}}]], groundwater [[{{water.F12.groundwater}}]], rainwater used [[{{water.F12.rainwater}}]] and third-party [[{{water.F12.thirdParty}}]].",
      source: { title: "Withdrawal by source", formula: ["Meter readings grouped by source"], docs: ["F12-D06"] },
    },
    {
      id: "discharge", cite: "Discharge statement · ETP-OUT-1 flow log",
      text: "Water discharged to the same basin within consent limits was [[{{water.F12.discharge}}]].",
      source: { title: "Compliant same-basin discharge", formula: ["Metered ETP outlet flow that stayed within consent limits"], docs: ["F12-D07", "F12-D05", "F12-D03"] },
    },
    {
      id: "recycled", cite: "Reuse meters, FY2025-26",
      text: "Water recycled or reclaimed on site was [[{{water.F12.recycled}}]].",
      source: { title: "Water recycled or reclaimed on site", formula: ["Recycled water plus reclaimed grey water, from the P1 Availability cell"], docs: [], note: "Reuse meters, FY2025-26" },
    },
    {
      id: "stress", cite: "Module 01 · Aqueduct 4.0",
      text: "The site is in a water-stressed area (Aqueduct baseline water stress score [[{{F12.bws}}]] of 5).",
      source: { title: "Baseline water stress", formula: ["Aqueduct 4.0 baseline water stress score, 0 to 5"], docs: [], note: "Module 01 · Aqueduct 4.0" },
    },
  ],
  footer: "Draft only. Disclosure needs a Locked period and audited ledger entries.",
};

/** What the agent offers for each readiness problem (never an estimate). */
export const gapActionByState: Record<string, string> = {
  Missing: "Upload the document.",
  "Failed check": "Upload the missing records so the check passes.",
  "Expired / out of period": "Upload a current document.",
  "Low confidence": "Have a person confirm the scanned pages.",
  Attention: "Explain the difference and keep the source of record.",
};
