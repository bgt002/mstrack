# MapleTracker — Boss Crystal Tracker

A single-page MapleStory **boss crystal tracker** (inspired by maplehub.app), built with
**Next.js (App Router) + TypeScript + Tailwind CSS v4 + Zustand**.

Everything lives on one page (`/`). All data is stored locally in your browser
(`localStorage`) — no account, no backend.

## Features

- **Characters, inline** — add characters by name as tabs; rename, reorder, delete. No roster page.
- **Per-character boss checklist** — click **+ Add boss** to pick the bosses each character runs
  (difficulty Easy → Extreme), then check them off. Boss icons from [maplestory.io](https://maplestory.io).
- **GMS crystal meso values** per boss/difficulty, from the MapleStory Wiki.
- **Kill counts** — set how many times you kill each boss (dailies up to 7/week, weeklies once);
  per-boss meso = `(value ÷ party) × kills`, and the **weekly meso total** sums it across the roster.
- **Party-size splitter** — each boss value divides by party members (`floor(value / members)`),
  capped at each boss's max party size (Extreme Lotus = 2, First Adversary/Limbo/Baldrix = 3).
- **Heroic ×5** toggle — crystals sell for 5× in Heroic (Reboot) worlds.
- **RP calculator** — a collapsible monthly Reward Points planner: MVP tier, editable RP per
  activity (daily bosses, Monster Collection, Maple Tour, weekly bosses @200, Fairy Bros gifts, …),
  with monthly total = `daily × days-in-month + weekly × Thursdays + monthly`, capped at **50,000 RP**.
- **Automatic resets** — checkmarks clear on the GMS schedule: **dailies at 00:00 UTC**,
  **weeklies Thursday 00:00 UTC**, **monthly (Black Mage) on the 1st**. Manual reset menu too.
- **Crystal caps** — per-account **180 crystals / week** (counts all cleared crystals incl. dailies)
  and per-character **14 weekly crystals**, each with an over-cap warning.
- Account totals: mesos earned this period vs. potential income.

## How resets work

A clear is stored as the **timestamp** it was checked. A boss shows as cleared only while that
timestamp falls inside the current period for its reset type — so resets are automatic, no timer
needed. The 180/week account counter (`weeklySold`) accumulates every check and re-zeroes each
Thursday, so repeating a daily across the week counts each sale toward 180.

## Run locally

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm run start   # production
```

## Project structure

```
src/
  app/
    layout.tsx        # shell: nav + footer
    page.tsx          # the whole app — boss tracker
  components/
    Nav.tsx           # brand header
  lib/
    bosses.ts         # boss + GMS crystal data, party-split helpers
    bossImages.ts     # AUTO-GENERATED manifest of downloaded boss icons
    reset.ts          # UTC daily/weekly/monthly period math + days/Thursdays in month
    rp.ts             # RP activity defs + monthly RP calculation
    store.ts          # Zustand store (persisted to localStorage)
public/
  bosses/             # downloaded boss icons (<bossId>.png)
scripts/
  fetch-boss-images.mjs  # re-download boss icons + regenerate bossImages.ts
```

To refresh boss icons: `node scripts/fetch-boss-images.mjs`
(First Adversary, Limbo, and Baldrix aren't in the icon dataset yet and use a letter placeholder.)

## Notes
- Not affiliated with Nexon. Boss crystal meso values are the **GMS** values from the
  [MapleStory Wiki](https://maplestorywiki.net/w/Intense_Power_Crystal) (Intense Power Crystal,
  GMS v264), shown per single party member; the tracker divides by party size and ×5 for Heroic.
- GMS crystal sell limits: **180 per world per week**, **14 weekly crystals per character per week**.
- Live character name-search is not available — GMS has no public character API.
