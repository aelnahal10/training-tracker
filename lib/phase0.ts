import type { ScheduledExercise, ScheduledKind } from "./types";
import { daysBetween } from "./date";

// ---------------------------------------------------------------------------
// Program phases (2026 dates). Phase 0 is a 4-week respiratory block that runs
// before the existing tendon program; Phase 1/2 are shifted to follow it.
// ---------------------------------------------------------------------------
export const PHASE0_NAME = "Respiratory Recovery";
export const PHASE1_NAME = "Tendon Foundation";
export const PHASE2_NAME = "Progressive Loading";

export const PHASE0_START = "2026-07-18";
export const PHASE0_END = "2026-08-14";
export const PHASE1_START = "2026-08-15";
export const PHASE1_END = "2026-09-25";
export const PHASE2_START = "2026-09-26";
export const PHASE2_END = "2026-11-06";

export const PHASE0_DESCRIPTION =
  "Rebuilding aerobic capacity and VO2 max after smoking. One full body session per week on Saturday. " +
  "Two cardio sessions per week on Monday and Wednesday. Daily iso protocol every day. " +
  "Weeks 1-2 establish jogging base and high-intensity ceiling. " +
  "Weeks 3-4 introduce sprint work and push lactate threshold.";

export const PHASE1_DESCRIPTION =
  "Isometrics daily. Pain-free training only. No lat pulldowns, no tricep extensions, no dips.";
export const PHASE2_DESCRIPTION =
  "Reintroduce restricted exercises with light load. Increase weight 5-10% per week. Plyometric prep begins.";

// Sentinel day-of-week meaning "every day" (the daily iso block).
export const DOW_DAILY = -1;

// A scheduled row before it gets an id + phaseId (assigned at seed time).
export type ScheduledTemplate = Omit<ScheduledExercise, "id" | "phaseId">;

// Fill the optional fields so the data below stays readable.
function mk(
  p: Partial<ScheduledTemplate> & {
    name: string;
    kind: ScheduledKind;
    dayOfWeek: number;
    position: number;
  }
): ScheduledTemplate {
  return {
    dayOfWeek: p.dayOfWeek,
    weekStart: p.weekStart ?? null,
    weekEnd: p.weekEnd ?? null,
    position: p.position,
    name: p.name,
    kind: p.kind,
    sets: p.sets ?? null,
    reps: p.reps ?? null,
    weight: p.weight ?? null,
    durationSeconds: p.durationSeconds ?? null,
    workSeconds: p.workSeconds ?? null,
    recoverySeconds: p.recoverySeconds ?? null,
    restSeconds: p.restSeconds ?? null,
    unit: p.unit ?? null,
    note: p.note ?? null,
  };
}

// Daily iso — every day, before the main session on training days.
const DAILY_ISO: Array<Partial<ScheduledTemplate> & { name: string; kind: ScheduledKind }> = [
  { name: "Wall Sit", kind: "iso", sets: 3, durationSeconds: 45, restSeconds: 90, note: "45-60 degree knee angle. Back flat against wall." },
  { name: "Wall Tricep Press", kind: "iso", sets: 3, durationSeconds: 30, restSeconds: 90, note: "Elbow at 90 degrees. Press palm into wall in extension direction. 70% effort." },
  { name: "Wrist Extension Iso", kind: "iso", sets: 2, durationSeconds: 30, restSeconds: 60, note: "Forearm flat on desk, palm down. Press back of hand up into underside of table. 60-70% effort. Dull ache at lateral elbow is normal up to 4/10." },
];

// Monday & Wednesday cardio — weeks 1-2 (base + pickups).
const CARDIO_WEEKS_1_2: Array<Partial<ScheduledTemplate> & { name: string; kind: ScheduledKind }> = [
  { name: "Warm-up jog", kind: "cardio", durationSeconds: 5 * 60, note: "Easy pace, just get moving." },
  { name: "Zone 2 jog", kind: "cardio", durationSeconds: 20 * 60, note: "Conversational pace, 130-145 bpm. Should be able to speak in sentences." },
  { name: "Pickup intervals", kind: "cardio", sets: 4, workSeconds: 30, recoverySeconds: 90, note: "Not a sprint — controlled hard effort. 80% max." },
  { name: "Diaphragmatic breathing", kind: "breathing", durationSeconds: 5 * 60, note: "Lie flat on back after session. Hand on belly. 5 counts in through nose, 5 counts out. Belly rises, chest stays still. Do not skip this — it directly rebuilds breathing muscle control." },
];

// Monday & Wednesday cardio — weeks 3-4 (adds sprints).
const CARDIO_WEEKS_3_4: Array<Partial<ScheduledTemplate> & { name: string; kind: ScheduledKind }> = [
  { name: "Warm-up jog", kind: "cardio", durationSeconds: 5 * 60 },
  { name: "Zone 2 jog", kind: "cardio", durationSeconds: 15 * 60, note: "Conversational pace, 130-145 bpm." },
  { name: "Hard effort intervals", kind: "cardio", sets: 6, workSeconds: 45, recoverySeconds: 90, note: "Hard but not maximal. You should feel it in your lungs." },
  { name: "Flat sprints", kind: "cardio", sets: 6, workSeconds: 8, recoverySeconds: 180, note: "Maximum effort. 8 seconds only — short enough to protect knee tendons. Full 3 min walk recovery — do not cut this short." },
  { name: "Diaphragmatic breathing", kind: "breathing", durationSeconds: 5 * 60, note: "Lie flat. 5 counts in through nose, 5 counts out. Every session." },
];

// Saturday full body — all 4 weeks.
const SATURDAY: Array<Partial<ScheduledTemplate> & { name: string; kind: ScheduledKind }> = [
  { name: "Dumbbell Bench Press", kind: "strength", sets: 3, reps: "10", weight: 17.5, unit: "kg/side", restSeconds: 90, note: "Neutral grip — protects elbow." },
  { name: "Cable Row", kind: "strength", sets: 3, reps: "10", weight: 85, unit: "kg", restSeconds: 90 },
  { name: "Romanian Deadlift", kind: "strength", sets: 3, reps: "10", weight: null, unit: "kg", restSeconds: 90, note: "Find a comfortable starting weight first session. Log it." },
  { name: "Hip Thrust", kind: "strength", sets: 3, reps: "15", weight: null, unit: "kg", restSeconds: 60, note: "Add load when bodyweight is easy." },
  { name: "Goblet Squat", kind: "strength", sets: 3, reps: "12", weight: null, unit: "kg", restSeconds: 60 },
  { name: "Face Pull", kind: "strength", sets: 3, reps: "15", weight: 40, unit: "kg", restSeconds: 45 },
  { name: "Dead Bug", kind: "core", sets: 3, reps: "8 each side", unit: "bodyweight", restSeconds: 45, note: "Lower back flat against floor throughout." },
  { name: "Hollow Body Hold", kind: "core", sets: 3, durationSeconds: 20, restSeconds: 45 },
  { name: "Zone 2 cooldown walk", kind: "cardio", durationSeconds: 10 * 60, note: "Easy walk only. Bring heart rate down gradually." },
];

// Assemble the full template. Iso rows (positions 0-2, every day) sort ahead of
// the day-specific rows (positions 10+).
export const PHASE0_TEMPLATE: ScheduledTemplate[] = [
  ...DAILY_ISO.map((e, i) => mk({ ...e, dayOfWeek: DOW_DAILY, position: i })),
  // Monday (1) and Wednesday (3) share the same cardio plan.
  ...[1, 3].flatMap((dow) => [
    ...CARDIO_WEEKS_1_2.map((e, i) => mk({ ...e, dayOfWeek: dow, weekStart: 1, weekEnd: 2, position: 10 + i })),
    ...CARDIO_WEEKS_3_4.map((e, i) => mk({ ...e, dayOfWeek: dow, weekStart: 3, weekEnd: 4, position: 10 + i })),
  ]),
  // Saturday (6) full body, all weeks.
  ...SATURDAY.map((e, i) => mk({ ...e, dayOfWeek: 6, position: 10 + i })),
];

// Materialize the template into concrete rows with STABLE, deterministic ids.
// Re-seeding (or a dev StrictMode double-run) then upserts the same rows by id
// instead of inserting duplicates.
export function phase0Schedule(phaseId: string): ScheduledExercise[] {
  return PHASE0_TEMPLATE.map((t, i) => ({ ...t, id: `sched_${phaseId}_${i}`, phaseId }));
}

// Which program week (1-4) a date falls in, relative to the phase start.
export function phase0Week(dateISO: string, startISO = PHASE0_START): number {
  const wk = Math.floor(daysBetween(startISO, dateISO) / 7) + 1;
  return Math.max(1, Math.min(4, wk));
}

// The scheduled rows for a given weekday + program week, in display order.
// Includes the daily-iso rows (dayOfWeek -1) and honours the week range so
// sprints never appear before week 3.
export function scheduledForDay<T extends ScheduledExercise | ScheduledTemplate>(
  rows: T[],
  dow: number,
  week: number
): T[] {
  return rows
    .filter(
      (r) =>
        (r.dayOfWeek === dow || r.dayOfWeek === DOW_DAILY) &&
        (r.weekStart == null || (week >= r.weekStart && week <= (r.weekEnd ?? r.weekStart)))
    )
    .sort((a, b) => a.position - b.position);
}

// Human-readable prescription for a scheduled row (used on the dashboard).
export function scheduledLabel(s: ScheduledExercise): string {
  if (s.workSeconds != null) {
    const rec = s.recoverySeconds != null ? ` / ${s.recoverySeconds}s recovery` : "";
    return `${s.name} — ${s.sets ?? 1} × ${s.workSeconds}s work${rec}`;
  }
  if (s.kind === "cardio" || s.kind === "breathing") {
    if (s.durationSeconds != null) {
      const mins = Math.round(s.durationSeconds / 60);
      return mins >= 1 ? `${s.name} — ${mins} min` : `${s.name} — ${s.durationSeconds}s`;
    }
    return s.name;
  }
  if (s.reps) {
    const w = s.weight != null ? ` · ${s.weight} ${s.unit ?? "kg"}` : "";
    return `${s.name} — ${s.sets ?? 3} × ${s.reps}${w}`;
  }
  if (s.durationSeconds != null) return `${s.name} — ${s.sets ?? 1} × ${s.durationSeconds}s`;
  return s.name;
}
