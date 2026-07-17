// ---- Core data models (persisted to localStorage) ----

export type SessionType = "training" | "iso_only" | "rest";

export interface Phase {
  id: string;
  name: string;
  startDate: string; // ISO date (yyyy-mm-dd)
  endDate: string; // ISO date
  description: string;
  unlockedExercises: string[]; // exercises made available in this phase
}

export interface SetEntry {
  weight: number | null;
  reps: number | null;
  durationSeconds: number | null;
  rpe: number | null;
}

export interface ExerciseEntry {
  name: string;
  sets: SetEntry[];
}

export interface Session {
  id: string;
  date: string; // ISO date
  phaseId: string;
  type: SessionType;
  isoCompleted: boolean;
  painScores: { elbow: number; knee: number }; // 0-10
  exercises: ExerciseEntry[];
  notes: string;
}

export interface BodyMetric {
  id: string;
  date: string; // ISO date
  weightKg: number;
  muscleMassKg: number | null;
  bodyFatPercent: number | null;
}

export interface WeeklyCheckIn {
  id: string;
  weekStartDate: string; // ISO date
  maxWallSitSeconds: number;
  notes: string;
}

// ---- Preset exercise catalogue ----

export type MuscleGroup = "push" | "pull" | "legs" | "core" | "iso" | "cardio";

// How a set is entered for a given exercise.
//  weight_reps     -> weight (kg) + reps
//  bodyweight_reps -> reps only (no weight input)
//  duration        -> duration in seconds only (iso / holds / carries)
//  duration_min    -> duration in minutes only (cardio)
export type InputType =
  | "weight_reps"
  | "bodyweight_reps"
  | "duration"
  | "duration_min";

export interface PresetExercise {
  name: string;
  group: MuscleGroup;
  inputType: InputType;
  defaultWeight: number | null;
  // Default duration in seconds (isos/holds) — for cardio this is minutes*60.
  defaultDurationSeconds?: number | null;
  unit?: string; // display-only label, e.g. "kg/side", "bodyweight"
  note?: string;
  restricted?: boolean; // true = Phase 2 only, warn if logged in Phase 1
  // Prescription (targets). Drive pre-populated set count + display hints.
  sets?: number; // prescribed working sets
  reps?: string; // prescribed reps, e.g. "8-10", "10 each side", "15"
  restSeconds?: number; // rest between sets
}

// ---- Full app state shape ----

export interface Profile {
  heightCm: number | null; // used for BMI (weight-per-height) stats
}

// ---- Scheduled program template (DB-driven, e.g. Phase 0) ----

export type ScheduledKind = "cardio" | "breathing" | "strength" | "iso" | "core";

// A single prescribed exercise within a phase's weekly plan, stored in Supabase.
// dayOfWeek uses 0=Sun..6=Sat, with -1 meaning "every day" (the daily iso block).
// weekStart/weekEnd (inclusive, null = all weeks) let a day differ by week, e.g.
// sprints only appear from week 3.
export interface ScheduledExercise {
  id: string;
  phaseId: string;
  dayOfWeek: number;
  weekStart: number | null;
  weekEnd: number | null;
  position: number;
  name: string;
  kind: ScheduledKind;
  sets: number | null;
  reps: string | null;
  weight: number | null;
  durationSeconds: number | null;
  workSeconds: number | null; // interval work (e.g. 30s hard)
  recoverySeconds: number | null; // interval recovery (e.g. 90s easy)
  restSeconds: number | null;
  unit: string | null;
  note: string | null;
}

export interface AppData {
  phases: Phase[];
  sessions: Session[];
  metrics: BodyMetric[];
  checkins: WeeklyCheckIn[];
  // Per-exercise remembered defaults. Editing a value while logging updates the
  // matching entry here so it pre-fills next time. Absent = use catalogue default.
  exercises: PresetExercise[];
  // DB-driven weekly plan rows (currently Phase 0). Read-only in the UI.
  scheduledExercises: ScheduledExercise[];
  profile: Profile;
}
