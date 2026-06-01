// MapleStory boss crystal data — GMS values.
// Source: https://maplestorywiki.net/w/Intense_Power_Crystal (Intense Power Crystal, GMS v264 table).
//
// `mesos` is the value for a SINGLE party member (the solo value). When split across a party,
// each member gets floor(mesos / members). Values are quintupled in GMS Heroic (Reboot) worlds.
// `maxParty` is the boss's maximum party size (default 6); only set when below 6.

export type Reset = "daily" | "weekly" | "monthly";

export interface BossDifficulty {
  difficulty: string;
  mesos: number; // solo (1 party member) crystal value
  maxParty?: number; // defaults to 6
}

export interface Boss {
  id: string; // stable slug
  name: string;
  reset: Reset;
  difficulties: BossDifficulty[]; // ordered easiest -> hardest
}

export const DIFFICULTY_COLOR: Record<string, string> = {
  Easy: "#4ade80",
  Normal: "#60a5fa",
  Hard: "#f59e0b",
  Chaos: "#f43f5e",
  Extreme: "#a855f7",
};

// Order in which difficulties rank, easiest to hardest.
export const DIFFICULTY_ORDER = ["Easy", "Normal", "Hard", "Chaos", "Extreme"];

export const BOSSES: Boss[] = [
  // ---------------- Daily ----------------
  {
    id: "zakum",
    name: "Zakum",
    reset: "daily",
    difficulties: [
      { difficulty: "Easy", mesos: 200_000 },
      { difficulty: "Normal", mesos: 612_500 },
    ],
  },
  {
    id: "papulatus",
    name: "Papulatus",
    reset: "daily",
    difficulties: [
      { difficulty: "Easy", mesos: 684_500 },
      { difficulty: "Normal", mesos: 2_664_500 },
    ],
  },
  {
    id: "magnus",
    name: "Magnus",
    reset: "daily",
    difficulties: [
      { difficulty: "Easy", mesos: 722_000 },
      { difficulty: "Normal", mesos: 2_592_000 },
    ],
  },
  {
    id: "hilla",
    name: "Hilla",
    reset: "daily",
    difficulties: [{ difficulty: "Normal", mesos: 800_000 }],
  },
  {
    id: "ranmaru",
    name: "Mori Ranmaru",
    reset: "daily",
    difficulties: [
      { difficulty: "Normal", mesos: 840_500 },
      { difficulty: "Hard", mesos: 2_664_500 },
    ],
  },
  {
    id: "horntail",
    name: "Horntail",
    reset: "daily",
    difficulties: [
      { difficulty: "Easy", mesos: 882_000 },
      { difficulty: "Normal", mesos: 1_012_500 },
      { difficulty: "Chaos", mesos: 1_352_000 },
    ],
  },
  {
    id: "pierre",
    name: "Pierre",
    reset: "daily",
    difficulties: [{ difficulty: "Normal", mesos: 968_000 }],
  },
  {
    id: "von-bon",
    name: "Von Bon",
    reset: "daily",
    difficulties: [{ difficulty: "Normal", mesos: 968_000 }],
  },
  {
    id: "crimson-queen",
    name: "Crimson Queen",
    reset: "daily",
    difficulties: [{ difficulty: "Normal", mesos: 968_000 }],
  },
  {
    id: "vellum",
    name: "Vellum",
    reset: "daily",
    difficulties: [{ difficulty: "Normal", mesos: 968_000 }],
  },
  {
    id: "von-leon",
    name: "Von Leon",
    reset: "daily",
    difficulties: [
      { difficulty: "Easy", mesos: 1_058_000 },
      { difficulty: "Normal", mesos: 1_458_000 },
      { difficulty: "Hard", mesos: 2_450_000 },
    ],
  },
  {
    id: "arkarium",
    name: "Arkarium",
    reset: "daily",
    difficulties: [
      { difficulty: "Easy", mesos: 1_152_000 },
      { difficulty: "Normal", mesos: 2_520_500 },
    ],
  },
  {
    id: "omni-cln",
    name: "OMNI-CLN",
    reset: "daily",
    difficulties: [{ difficulty: "Normal", mesos: 1_250_000 }],
  },
  {
    id: "pink-bean",
    name: "Pink Bean",
    reset: "daily",
    difficulties: [{ difficulty: "Normal", mesos: 1_404_500 }],
  },

  // ---------------- Weekly ----------------
  {
    id: "cygnus",
    name: "Cygnus",
    reset: "weekly",
    difficulties: [
      { difficulty: "Easy", mesos: 9_112_500 },
      { difficulty: "Normal", mesos: 14_450_000 },
    ],
  },
  {
    id: "hilla-hard",
    name: "Hard Hilla",
    reset: "weekly",
    difficulties: [{ difficulty: "Hard", mesos: 11_250_000 }],
  },
  {
    id: "pink-bean-chaos",
    name: "Chaos Pink Bean",
    reset: "weekly",
    difficulties: [{ difficulty: "Chaos", mesos: 12_800_000 }],
  },
  {
    id: "zakum-chaos",
    name: "Chaos Zakum",
    reset: "weekly",
    difficulties: [{ difficulty: "Chaos", mesos: 16_200_000 }],
  },
  {
    id: "pierre-chaos",
    name: "Chaos Pierre",
    reset: "weekly",
    difficulties: [{ difficulty: "Chaos", mesos: 16_200_000 }],
  },
  {
    id: "von-bon-chaos",
    name: "Chaos Von Bon",
    reset: "weekly",
    difficulties: [{ difficulty: "Chaos", mesos: 16_200_000 }],
  },
  {
    id: "crimson-queen-chaos",
    name: "Chaos Crimson Queen",
    reset: "weekly",
    difficulties: [{ difficulty: "Chaos", mesos: 16_200_000 }],
  },
  {
    id: "princess-no",
    name: "Princess No",
    reset: "weekly",
    difficulties: [{ difficulty: "Normal", mesos: 16_200_000 }],
  },
  {
    id: "magnus-hard",
    name: "Hard Magnus",
    reset: "weekly",
    difficulties: [{ difficulty: "Hard", mesos: 19_012_500 }],
  },
  {
    id: "vellum-chaos",
    name: "Chaos Vellum",
    reset: "weekly",
    difficulties: [{ difficulty: "Chaos", mesos: 21_012_500 }],
  },
  {
    id: "papulatus-chaos",
    name: "Chaos Papulatus",
    reset: "weekly",
    difficulties: [{ difficulty: "Chaos", mesos: 26_450_000 }],
  },
  {
    id: "akechi",
    name: "Akechi Mitsuhide",
    reset: "weekly",
    difficulties: [{ difficulty: "Normal", mesos: 28_800_000 }],
  },
  {
    id: "lotus",
    name: "Lotus",
    reset: "weekly",
    difficulties: [
      { difficulty: "Normal", mesos: 32_512_500 },
      { difficulty: "Hard", mesos: 88_935_000 },
      { difficulty: "Extreme", mesos: 279_500_000, maxParty: 2 },
    ],
  },
  {
    id: "damien",
    name: "Damien",
    reset: "weekly",
    difficulties: [
      { difficulty: "Normal", mesos: 33_800_000 },
      { difficulty: "Hard", mesos: 84_375_000 },
    ],
  },
  {
    id: "slime",
    name: "Guardian Angel Slime",
    reset: "weekly",
    difficulties: [
      { difficulty: "Normal", mesos: 46_334_700 },
      { difficulty: "Chaos", mesos: 120_115_625 },
    ],
  },
  {
    id: "lucid",
    name: "Lucid",
    reset: "weekly",
    difficulties: [
      { difficulty: "Easy", mesos: 47_401_875 },
      { difficulty: "Normal", mesos: 50_765_625 },
      { difficulty: "Hard", mesos: 100_800_000 },
    ],
  },
  {
    id: "will",
    name: "Will",
    reset: "weekly",
    difficulties: [
      { difficulty: "Easy", mesos: 49_348_950 },
      { difficulty: "Normal", mesos: 55_815_000 },
      { difficulty: "Hard", mesos: 124_362_000 },
    ],
  },
  {
    id: "gloom",
    name: "Gloom",
    reset: "weekly",
    difficulties: [
      { difficulty: "Normal", mesos: 59_535_000 },
      { difficulty: "Chaos", mesos: 112_789_000 },
    ],
  },
  {
    id: "darknell",
    name: "Darknell",
    reset: "weekly",
    difficulties: [
      { difficulty: "Normal", mesos: 63_375_000 },
      { difficulty: "Hard", mesos: 133_584_000 },
    ],
  },
  {
    id: "verus-hilla",
    name: "Verus Hilla",
    reset: "weekly",
    difficulties: [
      { difficulty: "Normal", mesos: 116_376_000 },
      { difficulty: "Hard", mesos: 152_421_000 },
    ],
  },
  {
    id: "seren",
    name: "Chosen Seren",
    reset: "weekly",
    difficulties: [
      { difficulty: "Normal", mesos: 177_804_375 },
      { difficulty: "Hard", mesos: 219_312_000 },
      { difficulty: "Extreme", mesos: 847_000_000 },
    ],
  },
  {
    id: "kalos",
    name: "Kalos the Guardian",
    reset: "weekly",
    difficulties: [
      { difficulty: "Easy", mesos: 187_500_000 },
      { difficulty: "Normal", mesos: 260_000_000 },
      { difficulty: "Chaos", mesos: 520_000_000 },
      { difficulty: "Extreme", mesos: 1_040_000_000 },
    ],
  },
  {
    id: "kaling",
    name: "Kaling",
    reset: "weekly",
    difficulties: [
      { difficulty: "Easy", mesos: 206_250_000 },
      { difficulty: "Normal", mesos: 301_300_000 },
      { difficulty: "Hard", mesos: 598_000_000 },
      { difficulty: "Extreme", mesos: 1_205_200_000 },
    ],
  },
  {
    id: "first-adversary",
    name: "First Adversary",
    reset: "weekly",
    difficulties: [
      { difficulty: "Easy", mesos: 197_000_000, maxParty: 3 },
      { difficulty: "Normal", mesos: 273_000_000, maxParty: 3 },
      { difficulty: "Hard", mesos: 588_000_000, maxParty: 3 },
      { difficulty: "Extreme", mesos: 1_176_000_000, maxParty: 3 },
    ],
  },
  {
    id: "limbo",
    name: "Limbo",
    reset: "weekly",
    difficulties: [
      { difficulty: "Normal", mesos: 420_000_000, maxParty: 3 },
      { difficulty: "Hard", mesos: 749_000_000, maxParty: 3 },
    ],
  },
  {
    id: "baldrix",
    name: "Baldrix",
    reset: "weekly",
    difficulties: [
      { difficulty: "Normal", mesos: 560_000_000, maxParty: 3 },
      { difficulty: "Hard", mesos: 840_000_000, maxParty: 3 },
    ],
  },

  // ---------------- Monthly ----------------
  {
    id: "black-mage",
    name: "Black Mage",
    reset: "monthly",
    difficulties: [
      { difficulty: "Hard", mesos: 900_000_000 },
      { difficulty: "Extreme", mesos: 3_600_000_000 },
    ],
  },
];

// Order every boss within its reset group cheapest-first (difficulties are stored
// easiest -> hardest, so difficulties[0] is the lowest crystal value).
BOSSES.sort(
  (a, b) => a.difficulties[0].mesos - b.difficulties[0].mesos || a.name.localeCompare(b.name)
);

export const BOSS_BY_ID = Object.fromEntries(BOSSES.map((b) => [b.id, b]));

export function difficultyFor(
  bossId: string,
  difficulty: string
): BossDifficulty | undefined {
  return BOSS_BY_ID[bossId]?.difficulties.find(
    (d) => d.difficulty === difficulty
  );
}

export function soloMesos(bossId: string, difficulty: string): number {
  return difficultyFor(bossId, difficulty)?.mesos ?? 0;
}

export function maxPartyFor(bossId: string, difficulty: string): number {
  return difficultyFor(bossId, difficulty)?.maxParty ?? 6;
}

// Default selected difficulty for a boss = its hardest available tier.
export function hardestDifficulty(bossId: string): string {
  const b = BOSS_BY_ID[bossId];
  return b ? b.difficulties[b.difficulties.length - 1].difficulty : "Normal";
}

// Sells/kills per week for a reset cadence: dailies up to 7, weekly/monthly once.
export function sellsPerCycle(reset: Reset): number {
  return reset === "daily" ? 7 : 1;
}

// Per-member crystal value for a given party size and world multiplier.
// Base table values are split first (floor), then quintupled in Heroic worlds.
export function partyMesos(
  bossId: string,
  difficulty: string,
  party: number,
  mult: number
): number {
  const solo = soloMesos(bossId, difficulty);
  const members = Math.max(1, party);
  return Math.floor(solo / members) * mult;
}

// Format large meso numbers compactly: 1.20b, 340.5m, 9.1m
export function formatMesos(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}b`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return `${n}`;
}

export function formatMesosFull(n: number): string {
  return n.toLocaleString("en-US");
}

// GMS crystal sell limits
export const WEEKLY_CRYSTAL_LIMIT = 180; // per world per week
export const WEEKLY_PER_CHARACTER_LIMIT = 14; // weekly crystals per character per week

// Max times a boss can be killed/sold per its reset cycle.
// Daily bosses can be run once a day (7 per week); weekly/monthly once per cycle.
export function maxKills(reset: Reset): number {
  return reset === "daily" ? 7 : 1;
}
