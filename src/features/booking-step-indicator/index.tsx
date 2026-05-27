/**
 * Booking wizard UX components.
 *
 * Three reusable pieces extracted from (or inspired by) book.$serviceId.tsx:
 *
 *  BookingStepIndicator  — visual 1 → 2 → 3 progress bar
 *  TimeSlotPicker        — hourly grid extracted from book.$serviceId.tsx:219-241
 *  PaymentMethodOption   — single payment row extracted from book.$serviceId.tsx:299-314
 *
 * The existing book.$serviceId.tsx route is NOT modified.
 * These components are available for any future booking UIs.
 */

import { Fragment } from "react";
import { Check, CreditCard, Smartphone, Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/use-i18n";

// ── BookingStepIndicator ──────────────────────────────────────────────────

export interface BookingStep {
  label: string;
}

interface BookingStepIndicatorProps {
  steps: BookingStep[];
  /** 0-based index of the current (active) step. */
  currentStep: number;
  className?: string;
}

/**
 * Horizontal step-progress indicator.
 *
 * Example:
 *   <BookingStepIndicator
 *     steps={[{ label: "Date" }, { label: "Time" }, { label: "Payment" }]}
 *     currentStep={1}
 *   />
 */
export function BookingStepIndicator({
  steps,
  currentStep,
  className,
}: BookingStepIndicatorProps) {
  return (
    <div className={cn("flex items-center", className)}>
      {steps.map((step, i) => {
        const done   = i < currentStep;
        const active = i === currentStep;

        return (
          <Fragment key={i}>
            {/* connector line between steps */}
            {i > 0 && (
              <div
                className={cn(
                  "h-px flex-1 transition-colors duration-200",
                  done ? "bg-primary" : "bg-border",
                )}
              />
            )}

            <div className="flex flex-col items-center gap-1">
              {/* circle */}
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors duration-200",
                  done
                    ? "border-primary bg-primary text-primary-foreground"
                    : active
                    ? "border-primary text-primary bg-background"
                    : "border-border text-muted-foreground bg-background",
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </span>

              {/* label */}
              <span
                className={cn(
                  "text-xs font-medium whitespace-nowrap",
                  active
                    ? "text-primary"
                    : done
                    ? "text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}

// ── TimeSlotPicker ────────────────────────────────────────────────────────

interface TimeSlotPickerProps {
  /** Array of hour integers, e.g. [9, 10, 11, …, 21] */
  hours: number[];
  /** Set of hours that are already booked / unavailable. */
  takenHours: Set<number>;
  /** Currently selected slot label, e.g. "09:00", or null. */
  selected: string | null;
  /** When true the whole grid is disabled (e.g. no date selected yet). */
  disabled?: boolean;
  onSelect: (slot: string) => void;
  className?: string;
}

/**
 * Grid of hourly time slots.  Taken slots are dimmed and non-interactive.
 *
 * Mirrors the grid in book.$serviceId.tsx so any future booking form can
 * reuse the same UX without duplicating markup.
 */
export function TimeSlotPicker({
  hours,
  takenHours,
  selected,
  disabled = false,
  onSelect,
  className,
}: TimeSlotPickerProps) {
  const { t } = useI18n();

  return (
    <div className={cn("grid grid-cols-4 sm:grid-cols-5 gap-2", className)}>
      {hours.map((h) => {
        const label      = `${String(h).padStart(2, "0")}:00`;
        const taken      = takenHours.has(h);
        const isSelected = selected === label;
        const inactive   = disabled || taken;

        return (
          <button
            key={h}
            type="button"
            disabled={inactive}
            onClick={() => onSelect(label)}
            title={taken ? t("booking_steps.slot_taken") : t("booking_steps.slot_available")}
            className={cn(
              "rounded-xl border text-sm py-2 transition",
              isSelected
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background hover:border-primary",
              inactive && "opacity-40 cursor-not-allowed line-through",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ── PaymentMethodOption ───────────────────────────────────────────────────

interface PaymentMethodOptionProps {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  title: string;
  subtitle?: string;
}

/**
 * Single payment method row (card / wallet / cash).
 *
 * Extracted from the inline `PayOption` in book.$serviceId.tsx so
 * it can be composed into other booking or checkout UIs.
 */
export function PaymentMethodOption({
  active,
  onClick,
  icon,
  title,
  subtitle,
}: PaymentMethodOptionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-2xl border p-4 text-start w-full transition",
        active
          ? "border-primary bg-primary/5 ring-1 ring-primary"
          : "border-border hover:border-primary/50",
      )}
    >
      <span
        className={cn(
          "rounded-xl p-2 transition",
          active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
        )}
      >
        {icon}
      </span>

      <span className="flex-1 text-start">
        <span className="block font-medium text-sm">{title}</span>
        {subtitle && (
          <span className="block text-xs text-muted-foreground">{subtitle}</span>
        )}
      </span>

      {active && <Check className="h-4 w-4 shrink-0 text-primary" />}
    </button>
  );
}

// ── icon convenience re-exports ───────────────────────────────────────────
// Callers can import these alongside PaymentMethodOption instead of
// re-importing from lucide-react individually.
export { CreditCard as CardIcon, Smartphone as WalletIcon, Wallet as CashIcon };
