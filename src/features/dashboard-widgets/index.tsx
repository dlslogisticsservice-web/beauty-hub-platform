/**
 * Reusable dashboard-layout widgets.
 *
 * These patterns are repeated verbatim across three route files:
 *   - admin.dashboard.tsx   (statusColors, table layout)
 *   - center.dashboard.tsx  (statusColors, table layout)
 *   - dashboard.tsx         (statusColors)
 *
 * None of those routes are modified here — they continue to use their
 * own local copies. These exports are available for all future pages.
 *
 * Exports
 * ───────
 *  STATUS_COLORS       Record<string, string>   shared colour map
 *  StatusBadge         pill badge for booking / message status
 *  DashboardSection    section wrapper (heading + optional "view all" link)
 *  EmptyStateCard      dashed-border empty-state placeholder
 *  TableWrapper        responsive overflow wrapper for <table>
 */

import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// ── status colour map ─────────────────────────────────────────────────────

/**
 * Consistent booking/message status badge colours.
 * Mirrors the `statusColors` Record defined separately in each dashboard.
 */
export const STATUS_COLORS: Record<string, string> = {
  pending:   "bg-yellow-500/15 text-yellow-700 border-yellow-500/30",
  confirmed: "bg-blue-500/15   text-blue-700   border-blue-500/30",
  completed: "bg-green-500/15  text-green-700  border-green-500/30",
  cancelled: "bg-red-500/15    text-red-700    border-red-500/30",
  approved:  "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  rejected:  "bg-red-500/15    text-red-600    border-red-500/30",
};

// ── StatusBadge ───────────────────────────────────────────────────────────

interface StatusBadgeProps {
  status: string;
  label: string;
  className?: string;
}

/** Pill badge for booking / message status. */
export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        STATUS_COLORS[status] ?? "bg-muted text-muted-foreground border-border",
        className,
      )}
    >
      {label}
    </span>
  );
}

// ── DashboardSection ──────────────────────────────────────────────────────

interface DashboardSectionProps {
  title: string;
  description?: string;
  /** TanStack Router path for the trailing "view all" link. */
  viewAllTo?: string;
  viewAllLabel?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Consistent section wrapper used across admin / center / customer dashboards.
 * Renders a display-font heading, optional description, and optional
 * trailing "view all" link.
 */
export function DashboardSection({
  title,
  description,
  viewAllTo,
  viewAllLabel,
  children,
  className,
}: DashboardSectionProps) {
  return (
    <section className={cn("space-y-4", className)}>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-display text-2xl">{title}</h2>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>

        {viewAllTo && viewAllLabel && (
          <Link
            to={viewAllTo as never}
            className="shrink-0 text-sm text-primary hover:underline"
          >
            {viewAllLabel}
          </Link>
        )}
      </div>

      {children}
    </section>
  );
}

// ── EmptyStateCard ────────────────────────────────────────────────────────

interface EmptyStateCardProps {
  message: string;
  action?: ReactNode;
  className?: string;
}

/**
 * Dashed-border empty-state placeholder.
 * Used when a data list comes back empty.
 */
export function EmptyStateCard({ message, action, className }: EmptyStateCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-border bg-card p-12 text-center",
        className,
      )}
    >
      <p className="text-sm text-muted-foreground">{message}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

// ── TableWrapper ──────────────────────────────────────────────────────────

interface TableWrapperProps {
  children: ReactNode;
  className?: string;
}

/**
 * Wraps a `<table>` in a rounded-2xl border card with horizontal scroll
 * on narrow viewports.  Mirrors the layout used in center.services and
 * admin.centers routes.
 */
export function TableWrapper({ children, className }: TableWrapperProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card overflow-hidden shadow-soft",
        className,
      )}
    >
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}
