"use client";

import { useState } from "react";
import { useStore } from "@/components/StoreProvider";
import { Button, Card, CardTitle, Field, PageHeader, inputClass } from "@/components/ui";
import { sortByDateDesc, formatShort, todayISO } from "@/lib/date";
import { computeBmi, latestMetric } from "@/lib/analytics";
import { uid } from "@/lib/id";
import type { BodyMetric } from "@/lib/types";

export default function MetricsPage() {
  const store = useStore();
  const [editId, setEditId] = useState<string | null>(null);
  const [date, setDate] = useState(todayISO());
  const [weight, setWeight] = useState("");
  const [muscle, setMuscle] = useState("");
  const [bodyFat, setBodyFat] = useState("");

  const reset = () => {
    setEditId(null);
    setDate(todayISO());
    setWeight("");
    setMuscle("");
    setBodyFat("");
  };

  const submit = () => {
    if (weight === "") return;
    const metric: BodyMetric = {
      id: editId ?? uid("metric"),
      date,
      weightKg: Number(weight),
      muscleMassKg: muscle === "" ? null : Number(muscle),
      bodyFatPercent: bodyFat === "" ? null : Number(bodyFat),
    };
    store.upsertMetric(metric);
    reset();
  };

  const edit = (m: BodyMetric) => {
    setEditId(m.id);
    setDate(m.date);
    setWeight(String(m.weightKg));
    setMuscle(m.muscleMassKg != null ? String(m.muscleMassKg) : "");
    setBodyFat(m.bodyFatPercent != null ? String(m.bodyFatPercent) : "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!store.ready) return <div className="text-muted">Loading…</div>;
  const rows = sortByDateDesc(store.metrics, (m) => m.date);

  const height = store.profile.heightCm;
  const latest = latestMetric(store.metrics);
  const bmi = latest && height ? computeBmi(latest.weightKg, height) : null;

  return (
    <div className="space-y-4">
      <PageHeader title="Body metrics" />

      <Card className="space-y-3">
        <CardTitle>Height &amp; BMI</CardTitle>
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <Field label="Height (cm)">
              <input
                type="number"
                inputMode="decimal"
                value={height ?? ""}
                placeholder="e.g. 178"
                onChange={(e) =>
                  store.setHeight(e.target.value === "" ? null : Number(e.target.value))
                }
                className={inputClass}
              />
            </Field>
          </div>
          <div className="flex-1 text-center">
            {bmi ? (
              <>
                <div className="text-3xl font-bold text-white">{bmi.bmi}</div>
                <div className="text-xs font-medium text-accent">
                  BMI · {bmi.category}
                </div>
                <div className="text-[10px] text-muted">
                  from {latest!.weightKg} kg
                </div>
              </>
            ) : (
              <div className="text-xs text-muted">
                {height ? "Log a weight to see BMI" : "Enter height for BMI"}
              </div>
            )}
          </div>
        </div>
      </Card>

      <Card className="space-y-4">
        <CardTitle>{editId ? "Edit entry" : "New entry"}</CardTitle>
        <Field label="Date">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
        </Field>
        <div className="grid grid-cols-3 gap-2">
          <Field label="Weight (kg)">
            <input type="number" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Muscle (kg)">
            <input type="number" inputMode="decimal" value={muscle} onChange={(e) => setMuscle(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Body fat %">
            <input type="number" inputMode="decimal" value={bodyFat} onChange={(e) => setBodyFat(e.target.value)} className={inputClass} />
          </Field>
        </div>
        <div className="flex gap-2">
          <Button onClick={submit} className="flex-1" disabled={weight === ""}>
            {editId ? "Update" : "Save"}
          </Button>
          {editId && (
            <Button variant="ghost" onClick={reset}>
              Cancel
            </Button>
          )}
        </div>
      </Card>

      <Card className="!p-0">
        <div className="p-4 pb-2">
          <CardTitle>All entries</CardTitle>
        </div>
        {rows.length === 0 ? (
          <p className="px-4 pb-4 text-sm text-muted">No entries yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="px-4 py-2">Date</th>
                <th className="py-2">kg</th>
                <th className="py-2">muscle</th>
                <th className="py-2">bf%</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2 text-white">{formatShort(m.date)}</td>
                  <td className="py-2 text-white">{m.weightKg}</td>
                  <td className="py-2 text-muted">{m.muscleMassKg ?? "—"}</td>
                  <td className="py-2 text-muted">{m.bodyFatPercent ?? "—"}</td>
                  <td className="py-2 pr-3 text-right">
                    <button onClick={() => edit(m)} className="mr-2 text-accent" aria-label="Edit">
                      ✎
                    </button>
                    <button
                      onClick={() => store.deleteMetric(m.id)}
                      className="text-missed"
                      aria-label="Delete"
                    >
                      🗑
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
