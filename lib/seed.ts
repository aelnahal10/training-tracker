import type { AppData, BodyMetric, Phase } from "./types";
import { addDays, todayISO } from "./date";
import { uid } from "./id";
import { seedExercises } from "./exercises";

// Build the initial phases relative to today.
// Phase 1 = Weeks 1-6, Phase 2 = Weeks 7-12.
export function buildSeedPhases(): Phase[] {
  const start = todayISO();
  const phase1: Phase = {
    id: uid("phase"),
    name: "Tendon Foundation",
    startDate: start,
    endDate: addDays(start, 6 * 7), // ~6 weeks
    description:
      "Isometrics daily. Pain-free training only. No lat pulldowns, no tricep extensions, no dips.",
    unlockedExercises: [], // Lat Pulldown & Tricep Extensions stay locked in Phase 1
  };
  const phase2: Phase = {
    id: uid("phase"),
    name: "Progressive Loading",
    startDate: addDays(start, 6 * 7 + 1),
    endDate: addDays(start, 12 * 7),
    description:
      "Reintroduce restricted exercises with light load. Increase weight 5-10% per week. Plyometric prep begins.",
    unlockedExercises: ["Lat Pulldown", "Tricep Extensions"],
  };
  return [phase1, phase2];
}

// Full fresh-install dataset.
export function buildSeedData(): AppData {
  // Opening body-metric entry (user overwrites weight daily going forward).
  const openingMetric: BodyMetric = {
    id: uid("metric"),
    date: todayISO(),
    weightKg: 93.5,
    muscleMassKg: 66.5,
    bodyFatPercent: 19,
  };
  return {
    phases: buildSeedPhases(),
    sessions: [],
    metrics: [openingMetric],
    checkins: [],
    exercises: seedExercises(),
    profile: { heightCm: 198 },
  };
}
