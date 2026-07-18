"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
import * as db from "@/lib/db";
import { buildSeedData } from "@/lib/seed";
import { getExerciseOrDefault } from "@/lib/exercises";
import { readRawLocalData } from "@/lib/storage";
import { useAuth } from "@/components/AuthProvider";

export interface ExerciseDefaultPatch {
  name: string;
  defaultWeight?: number | null;
  defaultDurationSeconds?: number | null;
}

export interface ImportResult {
  imported: boolean;
  counts?: { sessions: number; metrics: number; checkins: number; phases: number };
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
  // True when this browser still has old localStorage data available to import.
  hasLocalData: boolean;
  importLocal: () => Promise<ImportResult>;
  // Effective exercise metadata incl. any user-edited defaults.
  getEx: (name: string) => PresetExercise;
  // Remember edited defaults so they pre-fill next time.
  rememberDefaults: (patches: ExerciseDefaultPatch[]) => void;
  // Add a user-defined exercise to the catalogue (persisted, reusable).
  addCustomExercise: (ex: PresetExercise) => void;
  setHeight: (heightCm: number | null) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

const EMPTY: AppData = {
  phases: [],
  sessions: [],
  metrics: [],
  checkins: [],
  exercises: [],
  scheduledExercises: [],
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

const logFail = (e: unknown) => console.error("Supabase sync failed:", e);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user.id;

  const [data, setData] = useState<AppData>(EMPTY);
  const [ready, setReady] = useState(false);
  const [hasLocalData, setHasLocalData] = useState(false);

  // Latest data, readable synchronously inside mutations (which then persist).
  const dataRef = useRef(data);
  const apply = useCallback((next: AppData) => {
    dataRef.current = next;
    setData(next);
  }, []);

  // Load everything for the signed-in user (seeds the catalogue on first login).
  useEffect(() => {
    let cancelled = false;
    setReady(false);
    db.fetchAllData(userId)
      .then((d) => {
        if (!cancelled) {
          dataRef.current = d;
          setData(d);
          setReady(true);
        }
      })
      .catch((e) => {
        logFail(e);
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    setHasLocalData(readRawLocalData() != null);
  }, []);

  const value = useMemo<StoreValue>(
    () => ({
      ...data,
      ready,
      hasLocalData,
      upsertSession: (s) => {
        apply({ ...dataRef.current, sessions: upsertById(dataRef.current.sessions, s) });
        db.upsertSession(userId, s).catch(logFail);
      },
      deleteSession: (id) => {
        apply({ ...dataRef.current, sessions: dataRef.current.sessions.filter((x) => x.id !== id) });
        db.deleteSession(id).catch(logFail);
      },
      upsertMetric: (m) => {
        apply({ ...dataRef.current, metrics: upsertById(dataRef.current.metrics, m) });
        db.upsertMetric(userId, m).catch(logFail);
      },
      deleteMetric: (id) => {
        apply({ ...dataRef.current, metrics: dataRef.current.metrics.filter((x) => x.id !== id) });
        db.deleteMetric(id).catch(logFail);
      },
      upsertCheckin: (c) => {
        apply({ ...dataRef.current, checkins: upsertById(dataRef.current.checkins, c) });
        db.upsertCheckin(userId, c).catch(logFail);
      },
      deleteCheckin: (id) => {
        apply({ ...dataRef.current, checkins: dataRef.current.checkins.filter((x) => x.id !== id) });
        db.deleteCheckin(id).catch(logFail);
      },
      upsertPhase: (p) => {
        apply({ ...dataRef.current, phases: upsertById(dataRef.current.phases, p) });
        db.upsertPhase(userId, p).catch(logFail);
      },
      deletePhase: (id) => {
        apply({ ...dataRef.current, phases: dataRef.current.phases.filter((x) => x.id !== id) });
        db.deletePhase(id).catch(logFail);
      },
      getEx: (name) => {
        const stored = data.exercises.find((e) => e.name === name);
        return stored ?? getExerciseOrDefault(name);
      },
      rememberDefaults: (patches) => {
        if (patches.length === 0) return;
        const byName = new Map(patches.map((p) => [p.name, p]));
        const exercises = dataRef.current.exercises.map((e) => {
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
        apply({ ...dataRef.current, exercises });
        db.saveProfile(userId, dataRef.current.profile.heightCm, exercises).catch(logFail);
      },
      addCustomExercise: (ex) => {
        const exists = dataRef.current.exercises.some(
          (e) => e.name.toLowerCase() === ex.name.toLowerCase()
        );
        if (exists) return;
        const exercises = [...dataRef.current.exercises, ex];
        apply({ ...dataRef.current, exercises });
        db.saveProfile(userId, dataRef.current.profile.heightCm, exercises).catch(logFail);
      },
      setHeight: (heightCm) => {
        const next = { ...dataRef.current, profile: { ...dataRef.current.profile, heightCm } };
        apply(next);
        db.saveProfile(userId, heightCm, next.exercises).catch(logFail);
      },
      reseed: () => {
        const seed = buildSeedData();
        apply(seed);
        db.resetData(userId, seed).catch(logFail);
      },
      importLocal: async () => {
        const local = readRawLocalData();
        if (!local) return { imported: false };
        await db.importData(userId, local);
        const fresh = await db.fetchAllData(userId);
        apply(fresh);
        return {
          imported: true,
          counts: {
            sessions: local.sessions.length,
            metrics: local.metrics.length,
            checkins: local.checkins.length,
            phases: local.phases.length,
          },
        };
      },
    }),
    [data, ready, hasLocalData, userId, apply]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within <StoreProvider>");
  return ctx;
}
