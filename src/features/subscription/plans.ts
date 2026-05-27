/**
 * Phase 3A — Plan catalog and pure utility functions.
 *
 * PLAN_CATALOG is the client-side fallback that mirrors the
 * `subscription_plans` Supabase table.  It is used when:
 *   - The DB response is still loading
 *   - You need pure, synchronous plan data (e.g. in center.services.tsx)
 *   - Server-side logic that can't fetch from DB
 *
 * All monetary values live only in the DB — this module has NO prices.
 *
 * Convention: -1 means "unlimited" for all numeric limit fields.
 */

import type { PlanId, PlanLimits, PlanRow, SubscriptionState } from "./types";

// ── Plan catalog ──────────────────────────────────────────────────────────

/**
 * Client-side fallback for plan limits.
 * Values mirror the `subscription_plans` DB table defaults.
 * Update here when the DB plan definitions change.
 */
export const PLAN_CATALOG: Record<PlanId, PlanLimits> = {
  free: {
    maxServices:           5,
    maxPhotos:             3,
    appearsInSearch:       true,
    featuredBadge:         false,
    analyticsAccess:       false,
    whatsappNotifications: false,
  },
  basic: {
    maxServices:           20,
    maxPhotos:             10,
    appearsInSearch:       true,
    featuredBadge:         false,
    analyticsAccess:       true,
    whatsappNotifications: false,
  },
  pro: {
    maxServices:           -1,
    maxPhotos:             20,
    appearsInSearch:       true,
    featuredBadge:         true,
    analyticsAccess:       true,
    whatsappNotifications: true,
  },
  premium: {
    maxServices:           -1,
    maxPhotos:             -1,
    appearsInSearch:       true,
    featuredBadge:         true,
    analyticsAccess:       true,
    whatsappNotifications: true,
  },
} as const;

/** Ordered from lowest to highest tier. */
export const PLAN_ORDER: PlanId[] = ["free", "basic", "pro", "premium"];

// ── DB row → PlanLimits ───────────────────────────────────────────────────

/**
 * Convert a `subscription_plans` DB row to normalized PlanLimits.
 * Prefer this over PLAN_CATALOG when the DB row is available.
 */
export function rowToLimits(row: PlanRow): PlanLimits {
  return {
    maxServices:           row.max_services,
    maxPhotos:             row.max_photos,
    appearsInSearch:       row.appears_in_search,
    featuredBadge:         row.featured_badge,
    analyticsAccess:       row.analytics_access,
    whatsappNotifications: row.whatsapp_notifications,
  };
}

/**
 * Get limits for a plan from the client-side catalog.
 * Use when you only have a plan ID (no DB row).
 */
export function getLimitsForPlan(
  planId: PlanId | string | null | undefined,
): PlanLimits {
  const id = (planId ?? "free") as PlanId;
  return PLAN_CATALOG[id] ?? PLAN_CATALOG.free;
}

// ── Limit predicates ──────────────────────────────────────────────────────

/**
 * Test if currentCount is within the allowed limit.
 * Correctly handles -1 (unlimited) — always returns true.
 *
 * @example
 *   isWithinLimit(20, 5)   // true  — 5 < 20
 *   isWithinLimit(5, 5)    // false — at the cap
 *   isWithinLimit(-1, 999) // true  — unlimited
 */
export function isWithinLimit(limit: number, currentCount: number): boolean {
  return limit === -1 || currentCount < limit;
}

/**
 * Human-readable limit string for display.
 * @example limitLabel(-1) → "Unlimited"  |  limitLabel(20) → "20"
 */
export function limitLabel(
  limit: number,
  unlimitedText = "Unlimited",
): string {
  return limit === -1 ? unlimitedText : String(limit);
}

// ── Plan ordering ─────────────────────────────────────────────────────────

/** Returns true if planA is a higher tier than planB. */
export function isPlanHigher(a: PlanId, b: PlanId): boolean {
  return PLAN_ORDER.indexOf(a) > PLAN_ORDER.indexOf(b);
}

/** Returns the next upgrade target, or null if already on the highest plan. */
export function nextPlan(planId: PlanId): PlanId | null {
  const idx = PLAN_ORDER.indexOf(planId);
  return idx < PLAN_ORDER.length - 1 ? PLAN_ORDER[idx + 1] : null;
}

// ── Subscription status helpers ───────────────────────────────────────────

/**
 * Determine if a plan + expiry combination is currently active.
 *   - "free" is always active (never expires)
 *   - Paid plans are active only if expiresAt is in the future
 */
export function isPlanActive(
  planId: PlanId | string,
  expiresAt: string | null,
): boolean {
  if (planId === "free") return true;
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() > Date.now();
}

/**
 * Days remaining until expiry.
 * Positive = days left.  0 = expires today.  Negative = already expired.
 * Returns null for free plan or when no expiry is set.
 */
export function daysUntilExpiry(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Derive the high-level SubscriptionState from plan + expiry.
 * Trial state requires a `trialEndsAt` argument (always null currently).
 */
export function resolveSubscriptionState(
  planId: PlanId | string,
  expiresAt: string | null,
  trialEndsAt: string | null = null,
): SubscriptionState {
  if (planId === "free") return "free";
  if (trialEndsAt && new Date(trialEndsAt).getTime() > Date.now()) return "trial";
  if (!expiresAt) return "expired";
  return new Date(expiresAt).getTime() > Date.now() ? "active" : "expired";
}

// ── Usage utilities ───────────────────────────────────────────────────────

/**
 * Percentage of limit used (0–100). Returns 0 for unlimited plans.
 * Use this to drive progress bars.
 */
export function usagePercent(limit: number, currentCount: number): number {
  if (limit === -1) return 0;
  return Math.min(100, Math.round((currentCount / limit) * 100));
}

/**
 * Returns a severity level for usage warnings.
 *   - "ok"      → < 80%
 *   - "warning" → 80–99%
 *   - "full"    → 100%
 */
export function usageSeverity(
  limit: number,
  currentCount: number,
): "ok" | "warning" | "full" {
  if (limit === -1) return "ok";
  const pct = usagePercent(limit, currentCount);
  if (pct >= 100) return "full";
  if (pct >= 80)  return "warning";
  return "ok";
}
