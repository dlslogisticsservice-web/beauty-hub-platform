/**
 * AI consultation analytics UI.
 *
 * Adapted from the reference AdminPanel's "ai_insights" tab (lines 649-789).
 * All brand-* CSS replaced with current theme tokens.
 * TRANSLATIONS[lang] replaced with useI18n().
 * No mock global state — all data arrives via props.
 *
 * Exports
 * ───────
 *  AIConsultationLog         shared log-entry type
 *  AIConsultationLogsPanel   full panel (stats + log list)
 *  AIConsultationLogCard     single log entry card (composable)
 *  LaserDeviceStats          mini bar chart for device distribution
 *  FitzpatrickDistribution   mini bar chart for Fitzpatrick types
 *
 * Usage (minimal):
 *   <AIConsultationLogsPanel logs={myLogs} />
 */

import { Check, Sparkles } from "lucide-react";
import { useI18n } from "@/hooks/use-i18n";
import { cn } from "@/lib/utils";

// ── domain type ───────────────────────────────────────────────────────────

export interface AIConsultationLog {
  id: string;
  clientName: string;
  /** e.g. "دهنية" / "Oily" */
  skinType: string;
  /** e.g. "Type IV" */
  fitzpatrick: string;
  /** Comma-separated concern string */
  concerns: string;
  /** e.g. "Long-Pulse Nd:YAG 1064nm" */
  laserDevice: string;
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM */
  timestamp: string;
}

// ── internal mini bar ─────────────────────────────────────────────────────

interface BarRowProps { label: string; pct: number; accent?: string }

function BarRow({ label, pct, accent = "bg-primary" }: BarRowProps) {
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] mb-0.5 text-foreground">
        <span className="font-mono">{label}</span>
        <span className="font-bold text-primary">{pct}%</span>
      </div>
      <div className="h-1.5 bg-border rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", accent)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── LaserDeviceStats ──────────────────────────────────────────────────────

interface LaserDeviceStatsProps {
  /**
   * Array of { label, pct } items.  Defaults to the reference distribution
   * when omitted so the card is useful even with no real telemetry yet.
   */
  items?: { label: string; pct: number; accent?: string }[];
  className?: string;
}

/** Mini horizontal bar chart showing laser device usage distribution. */
export function LaserDeviceStats({ items, className }: LaserDeviceStatsProps) {
  const { t } = useI18n();

  const bars = items ?? [
    { label: "Long-Pulse Nd:YAG 1064nm", pct: 75 },
    { label: "Alexandrite 755nm",         pct: 25, accent: "bg-blue-500" },
  ];

  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card p-4 space-y-3",
        className,
      )}
    >
      <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {t("consultation_logs.device_stats")}
      </span>
      <div className="space-y-2 pt-1">
        {bars.map((b) => (
          <BarRow key={b.label} label={b.label} pct={b.pct} accent={b.accent} />
        ))}
      </div>
    </div>
  );
}

// ── FitzpatrickDistribution ───────────────────────────────────────────────

interface FitzpatrickDistributionProps {
  /**
   * Optional override — each entry: { label: "I-II", pct: 30 }.
   * Defaults to reference distribution when omitted.
   */
  bars?: { label: string; pct: number; accent?: string }[];
  className?: string;
}

/** Mini column bar chart for Fitzpatrick skin-type distribution. */
export function FitzpatrickDistribution({
  bars,
  className,
}: FitzpatrickDistributionProps) {
  const { t } = useI18n();

  const data = bars ?? [
    { label: "I-II", pct: 30, accent: "bg-primary/50" },
    { label: "III",  pct: 50, accent: "bg-primary/70" },
    { label: "IV",   pct: 90, accent: "bg-primary"    },
    { label: "V",    pct: 20, accent: "bg-primary/80" },
    { label: "VI",   pct: 10, accent: "bg-blue-500"   },
  ];

  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card p-4 space-y-2",
        className,
      )}
    >
      <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {t("consultation_logs.fitz_dist")}
      </span>

      <div className="flex items-end gap-1.5 h-14 pt-2">
        {data.map((b) => (
          <div key={b.label} className="flex flex-col items-center gap-0.5 flex-1">
            {/* column bar */}
            <div className="w-full bg-border rounded-t-sm overflow-hidden flex items-end h-9">
              <div
                className={cn("w-full rounded-t-sm transition-all", b.accent ?? "bg-primary")}
                style={{ height: `${b.pct}%` }}
              />
            </div>
            <span className="text-[8px] text-muted-foreground font-mono">{b.label}</span>
          </div>
        ))}
      </div>

      <p className="text-[9px] text-muted-foreground">{t("consultation_logs.fitz_label")}</p>
    </div>
  );
}

// ── LaserSafetyCard (internal) ────────────────────────────────────────────

function LaserSafetyCard({ className }: { className?: string }) {
  const { t } = useI18n();
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card p-4 flex flex-col justify-between",
        className,
      )}
    >
      <div>
        <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {t("consultation_logs.safety_title")}
        </span>
        <span className="mt-1 flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
          <Check className="w-4 h-4" />
          {t("consultation_logs.safety_active")}
        </span>
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground leading-relaxed">
        {t("consultation_logs.safety_desc")}
      </p>
    </div>
  );
}

// ── AIConsultationLogCard ─────────────────────────────────────────────────

interface AIConsultationLogCardProps {
  log: AIConsultationLog;
  className?: string;
}

/** Single consultation log entry — composable outside the full panel. */
export function AIConsultationLogCard({
  log,
  className,
}: AIConsultationLogCardProps) {
  const { t } = useI18n();

  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card p-4 hover:border-primary/30 transition-colors",
        className,
      )}
    >
      {/* header row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-2 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-mono font-bold bg-secondary text-primary px-1.5 py-0.5 rounded">
            {log.id}
          </span>
          <span className="text-sm font-semibold text-foreground">{log.clientName}</span>
          <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
            {log.skinType}
          </span>
          <span className="text-[10px] bg-secondary text-primary px-2 py-0.5 rounded-full font-mono font-bold">
            {log.fitzpatrick}
          </span>
        </div>

        <span className="shrink-0 text-[10px] text-muted-foreground font-mono">
          {t("consultation_logs.date")}: {log.date} | {log.timestamp}
        </span>
      </div>

      {/* detail grid */}
      <div className="grid sm:grid-cols-2 gap-3 text-xs">
        <div>
          <span className="block text-[10px] text-muted-foreground">
            {t("consultation_logs.concerns")}:
          </span>
          <p className="mt-0.5 text-foreground font-medium">{log.concerns}</p>
        </div>
        <div>
          <span className="block text-[10px] text-muted-foreground">
            {t("consultation_logs.laser")}:
          </span>
          <p className="mt-0.5 text-primary font-bold">{log.laserDevice}</p>
        </div>
      </div>
    </div>
  );
}

// ── AIConsultationLogsPanel ───────────────────────────────────────────────

interface AIConsultationLogsPanelProps {
  logs: AIConsultationLog[];
  /** Max-height Tailwind class for the log list.  Defaults to "max-h-[400px]". */
  logListMaxHeight?: string;
  className?: string;
}

/**
 * Complete analytics panel.
 *
 * Renders:
 *  1. Header with title + total count badge
 *  2. Three-column stats row (LaserDeviceStats, FitzpatrickDistribution, LaserSafetyCard)
 *  3. Scrollable log list (AIConsultationLogCard per entry)
 */
export function AIConsultationLogsPanel({
  logs,
  logListMaxHeight = "max-h-[400px]",
  className,
}: AIConsultationLogsPanelProps) {
  const { t } = useI18n();

  return (
    <div className={cn("space-y-6", className)}>
      {/* panel header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-display text-2xl flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {t("consultation_logs.title")}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("consultation_logs.subtitle")}
          </p>
        </div>

        <span className="text-sm font-mono font-bold text-primary bg-secondary border border-border px-3.5 py-1.5 rounded-xl">
          {t("consultation_logs.total")}: {logs.length}
        </span>
      </div>

      {/* stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <LaserDeviceStats />
        <FitzpatrickDistribution />
        <LaserSafetyCard />
      </div>

      {/* log list */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-foreground">
          {t("consultation_logs.recent")}
        </h4>

        {logs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <p className="text-sm text-muted-foreground">
              {t("consultation_logs.empty")}
            </p>
          </div>
        ) : (
          <div className={cn("space-y-3 overflow-y-auto pr-1", logListMaxHeight)}>
            {logs.map((log) => (
              <AIConsultationLogCard key={log.id} log={log} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
