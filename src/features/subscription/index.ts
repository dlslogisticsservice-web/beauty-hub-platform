/**
 * src/features/subscription — Phase 3 subscription & billing foundation.
 *
 * ─── Phase 3A: Data model ────────────────────────────────────────────────
 * types.ts   PlanId, PlanRow, PlanLimits, FeatureGates,
 *            CenterSubscriptionStatus, SubscriptionState,
 *            UpgradeTrigger, BillingProvider, BillingCycle
 *
 * plans.ts   PLAN_CATALOG, PLAN_ORDER
 *            rowToLimits, getLimitsForPlan
 *            isWithinLimit, limitLabel, isPlanHigher, nextPlan
 *            isPlanActive, daysUntilExpiry, resolveSubscriptionState
 *            usagePercent, usageSeverity
 *
 * ─── Phase 3B: Feature gating ────────────────────────────────────────────
 * gating.ts  buildGates, getGatesForPlan, DEFAULT_GATES
 *            useCenterPlanGates, useFeatureGate, useCanAddService
 *            FeatureGuard (component)
 *
 * ─── Phase 3C: Subscription UI ───────────────────────────────────────────
 * ui.tsx     PlanBadge, FeatureRow, PlanCard
 *            UsageBar, UpgradePrompt, TrialCountdown
 *            PlanComparisonTable
 *
 * ─── Phase 3D: Billing abstraction ───────────────────────────────────────
 * billing.ts CheckoutParams, CheckoutSession,
 *            BillingSubscriptionStatus, CancellationResult,
 *            WebhookEvent, BillingService, BillingServiceFactory
 *            PROVIDERS_BY_COUNTRY, DEFAULT_PROVIDER_BY_COUNTRY
 *            resolveBillingService
 */

// Phase 3A — types
export type {
  PlanId,
  PlanRow,
  PlanLimits,
  FeatureGates,
  CenterSubscriptionStatus,
  SubscriptionState,
  UpgradeTrigger,
  CommissionTierRow,
  BillingProvider,
  BillingCycle,
} from "./types";

// Phase 3A — plan utilities
export {
  PLAN_CATALOG,
  PLAN_ORDER,
  rowToLimits,
  getLimitsForPlan,
  isWithinLimit,
  limitLabel,
  isPlanHigher,
  nextPlan,
  isPlanActive,
  daysUntilExpiry,
  resolveSubscriptionState,
  usagePercent,
  usageSeverity,
} from "./plans";

// Phase 3B — gating
export {
  buildGates,
  getGatesForPlan,
  DEFAULT_GATES,
  useCenterPlanGates,
  useFeatureGate,
  useCanAddService,
  FeatureGuard,
} from "./gating";

// Phase 3C — UI
export {
  PlanBadge,
  FeatureRow,
  PlanCard,
  UsageBar,
  UpgradePrompt,
  TrialCountdown,
  PlanComparisonTable,
} from "./ui";
export type { PlanCardProps } from "./ui";

// Phase 3D — billing abstraction
export type {
  CheckoutParams,
  CheckoutSession,
  BillingSubscriptionStatus,
  CancellationResult,
  WebhookEvent,
  BillingService,
  BillingServiceFactory,
} from "./billing";
export {
  PROVIDERS_BY_COUNTRY,
  DEFAULT_PROVIDER_BY_COUNTRY,
  resolveBillingService,
} from "./billing";
