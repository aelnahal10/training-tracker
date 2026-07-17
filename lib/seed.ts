import type { AppData, BodyMetric, Phase } from "./types";
import { todayISO } from "./date";
import { uid } from "./id";
import { seedExercises } from "./exercises";
import {
  PHASE0_NAME,
  PHASE0_START,
  PHASE0_END,
  PHASE0_DESCRIPTION,
  PHASE1_NAME,
  PHASE1_START,
  PHASE1_END,
  PHASE1_DESCRIPTION,
  PHASE2_NAME,
  PHASE2_START,
  PHASE2_END,
  PHASE2_DESCRIPTION,
  phase0Schedule,
} from "./phase0";

// The three program phases in order (Phase 0 → 1 → 2), with fixed 2026 dates.
export function buildSeedPhases(): Phase[] {
  return [
    {
      id: uid("phase"),
      name: PHASE0_NAME,
      startDate: PHASE0_START,
      endDate: PHASE0_END,
      description: PHASE0_DESCRIPTION,
      unlockedExercises: [],
    },
    {
      id: uid("phase"),
      name: PHASE1_NAME,
      startDate: PHASE1_START,
      endDate: PHASE1_END,
      description: PHASE1_DESCRIPTION,
      unlockedExercises: [], // Lat Pulldown & Tricep Extensions stay locked in Phase 1
    },
    {
      id: uid("phase"),
      name: PHASE2_NAME,
      startDate: PHASE2_START,
      endDate: PHASE2_END,
      description: PHASE2_DESCRIPTION,
      unlockedExercises: ["Lat Pulldown", "Tricep Extensions"],
    },
  ];
}

// Full fresh-install dataset, including the Phase 0 weekly schedule template.
export function buildSeedData(): AppData {
  // Opening body-metric entry (user overwrites weight daily going forward).
  const openingMetric: BodyMetric = {
    id: uid("metric"),
    date: todayISO(),
    weightKg: 93.5,
    muscleMassKg: 66.5,
    bodyFatPercent: 19,
  };
  const phases = buildSeedPhases();
  const phase0 = phases[0];
  const scheduledExercises = phase0Schedule(phase0.id);
  return {
    phases,
    sessions: [],
    metrics: [openingMetric],
    checkins: [],
    exercises: seedExercises(),
    scheduledExercises,
    profile: { heightCm: 198 },
  };
}
