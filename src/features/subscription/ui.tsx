/**
 * Phase 3C — Subscription UI components.
 *
 * All components are pure presentation — they receive data via props
 * and never fetch from Supabase directly.  Callers supply the plan data
 * (usually from useCenterPlanGates() or a parent query).
 *
 * Exports
 * ───────
 *  PlanBadge            — current plan pill (Crown icon)
 *  FeatureRow           — Check/X feature list item
 *  PlanCard             — full plan pricing + feature card
 *  UsageBar             — progress bar for limit consumption
 *  UpgradePrompt        — inline or banner upgrade call-to-action
 *  TrialCountdown       — days-remaining badge for trial/expiring plans
 *  PlanComparisonTable  — side-by-side feature comparison across all plans
 */

import { Check, X, Crown, Zap, AlertTriangle, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/use-i18n";
import type { PlanId, PlanRow, UpgradeTrigger } from "./types";
import {
  PLAN_CATALOG,
  PLAN_ORDER,
  limitLabel,
  usagePercent,
  usageSeverity,
} from "./plans";

// ── PlanBadge ─────────────────────────────────────────────────────────────

interface PlanBadgeProps {
  planId: PlanId;
  className?: string;
}

const PLAN_BADGE_STYLES: Record<PlanId, string> = {
  free:    "bg-secondary text-muted-foreground border-border",
  basic:   "bg-blue-500/10 text-blue-700 border-blue-500/25",
  pro:     "bg-primary/10 text-primary border-primary/25",
  premium: "bg-[color:var(--gold)]/20 text-foreground border-[color:var(--gold)]/40",
};

/** Compact plan pill with optional Crown icon for premium/pro. */
export function PlanBadge({ planId, className }: PlanBadgeProps) {
  const { t } = useI18n();
  const showCrown = planId === "premium" || planId === "pro";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize",
        PLAN_BADGE_STYLES[planId],
        className,
      )}
    >
      {showCrown && <Crown className="h-3 w-3" />}
      {t("common.current_plan")} · {planId}
    </span>
  );
}

// ── FeatureRow ────────────────────────────────────────────────────────────

interface FeatureRowProps {
  ok: boolean;
  children: ReactNode;
  className?: string;
}

/** Single feature line item with Check (enabled) or X (disabled) icon. */
export function FeatureRow({ ok, children, className }: FeatureRowProps) {
  return (
    <li className={cn("flex items-center gap-2 text-sm", className)}>
      {ok ? (
        <Check className="h-4 w-4 shrink-0 text-primary" />
      ) : (
        <X className="h-4 w-4 shrink-0 text-muted-foreground/40" />
      )}
      <span className={ok ? "" : "text-muted-foreground/60 line-through"}>
        {children}
      </span>
    </li>
  );
}

// ── PlanCard ──────────────────────────────────────────────────────────────

export interface PlanCardProps {
  plan: PlanRow;
  isCurrent?: boolean;
  country?: "EG" | "SA";
  onUpgrade?: (planId: PlanId) => void;
  className?: string;
}

/**
 * Full plan pricing + feature card.
 *
 * Renders bilingual names (en/ar), country-aware pricing,
 * and all feature rows.  Calls onUpgrade(planId) on button click.
 */
export function PlanCard({
  plan,
  isCurrent = false,
  country = "EG",
  onUpgrade,
  className,
}: PlanCardProps) {
  const { t, locale } = useI18n();
  const isAr    = locale === "ar";
  const price   = country === "SA" ? plan.price_sar : plan.price_egp;
  const sym     = country === "SA"
    ? (isAr ? "ر.س" : "SAR")
    : (isAr ? "ج.م" : "EGP");
  const name    = isAr ? plan.name_ar : plan.name_en;

  return (
    <div
      className={cn(
        "rounded-3xl border bg-card p-6 flex flex-col",
        isCurrent
          ? "border-[color:var(--gold)] shadow-glow"
          : "border-border",
        className,
      )}
    >
      {isCurrent && (
        <PlanBadge planId={plan.id as PlanId} className="self-start mb-3" />
      )}

      <h3 className="text-display text-2xl">{name}</h3>

      {(isAr ? plan.description_ar : plan.description_en) && (
        <p className="mt-1 text-xs text-muted-foreground">
          {isAr ? plan.description_ar : plan.description_en}
        </p>
      )}

      <div className="mt-3">
        <span className="text-display text-4xl text-primary">{price}</span>
        <span className="ml-1 text-sm text-muted-foreground">
          {sym}{t("plans.month")}
        </span>
      </div>

      <ul className="mt-5 space-y-2 flex-1">
        <FeatureRow ok>
          {plan.max_services === -1
            ? t("plans.unlimited")
            : `${plan.max_services} ${t("plans.max_services")}`}
        </FeatureRow>
        <FeatureRow ok>
          {plan.max_photos === -1
            ? t("plans.unlimited")
            : `${plan.max_photos} ${t("plans.max_photos")}`}
        </FeatureRow>
        <FeatureRow ok={plan.appears_in_search}>
          {t("plans.appears_in_search")}
        </FeatureRow>
        <FeatureRow ok={plan.featured_badge}>
          {t("plans.featured_badge")}
        </FeatureRow>
        <FeatureRow ok={plan.analytics_access}>
          {t("plans.analytics")}
        </FeatureRow>
        <FeatureRow ok={plan.whatsapp_notifications}>
          {t("plans.whatsapp")}
        </FeatureRow>
      </ul>

      <button
        disabled={isCurrent}
        onClick={() => onUpgrade?.(plan.id as PlanId)}
        className={cn(
          "mt-6 w-full rounded-full py-2.5 text-sm font-semibold transition",
          isCurrent
            ? "border border-border text-muted-foreground cursor-default"
            : "bg-gradient-primary text-primary-foreground hover:opacity-90",
        )}
      >
        {isCurrent ? t("common.current_plan") : t("common.upgrade")}
      </button>
    </div>
  );
}

// ── UsageBar ──────────────────────────────────────────────────────────────

interface UsageBarProps {
  /** Current usage count. */
  current: number;
  /** Max allowed. -1 = unlimited. */
  limit: number;
  /** Label shown above the bar, e.g. "Services". */
  label: string;
  className?: string;
}

const SEVERITY_COLORS = {
  ok:      "bg-primary",
  warning: "bg-amber-500",
  full:    "bg-red-500",
};

/**
 * Horizontal progress bar showing current/max usage.
 * Changes color as usage approaches the limit.
 * Renders as simple text when limit is unlimited (-1).
 */
export function UsageBar({ current, limit, label, className }: UsageBarProps) {
  const pct      = usagePercent(limit, current);
  const severity = usageSeverity(limit, current);

  if (limit === -1) {
    return (
      <div className={cn("text-xs text-muted-foreground", className)}>
        {label}: <span className="font-medium text-foreground">{current}</span>{" "}
        / {limitLabel(-1)}
      </div>
    );
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span
          className={cn(
            "font-mono font-semibold",
            severity === "full"    ? "text-red-600"   :
            severity === "warning" ? "text-amber-600" :
            "text-foreground",
          )}
        >
          {current} / {limit}
        </span>
      </div>
      <div className="h-1.5 bg-border rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300",
            SEVERITY_COLORS[severity],
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── UpgradePrompt ─────────────────────────────────────────────────────────

interface UpgradePromptProps {
  trigger: UpgradeTrigger;
  /** Current plan ID — used to name the required upgrade target. */
  currentPlanId?: PlanId;
  /** Callback when the user clicks the upgrade button. */
  onUpgrade?: () => void;
  /** "banner" spans full width with subtle bg; "inline" is compact. */
  variant?: "banner" | "inline";
  className?: string;
}

const TRIGGER_MESSAGES: Record<UpgradeTrigger, string> = {
  service_limit:       "You've reached your service limit.",
  photo_limit:         "You've reached your photo limit.",
  analytics:           "Advanced analytics require a higher plan.",
  featured_badge:      "Featured badge is available on Pro and Premium.",
  whatsapp:            "WhatsApp notifications require Pro or Premium.",
  search_visibility:   "Upgrade to appear in search results.",
};

/** Inline or banner call-to-action for plan upgrades. */
export function UpgradePrompt({
  trigger,
  onUpgrade,
  variant = "inline",
  className,
}: UpgradePromptProps) {
  const { t } = useI18n();
  const message = TRIGGER_MESSAGES[trigger];

  if (variant === "banner") {
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-2xl border border-amber-500/30",
          "bg-amber-500/5 px-4 py-3",
          className,
        )}
      >
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
        <p className="flex-1 text-sm text-amber-800 dark:text-amber-400">
          {message}
        </p>
        {onUpgrade && (
          <button
            onClick={onUpgrade}
            className="shrink-0 rounded-full bg-gradient-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 transition"
          >
            {t("common.upgrade")} <Zap className="inline h-3 w-3 ml-1" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl border border-border bg-secondary px-3 py-2",
        className,
      )}
    >
      <TrendingUp className="h-3.5 w-3.5 shrink-0 text-primary" />
      <span className="text-xs text-muted-foreground flex-1">{message}</span>
      {onUpgrade && (
        <button
          onClick={onUpgrade}
          className="text-xs font-semibold text-primary hover:underline transition"
        >
          {t("common.upgrade")} →
        </button>
      )}
    </div>
  );
}

// ── TrialCountdown ────────────────────────────────────────────────────────

interface TrialCountdownProps {
  /** Positive = days remaining.  0 = expires today.  Negative = expired. */
  daysLeft: number;
  className?: string;
}

/** Days-remaining pill for trial or expiring subscriptions. */
export function TrialCountdown({ daysLeft, className }: TrialCountdownProps) {
  if (daysLeft < 0) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border border-red-500/30",
          "bg-red-500/10 px-2.5 py-0.5 text-xs font-semibold text-red-600",
          className,
        )}
      >
        <AlertTriangle className="h-3 w-3" />
        Plan expired
      </span>
    );
  }

  const urgent = daysLeft <= 7;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        urgent
          ? "border-amber-500/30 bg-amber-500/10 text-amber-700"
          : "border-primary/20 bg-primary/5 text-primary",
        className,
      )}
    >
      {urgent && <AlertTriangle className="h-3 w-3" />}
      {daysLeft === 0 ? "Expires today" : `${daysLeft}d left`}
    </span>
  );
}

// ── PlanComparisonTable ───────────────────────────────────────────────────

interface PlanComparisonTableProps {
  /** All plan rows from DB (ordered by priority_rank descending). */
  plans: PlanRow[];
  currentPlanId: PlanId;
  country?: "EG" | "SA";
  onUpgrade?: (planId: PlanId) => void;
  className?: string;
}

/**
 * Horizontal feature comparison table across all plans.
 * Designed for the subscription upgrade decision page.
 */
export function PlanComparisonTable({
  plans,
  currentPlanId,
  country = "EG",
  onUpgrade,
  className,
}: PlanComparisonTableProps) {
  const { t, locale } = useI18n();
  const isAr = locale === "ar";

  // Sort by PLAN_ORDER (free → basic → pro → premium)
  const sorted = [...plans].sort(
    (a, b) =>
      PLAN_ORDER.indexOf(a.id as PlanId) -
      PLAN_ORDER.indexOf(b.id as PlanId),
  );

  const FEATURE_ROWS: { label: string; key: keyof PlanRow }[] = [
    { label: t("plans.max_services"),     key: "max_services"           },
    { label: t("plans.max_photos"),       key: "max_photos"             },
    { label: t("plans.appears_in_search"),key: "appears_in_search"      },
    { label: t("plans.featured_badge"),   key: "featured_badge"         },
    { label: t("plans.analytics"),        key: "analytics_access"       },
    { label: t("plans.whatsapp"),         key: "whatsapp_notifications" },
  ];

  return (
    <div className={cn("overflow-x-auto rounded-2xl border border-border bg-card", className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground w-40">
              Feature
            </th>
            {sorted.map((p) => {
              const isCurrent = p.id === currentPlanId;
              return (
                <th
                  key={p.id}
                  className={cn(
                    "px-4 py-3 text-center text-xs font-semibold",
                    isCurrent && "bg-primary/5",
                  )}
                >
                  <span className="block">{isAr ? p.name_ar : p.name_en}</span>
                  {isCurrent && (
                    <span className="mt-1 inline-block text-[10px] text-primary font-medium">
                      ← {t("common.current_plan")}
                    </span>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {FEATURE_ROWS.map(({ label, key }) => (
            <tr key={key} className="border-t border-border">
              <td className="px-4 py-3 text-xs text-muted-foreground font-medium">
                {label}
              </td>
              {sorted.map((p) => {
                const val = p[key];
                const isCurrent = p.id === currentPlanId;

                let cell: ReactNode;
                if (typeof val === "boolean") {
                  cell = val
                    ? <Check className="h-4 w-4 text-primary mx-auto" />
                    : <X className="h-4 w-4 text-muted-foreground/40 mx-auto" />;
                } else if (typeof val === "number") {
                  cell = (
                    <span className="text-xs font-mono font-semibold text-foreground">
                      {limitLabel(val)}
                    </span>
                  );
                } else {
                  cell = <span className="text-xs">{String(val)}</span>;
                }

                return (
                  <td
                    key={p.id}
                    className={cn(
                      "px-4 py-3 text-center",
                      isCurrent && "bg-primary/5",
                    )}
                  >
                    {cell}
                  </td>
                );
              })}
            </tr>
          ))}

          {/* Upgrade row */}
          <tr className="border-t border-border">
            <td className="px-4 py-3" />
            {sorted.map((p) => {
              const isCurrent = p.id === currentPlanId;
              return (
                <td key={p.id} className={cn("px-4 py-3 text-center", isCurrent && "bg-primary/5")}>
                  {isCurrent ? (
                    <span className="text-xs text-muted-foreground">{t("common.current_plan")}</span>
                  ) : (
                    <button
                      onClick={() => onUpgrade?.(p.id as PlanId)}
                      className="rounded-full bg-gradient-primary px-3 py-1 text-xs font-semibold text-primary-foreground hover:opacity-90 transition"
                    >
                      {t("common.upgrade")}
                    </button>
                  )}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
