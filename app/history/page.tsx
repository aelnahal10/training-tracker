"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useStore } from "@/components/StoreProvider";
import { Card, PageHeader, TypeBadge, inputClass } from "@/components/ui";
import { getExerciseOrDefault } from "@/lib/exercises";
import { sessionsSortedDesc } from "@/lib/analytics";
import { formatLong } from "@/lib/date";
import type { InputType, SetEntry, Session, SessionType } from "@/lib/types";

// Render one set according to the exercise's input type.
function formatSet(inputType: InputType, set: SetEntry): string {
  if (inputType === "duration_min") {
    return set.durationSeconds == null ? "— min" : `${Math.round(set.durationSeconds / 60)} min`;
  }
  if (inputType === "duration") {
    return `${set.durationSeconds ?? "—"}s`;
  }
  const weight = inputType === "weight_reps" ? `${set.weight ?? "—"}kg × ` : "";
  return `${weight}${set.reps ?? "—"} reps`;
}

type Filter = "all" | SessionType;

export default function HistoryPage() {
  const store = useStore();
  const [filter, setFilter] = useState<Filter>("all");
  const [phaseId, setPhaseId] = useState<string>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const sessions = useMemo(() => {
    let list = sessionsSortedDesc(store.sessions);
    if (filter !== "all") list = list.filter((s) => s.type === filter);
    if (phaseId !== "all") list = list.filter((s) => s.phaseId === phaseId);
    return list;
  }, [store.sessions, filter, phaseId]);

  if (!store.ready) return <div className="text-muted">Loading…</div>;

  return (
    <div className="space-y-4">
      <PageHeader title="History" subtitle={`${store.sessions.length} sessions`} />

      <div className="flex overflow-hidden rounded-xl border border-border">
        {(["all", "training", "iso_only", "rest"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 py-2 text-xs font-semibold capitalize ${
              filter === f ? "bg-accent text-white" : "text-muted"
            }`}
          >
            {f === "all" ? "All" : f.replace("_", " ")}
          </button>
        ))}
      </div>

      <select
        value={phaseId}
        onChange={(e) => setPhaseId(e.target.value)}
        className={inputClass}
      >
        <option value="all">All phases</option>
        {store.phases.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      {sessions.length === 0 && (
        <p className="pt-6 text-center text-sm text-muted">No sessions match.</p>
      )}

      <div className="space-y-2">
        {sessions.map((s) => (
          <SessionRow
            key={s.id}
            session={s}
            open={expanded === s.id}
            onToggle={() => setExpanded(expanded === s.id ? null : s.id)}
          />
        ))}
      </div>
    </div>
  );
}

function SessionRow({
  session,
  open,
  onToggle,
}: {
  session: Session;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <Card className="!p-0">
      <div className="flex items-center gap-3 p-3">
        <button onClick={onToggle} className="flex flex-1 items-center gap-3 text-left">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">
                {formatLong(session.date)}
              </span>
              <TypeBadge type={session.type} />
            </div>
            <div className="mt-0.5 text-xs text-muted">
              {session.exercises.length} exercises · E:{session.painScores.elbow} K:
              {session.painScores.knee}
              {session.isoCompleted && " · iso ✓"}
            </div>
          </div>
          <span className="text-muted">{open ? "▲" : "▼"}</span>
        </button>
        <Link
          href={`/log?id=${session.id}`}
          className="rounded-lg border border-border px-2 py-1 text-xs font-semibold text-accent"
          aria-label="Edit session"
        >
          ✎ Edit
        </Link>
      </div>

      {open && (
        <div className="border-t border-border p-3 text-sm">
          {session.exercises.length === 0 ? (
            <p className="text-muted">No exercises logged.</p>
          ) : (
            <div className="space-y-2">
              {session.exercises.map((ex, i) => {
                const preset = getExerciseOrDefault(ex.name);
                return (
                  <div key={i}>
                    <p className="font-medium text-white">{ex.name}</p>
                    <ul className="ml-3 text-xs text-muted">
                      {ex.sets.map((set, j) => (
                        <li key={j}>
                          Set {j + 1}: {formatSet(preset.inputType, set)}
                          {set.rpe != null && ` @ RPE ${set.rpe}`}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
          {session.notes && (
            <p className="mt-3 rounded-lg bg-surface-2 p-2 text-xs text-muted">
              {session.notes}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
