"use client";

import { useState } from "react";
import { useStore } from "@/components/StoreProvider";
import { Button, Card, CardTitle, Field, PageHeader, inputClass } from "@/components/ui";
import { BarChart, type Bar } from "@/components/charts";
import { sortByDateDesc, sortByDateAsc, formatShort, startOfWeek, todayISO } from "@/lib/date";
import { uid } from "@/lib/id";
import type { WeeklyCheckIn } from "@/lib/types";

export default function CheckInPage() {
  const store = useStore();
  const [weekStart, setWeekStart] = useState(startOfWeek(todayISO()));
  const [wallSit, setWallSit] = useState("");
  const [notes, setNotes] = useState("");

  const submit = () => {
    if (wallSit === "") return;
    const entry: WeeklyCheckIn = {
      id: uid("checkin"),
      weekStartDate: weekStart,
      maxWallSitSeconds: Number(wallSit),
      notes,
    };
    store.upsertCheckin(entry);
    setWallSit("");
    setNotes("");
  };

  if (!store.ready) return <div className="text-muted">Loading…</div>;

  const history = sortByDateDesc(store.checkins, (c) => c.weekStartDate);
  const bars: Bar[] = sortByDateAsc(store.checkins, (c) => c.weekStartDate).map((c) => ({
    label: formatShort(c.weekStartDate),
    value: c.maxWallSitSeconds,
  }));

  return (
    <div className="space-y-4">
      <PageHeader title="Weekly check-in" />

      <Card className="space-y-4">
        <CardTitle>New check-in</CardTitle>
        <Field label="Week start date">
          <input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Max wall sit (seconds)">
          <input type="number" inputMode="numeric" value={wallSit} onChange={(e) => setWallSit(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Notes">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={inputClass} />
        </Field>
        <Button onClick={submit} className="w-full" disabled={wallSit === ""}>
          Save check-in
        </Button>
      </Card>

      <Card>
        <CardTitle>Wall sit trend</CardTitle>
        <BarChart bars={bars} color="#22c55e" yUnit="seconds" />
      </Card>

      <Card className="space-y-3">
        <CardTitle>History</CardTitle>
        {history.length === 0 ? (
          <p className="text-sm text-muted">No check-ins yet.</p>
        ) : (
          history.map((c) => (
            <div key={c.id} className="flex items-start justify-between border-b border-border pb-2 last:border-0">
              <div>
                <p className="text-sm font-semibold text-white">
                  Week of {formatShort(c.weekStartDate)}
                </p>
                {c.notes && <p className="text-xs text-muted">{c.notes}</p>}
              </div>
              <span className="text-sm font-bold text-trained">{c.maxWallSitSeconds}s</span>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
