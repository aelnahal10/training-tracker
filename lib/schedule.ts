import type { SessionType } from "./types";
import { parseISO } from "./date";
import { defaultSetCount, getExerciseOrDefault } from "./exercises";

// ---------------------------------------------------------------------------
// Hardcoded PHASE 1 weekly schedule.
//   Mon / Wed / Fri / Sun -> Iso only (higher-volume iso protocol)
//   Tue -> Pull + Iso   Thu -> Legs & Core + Iso   Sat -> Push + Iso
// Every training day ends with Zone 2 Cardio. Isos run every single day, and
// the iso protocol itself is day-specific (see ISO_BY_DOW below).
// ---------------------------------------------------------------------------

export interface DaySchedule {
  kind: "training" | "iso";
  focus: "push" | "pull" | "legs" | "iso";
  title: string; // e.g. "PULL + ISO" or "ISO ONLY"
  exercises: string[]; // training-exercise names (incl Zone 2 Cardio); [] on iso days
}

export interface IsoItem {
  name: string;
  sets: number;
  seconds: number;
  eachLeg?: boolean;
}

export interface IsoProtocol {
  label: string;
  items: IsoItem[];
}

const PULL_DAY: string[] = [
  "Cable Row",
  "Single Arm Row",
  "Face Pull",
  "Bicep Curl",
  "Hammer Curl",
  "Cable Rope Curl",
  "Zone 2 Cardio",
];

const LEGS_DAY: string[] = [
  "Romanian Deadlift",
  "Hip Thrust",
  "Leg Curl",
  "Goblet Squat",
  "Tibialis Raise",
  "Dead Bug",
  "Hollow Body Hold",
  "Hanging Knee Raise",
  "Zone 2 Cardio",
];

const PUSH_DAY: string[] = [
  "Dumbbell Bench Press",
  "Cable Chest Fly",
  "Shoulder Press",
  "Lateral Raises",
  "Face Pull",
  "Zone 2 Cardio",
];

const ISO_DAY: DaySchedule = { kind: "iso", focus: "iso", title: "ISO ONLY", exercises: [] };

// getDay(): 0 = Sunday … 6 = Saturday
const BY_DOW: Record<number, DaySchedule> = {
  0: ISO_DAY, // Sun
  1: ISO_DAY, // Mon
  2: { kind: "training", focus: "pull", title: "PULL + ISO", exercises: PULL_DAY }, // Tue
  3: ISO_DAY, // Wed
  4: { kind: "training", focus: "legs", title: "LEGS & CORE + ISO", exercises: LEGS_DAY }, // Thu
  5: ISO_DAY, // Fri
  6: { kind: "training", focus: "push", title: "PUSH + ISO", exercises: PUSH_DAY }, // Sat
};

// Higher-volume protocol used on all four rest days.
const REST_DAY_ISO: IsoProtocol = {
  label: "ISO — ~15 min",
  items: [
    { name: "Wall Sit", sets: 5, seconds: 60 },
    { name: "Spanish Squat", sets: 3, seconds: 45 },
    { name: "Terminal Knee Extension", sets: 3, seconds: 30, eachLeg: true },
    { name: "Wall Tricep Press", sets: 3, seconds: 30 },
    { name: "Wrist Extension Iso", sets: 3, seconds: 30 },
    { name: "Bicep Curl Iso", sets: 2, seconds: 30 },
  ],
};

const ISO_BY_DOW: Record<number, IsoProtocol> = {
  0: REST_DAY_ISO, // Sun
  1: REST_DAY_ISO, // Mon
  3: REST_DAY_ISO, // Wed
  5: REST_DAY_ISO, // Fri
  // Tue — Pull day, elbow focus
  2: {
    label: "PRE-SESSION ISO — elbow focus",
    items: [
      { name: "Wrist Extension Iso", sets: 3, seconds: 30 },
      { name: "Bicep Curl Iso", sets: 3, seconds: 30 },
      { name: "Wall Sit", sets: 3, seconds: 45 },
    ],
  },
  // Thu — Legs & Core, knee focus
  4: {
    label: "PRE-SESSION ISO — knee focus",
    items: [
      { name: "Wall Sit", sets: 5, seconds: 45 },
      { name: "Spanish Squat", sets: 3, seconds: 45 },
      { name: "Terminal Knee Extension", sets: 3, seconds: 30, eachLeg: true },
      { name: "Wall Tricep Press", sets: 2, seconds: 30 },
    ],
  },
  // Sat — Push day, tricep/elbow focus
  6: {
    label: "PRE-SESSION ISO — tricep focus",
    items: [
      { name: "Wall Tricep Press", sets: 4, seconds: 30 },
      { name: "Wrist Extension Iso", sets: 3, seconds: 30 },
      { name: "Wall Sit", sets: 3, seconds: 45 },
    ],
  },
};

export function scheduleForDow(dow: number): DaySchedule {
  return BY_DOW[dow];
}
export function isoForDow(dow: number): IsoProtocol {
  return ISO_BY_DOW[dow];
}

export function scheduleForDate(iso: string): DaySchedule {
  return scheduleForDow(parseISO(iso).getDay());
}

export function isoForDate(iso: string): IsoProtocol {
  return isoForDow(parseISO(iso).getDay());
}

// Quick "load a day" presets shown in the logger. Each maps to the weekday
// whose plan it represents (Pull=Tue, Legs=Thu, Push=Sat, Iso=a rest day).
export const FOCUS_PRESETS: { key: string; label: string; dow: number }[] = [
  { key: "pull", label: "Pull day", dow: 2 },
  { key: "legs", label: "Legs & Core day", dow: 4 },
  { key: "push", label: "Push day", dow: 6 },
  { key: "iso", label: "Iso only", dow: 1 },
];

// Human-readable one-liner for an iso item, e.g. "Wall Sit 5×60s".
export function isoItemLabel(i: IsoItem): string {
  return `${i.name} ${i.sets}×${i.seconds}s${i.eachLeg ? " each leg" : ""}`;
}

// What to pre-populate in /log for a given day. Iso exercises come FIRST (with
// their day-specific sets/seconds), then the training exercises on training days.
export interface PrefillItem {
  name: string;
  sets: number;
  durationSeconds?: number | null; // overrides the catalogue default when set
}

export function prefillForDow(dow: number): { type: SessionType; items: PrefillItem[] } {
  const isoProtocol = isoForDow(dow);
  const isoItems: PrefillItem[] = isoProtocol.items.map((i) => ({
    name: i.name,
    sets: i.sets,
    durationSeconds: i.seconds,
  }));

  const sched = scheduleForDow(dow);
  if (sched.kind === "iso") {
    return { type: "iso_only", items: isoItems };
  }

  const trainingItems: PrefillItem[] = sched.exercises.map((name) => ({
    name,
    sets: defaultSetCount(getExerciseOrDefault(name)),
  }));
  return { type: "training", items: [...isoItems, ...trainingItems] };
}

export function prefillForDate(iso: string): { type: SessionType; items: PrefillItem[] } {
  return prefillForDow(parseISO(iso).getDay());
}

// Names of the iso exercises prescribed for a given day (for completion checks).
export function isoExerciseNames(iso: string): string[] {
  return isoForDate(iso).items.map((i) => i.name);
}
