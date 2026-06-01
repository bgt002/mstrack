"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { bossImage } from "@/lib/bossImages";
import {
  useStore,
  useHydrated,
  sellValue,
  isKilled,
  isSold,
  diffOf,
  characterMesos,
  characterCrystals,
  characterWeeklyCrystals,
  killedCountByReset,
  distinctKilledByReset,
  type Character,
} from "@/lib/store";
import {
  BOSSES,
  DIFFICULTY_COLOR,
  formatMesos,
  formatMesosFull,
  maxPartyFor,
  soloMesos,
  sellsPerCycle,
  WEEKLY_CRYSTAL_LIMIT,
  WEEKLY_PER_CHARACTER_LIMIT,
  type Reset,
} from "@/lib/bosses";
import { nextResetLabel, daysInMonth, thursdaysInMonth } from "@/lib/reset";
import {
  RP_ACTIVITIES,
  RP_BY_ID,
  MVP_TIERS,
  MONTHLY_RP_CAP,
  computeMonthlyRp,
  mvpAdjustedRp,
  type MvpTier,
  type RpGroup,
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
  const toggleSold = useStore((s) => s.toggleSold);
  const markAll = useStore((s) => s.markAll);
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
            now={now}
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
            onToggleSold={(bossId) => toggleSold(active.id, bossId, Date.now())}
            onMarkAll={(v) => markAll(active.id, v, Date.now())}
          />
        )
      )}
    </div>
  );
}

// ---------------- Dashboard ----------------

interface CharRp {
  daily: number;
  weekly: number;
  monthly: number;
  total: number;
}
function charBossRp(
  ch: Character,
  killed: Record<string, boolean>,
  rpOverrides: Record<string, RpOverride>,
  now: number
): CharRp {
  const days = daysInMonth(now);
  const thu = thursdaysInMonth(now);
  const rate = (id: string) => rpOverrides[id]?.rp ?? RP_BY_ID[id].defaultRp;
  const enabled = (id: string) => rpOverrides[id]?.on !== false;
  const d = killedCountByReset(ch, killed, "daily");
  const w = killedCountByReset(ch, killed, "weekly");
  const m = killedCountByReset(ch, killed, "monthly");
  const daily = enabled("daily-bosses") ? rate("daily-bosses") * d * days : 0;
  const weekly = enabled("weekly-bosses") ? rate("weekly-bosses") * w * thu : 0;
  const monthly = enabled("monthly-bosses") ? rate("monthly-bosses") * m : 0;
  return { daily, weekly, monthly, total: daily + weekly + monthly };
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
  sold: Record<string, boolean>;
  reboot: boolean;
  now: number;
  onSelect: (id: string) => void;
}) {
  const rpOverrides = useStore((s) => s.rpOverrides);
  let weekly = 0;
  let crystals = 0;
  for (const ch of characters) {
    weekly += characterMesos(ch, sold, reboot);
    crystals += characterCrystals(ch, sold);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard label="Weekly meso (sold)" value={formatMesos(weekly)} sub={formatMesosFull(weekly) + " across roster"} accent="var(--green)" />
        <SummaryCard
          label="Crystals sold this week"
          value={`${crystals} / ${WEEKLY_CRYSTAL_LIMIT}`}
          sub="account weekly sell cap"
          accent="var(--accent-2)"
          warn={crystals > WEEKLY_CRYSTAL_LIMIT}
        />
        <MonthlyRpCard now={now} />
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-bold uppercase tracking-wide text-muted">Characters — click for details</h3>
        <div className="card divide-y divide-[var(--border)]">
          {characters.map((c, i) => {
            const wk = characterMesos(c, sold, reboot);
            const wkCry = characterWeeklyCrystals(c, sold);
            const totalCry = characterCrystals(c, sold);
            const rp = charBossRp(c, killed, rpOverrides, now);
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
                <DashStat label="RP / mo" value={rp.total.toLocaleString()} accent="var(--accent)" />
                <span className="text-muted shrink-0">→</span>
              </button>
            );
          })}
        </div>
      </div>

      <RpCalculator now={now} />
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
  now,
  onRename,
  onRemove,
  onReorder,
  onDuplicate,
  onSetParty,
  onSetDifficulty,
  onToggleKilled,
  onToggleSold,
  onMarkAll,
}: {
  character: Character;
  index: number;
  count: number;
  killed: Record<string, boolean>;
  sold: Record<string, boolean>;
  reboot: boolean;
  now: number;
  onRename: (name: string) => void;
  onRemove: () => void;
  onReorder: (dir: -1 | 1) => void;
  onDuplicate: () => void;
  onSetParty: (bossId: string, party: number) => void;
  onSetDifficulty: (bossId: string, difficulty: string) => void;
  onToggleKilled: (bossId: string) => void;
  onToggleSold: (bossId: string) => void;
  onMarkAll: (value: boolean) => void;
}) {
  const rpOverrides = useStore((s) => s.rpOverrides);
  const { id, name } = character;
  const weekly = characterMesos(character, sold, reboot);
  const weeklyCrystals = characterWeeklyCrystals(character, sold);
  const totalCrystals = characterCrystals(character, sold);
  const overWeeklyCap = weeklyCrystals > WEEKLY_PER_CHARACTER_LIMIT;
  const rp = charBossRp(character, killed, rpOverrides, now);

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <input
            defaultValue={name}
            key={name}
            onBlur={(e) => onRename(e.target.value)}
            className="bg-transparent font-extrabold text-lg outline-none border-b border-transparent focus:border-border min-w-0"
          />
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
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
          <RpStat label="Meso / week (sold)" value={formatMesos(weekly)} sub={formatMesosFull(weekly)} accent="var(--green)" />
          <RpStat label="Crystals sold" value={`${weeklyCrystals}/${WEEKLY_PER_CHARACTER_LIMIT} wk`} sub={`${totalCrystals} total`} accent={overWeeklyCap ? "#f43f5e" : undefined} />
          <RpStat label="RP / month (bosses)" value={rp.total.toLocaleString()} sub={`D ${rp.daily.toLocaleString()} · W ${rp.weekly.toLocaleString()} · M ${rp.monthly.toLocaleString()}`} accent="var(--accent)" />
        </div>
        <p className="text-[11px] text-muted mt-1.5">
          RP is per world — a boss also killed on another character only earns RP once toward your account total.
        </p>

        <div className="flex items-center gap-2 mt-4 flex-wrap">
          <button className="btn text-sm" onClick={() => onMarkAll(true)}>Mark all killed + sold</button>
          <button className="btn text-sm" onClick={() => onMarkAll(false)}>Clear all</button>
        </div>
      </div>

      {RESET_ORDER.map((reset) => {
        const list = BOSSES.filter((b) => b.reset === reset).sort(
          (a, b) => soloMesos(a.id, diffOf(character, a.id)) - soloMesos(b.id, diffOf(character, b.id))
        );
        if (list.length === 0) return null;
        const sells = sellsPerCycle(reset);
        return (
          <div key={reset} className="space-y-2">
            <h3 className="text-sm font-bold uppercase tracking-wide text-muted">
              {RESET_LABEL[reset]} Bosses
              {reset === "daily" && <span className="text-muted/70 font-normal normal-case"> · counts as 7×/week</span>}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {list.map((boss) => {
                const difficulty = diffOf(character, boss.id);
                const per = sellValue(character, boss.id, reboot);
                const weekVal = per * sells;
                const maxParty = maxPartyFor(boss.id, difficulty);
                const party = character.bosses[boss.id]?.party ?? 1;
                const wasKilled = isKilled(killed, id, boss.id);
                const wasSold = isSold(sold, id, boss.id);
                return (
                  <div key={boss.id} className="card p-3 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <BossIcon id={boss.id} name={boss.name} small />
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-sm truncate">{boss.name}</div>
                        <div className="text-[11px] text-accent">
                          {formatMesos(per)}
                          {sells > 1 ? ` ×${sells} = ${formatMesos(weekVal)}` : ""}
                        </div>
                      </div>
                    </div>

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
                      <button
                        onClick={() => onToggleSold(boss.id)}
                        className={`flex-1 text-xs font-bold rounded-md py-1.5 border transition ${
                          wasSold
                            ? "bg-green-500 border-green-500 text-[#06281c]"
                            : "border-border bg-surface-2 text-muted hover:text-foreground"
                        }`}
                        title="Sold crystals — earns mesos"
                      >
                        {wasSold ? "💰 Sold" : "Sell"}
                      </button>
                      {maxParty > 1 && (
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
    return { ...o, qty: o.qty ?? distinctKilledByReset(characters, killed, reset) };
  };
  return {
    ...rpOverrides,
    "daily-bosses": withQty("daily-bosses", "daily"),
    "weekly-bosses": withQty("weekly-bosses", "weekly"),
    "monthly-bosses": withQty("monthly-bosses", "monthly"),
  };
}

function RpCalculator({ now }: { now: number }) {
  const rpOverrides = useStore((s) => s.rpOverrides);
  const mvpTier = useStore((s) => s.mvpTier);
  const characters = useStore((s) => s.characters);
  const killed = useStore((s) => s.killed);
  const setRpOverride = useStore((s) => s.setRpOverride);
  const setMvpTier = useStore((s) => s.setMvpTier);
  const [open, setOpen] = useState(false);

  const eff = effectiveRpOverrides(rpOverrides, characters, killed);
  const res = computeMonthlyRp(eff, mvpTier, now);

  const groups: { group: RpGroup; label: string; freq: string }[] = [
    { group: "daily", label: "Daily", freq: `× ${res.days} days` },
    { group: "weekly", label: "Weekly", freq: `× ${res.thursdays} Thursdays` },
    { group: "monthly", label: "Monthly", freq: "× 1" },
  ];

  return (
    <div className="card overflow-hidden">
      <button className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-2/50 transition" onClick={() => setOpen((o) => !o)}>
        <div className="text-left">
          <h2 className="font-extrabold text-lg">RP Calculator</h2>
          <p className="text-xs text-muted mt-0.5">
            Monthly Reward Points — daily × {res.days}, weekly × {res.thursdays}, capped at {MONTHLY_RP_CAP.toLocaleString()}.
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
            <select className="select w-auto" value={mvpTier} onChange={(e) => setMvpTier(e.target.value as MvpTier)}>
              {MVP_TIERS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <span className="text-xs text-muted">Affects Fairy Bros gifts (Bronze+ and Silver+).</span>
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
                        <input type="checkbox" checked={on} onChange={(e) => setRpOverride(a.id, { on: e.target.checked })} className="accent-indigo-500 h-4 w-4 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className={`font-semibold truncate ${on ? "" : "text-muted line-through"}`} title={a.note}>{a.label}</div>
                          {a.note && <div className="text-[11px] text-muted truncate">{a.note}</div>}
                        </div>
                        <label className="flex items-center gap-1 text-xs text-muted">
                          RP
                          <input type="number" min={0} value={rp} onChange={(e) => setRpOverride(a.id, { rp: Number(e.target.value) })} className="input w-20 py-1" />
                        </label>
                        {a.qtyLabel && (
                          <label className="flex items-center gap-1 text-xs text-muted">
                            {a.qtyLabel}
                            <input type="number" min={0} value={qty} onChange={(e) => setRpOverride(a.id, { qty: Number(e.target.value) })} className="input w-16 py-1" />
                          </label>
                        )}
                        <span className="w-24 text-right font-bold tabular-nums">{contribution.toLocaleString("en-US")}</span>
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
            <RpStat label="Monthly total" value={res.total.toLocaleString()} sub={res.capped ? `over cap by ${(res.rawMonthly - MONTHLY_RP_CAP).toLocaleString()}` : `of ${MONTHLY_RP_CAP.toLocaleString()}`} accent={res.capped ? "#f43f5e" : "var(--accent)"} />
          </div>
          <p className="text-[11px] text-muted">
            RP is earned <span className="text-foreground">per world</span> — a boss killed on multiple
            characters only grants its RP once, so boss qtys count distinct bosses killed across your
            roster. RP amounts are editable best-effort defaults; adjust any to match in-game values.
          </p>
        </div>
      )}
    </div>
  );
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
