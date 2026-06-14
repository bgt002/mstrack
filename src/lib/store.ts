"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  BOSSES,
  BOSS_BY_ID,
  partyMesos,
  maxPartyFor,
  defaultDifficulty,
  sellsPerCycle,
  type Reset,
} from "./bosses";
import { weekStartUTC, monthStartUTC } from "./reset";
import { MVP_TIERS, type MvpTier, type RpOverride } from "./rp";

// Difficulty + party size a character runs a boss at (lazy override; defaults applied when absent).
export interface BossSel {
  difficulty: string;
  party: number;
}

export interface Character {
  id: string;
  name: string;
  account: string; // characters sharing account+world share one RP pool (per world)
  world: string;
  bosses: Record<string, BossSel>; // bossId -> chosen difficulty/party
}

export const DEFAULT_ACCOUNT = "Account 1";
export const DEFAULT_WORLD = "Kronos";

// killed/sold are keyed by `${characterId}:${bossId}`.
// killed -> defeated this cycle (drives RP). sold -> number of crystals sold this week
// (daily 0-7, weekly/monthly 0-1) — drives meso + crystal caps.
export interface RosterState {
  characters: Character[];
  killed: Record<string, boolean>;
  sold: Record<string, number>;
  weekAnchor: number;
  monthAnchor: number;
  reboot: boolean;
  autoResetWeekly: boolean;

  // RP planner
  rpOverrides: Record<string, RpOverride>;
  mvpTier: MvpTier;

  addCharacter: (name: string) => void;
  renameCharacter: (id: string, name: string) => void;
  setAccount: (id: string, account: string) => void;
  setWorld: (id: string, world: string) => void;
  removeCharacter: (id: string) => void;
  reorderCharacter: (id: string, dir: -1 | 1) => void;
  duplicateCharacter: (id: string) => void;

  setBossDifficulty: (charId: string, bossId: string, difficulty: string) => void;
  setBossParty: (charId: string, bossId: string, party: number) => void;

  toggleKilled: (charId: string, bossId: string, now: number) => void;
  setSold: (charId: string, bossId: string, count: number, now: number) => void;
  markAllKilled: (charId: string, reset: Reset, now: number) => void;
  clearAll: (charId: string, now: number) => void;
  resetByType: (reset: Reset) => void;
  reconcile: (now: number) => void;

  setReboot: (v: boolean) => void;
  setAutoResetWeekly: (v: boolean) => void;
  setRpOverride: (id: string, patch: RpOverride) => void;
  setMvpTier: (tier: MvpTier) => void;
}

const uid = () =>
  `${Date.now().toString(36)}-${Math.floor(performance.now() * 1000).toString(36)}`;

export const clearKey = (charId: string, bossId: string) => `${charId}:${bossId}`;

const clampParty = (bossId: string, difficulty: string, party: number) =>
  Math.min(Math.max(1, party), maxPartyFor(bossId, difficulty));

const resetOf = (bossId: string) => BOSS_BY_ID[bossId]?.reset ?? "weekly";

export const useStore = create<RosterState>()(
  persist(
    (set, get) => ({
      characters: [],
      killed: {},
      sold: {},
      weekAnchor: 0,
      monthAnchor: 0,
      reboot: false,
      autoResetWeekly: true,
      rpOverrides: {},
      mvpTier: "None",

      addCharacter: (name) =>
        set((s) => {
          // default new characters to the most-recently-used account/world
          const last = s.characters[s.characters.length - 1];
          return {
            characters: [
              ...s.characters,
              {
                id: uid(),
                name: name.trim() || "New Character",
                account: last?.account ?? DEFAULT_ACCOUNT,
                world: last?.world ?? DEFAULT_WORLD,
                bosses: {},
              },
            ],
          };
        }),

      renameCharacter: (id, name) =>
        set((s) => ({
          characters: s.characters.map((ch) =>
            ch.id === id ? { ...ch, name: name.trim() || ch.name } : ch
          ),
        })),

      setAccount: (id, account) =>
        set((s) => ({
          characters: s.characters.map((ch) =>
            ch.id === id ? { ...ch, account: account.trim() || ch.account } : ch
          ),
        })),

      setWorld: (id, world) =>
        set((s) => ({
          characters: s.characters.map((ch) =>
            ch.id === id ? { ...ch, world: world.trim() || ch.world } : ch
          ),
        })),

      removeCharacter: (id) =>
        set((s) => {
          const killed = { ...s.killed };
          const sold = { ...s.sold };
          for (const k of Object.keys(killed)) if (k.startsWith(`${id}:`)) delete killed[k];
          for (const k of Object.keys(sold)) if (k.startsWith(`${id}:`)) delete sold[k];
          return { characters: s.characters.filter((c) => c.id !== id), killed, sold };
        }),

      reorderCharacter: (id, dir) =>
        set((s) => {
          const idx = s.characters.findIndex((c) => c.id === id);
          const target = idx + dir;
          if (idx < 0 || target < 0 || target >= s.characters.length) return s;
          const next = [...s.characters];
          [next[idx], next[target]] = [next[target], next[idx]];
          return { characters: next };
        }),

      // Copy difficulty/party overrides + killed/sold markers to a new character id.
      duplicateCharacter: (id) =>
        set((s) => {
          const idx = s.characters.findIndex((c) => c.id === id);
          if (idx < 0) return s;
          const src = s.characters[idx];
          const newId = uid();
          const dup: Character = {
            id: newId,
            name: `${src.name} (copy)`,
            account: src.account,
            world: src.world,
            bosses: Object.fromEntries(
              Object.entries(src.bosses).map(([bid, sel]) => [bid, { ...sel }])
            ),
          };
          const killed = { ...s.killed };
          const sold = { ...s.sold };
          for (const [k, v] of Object.entries(s.killed))
            if (k.startsWith(`${id}:`)) killed[`${newId}:${k.slice(k.indexOf(":") + 1)}`] = v;
          for (const [k, v] of Object.entries(s.sold))
            if (k.startsWith(`${id}:`)) sold[`${newId}:${k.slice(k.indexOf(":") + 1)}`] = v;
          const characters = [...s.characters];
          characters.splice(idx + 1, 0, dup);
          return { characters, killed, sold };
        }),

      setBossDifficulty: (charId, bossId, difficulty) =>
        set((s) => ({
          characters: s.characters.map((ch) => {
            if (ch.id !== charId) return ch;
            const prevParty = ch.bosses[bossId]?.party ?? 1;
            return {
              ...ch,
              bosses: {
                ...ch.bosses,
                [bossId]: { difficulty, party: clampParty(bossId, difficulty, prevParty) },
              },
            };
          }),
        })),

      setBossParty: (charId, bossId, party) =>
        set((s) => ({
          characters: s.characters.map((ch) => {
            if (ch.id !== charId) return ch;
            const difficulty = ch.bosses[bossId]?.difficulty ?? defaultDifficulty(bossId);
            return {
              ...ch,
              bosses: {
                ...ch.bosses,
                [bossId]: { difficulty, party: clampParty(bossId, difficulty, party) },
              },
            };
          }),
        })),

      // Killing is required to sell: toggling killed off also clears sold.
      toggleKilled: (charId, bossId, now) => {
        get().reconcile(now);
        set((s) => {
          const key = clearKey(charId, bossId);
          const next = !s.killed[key];
          const killed = { ...s.killed };
          const sold = { ...s.sold };
          if (next) killed[key] = true;
          else {
            delete killed[key];
            delete sold[key];
          }
          return { killed, sold };
        });
      },

      // Set how many crystals were sold this week (selling implies killing).
      setSold: (charId, bossId, count, now) => {
        get().reconcile(now);
        set((s) => {
          const key = clearKey(charId, bossId);
          const max = sellsPerCycle(resetOf(bossId));
          const n = Math.min(Math.max(0, Math.round(count)), max);
          const killed = { ...s.killed };
          const sold = { ...s.sold };
          if (n <= 0) delete sold[key];
          else {
            sold[key] = n;
            killed[key] = true;
          }
          return { killed, sold };
        });
      },

      markAllKilled: (charId, reset, now) => {
        get().reconcile(now);
        set((s) => {
          const killed = { ...s.killed };
          for (const boss of BOSSES) {
            if (boss.reset === reset) killed[clearKey(charId, boss.id)] = true;
          }
          return { killed };
        });
      },

      clearAll: (charId, now) => {
        get().reconcile(now);
        set((s) => {
          const killed = { ...s.killed };
          const sold = { ...s.sold };
          for (const boss of BOSSES) {
            const key = clearKey(charId, boss.id);
            delete killed[key];
            delete sold[key];
          }
          return { killed, sold };
        });
      },

      resetByType: (reset) =>
        set((s) => {
          const killed = { ...s.killed };
          const sold = { ...s.sold };
          const prune = (m: Record<string, unknown>) => {
            for (const key of Object.keys(m)) {
              if (resetOf(key.slice(key.indexOf(":") + 1)) === reset) delete m[key];
            }
          };
          prune(killed);
          prune(sold);
          return { killed, sold };
        }),

      // Daily + weekly markers reset on the Maple week (Thursday); monthly on the calendar month.
      reconcile: (now) =>
        set((s) => {
          const wk = weekStartUTC(now);
          const mo = monthStartUTC(now);
          if (s.weekAnchor === wk && s.monthAnchor === mo) return s;
          const weekChanged = s.weekAnchor !== wk;
          const monthChanged = s.monthAnchor !== mo;
          function filter<T>(m: Record<string, T>): Record<string, T> {
            const out: Record<string, T> = {};
            for (const [key, v] of Object.entries(m)) {
              const reset = resetOf(key.slice(key.indexOf(":") + 1));
              const stale =
                (s.autoResetWeekly && (reset === "daily" || reset === "weekly") && weekChanged) ||
                (reset === "monthly" && monthChanged);
              if (!stale) out[key] = v;
            }
            return out;
          }
          return {
            killed: filter(s.killed),
            sold: filter(s.sold),
            weekAnchor: wk,
            monthAnchor: mo,
          };
        }),

      setReboot: (v) => set({ reboot: v }),
      setAutoResetWeekly: (v) => set({ autoResetWeekly: v }),

      setRpOverride: (id, patch) =>
        set((s) => ({
          rpOverrides: { ...s.rpOverrides, [id]: { ...s.rpOverrides[id], ...patch } },
        })),

      setMvpTier: (tier) => set({ mvpTier: tier }),
    }),
    {
      name: "mapletracker-roster",
      version: 10,
      partialize: (s) => ({
        characters: s.characters,
        killed: s.killed,
        sold: s.sold,
        weekAnchor: s.weekAnchor,
        monthAnchor: s.monthAnchor,
        reboot: s.reboot,
        autoResetWeekly: s.autoResetWeekly,
        rpOverrides: s.rpOverrides,
        mvpTier: s.mvpTier,
      }),
      migrate: (persisted, version) => {
        const now = Date.now();
        let s = persisted as Record<string, unknown> & {
          characters?: Array<{ id?: string; name: string; bosses?: Record<string, unknown> }>;
          pages?: Array<Record<string, unknown>>;
          activePageId?: string;
        };

        // v5 wrapped state in pages; unwrap the active page.
        if (s.pages) {
          const active = s.pages.find((p) => p.id === s.activePageId) ?? s.pages[0] ?? {};
          s = { ...(active as typeof s) };
        }
        // v1 -> bosses were difficulty strings.
        if (version < 2 && s.characters) {
          s.characters = s.characters.map((ch) => ({
            ...ch,
            bosses: Object.fromEntries(
              Object.entries(ch.bosses ?? {}).map(([k, v]) => [
                k,
                typeof v === "string" ? { difficulty: v, party: 1 } : (v as BossSel),
              ])
            ),
          }));
        }
        // v2 -> drop extra character fields.
        if (version < 3 && s.characters) {
          s.characters = s.characters.map((ch) => ({
            id: ch.id ?? uid(),
            name: ch.name,
            bosses: (ch.bosses ?? {}) as Record<string, BossSel>,
          }));
        }
        // v3 -> cleared(boolean/ts) became counts.
        if (version < 4) {
          const cleared = (s.cleared ?? {}) as Record<string, unknown>;
          const counts: Record<string, number> = {};
          for (const [k, v] of Object.entries(cleared)) if (v) counts[k] = 1;
          s.counts = counts;
          delete s.cleared;
          delete s.weeklySold;
        }
        // v7 -> split `counts` (kills that were also sold) into killed + sold markers.
        if (version < 7) {
          const counts = (s.counts ?? {}) as Record<string, number>;
          const killed: Record<string, boolean> = {};
          const sold: Record<string, boolean> = {};
          for (const [k, v] of Object.entries(counts)) {
            if (v && k.slice(k.indexOf(":") + 1) in BOSS_BY_ID) {
              killed[k] = true;
              sold[k] = true;
            }
          }
          s.killed = killed;
          s.sold = sold;
          delete s.counts;
        }
        // v8 -> `sold` became a per-week count (daily 0-7). Convert booleans: a sold daily
        // was previously treated as the full week (7), weekly/monthly as 1.
        if (version < 8 && s.sold) {
          const soldNum: Record<string, number> = {};
          for (const [k, v] of Object.entries(s.sold as Record<string, unknown>)) {
            if (v) soldNum[k] = sellsPerCycle(resetOf(k.slice(k.indexOf(":") + 1)));
          }
          s.sold = soldNum;
        }

        // Normalize characters + prune unknown bosses; default account/world (added v9).
        s.characters = ((s.characters ?? []) as Partial<Character>[]).map((ch) => ({
          id: ch.id ?? uid(),
          name: ch.name ?? "Character",
          account: ch.account ?? DEFAULT_ACCOUNT,
          world: ch.world ?? DEFAULT_WORLD,
          bosses: Object.fromEntries(
            Object.entries(ch.bosses ?? {}).filter(([bid]) => bid in BOSS_BY_ID)
          ) as Record<string, BossSel>,
        }));
        s.weekAnchor = (s.weekAnchor as number) ?? weekStartUTC(now);
        s.monthAnchor = (s.monthAnchor as number) ?? monthStartUTC(now);
        s.reboot = (s.reboot as boolean) ?? false;
        s.autoResetWeekly = (s.autoResetWeekly as boolean) ?? true;
        s.rpOverrides = (s.rpOverrides as Record<string, RpOverride>) ?? {};
        s.mvpTier = (s.mvpTier as MvpTier) ?? "None";
        delete s.pages;
        delete s.activePageId;
        return s as unknown as RosterState;
      },
      onRehydrateStorage: () => (state) => {
        state?.reconcile(Date.now());
      },
    }
  )
);

// True once the persisted state has loaded on the client (no hydration mismatch).
export function useHydrated(): boolean {
  return useSyncExternalStore(
    (cb) => useStore.persist.onFinishHydration(cb),
    () => useStore.persist.hasHydrated(),
    () => false
  );
}

// ----- Derived selectors -----

const mult = (reboot: boolean) => (reboot ? 5 : 1);

export function diffOf(ch: Character, bossId: string): string {
  return ch.bosses[bossId]?.difficulty ?? defaultDifficulty(bossId);
}
export function partyOf(ch: Character, bossId: string): number {
  return ch.bosses[bossId]?.party ?? 1;
}

// Meso for selling one of this boss's crystals (party-split, reboot-adjusted).
export function sellValue(ch: Character, bossId: string, reboot: boolean): number {
  return partyMesos(bossId, diffOf(ch, bossId), partyOf(ch, bossId), mult(reboot));
}

export function isKilled(killed: Record<string, boolean>, charId: string, bossId: string): boolean {
  return !!killed[clearKey(charId, bossId)];
}
// Number of crystals sold this week for a character's boss.
export function soldCount(sold: Record<string, number>, charId: string, bossId: string): number {
  return sold[clearKey(charId, bossId)] ?? 0;
}

// Meso a character earns from the crystals it sold this week.
export function characterMesos(
  ch: Character,
  sold: Record<string, number>,
  reboot: boolean
): number {
  let sum = 0;
  for (const boss of BOSSES) {
    const n = soldCount(sold, ch.id, boss.id);
    if (n > 0) sum += sellValue(ch, boss.id, reboot) * n;
  }
  return sum;
}

// Crystals a character has sold — counts toward the 180 account cap.
export function characterCrystals(ch: Character, sold: Record<string, number>): number {
  let n = 0;
  for (const boss of BOSSES) n += soldCount(sold, ch.id, boss.id);
  return n;
}

// Weekly crystals a character has sold — counts toward the 14/character cap.
export function characterWeeklyCrystals(ch: Character, sold: Record<string, number>): number {
  let n = 0;
  for (const boss of BOSSES)
    if (boss.reset === "weekly") n += soldCount(sold, ch.id, boss.id);
  return n;
}

const sameGroup = (a: Character, b: Character) =>
  a.account === b.account && a.world === b.world;

// RP is per account+world: if two characters share an account+world, only the FIRST
// (in roster order) to kill a boss claims its RP. This returns the count of bosses of a
// reset type this character CLAIMS — i.e. killed and not already claimed by an earlier
// character in the same account+world. Per-character claims sum to each group's distinct
// total, so dashboard totals never double-count within a world.
export function claimedKilledByReset(
  ch: Character,
  characters: Character[],
  killed: Record<string, boolean>,
  reset: Reset
): number {
  let n = 0;
  for (const boss of BOSSES) {
    if (boss.reset !== reset) continue;
    if (!isKilled(killed, ch.id, boss.id)) continue;
    const claimer = characters.find(
      (c) => sameGroup(c, ch) && isKilled(killed, c.id, boss.id)
    );
    if (claimer && claimer.id === ch.id) n += 1;
  }
  return n;
}

// Raw count of bosses of a reset a character killed (per-character, no dedup).
export function killedCountByReset(
  ch: Character,
  killed: Record<string, boolean>,
  reset: Reset
): number {
  let n = 0;
  for (const boss of BOSSES)
    if (boss.reset === reset && isKilled(killed, ch.id, boss.id)) n += 1;
  return n;
}

// RP-eligible boss kills for a character:
//   daily   -> shared per account+world (only the first claimer counts)
//   weekly/monthly -> per character (cleared on separate days, so they stack)
export function rpUnitsForChar(
  ch: Character,
  characters: Character[],
  killed: Record<string, boolean>,
  reset: Reset
): number {
  return reset === "daily"
    ? claimedKilledByReset(ch, characters, killed, "daily")
    : killedCountByReset(ch, killed, reset);
}

// Total boss RP units of a reset across the roster (sum of per-character eligible kills).
export function rpBossCount(
  characters: Character[],
  killed: Record<string, boolean>,
  reset: Reset
): number {
  return characters.reduce((n, ch) => n + rpUnitsForChar(ch, characters, killed, reset), 0);
}

export { BOSSES, MVP_TIERS };
