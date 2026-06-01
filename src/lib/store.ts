"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  BOSSES,
  BOSS_BY_ID,
  partyMesos,
  maxPartyFor,
  maxKills,
} from "./bosses";
import { weekStartUTC, monthStartUTC } from "./reset";
import { MVP_TIERS, type MvpTier, type RpOverride } from "./rp";

// A character's selection for one boss: which difficulty + party size it's run at.
export interface BossSel {
  difficulty: string;
  party: number;
}

export interface Character {
  id: string;
  name: string;
  bosses: Record<string, BossSel>;
}

// counts/clears are keyed by `${characterId}:${bossId}`.
// `counts[key]` = times killed this cycle (drives meso income + crystal totals).
export interface RosterState {
  characters: Character[];
  counts: Record<string, number>;
  weekAnchor: number; // weekStartUTC the daily/weekly counts belong to
  monthAnchor: number; // monthStartUTC the monthly counts belong to
  reboot: boolean;

  // RP planner
  rpOverrides: Record<string, RpOverride>;
  mvpTier: MvpTier;

  addCharacter: (name: string) => void;
  renameCharacter: (id: string, name: string) => void;
  removeCharacter: (id: string) => void;
  reorderCharacter: (id: string, dir: -1 | 1) => void;

  setBossDifficulty: (charId: string, bossId: string, difficulty: string) => void;
  setBossParty: (charId: string, bossId: string, party: number) => void;
  unsetBoss: (charId: string, bossId: string) => void;

  setCount: (charId: string, bossId: string, count: number, now: number) => void;
  toggleDone: (charId: string, bossId: string, now: number) => void; // checkbox: 0 <-> max
  setAllForCharacter: (charId: string, value: boolean, now: number) => void;
  resetByType: (reset: "daily" | "weekly" | "monthly") => void;
  reconcile: (now: number) => void;

  setReboot: (v: boolean) => void;
  setRpOverride: (id: string, patch: RpOverride) => void;
  setMvpTier: (tier: MvpTier) => void;
}

const uid = () =>
  `${Date.now().toString(36)}-${Math.floor(performance.now() * 1000).toString(36)}`;

export const clearKey = (charId: string, bossId: string) => `${charId}:${bossId}`;

const clampParty = (bossId: string, difficulty: string, party: number) =>
  Math.min(Math.max(1, party), maxPartyFor(bossId, difficulty));

const resetOf = (bossId: string) => BOSS_BY_ID[bossId]?.reset ?? "weekly";
const maxKillsOf = (bossId: string) => maxKills(resetOf(bossId));

export const useStore = create<RosterState>()(
  persist(
    (set, get) => ({
      characters: [],
      counts: {},
      weekAnchor: 0,
      monthAnchor: 0,
      reboot: false,
      rpOverrides: {},
      mvpTier: "None",

      addCharacter: (name) =>
        set((s) => ({
          characters: [
            ...s.characters,
            { id: uid(), name: name.trim() || "New Character", bosses: {} },
          ],
        })),

      renameCharacter: (id, name) =>
        set((s) => ({
          characters: s.characters.map((ch) =>
            ch.id === id ? { ...ch, name: name.trim() || ch.name } : ch
          ),
        })),

      removeCharacter: (id) =>
        set((s) => {
          const counts = { ...s.counts };
          Object.keys(counts).forEach((k) => {
            if (k.startsWith(`${id}:`)) delete counts[k];
          });
          return {
            characters: s.characters.filter((c) => c.id !== id),
            counts,
          };
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

      setBossDifficulty: (charId, bossId, difficulty) =>
        set((s) => ({
          characters: s.characters.map((ch) => {
            if (ch.id !== charId) return ch;
            const prevParty = ch.bosses[bossId]?.party ?? 1;
            return {
              ...ch,
              bosses: {
                ...ch.bosses,
                [bossId]: {
                  difficulty,
                  party: clampParty(bossId, difficulty, prevParty),
                },
              },
            };
          }),
        })),

      setBossParty: (charId, bossId, party) =>
        set((s) => ({
          characters: s.characters.map((ch) => {
            if (ch.id !== charId) return ch;
            const sel = ch.bosses[bossId];
            if (!sel) return ch;
            return {
              ...ch,
              bosses: {
                ...ch.bosses,
                [bossId]: { ...sel, party: clampParty(bossId, sel.difficulty, party) },
              },
            };
          }),
        })),

      unsetBoss: (charId, bossId) =>
        set((s) => {
          const counts = { ...s.counts };
          delete counts[clearKey(charId, bossId)];
          return {
            counts,
            characters: s.characters.map((ch) => {
              if (ch.id !== charId) return ch;
              const bosses = { ...ch.bosses };
              delete bosses[bossId];
              return { ...ch, bosses };
            }),
          };
        }),

      setCount: (charId, bossId, count, now) => {
        get().reconcile(now);
        set((s) => {
          const key = clearKey(charId, bossId);
          const n = Math.min(Math.max(0, Math.round(count)), maxKillsOf(bossId));
          const counts = { ...s.counts };
          if (n <= 0) delete counts[key];
          else counts[key] = n;
          return { counts };
        });
      },

      toggleDone: (charId, bossId, now) => {
        get().reconcile(now);
        set((s) => {
          const key = clearKey(charId, bossId);
          const max = maxKillsOf(bossId);
          const counts = { ...s.counts };
          if ((counts[key] ?? 0) >= max) delete counts[key];
          else counts[key] = max;
          return { counts };
        });
      },

      setAllForCharacter: (charId, value, now) => {
        get().reconcile(now);
        set((s) => {
          const ch = s.characters.find((c) => c.id === charId);
          if (!ch) return s;
          const counts = { ...s.counts };
          for (const bossId of Object.keys(ch.bosses)) {
            const key = clearKey(charId, bossId);
            if (value) counts[key] = maxKillsOf(bossId);
            else delete counts[key];
          }
          return { counts };
        });
      },

      resetByType: (reset) =>
        set((s) => {
          const counts = { ...s.counts };
          for (const key of Object.keys(counts)) {
            const bossId = key.slice(key.indexOf(":") + 1);
            if (resetOf(bossId) === reset) delete counts[key];
          }
          return { counts };
        }),

      // Daily + weekly counts belong to a Maple week (Thursday→Thursday); monthly
      // counts belong to a calendar month. Zero them when their cycle rolls over.
      reconcile: (now) =>
        set((s) => {
          const wk = weekStartUTC(now);
          const mo = monthStartUTC(now);
          if (s.weekAnchor === wk && s.monthAnchor === mo) return s;
          const counts = { ...s.counts };
          for (const key of Object.keys(counts)) {
            const reset = resetOf(key.slice(key.indexOf(":") + 1));
            if ((reset === "daily" || reset === "weekly") && s.weekAnchor !== wk)
              delete counts[key];
            if (reset === "monthly" && s.monthAnchor !== mo) delete counts[key];
          }
          return { counts, weekAnchor: wk, monthAnchor: mo };
        }),

      setReboot: (v) => set({ reboot: v }),

      setRpOverride: (id, patch) =>
        set((s) => ({
          rpOverrides: { ...s.rpOverrides, [id]: { ...s.rpOverrides[id], ...patch } },
        })),

      setMvpTier: (tier) => set({ mvpTier: tier }),
    }),
    {
      name: "mapletracker-roster",
      version: 4,
      partialize: (s) => ({
        characters: s.characters,
        counts: s.counts,
        weekAnchor: s.weekAnchor,
        monthAnchor: s.monthAnchor,
        reboot: s.reboot,
        rpOverrides: s.rpOverrides,
        mvpTier: s.mvpTier,
      }),
      migrate: (persisted, version) => {
        const now = Date.now();
        const s = persisted as Record<string, unknown> & {
          characters?: Array<{ id?: string; name: string; bosses?: Record<string, unknown> }>;
        };
        // v1 -> bosses were difficulty strings.
        if (version < 2 && s?.characters) {
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
        // v3 -> convert boolean/timestamp `cleared` into kill `counts` (cleared => max).
        if (version < 4) {
          const cleared = (s.cleared ?? {}) as Record<string, unknown>;
          const counts: Record<string, number> = {};
          for (const [k, v] of Object.entries(cleared)) {
            if (v) {
              const bossId = k.slice(k.indexOf(":") + 1);
              counts[k] = maxKillsOf(bossId);
            }
          }
          s.counts = counts;
          delete s.cleared;
          delete s.weeklySold;
          s.weekAnchor = weekStartUTC(now);
          s.monthAnchor = monthStartUTC(now);
          s.rpOverrides = {};
          s.mvpTier = "None";
        }
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

export function selMesos(sel: BossSel, bossId: string, reboot: boolean): number {
  return partyMesos(bossId, sel.difficulty, sel.party, mult(reboot));
}

export function bossCount(counts: Record<string, number>, charId: string, bossId: string): number {
  return counts[clearKey(charId, bossId)] ?? 0;
}

// Weekly meso this character makes from kills entered.
export function characterMesos(
  ch: Character,
  counts: Record<string, number>,
  reboot: boolean
): number {
  return Object.entries(ch.bosses).reduce((sum, [bossId, sel]) => {
    return sum + selMesos(sel, bossId, reboot) * bossCount(counts, ch.id, bossId);
  }, 0);
}

// Max possible weekly meso if every tracked boss is fully killed.
export function characterPotential(
  ch: Character,
  reboot: boolean
): number {
  return Object.entries(ch.bosses).reduce((sum, [bossId, sel]) => {
    return sum + selMesos(sel, bossId, reboot) * maxKills(resetOf(bossId));
  }, 0);
}

// Total crystals (kills) on this character — counts toward the 180 account cap.
export function characterCrystals(ch: Character, counts: Record<string, number>): number {
  return Object.keys(ch.bosses).reduce((n, bossId) => n + bossCount(counts, ch.id, bossId), 0);
}

// Weekly crystals (kills of weekly bosses) — counts toward the 14/character cap.
export function characterWeeklyCrystals(ch: Character, counts: Record<string, number>): number {
  return Object.keys(ch.bosses).reduce(
    (n, bossId) => (resetOf(bossId) === "weekly" ? n + bossCount(counts, ch.id, bossId) : n),
    0
  );
}

// Count of bosses of a given reset type tracked across the whole roster
// (default qty for the per-reset boss RP lines).
export function totalBossesTrackedByReset(
  characters: Character[],
  reset: "daily" | "weekly" | "monthly"
): number {
  return characters.reduce(
    (n, ch) => n + Object.keys(ch.bosses).filter((b) => resetOf(b) === reset).length,
    0
  );
}

export { BOSSES, MVP_TIERS };
