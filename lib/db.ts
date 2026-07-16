import { supabase } from "./supabase";
import { seedExercises } from "./exercises";
import { buildSeedData } from "./seed";
import type {
  AppData,
  BodyMetric,
  ExerciseEntry,
  Phase,
  PresetExercise,
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

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

// Load everything for the signed-in user. On a brand-new account (no profile
// row yet), create one seeded with the exercise catalogue so the logger works.
export async function fetchAllData(userId: string): Promise<AppData> {
  const [profileRes, phasesRes, sessionsRes, metricsRes, checkinsRes] =
    await Promise.all([
      supabase.from("profiles").select("height_cm, exercises").eq("user_id", userId).maybeSingle(),
      supabase.from("phases").select("*"),
      supabase.from("sessions").select("*"),
      supabase.from("metrics").select("*"),
      supabase.from("checkins").select("*"),
    ]);

  const firstError =
    profileRes.error || phasesRes.error || sessionsRes.error || metricsRes.error || checkinsRes.error;
  if (firstError) throw firstError;

  let heightCm: number | null = null;
  let exercises: PresetExercise[] = [];
  if (profileRes.data) {
    heightCm = profileRes.data.height_cm ?? null;
    exercises = (profileRes.data.exercises as PresetExercise[]) ?? [];
    if (exercises.length === 0) exercises = seedExercises();
  } else {
    // First login for this account — seed the full starter dataset (phases,
    // opening metric, exercise catalogue) so it mirrors a fresh install.
    const seed = buildSeedData();
    await importData(userId, seed);
    return seed;
  }

  return {
    phases: (phasesRes.data ?? []).map(rowToPhase),
    sessions: (sessionsRes.data ?? []).map(rowToSession),
    metrics: (metricsRes.data ?? []).map(rowToMetric),
    checkins: (checkinsRes.data ?? []).map(rowToCheckin),
    exercises,
    profile: { heightCm },
  };
}

// ---------------------------------------------------------------------------
// Writes (per entity — mirrors the store's granular mutations)
// ---------------------------------------------------------------------------

async function run(promise: PromiseLike<{ error: unknown }>) {
  const { error } = await promise;
  if (error) throw error;
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
}

// Delete all of the user's rows, then write a fresh seed. Returns the seed data.
export async function resetData(userId: string, seed: AppData): Promise<void> {
  await Promise.all([
    run(supabase.from("sessions").delete().eq("user_id", userId)),
    run(supabase.from("metrics").delete().eq("user_id", userId)),
    run(supabase.from("checkins").delete().eq("user_id", userId)),
    run(supabase.from("phases").delete().eq("user_id", userId)),
  ]);
  await importData(userId, seed);
}
