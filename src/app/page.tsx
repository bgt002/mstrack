"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { bossImage } from "@/lib/bossImages";
import {
  useStore,
  useHydrated,
  selMesos,
  bossCount,
  characterMesos,
  characterPotential,
  characterCrystals,
  characterWeeklyCrystals,
  totalBossesTrackedByReset,
  type BossSel,
  type Character,
} from "@/lib/store";
import {
  BOSSES,
  BOSS_BY_ID,
  DIFFICULTY_COLOR,
  formatMesos,
  formatMesosFull,
  maxPartyFor,
  maxKills,
  WEEKLY_CRYSTAL_LIMIT,
  WEEKLY_PER_CHARACTER_LIMIT,
  type Reset,
} from "@/lib/bosses";
import { nextResetLabel } from "@/lib/reset";
import {
  RP_ACTIVITIES,
  MVP_TIERS,
  MONTHLY_RP_CAP,
  computeMonthlyRp,
  mvpAdjustedRp,
  type MvpTier,
  type RpGroup,
  type RpOverride,
} from "@/lib/rp";

const RESET_ORDER: Reset[] = ["daily", "weekly", "monthly"];
const RESET_LABEL: Record<Reset, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

const TAB_COLORS = [
  "#60a5fa", "#f59e0b", "#34d399", "#f43f5e", "#a855f7",
  "#22d3ee", "#fb923c", "#a3e635", "#e879f9", "#facc15",
];
const tabColor = (i: number) => TAB_COLORS[i % TAB_COLORS.length];

export default function TrackerPage() {
  const hydrated = useHydrated();
  const characters = useStore((s) => s.characters);
  const counts = useStore((s) => s.counts);
  const reboot = useStore((s) => s.reboot);
  const setReboot = useStore((s) => s.setReboot);
  const addCharacter = useStore((s) => s.addCharacter);
  const renameCharacter = useStore((s) => s.renameCharacter);
  const removeCharacter = useStore((s) => s.removeCharacter);
  const reorderCharacter = useStore((s) => s.reorderCharacter);
  const setBossDifficulty = useStore((s) => s.setBossDifficulty);
  const setBossParty = useStore((s) => s.setBossParty);
  const unsetBoss = useStore((s) => s.unsetBoss);
  const setCount = useStore((s) => s.setCount);
  const toggleDone = useStore((s) => s.toggleDone);
  const setAllForCharacter = useStore((s) => s.setAllForCharacter);
  const resetByType = useStore((s) => s.resetByType);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
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

  const activeId = characters.some((c) => c.id === selectedId)
    ? selectedId
    : characters[0]?.id ?? null;
  const activeIdx = characters.findIndex((c) => c.id === activeId);
  const active = characters[activeIdx] ?? null;

  const totals = useMemo(() => {
    let weekly = 0;
    let crystals = 0;
    for (const ch of characters) {
      weekly += characterMesos(ch, counts, reboot);
      crystals += characterCrystals(ch, counts);
    }
    return { weekly, crystals };
  }, [characters, counts, reboot]);

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
            Add characters, set how many times you kill each boss, and see your weekly
            meso total. Dailies count up to 7/week; weeklies once.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            className="btn"
            onClick={() => setReboot(!reboot)}
            title="Heroic (Reboot) worlds sell crystals for 5x"
          >
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full ${
                reboot ? "bg-green-400" : "bg-muted"
              }`}
            />
            Heroic ×5 {reboot ? "ON" : "OFF"}
          </button>
          <ResetMenu now={now} onReset={resetByType} />
        </div>
      </div>

      {/* Account summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Weekly meso total"
          value={formatMesos(totals.weekly)}
          sub={formatMesosFull(totals.weekly) + " across roster"}
          accent="var(--green)"
        />
        <SummaryCard
          label="Crystals this week"
          value={`${totals.crystals} / ${WEEKLY_CRYSTAL_LIMIT}`}
          sub="account weekly sell cap (all crystals)"
          accent="var(--accent-2)"
          warn={totals.crystals > WEEKLY_CRYSTAL_LIMIT}
        />
        <MonthlyRpCard now={now} />
      </div>

      {/* Character tabs + inline add */}
      <div className="flex gap-2 overflow-x-auto pb-1 items-stretch">
        {characters.map((c, i) => {
          const color = tabColor(i);
          const done = Object.keys(c.bosses).filter(
            (b) => bossCount(counts, c.id, b) >= maxKills(BOSS_BY_ID[b].reset)
          ).length;
          const total = Object.keys(c.bosses).length;
          const isActive = c.id === activeId;
          return (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={`shrink-0 rounded-xl px-4 py-2.5 text-left border transition ${
                isActive
                  ? "bg-surface-2 border-border"
                  : "bg-surface border-transparent hover:border-border"
              }`}
              style={isActive ? { borderColor: `${color}88` } : undefined}
            >
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
                <span className="font-bold text-sm">{c.name}</span>
              </div>
              <div className="text-xs text-muted mt-0.5">
                {total > 0 ? `${done}/${total} done` : "no bosses"}
              </div>
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
          <button type="submit" className="btn btn-primary text-xs px-3 py-1.5">
            + Add
          </button>
        </form>
      </div>

      {!active ? (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-3">🍁</div>
          <h3 className="font-bold text-lg">No characters yet</h3>
          <p className="text-muted text-sm mt-1">
            Add your first character above to start building a boss checklist.
          </p>
        </div>
      ) : (
        <CharacterPanel
          key={active.id}
          character={active}
          index={activeIdx}
          count={characters.length}
          counts={counts}
          reboot={reboot}
          now={now}
          onRename={(name) => renameCharacter(active.id, name)}
          onRemove={() => {
            if (confirm(`Delete ${active.name}?`)) removeCharacter(active.id);
          }}
          onReorder={(dir) => reorderCharacter(active.id, dir)}
          onSetParty={(bossId, p) => setBossParty(active.id, bossId, p)}
          onSetDifficulty={(bossId, d) => setBossDifficulty(active.id, bossId, d)}
          onUnset={(bossId) => unsetBoss(active.id, bossId)}
          onToggle={(bossId) => toggleDone(active.id, bossId, Date.now())}
          onSetCount={(bossId, n) => setCount(active.id, bossId, n, Date.now())}
          onSetAll={(v) => setAllForCharacter(active.id, v, Date.now())}
          onAddBoss={() => setAdding(true)}
        />
      )}

      <RpCalculator now={now} />

      {adding && active && (
        <AddBossModal
          bosses={active.bosses}
          onPick={(bossId, difficulty) => setBossDifficulty(active.id, bossId, difficulty)}
          onRemove={(bossId) => unsetBoss(active.id, bossId)}
          onClose={() => setAdding(false)}
        />
      )}
    </div>
  );
}

function CharacterPanel({
  character,
  index,
  count,
  counts,
  reboot,
  onRename,
  onRemove,
  onReorder,
  onSetParty,
  onSetDifficulty,
  onUnset,
  onToggle,
  onSetCount,
  onSetAll,
  onAddBoss,
}: {
  character: Character;
  index: number;
  count: number;
  counts: Record<string, number>;
  reboot: boolean;
  now: number;
  onRename: (name: string) => void;
  onRemove: () => void;
  onReorder: (dir: -1 | 1) => void;
  onSetParty: (bossId: string, party: number) => void;
  onSetDifficulty: (bossId: string, difficulty: string) => void;
  onUnset: (bossId: string) => void;
  onToggle: (bossId: string) => void;
  onSetCount: (bossId: string, n: number) => void;
  onSetAll: (value: boolean) => void;
  onAddBoss: () => void;
}) {
  const { id, name, bosses } = character;
  const weekly = characterMesos(character, counts, reboot);
  const potential = characterPotential(character, reboot);
  const pct = potential > 0 ? Math.round((weekly / potential) * 100) : 0;
  const weeklyCrystals = characterWeeklyCrystals(character, counts);
  const overWeeklyCap = weeklyCrystals > WEEKLY_PER_CHARACTER_LIMIT;
  const added = Object.keys(bosses).length;

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <input
              defaultValue={name}
              key={name}
              onBlur={(e) => onRename(e.target.value)}
              className="bg-transparent font-extrabold text-lg outline-none border-b border-transparent focus:border-border"
            />
            <div className="text-sm mt-0.5">
              <span style={{ color: "var(--green)" }}>{formatMesos(weekly)}</span>
              <span className="text-muted"> / {formatMesos(potential)} potential</span>
            </div>
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
            <button className="btn btn-danger text-xs px-2.5" onClick={onRemove}>Delete</button>
          </div>
        </div>
        <div className="mt-3 h-2.5 rounded-full bg-surface-2 overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: "linear-gradient(90deg,#34d399,#10b981)" }} />
        </div>
        {overWeeklyCap && (
          <p className="text-xs text-[#fb7185] mt-2">
            Over the 14 weekly-crystal limit — only 14 weekly crystals can be sold per character each week.
          </p>
        )}
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          <button className="btn btn-primary text-sm" onClick={onAddBoss}>+ Add boss</button>
          <button className="btn text-sm" onClick={() => onSetAll(true)}>Max all</button>
          <button className="btn text-sm" onClick={() => onSetAll(false)}>Clear all</button>
        </div>
      </div>

      {added === 0 ? (
        <div className="card p-10 text-center text-muted text-sm">
          No bosses on {name}&apos;s checklist yet. Click{" "}
          <span className="text-foreground font-semibold">+ Add boss</span> to pick the bosses this character runs.
        </div>
      ) : (
        RESET_ORDER.map((reset) => {
          const list = BOSSES.filter((b) => b.reset === reset && b.id in bosses);
          if (list.length === 0) return null;
          const maxK = maxKills(reset);
          return (
            <div key={reset} className="space-y-2">
              <h3 className="text-sm font-bold uppercase tracking-wide text-muted">
                {RESET_LABEL[reset]} Bosses
              </h3>
              <div className="card divide-y divide-[var(--border)]">
                {list.map((boss) => {
                  const sel = bosses[boss.id];
                  const n = bossCount(counts, id, boss.id);
                  const perKill = selMesos(sel, boss.id, reboot);
                  const lineTotal = perKill * n;
                  const maxParty = maxPartyFor(boss.id, sel.difficulty);
                  const done = n >= maxK;
                  return (
                    <div key={boss.id} className="flex items-center gap-3 px-4 py-3">
                      <button
                        onClick={() => onToggle(boss.id)}
                        className={`h-6 w-6 shrink-0 rounded-md border grid place-items-center transition cursor-pointer ${
                          done ? "bg-green-500 border-green-500 text-[#06281c]" : "border-border bg-surface-2"
                        }`}
                        title={done ? "Mark not done" : "Mark fully done"}
                      >
                        {done ? "✓" : ""}
                      </button>

                      <BossIcon id={boss.id} name={boss.name} />

                      <div className="min-w-0 flex-1">
                        <div className={`font-semibold truncate ${done ? "text-muted" : ""}`}>
                          {boss.name}
                        </div>
                        <div className="text-xs">
                          <span className="text-accent">{formatMesosFull(lineTotal)}</span>
                          <span className="text-muted">
                            {" "}({formatMesos(perKill)}{sel.party > 1 ? `/${sel.party}p` : ""} × {n})
                          </span>
                        </div>
                      </div>

                      {maxK > 1 && (
                        <Stepper
                          value={n}
                          min={0}
                          max={maxK}
                          label={`× ${n}`}
                          title="Times killed this week"
                          onChange={(v) => onSetCount(boss.id, v)}
                        />
                      )}

                      {maxParty > 1 && (
                        <Stepper
                          value={sel.party}
                          min={1}
                          max={maxParty}
                          label={`👥${sel.party}`}
                          title="Party size — crystal value is split between members"
                          onChange={(p) => onSetParty(boss.id, p)}
                        />
                      )}

                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        {boss.difficulties.map((d) => {
                          const isSel = sel.difficulty === d.difficulty;
                          const dc = DIFFICULTY_COLOR[d.difficulty] ?? "#888";
                          return (
                            <button
                              key={d.difficulty}
                              onClick={() => onSetDifficulty(boss.id, d.difficulty)}
                              className="text-xs font-bold rounded-md px-2 py-1 border transition"
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

                      <button
                        className="text-muted hover:text-[#f43f5e] px-1 shrink-0"
                        onClick={() => onUnset(boss.id)}
                        title="Remove from checklist"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// ---------------- RP calculator ----------------

function MonthlyRpCard({ now }: { now: number }) {
  const rpOverrides = useStore((s) => s.rpOverrides);
  const mvpTier = useStore((s) => s.mvpTier);
  const characters = useStore((s) => s.characters);
  const eff = effectiveRpOverrides(rpOverrides, characters);
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

// Default each boss-RP line's qty to however many bosses of that reset are tracked.
function effectiveRpOverrides(
  rpOverrides: Record<string, RpOverride>,
  characters: Character[]
): Record<string, RpOverride> {
  const withBossQty = (id: string, reset: "daily" | "weekly" | "monthly") => {
    const o = rpOverrides[id] ?? {};
    return { ...o, qty: o.qty ?? totalBossesTrackedByReset(characters, reset) };
  };
  return {
    ...rpOverrides,
    "daily-bosses": withBossQty("daily-bosses", "daily"),
    "weekly-bosses": withBossQty("weekly-bosses", "weekly"),
    "monthly-bosses": withBossQty("monthly-bosses", "monthly"),
  };
}

function RpCalculator({ now }: { now: number }) {
  const rpOverrides = useStore((s) => s.rpOverrides);
  const mvpTier = useStore((s) => s.mvpTier);
  const characters = useStore((s) => s.characters);
  const setRpOverride = useStore((s) => s.setRpOverride);
  const setMvpTier = useStore((s) => s.setMvpTier);
  const [open, setOpen] = useState(false);

  const eff = effectiveRpOverrides(rpOverrides, characters);
  const res = computeMonthlyRp(eff, mvpTier, now);

  const groups: { group: RpGroup; label: string; freq: string }[] = [
    { group: "daily", label: "Daily", freq: `× ${res.days} days` },
    { group: "weekly", label: "Weekly", freq: `× ${res.thursdays} Thursdays` },
    { group: "monthly", label: "Monthly", freq: "× 1" },
  ];

  return (
    <div className="card overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-2/50 transition"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="text-left">
          <h2 className="font-extrabold text-lg">RP Calculator</h2>
          <p className="text-xs text-muted mt-0.5">
            Monthly Reward Points — daily × {res.days}, weekly × {res.thursdays}, capped at{" "}
            {MONTHLY_RP_CAP.toLocaleString()}.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xl font-extrabold" style={{ color: res.capped ? "#f43f5e" : "var(--accent)" }}>
            {res.total.toLocaleString("en-US")} RP
          </span>
          <span className="text-muted">{open ? "▴" : "▾"}</span>
        </div>
      </button>

      {open && (
        <div className="border-t border-border p-5 space-y-5">
          <div className="flex items-center gap-3 flex-wrap">
            <label className="label">MVP tier</label>
            <select
              className="select w-auto"
              value={mvpTier}
              onChange={(e) => setMvpTier(e.target.value as MvpTier)}
            >
              {MVP_TIERS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <span className="text-xs text-muted">
              Affects Fairy Bros gifts (Bronze+ and Silver+).
            </span>
          </div>

          {groups.map(({ group, label, freq }) => {
            const acts = RP_ACTIVITIES.filter((a) => a.group === group);
            return (
              <div key={group} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-muted">{label}</h3>
                  <span className="text-xs text-muted">{freq}</span>
                </div>
                <div className="card divide-y divide-[var(--border)]">
                  {acts.map((a) => {
                    const o = eff[a.id] ?? {};
                    const on = o.on !== false;
                    const mvp = mvpAdjustedRp(a, mvpTier);
                    const rp = o.rp ?? (mvp != null ? mvp : a.defaultRp);
                    const qty = o.qty ?? a.defaultQty;
                    const contribution = on ? rp * qty : 0;
                    return (
                      <div key={a.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={(e) => setRpOverride(a.id, { on: e.target.checked })}
                          className="accent-indigo-500 h-4 w-4 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className={`font-semibold truncate ${on ? "" : "text-muted line-through"}`} title={a.note}>
                            {a.label}
                          </div>
                          {a.note && <div className="text-[11px] text-muted truncate">{a.note}</div>}
                        </div>
                        <label className="flex items-center gap-1 text-xs text-muted">
                          RP
                          <input
                            type="number"
                            min={0}
                            value={rp}
                            onChange={(e) => setRpOverride(a.id, { rp: Number(e.target.value) })}
                            className="input w-20 py-1"
                          />
                        </label>
                        {a.qtyLabel && (
                          <label className="flex items-center gap-1 text-xs text-muted">
                            {a.qtyLabel}
                            <input
                              type="number"
                              min={0}
                              value={qty}
                              onChange={(e) => setRpOverride(a.id, { qty: Number(e.target.value) })}
                              className="input w-16 py-1"
                            />
                          </label>
                        )}
                        <span className="w-24 text-right font-bold tabular-nums">
                          {contribution.toLocaleString("en-US")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div className="grid gap-3 sm:grid-cols-4 pt-1">
            <RpStat label={`Daily (×${res.days})`} value={(res.daily * res.days).toLocaleString()} sub={`${res.daily.toLocaleString()}/day`} />
            <RpStat label={`Weekly (×${res.thursdays})`} value={(res.weekly * res.thursdays).toLocaleString()} sub={`${res.weekly.toLocaleString()}/wk`} />
            <RpStat label="Monthly" value={res.monthly.toLocaleString()} sub="one-time" />
            <RpStat
              label="Monthly total"
              value={res.total.toLocaleString()}
              sub={res.capped ? `over cap by ${(res.rawMonthly - MONTHLY_RP_CAP).toLocaleString()}` : `of ${MONTHLY_RP_CAP.toLocaleString()}`}
              accent={res.capped ? "#f43f5e" : "var(--accent)"}
            />
          </div>
          <p className="text-[11px] text-muted">
            RP amounts are editable best-effort defaults — adjust any to match current in-game
            values. Weekly-boss qty defaults to your tracked weekly bosses.
          </p>
        </div>
      )}
    </div>
  );
}

function RpStat({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: string }) {
  return (
    <div className="rounded-lg bg-surface-2 p-3">
      <div className="label">{label}</div>
      <div className="text-lg font-extrabold mt-0.5" style={{ color: accent ?? "var(--foreground)" }}>{value}</div>
      <div className="text-[11px] text-muted">{sub}</div>
    </div>
  );
}

// ---------------- shared bits ----------------

function AddBossModal({
  bosses,
  onPick,
  onRemove,
  onClose,
}: {
  bosses: Record<string, BossSel>;
  onPick: (bossId: string, difficulty: string) => void;
  onRemove: (bossId: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="card w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 space-y-5">
        <div className="flex items-center justify-between sticky -top-6 bg-surface py-1">
          <h2 className="text-lg font-bold">Add bosses</h2>
          <button className="btn" onClick={onClose}>Done</button>
        </div>
        <p className="text-sm text-muted -mt-2">
          Pick a difficulty to add a boss (or change it). Click ✓ again to remove.
        </p>
        {RESET_ORDER.map((reset) => (
          <div key={reset} className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wide text-muted">{RESET_LABEL[reset]}</h3>
            <div className="grid gap-1.5">
              {BOSSES.filter((b) => b.reset === reset).map((boss) => {
                const sel = bosses[boss.id];
                return (
                  <div key={boss.id} className={`flex items-center gap-3 rounded-lg px-3 py-2 ${sel ? "bg-surface-2" : ""}`}>
                    <BossIcon id={boss.id} name={boss.name} small />
                    <span className="flex-1 text-sm font-semibold truncate">{boss.name}</span>
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {boss.difficulties.map((d) => {
                        const isSel = sel?.difficulty === d.difficulty;
                        const dc = DIFFICULTY_COLOR[d.difficulty] ?? "#888";
                        return (
                          <button
                            key={d.difficulty}
                            onClick={() => (isSel ? onRemove(boss.id) : onPick(boss.id, d.difficulty))}
                            className="text-xs font-bold rounded-md px-2 py-1 border transition"
                            style={{ color: isSel ? "#0b0f1a" : dc, background: isSel ? dc : "transparent", borderColor: `${dc}66` }}
                            title={`${formatMesosFull(d.mesos)} solo`}
                          >
                            {isSel ? "✓ " : ""}{d.difficulty}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

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
                  if (confirm(`Reset all ${RESET_LABEL[reset].toLowerCase()} kill counts?`)) {
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

function Stepper({
  value,
  min,
  max,
  label,
  title,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  label: string;
  title: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center rounded-lg border border-border bg-surface-2 shrink-0" title={title}>
      <button className="px-2 py-1 text-muted hover:text-foreground disabled:opacity-30" onClick={() => onChange(value - 1)} disabled={value <= min}>−</button>
      <span className="w-9 text-center text-xs font-bold tabular-nums">{label}</span>
      <button className="px-2 py-1 text-muted hover:text-foreground disabled:opacity-30" onClick={() => onChange(value + 1)} disabled={value >= max}>+</button>
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
