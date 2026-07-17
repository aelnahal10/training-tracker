"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useStore, type ExerciseDefaultPatch } from "@/components/StoreProvider";
import {
  Button,
  Card,
  Field,
  Modal,
  PageHeader,
  Slider,
  inputClass,
} from "@/components/ui";
import {
  GROUP_LABELS,
  GROUP_ORDER,
  defaultSetCount,
  targetRepsValue,
} from "@/lib/exercises";
import { currentPhase, isExerciseLocked, sessionForDate } from "@/lib/analytics";
import {
  prefillForDate,
  prefillForDow,
  FOCUS_PRESETS,
  type PrefillItem,
} from "@/lib/schedule";
import { PHASE0_NAME, phase0Week, scheduledForDay } from "@/lib/phase0";
import { parseISO, todayISO } from "@/lib/date";
import { uid } from "@/lib/id";
import type {
  ExerciseEntry,
  PresetExercise,
  SessionType,
  SetEntry,
} from "@/lib/types";

export default function LogPage() {
  return (
    <Suspense fallback={<div className="text-muted">Loading…</div>}>
      <LogGate />
    </Suspense>
  );
}

// Only mount the form once the store has loaded, so its one-time state
// initialization (prefill, existing session) sees the real data — not the
// empty pre-hydration shell.
function LogGate() {
  const store = useStore();
  if (!store.ready) return <div className="text-muted">Loading…</div>;
  return <LogInner />;
}

// A fresh, empty set. Targets/defaults/remembered values are shown as input
// placeholders (grey hints) rather than pre-entered values, so an untouched set
// reads as "not performed" and is dropped on save (see pruneExercises).
function blankSet(): SetEntry {
  return { weight: null, reps: null, durationSeconds: null, rpe: null };
}

// A set counts as performed once the user enters a weight, rep count or duration.
function setHasData(s: SetEntry): boolean {
  return s.weight != null || s.reps != null || s.durationSeconds != null;
}

// Drop untouched sets, then drop any exercise left with no performed sets, so
// loading a day's plan and skipping exercises never records phantom work.
function pruneExercises(list: ExerciseEntry[]): ExerciseEntry[] {
  return list
    .map((ex) => ({ ...ex, sets: ex.sets.filter(setHasData) }))
    .filter((ex) => ex.sets.length > 0);
}

function LogInner() {
  const store = useStore();
  const router = useRouter();
  const params = useSearchParams();

  const queryId = params.get("id");
  const queryDate = params.get("date");
  const initialDate = queryDate || todayISO();

  const existing = useMemo(() => {
    if (queryId) return store.sessions.find((s) => s.id === queryId);
    if (queryDate) return sessionForDate(store.sessions, queryDate);
    return sessionForDate(store.sessions, initialDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.ready]);

  // Turn a schedule plan (iso + training items) into logged exercise entries,
  // each with the right number of sets and defaults pre-filled.
  const buildExercises = (plan: { items: PrefillItem[] }): ExerciseEntry[] =>
    plan.items.map((item) => ({
      name: item.name,
      sets: Array.from({ length: item.sets }, () => blankSet()),
    }));

  // The plan for a date: Phase 0 pulls its exercises from the Supabase schedule
  // (day + program week); any other phase uses the hardcoded weekday plan.
  const planForDate = (dateISO: string): { type: SessionType; exercises: ExerciseEntry[] } => {
    const ph = currentPhase(store.phases, dateISO);
    if (ph?.name === PHASE0_NAME) {
      const rows = scheduledForDay(
        store.scheduledExercises.filter((s) => s.phaseId === ph.id),
        parseISO(dateISO).getDay(),
        phase0Week(dateISO, ph.startDate)
      );
      const type: SessionType = rows.some((r) => r.kind !== "iso") ? "training" : "iso_only";
      const exercises: ExerciseEntry[] = rows.map((r) => ({
        name: r.name,
        sets: Array.from({ length: r.sets ?? 1 }, () => blankSet()),
      }));
      return { type, exercises };
    }
    const plan = prefillForDate(dateISO);
    return { type: plan.type, exercises: buildExercises(plan) };
  };

  // New sessions auto-load the plan for that date (iso + training/cardio).
  const prefilled = useMemo(() => {
    if (existing) return null;
    return planForDate(initialDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.ready]);

  const [date, setDate] = useState(existing?.date ?? initialDate);
  const [type, setType] = useState<SessionType>(
    existing?.type ?? prefilled?.type ?? "training"
  );
  const [isoCompleted, setIsoCompleted] = useState(existing?.isoCompleted ?? false);
  const [elbow, setElbow] = useState(existing?.painScores.elbow ?? 0);
  const [knee, setKnee] = useState(existing?.painScores.knee ?? 0);
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [exercises, setExercises] = useState<ExerciseEntry[]>(
    existing?.exercises ?? prefilled?.exercises ?? []
  );
  // Which session we'll save to. Tracks the date so switching dates updates it.
  const [editingId, setEditingId] = useState<string | null>(existing?.id ?? null);

  const [search, setSearch] = useState("");
  const [pendingLock, setPendingLock] = useState<string | null>(null);

  const phase = currentPhase(store.phases, date);
  const isPhase0 = phase?.name === PHASE0_NAME;

  // Quick "load a day" presets match the current phase's actual training days.
  const dayPresets = isPhase0
    ? [
        { key: "cardio", label: "Cardio day", dow: 1 },
        { key: "fullbody", label: "Full body day", dow: 6 },
        { key: "iso", label: "Iso day", dow: 2 },
      ]
    : FOCUS_PRESETS;

  if (!store.ready) return <div className="text-muted">Loading…</div>;

  // All catalogue exercises (with edited defaults), filtered + grouped for the picker.
  const grouped = GROUP_ORDER.map((group) => ({
    group,
    items: store.exercises.filter(
      (e) => e.group === group && e.name.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter((g) => g.items.length > 0);

  const addedNames = new Set(exercises.map((e) => e.name));

  const addExercise = (name: string) => {
    if (addedNames.has(name)) return; // already in the session
    if (isExerciseLocked(phase, name)) {
      setPendingLock(name);
      return;
    }
    reallyAdd(name);
  };

  const reallyAdd = (name: string) => {
    const ex = store.getEx(name);
    setExercises((prev) => {
      // Each exercise can only be added once per session.
      if (prev.some((e) => e.name === name)) return prev;
      const count = defaultSetCount(ex);
      return [...prev, { name, sets: Array.from({ length: count }, () => blankSet()) }];
    });
  };

  // Load a whole day's plan (replaces the current exercise list + session type).
  // In Phase 0 this comes from the DB schedule for that weekday + current week.
  const loadDay = (dow: number) => {
    if (isPhase0 && phase) {
      const rows = scheduledForDay(
        store.scheduledExercises.filter((s) => s.phaseId === phase.id),
        dow,
        phase0Week(date, phase.startDate)
      );
      setType(rows.some((r) => r.kind !== "iso") ? "training" : "iso_only");
      setExercises(
        rows.map((r) => ({
          name: r.name,
          sets: Array.from({ length: r.sets ?? 1 }, () => blankSet()),
        }))
      );
    } else {
      const plan = prefillForDow(dow);
      setType(plan.type);
      setExercises(buildExercises(plan));
    }
    setSearch("");
  };

  // Changing the date reloads the form: an existing session for that date if one
  // is logged, otherwise a fresh plan for that date's weekday.
  const onDateChange = (newDate: string) => {
    setDate(newDate);
    setSearch("");
    const sess = sessionForDate(store.sessions, newDate);
    if (sess) {
      setEditingId(sess.id);
      setType(sess.type);
      setIsoCompleted(sess.isoCompleted);
      setElbow(sess.painScores.elbow);
      setKnee(sess.painScores.knee);
      setNotes(sess.notes);
      setExercises(sess.exercises);
    } else {
      const plan = planForDate(newDate);
      setEditingId(null);
      setType(plan.type);
      setIsoCompleted(false);
      setElbow(0);
      setKnee(0);
      setNotes("");
      setExercises(plan.exercises);
    }
  };

  const removeExercise = (idx: number) =>
    setExercises((prev) => prev.filter((_, i) => i !== idx));

  const addSet = (exIdx: number) =>
    setExercises((prev) =>
      prev.map((ex, i) =>
        i === exIdx ? { ...ex, sets: [...ex.sets, blankSet()] } : ex
      )
    );

  const removeSet = (exIdx: number, setIdx: number) =>
    setExercises((prev) =>
      prev.map((ex, i) =>
        i === exIdx ? { ...ex, sets: ex.sets.filter((_, j) => j !== setIdx) } : ex
      )
    );

  const updateSet = (
    exIdx: number,
    setIdx: number,
    field: keyof SetEntry,
    value: number | null
  ) =>
    setExercises((prev) =>
      prev.map((ex, i) =>
        i === exIdx
          ? {
              ...ex,
              sets: ex.sets.map((s, j) => (j === setIdx ? { ...s, [field]: value } : s)),
            }
          : ex
      )
    );

  // On save, remember each exercise's latest weight/duration as its new default.
  const computeDefaultPatches = (list: ExerciseEntry[]): ExerciseDefaultPatch[] => {
    const patches: ExerciseDefaultPatch[] = [];
    for (const ex of list) {
      const meta = store.getEx(ex.name);
      if (meta.inputType === "weight_reps") {
        const last = [...ex.sets].reverse().find((s) => s.weight != null);
        if (last) patches.push({ name: ex.name, defaultWeight: last.weight });
      } else if (meta.inputType === "duration" || meta.inputType === "duration_min") {
        const last = [...ex.sets].reverse().find((s) => s.durationSeconds != null);
        if (last) patches.push({ name: ex.name, defaultDurationSeconds: last.durationSeconds });
      }
    }
    return patches;
  };

  const save = () => {
    const finalExercises = type === "rest" ? [] : pruneExercises(exercises);
    store.rememberDefaults(computeDefaultPatches(finalExercises));
    store.upsertSession({
      id: editingId ?? uid("session"),
      date,
      phaseId: phase?.id ?? existing?.phaseId ?? "",
      type,
      isoCompleted,
      painScores: { elbow, knee },
      exercises: finalExercises,
      notes,
    });
    router.push("/");
  };

  const showExercises = type !== "rest";

  const sessionCard = (
    <Card className="space-y-4">
      <Field label="Date">
        <input
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          className={inputClass}
        />
      </Field>

      <div>
        <span className="mb-1 block text-xs font-medium text-muted">Session type</span>
        <div className="grid grid-cols-3 overflow-hidden rounded-xl border border-border">
          {(["training", "iso_only", "rest"] as SessionType[]).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`py-2.5 text-sm font-semibold capitalize ${
                type === t ? "bg-accent text-white" : "text-muted"
              }`}
            >
              {t.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      <Slider label="Elbow pain" value={elbow} onChange={setElbow} color="#ef4444" />
      <Slider label="Knee pain" value={knee} onChange={setKnee} color="#f59e0b" />

      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-white">Isos completed?</span>
        <button
          onClick={() => setIsoCompleted((v) => !v)}
          className={`h-7 w-12 rounded-full transition ${
            isoCompleted ? "bg-trained" : "bg-surface-2 border border-border"
          }`}
        >
          <span
            className={`block h-6 w-6 rounded-full bg-white transition ${
              isoCompleted ? "translate-x-6" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      <Field label="Notes">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className={inputClass}
          placeholder="How did it feel?"
        />
      </Field>
    </Card>
  );

  return (
    <div>
      <PageHeader
        title={existing ? "Edit session" : "Log session"}
        subtitle={phase ? phase.name : undefined}
      />

      <div className="md:grid md:grid-cols-2 md:items-start md:gap-6">
        <div className="space-y-4">{sessionCard}</div>

        <div className="mt-4 space-y-4 md:mt-0">
          {showExercises ? (
            <Card className="space-y-4">
              {/* Quick day loader — pick a whole day at once */}
              <div>
                <span className="mb-1 block text-xs font-medium text-muted">
                  Load a day&apos;s plan
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {dayPresets.map((f) => (
                    <Button key={f.key} variant="secondary" onClick={() => loadDay(f.dow)}>
                      {f.label}
                    </Button>
                  ))}
                </div>
                <p className="mt-1 text-[11px] text-muted">
                  Replaces the list below with that day&apos;s iso + exercises, ready to log.
                </p>
              </div>

              {/* Optional: add a one-off exercise (catalogue hidden until you search) */}
              <div>
                <span className="mb-1 block text-xs font-medium text-muted">
                  Add another exercise
                </span>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search to add an extra…"
                  className={inputClass}
                />
                {search && (
                  <div className="mt-2 max-h-72 overflow-y-auto rounded-xl border border-border">
                    {grouped.length === 0 && (
                      <p className="px-3 py-2 text-sm text-muted">No matches.</p>
                    )}
                    {grouped.map((g) => (
                      <div key={g.group}>
                        <p className="sticky top-0 bg-surface-2 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-muted">
                          {GROUP_LABELS[g.group]}
                        </p>
                        {g.items.map((e) => {
                          const added = addedNames.has(e.name);
                          return (
                            <button
                              key={e.name}
                              onClick={() => addExercise(e.name)}
                              disabled={added}
                              className={`flex w-full items-center justify-between border-b border-border px-3 py-2 text-left last:border-0 ${
                                added ? "opacity-40" : "hover:bg-surface-2"
                              }`}
                            >
                              <span className="text-sm text-white">{e.name}</span>
                              <span className="flex items-center gap-2">
                                {e.restricted && (
                                  <span className="rounded bg-knee/20 px-1.5 py-0.5 text-[10px] font-semibold text-knee">
                                    Phase 2
                                  </span>
                                )}
                                {added ? (
                                  <span className="text-xs font-semibold text-trained">Added ✓</span>
                                ) : (
                                  <span className="text-xs text-muted">{defaultLabel(e)}</span>
                                )}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {exercises.length === 0 && (
                <p className="text-sm text-muted">No exercises added yet.</p>
              )}

              {exercises.map((ex, exIdx) => (
                <ExerciseBlock
                  key={exIdx}
                  ex={ex}
                  meta={store.getEx(ex.name)}
                  onRemove={() => removeExercise(exIdx)}
                  onAddSet={() => addSet(exIdx)}
                  onRemoveSet={(setIdx) => removeSet(exIdx, setIdx)}
                  onUpdateSet={(setIdx, field, value) => updateSet(exIdx, setIdx, field, value)}
                />
              ))}
            </Card>
          ) : (
            <Card>
              <p className="text-sm text-muted">
                Rest day — pain scores and notes only. No exercises logged.
              </p>
            </Card>
          )}
        </div>
      </div>

      <Button onClick={save} className="mt-4 w-full py-3 text-base">
        Save session
      </Button>

      {pendingLock && (
        <Modal
          title="Locked exercise"
          onClose={() => setPendingLock(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setPendingLock(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  reallyAdd(pendingLock);
                  setPendingLock(null);
                }}
              >
                Add Anyway
              </Button>
            </>
          }
        >
          <span className="font-medium text-white">{pendingLock}</span> is locked until
          Phase 2 (Week 7). Adding it anyway?
        </Modal>
      )}
    </div>
  );
}

// "3 × 8-10 · rest 90s" / "3 × 25s" prescription summary for an exercise.
function targetText(e: PresetExercise): string {
  let core = "";
  if (e.reps) core = `${e.sets ?? 3} × ${e.reps}`;
  else if (e.inputType === "duration" && e.sets && e.defaultDurationSeconds != null)
    core = `${e.sets} × ${e.defaultDurationSeconds}s`;
  if (!core) return "";
  return e.restSeconds ? `${core} · rest ${e.restSeconds}s` : core;
}

// Short "default" label for a picker row.
function defaultLabel(e: PresetExercise): string {
  if (e.inputType === "duration_min" && e.defaultDurationSeconds != null)
    return `${Math.round(e.defaultDurationSeconds / 60)} min`;
  if (e.inputType === "duration" && e.defaultDurationSeconds != null)
    return `${e.defaultDurationSeconds}s`;
  if (e.inputType === "bodyweight_reps") return "bodyweight";
  if (e.defaultWeight != null) return `${e.defaultWeight} ${e.unit ?? "kg"}`;
  return "";
}

function ExerciseBlock({
  ex,
  meta,
  onRemove,
  onAddSet,
  onRemoveSet,
  onUpdateSet,
}: {
  ex: ExerciseEntry;
  meta: PresetExercise;
  onRemove: () => void;
  onAddSet: () => void;
  onRemoveSet: (setIdx: number) => void;
  onUpdateSet: (setIdx: number, field: keyof SetEntry, value: number | null) => void;
}) {
  const showWeight = meta.inputType === "weight_reps";
  const showReps = meta.inputType === "weight_reps" || meta.inputType === "bodyweight_reps";
  const showSeconds = meta.inputType === "duration";
  const showMinutes = meta.inputType === "duration_min";

  // Targets / remembered defaults shown as grey placeholders (not pre-entered).
  const repsTarget = targetRepsValue(meta);
  const weightPh = meta.defaultWeight != null ? String(meta.defaultWeight) : "0";
  const repsPh = repsTarget != null ? String(repsTarget) : "0";
  const secPh = meta.defaultDurationSeconds != null ? String(meta.defaultDurationSeconds) : "0";
  const minPh =
    meta.defaultDurationSeconds != null ? String(Math.round(meta.defaultDurationSeconds / 60)) : "0";

  return (
    <div className="rounded-xl border border-border p-3">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <span className="font-semibold text-white">{ex.name}</span>
          {targetText(meta) && (
            <p className="text-xs font-medium text-accent">Target: {targetText(meta)}</p>
          )}
          {meta.note && <p className="text-xs text-muted">{meta.note}</p>}
        </div>
        <button onClick={onRemove} className="text-xs font-semibold text-missed">
          Remove
        </button>
      </div>

      <div className="mb-1 flex gap-2 text-[10px] uppercase text-muted">
        <span className="w-6 shrink-0" />
        {showWeight && <span className="min-w-0 flex-1">kg</span>}
        {showReps && <span className="min-w-0 flex-1">reps</span>}
        {showSeconds && <span className="min-w-0 flex-1">sec</span>}
        {showMinutes && <span className="min-w-0 flex-1">min</span>}
        <span className="min-w-0 flex-1">rpe</span>
        <span className="w-6 shrink-0" />
      </div>

      <div className="space-y-1.5">
        {ex.sets.map((set, setIdx) => (
          <div key={setIdx} className="flex items-center gap-2">
            <span className="w-6 shrink-0 text-center text-xs font-bold text-muted">
              {setIdx + 1}
            </span>
            {showWeight && (
              <NumInput
                value={set.weight}
                placeholder={weightPh}
                onChange={(v) => onUpdateSet(setIdx, "weight", v)}
              />
            )}
            {showReps && (
              <NumInput
                value={set.reps}
                placeholder={repsPh}
                onChange={(v) => onUpdateSet(setIdx, "reps", v)}
              />
            )}
            {showSeconds && (
              <NumInput
                value={set.durationSeconds}
                placeholder={secPh}
                onChange={(v) => onUpdateSet(setIdx, "durationSeconds", v)}
              />
            )}
            {showMinutes && (
              <NumInput
                value={set.durationSeconds == null ? null : set.durationSeconds / 60}
                placeholder={minPh}
                onChange={(v) =>
                  onUpdateSet(setIdx, "durationSeconds", v == null ? null : Math.round(v * 60))
                }
              />
            )}
            <NumInput value={set.rpe} onChange={(v) => onUpdateSet(setIdx, "rpe", v)} placeholder="—" />
            <button
              onClick={() => onRemoveSet(setIdx)}
              className="w-6 shrink-0 text-center text-muted hover:text-missed"
              aria-label="Remove set"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <button onClick={onAddSet} className="mt-2 text-xs font-semibold text-accent">
        + Add set
      </button>
    </div>
  );
}

function NumInput({
  value,
  onChange,
  placeholder = "0",
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      value={value ?? ""}
      placeholder={placeholder}
      onChange={(e) => {
        const raw = e.target.value;
        onChange(raw === "" ? null : Number(raw));
      }}
      className="w-full min-w-0 flex-1 rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-center text-sm text-white outline-none focus:border-accent"
    />
  );
}
