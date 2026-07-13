import type {
  BodyMetric,
  MuscleGroup,
  Phase,
  Session,
} from "./types";
import { getExerciseOrDefault } from "./exercises";
import {
  addDays,
  daysBetween,
  parseISO,
  sortByDateAsc,
  sortByDateDesc,
  startOfWeek,
  todayISO,
} from "./date";

// ---- Phases ----

// The phase whose date range contains `iso`. If none contains it, return the
// most recent phase that has already started (so we always have a "current").
export function currentPhase(phases: Phase[], iso = todayISO()): Phase | null {
  if (phases.length === 0) return null;
  const containing = phases.find(
    (p) => iso >= p.startDate && iso <= p.endDate
  );
  if (containing) return containing;

  const started = phases
    .filter((p) => p.startDate <= iso)
    .sort((a, b) => b.startDate.localeCompare(a.startDate));
  if (started.length) return started[0];

  // Otherwise the soonest upcoming phase.
  return [...phases].sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
}

export interface PhaseProgress {
  totalDays: number;
  elapsed: number;
  remaining: number;
  percent: number; // 0..100
  complete: boolean;
}

export function phaseProgress(phase: Phase, iso = todayISO()): PhaseProgress {
  const totalDays = Math.max(1, daysBetween(phase.startDate, phase.endDate));
  const rawElapsed = daysBetween(phase.startDate, iso);
  const elapsed = Math.max(0, Math.min(totalDays, rawElapsed));
  const remaining = Math.max(0, daysBetween(iso, phase.endDate));
  const complete = iso > phase.endDate;
  const percent = complete ? 100 : Math.round((elapsed / totalDays) * 100);
  return { totalDays, elapsed, remaining, percent, complete };
}

// Exercises that exist but are not yet unlocked in this phase.
export function lockedExercisesFor(phase: Phase | null): string[] {
  if (!phase) return [];
  const restricted = ["Lat Pulldown", "Tricep Extensions"];
  return restricted.filter((name) => !phase.unlockedExercises.includes(name));
}

export function isExerciseLocked(phase: Phase | null, name: string): boolean {
  const ex = getExerciseOrDefault(name);
  if (!ex.restricted) return false;
  if (!phase) return true;
  return !phase.unlockedExercises.includes(name);
}

// ---- Session lookups ----

export function sessionForDate(
  sessions: Session[],
  iso: string
): Session | undefined {
  return sessions.find((s) => s.date === iso);
}

export function sessionsSortedDesc(sessions: Session[]): Session[] {
  return sortByDateDesc(sessions, (s) => s.date);
}

export function sessionsSortedAsc(sessions: Session[]): Session[] {
  return sortByDateAsc(sessions, (s) => s.date);
}

// ---- Volume ----

export function exerciseVolume(sets: { weight: number | null; reps: number | null }[]): number {
  return sets.reduce(
    (sum, s) => sum + (s.reps ?? 0) * (s.weight ?? 0),
    0
  );
}

export function sessionTonnage(session: Session): number {
  return session.exercises.reduce(
    (sum, ex) => sum + exerciseVolume(ex.sets),
    0
  );
}

export type GroupVolume = Record<"push" | "pull" | "legs" | "core", number>;

export function emptyGroupVolume(): GroupVolume {
  return { push: 0, pull: 0, legs: 0, core: 0 };
}

// Total tonnage per muscle group across sessions within [weekStart, weekStart+6d].
export function groupVolumeForWeek(
  sessions: Session[],
  weekStart: string
): GroupVolume {
  const weekEnd = addDays(weekStart, 6);
  const vol = emptyGroupVolume();
  for (const s of sessions) {
    if (s.date < weekStart || s.date > weekEnd) continue;
    for (const ex of s.exercises) {
      const group = getExerciseOrDefault(ex.name).group;
      // Iso & cardio don't contribute to the push/pull/legs/core split.
      if (group === "iso" || group === "cardio") continue;
      vol[group] += exerciseVolume(ex.sets);
    }
  }
  return vol;
}

// Heaviest single-set weight for an exercise within a session.
export function maxWeightInSession(
  session: Session,
  exerciseName: string
): number | null {
  const entry = session.exercises.find((e) => e.name === exerciseName);
  if (!entry) return null;
  const weights = entry.sets
    .map((s) => s.weight)
    .filter((w): w is number => w != null);
  if (weights.length === 0) return null;
  return Math.max(...weights);
}


// Progress metric for ANY exercise, picking the right measure by input type:
//   weight_reps -> heaviest weight (kg), bodyweight_reps -> most reps,
//   duration -> longest hold (s), duration_min -> longest cardio (min).
// This is what lets iso / bodyweight / cardio work show up on the strength chart.
export interface ProgressSeries {
  points: { date: string; y: number }[];
  unit: string;
}

export function exerciseProgressSeries(
  sessions: Session[],
  exerciseName: string
): ProgressSeries {
  const meta = getExerciseOrDefault(exerciseName);
  const unit =
    meta.inputType === "weight_reps"
      ? "kg"
      : meta.inputType === "bodyweight_reps"
      ? "reps"
      : meta.inputType === "duration_min"
      ? "min"
      : "s";

  const points = sessionsSortedAsc(sessions)
    .map((s) => {
      const entry = s.exercises.find((e) => e.name === exerciseName);
      if (!entry) return null;
      let best: number | null = null;
      for (const set of entry.sets) {
        let v: number | null = null;
        if (meta.inputType === "weight_reps") v = set.weight;
        else if (meta.inputType === "bodyweight_reps") v = set.reps;
        else if (meta.inputType === "duration_min")
          v = set.durationSeconds == null ? null : set.durationSeconds / 60;
        else v = set.durationSeconds;
        if (v != null) best = best == null ? v : Math.max(best, v);
      }
      return best == null ? null : { date: s.date, y: best };
    })
    .filter((p): p is { date: string; y: number } => p !== null);

  return { points, unit };
}

// Count of training sessions per ISO-week for the last `weeks` weeks (ascending).
export function weeklySessionCounts(
  sessions: Session[],
  weeks: number
): { weekStart: string; count: number }[] {
  const thisWeek = startOfWeek(todayISO());
  const out: { weekStart: string; count: number }[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = addDays(thisWeek, -7 * i);
    const count = sessionsInWeek(sessions, weekStart).filter(
      (s) => s.type === "training"
    ).length;
    out.push({ weekStart, count });
  }
  return out;
}

// Every exercise name that appears in any logged session.
export function loggedExerciseNames(sessions: Session[]): string[] {
  const names = new Set<string>();
  for (const s of sessions) for (const e of s.exercises) names.add(e.name);
  return [...names].sort();
}

// ---- Pain ----

export type TrendDirection = "up" | "down" | "stable";

export interface PainTrend {
  current: number | null;
  previous: number | null;
  direction: TrendDirection;
}

// Compare the newest session's pain to the one ~7 days earlier (or the prior
// session if none that old).
export function painTrend(
  sessions: Session[],
  joint: "elbow" | "knee"
): PainTrend {
  const desc = sessionsSortedDesc(sessions);
  if (desc.length === 0) return { current: null, previous: null, direction: "stable" };
  const current = desc[0].painScores[joint];
  const cutoff = addDays(desc[0].date, -7);
  const older = desc.slice(1).find((s) => s.date <= cutoff) ?? desc[1];
  const previous = older ? older.painScores[joint] : null;
  let direction: TrendDirection = "stable";
  if (previous != null) {
    if (current > previous) direction = "up";
    else if (current < previous) direction = "down";
  }
  return { current, previous, direction };
}

// ---- Body metrics ----

export function metricsSortedAsc(metrics: BodyMetric[]): BodyMetric[] {
  return sortByDateAsc(metrics, (m) => m.date);
}

export function latestMetric(metrics: BodyMetric[]): BodyMetric | undefined {
  return sortByDateDesc(metrics, (m) => m.date)[0];
}

// Weight change vs the entry closest to ~7 days before the latest one.
export function weeklyWeightChange(metrics: BodyMetric[]): number | null {
  const desc = sortByDateDesc(metrics, (m) => m.date);
  if (desc.length < 2) return null;
  const latest = desc[0];
  const cutoff = addDays(latest.date, -7);
  const prior = desc.slice(1).find((m) => m.date <= cutoff) ?? desc[1];
  if (!prior) return null;
  return Math.round((latest.weightKg - prior.weightKg) * 10) / 10;
}

// Metrics within the last `days` days from the latest entry, ascending.
export function recentMetrics(metrics: BodyMetric[], days: number): BodyMetric[] {
  const asc = metricsSortedAsc(metrics);
  if (asc.length === 0) return [];
  const cutoff = addDays(asc[asc.length - 1].date, -(days - 1));
  return asc.filter((m) => m.date >= cutoff);
}

// ---- Summary KPIs (Progress page) ----

export function sessionsInWeek(sessions: Session[], weekStart: string): Session[] {
  const weekEnd = addDays(weekStart, 6);
  return sessions.filter((s) => s.date >= weekStart && s.date <= weekEnd);
}

export function totalTonnageForWeek(sessions: Session[], weekStart: string): number {
  return sessionsInWeek(sessions, weekStart).reduce((sum, s) => sum + sessionTonnage(s), 0);
}

export function countByType(sessions: Session[]): Record<"training" | "iso_only" | "rest", number> {
  const out = { training: 0, iso_only: 0, rest: 0 };
  for (const s of sessions) out[s.type]++;
  return out;
}

// Mean pain over the most recent `n` sessions.
export function avgRecentPain(
  sessions: Session[],
  joint: "elbow" | "knee",
  n = 7
): number | null {
  const recent = sessionsSortedDesc(sessions).slice(0, n);
  if (recent.length === 0) return null;
  const sum = recent.reduce((s, x) => s + x.painScores[joint], 0);
  return Math.round((sum / recent.length) * 10) / 10;
}

// Best wall-sit hold, from weekly check-ins and any logged Wall Sit set.
export function bestWallSitSeconds(
  sessions: Session[],
  checkins: { maxWallSitSeconds: number }[]
): number | null {
  let best = 0;
  for (const c of checkins) best = Math.max(best, c.maxWallSitSeconds);
  for (const s of sessions) {
    const ws = s.exercises.find((e) => e.name === "Wall Sit");
    if (ws) for (const set of ws.sets) best = Math.max(best, set.durationSeconds ?? 0);
  }
  return best > 0 ? best : null;
}

// Iso adherence over the last `days` days: share of days with isos completed.
export function isoAdherence(
  sessions: Session[],
  days = 14
): { done: number; total: number; pct: number } {
  const today = todayISO();
  let done = 0;
  for (let i = 0; i < days; i++) {
    const date = addDays(today, -i);
    const s = sessionForDate(sessions, date);
    if (s?.isoCompleted) done++;
  }
  return { done, total: days, pct: Math.round((done / days) * 100) };
}

// Tonnage per ISO-week for the last `weeks` weeks (ascending).
export function weeklyTonnageSeries(
  sessions: Session[],
  weeks: number
): { weekStart: string; tonnage: number }[] {
  const thisWeek = startOfWeek(todayISO());
  const out: { weekStart: string; tonnage: number }[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = addDays(thisWeek, -7 * i);
    out.push({ weekStart, tonnage: Math.round(totalTonnageForWeek(sessions, weekStart)) });
  }
  return out;
}

// ---- BMI (weight per height) ----

export interface BmiResult {
  bmi: number;
  category: string;
}

export function computeBmi(weightKg: number, heightCm: number): BmiResult | null {
  if (!heightCm || heightCm <= 0) return null;
  const m = heightCm / 100;
  const bmi = Math.round((weightKg / (m * m)) * 10) / 10;
  let category = "Normal";
  if (bmi < 18.5) category = "Underweight";
  else if (bmi < 25) category = "Normal";
  else if (bmi < 30) category = "Overweight";
  else category = "Obese";
  return { bmi, category };
}

// ---- Last-7-days strip ----

export type DayStatus = "trained" | "iso" | "rest" | "missed";

export interface DayTile {
  date: string;
  status: DayStatus;
  session?: Session;
}

export function lastNDays(sessions: Session[], n: number): DayTile[] {
  const today = todayISO();
  const tiles: DayTile[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const date = addDays(today, -i);
    const session = sessionForDate(sessions, date);
    let status: DayStatus = "missed";
    if (session) {
      if (session.type === "training") status = "trained";
      else if (session.type === "iso_only") status = "iso";
      else if (session.type === "rest") status = "rest";
    }
    tiles.push({ date, status, session });
  }
  return tiles;
}
