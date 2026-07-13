"use client";

import { parseISO, formatShort } from "@/lib/date";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const AXIS = "#2a3444";
const GRID = "#1c2431";
const TEXT = "#8b95a5";

function niceBounds(min: number, max: number): [number, number] {
  if (min === max) {
    const pad = Math.abs(min) * 0.1 || 1;
    return [min - pad, max + pad];
  }
  const pad = (max - min) * 0.1;
  return [min - pad, max + pad];
}

// Simple least-squares regression over (x, y) pairs.
function regression(pts: { x: number; y: number }[]) {
  const n = pts.length;
  if (n < 2) return null;
  const sx = pts.reduce((s, p) => s + p.x, 0);
  const sy = pts.reduce((s, p) => s + p.y, 0);
  const sxx = pts.reduce((s, p) => s + p.x * p.x, 0);
  const sxy = pts.reduce((s, p) => s + p.x * p.y, 0);
  const denom = n * sxx - sx * sx;
  if (denom === 0) return null;
  const slope = (n * sxy - sx * sy) / denom;
  const intercept = (sy - slope * sx) / n;
  return { slope, intercept };
}

export interface LinePoint {
  date: string; // ISO
  y: number;
}

export interface LineSeries {
  label: string;
  color: string;
  points: LinePoint[];
  dashed?: boolean;
}

interface TimeLineChartProps {
  series: LineSeries[];
  height?: number;
  yUnit?: string;
  threshold?: { y: number; color: string; label: string };
  target?: { y: number; color: string; label: string };
  showTrend?: boolean; // trend line for the first series
  plateauFrom?: string | null; // ISO date to mark a "Plateau" label on series[0]
}

// A responsive-ish time line chart. Width grows with the number of points and
// the parent scrolls horizontally when needed.
export function TimeLineChart({
  series,
  height = 190,
  yUnit,
  threshold,
  target,
  showTrend,
  plateauFrom,
}: TimeLineChartProps) {
  const all = series.flatMap((s) => s.points);
  if (all.length === 0) {
    return <Empty label="No data yet" height={height} />;
  }

  const padL = 40;
  const padR = 16;
  const padT = 16;
  const padB = 28;

  const maxLen = Math.max(...series.map((s) => s.points.length));
  const innerW = Math.max(260, (maxLen - 1) * 52 + 20);
  const width = innerW + padL + padR;

  const times = all.map((p) => parseISO(p.date).getTime());
  const tMin = Math.min(...times);
  const tMax = Math.max(...times);

  const yValsExtra: number[] = [];
  if (threshold) yValsExtra.push(threshold.y);
  if (target) yValsExtra.push(target.y);
  const yVals = [...all.map((p) => p.y), ...yValsExtra];
  const [yLo, yHi] = niceBounds(Math.min(...yVals), Math.max(...yVals));

  const xOf = (iso: string) => {
    const t = parseISO(iso).getTime();
    if (tMax === tMin) return padL + innerW / 2;
    return padL + ((t - tMin) / (tMax - tMin)) * innerW;
  };
  const yOf = (v: number) =>
    padT + (1 - (v - yLo) / (yHi - yLo)) * (height - padT - padB);

  const yTicks = 4;
  const gridLines = Array.from({ length: yTicks + 1 }, (_, i) => {
    const v = yLo + ((yHi - yLo) * i) / yTicks;
    return { v, y: yOf(v) };
  });

  // X tick labels — show up to 5 evenly spaced dates from the longest series.
  const base = series.reduce((a, b) =>
    b.points.length > a.points.length ? b : a
  );
  const xTickIdx = pickTicks(base.points.length, 5);

  const trend =
    showTrend && series[0]
      ? regression(
          series[0].points.map((p) => ({
            x: parseISO(p.date).getTime(),
            y: p.y,
          }))
        )
      : null;

  return (
    <div className="overflow-x-auto">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="block"
        role="img"
      >
        {/* horizontal grid + y labels */}
        {gridLines.map((g, i) => (
          <g key={i}>
            <line x1={padL} y1={g.y} x2={width - padR} y2={g.y} stroke={GRID} />
            <text x={padL - 6} y={g.y + 3} textAnchor="end" fontSize="9" fill={TEXT}>
              {g.v.toFixed(gridDecimals(yLo, yHi))}
            </text>
          </g>
        ))}

        {/* axes */}
        <line x1={padL} y1={padT} x2={padL} y2={height - padB} stroke={AXIS} />
        <line
          x1={padL}
          y1={height - padB}
          x2={width - padR}
          y2={height - padB}
          stroke={AXIS}
        />

        {/* threshold line */}
        {threshold && (
          <g>
            <line
              x1={padL}
              y1={yOf(threshold.y)}
              x2={width - padR}
              y2={yOf(threshold.y)}
              stroke={threshold.color}
              strokeDasharray="4 4"
              opacity={0.8}
            />
            <text
              x={width - padR}
              y={yOf(threshold.y) - 4}
              textAnchor="end"
              fontSize="9"
              fill={threshold.color}
            >
              {threshold.label}
            </text>
          </g>
        )}

        {/* target line */}
        {target && (
          <g>
            <line
              x1={padL}
              y1={yOf(target.y)}
              x2={width - padR}
              y2={yOf(target.y)}
              stroke={target.color}
              strokeDasharray="2 3"
              opacity={0.9}
            />
            <text
              x={padL + 4}
              y={yOf(target.y) - 4}
              fontSize="9"
              fill={target.color}
            >
              {target.label}
            </text>
          </g>
        )}

        {/* trend line */}
        {trend && (
          <line
            x1={xOf(series[0].points[0].date)}
            y1={yOf(
              trend.slope * parseISO(series[0].points[0].date).getTime() +
                trend.intercept
            )}
            x2={xOf(series[0].points[series[0].points.length - 1].date)}
            y2={yOf(
              trend.slope *
                parseISO(
                  series[0].points[series[0].points.length - 1].date
                ).getTime() +
                trend.intercept
            )}
            stroke="#94a3b8"
            strokeDasharray="5 4"
            strokeWidth={1.5}
            opacity={0.7}
          />
        )}

        {/* series */}
        {series.map((s) => (
          <g key={s.label}>
            {s.points.length > 1 && (
              <polyline
                fill="none"
                stroke={s.color}
                strokeWidth={2}
                strokeDasharray={s.dashed ? "5 4" : undefined}
                points={s.points.map((p) => `${xOf(p.date)},${yOf(p.y)}`).join(" ")}
              />
            )}
            {s.points.map((p, i) => (
              <circle key={i} cx={xOf(p.date)} cy={yOf(p.y)} r={2.5} fill={s.color} />
            ))}
          </g>
        ))}

        {/* plateau marker on series[0] */}
        {plateauFrom && series[0]?.points.some((p) => p.date === plateauFrom) && (
          <PlateauLabel
            x={xOf(plateauFrom)}
            y={yOf(series[0].points.find((p) => p.date === plateauFrom)!.y)}
          />
        )}

        {/* x labels */}
        {xTickIdx.map((idx) => {
          const p = base.points[idx];
          return (
            <text
              key={idx}
              x={xOf(p.date)}
              y={height - padB + 14}
              textAnchor="middle"
              fontSize="9"
              fill={TEXT}
            >
              {formatShort(p.date)}
            </text>
          );
        })}
      </svg>

      {/* legend */}
      {series.length > 1 && (
        <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted">
          {series.map((s) => (
            <span key={s.label} className="flex items-center gap-1">
              <span
                className="inline-block h-2 w-3 rounded"
                style={{ backgroundColor: s.color }}
              />
              {s.label}
            </span>
          ))}
          {yUnit && <span className="opacity-60">({yUnit})</span>}
        </div>
      )}
    </div>
  );
}

function PlateauLabel({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x - 26} y={y - 26} width={52} height={15} rx={3} fill="#f59e0b" />
      <text x={x} y={y - 15} textAnchor="middle" fontSize="9" fill="#0b0f17" fontWeight={700}>
        Plateau
      </text>
    </g>
  );
}

// ---------------------------------------------------------------------------
// Bar chart (vertical) — used for volume per session & wall-sit trend
// ---------------------------------------------------------------------------

export interface Bar {
  label: string;
  value: number;
  color?: string;
}

export function BarChart({
  bars,
  height = 190,
  color = "#6366f1",
  yUnit,
}: {
  bars: Bar[];
  height?: number;
  color?: string;
  yUnit?: string;
}) {
  if (bars.length === 0) return <Empty label="No data yet" height={height} />;

  const padL = 40;
  const padR = 12;
  const padT = 14;
  const padB = 30;
  const bw = 30;
  const gap = 14;
  const innerW = bars.length * (bw + gap) + gap;
  const width = Math.max(260, innerW) + padL + padR;

  const maxV = Math.max(...bars.map((b) => b.value), 1);
  const yOf = (v: number) => padT + (1 - v / maxV) * (height - padT - padB);

  const yTicks = 4;
  const grid = Array.from({ length: yTicks + 1 }, (_, i) => {
    const v = (maxV * i) / yTicks;
    return { v, y: yOf(v) };
  });

  return (
    <div className="overflow-x-auto">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="block">
        {grid.map((g, i) => (
          <g key={i}>
            <line x1={padL} y1={g.y} x2={width - padR} y2={g.y} stroke={GRID} />
            <text x={padL - 6} y={g.y + 3} textAnchor="end" fontSize="9" fill={TEXT}>
              {formatNum(g.v)}
            </text>
          </g>
        ))}
        <line x1={padL} y1={height - padB} x2={width - padR} y2={height - padB} stroke={AXIS} />
        {bars.map((b, i) => {
          const x = padL + gap + i * (bw + gap);
          const y = yOf(b.value);
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={bw}
                height={height - padB - y}
                rx={3}
                fill={b.color ?? color}
              />
              <text
                x={x + bw / 2}
                y={height - padB + 12}
                textAnchor="middle"
                fontSize="8.5"
                fill={TEXT}
              >
                {b.label}
              </text>
            </g>
          );
        })}
      </svg>
      {yUnit && <div className="mt-1 text-xs text-muted opacity-60">({yUnit})</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Grouped bars for muscle-group weekly split (this week vs last week)
// ---------------------------------------------------------------------------

export interface GroupedBarRow {
  group: string;
  thisWeek: number;
  lastWeek: number;
  highlightThis?: boolean;
}

export function GroupedBars({
  rows,
  thisLabel = "This week",
  lastLabel = "Last week",
  height = 240,
}: {
  rows: GroupedBarRow[];
  thisLabel?: string;
  lastLabel?: string;
  height?: number;
}) {
  const totalVol = rows.reduce((s, r) => s + r.thisWeek + r.lastWeek, 0);
  if (totalVol === 0) {
    return <Empty label="No training volume logged in the last two weeks" height={height} />;
  }

  const padL = 46;
  const padR = 12;
  const padT = 22;
  const padB = 30;
  const groupW = 96;
  const bw = 28;
  const width = Math.max(320, rows.length * groupW) + padL + padR;

  const maxV = Math.max(1, ...rows.flatMap((r) => [r.thisWeek, r.lastWeek]));
  const yOf = (v: number) => padT + (1 - v / maxV) * (height - padT - padB);
  const grid = Array.from({ length: 5 }, (_, i) => {
    const v = (maxV * i) / 4;
    return { v, y: yOf(v) };
  });

  return (
    <div className="overflow-x-auto">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="block">
        {grid.map((g, i) => (
          <g key={i}>
            <line x1={padL} y1={g.y} x2={width - padR} y2={g.y} stroke={GRID} />
            <text x={padL - 6} y={g.y + 3} textAnchor="end" fontSize="9" fill={TEXT}>
              {formatNum(g.v)}
            </text>
          </g>
        ))}
        <line x1={padL} y1={height - padB} x2={width - padR} y2={height - padB} stroke={AXIS} />
        {rows.map((r, i) => {
          const cx = padL + i * groupW + groupW / 2;
          const lastX = cx - bw - 2;
          const thisX = cx + 2;
          const thisColor = r.highlightThis ? "#f59e0b" : "#6366f1";
          return (
            <g key={r.group}>
              <rect
                x={lastX}
                y={yOf(r.lastWeek)}
                width={bw}
                height={height - padB - yOf(r.lastWeek)}
                rx={3}
                fill="#3b4657"
              />
              {r.lastWeek > 0 && (
                <text x={lastX + bw / 2} y={yOf(r.lastWeek) - 4} textAnchor="middle" fontSize="8.5" fill={TEXT}>
                  {formatNum(r.lastWeek)}
                </text>
              )}
              <rect
                x={thisX}
                y={yOf(r.thisWeek)}
                width={bw}
                height={height - padB - yOf(r.thisWeek)}
                rx={3}
                fill={thisColor}
              />
              {r.thisWeek > 0 && (
                <text x={thisX + bw / 2} y={yOf(r.thisWeek) - 4} textAnchor="middle" fontSize="8.5" fill={thisColor}>
                  {formatNum(r.thisWeek)}
                </text>
              )}
              <text
                x={cx}
                y={height - padB + 14}
                textAnchor="middle"
                fontSize="10"
                fill={TEXT}
              >
                {r.group}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex gap-3 text-xs text-muted">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-3 rounded" style={{ backgroundColor: "#3b4657" }} />
          {lastLabel}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-3 rounded" style={{ backgroundColor: "#6366f1" }} />
          {thisLabel}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sparkline (dashboard body-weight card)
// ---------------------------------------------------------------------------

export function Sparkline({
  values,
  width = 160,
  height = 44,
  color = "#22c55e",
}: {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
}) {
  if (values.length < 2) {
    return <div className="text-xs text-muted">Not enough data</div>;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const stepX = width / (values.length - 1);
  const pts = values.map((v, i) => {
    const x = i * stepX;
    const y = height - 4 - ((v - min) / span) * (height - 8);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="block">
      <polyline fill="none" stroke={color} strokeWidth={2} points={pts.join(" ")} />
      <circle
        cx={(values.length - 1) * stepX}
        cy={height - 4 - ((values[values.length - 1] - min) / span) * (height - 8)}
        r={2.5}
        fill={color}
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Calendar heatmap (ISO streak, last N days)
// ---------------------------------------------------------------------------

export interface HeatCell {
  date: string;
  status: "iso" | "missed" | "rest" | "none";
}

const HEAT_COLORS: Record<HeatCell["status"], string> = {
  iso: "#22c55e",
  missed: "#ef4444",
  rest: "#6b7280",
  none: "#1c2431",
};

export function CalendarHeatmap({ cells }: { cells: HeatCell[] }) {
  // Lay out as weeks (columns) of 7 days (rows), oldest → newest.
  const cell = 15;
  const gap = 3;
  const cols = Math.ceil(cells.length / 7);
  const width = cols * (cell + gap) + gap;
  const height = 7 * (cell + gap) + gap;

  return (
    <div className="overflow-x-auto">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="block">
        {cells.map((c, i) => {
          const col = Math.floor(i / 7);
          const row = i % 7;
          return (
            <rect
              key={c.date}
              x={gap + col * (cell + gap)}
              y={gap + row * (cell + gap)}
              width={cell}
              height={cell}
              rx={3}
              fill={HEAT_COLORS[c.status]}
            >
              <title>{`${c.date}: ${c.status}`}</title>
            </rect>
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted">
        <Legend color={HEAT_COLORS.iso} label="Iso done" />
        <Legend color={HEAT_COLORS.missed} label="Missed" />
        <Legend color={HEAT_COLORS.rest} label="Rest" />
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className="inline-block h-3 w-3 rounded" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// misc
// ---------------------------------------------------------------------------

function Empty({ label, height }: { label: string; height: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted"
      style={{ height }}
    >
      {label}
    </div>
  );
}

function pickTicks(len: number, max: number): number[] {
  if (len <= max) return Array.from({ length: len }, (_, i) => i);
  const step = (len - 1) / (max - 1);
  return Array.from({ length: max }, (_, i) => Math.round(i * step));
}

function gridDecimals(lo: number, hi: number): number {
  return hi - lo < 5 ? 1 : 0;
}

function formatNum(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return Math.round(v).toString();
}
