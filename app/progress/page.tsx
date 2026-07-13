"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/components/StoreProvider";
import { Card, CardTitle, PageHeader, inputClass } from "@/components/ui";
import {
  TimeLineChart,
  BarChart,
  GroupedBars,
  CalendarHeatmap,
  type LineSeries,
  type Bar,
  type HeatCell,
} from "@/components/charts";
import {
  metricsSortedAsc,
  latestMetric,
  weeklyWeightChange,
  sessionsSortedAsc,
  sessionTonnage,
  exerciseProgressSeries,
  loggedExerciseNames,
  groupVolumeForWeek,
  computeBmi,
  sessionsInWeek,
  countByType,
  avgRecentPain,
  bestWallSitSeconds,
  isoAdherence,
  weeklyTonnageSeries,
  weeklySessionCounts,
} from "@/lib/analytics";
import {
  addDays,
  daysBetween,
  formatShort,
  parseISO,
  startOfWeek,
  todayISO,
} from "@/lib/date";

export default function ProgressPage() {
  const store = useStore();
  if (!store.ready) return <div className="text-muted">Loading…</div>;

  return (
    <div>
      <PageHeader title="Progress" subtitle="Your training analytics" />
      <KpiRow />
      <div className="mt-4 md:grid md:grid-cols-2 md:items-start md:gap-4 [&>*]:mb-4 md:[&>*]:mb-0">
        <div className="md:col-span-2">
          <WeightChart />
        </div>
        <MuscleMassChart />
        <BodyFatChart />
        <ExerciseChart />
        <SessionsPerWeekChart />
        <div className="md:col-span-2">
          <PainChart />
        </div>
        <div className="md:col-span-2">
          <VolumeChart />
        </div>
        <WeeklyTonnageChart />
        <MuscleSplitChart />
        <div className="md:col-span-2">
          <IsoCalendar />
        </div>
      </div>
    </div>
  );
}

// ---- KPI tiles ----
function KpiRow() {
  const { metrics, sessions, checkins, profile } = useStore();
  const latest = latestMetric(metrics);
  const change = weeklyWeightChange(metrics);
  const bmi = latest && profile.heightCm ? computeBmi(latest.weightKg, profile.heightCm) : null;
  const thisWeek = startOfWeek(todayISO());
  const thisWeekSessions = sessionsInWeek(sessions, thisWeek);
  const types = countByType(sessions);
  const elbow = avgRecentPain(sessions, "elbow");
  const knee = avgRecentPain(sessions, "knee");
  const wallSit = bestWallSitSeconds(sessions, checkins);
  const iso = isoAdherence(sessions, 14);

  const tiles: { label: string; value: string; sub?: string; tone?: string }[] = [
    {
      label: "Weight",
      value: latest ? `${latest.weightKg} kg` : "—",
      sub: change != null ? `${change > 0 ? "+" : ""}${change} kg / wk` : undefined,
      tone: change == null ? undefined : change <= 0 ? "text-trained" : "text-missed",
    },
    {
      label: "Muscle mass",
      value: latest?.muscleMassKg != null ? `${latest.muscleMassKg} kg` : "—",
      tone: "text-trained",
    },
    {
      label: "Body fat",
      value: latest?.bodyFatPercent != null ? `${latest.bodyFatPercent}%` : "—",
    },
    { label: "BMI", value: bmi ? `${bmi.bmi}` : "—", sub: bmi?.category },
    {
      label: "This week",
      value: `${thisWeekSessions.filter((s) => s.type === "training").length} training`,
      sub: `${thisWeekSessions.length} logged`,
    },
    { label: "Total sessions", value: `${sessions.length}`, sub: `${types.training} training` },
    {
      label: "Best wall sit",
      value: wallSit ? `${wallSit}s` : "—",
      tone: "text-trained",
    },
    {
      label: "Iso adherence",
      value: `${iso.pct}%`,
      sub: `${iso.done}/${iso.total} days`,
      tone: iso.pct >= 70 ? "text-trained" : iso.pct >= 40 ? "text-knee" : "text-missed",
    },
    {
      label: "Avg elbow pain",
      value: elbow != null ? `${elbow}` : "—",
      sub: "last 7",
      tone: elbow != null && elbow > 4 ? "text-missed" : "text-elbow",
    },
    {
      label: "Avg knee pain",
      value: knee != null ? `${knee}` : "—",
      sub: "last 7",
      tone: knee != null && knee > 4 ? "text-missed" : "text-knee",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {tiles.map((t) => (
        <div key={t.label} className="rounded-xl border border-border bg-surface p-3">
          <p className="text-[10px] uppercase tracking-wide text-muted">{t.label}</p>
          <p className={`text-lg font-bold ${t.tone ?? "text-white"}`}>{t.value}</p>
          {t.sub && <p className="text-[10px] text-muted">{t.sub}</p>}
        </div>
      ))}
    </div>
  );
}

// Chart 1
function WeightChart() {
  const { metrics } = useStore();
  const asc = metricsSortedAsc(metrics);
  const series: LineSeries[] = [
    { label: "Weight", color: "#22c55e", points: asc.map((m) => ({ date: m.date, y: m.weightKg })) },
  ];
  const latest = latestMetric(metrics);
  const target = latest
    ? {
        y: Math.round((latest.weightKg - 7.5) * 10) / 10,
        color: "#818cf8",
        label: `Target ${Math.round((latest.weightKg - 7.5) * 10) / 10}kg`,
      }
    : undefined;

  return (
    <Card>
      <CardTitle>Body weight (kg)</CardTitle>
      <TimeLineChart series={series} showTrend target={target} yUnit="kg" height={240} />
    </Card>
  );
}

// Chart 2 — muscle mass
function MuscleMassChart() {
  const { metrics } = useStore();
  const asc = metricsSortedAsc(metrics).filter((m) => m.muscleMassKg != null);
  const series: LineSeries[] = [
    { label: "Muscle", color: "#22c55e", points: asc.map((m) => ({ date: m.date, y: m.muscleMassKg as number })) },
  ];
  return (
    <Card>
      <CardTitle>Muscle mass (kg)</CardTitle>
      <TimeLineChart series={series} showTrend yUnit="kg" height={220} />
    </Card>
  );
}

// Chart 2b — body fat %
function BodyFatChart() {
  const { metrics } = useStore();
  const asc = metricsSortedAsc(metrics).filter((m) => m.bodyFatPercent != null);
  const series: LineSeries[] = [
    { label: "Body fat", color: "#f59e0b", points: asc.map((m) => ({ date: m.date, y: m.bodyFatPercent as number })) },
  ];
  return (
    <Card>
      <CardTitle>Body fat (%)</CardTitle>
      <TimeLineChart series={series} showTrend yUnit="%" height={220} />
    </Card>
  );
}

// Chart 3
function PainChart() {
  const { sessions } = useStore();
  const asc = sessionsSortedAsc(sessions);
  const series: LineSeries[] = [
    { label: "Elbow", color: "#ef4444", points: asc.map((s) => ({ date: s.date, y: s.painScores.elbow })) },
    { label: "Knee", color: "#f59e0b", points: asc.map((s) => ({ date: s.date, y: s.painScores.knee })) },
  ];
  return (
    <Card>
      <CardTitle>Pain scores (0–10)</CardTitle>
      <TimeLineChart
        series={series}
        threshold={{ y: 4, color: "#94a3b8", label: "threshold" }}
        height={240}
      />
    </Card>
  );
}

// Chart 4
function ExerciseChart() {
  const { sessions } = useStore();
  const names = loggedExerciseNames(sessions);
  const [selected, setSelected] = useState<string>(names[0] ?? "");

  const { points, unit } = selected
    ? exerciseProgressSeries(sessions, selected)
    : { points: [], unit: "kg" };
  const series: LineSeries[] = [{ label: selected, color: "#6366f1", points }];

  // Plateau: trailing run of an identical best value spanning ≥ 21 days.
  const plateauFrom = useMemo(() => {
    if (points.length < 2) return null;
    const last = points[points.length - 1];
    let startIdx = points.length - 1;
    while (startIdx > 0 && points[startIdx - 1].y === last.y) startIdx--;
    const start = points[startIdx];
    if (daysBetween(start.date, last.date) >= 21) return start.date;
    return null;
  }, [points]);

  const metricLabel =
    unit === "kg" ? "heaviest set" : unit === "reps" ? "most reps" : unit === "min" ? "longest (min)" : "longest hold (s)";

  return (
    <Card>
      <CardTitle>Per-exercise progress</CardTitle>
      {names.length === 0 ? (
        <p className="text-sm text-muted">Log some exercises to see progress.</p>
      ) : (
        <>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className={`${inputClass} mb-2`}
          >
            {names.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <p className="mb-2 text-xs text-muted">Tracking: {metricLabel}</p>
          <TimeLineChart series={series} plateauFrom={plateauFrom} yUnit={unit} height={220} />
        </>
      )}
    </Card>
  );
}

// Chart 5
function VolumeChart() {
  const { sessions } = useStore();
  const bars: Bar[] = sessionsSortedAsc(sessions)
    .filter((s) => s.type === "training")
    .map((s) => ({ label: formatShort(s.date), value: Math.round(sessionTonnage(s)) }))
    .filter((b) => b.value > 0);
  return (
    <Card>
      <CardTitle>Volume per session (tonnage)</CardTitle>
      <BarChart bars={bars} yUnit="kg lifted" height={240} />
    </Card>
  );
}

// Chart 6 (new) — tonnage per week, last 8 weeks
function WeeklyTonnageChart() {
  const { sessions } = useStore();
  const bars: Bar[] = weeklyTonnageSeries(sessions, 8).map((w) => ({
    label: formatShort(w.weekStart),
    value: w.tonnage,
  }));
  return (
    <Card>
      <CardTitle>Weekly tonnage (last 8 weeks)</CardTitle>
      <BarChart bars={bars} color="#22c55e" yUnit="kg lifted" height={220} />
    </Card>
  );
}

// Training sessions per week (last 8 weeks)
function SessionsPerWeekChart() {
  const { sessions } = useStore();
  const bars: Bar[] = weeklySessionCounts(sessions, 8).map((w) => ({
    label: formatShort(w.weekStart),
    value: w.count,
  }));
  return (
    <Card>
      <CardTitle>Training sessions / week</CardTitle>
      <BarChart bars={bars} color="#6366f1" yUnit="sessions" height={220} />
    </Card>
  );
}

// Chart 7
function MuscleSplitChart() {
  const { sessions } = useStore();
  const thisWeek = startOfWeek(todayISO());
  const lastWeek = addDays(thisWeek, -7);
  const tw = groupVolumeForWeek(sessions, thisWeek);
  const lw = groupVolumeForWeek(sessions, lastWeek);
  const pullBelow = tw.push > 0 && tw.pull < tw.push;

  const rows = [
    { group: "Push", thisWeek: tw.push, lastWeek: lw.push },
    { group: "Pull", thisWeek: tw.pull, lastWeek: lw.pull, highlightThis: pullBelow },
    { group: "Legs", thisWeek: tw.legs, lastWeek: lw.legs },
    { group: "Core", thisWeek: tw.core, lastWeek: lw.core },
  ];
  const range = (s: string) => `${formatShort(s)}–${formatShort(addDays(s, 6))}`;

  return (
    <Card>
      <CardTitle>Weekly volume by muscle group</CardTitle>
      <GroupedBars
        rows={rows}
        thisLabel={`This week (${range(thisWeek)})`}
        lastLabel={`Last week (${range(lastWeek)})`}
      />
      {pullBelow && (
        <p className="mt-2 text-xs font-medium text-knee">
          Pull below push this week — add rows / face pulls.
        </p>
      )}
    </Card>
  );
}

// Chart 8
function IsoCalendar() {
  const { sessions } = useStore();
  const cells = useMemo<HeatCell[]>(() => {
    const today = todayISO();
    const start = addDays(today, -59);
    const out: HeatCell[] = [];
    const firstDow = (parseISO(start).getDay() + 6) % 7;
    for (let i = 0; i < firstDow; i++) out.push({ date: `blank-${i}`, status: "none" });
    for (let i = 0; i < 60; i++) {
      const date = addDays(start, i);
      const s = sessions.find((x) => x.date === date);
      let status: HeatCell["status"] = "missed";
      if (s?.isoCompleted) status = "iso";
      else if (s?.type === "rest") status = "rest";
      out.push({ date, status });
    }
    return out;
  }, [sessions]);

  return (
    <Card>
      <CardTitle>ISO streak (last 60 days)</CardTitle>
      <CalendarHeatmap cells={cells} />
    </Card>
  );
}
