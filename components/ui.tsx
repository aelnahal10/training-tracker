"use client";

import type { SessionType } from "@/lib/types";

export function Card({
  children,
  className = "",
  accent,
}: {
  children: React.ReactNode;
  className?: string;
  accent?: "red" | "yellow" | "none";
}) {
  const border =
    accent === "red"
      ? "border-missed"
      : accent === "yellow"
      ? "border-knee"
      : "border-border";
  return (
    <section
      className={`rounded-2xl border ${border} bg-surface p-4 shadow-sm ${className}`}
    >
      {children}
    </section>
  );
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
      {children}
    </h2>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="mb-4 flex items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

const TYPE_STYLES: Record<SessionType, { label: string; cls: string }> = {
  training: { label: "Training", cls: "bg-trained/20 text-trained" },
  iso_only: { label: "Iso Only", cls: "bg-iso/20 text-iso" },
  rest: { label: "Rest", cls: "bg-rest/25 text-gray-300" },
};

export function TypeBadge({ type }: { type: SessionType }) {
  const s = TYPE_STYLES[type];
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.cls}`}>
      {s.label}
    </span>
  );
}

export function Button({
  children,
  onClick,
  type = "button",
  variant = "primary",
  className = "",
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "primary" | "secondary" | "danger" | "ghost";
  className?: string;
  disabled?: boolean;
}) {
  const styles: Record<string, string> = {
    primary: "bg-accent text-white hover:bg-accent/90",
    secondary: "bg-surface-2 text-white hover:bg-surface-2/70 border border-border",
    danger: "bg-missed/90 text-white hover:bg-missed",
    ghost: "text-muted hover:text-white",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:opacity-40 ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm text-white outline-none focus:border-accent";

// A labelled 0–N slider that shows its live numeric value.
export function Slider({
  label,
  value,
  onChange,
  max = 10,
  color = "#6366f1",
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  max?: number;
  color?: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm font-medium text-white">{label}</span>
        <span
          className="rounded-lg px-2 py-0.5 text-sm font-bold"
          style={{ backgroundColor: `${color}22`, color }}
        >
          {value}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-accent"
        style={{ accentColor: color }}
      />
    </div>
  );
}

// Full-screen modal used for the Phase-2 lock warning.
export function Modal({
  title,
  children,
  onClose,
  footer,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  footer: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-border bg-surface p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-2 text-lg font-bold text-white">{title}</h3>
        <div className="mb-5 text-sm text-muted">{children}</div>
        <div className="flex justify-end gap-2">{footer}</div>
      </div>
    </div>
  );
}
