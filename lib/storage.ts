import type { AppData } from "./types";
import { buildSeedData } from "./seed";
import { seedExercises } from "./exercises";

// Bumped to v2: seeds opening body-metric (93.5 kg / 19% bf), height 198 cm,
// and the day-specific iso protocol + exercise prescriptions.
const STORAGE_KEY = "training-tracker:data:v2";

const isBrowser = typeof window !== "undefined";

// Load the full dataset, seeding on first ever launch. SSR-safe (returns an
// empty shell on the server; real data is hydrated on the client).
export function loadData(): AppData {
  if (!isBrowser) {
    return {
      phases: [],
      sessions: [],
      metrics: [],
      checkins: [],
      exercises: [],
      scheduledExercises: [],
      profile: { heightCm: null },
    };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppData>;
      // Back-fill the exercise catalogue for anyone seeded before it existed.
      const exercises =
        parsed.exercises && parsed.exercises.length > 0
          ? parsed.exercises
          : seedExercises();

      return {
        phases: parsed.phases ?? [],
        sessions: parsed.sessions ?? [],
        metrics: parsed.metrics ?? [],
        checkins: parsed.checkins ?? [],
        exercises,
        scheduledExercises: parsed.scheduledExercises ?? [],
        profile: parsed.profile ?? { heightCm: null },
      };
    }
  } catch {
    // Corrupt payload — fall through to re-seed.
  }
  const seeded = buildSeedData();
  saveData(seeded);
  // Verifiable in dev tools on first ever launch (see FIX 6).
  console.log("Seeded phases and exercises");
  return seeded;
}

export function saveData(data: AppData): void {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Quota / private-mode failures are non-fatal for this app.
  }
}

export function clearData(): void {
  if (!isBrowser) return;
  window.localStorage.removeItem(STORAGE_KEY);
}

// Read existing localStorage data as-is (no seeding). Used for the one-time
// import into Supabase. Returns null if nothing is stored or it's corrupt.
export function readRawLocalData(): AppData | null {
  if (!isBrowser) return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<AppData>;
    return {
      phases: parsed.phases ?? [],
      sessions: parsed.sessions ?? [],
      metrics: parsed.metrics ?? [],
      checkins: parsed.checkins ?? [],
      exercises:
        parsed.exercises && parsed.exercises.length > 0 ? parsed.exercises : seedExercises(),
      scheduledExercises: parsed.scheduledExercises ?? [],
      profile: parsed.profile ?? { heightCm: null },
    };
  } catch {
    return null;
  }
}
