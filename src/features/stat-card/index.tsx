/**
 * Reusable StatCard widget.
 *
 * Extracts the duplicate inline `Stat` function present in both
 * `admin.dashboard.tsx` and `center.dashboard.tsx` into a single
 * shared component. Neither of those routes is modified — they
 * continue to use their own local Stat until a future cleanup pass.
 *
 * Usage:
 *   <StatCard icon={Calendar} label="Total bookings" value="142" />
 *   <StatCard icon={DollarSign} label="Revenue" value="$4 200" trend={{ label: "+12% this month", positive: true }} />
 */

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// ── types ─────────────────────────────────────────────────────────────────

export interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  /** Extra Tailwind classes applied to the icon container (e.g. colour accents). */
  accent?: string;
  /** Optional secondary line shown below the value. */
  trend?: {
    label: string;
    /** true → emerald, false → red, undefined → muted */
    positive?: boolean;
  };
  className?: string;
}

// ── component ─────────────────────────────────────────────────────────────

export function StatCard({
  icon: Icon,
  label,
  value,
  accent,
  trend,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card p-5 shadow-soft",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary",
            accent,
          )}
        >
          <Icon className="h-5 w-5" />
        </span>

        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-muted-foreground truncate">
            {label}
          </p>
          <p className="text-display text-2xl mt-0.5">{value}</p>

          {trend && (
            <p
              className={cn(
                "text-xs mt-0.5 font-medium",
                trend.positive === true
                  ? "text-emerald-600 dark:text-emerald-400"
                  : trend.positive === false
                  ? "text-red-500"
                  : "text-muted-foreground",
              )}
            >
              {trend.label}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── grid wrapper ──────────────────────────────────────────────────────────

/**
 * Responsive 2-col → 4-col grid for a row of StatCards.
 * Matches the grid currently used in admin.dashboard and center.dashboard.
 */
export function StatCardGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-4", className)}>
      {children}
    </div>
  );
}
