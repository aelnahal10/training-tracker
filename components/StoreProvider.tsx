"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type {
  AppData,
  BodyMetric,
  Phase,
  PresetExercise,
  Session,
  WeeklyCheckIn,
} from "@/lib/types";
import { loadData, saveData, clearData } from "@/lib/storage";
import { buildSeedData } from "@/lib/seed";
import { getExerciseOrDefault } from "@/lib/exercises";

export interface ExerciseDefaultPatch {
  name: string;
  defaultWeight?: number | null;
  defaultDurationSeconds?: number | null;
}

interface StoreValue extends AppData {
  ready: boolean;
  upsertSession: (s: Session) => void;
  deleteSession: (id: string) => void;
  upsertMetric: (m: BodyMetric) => void;
  deleteMetric: (id: string) => void;
  upsertCheckin: (c: WeeklyCheckIn) => void;
  deleteCheckin: (id: string) => void;
  upsertPhase: (p: Phase) => void;
  deletePhase: (id: string) => void;
  reseed: () => void;
  // Effective exercise metadata incl. any user-edited defaults.
  getEx: (name: string) => PresetExercise;
  // Remember edited defaults so they pre-fill next time.
  rememberDefaults: (patches: ExerciseDefaultPatch[]) => void;
  setHeight: (heightCm: number | null) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

const EMPTY: AppData = {
  phases: [],
  sessions: [],
  metrics: [],
  checkins: [],
  exercises: [],
  profile: { heightCm: null },
};

// Replace an item by id, or append it if new.
function upsertById<T extends { id: string }>(list: T[], item: T): T[] {
  const idx = list.findIndex((x) => x.id === item.id);
  if (idx === -1) return [...list, item];
  const next = [...list];
  next[idx] = item;
  return next;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(EMPTY);
  const [ready, setReady] = useState(false);

  // Hydrate (and seed on first launch) once, on the client.
  useEffect(() => {
    setData(loadData());
    setReady(true);
  }, []);

  // Apply a mutation, persist, and re-render.
  const mutate = useCallback((fn: (d: AppData) => AppData) => {
    setData((prev) => {
      const next = fn(prev);
      saveData(next);
      return next;
    });
  }, []);

  const value = useMemo<StoreValue>(
    () => ({
      ...data,
      ready,
      upsertSession: (s) =>
        mutate((d) => ({ ...d, sessions: upsertById(d.sessions, s) })),
      deleteSession: (id) =>
        mutate((d) => ({ ...d, sessions: d.sessions.filter((x) => x.id !== id) })),
      upsertMetric: (m) =>
        mutate((d) => ({ ...d, metrics: upsertById(d.metrics, m) })),
      deleteMetric: (id) =>
        mutate((d) => ({ ...d, metrics: d.metrics.filter((x) => x.id !== id) })),
      upsertCheckin: (c) =>
        mutate((d) => ({ ...d, checkins: upsertById(d.checkins, c) })),
      deleteCheckin: (id) =>
        mutate((d) => ({ ...d, checkins: d.checkins.filter((x) => x.id !== id) })),
      upsertPhase: (p) =>
        mutate((d) => ({ ...d, phases: upsertById(d.phases, p) })),
      deletePhase: (id) =>
        mutate((d) => ({ ...d, phases: d.phases.filter((x) => x.id !== id) })),
      getEx: (name) => {
        const stored = data.exercises.find((e) => e.name === name);
        return stored ?? getExerciseOrDefault(name);
      },
      rememberDefaults: (patches) =>
        mutate((d) => {
          if (patches.length === 0) return d;
          const byName = new Map(patches.map((p) => [p.name, p]));
          const exercises = d.exercises.map((e) => {
            const patch = byName.get(e.name);
            if (!patch) return e;
            return {
              ...e,
              defaultWeight:
                patch.defaultWeight !== undefined ? patch.defaultWeight : e.defaultWeight,
              defaultDurationSeconds:
                patch.defaultDurationSeconds !== undefined
                  ? patch.defaultDurationSeconds
                  : e.defaultDurationSeconds,
            };
          });
          return { ...d, exercises };
        }),
      setHeight: (heightCm) =>
        mutate((d) => ({ ...d, profile: { ...d.profile, heightCm } })),
      reseed: () => {
        clearData();
        const seeded = buildSeedData();
        saveData(seeded);
        setData(seeded);
        console.log("Seeded phases and exercises");
      },
    }),
    [data, ready, mutate]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within <StoreProvider>");
  return ctx;
}
