import { supabase } from "./supabase";
import { seedExercises } from "./exercises";
import { buildSeedData } from "./seed";
import { uid } from "./id";
import {
  PHASE0_NAME,
  PHASE0_START,
  PHASE0_END,
  PHASE0_DESCRIPTION,
  PHASE1_NAME,
  PHASE1_START,
  PHASE1_END,
  PHASE2_NAME,
  PHASE2_START,
  PHASE2_END,
  PHASE0_TEMPLATE,
} from "./phase0";
import type {
  AppData,
  BodyMetric,
  ExerciseEntry,
  Phase,
  PresetExercise,
  ScheduledExercise,
  Session,
  WeeklyCheckIn,
} from "./types";

// ---------------------------------------------------------------------------
// Row shapes (snake_case, as stored in Postgres) and mappers to/from app types.
// The nested / app-specific bits (logged sets, unlocked list, catalogue) are
// kept as JSON columns, so they round-trip without extra tables.
// ---------------------------------------------------------------------------

interface PhaseRow {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  description: string;
  unlocked_exercises: string[];
}
interface SessionRow {
  id: string;
  date: string;
  phase_id: string;
  type: Session["type"];
  iso_completed: boolean;
  pain_elbow: number;
  pain_knee: number;
  exercises: ExerciseEntry[];
  notes: string;
}
interface MetricRow {
  id: string;
  date: string;
  weight_kg: number;
  muscle_mass_kg: number | null;
  body_fat_percent: number | null;
}
interface CheckinRow {
  id: string;
  week_start_date: string;
  max_wall_sit_seconds: number;
  notes: string;
}

const phaseToRow = (p: Phase, userId: string) => ({
  id: p.id,
  user_id: userId,
  name: p.name,
  start_date: p.startDate,
  end_date: p.endDate,
  description: p.description,
  unlocked_exercises: p.unlockedExercises,
});
const rowToPhase = (r: PhaseRow): Phase => ({
  id: r.id,
  name: r.name,
  startDate: r.start_date,
  endDate: r.end_date,
  description: r.description,
  unlockedExercises: r.unlocked_exercises ?? [],
});

const sessionToRow = (s: Session, userId: string) => ({
  id: s.id,
  user_id: userId,
  date: s.date,
  phase_id: s.phaseId,
  type: s.type,
  iso_completed: s.isoCompleted,
  pain_elbow: s.painScores.elbow,
  pain_knee: s.painScores.knee,
  exercises: s.exercises,
  notes: s.notes,
});
const rowToSession = (r: SessionRow): Session => ({
  id: r.id,
  date: r.date,
  phaseId: r.phase_id,
  type: r.type,
  isoCompleted: r.iso_completed,
  painScores: { elbow: r.pain_elbow, knee: r.pain_knee },
  exercises: r.exercises ?? [],
  notes: r.notes,
});

const metricToRow = (m: BodyMetric, userId: string) => ({
  id: m.id,
  user_id: userId,
  date: m.date,
  weight_kg: m.weightKg,
  muscle_mass_kg: m.muscleMassKg,
  body_fat_percent: m.bodyFatPercent,
});
const rowToMetric = (r: MetricRow): BodyMetric => ({
  id: r.id,
  date: r.date,
  weightKg: r.weight_kg,
  muscleMassKg: r.muscle_mass_kg,
  bodyFatPercent: r.body_fat_percent,
});

const checkinToRow = (c: WeeklyCheckIn, userId: string) => ({
  id: c.id,
  user_id: userId,
  week_start_date: c.weekStartDate,
  max_wall_sit_seconds: c.maxWallSitSeconds,
  notes: c.notes,
});
const rowToCheckin = (r: CheckinRow): WeeklyCheckIn => ({
  id: r.id,
  weekStartDate: r.week_start_date,
  maxWallSitSeconds: r.max_wall_sit_seconds,
  notes: r.notes,
});

interface ScheduledRow {
  id: string;
  phase_id: string;
  day_of_week: number;
  week_start: number | null;
  week_end: number | null;
  position: number;
  name: string;
  kind: ScheduledExercise["kind"];
  sets: number | null;
  reps: string | null;
  weight: number | null;
  duration_seconds: number | null;
  work_seconds: number | null;
  recovery_seconds: number | null;
  rest_seconds: number | null;
  unit: string | null;
  note: string | null;
}
const scheduledToRow = (s: ScheduledExercise, userId: string) => ({
  id: s.id,
  user_id: userId,
  phase_id: s.phaseId,
  day_of_week: s.dayOfWeek,
  week_start: s.weekStart,
  week_end: s.weekEnd,
  position: s.position,
  name: s.name,
  kind: s.kind,
  sets: s.sets,
  reps: s.reps,
  weight: s.weight,
  duration_seconds: s.durationSeconds,
  work_seconds: s.workSeconds,
  recovery_seconds: s.recoverySeconds,
  rest_seconds: s.restSeconds,
  unit: s.unit,
  note: s.note,
});
const rowToScheduled = (r: ScheduledRow): ScheduledExercise => ({
  id: r.id,
  phaseId: r.phase_id,
  dayOfWeek: r.day_of_week,
  weekStart: r.week_start,
  weekEnd: r.week_end,
  position: r.position,
  name: r.name,
  kind: r.kind,
  sets: r.sets,
  reps: r.reps,
  weight: r.weight,
  durationSeconds: r.duration_seconds,
  workSeconds: r.work_seconds,
  recoverySeconds: r.recovery_seconds,
  restSeconds: r.rest_seconds,
  unit: r.unit,
  note: r.note,
});

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

// Load everything for the signed-in user. On a brand-new account (no profile
// row yet), create one seeded with the exercise catalogue so the logger works.
export async function fetchAllData(userId: string): Promise<AppData> {
  const [profileRes, phasesRes, sessionsRes, metricsRes, checkinsRes, scheduledRes] =
    await Promise.all([
      supabase.from("profiles").select("height_cm, exercises").eq("user_id", userId).maybeSingle(),
      supabase.from("phases").select("*"),
      supabase.from("sessions").select("*"),
      supabase.from("metrics").select("*"),
      supabase.from("checkins").select("*"),
      supabase.from("scheduled_exercises").select("*"),
    ]);

  // scheduled_exercises may not exist yet if the migration SQL hasn't been run —
  // tolerate that rather than blocking the whole app.
  const firstError =
    profileRes.error || phasesRes.error || sessionsRes.error || metricsRes.error || checkinsRes.error;
  if (firstError) throw firstError;
  const schedTableOk = !scheduledRes.error;

  let heightCm: number | null = null;
  let exercises: PresetExercise[] = [];
  if (profileRes.data) {
    heightCm = profileRes.data.height_cm ?? null;
    exercises = (profileRes.data.exercises as PresetExercise[]) ?? [];
    if (exercises.length === 0) exercises = seedExercises();
  } else {
    // First login for this account — seed the full starter dataset (phases,
    // Phase 0 schedule, opening metric, catalogue) so it mirrors a fresh install.
    const seed = buildSeedData();
    await importData(userId, seed);
    return seed;
  }

  const data: AppData = {
    phases: (phasesRes.data ?? []).map(rowToPhase),
    sessions: (sessionsRes.data ?? []).map(rowToSession),
    metrics: (metricsRes.data ?? []).map(rowToMetric),
    checkins: (checkinsRes.data ?? []).map(rowToCheckin),
    exercises,
    scheduledExercises: schedTableOk ? (scheduledRes.data ?? []).map(rowToScheduled) : [],
    profile: { heightCm },
  };

  // Bring an existing account up to the 3-phase program (adds Phase 0, shifts
  // Phase 1/2 dates, seeds the Phase 0 schedule) — idempotent, only writes what's
  // missing or out of date. Runs even if the schedule table is absent: phases go
  // to the DB and the schedule falls back to the in-code template.
  return ensureProgram(userId, data);
}

// Insert/refresh the Phase 0 → 1 → 2 program for an existing account without
// disturbing logged data. Safe to run on every load.
async function ensureProgram(userId: string, data: AppData): Promise<AppData> {
  try {
    const byName = (n: string) => data.phases.find((p) => p.name === n);
    const phaseOps: Array<Promise<void>> = [];
    let phases = [...data.phases];
    let scheduled = [...data.scheduledExercises];

    const shift = (name: string, startDate: string, endDate: string) => {
      const p = byName(name);
      if (p && (p.startDate !== startDate || p.endDate !== endDate)) {
        const up = { ...p, startDate, endDate };
        phaseOps.push(upsertPhase(userId, up));
        phases = phases.map((x) => (x.id === p.id ? up : x));
      }
    };
    shift(PHASE1_NAME, PHASE1_START, PHASE1_END);
    shift(PHASE2_NAME, PHASE2_START, PHASE2_END);

    let phase0 = byName(PHASE0_NAME);
    if (!phase0) {
      phase0 = {
        id: uid("phase"),
        name: PHASE0_NAME,
        startDate: PHASE0_START,
        endDate: PHASE0_END,
        description: PHASE0_DESCRIPTION,
        unlockedExercises: [],
      };
      phaseOps.push(upsertPhase(userId, phase0));
      phases = [phase0, ...phases];
    }

    // Phases must be written before scheduled rows that reference phase_id.
    if (phaseOps.length) await Promise.all(phaseOps);

    // Phase 0 schedule: use DB rows if present, otherwise build from the code
    // template. Persisting is best-effort (no-op if the table isn't migrated),
    // but the rows are always available in memory so the UI works regardless.
    const p0Id = phase0.id;
    if (!scheduled.some((s) => s.phaseId === p0Id)) {
      const rows: ScheduledExercise[] = PHASE0_TEMPLATE.map((t) => ({
        ...t,
        id: uid("sched"),
        phaseId: p0Id,
      }));
      await runSafe(
        supabase.from("scheduled_exercises").upsert(rows.map((r) => scheduledToRow(r, userId)))
      );
      scheduled = [...scheduled, ...rows];
    }

    return { ...data, phases, scheduledExercises: scheduled };
  } catch (e) {
    // Never block login on a migration hiccup — return what we loaded.
    console.error("ensureProgram failed:", e);
    return data;
  }
}

// ---------------------------------------------------------------------------
// Writes (per entity — mirrors the store's granular mutations)
// ---------------------------------------------------------------------------

async function run(promise: PromiseLike<{ error: unknown }>) {
  const { error } = await promise;
  if (error) throw error;
}

// For scheduled_exercises ops: non-fatal if the table hasn't been migrated yet —
// the schedule still works in-memory from the code template.
async function runSafe(promise: PromiseLike<{ error: unknown }>) {
  try {
    const { error } = await promise;
    if (error) throw error;
  } catch (e) {
    console.warn("scheduled_exercises op skipped (table not migrated?):", e);
  }
}

export const upsertSession = (userId: string, s: Session) =>
  run(supabase.from("sessions").upsert(sessionToRow(s, userId)));
export const deleteSession = (id: string) =>
  run(supabase.from("sessions").delete().eq("id", id));

export const upsertMetric = (userId: string, m: BodyMetric) =>
  run(supabase.from("metrics").upsert(metricToRow(m, userId)));
export const deleteMetric = (id: string) =>
  run(supabase.from("metrics").delete().eq("id", id));

export const upsertCheckin = (userId: string, c: WeeklyCheckIn) =>
  run(supabase.from("checkins").upsert(checkinToRow(c, userId)));
export const deleteCheckin = (id: string) =>
  run(supabase.from("checkins").delete().eq("id", id));

export const upsertPhase = (userId: string, p: Phase) =>
  run(supabase.from("phases").upsert(phaseToRow(p, userId)));
export const deletePhase = (id: string) =>
  run(supabase.from("phases").delete().eq("id", id));

// height + exercise catalogue live in the single profiles row.
export const saveProfile = (userId: string, heightCm: number | null, exercises: PresetExercise[]) =>
  run(
    supabase
      .from("profiles")
      .upsert({ user_id: userId, height_cm: heightCm, exercises, updated_at: new Date().toISOString() })
  );

// ---------------------------------------------------------------------------
// Bulk operations: import from localStorage, and full reset
// ---------------------------------------------------------------------------

// Push a whole AppData (e.g. the user's existing localStorage data) to Supabase.
export async function importData(userId: string, data: AppData): Promise<void> {
  await saveProfile(userId, data.profile.heightCm, data.exercises);
  if (data.phases.length)
    await run(supabase.from("phases").upsert(data.phases.map((p) => phaseToRow(p, userId))));
  if (data.sessions.length)
    await run(supabase.from("sessions").upsert(data.sessions.map((s) => sessionToRow(s, userId))));
  if (data.metrics.length)
    await run(supabase.from("metrics").upsert(data.metrics.map((m) => metricToRow(m, userId))));
  if (data.checkins.length)
    await run(supabase.from("checkins").upsert(data.checkins.map((c) => checkinToRow(c, userId))));
  if (data.scheduledExercises.length)
    await runSafe(
      supabase
        .from("scheduled_exercises")
        .upsert(data.scheduledExercises.map((s) => scheduledToRow(s, userId)))
    );
}

// Delete all of the user's rows, then write a fresh seed.
export async function resetData(userId: string, seed: AppData): Promise<void> {
  await Promise.all([
    runSafe(supabase.from("scheduled_exercises").delete().eq("user_id", userId)),
    run(supabase.from("sessions").delete().eq("user_id", userId)),
    run(supabase.from("metrics").delete().eq("user_id", userId)),
    run(supabase.from("checkins").delete().eq("user_id", userId)),
    run(supabase.from("phases").delete().eq("user_id", userId)),
  ]);
  await importData(userId, seed);
}
