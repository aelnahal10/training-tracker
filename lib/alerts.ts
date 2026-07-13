import type { AppData, Session } from "./types";
import { getExerciseOrDefault } from "./exercises";
import {
  currentPhase,
  groupVolumeForWeek,
  maxWeightInSession,
  sessionsSortedDesc,
  loggedExerciseNames,
} from "./analytics";
import { addDays, startOfWeek, todayISO } from "./date";

export type AlertLevel = "red" | "yellow" | "info";

export interface Alert {
  id: string;
  level: AlertLevel;
  message: string;
}

// 1. Elbow pain rising: last 3 logged sessions strictly increasing elbow pain
//    (i.e. the last 2 sessions are each higher than the one before).
export function elbowPainRising(sessions: Session[]): boolean {
  const desc = sessionsSortedDesc(sessions);
  if (desc.length < 3) return false;
  const [a, b, c] = desc; // a = newest
  return a.painScores.elbow > b.painScores.elbow &&
    b.painScores.elbow > c.painScores.elbow;
}

// 2. Knee pain elevated: last 3 sessions all knee > 4.
export function kneePainElevated(sessions: Session[]): boolean {
  const desc = sessionsSortedDesc(sessions);
  if (desc.length < 3) return false;
  return desc.slice(0, 3).every((s) => s.painScores.knee > 4);
}

// 3. ISO streak broken: neither today nor yesterday has an iso logged or a
//    rest day logged (streak broken 2+ days).
export function isoStreakBroken(sessions: Session[]): boolean {
  const today = todayISO();
  const yesterday = addDays(today, -1);
  const dayCovered = (iso: string) => {
    const s = sessions.find((x) => x.date === iso);
    if (!s) return false;
    return s.isoCompleted || s.type === "rest";
  };
  return !dayCovered(today) && !dayCovered(yesterday);
}

// 4. Strength plateau: exercises whose last 3 sessions using them all share the
//    same heaviest-set weight.
export function plateauedExercises(sessions: Session[]): string[] {
  const flagged: string[] = [];
  for (const name of loggedExerciseNames(sessions)) {
    const weights = sessionsSortedDesc(sessions)
      .map((s) => maxWeightInSession(s, name))
      .filter((w): w is number => w != null);
    if (weights.length < 3) continue;
    const [a, b, c] = weights;
    if (a === b && b === c) flagged.push(name);
  }
  return flagged;
}

// 5. Pull-to-push imbalance: this week's pull volume below push volume.
export function pullBelowPush(sessions: Session[]): boolean {
  const week = startOfWeek(todayISO());
  const vol = groupVolumeForWeek(sessions, week);
  // Only meaningful once there is some push volume this week.
  return vol.push > 0 && vol.pull < vol.push;
}

// 6. Weight stall: last 4 body-metric entries all within 0.5 kg of each other.
export function weightStalled(data: AppData): boolean {
  const desc = [...data.metrics].sort((a, b) => b.date.localeCompare(a.date));
  if (desc.length < 4) return false;
  const last4 = desc.slice(0, 4).map((m) => m.weightKg);
  const min = Math.min(...last4);
  const max = Math.max(...last4);
  return max - min <= 0.5;
}

// Run every check and return the active alerts for Card 7.
export function computeAlerts(data: AppData): Alert[] {
  const alerts: Alert[] = [];
  const { sessions } = data;

  if (isoStreakBroken(sessions)) {
    alerts.push({
      id: "iso-streak",
      level: "red",
      message: "Iso streak broken — get back on it.",
    });
  }

  const plateaus = plateauedExercises(sessions);
  if (plateaus.length > 0) {
    alerts.push({
      id: "plateau",
      level: "yellow",
      message: `No strength progress in 3 sessions: ${plateaus.join(", ")}.`,
    });
  }

  if (pullBelowPush(sessions)) {
    alerts.push({
      id: "pull-push",
      level: "yellow",
      message:
        "Pull-to-push ratio below 1:1 — add more rows and face pulls.",
    });
  }

  if (weightStalled(data)) {
    alerts.push({
      id: "weight-stall",
      level: "info",
      message: "Weight stalled — check your calories.",
    });
  }

  return alerts;
}
