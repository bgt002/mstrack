// Monthly Reward Points (RP) calculator.
// Model based on the AlduTV "MapleStory Boss/Meso Calculators" RP farming guide.
//
// Monthly RP = (sum of daily activities) * days in month
//            + (sum of weekly activities) * Thursdays in month
//            + (sum of monthly activities),  capped at 50,000 RP / month.
//
// Default RP amounts are best-effort and EDITABLE in the UI — adjust to match
// current in-game values. Frequencies/caps follow the guide.

import { daysInMonth, thursdaysInMonth } from "./reset";

export const MONTHLY_RP_CAP = 50_000;

export type RpGroup = "daily" | "weekly" | "monthly";

export interface RpActivity {
  id: string;
  label: string;
  group: RpGroup;
  defaultRp: number; // RP per completion
  defaultQty: number; // completions per occurrence (e.g. redeems/day, # weekly bosses)
  qtyLabel?: string; // label for the qty field; omit to hide qty (qty fixed at 1)
  note?: string;
  // For Fairy Bros: RP depends on MVP tier.
  mvpScaled?: "day7" | "day21";
}

// MVP membership tiers (affect Fairy Bros gift RP).
export const MVP_TIERS = ["None", "Bronze", "Silver", "Gold", "Diamond", "Red"] as const;
export type MvpTier = (typeof MVP_TIERS)[number];
const tierRank = (t: MvpTier) => MVP_TIERS.indexOf(t);

export const RP_ACTIVITIES: RpActivity[] = [
  // ---- Daily (x days in month) ----
  {
    id: "daily-bosses",
    label: "Daily Bosses",
    group: "daily",
    defaultRp: 30,
    defaultQty: 0,
    qtyLabel: "# daily bosses",
    note: "30 per boss, once a day per world (excludes Balrog & Julieta). Qty = distinct daily bosses across your roster — the same boss on multiple characters only counts once.",
  },
  {
    id: "monster-collection",
    label: "Monster Collection",
    group: "daily",
    defaultRp: 10,
    defaultQty: 1,
    qtyLabel: "redeems/day",
    note: "Variable — higher-quality boxes give more (less than proportional). Editable.",
  },
  {
    id: "maple-tour",
    label: "Maple Tour",
    group: "daily",
    defaultRp: 100,
    defaultQty: 1,
    note: "Daily Maple Tour clear.",
  },
  { id: "exploration-1", label: "Exploration 1", group: "daily", defaultRp: 130, defaultQty: 1 },
  { id: "exploration-2", label: "Exploration 2", group: "daily", defaultRp: 130, defaultQty: 1 },
  { id: "exploration-3", label: "Exploration 3", group: "daily", defaultRp: 40, defaultQty: 1 },
  {
    id: "msm",
    label: "MapleStory M — PC daily tasks",
    group: "daily",
    defaultRp: 100,
    defaultQty: 5,
    qtyLabel: "missions (max 5)",
    note: "100 per mission, up to 5 missions per day. Requires a linked MSM account.",
  },
  { id: "use-potions", label: "Use 50 potions", group: "daily", defaultRp: 100, defaultQty: 1 },
  { id: "hunt-monsters", label: "Hunt 300 monsters", group: "daily", defaultRp: 100, defaultQty: 1 },
  { id: "earn-mesos", label: "Earn 300,000 mesos", group: "daily", defaultRp: 100, defaultQty: 1 },
  { id: "obtain-items", label: "Obtain 10 items", group: "daily", defaultRp: 100, defaultQty: 1 },
  { id: "fever-buff", label: "Use Fever Buff 5x", group: "daily", defaultRp: 100, defaultQty: 1 },
  {
    id: "sudden-missions",
    label: "Sudden Missions",
    group: "daily",
    defaultRp: 500,
    defaultQty: 0,
    qtyLabel: "expected/day",
    note: "Low chance to appear for 500 mileage. Off by default (RNG) — set an expected count if you want to estimate it.",
  },
  {
    id: "other-daily",
    label: "Other daily RP",
    group: "daily",
    defaultRp: 0,
    defaultQty: 1,
    note: "Anything else you earn each day.",
  },

  // ---- Weekly (x Thursdays in month) ----
  {
    id: "weekly-bosses",
    label: "Weekly Bosses",
    group: "weekly",
    defaultRp: 200,
    defaultQty: 0,
    qtyLabel: "# weekly bosses",
    note: "200 per weekly boss, once a week per world. Qty = distinct weekly bosses across your roster — the same boss on multiple characters only counts once.",
  },
  {
    id: "other-weekly",
    label: "Other weekly RP",
    group: "weekly",
    defaultRp: 0,
    defaultQty: 1,
    note: "Anything else you earn each week.",
  },

  // ---- Monthly (x1) ----
  {
    id: "monthly-bosses",
    label: "Monthly Bosses",
    group: "monthly",
    defaultRp: 1000,
    defaultQty: 0,
    qtyLabel: "# monthly bosses",
    note: "1,000 per monthly boss, once a month per world (e.g. Black Mage). Qty = distinct monthly bosses across your roster.",
  },
  {
    id: "fairy-day7",
    label: "Fairy Bros — Day 7 gift",
    group: "monthly",
    defaultRp: 500,
    defaultQty: 1,
    mvpScaled: "day7",
    note: "500 RP base, 1000 RP for MVP Bronze I or higher. Requires logging in 7 days.",
  },
  {
    id: "fairy-day21",
    label: "Fairy Bros — Day 21 gift",
    group: "monthly",
    defaultRp: 1000,
    defaultQty: 1,
    mvpScaled: "day21",
    note: "1000 RP base, 2000 RP for MVP Silver or higher. Requires logging in 21 days.",
  },
  {
    id: "other-monthly",
    label: "Other monthly RP",
    group: "monthly",
    defaultRp: 0,
    defaultQty: 1,
    note: "Anything else you earn once a month.",
  },
];

export const RP_BY_ID = Object.fromEntries(RP_ACTIVITIES.map((a) => [a.id, a]));

// MVP-tier override for Fairy Bros RP, if applicable.
export function mvpAdjustedRp(activity: RpActivity, tier: MvpTier): number | null {
  if (activity.mvpScaled === "day7") return tierRank(tier) >= tierRank("Bronze") ? 1000 : 500;
  if (activity.mvpScaled === "day21") return tierRank(tier) >= tierRank("Silver") ? 2000 : 1000;
  return null;
}

export interface RpOverride {
  rp?: number;
  qty?: number;
  on?: boolean;
}

export interface RpResult {
  daily: number;
  weekly: number;
  monthly: number;
  rawMonthly: number; // before cap
  total: number; // after 30k cap
  days: number;
  thursdays: number;
  capped: boolean;
}

export function computeMonthlyRp(
  overrides: Record<string, RpOverride>,
  tier: MvpTier,
  now: number
): RpResult {
  const days = daysInMonth(now);
  const thursdays = thursdaysInMonth(now);

  let daily = 0;
  let weekly = 0;
  let monthly = 0;

  for (const a of RP_ACTIVITIES) {
    const o = overrides[a.id] ?? {};
    if (o.on === false) continue;
    const mvp = mvpAdjustedRp(a, tier);
    const rp = o.rp ?? (mvp != null ? mvp : a.defaultRp);
    const qty = o.qty ?? a.defaultQty;
    const contribution = rp * qty;
    if (a.group === "daily") daily += contribution;
    else if (a.group === "weekly") weekly += contribution;
    else monthly += contribution;
  }

  const rawMonthly = daily * days + weekly * thursdays + monthly;
  const total = Math.min(rawMonthly, MONTHLY_RP_CAP);
  return {
    daily,
    weekly,
    monthly,
    rawMonthly,
    total,
    days,
    thursdays,
    capped: rawMonthly > MONTHLY_RP_CAP,
  };
}
