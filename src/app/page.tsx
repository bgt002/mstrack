"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { bossImage } from "@/lib/bossImages";
import {
  useStore,
  useHydrated,
  sellValue,
  isKilled,
  soldCount,
  diffOf,
  characterMesos,
  characterCrystals,
  characterWeeklyCrystals,
  rpUnitsForChar,
  rpBossCount,
  type Character,
} from "@/lib/store";
import { WORLDS } from "@/lib/classes";
import {
  BOSSES,
  DIFFICULTY_COLOR,
  formatMesos,
  formatMesosFull,
  maxPartyFor,
  sortPrice,
  sellsPerCycle,
  WEEKLY_CRYSTAL_LIMIT,
  WEEKLY_PER_CHARACTER_LIMIT,
  type Reset,
} from "@/lib/bosses";
import { nextResetLabel } from "@/lib/reset";
import {
  RP_BY_ID,
  MONTHLY_RP_CAP,
  computeMonthlyRp,
  type RpOverride,
} from "@/lib/rp";

const RESET_ORDER: Reset[] = ["daily", "weekly", "monthly"];
const RESET_LABEL: Record<Reset, string> = { daily: "Daily", weekly: "Weekly", monthly: "Monthly" };

const TAB_COLORS = [
  "#60a5fa", "#f59e0b", "#34d399", "#f43f5e", "#a855f7",
  "#22d3ee", "#fb923c", "#a3e635", "#e879f9", "#facc15",
];
const tabColor = (i: number) => TAB_COLORS[i % TAB_COLORS.length];

export default function TrackerPage() {
  const hydrated = useHydrated();
  const characters = useStore((s) => s.characters);
  const killed = useStore((s) => s.killed);
  const sold = useStore((s) => s.sold);
  const reboot = useStore((s) => s.reboot);
  const setReboot = useStore((s) => s.setReboot);
  const addCharacter = useStore((s) => s.addCharacter);
  const renameCharacter = useStore((s) => s.renameCharacter);
  const removeCharacter = useStore((s) => s.removeCharacter);
  const reorderCharacter = useStore((s) => s.reorderCharacter);
  const duplicateCharacter = useStore((s) => s.duplicateCharacter);
  const setBossDifficulty = useStore((s) => s.setBossDifficulty);
  const setBossParty = useStore((s) => s.setBossParty);
  const toggleKilled = useStore((s) => s.toggleKilled);
  const setSold = useStore((s) => s.setSold);
  const markAllKilled = useStore((s) => s.markAllKilled);
  const clearAll = useStore((s) => s.clearAll);
  const resetByType = useStore((s) => s.resetByType);

  const [view, setView] = useState<string>("dashboard"); // "dashboard" | charId
  const [newName, setNewName] = useState("");

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = () => {
      setNow(Date.now());
      useStore.getState().reconcile(Date.now());
    };
    const id = setInterval(tick, 60_000);
    window.addEventListener("focus", tick);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", tick);
    };
  }, []);

  const activeIdx = characters.findIndex((c) => c.id === view);
  const active = activeIdx >= 0 ? characters[activeIdx] : null;
  const showDashboard = !active;

  const submitNewChar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    addCharacter(newName);
    setNewName("");
  };

  if (!hydrated) {
    return <div className="card p-12 animate-pulse opacity-40 h-72" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Boss Tracker</h1>
          <p className="text-muted text-sm mt-1">
            Mark <span className="text-foreground">Killed</span> for RP and{" "}
            <span className="text-foreground">Sold</span> for mesos. Dailies count as the full week.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button className="btn" onClick={() => setReboot(!reboot)} title="Heroic (Reboot) worlds sell crystals for 5x">
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${reboot ? "bg-green-400" : "bg-muted"}`} />
            Heroic ×5 {reboot ? "ON" : "OFF"}
          </button>
          <ResetMenu now={now} onReset={resetByType} />
        </div>
      </div>

      {/* Tabs: Dashboard + characters + inline add */}
      <div className="flex gap-2 overflow-x-auto pb-1 items-stretch">
        <button
          onClick={() => setView("dashboard")}
          className={`shrink-0 rounded-xl px-4 py-2.5 text-left border transition ${
            showDashboard ? "bg-surface-2 border-[var(--accent-2)]" : "bg-surface border-transparent hover:border-border"
          }`}
        >
          <div className="font-bold text-sm">📊 Dashboard</div>
          <div className="text-xs text-muted mt-0.5">
            {characters.length} character{characters.length === 1 ? "" : "s"}
          </div>
        </button>

        {characters.map((c, i) => {
          const color = tabColor(i);
          const killedTotal = BOSSES.filter((b) => isKilled(killed, c.id, b.id)).length;
          const isActive = c.id === view;
          return (
            <button
              key={c.id}
              onClick={() => setView(c.id)}
              className={`shrink-0 rounded-xl px-4 py-2.5 text-left border transition ${
                isActive ? "bg-surface-2 border-border" : "bg-surface border-transparent hover:border-border"
              }`}
              style={isActive ? { borderColor: `${color}88` } : undefined}
            >
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
                <span className="font-bold text-sm">{c.name}</span>
              </div>
              <div className="text-xs text-muted mt-0.5">{killedTotal} killed</div>
            </button>
          );
        })}

        <form
          onSubmit={submitNewChar}
          className="shrink-0 flex items-center gap-1.5 rounded-xl border border-dashed border-border px-3 bg-surface"
        >
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Character name"
            className="bg-transparent text-sm outline-none w-36 placeholder:text-muted"
          />
          <button type="submit" className="btn btn-primary text-xs px-3 py-1.5">+ Add</button>
        </form>
      </div>

      {showDashboard ? (
        characters.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="text-5xl mb-3">🍁</div>
            <h3 className="font-bold text-lg">No characters yet</h3>
            <p className="text-muted text-sm mt-1">Add your first character above to start tracking.</p>
          </div>
        ) : (
          <Dashboard characters={characters} killed={killed} sold={sold} reboot={reboot} now={now} onSelect={setView} />
        )
      ) : (
        active && (
          <CharacterPanel
            key={active.id}
            character={active}
            index={activeIdx}
            count={characters.length}
            killed={killed}
            sold={sold}
            reboot={reboot}
            onRename={(name) => renameCharacter(active.id, name)}
            onRemove={() => {
              if (confirm(`Delete ${active.name}?`)) {
                removeCharacter(active.id);
                setView("dashboard");
              }
            }}
            onReorder={(dir) => reorderCharacter(active.id, dir)}
            onDuplicate={() => duplicateCharacter(active.id)}
            onSetParty={(bossId, p) => setBossParty(active.id, bossId, p)}
            onSetDifficulty={(bossId, d) => setBossDifficulty(active.id, bossId, d)}
            onToggleKilled={(bossId) => toggleKilled(active.id, bossId, Date.now())}
            onSetSold={(bossId, n) => setSold(active.id, bossId, n, Date.now())}
            onMarkAllKilled={(reset) => markAllKilled(active.id, reset, Date.now())}
            onClearAll={() => clearAll(active.id, Date.now())}
          />
        )
      )}
    </div>
  );
}

// ---------------- Dashboard ----------------

// A character's RP from killed bosses, split into per-day and per-week rates.
interface CharRp {
  perDay: number; // daily-boss RP earned each day
  perWeek: number; // weekly-boss RP earned each week
  weeklyTotal: number; // perDay * 7 + perWeek
}
function charWeeklyRp(
  ch: Character,
  characters: Character[],
  killed: Record<string, boolean>,
  rpOverrides: Record<string, RpOverride>
): CharRp {
  const rate = (id: string) => rpOverrides[id]?.rp ?? RP_BY_ID[id].defaultRp;
  const enabled = (id: string) => rpOverrides[id]?.on !== false;
  // claimed counts dedupe shared bosses within the same account+world
  const perDay = enabled("daily-bosses")
    ? rpUnitsForChar(ch, characters, killed, "daily") * rate("daily-bosses")
    : 0;
  const perWeek = enabled("weekly-bosses")
    ? rpUnitsForChar(ch, characters, killed, "weekly") * rate("weekly-bosses")
    : 0;
  return { perDay, perWeek, weeklyTotal: perDay * 7 + perWeek };
}

function Dashboard({
  characters,
  killed,
  sold,
  reboot,
  now,
  onSelect,
}: {
  characters: Character[];
  killed: Record<string, boolean>;
  sold: Record<string, number>;
  reboot: boolean;
  now: number;
  onSelect: (id: string) => void;
}) {
  const rpOverrides = useStore((s) => s.rpOverrides);
  let weekly = 0;
  let crystals = 0;
  let weeklyRp = 0;
  for (const ch of characters) {
    weekly += characterMesos(ch, sold, reboot);
    crystals += characterCrystals(ch, sold);
    weeklyRp += charWeeklyRp(ch, characters, killed, rpOverrides).weeklyTotal;
  }

  // group characters by account + world (shared RP pool)
  const groups: { account: string; world: string; chars: Character[] }[] = [];
  for (const ch of characters) {
    let g = groups.find((x) => x.account === ch.account && x.world === ch.world);
    if (!g) {
      g = { account: ch.account, world: ch.world, chars: [] };
      groups.push(g);
    }
    g.chars.push(ch);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Weekly meso (sold)" value={formatMesos(weekly)} sub={formatMesosFull(weekly) + " across roster"} accent="var(--green)" />
        <SummaryCard
          label="Crystals sold this week"
          value={`${crystals} / ${WEEKLY_CRYSTAL_LIMIT}`}
          sub="account weekly sell cap"
          accent="var(--accent-2)"
          warn={crystals > WEEKLY_CRYSTAL_LIMIT}
        />
        <SummaryCard
          label="Weekly RP (bosses)"
          value={weeklyRp.toLocaleString()}
          sub="Σ (RP/day × 7 + RP/week) per character"
          accent="var(--accent)"
        />
        <MonthlyRpCard now={now} />
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wide text-muted">
          Characters by account &amp; world — click for details
        </h3>
        {groups.map((g) => {
          const groupRp = g.chars.reduce(
            (n, c) => n + charWeeklyRp(c, characters, killed, rpOverrides).weeklyTotal,
            0
          );
          return (
            <div key={`${g.account} ${g.world}`} className="space-y-1">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold">
                  {g.account} <span className="text-muted">·</span> {g.world}
                </span>
                <span className="text-[11px] text-muted" title="Daily-boss RP is shared within this world; weekly/monthly RP is per character">
                  {groupRp.toLocaleString()} RP/wk
                </span>
              </div>
              <div className="card divide-y divide-[var(--border)]">
                {g.chars.map((c) => {
                  const i = characters.indexOf(c);
                  const wk = characterMesos(c, sold, reboot);
                  const wkCry = characterWeeklyCrystals(c, sold);
                  const totalCry = characterCrystals(c, sold);
                  const wrp = charWeeklyRp(c, characters, killed, rpOverrides);
                  return (
                    <button
                      key={c.id}
                      onClick={() => onSelect(c.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-2/40 transition"
                    >
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: tabColor(i) }} />
                      <span className="font-bold flex-1 min-w-0 truncate">{c.name}</span>
                      <DashStat label="Meso / wk" value={formatMesos(wk)} accent="var(--green)" />
                      <DashStat
                        label="Crystals"
                        value={`${wkCry}/${WEEKLY_PER_CHARACTER_LIMIT}`}
                        sub={`${totalCry} total`}
                        warn={wkCry > WEEKLY_PER_CHARACTER_LIMIT}
                      />
                      <DashStat label="RP / wk" value={wrp.weeklyTotal.toLocaleString()} sub={`${wrp.perDay.toLocaleString()}/d · ${wrp.perWeek.toLocaleString()}/wk`} accent="var(--accent)" />
                      <span className="text-muted shrink-0">→</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DashStat({ label, value, sub, accent, warn }: { label: string; value: string; sub?: string; accent?: string; warn?: boolean }) {
  return (
    <div className="text-right w-20 shrink-0 hidden sm:block">
      <div className="text-[10px] uppercase tracking-wide text-muted">{label}</div>
      <div className="font-bold text-sm tabular-nums" style={{ color: warn ? "#f43f5e" : accent ?? "var(--foreground)" }}>{value}</div>
      {sub && <div className="text-[10px] text-muted">{sub}</div>}
    </div>
  );
}

// ---------------- Character grid ----------------

function CharacterPanel({
  character,
  index,
  count,
  killed,
  sold,
  reboot,
  onRename,
  onRemove,
  onReorder,
  onDuplicate,
  onSetParty,
  onSetDifficulty,
  onToggleKilled,
  onSetSold,
  onMarkAllKilled,
  onClearAll,
}: {
  character: Character;
  index: number;
  count: number;
  killed: Record<string, boolean>;
  sold: Record<string, number>;
  reboot: boolean;
  onRename: (name: string) => void;
  onRemove: () => void;
  onReorder: (dir: -1 | 1) => void;
  onDuplicate: () => void;
  onSetParty: (bossId: string, party: number) => void;
  onSetDifficulty: (bossId: string, difficulty: string) => void;
  onToggleKilled: (bossId: string) => void;
  onSetSold: (bossId: string, count: number) => void;
  onMarkAllKilled: (reset: Reset) => void;
  onClearAll: () => void;
}) {
  const rpOverrides = useStore((s) => s.rpOverrides);
  const allCharacters = useStore((s) => s.characters);
  const setAccount = useStore((s) => s.setAccount);
  const setWorld = useStore((s) => s.setWorld);
  const { id, name } = character;
  const weekly = characterMesos(character, sold, reboot);
  const weeklyCrystals = characterWeeklyCrystals(character, sold);
  const totalCrystals = characterCrystals(character, sold);
  const overWeeklyCap = weeklyCrystals > WEEKLY_PER_CHARACTER_LIMIT;
  const wrp = charWeeklyRp(character, allCharacters, killed, rpOverrides);
  const accounts = Array.from(new Set(allCharacters.map((c) => c.account)));

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <input
              defaultValue={name}
              key={name}
              onBlur={(e) => onRename(e.target.value)}
              className="bg-transparent font-extrabold text-lg outline-none border-b border-transparent focus:border-border min-w-0 w-44"
            />
            <div className="flex items-center gap-3 mt-1.5 text-xs text-muted flex-wrap">
              <label className="flex items-center gap-1">
                Account
                <input
                  list="account-list"
                  key={`a${character.account}`}
                  defaultValue={character.account}
                  onBlur={(e) => setAccount(id, e.target.value)}
                  className="bg-surface-2 rounded px-1.5 py-0.5 text-foreground outline-none w-28 border border-border focus:border-[var(--accent-2)]"
                />
              </label>
              <label className="flex items-center gap-1">
                World
                <input
                  list="world-list"
                  key={`w${character.world}`}
                  defaultValue={character.world}
                  onBlur={(e) => setWorld(id, e.target.value)}
                  className="bg-surface-2 rounded px-1.5 py-0.5 text-foreground outline-none w-28 border border-border focus:border-[var(--accent-2)]"
                />
              </label>
            </div>
            <datalist id="account-list">
              {accounts.map((a) => (
                <option key={a} value={a} />
              ))}
            </datalist>
            <datalist id="world-list">
              {WORLDS.map((w) => (
                <option key={w} value={w} />
              ))}
            </datalist>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-xs font-bold rounded-lg px-2.5 py-2 border ${
                overWeeklyCap ? "border-[#f43f5e] text-[#f43f5e]" : "border-border text-muted"
              }`}
              title="Weekly crystals per character cannot exceed 14 (GMS)"
            >
              Weekly {weeklyCrystals}/{WEEKLY_PER_CHARACTER_LIMIT}
            </span>
            <button className="btn text-xs px-2.5" disabled={index === 0} onClick={() => onReorder(-1)} title="Move left">←</button>
            <button className="btn text-xs px-2.5" disabled={index === count - 1} onClick={() => onReorder(1)} title="Move right">→</button>
            <button className="btn text-xs px-2.5" onClick={onDuplicate} title="Duplicate this character">⧉ Duplicate</button>
            <button className="btn btn-danger text-xs px-2.5" onClick={onRemove}>Delete</button>
          </div>
        </div>

        {/* This character's weekly stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
          <RpStat label="Meso / week (sold)" value={formatMesos(weekly)} sub={formatMesosFull(weekly)} accent="var(--green)" />
          <RpStat label="Crystals sold" value={`${weeklyCrystals}/${WEEKLY_PER_CHARACTER_LIMIT} wk`} sub={`${totalCrystals} total`} accent={overWeeklyCap ? "#f43f5e" : undefined} />
          <RpStat label="RP / day" value={wrp.perDay.toLocaleString()} sub="daily bosses killed" accent="var(--accent)" />
          <RpStat label="RP / week" value={wrp.perWeek.toLocaleString()} sub="weekly bosses killed" accent="var(--accent)" />
        </div>
        <p className="text-[11px] text-muted mt-1.5">
          Weekly RP for this character = RP/day × 7 + RP/week ={" "}
          <span className="text-foreground">{wrp.weeklyTotal.toLocaleString()}</span>. Daily-boss RP is
          shared in <span className="text-foreground">{character.account} · {character.world}</span>{" "}
          (only the first character claims it); weekly &amp; monthly boss RP is earned per character.
        </p>

        <div className="flex items-center gap-2 mt-4 flex-wrap">
          <button className="btn text-sm" onClick={() => onMarkAllKilled("daily")}>Mark all dailies killed</button>
          <button className="btn text-sm" onClick={() => onMarkAllKilled("weekly")}>Mark all weeklies killed</button>
          <button className="btn text-sm" onClick={onClearAll}>Clear all</button>
        </div>
      </div>

      {RESET_ORDER.map((reset) => {
        const list = BOSSES.filter((b) => b.reset === reset).sort(
          (a, b) => sortPrice(a) - sortPrice(b)
        );
        if (list.length === 0) return null;
        const sells = sellsPerCycle(reset);
        return (
          <div key={reset} className="space-y-2">
            <h3 className="text-sm font-bold uppercase tracking-wide text-muted">
              {RESET_LABEL[reset]} Bosses
              {reset === "daily" && <span className="text-muted/70 font-normal normal-case"> · set how many you sell (up to 7/week)</span>}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {list.map((boss) => {
                const difficulty = diffOf(character, boss.id);
                const per = sellValue(character, boss.id, reboot);
                const maxParty = maxPartyFor(boss.id, difficulty);
                const party = character.bosses[boss.id]?.party ?? 1;
                const wasKilled = isKilled(killed, id, boss.id);
                const soldN = soldCount(sold, id, boss.id);
                return (
                  <div key={boss.id} className="card p-3 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <BossIcon id={boss.id} name={boss.name} small />
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-sm truncate">{boss.name}</div>
                        <div className="text-[11px]">
                          {boss.rpOnly ? (
                            <span className="text-muted">RP only · no crystal</span>
                          ) : (
                            <>
                              <span className="text-accent">{formatMesos(per)}</span>
                              <span className="text-muted">/crystal</span>
                              {soldN > 0 && (
                                <span style={{ color: "var(--green)" }}> · sold {formatMesos(per * soldN)}</span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {!boss.rpOnly && (
                      <div className="flex flex-wrap gap-1">
                        {boss.difficulties.map((d) => {
                          const isSel = difficulty === d.difficulty;
                          const dc = DIFFICULTY_COLOR[d.difficulty] ?? "#888";
                          return (
                            <button
                              key={d.difficulty}
                              onClick={() => onSetDifficulty(boss.id, d.difficulty)}
                              className="text-[11px] font-bold rounded px-1.5 py-0.5 border transition"
                              style={{
                                color: isSel ? "#0b0f1a" : dc,
                                background: isSel ? dc : "transparent",
                                borderColor: `${dc}66`,
                              }}
                              title={`${formatMesosFull(d.mesos)} solo`}
                            >
                              {d.difficulty}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 mt-auto">
                      <button
                        onClick={() => onToggleKilled(boss.id)}
                        className={`flex-1 text-xs font-bold rounded-md py-1.5 border transition ${
                          wasKilled
                            ? "bg-amber-500 border-amber-500 text-[#241a00]"
                            : "border-border bg-surface-2 text-muted hover:text-foreground"
                        }`}
                        title="Killed — earns RP"
                      >
                        {wasKilled ? "⚔ Killed" : "Kill"}
                      </button>
                      {boss.rpOnly ? null : sells > 1 ? (
                        <div
                          className="flex items-center rounded-md border border-border bg-surface-2 shrink-0"
                          title="Crystals sold this week (drives mesos)"
                        >
                          <button
                            className="px-1.5 py-1 text-muted hover:text-foreground disabled:opacity-30"
                            onClick={() => onSetSold(boss.id, soldN - 1)}
                            disabled={soldN <= 0}
                          >
                            −
                          </button>
                          <span
                            className="w-12 text-center text-[11px] font-bold tabular-nums"
                            style={soldN > 0 ? { color: "var(--green)" } : undefined}
                          >
                            💰{soldN}/{sells}
                          </span>
                          <button
                            className="px-1.5 py-1 text-muted hover:text-foreground disabled:opacity-30"
                            onClick={() => onSetSold(boss.id, soldN + 1)}
                            disabled={soldN >= sells}
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => onSetSold(boss.id, soldN > 0 ? 0 : 1)}
                          className={`flex-1 text-xs font-bold rounded-md py-1.5 border transition ${
                            soldN > 0
                              ? "bg-green-500 border-green-500 text-[#06281c]"
                              : "border-border bg-surface-2 text-muted hover:text-foreground"
                          }`}
                          title="Sold crystal — earns mesos"
                        >
                          {soldN > 0 ? "💰 Sold" : "Sell"}
                        </button>
                      )}
                      {!boss.rpOnly && maxParty > 1 && (
                        <Stepper
                          value={party}
                          min={1}
                          max={maxParty}
                          label={`👥${party}`}
                          title="Party size — crystal value is split"
                          onChange={(p) => onSetParty(boss.id, p)}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------- RP calculator ----------------

function MonthlyRpCard({ now }: { now: number }) {
  const rpOverrides = useStore((s) => s.rpOverrides);
  const mvpTier = useStore((s) => s.mvpTier);
  const characters = useStore((s) => s.characters);
  const killed = useStore((s) => s.killed);
  const eff = effectiveRpOverrides(rpOverrides, characters, killed);
  const res = computeMonthlyRp(eff, mvpTier, now);
  return (
    <SummaryCard
      label="Monthly RP"
      value={res.total.toLocaleString("en-US")}
      sub={res.capped ? `capped at ${MONTHLY_RP_CAP.toLocaleString()} (raw ${res.rawMonthly.toLocaleString()})` : `of ${MONTHLY_RP_CAP.toLocaleString()} cap`}
      accent="var(--accent)"
      warn={res.capped}
    />
  );
}

// Default the boss-RP qtys to DISTINCT bosses killed across the roster (per world).
function effectiveRpOverrides(
  rpOverrides: Record<string, RpOverride>,
  characters: Character[],
  killed: Record<string, boolean>
): Record<string, RpOverride> {
  const withQty = (id: string, reset: Reset) => {
    const o = rpOverrides[id] ?? {};
    return { ...o, qty: o.qty ?? rpBossCount(characters, killed, reset) };
  };
  return {
    ...rpOverrides,
    "daily-bosses": withQty("daily-bosses", "daily"),
    "weekly-bosses": withQty("weekly-bosses", "weekly"),
    "monthly-bosses": withQty("monthly-bosses", "monthly"),
  };
}

function RpStat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="rounded-lg bg-surface-2 p-3">
      <div className="label">{label}</div>
      <div className="text-lg font-extrabold mt-0.5" style={{ color: accent ?? "var(--foreground)" }}>{value}</div>
      {sub && <div className="text-[11px] text-muted">{sub}</div>}
    </div>
  );
}

// ---------------- shared bits ----------------

function ResetMenu({ now, onReset }: { now: number; onReset: (reset: Reset) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button className="btn btn-danger" onClick={() => setOpen((o) => !o)}>Reset ▾</button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 z-40 card p-1.5 w-52">
            {RESET_ORDER.map((reset) => (
              <button
                key={reset}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-surface-2 text-sm flex items-center justify-between"
                onClick={() => {
                  if (confirm(`Reset all ${RESET_LABEL[reset].toLowerCase()} markers?`)) {
                    onReset(reset);
                    setOpen(false);
                  }
                }}
              >
                <span className="font-semibold">Reset {RESET_LABEL[reset].toLowerCase()}</span>
                <span className="text-xs text-muted">{nextResetLabel(reset, now)}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function BossIcon({ id, name, small }: { id: string; name: string; small?: boolean }) {
  const src = bossImage(id);
  const sz = small ? "h-8 w-8" : "h-10 w-10";
  const px = small ? 32 : 40;
  return (
    <div className={`${sz} shrink-0 grid place-items-center rounded-lg bg-surface-2 overflow-hidden`}>
      {src ? (
        <Image src={src} alt={name} width={px} height={px} className={`${sz} object-contain`} unoptimized />
      ) : (
        <span className="text-base font-black text-muted">{name.charAt(0)}</span>
      )}
    </div>
  );
}

function Stepper({ value, min, max, label, title, onChange }: { value: number; min: number; max: number; label: string; title: string; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center rounded-lg border border-border bg-surface-2 shrink-0" title={title}>
      <button className="px-1.5 py-1 text-muted hover:text-foreground disabled:opacity-30" onClick={() => onChange(value - 1)} disabled={value <= min}>−</button>
      <span className="w-8 text-center text-[11px] font-bold tabular-nums">{label}</span>
      <button className="px-1.5 py-1 text-muted hover:text-foreground disabled:opacity-30" onClick={() => onChange(value + 1)} disabled={value >= max}>+</button>
    </div>
  );
}

function SummaryCard({ label, value, sub, accent, warn }: { label: string; value: string; sub: string; accent: string; warn?: boolean }) {
  return (
    <div className="card p-5">
      <div className="label">{label}</div>
      <div className="text-2xl font-extrabold mt-1" style={{ color: warn ? "#f43f5e" : accent }}>{value}</div>
      <div className="text-xs text-muted mt-1">{sub}</div>
    </div>
  );
}
