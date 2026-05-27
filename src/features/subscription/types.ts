/**
 * Phase 3A — Subscription data model types.
 *
 * All types derive from the existing Supabase schema:
 *   - centers.subscription_plan     (DB enum)
 *   - centers.subscription_expires_at
 *   - subscription_plans.*          (DB table)
 *   - commission_tiers.*            (DB table)
 *
 * No new DB columns are required for the current implementation.
 * Fields marked "future" require a DB migration before use.
 */

import type { Database } from "@/integrations/supabase/types";

// ── Plan identity ─────────────────────────────────────────────────────────

/** DB enum: "free" | "basic" | "pro" | "premium" */
export type PlanId = Database["public"]["Enums"]["subscription_plan"];

/** Full row from the `subscription_plans` Supabase table. */
export type PlanRow =
  Database["public"]["Tables"]["subscription_plans"]["Row"];

// ── Feature limits ────────────────────────────────────────────────────────

/**
 * Normalized feature limits for a single plan.
 *
 * Mapped from PlanRow (snake_case → camelCase).
 * `-1` means unlimited in every numeric field.
 */
export interface PlanLimits {
  /** Maximum number of services. -1 = unlimited. */
  maxServices: number;
  /** Maximum photos per service. -1 = unlimited. */
  maxPhotos: number;
  /** Whether the center appears in public search results. */
  appearsInSearch: boolean;
  /** Whether the center receives a "Featured" badge. */
  featuredBadge: boolean;
  /** Whether advanced analytics are available. */
  analyticsAccess: boolean;
  /** Whether WhatsApp booking notifications are enabled. */
  whatsappNotifications: boolean;
}

// ── Resolved gates ────────────────────────────────────────────────────────

/**
 * FeatureGates = PlanLimits + convenience predicates.
 * Built by `buildGates()` in gating.ts.
 */
export interface FeatureGates extends PlanLimits {
  /**
   * Returns true if the center can add another service given
   * its current count.  Handles -1 (unlimited) correctly.
   */
  canAddService: (currentCount: number) => boolean;
  /**
   * Returns true if upgrading is required to access this boolean feature.
   * Numeric features return true only when the limit is 0.
   */
  isUpgradeRequired: (feature: keyof PlanLimits) => boolean;
}

// ── Subscription status ───────────────────────────────────────────────────

/**
 * Runtime subscription state for a single center.
 * Derived from `centers.subscription_plan` + `centers.subscription_expires_at`.
 */
export interface CenterSubscriptionStatus {
  planId: PlanId;
  /** ISO timestamp or null (null = never expires / free plan). */
  expiresAt: string | null;
  /** True for free plan or paid plan within expiry. */
  isActive: boolean;
  /** True for paid plan whose expiry has passed. */
  isExpired: boolean;
  /** Positive = days remaining; 0 = expires today; negative = expired. Null for free. */
  daysUntilExpiry: number | null;
  /**
   * Trial flag — future field.
   * Requires `centers.trial_ends_at` DB column (not yet in schema).
   * Always false in current implementation.
   */
  isTrial: boolean;
  /** ISO timestamp of trial end. Always null until `trial_ends_at` column exists. */
  trialEndsAt: string | null;
}

// ── Lifecycle state ───────────────────────────────────────────────────────

/**
 * High-level subscription lifecycle state.
 * Used for conditional rendering and billing flow routing.
 */
export type SubscriptionState =
  | "free"     // on free plan
  | "active"   // paid plan, within expiry
  | "trial"    // within a trial period (future)
  | "grace"    // within grace period after expiry (future)
  | "expired"; // paid plan that has lapsed

// ── Upgrade triggers ──────────────────────────────────────────────────────

/**
 * Context in which an upgrade prompt was triggered.
 * Used to display targeted messaging and track conversion funnel.
 */
export type UpgradeTrigger =
  | "service_limit"
  | "photo_limit"
  | "analytics"
  | "featured_badge"
  | "whatsapp"
  | "search_visibility";

// ── Commission types ──────────────────────────────────────────────────────

/** Row from the `commission_tiers` table. */
export type CommissionTierRow =
  Database["public"]["Tables"]["commission_tiers"]["Row"];

// ── Billing direction (Phase 3D) ──────────────────────────────────────────

/** Supported payment providers (no implementation yet — adapter-safe). */
export type BillingProvider =
  | "stripe"
  | "moyasar"
  | "paymob"
  | "apple_pay"
  | "mada";

/** Billing cycle. Annual billing not in DB yet — defined for future. */
export type BillingCycle = "monthly" | "annual";
