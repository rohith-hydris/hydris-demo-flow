import type { RiskItem, RiskStatus } from "../types";

interface Indicator {
  key: string; name: string; category: string;
  reason: Record<RiskStatus, string>;
  whatWouldChange: string; source: string;
}

const AQ = "WRI Aqueduct 4.0";
const AQ3 = "WRI Aqueduct 3.0";
const NOW = "Needs a measured site reading to confirm.";

// The 14 indicators in display order. Text is hardcoded plain language.
const indicators: Indicator[] = [
  { key: "bws", name: "Baseline water stress", category: "Water availability",
    reason: {
      Present: "Most of the local water supply is already being used by homes, farms and industry.",
      Watch: "A noticeable share of local water is already used each year, so dry spells can bite.",
      "Not present": "Only a small share of local water is used each year.",
      "No data": "No reliable figure exists for this location." },
    whatWouldChange: "Using less water on site, or local users together taking less from the same source.", source: AQ },
  { key: "bwd", name: "Water depletion", category: "Water availability",
    reason: {
      Present: "Water is being taken out faster than nature refills it.",
      Watch: "Water use is getting close to what nature refills.",
      "Not present": "Water use is well within what nature refills.",
      "No data": "No reliable figure exists for this location." },
    whatWouldChange: "Recharge projects, rainwater harvesting and lower withdrawals in the basin.", source: AQ },
  { key: "iav", name: "Interannual variability", category: "Water availability",
    reason: {
      Present: "Supply swings a lot from one year to the next, so a bad year can hit hard.",
      Watch: "Supply changes from year to year, but usually within a manageable range.",
      "Not present": "Supply is steady from year to year.",
      "No data": "No reliable figure exists for this location." },
    whatWouldChange: "Storage that carries water through poor years. The climate itself will not change.", source: AQ },
  { key: "sev", name: "Seasonal variability", category: "Water availability",
    reason: {
      Present: "Supply changes sharply between wet and dry months.",
      Watch: "Some months are clearly drier than others.",
      "Not present": "Supply is similar across the seasons.",
      "No data": "No reliable figure exists for this location." },
    whatWouldChange: "Seasonal storage, such as ponds or tanks, to cover the dry months.", source: AQ },
  { key: "gtd", name: "Groundwater table decline", category: "Water availability",
    reason: {
      Present: "The groundwater level is falling every year, so wells may run dry or need deeper boring.",
      Watch: "The groundwater level is slowly dropping.",
      "Not present": "The groundwater level is stable or rising.",
      "No data": "No reliable figure exists for this location." },
    whatWouldChange: "Recharge structures and less pumping across the area.", source: AQ3 },
  { key: "rfr", name: "Riverine flood", category: "Floods and drought",
    reason: {
      Present: "Rivers near the site overflow often enough to threaten buildings and stock.",
      Watch: "Rivers near the site can overflow in a severe season.",
      "Not present": "Flooding from rivers is unlikely here.",
      "No data": "No reliable figure exists for this location." },
    whatWouldChange: "Flood defences and raised storage. Local river works also change this.", source: AQ3 },
  { key: "cfr", name: "Coastal flood", category: "Floods and drought",
    reason: {
      Present: "The site is close to the coast and can be flooded by storm surges and high tides.",
      Watch: "Storm surges could reach the area in a severe event.",
      "Not present": "The site is far enough inland that coastal flooding is not a concern.",
      "No data": "No reliable figure exists for this location." },
    whatWouldChange: "Sea walls and raised plant. Moving critical equipment above flood level.", source: AQ3 },
  { key: "drr", name: "Drought", category: "Floods and drought",
    reason: {
      Present: "Long dry spells are common here and have cut local supply before.",
      Watch: "Drought can happen here, but not often.",
      "Not present": "Long droughts are rare here.",
      "No data": "No reliable figure exists for this location." },
    whatWouldChange: "A back-up water source and reuse systems that keep the plant running in dry years.", source: AQ3 },
  { key: "ucw", name: "Untreated connected wastewater", category: "Water quality",
    reason: {
      Present: "A large share of used water upstream is released without treatment, so the source can be polluted.",
      Watch: "Some used water upstream is released without treatment.",
      "Not present": "Almost all used water upstream is treated.",
      "No data": "No reliable figure exists for this location." },
    whatWouldChange: "More treatment plants upstream. Better on-site treatment of the factory's own wastewater.", source: AQ3 },
  { key: "cep", name: "Coastal eutrophication", category: "Water quality",
    reason: {
      Present: "Nutrient run-off here feeds algae blooms in coastal waters.",
      Watch: "Some nutrient run-off reaches coastal waters.",
      "Not present": "Little nutrient run-off reaches the coast.",
      "No data": "No reliable figure exists for this location, for example because the site is far from the coast." },
    whatWouldChange: "Cleaner farming and sewage practices across the basin.", source: AQ3 },
  { key: "udw", name: "Unimproved drinking water", category: "Access to water and sanitation",
    reason: {
      Present: "Many people nearby do not have a safe, protected source of drinking water.",
      Watch: "Some people nearby still lack a safe drinking-water source.",
      "Not present": "Almost everyone nearby has safe drinking water.",
      "No data": "No reliable figure exists for this location." },
    whatWouldChange: "Community water projects and safe drinking water for workers' homes.", source: "WHO/UNICEF JMP" },
  { key: "usa", name: "Unimproved sanitation", category: "Access to water and sanitation",
    reason: {
      Present: "Many people nearby do not have a safe toilet. This is a health risk for workers and neighbours.",
      Watch: "Some people nearby still lack a safe toilet.",
      "Not present": "Almost everyone nearby has a safe toilet.",
      "No data": "No reliable figure exists for this location." },
    whatWouldChange: "Sanitation projects in worker housing and nearby villages.", source: "WHO/UNICEF JMP" },
  { key: "rep", name: "RepRisk country ESG", category: "Reputation and sector",
    reason: {
      Present: "Media and civil society report many water and environment issues in this country.",
      Watch: "There are some reports of water and environment issues in this country.",
      "Not present": "There are few such reports for this country.",
      "No data": "No reliable figure exists for this country." },
    whatWouldChange: "Open reporting and independent checks. The country score itself moves slowly.", source: "RepRisk" },
  { key: "otr", name: "Overall textile water risk", category: "Reputation and sector",
    reason: {
      Present: "Taking all signals together, water is a serious risk for textile work at this location.",
      Watch: "Taking all signals together, water needs attention for textile work at this location.",
      "Not present": "Taking all signals together, water is not a major risk for textile work here.",
      "No data": "No reliable figure exists for this location." },
    whatWouldChange: "Reducing the individual risks above. This score follows them.", source: `${AQ3} textile sector weighting` },
];

const statusOf = (score: number | null): RiskStatus =>
  score === null ? "No data" : score >= 3 ? "Present" : score >= 2 ? "Watch" : "Not present";

type Pair = [number | null, string | null];
const rows: Record<string, Pair[]> = {
  "tiruppur-mill": [[2.4, "20.9%"], [3.2, "Ratio 2.1"], [2.6, "0.71"], [2.2, "0.52"], [3.1, "-0.8 m a year"], [1.1, "3% of people exposed"], [0.2, "0.0%"], [3.6, "0.81"], [3.0, "61% untreated"], [1.4, "142 kg N per km²"], [1.8, "6.2%"], [3.4, "47.8%"], [2.3, "Index 38"], [4.05, "4.05 out of 5"]],
  "avinashi-unit": [[2.7, "24.5%"], [3.0, "Ratio 1.9"], [2.4, "0.66"], [2.1, "0.49"], [2.8, "-0.6 m a year"], [1.3, "4% of people exposed"], [0.2, "0.0%"], [3.3, "0.74"], [2.9, "58% untreated"], [1.5, "150 kg N per km²"], [1.9, "6.8%"], [3.2, "44.1%"], [2.3, "Index 38"], [3.7, "3.70 out of 5"]],
  "palladam-dye-house": [[2.0, "18.2%"], [2.4, "Ratio 1.4"], [2.3, "0.60"], [1.8, "0.41"], [2.5, "-0.5 m a year"], [0.9, "2% of people exposed"], [0.1, "0.0%"], [2.6, "0.63"], [2.7, "54% untreated"], [1.3, "130 kg N per km²"], [1.6, "5.4%"], [2.4, "38.0%"], [2.3, "Index 38"], [2.9, "2.90 out of 5"]],
  "site-a-chennai": [[2.5, "22.0%"], [2.2, "Ratio 1.3"], [1.9, "0.44"], [2.6, "0.58"], [2.9, "-0.7 m a year"], [2.4, "9% of people exposed"], [3.8, "11% of area flooded"], [2.1, "0.55"], [3.2, "63% untreated"], [2.8, "310 kg N per km²"], [1.2, "3.9%"], [2.0, "28.4%"], [2.3, "Index 38"], [3.6, "3.60 out of 5"]],
  "ranipet-processing": [[3.4, "41.8%"], [2.9, "Ratio 1.8"], [2.2, "0.52"], [2.5, "0.56"], [3.3, "-1.0 m a year"], [1.8, "6% of people exposed"], [0.3, "0.0%"], [3.0, "0.77"], [3.4, "69% untreated"], [null, null], [1.9, "6.1%"], [3.0, "40.2%"], [2.3, "Index 38"], [3.8, "3.80 out of 5"]],
  "sriperumbudur-unit": [[2.2, "19.4%"], [2.0, "Ratio 1.2"], [1.7, "0.38"], [2.0, "0.47"], [2.4, "-0.4 m a year"], [1.6, "5% of people exposed"], [2.2, "4% of area flooded"], [1.9, "0.46"], [2.6, "52% untreated"], [2.0, "180 kg N per km²"], [1.4, "4.5%"], [1.8, "25.0%"], [2.3, "Index 38"], [2.6, "2.60 out of 5"]],
  "coimbatore-spinning": [[1.8, "15.0%"], [1.6, "Ratio 0.9"], [3.1, "0.78"], [2.2, "0.50"], [1.9, "-0.2 m a year"], [0.8, "2% of people exposed"], [0.1, "0.0%"], [2.0, "0.52"], [2.0, "46% untreated"], [1.1, "98 kg N per km²"], [1.0, "3.0%"], [1.5, "20.3%"], [2.3, "Index 38"], [2.2, "2.20 out of 5"]],
  "erode-dyeing-works": [[2.3, "20.2%"], [2.5, "Ratio 1.5"], [3.4, "0.83"], [2.4, "0.55"], [2.4, "-0.4 m a year"], [2.9, "12% of people exposed"], [0.1, "0.0%"], [2.5, "0.65"], [2.8, "56% untreated"], [1.6, "155 kg N per km²"], [1.5, "5.0%"], [2.2, "30.7%"], [2.3, "Index 38"], [3.1, "3.10 out of 5"]],
  "nanjangud-unit": [[1.3, "10.9%"], [1.8, "Ratio 0.9"], [1.6, "0.35"], [1.5, "0.33"], [2.2, "-0.3 m a year"], [0.7, "1% of people exposed"], [0.0, "0.0%"], [1.4, "0.34"], [1.6, "35% untreated"], [0.6, "60 kg N per km²"], [0.8, "2.0%"], [1.1, "13.8%"], [2.3, "Index 38"], [1.6, "1.60 out of 5"]],
  "karur-unit": [[1.4, "11.8%"], [1.2, "Ratio 0.7"], [2.8, "0.70"], [1.6, "0.38"], [1.5, "-0.1 m a year"], [1.0, "3% of people exposed"], [0.1, "0.0%"], [1.7, "0.40"], [1.8, "40% untreated"], [0.9, "80 kg N per km²"], [0.9, "2.5%"], [1.3, "17.9%"], [2.3, "Index 38"], [1.8, "1.80 out of 5"]],
  "mysuru-cut-and-sew": [[1.3, "10.5%"], [1.9, "Ratio 1.0"], [1.6, "0.36"], [1.5, "0.34"], [2.9, "-0.6 m a year"], [0.7, "1% of people exposed"], [0.0, "0.0%"], [1.4, "0.33"], [1.5, "34% untreated"], [0.6, "60 kg N per km²"], [0.8, "2.1%"], [1.1, "14.0%"], [2.3, "Index 38"], [1.7, "1.70 out of 5"]],
  "bengaluru-hub": [[2.0, "17.6%"], [2.6, "Ratio 1.5"], [1.8, "0.41"], [1.9, "0.43"], [3.5, "-1.1 m a year"], [1.2, "4% of people exposed"], [0.0, "0.0%"], [1.8, "0.43"], [2.4, "50% untreated"], [1.0, "90 kg N per km²"], [0.8, "2.2%"], [1.2, "15.6%"], [2.3, "Index 38"], [2.4, "2.40 out of 5"]],
  "ballari-weave": [[3.5, "44.0%"], [4.1, "Ratio 3.2"], [2.8, "0.69"], [3.0, "0.67"], [3.6, "-1.3 m a year"], [1.5, "5% of people exposed"], [null, null], [3.4, "0.84"], [2.6, "52% untreated"], [0.8, "70 kg N per km²"], [2.4, "11.0%"], [3.1, "42.5%"], [2.3, "Index 38"], [4.2, "4.20 out of 5"]],
  "hubballi-unit": [[2.9, "27.3%"], [3.4, "Ratio 2.3"], [2.5, "0.62"], [2.7, "0.60"], [3.0, "-0.9 m a year"], [1.4, "4% of people exposed"], [0.0, "0.0%"], [2.8, "0.70"], [2.5, "50% untreated"], [0.9, "75 kg N per km²"], [2.0, "7.9%"], [2.6, "36.0%"], [2.3, "Index 38"], [3.5, "3.50 out of 5"]],
  "davangere-processing": [[2.8, "26.0%"], [3.0, "Ratio 1.9"], [2.4, "0.60"], [2.5, "0.55"], [2.6, "-0.5 m a year"], [1.1, "3% of people exposed"], [0.0, "0.0%"], [2.5, "0.64"], [2.3, "48% untreated"], [null, null], [1.9, "6.0%"], [2.3, "31.0%"], [2.3, "Index 38"], [3.0, "3.00 out of 5"]],
};

export const risksByFactory: Record<string, RiskItem[]> = Object.fromEntries(
  Object.entries(rows).map(([id, pairs]) => [
    id,
    indicators.map((ind, i): RiskItem => {
      const [score, rawValue] = pairs[i];
      const status = statusOf(score);
      return {
        key: ind.key, name: ind.name, category: ind.category, status, score, scorePct: score === null ? null : Math.round(score * 200) / 10, rawValue,
        reason: ind.reason[status],
        vintage: i < 4 ? "Aqueduct 4.0 (2023)" : "about 2014",
        whatWouldChange: status === "No data" ? NOW : ind.whatWouldChange,
        source: ind.source,
      };
    }),
  ]),
);
