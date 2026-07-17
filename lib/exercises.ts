import type { PresetExercise, MuscleGroup } from "./types";

// The full preset catalogue. Order here drives display order in pickers.
// This is the seed source — user-edited defaults are persisted in AppData.exercises.
export const PRESET_EXERCISES: PresetExercise[] = [
  // ---- PUSH ----
  {
    name: "Dumbbell Bench Press",
    group: "push",
    inputType: "weight_reps",
    defaultWeight: 17.5,
    unit: "kg/side",
    note: "neutral grip — protects elbow",
    sets: 3, reps: "10", restSeconds: 90,
  },
  { name: "Cable Chest Fly", group: "push", inputType: "weight_reps", defaultWeight: 15, unit: "kg/side", sets: 3, reps: "12", restSeconds: 60 },
  { name: "Shoulder Press", group: "push", inputType: "weight_reps", defaultWeight: 12.5, unit: "kg", sets: 3, reps: "10", restSeconds: 90 },
  { name: "Lateral Raises", group: "push", inputType: "weight_reps", defaultWeight: 7.5, unit: "kg", sets: 3, reps: "15", restSeconds: 45, note: "higher reps — shoulder health" },
  {
    name: "Tricep Extensions",
    group: "push",
    inputType: "weight_reps",
    defaultWeight: 30,
    unit: "kg",
    restricted: true,
    sets: 3, reps: "10", restSeconds: 60,
  },

  // ---- PULL ----
  { name: "Cable Row", group: "pull", inputType: "weight_reps", defaultWeight: 85, unit: "kg", sets: 3, reps: "8-10", restSeconds: 90 },
  { name: "Single Arm Row", group: "pull", inputType: "weight_reps", defaultWeight: 17.5, unit: "kg/side", sets: 3, reps: "10 each side", restSeconds: 60 },
  { name: "Face Pull", group: "pull", inputType: "weight_reps", defaultWeight: 40, unit: "kg", sets: 4, reps: "15", restSeconds: 45, note: "higher reps — postural work" },
  { name: "Bicep Curl", group: "pull", inputType: "weight_reps", defaultWeight: 10, unit: "kg", sets: 3, reps: "10", restSeconds: 60 },
  { name: "Hammer Curl", group: "pull", inputType: "weight_reps", defaultWeight: 10, unit: "kg", sets: 3, reps: "10", restSeconds: 60 },
  { name: "Cable Rope Curl", group: "pull", inputType: "weight_reps", defaultWeight: 20, unit: "kg", sets: 3, reps: "10", restSeconds: 60 },
  {
    name: "Lat Pulldown",
    group: "pull",
    inputType: "weight_reps",
    defaultWeight: 55,
    unit: "kg",
    restricted: true,
    sets: 3, reps: "10", restSeconds: 90,
  },

  // ---- LEGS ----
  { name: "Romanian Deadlift", group: "legs", inputType: "weight_reps", defaultWeight: null, unit: "kg", sets: 3, reps: "10", restSeconds: 90 },
  { name: "Hip Thrust", group: "legs", inputType: "weight_reps", defaultWeight: null, unit: "kg", sets: 3, reps: "15", restSeconds: 60 },
  { name: "Glute Bridge", group: "legs", inputType: "bodyweight_reps", defaultWeight: null, unit: "bodyweight", sets: 3, reps: "15" },
  { name: "Leg Curl", group: "legs", inputType: "weight_reps", defaultWeight: null, unit: "kg", sets: 3, reps: "10", restSeconds: 90 },
  { name: "Goblet Squat", group: "legs", inputType: "weight_reps", defaultWeight: null, unit: "kg", sets: 3, reps: "12", restSeconds: 60 },
  { name: "Tibialis Raise", group: "legs", inputType: "bodyweight_reps", defaultWeight: null, unit: "bodyweight", sets: 3, reps: "20", restSeconds: 30 },
  { name: "Farmer Carry", group: "legs", inputType: "duration", defaultWeight: null, defaultDurationSeconds: 30 },

  // ---- CORE ----
  { name: "Dead Bug", group: "core", inputType: "bodyweight_reps", defaultWeight: null, unit: "bodyweight", sets: 3, reps: "8 each side" },
  { name: "Hollow Body Hold", group: "core", inputType: "duration", defaultWeight: null, defaultDurationSeconds: 25, sets: 3 },
  { name: "Hanging Knee Raise", group: "core", inputType: "bodyweight_reps", defaultWeight: null, unit: "bodyweight", sets: 3, reps: "12" },
  { name: "Reverse Crunch", group: "core", inputType: "bodyweight_reps", defaultWeight: null, unit: "bodyweight", sets: 3, reps: "12" },
  { name: "Ab Wheel Rollout", group: "core", inputType: "bodyweight_reps", defaultWeight: null, unit: "bodyweight", sets: 3, reps: "10" },
  { name: "Pallof Press", group: "core", inputType: "weight_reps", defaultWeight: null, unit: "kg", sets: 3, reps: "10 each side", restSeconds: 45 },

  // ---- ISO (default 30s per set; Wall Sit 45s) ----
  { name: "Wall Sit", group: "iso", inputType: "duration", defaultWeight: null, defaultDurationSeconds: 45 },
  { name: "Wall Tricep Press", group: "iso", inputType: "duration", defaultWeight: null, defaultDurationSeconds: 30 },
  { name: "Wrist Extension Iso", group: "iso", inputType: "duration", defaultWeight: null, defaultDurationSeconds: 30 },
  { name: "Bicep Curl Iso", group: "iso", inputType: "duration", defaultWeight: null, defaultDurationSeconds: 30 },
  { name: "Spanish Squat", group: "iso", inputType: "duration", defaultWeight: null, defaultDurationSeconds: 30 },
  { name: "Terminal Knee Extension", group: "iso", inputType: "duration", defaultWeight: null, defaultDurationSeconds: 30 },

  // ---- CARDIO ----
  {
    name: "Zone 2 Cardio",
    group: "cardio",
    inputType: "duration_min",
    defaultWeight: null,
    defaultDurationSeconds: 15 * 60, // 15 minutes
    note: "120-140 bpm. Bike, elliptical, or brisk walk. No running.",
  },

  // ---- PHASE 0 CONDITIONING (jogs, intervals, breathing) ----
  // Steady cardio & breathing log in minutes; interval/sprint work logs the
  // work seconds per round (sets = number of rounds).
  { name: "Warm-up jog", group: "cardio", inputType: "duration_min", defaultWeight: null, defaultDurationSeconds: 5 * 60, note: "Easy pace, just get moving." },
  { name: "Zone 2 jog", group: "cardio", inputType: "duration_min", defaultWeight: null, defaultDurationSeconds: 20 * 60, note: "Conversational pace, 130-145 bpm." },
  { name: "Zone 2 cooldown walk", group: "cardio", inputType: "duration_min", defaultWeight: null, defaultDurationSeconds: 10 * 60, note: "Easy walk only. Bring heart rate down gradually." },
  { name: "Diaphragmatic breathing", group: "cardio", inputType: "duration_min", defaultWeight: null, defaultDurationSeconds: 5 * 60, note: "Lie flat. 5 counts in through nose, 5 counts out." },
  { name: "Pickup intervals", group: "cardio", inputType: "duration", defaultWeight: null, defaultDurationSeconds: 30, sets: 4, unit: "s work", note: "Controlled hard effort — 80% max, not a sprint." },
  { name: "Hard effort intervals", group: "cardio", inputType: "duration", defaultWeight: null, defaultDurationSeconds: 45, sets: 6, unit: "s work", note: "Hard but not maximal. Feel it in your lungs." },
  { name: "Flat sprints", group: "cardio", inputType: "duration", defaultWeight: null, defaultDurationSeconds: 8, sets: 6, unit: "s work", note: "Max effort, 8s only. Full 3 min walk recovery between." },
];

// Stable metadata lookup (group / inputType / unit never change per user).
const EXERCISE_MAP = new Map(PRESET_EXERCISES.map((e) => [e.name, e]));

export function getExercise(name: string): PresetExercise | undefined {
  return EXERCISE_MAP.get(name);
}

// Fall back to a sensible default for user-entered / unknown exercises.
export function getExerciseOrDefault(name: string): PresetExercise {
  return (
    EXERCISE_MAP.get(name) ?? {
      name,
      group: "core",
      inputType: "weight_reps",
      defaultWeight: null,
    }
  );
}

export const GROUP_LABELS: Record<MuscleGroup, string> = {
  push: "Push",
  pull: "Pull",
  legs: "Legs",
  core: "Core",
  iso: "Iso",
  cardio: "Cardio",
};

export const GROUP_ORDER: MuscleGroup[] = ["push", "pull", "legs", "core", "iso", "cardio"];

// The blank starting default (deep-copied) for seeding AppData.exercises.
export function seedExercises(): PresetExercise[] {
  return PRESET_EXERCISES.map((e) => ({ ...e }));
}

// How many sets to pre-populate when an exercise is added / scheduled.
// Uses the prescribed set count when known; cardio is a single block; else 3.
export function defaultSetCount(ex: PresetExercise): number {
  if (ex.sets != null) return ex.sets;
  return ex.group === "cardio" ? 1 : 3;
}

// Parse the leading integer out of a reps prescription, e.g. "8-10" -> 8.
export function targetRepsValue(ex: PresetExercise): number | null {
  if (!ex.reps) return null;
  const m = ex.reps.match(/\d+/);
  return m ? Number(m[0]) : null;
}
