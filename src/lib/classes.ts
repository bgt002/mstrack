// MapleStory job classes grouped by class group, with a representative accent color.

export interface JobClass {
  name: string;
  group: string;
  color: string;
}

export const CLASS_GROUPS: { group: string; color: string; jobs: string[] }[] = [
  {
    group: "Explorer",
    color: "#5dade2",
    jobs: [
      "Hero",
      "Paladin",
      "Dark Knight",
      "Arch Mage (F/P)",
      "Arch Mage (I/L)",
      "Bishop",
      "Bowmaster",
      "Marksman",
      "Pathfinder",
      "Night Lord",
      "Shadower",
      "Dual Blade",
      "Buccaneer",
      "Corsair",
      "Cannoneer",
    ],
  },
  {
    group: "Cygnus Knights",
    color: "#f7dc6f",
    jobs: [
      "Dawn Warrior",
      "Blaze Wizard",
      "Wind Archer",
      "Night Walker",
      "Thunder Breaker",
      "Mihile",
    ],
  },
  {
    group: "Heroes",
    color: "#e74c3c",
    jobs: ["Aran", "Evan", "Mercedes", "Phantom", "Luminous", "Shade"],
  },
  {
    group: "Resistance",
    color: "#58d68d",
    jobs: [
      "Blaster",
      "Battle Mage",
      "Wild Hunter",
      "Mechanic",
      "Demon Slayer",
      "Demon Avenger",
      "Xenon",
    ],
  },
  {
    group: "Nova",
    color: "#af7ac5",
    jobs: ["Kaiser", "Angelic Buster", "Cadena", "Kain"],
  },
  {
    group: "Sengoku",
    color: "#dc7633",
    jobs: ["Hayato", "Kanna"],
  },
  {
    group: "Flora",
    color: "#48c9b0",
    jobs: ["Illium", "Ark", "Khali", "Adele"],
  },
  {
    group: "Anima",
    color: "#f1948a",
    jobs: ["Hoyoung", "Lara"],
  },
  {
    group: "Other",
    color: "#aab7b8",
    jobs: ["Zero", "Kinesis", "Beast Tamer", "Lynn", "Mo Xuan", "Sia Astelle"],
  },
];

export const ALL_CLASSES: JobClass[] = CLASS_GROUPS.flatMap((g) =>
  g.jobs.map((name) => ({ name, group: g.group, color: g.color }))
);

export const CLASS_BY_NAME = Object.fromEntries(
  ALL_CLASSES.map((c) => [c.name, c])
);

export function classColor(name: string): string {
  return CLASS_BY_NAME[name]?.color ?? "#aab7b8";
}

export const WORLDS = [
  "Kronos",
  "Hyperion",
  "Solis",
  "Reboot (NA)",
  "Reboot (EU)",
  "Scania",
  "Bera",
  "Aurora",
  "Elysium",
  "Luna",
  "Burning",
];
