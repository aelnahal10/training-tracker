"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useStore } from "@/components/StoreProvider";
import { Card, CardTitle, Button } from "@/components/ui";
import { Sparkline } from "@/components/charts";
import {
  currentPhase,
  phaseProgress,
  sessionForDate,
  lastNDays,
  latestMetric,
  weeklyWeightChange,
  recentMetrics,
  painTrend,
  computeBmi,
  type DayStatus,
} from "@/lib/analytics";
import {
  computeAlerts,
  elbowPainRising,
  kneePainElevated,
} from "@/lib/alerts";
import {
  scheduleForDate,
  isoForDate,
  isoItemLabel,
  isoExerciseNames,
} from "@/lib/schedule";
import { getExerciseOrDefault } from "@/lib/exercises";
import { formatLong, todayISO, dayInitial, parseISO, daysBetween, weekdayName } from "@/lib/date";
import { uid } from "@/lib/id";
import type { PresetExercise, Session } from "@/lib/types";

export default function DashboardPage() {
  const store = useStore();

  if (!store.ready) return <Skeleton />;

  return (
    <div>
      <header className="mb-4">
        <p className="text-sm font-medium text-accent">{weekdayName(todayISO())}</p>
        <p className="text-xs text-muted">{formatLong(todayISO())}</p>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
      </header>

      <div className="md:grid md:grid-cols-2 md:items-start md:gap-6">
        <div className="space-y-4">
          <PhaseCard />
          <TodayCard />
          <WeekStripCard />
        </div>
        <div className="mt-4 space-y-4 md:mt-0">
          <BodyWeightCard />
          <PainCard />
          <CheckInPromptCard />
          <AlertsCard />
        </div>
      </div>
    </div>
  );
}

// Earliest phase = Phase 1. Used for the "Phase 1 complete" placeholder.
function phaseOne(phases: { startDate: string; endDate: string }[]) {
  return [...phases].sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
}

// "Name · 17.5 kg/side · 3×10" / "Zone 2 Cardio · 15 min" / "Romanian Deadlift · 3×10"
function exerciseLine(ex: PresetExercise): string {
  if (ex.inputType === "duration_min" && ex.defaultDurationSeconds != null)
    return `${ex.name} · ${Math.round(ex.defaultDurationSeconds / 60)} min`;
  if (ex.inputType === "duration" && ex.defaultDurationSeconds != null) {
    const setsPart = ex.sets ? `${ex.sets}×` : "";
    return `${ex.name} · ${setsPart}${ex.defaultDurationSeconds}s`;
  }
  const scheme = ex.reps ? ` · ${ex.sets ?? 3}×${ex.reps}` : "";
  if (ex.inputType === "weight_reps" && ex.defaultWeight != null)
    return `${ex.name} · ${ex.defaultWeight} ${ex.unit ?? "kg"}${scheme}`;
  return `${ex.name}${scheme}`;
}

// ---- Card 1: Phase status ----
function PhaseCard() {
  const { phases } = useStore();
  const phase = currentPhase(phases);
  if (!phase)
    return (
      <Card>
        <CardTitle>Phase</CardTitle>
        <p className="text-sm text-muted">
          No phases yet.{" "}
          <Link href="/phases" className="text-accent underline">
            Create one
          </Link>
          .
        </p>
      </Card>
    );

  const prog = phaseProgress(phase);
  return (
    <Card>
      <CardTitle>Current Phase</CardTitle>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-lg font-bold text-white">{phase.name}</span>
        {prog.complete && (
          <span className="text-xs font-semibold text-trained">Phase Complete</span>
        )}
      </div>
      <p className="mb-3 text-xs text-muted">
        {formatLong(phase.startDate)} → {formatLong(phase.endDate)}
      </p>
      <div className="mb-1.5 h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${prog.percent}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted">
        <span>{prog.elapsed} days elapsed</span>
        <span>{prog.complete ? "0" : prog.remaining} days remaining</span>
      </div>
    </Card>
  );
}

// ---- Card 2: Today's status ----
function TodayCard() {
  const store = useStore();
  const today = todayISO();
  const session = sessionForDate(store.sessions, today);
  const phase = currentPhase(store.phases);

  // Iso completion reflects the full day-specific iso list, not a generic flag.
  const isoNames = isoExerciseNames(today);
  const loggedNames = new Set((session?.exercises ?? []).map((e) => e.name));
  const isoLoggedCount = isoNames.filter((n) => loggedNames.has(n)).length;
  const isoFullyLogged = isoNames.length > 0 && isoLoggedCount === isoNames.length;
  const isoDone = (session?.isoCompleted ?? false) || isoFullyLogged;

  const toggleIso = (value: boolean) => {
    if (session) {
      store.upsertSession({ ...session, isoCompleted: value });
    } else {
      const fresh: Session = {
        id: uid("session"),
        date: today,
        phaseId: phase?.id ?? "",
        type: "iso_only",
        isoCompleted: value,
        painScores: { elbow: 0, knee: 0 },
        exercises: [],
        notes: "",
      };
      store.upsertSession(fresh);
    }
  };

  return (
    <Card>
      <CardTitle>Today</CardTitle>

      <div className="mb-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-white">Isos done today?</span>
          <div className="flex overflow-hidden rounded-xl border border-border">
            <button
              onClick={() => toggleIso(true)}
              className={`px-4 py-1.5 text-sm font-semibold ${
                isoDone ? "bg-trained text-black" : "text-muted"
              }`}
            >
              Yes
            </button>
            <button
              onClick={() => toggleIso(false)}
              className={`px-4 py-1.5 text-sm font-semibold ${
                session && !isoDone ? "bg-missed text-white" : "text-muted"
              }`}
            >
              No
            </button>
          </div>
        </div>
        <p className="mt-1 text-xs text-muted">
          {isoLoggedCount}/{isoNames.length} of today&apos;s iso exercises logged
          {isoFullyLogged && " ✓"}
        </p>
      </div>

      {session && (session.exercises.length > 0 || session.type === "rest") ? (
        <LoggedSummary session={session} today={today} />
      ) : (
        <ScheduleView store={store} today={today} />
      )}
    </Card>
  );
}

function LoggedSummary({ session, today }: { session: Session; today: string }) {
  return (
    <>
      <div className="mb-3 rounded-xl bg-surface-2 p-3 text-sm">
        <div className="flex justify-between">
          <span className="text-muted">Logged today</span>
          <span className="font-semibold capitalize text-white">
            {session.type.replace("_", " ")}
          </span>
        </div>
        <div className="mt-1 flex justify-between text-xs text-muted">
          <span>{session.exercises.length} exercises</span>
          <span>
            Pain E:{session.painScores.elbow} K:{session.painScores.knee}
          </span>
        </div>
      </div>
      <Link href={`/log?date=${today}`} className="block">
        <Button className="w-full">Edit today&apos;s session</Button>
      </Link>
    </>
  );
}

// Today's scheduled workout (Phase 1) or a placeholder once Phase 1 is over.
function ScheduleView({
  store,
  today,
}: {
  store: ReturnType<typeof useStore>;
  today: string;
}) {
  const p1 = phaseOne(store.phases);
  const pastPhase1 = p1 ? today > p1.endDate : false;

  if (pastPhase1) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface-2 p-4 text-center">
        <p className="text-sm font-bold text-white">PHASE 1 COMPLETE</p>
        <p className="mt-1 text-xs text-muted">Phase 2 schedule coming soon.</p>
        <p className="mb-3 text-xs text-muted">Log a custom session manually in the meantime.</p>
        <Link href={`/log?date=${today}`} className="block">
          <Button className="w-full">Log custom session</Button>
        </Link>
      </div>
    );
  }

  const sched = scheduleForDate(today);
  const iso = isoForDate(today);
  const isTraining = sched.kind === "training";

  return (
    <>
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-accent">
        Today — {isTraining ? sched.title : iso.label}
      </p>

      {/* Iso block always shown first (label only repeated on training days) */}
      {isTraining && (
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-iso">
          {iso.label}
        </p>
      )}
      <ul className="mb-2 space-y-1 text-sm text-white">
        {iso.items.map((i) => (
          <li key={i.name} className="flex gap-2">
            <span className="text-muted">•</span>
            {isoItemLabel(i)}
          </li>
        ))}
      </ul>

      {isTraining && (
        <>
          <div className="my-2 h-px bg-border" />
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-trained">
            {sched.title.replace(" + ISO", "")}
          </p>
          <ul className="mb-3 space-y-1 text-sm text-white">
            {sched.exercises.map((name) => (
              <li key={name} className="flex gap-2">
                <span className="text-muted">•</span>
                {exerciseLine(store.getEx(name))}
              </li>
            ))}
          </ul>
        </>
      )}

      <Link href={`/log?prefill=1&date=${today}`} className="block">
        <Button className="w-full">Log today&apos;s session</Button>
      </Link>
    </>
  );
}

// ---- Card 3: Last 7 days strip ----
const STATUS_BG: Record<DayStatus, string> = {
  trained: "bg-trained text-black",
  iso: "bg-iso text-white",
  rest: "bg-rest text-white",
  missed: "bg-missed/80 text-white",
};

function WeekStripCard() {
  const { sessions } = useStore();
  const tiles = lastNDays(sessions, 7);
  return (
    <Card>
      <CardTitle>Last 7 days</CardTitle>
      <div className="flex justify-between gap-1.5">
        {tiles.map((t) => (
          <Link
            key={t.date}
            href={`/log?date=${t.date}`}
            className={`flex flex-1 flex-col items-center rounded-xl py-2 ${STATUS_BG[t.status]}`}
          >
            <span className="text-[11px] font-bold">{dayInitial(t.date)}</span>
            <span className="text-[10px] opacity-80">{parseISO(t.date).getDate()}</span>
          </Link>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted">
        <Dot c="bg-trained" l="Trained" />
        <Dot c="bg-iso" l="Iso only" />
        <Dot c="bg-rest" l="Rest" />
        <Dot c="bg-missed/80" l="Missed" />
      </div>
    </Card>
  );
}

function Dot({ c, l }: { c: string; l: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${c}`} />
      {l}
    </span>
  );
}

// ---- Card 4: Body weight ----
function BodyWeightCard() {
  const { metrics, profile } = useStore();
  const latest = latestMetric(metrics);
  const change = weeklyWeightChange(metrics);
  const spark = recentMetrics(metrics, 14).map((m) => m.weightKg);
  const bmi = latest && profile.heightCm ? computeBmi(latest.weightKg, profile.heightCm) : null;

  return (
    <Card>
      <CardTitle>Body weight</CardTitle>
      {latest ? (
        <div className="flex items-end justify-between">
          <div>
            <div className="text-3xl font-bold text-white">
              {latest.weightKg}
              <span className="ml-1 text-base font-medium text-muted">kg</span>
            </div>
            {change != null && (
              <div
                className={`text-sm font-semibold ${
                  change > 0 ? "text-missed" : change < 0 ? "text-trained" : "text-muted"
                }`}
              >
                {change > 0 ? "+" : ""}
                {change} kg vs last week
              </div>
            )}
            {bmi && (
              <div className="mt-1 text-xs text-muted">
                BMI <span className="font-semibold text-white">{bmi.bmi}</span> · {bmi.category}
              </div>
            )}
          </div>
          <Sparkline values={spark} />
        </div>
      ) : (
        <p className="text-sm text-muted">No weight logged yet.</p>
      )}
      <Link href="/metrics" className="mt-3 block">
        <Button variant="secondary" className="w-full">
          Log weight
        </Button>
      </Link>
    </Card>
  );
}

// ---- Card 5: Pain trend ----
function Arrow({ dir }: { dir: "up" | "down" | "stable" }) {
  if (dir === "up") return <span className="text-missed">▲</span>;
  if (dir === "down") return <span className="text-trained">▼</span>;
  return <span className="text-muted">▬</span>;
}

function PainCard() {
  const { sessions } = useStore();
  const elbow = painTrend(sessions, "elbow");
  const knee = painTrend(sessions, "knee");
  const elbowAlert = elbowPainRising(sessions);
  const kneeAlert = kneePainElevated(sessions);

  const accent = elbowAlert ? "red" : kneeAlert ? "yellow" : "none";

  return (
    <Card accent={accent}>
      <CardTitle>Pain trend (7 days)</CardTitle>
      <PainRow
        label="Elbow"
        color="text-elbow"
        current={elbow.current}
        dir={elbow.direction}
      />
      <div className="my-2 h-px bg-border" />
      <PainRow
        label="Knee"
        color="text-knee"
        current={knee.current}
        dir={knee.direction}
      />
      {elbowAlert && (
        <p className="mt-3 rounded-lg bg-missed/15 px-3 py-2 text-xs font-medium text-missed">
          Elbow pain rising — consider reducing load.
        </p>
      )}
      {!elbowAlert && kneeAlert && (
        <p className="mt-3 rounded-lg bg-knee/15 px-3 py-2 text-xs font-medium text-knee">
          Knee pain elevated (&gt;4 for 3 sessions) — monitor closely.
        </p>
      )}
    </Card>
  );
}

function PainRow({
  label,
  color,
  current,
  dir,
}: {
  label: string;
  color: string;
  current: number | null;
  dir: "up" | "down" | "stable";
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={`font-semibold ${color}`}>{label}</span>
      <div className="flex items-center gap-3">
        <span className="text-lg font-bold text-white">
          {current ?? "—"}
          {current != null && <span className="text-xs text-muted">/10</span>}
        </span>
        <Arrow dir={dir} />
      </div>
    </div>
  );
}

// ---- Card 6: Weekly check-in prompt ----
function CheckInPromptCard() {
  const { checkins } = useStore();
  const last = useMemo(
    () => [...checkins].sort((a, b) => b.weekStartDate.localeCompare(a.weekStartDate))[0],
    [checkins]
  );
  const due = !last || daysBetween(last.weekStartDate, todayISO()) >= 7;
  if (!due) return null;

  return (
    <Card accent="yellow">
      <CardTitle>Weekly check-in</CardTitle>
      <p className="mb-3 text-sm text-white">Time for your weekly check-in.</p>
      <Link href="/checkin" className="block">
        <Button className="w-full">Do check-in</Button>
      </Link>
    </Card>
  );
}

// ---- Card 7: Alerts ----
function AlertsCard() {
  const store = useStore();
  const alerts = useMemo(
    () =>
      computeAlerts({
        phases: store.phases,
        sessions: store.sessions,
        metrics: store.metrics,
        checkins: store.checkins,
        exercises: store.exercises,
        profile: store.profile,
      }),
    [store.phases, store.sessions, store.metrics, store.checkins, store.exercises, store.profile]
  );
  if (alerts.length === 0) return null;

  return (
    <Card>
      <CardTitle>Alerts</CardTitle>
      <div className="space-y-2">
        {alerts.map((a) => (
          <div
            key={a.id}
            className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${
              a.level === "red"
                ? "bg-missed/15 text-missed"
                : a.level === "yellow"
                ? "bg-knee/15 text-knee"
                : "bg-iso/15 text-iso"
            }`}
          >
            <span>⚠</span>
            <span className="font-medium">{a.message}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Skeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-32 animate-pulse rounded-2xl bg-surface" />
      ))}
    </div>
  );
}
