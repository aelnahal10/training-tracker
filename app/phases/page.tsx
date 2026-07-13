"use client";

import { useState } from "react";
import { useStore } from "@/components/StoreProvider";
import { Button, Card, Field, PageHeader, inputClass } from "@/components/ui";
import { currentPhase, phaseProgress, lockedExercisesFor } from "@/lib/analytics";
import { formatLong, todayISO, addDays } from "@/lib/date";
import { uid } from "@/lib/id";
import type { Phase } from "@/lib/types";

export default function PhasesPage() {
  const store = useStore();
  const [editing, setEditing] = useState<Phase | null>(null);

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
