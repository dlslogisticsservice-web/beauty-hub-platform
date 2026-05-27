/**
 * Phase 3D — Billing provider abstraction layer.
 *
 * Defines the contracts that any payment provider must implement.
 * NO implementations are included — this is the adapter interface only.
 *
 * Supported providers (future):
 *   Stripe    — global card payments
 *   Moyasar   — Saudi Arabia (Mada, Apple Pay, VISA/MC)
 *   Paymob    — Egypt (card, wallet, cash)
 *   Apple Pay — via Moyasar or Stripe
 *   Mada      — Saudi debit via Moyasar
 *
 * Usage pattern (when implementations are added):
 *
 *   // api/fn/billing-checkout.ts
 *   const provider: BillingService = resolveBillingService(country);
 *   const session = await provider.createCheckoutSession(params);
 *   return { paymentUrl: session.paymentUrl };
 *
 * The BillingServiceFactory type ensures every implementation
 * receives config at construction time (API keys from env vars)
 * rather than hardcoding them.
 */

import type { PlanId, BillingProvider, BillingCycle } from "./types";

// ── Checkout ──────────────────────────────────────────────────────────────

/** Parameters for creating a new checkout session. */
export interface CheckoutParams {
  /** The center requesting the upgrade. */
  centerId: string;
  /** Target plan to subscribe to. */
  planId: PlanId;
  /** Country determines currency and available providers. */
  country: "EG" | "SA";
  /** Defaults to monthly. */
  billingCycle?: BillingCycle;
  /** URL to redirect to on successful payment. */
  successUrl: string;
  /** URL to redirect to on cancelled payment. */
  cancelUrl: string;
  /** Optional extra data attached to the session for webhook reconciliation. */
  metadata?: Record<string, string>;
}

/** Result of creating a checkout session. */
export interface CheckoutSession {
  /** Provider-specific session or order identifier. */
  sessionId: string;
  provider: BillingProvider;
  /** Redirect the user's browser to this URL to complete payment. */
  paymentUrl: string;
  /** ISO timestamp when this session expires (provider-specific). */
  expiresAt: string;
}

// ── Subscription management ───────────────────────────────────────────────

/** Current subscription status returned by the billing provider. */
export interface BillingSubscriptionStatus {
  provider: BillingProvider;
  /** Provider's own subscription/order ID. */
  externalId: string;
  status: "active" | "past_due" | "cancelled" | "trialing" | "unpaid";
  /** ISO timestamp of the current billing period end. */
  currentPeriodEnd: string;
  planId: PlanId;
}

/** Result of a cancellation request. */
export interface CancellationResult {
  success: boolean;
  /** ISO timestamp when the cancellation takes effect. */
  effectiveAt: string;
  message?: string;
}

// ── Webhooks ──────────────────────────────────────────────────────────────

/** Normalized webhook event emitted after provider-specific parsing. */
export interface WebhookEvent {
  type:
    | "subscription.activated"
    | "subscription.renewed"
    | "subscription.cancelled"
    | "subscription.expired"
    | "payment.succeeded"
    | "payment.failed"
    | "payment.refunded";
  /** The center this event is associated with. */
  centerId: string;
  planId?: PlanId;
  /** Provider-specific payload after normalization. */
  data: Record<string, unknown>;
}

// ── Provider contract ─────────────────────────────────────────────────────

/**
 * Contract every payment provider adapter must implement.
 * Implementations live in api/billing/<provider>.ts (future).
 */
export interface BillingService {
  /** Identifier for this provider (used in logs and error messages). */
  readonly provider: BillingProvider;

  /**
   * Create a hosted checkout session.
   * Returns a URL the center owner is redirected to.
   */
  createCheckoutSession(params: CheckoutParams): Promise<CheckoutSession>;

  /**
   * Cancel the active subscription for a center.
   * Effective date depends on the provider's policy.
   */
  cancelSubscription(centerId: string): Promise<CancellationResult>;

  /**
   * Retrieve the current subscription status from the provider.
   * Used to reconcile DB state with provider state.
   */
  getSubscriptionStatus(
    centerId: string,
  ): Promise<BillingSubscriptionStatus>;

  /**
   * Parse and validate a provider webhook payload.
   * @param payload  Raw request body (parsed JSON or Buffer).
   * @param signature  Provider-specific signature header value.
   * @returns Normalized WebhookEvent for application processing.
   */
  handleWebhook(
    payload: unknown,
    signature: string,
  ): Promise<WebhookEvent>;
}

/**
 * Factory function signature for billing service implementations.
 *
 * Each provider's factory reads its keys from config (env vars) and
 * returns a ready-to-use BillingService.
 *
 * @example
 *   // future: api/billing/stripe.ts
 *   export const createStripeService: BillingServiceFactory = (config) => ({
 *     provider: "stripe",
 *     async createCheckoutSession(params) { ... },
 *     ...
 *   });
 */
export type BillingServiceFactory = (
  config: Record<string, string>,
) => BillingService;

// ── Provider registry ─────────────────────────────────────────────────────

/**
 * Providers available per country.
 * Used by the resolver to pick the right implementation at runtime.
 */
export const PROVIDERS_BY_COUNTRY: Record<"EG" | "SA", BillingProvider[]> = {
  EG: ["paymob"],
  SA: ["moyasar", "mada", "apple_pay"],
};

/**
 * Preferred provider for each country (used as the default
 * when no explicit provider is specified).
 */
export const DEFAULT_PROVIDER_BY_COUNTRY: Record<"EG" | "SA", BillingProvider> = {
  EG: "paymob",
  SA: "moyasar",
};

/**
 * Placeholder resolver — returns null until implementations exist.
 *
 * Replace the body of this function when adding a provider:
 *
 *   import { createPaymobService } from "@/api/billing/paymob";
 *   if (country === "EG") return createPaymobService(config);
 */
export function resolveBillingService(
  _country: "EG" | "SA",
  _config?: Record<string, string>,
): BillingService | null {
  // No billing providers implemented yet.
  // Return null until a provider adapter is added.
  return null;
}
