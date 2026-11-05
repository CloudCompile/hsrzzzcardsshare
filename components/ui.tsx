import type { ReactNode } from "react";
import type { StatRow } from "@/lib/types";

export function Stars({ count, className = "" }: { count: number; className?: string }) {
  return (
    <span
      className={`font-mono text-[9px] leading-none tracking-[0.2em] ${className}`}
      aria-label={`${count} star`}
    >
      {"★".repeat(Math.max(0, Math.min(5, count)))}
    </span>
  );
}

export function Chip({
  children,
  color,
  className = "",
}: {
  children: ReactNode;
  color?: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[10px] font-medium tracking-wide ${className}`}
      style={
        color
          ? {
              color,
              backgroundColor: `${color}1a`,
              boxShadow: `inset 0 0 0 1px ${color}33`,
            }
          : undefined
      }
    >
      {children}
    </span>
  );
}

export function StatGrid({
  rows,
  columns = 2,
  className = "",
}: {
  rows: StatRow[];
  columns?: 2 | 3 | 4;
  className?: string;
}) {
  const cols = { 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-2 sm:grid-cols-4" }[columns];
  return (
    <dl className={`grid ${cols} gap-1.5 ${className}`}>
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex items-baseline justify-between gap-2 rounded-md border border-white/[0.04] bg-white/[0.028] px-2 py-1.5"
          title={row.hint}
        >
          <dt className="truncate text-[10px] uppercase tracking-[0.1em] text-faint">{row.label}</dt>
          <dd className="shrink-0 text-right">
            <div className="num text-[12.5px] font-medium text-white/90">{row.value}</div>
            {row.detail ? <div className="num text-[9.5px] text-white/30">{row.detail}</div> : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="label mb-2">{children}</p>;
}
