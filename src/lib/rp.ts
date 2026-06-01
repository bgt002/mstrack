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

// MVP membership tiers (retained for type/store stability; no longer affects tracked RP).
export const MVP_TIERS = ["None", "Bronze", "Silver", "Gold", "Diamond", "Red"] as const;
export type MvpTier = (typeof MVP_TIERS)[number];

// Only boss RP is tracked. Daily-boss RP is shared per account+world (deduped); weekly &
// monthly boss RP is earned per character (you split clears across days).
export const RP_ACTIVITIES: RpActivity[] = [
  {
    id: "daily-bosses",
    label: "Daily Bosses",
    group: "daily",
    defaultRp: 30,
    defaultQty: 0,
    qtyLabel: "# daily bosses",
    note: "30 per boss, once a day per world (excludes Balrog & Julieta). Shared per account+world — the same daily boss on multiple characters only counts once.",
  },
  {
    id: "weekly-bosses",
    label: "Weekly Bosses",
    group: "weekly",
    defaultRp: 200,
    defaultQty: 0,
    qtyLabel: "# weekly bosses",
    note: "200 per weekly boss. Earned per character (cleared on separate days), so it stacks across characters in the same account+world.",
  },
  {
    id: "monthly-bosses",
    label: "Monthly Bosses",
    group: "monthly",
    defaultRp: 1000,
    defaultQty: 0,
    qtyLabel: "# monthly bosses",
    note: "1,000 per monthly boss (e.g. Black Mage). Earned per character.",
  },
];

export const RP_BY_ID = Object.fromEntries(RP_ACTIVITIES.map((a) => [a.id, a]));

// No MVP-scaled activities remain; kept for API stability.
export function mvpAdjustedRp(activity: RpActivity, tier: MvpTier): number | null {
  void activity;
  void tier;
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
