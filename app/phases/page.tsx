"use client";

import { useState } from "react";
import { useStore } from "@/components/StoreProvider";
import { Button, Card, Field, PageHeader, inputClass } from "@/components/ui";
import { currentPhase, phaseProgress, lockedExercisesFor } from "@/lib/analytics";
import { formatLong, todayISO, addDays } from "@/lib/date";
import { uid } from "@/lib/id";
import { scheduledLabel } from "@/lib/phase0";
import type { Phase, ScheduledExercise } from "@/lib/types";

export default function PhasesPage() {
  const store = useStore();
  const [editing, setEditing] = useState<Phase | null>(null);
  const [planFor, setPlanFor] = useState<string | null>(null);

  if (!store.ready) return <div className="text-muted">Loading…</div>;

  const active = currentPhase(store.phases);
  const phases = [...store.phases].sort((a, b) => a.startDate.localeCompare(b.startDate));

  const startNew = () => {
    const start = todayISO();
    setEditing({
      id: uid("phase"),
      name: "",
      startDate: start,
      endDate: addDays(start, 6 * 7),
      description: "",
      unlockedExercises: [],
    });
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Phases"
        action={
          <Button variant="secondary" onClick={startNew}>
            + Add
          </Button>
        }
      />

      {editing && (
        <PhaseForm
          phase={editing}
          onCancel={() => setEditing(null)}
          onSave={(p) => {
            store.upsertPhase(p);
            setEditing(null);
          }}
        />
      )}

      {phases.map((p) => {
        const prog = phaseProgress(p);
        const isActive = active?.id === p.id;
        const locked = lockedExercisesFor(p);
        const hasPlan = store.scheduledExercises.some((s) => s.phaseId === p.id);
        return (
          <Card key={p.id} accent={isActive ? "yellow" : "none"} className={isActive ? "border-accent" : ""}>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white">{p.name || "Untitled phase"}</h2>
                  {isActive && (
                    <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-white">
                      CURRENT
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted">
                  {formatLong(p.startDate)} → {formatLong(p.endDate)}
                </p>
              </div>
              <button onClick={() => setEditing(p)} className="text-sm text-accent">
                ✎ Edit
              </button>
            </div>

            <p className="mt-2 text-sm text-muted">{p.description}</p>

            <p className="mt-2 text-xs font-medium text-white">
              {prog.complete ? "Complete" : `${prog.remaining} days remaining`}
            </p>

            {(locked.length > 0 || p.unlockedExercises.length > 0) && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {p.unlockedExercises.map((n) => (
                  <span key={n} className="rounded-full bg-trained/15 px-2 py-0.5 text-[10px] font-medium text-trained">
                    🔓 {n}
                  </span>
                ))}
                {locked.map((n) => (
                  <span key={n} className="rounded-full bg-knee/15 px-2 py-0.5 text-[10px] font-medium text-knee">
                    🔒 {n}
                  </span>
                ))}
              </div>
            )}

            {hasPlan && (
              <div className="mt-3 border-t border-border pt-3">
                <button
                  onClick={() => setPlanFor(planFor === p.id ? null : p.id)}
                  className="text-sm font-semibold text-accent"
                >
                  {planFor === p.id ? "Hide plan" : "✎ Edit weekly plan"}
                </button>
                {planFor === p.id && <PlanEditor phaseId={p.id} />}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function PhaseForm({
  phase,
  onSave,
  onCancel,
}: {
  phase: Phase;
  onSave: (p: Phase) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(phase.name);
  const [startDate, setStartDate] = useState(phase.startDate);
  const [endDate, setEndDate] = useState(phase.endDate);
  const [description, setDescription] = useState(phase.description);
  const [unlocked, setUnlocked] = useState<string[]>(phase.unlockedExercises);

  const RESTRICTED = ["Lat Pulldown", "Tricep Extensions"];
  const toggle = (name: string) =>
    setUnlocked((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );

  return (
    <Card className="space-y-4 border-accent">
      <Field label="Name">
        <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Start date">
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
        </Field>
        <Field label="End date">
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputClass} />
        </Field>
      </div>
      <Field label="Description">
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={inputClass} />
      </Field>
      <div>
        <span className="mb-1 block text-xs font-medium text-muted">Unlocked restricted exercises</span>
        <div className="flex flex-wrap gap-2">
          {RESTRICTED.map((n) => (
            <button
              key={n}
              onClick={() => toggle(n)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                unlocked.includes(n)
                  ? "bg-trained/20 text-trained"
                  : "bg-surface-2 text-muted"
              }`}
            >
              {unlocked.includes(n) ? "🔓" : "🔒"} {n}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          onClick={() => onSave({ ...phase, name, startDate, endDate, description, unlockedExercises: unlocked })}
          className="flex-1"
        >
          Save phase
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </Card>
  );
}

// Day ordering/labels for the plan editor. -1 = the daily iso block.
const DOW_OPTIONS = [-1, 1, 2, 3, 4, 5, 6, 0];
const DOW_NAMES: Record<number, string> = {
  [-1]: "Every day (iso)",
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
};

// Add/remove exercises in a phase's DB-driven weekly plan (Phase 0).
function PlanEditor({ phaseId }: { phaseId: string }) {
  const store = useStore();
  const [addDow, setAddDow] = useState<number>(6);
  const [addName, setAddName] = useState<string>("");

  const rows = store.scheduledExercises.filter((s) => s.phaseId === phaseId);

  const addExercise = () => {
    if (!addName) return;
    const ex = store.getEx(addName);
    const kind: ScheduledExercise["kind"] =
      ex.group === "iso"
        ? "iso"
        : ex.group === "cardio"
        ? "cardio"
        : ex.group === "core"
        ? "core"
        : "strength";
    const dayRows = rows.filter((r) => r.dayOfWeek === addDow);
    const position = dayRows.reduce((m, r) => Math.max(m, r.position), 9) + 1;
    store.addScheduledExercise({
      id: uid("sched"),
      phaseId,
      dayOfWeek: addDow,
      weekStart: null,
      weekEnd: null,
      position,
      name: ex.name,
      kind,
      sets: ex.sets ?? (ex.group === "cardio" ? 1 : 3),
      reps: ex.reps ?? null,
      weight: ex.defaultWeight,
      durationSeconds: ex.defaultDurationSeconds ?? null,
      workSeconds: null,
      recoverySeconds: null,
      restSeconds: ex.restSeconds ?? null,
      unit: ex.unit ?? null,
      note: ex.note ?? null,
    });
    setAddName("");
  };

  return (
    <div className="mt-3 space-y-3 rounded-xl border border-border bg-surface-2 p-3">
      {DOW_OPTIONS.map((dow) => {
        const items = rows
          .filter((r) => r.dayOfWeek === dow)
          .sort((a, b) => a.position - b.position);
        if (items.length === 0) return null;
        return (
          <div key={dow}>
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
              {DOW_NAMES[dow]}
            </p>
            <ul className="mt-1 space-y-1">
              {items.map((it) => (
                <li key={it.id} className="flex items-center justify-between gap-2 text-sm text-white">
                  <span>
                    {scheduledLabel(it)}
                    {it.weekStart != null && (
                      <span className="ml-1 text-[10px] text-muted">
                        wk {it.weekStart}-{it.weekEnd ?? it.weekStart}
                      </span>
                    )}
                  </span>
                  <button
                    onClick={() => store.deleteScheduledExercise(it.id)}
                    className="shrink-0 text-xs font-semibold text-missed"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      <div className="border-t border-border pt-3">
        <p className="mb-1 text-xs font-medium text-muted">Add an exercise to a day</p>
        <div className="flex gap-2">
          <select
            value={addDow}
            onChange={(e) => setAddDow(Number(e.target.value))}
            className={inputClass}
            aria-label="Day"
          >
            {DOW_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {DOW_NAMES[d]}
              </option>
            ))}
          </select>
          <select
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
            className={inputClass}
            aria-label="Exercise"
          >
            <option value="">Select exercise…</option>
            {[...store.exercises]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((e) => (
                <option key={e.name} value={e.name}>
                  {e.name}
                </option>
              ))}
          </select>
        </div>
        <Button variant="secondary" className="mt-2 w-full" onClick={addExercise} disabled={!addName}>
          Add to {DOW_NAMES[addDow]}
        </Button>
        <p className="mt-1 text-[11px] text-muted">
          New items apply to all weeks. Need something custom? Create it once on the Log screen and
          it&apos;ll appear here.
        </p>
      </div>
    </div>
  );
}
