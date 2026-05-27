/**
 * Phase 3B — Feature gating system.
 *
 * Three layers:
 *
 *  1. Pure functions (no React, no DB):
 *     buildGates(), getGatesForPlan()
 *
 *  2. React hooks (use Supabase + React Query):
 *     useCenterPlanGates() — full plan data from DB
 *     useFeatureGate()     — single boolean gate
 *     useCanAddService()   — service count gate
 *
 *  3. Guard component:
 *     <FeatureGuard> — renders children or fallback based on gate
 *
 * All hooks gracefully fall back to free-tier gates while loading,
 * so UI never breaks when subscription data is unavailable.
 */

import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import type {
  PlanId,
  PlanLimits,
  FeatureGates,
  CenterSubscriptionStatus,
} from "./types";
import {
  PLAN_CATALOG,
  getLimitsForPlan,
  rowToLimits,
  isWithinLimit,
  isPlanActive,
  daysUntilExpiry,
} from "./plans";

// ── Pure gate builders ────────────────────────────────────────────────────

/**
 * Build FeatureGates from a PlanLimits object.
 * This is a pure function — no React, no DB.
 */
export function buildGates(limits: PlanLimits): FeatureGates {
  return {
    ...limits,
    canAddService: (currentCount: number) =>
      isWithinLimit(limits.maxServices, currentCount),
    isUpgradeRequired: (feature: keyof PlanLimits) => {
      const val = limits[feature];
      if (typeof val === "boolean") return !val;
      if (typeof val === "number")  return val === 0;
      return false;
    },
  };
}

/** Default gates used while loading or for unknown plan. */
export const DEFAULT_GATES: FeatureGates = buildGates(PLAN_CATALOG.free);

/**
 * Get gates synchronously from plan ID (uses client-side PLAN_CATALOG).
 * Use when you only have a plan string and don't need DB-driven limits.
 */
export function getGatesForPlan(
  planId: PlanId | string | null | undefined,
): FeatureGates {
  return buildGates(getLimitsForPlan(planId));
}

// ── React hooks ───────────────────────────────────────────────────────────

/**
 * Fetch the current center's subscription plan + all plan rows.
 * Returns resolved gates and subscription status.
 *
 * Cache: 5 minutes — plans rarely change within a single session.
 *
 * On expired plan: falls back to free-tier gates so the center
 * is never accidentally over-privileged.
 */
export function useCenterPlanGates() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["center-plan-gates", user?.id],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const [{ data: center }, { data: plans }] = await Promise.all([
        supabase
          .from("centers")
          .select("subscription_plan, subscription_expires_at")
          .eq("owner_id", user!.id)
          .maybeSingle(),
        supabase.from("subscription_plans").select("*"),
      ]);
      return { center, plans: plans ?? [] };
    },
  });

  const planId  = (data?.center?.subscription_plan ?? "free") as PlanId;
  const expires = data?.center?.subscription_expires_at ?? null;
  const planRow = data?.plans.find((p) => p.id === planId);
  const active  = isPlanActive(planId, expires);

  // If the plan has expired, enforce free-tier limits rather than last plan's.
  const rawLimits = planRow
    ? rowToLimits(planRow)
    : getLimitsForPlan(planId);
  const effectiveLimits = active ? rawLimits : PLAN_CATALOG.free;

  const status: CenterSubscriptionStatus = {
    planId,
    expiresAt:        expires,
    isActive:         active,
    isExpired:        planId !== "free" && !active,
    daysUntilExpiry:  daysUntilExpiry(expires),
    isTrial:          false,   // future: requires trial_ends_at DB column
    trialEndsAt:      null,
  };

  return {
    isLoading,
    planId,
    status,
    gates:   buildGates(effectiveLimits),
    planRow,
    allPlans: data?.plans ?? [],
  };
}

/**
 * Check a single boolean feature gate for the current center.
 *
 * @example
 *   const { allowed, isLoading } = useFeatureGate("analyticsAccess");
 *   if (!allowed) return <UpgradePrompt trigger="analytics" />;
 */
export function useFeatureGate(feature: keyof PlanLimits) {
  const { gates, isLoading, status } = useCenterPlanGates();
  const value = gates[feature];

  return {
    isLoading,
    allowed: typeof value === "boolean" ? value : (value as number) !== 0,
    value,
    status,
  };
}

/**
 * Specialized hook for service-count gating.
 * Reads the center's current service count from Supabase.
 *
 * @example
 *   const { canAdd, remaining, isLoading } = useCanAddService();
 *   if (!canAdd) return <UpgradePrompt trigger="service_limit" />;
 */
export function useCanAddService() {
  const { user } = useAuth();
  const { gates, planId, isLoading: gatesLoading } = useCenterPlanGates();

  const { data: countData, isLoading: countLoading } = useQuery({
    queryKey: ["service-count", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const { data: center } = await supabase
        .from("centers")
        .select("id")
        .eq("owner_id", user!.id)
        .maybeSingle();
      if (!center) return { count: 0 };
      const { count } = await supabase
        .from("services")
        .select("id", { count: "exact", head: true })
        .eq("center_id", center.id);
      return { count: count ?? 0 };
    },
  });

  const current   = countData?.count ?? 0;
  const limit     = gates.maxServices;
  const canAdd    = gates.canAddService(current);
  const remaining = limit === -1 ? null : Math.max(0, limit - current);

  return {
    isLoading: gatesLoading || countLoading,
    canAdd,
    current,
    limit,
    remaining,
    planId,
  };
}

// ── Guard component ───────────────────────────────────────────────────────

interface FeatureGuardProps {
  feature: keyof PlanLimits;
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Render `children` if the feature is allowed, otherwise `fallback`.
 * Shows nothing while loading.
 *
 * @example
 *   <FeatureGuard feature="analyticsAccess" fallback={<UpgradePrompt trigger="analytics" />}>
 *     <AnalyticsDashboard />
 *   </FeatureGuard>
 */
export function FeatureGuard({
  feature,
  fallback = null,
  children,
}: FeatureGuardProps): ReactNode {
  const { allowed, isLoading } = useFeatureGate(feature);
  if (isLoading) return null;
  return allowed ? children : fallback;
}
