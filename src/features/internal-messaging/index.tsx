/**
 * Internal messaging UI components.
 *
 * Adapted from the reference AdminPanel (messaging + moderation tabs) and
 * CenterOwnersPanel (messaging tab).  All brand-* CSS replaced with current
 * theme tokens; TRANSLATIONS[lang] replaced with useI18n().
 *
 * No Supabase integration — components are pure presentation + local state.
 * Persistence is the caller's responsibility via the onSend callback.
 *
 * Exports
 * ───────
 *  InternalMessage       shared type
 *  MessageType           "update" | "reminder" | "offer" | "general"
 *  RecipientType         "all_customers" | "all_centers"
 *  MessageStatus         "pending" | "approved" | "rejected"
 *  MessageStatusBadge    status pill
 *  MessageComposer       compose form
 *  MessageList           scrollable list of messages
 */

import { useState } from "react";
import {
  Send, Clock, CheckCheck, XCircle,
  AlertCircle, Mail, Inbox,
} from "lucide-react";
import type { ReactNode } from "react";
import { useI18n } from "@/hooks/use-i18n";
import { cn } from "@/lib/utils";

// ── domain types ──────────────────────────────────────────────────────────

export type MessageType   = "update" | "reminder" | "offer" | "general";
export type RecipientType = "all_customers" | "all_centers";
export type MessageStatus = "pending" | "approved" | "rejected";

export interface InternalMessage {
  id: string;
  senderType: "admin" | "center";
  /** Display name of the sender (center name or "Admin"). */
  senderName: string;
  recipientType: RecipientType;
  /** Human-readable recipient label. */
  recipientName: string;
  msgType: MessageType;
  title: string;
  content: string;
  status: MessageStatus;
  /** ISO timestamp string. */
  createdAt: string;
}

// ── MessageStatusBadge ────────────────────────────────────────────────────

interface MessageStatusBadgeProps { status: MessageStatus }

const STATUS_BADGE_MAP: Record<
  MessageStatus,
  { icon: ReactNode; cls: string; i18nKey: string }
> = {
  pending:  {
    icon:    <Clock     className="w-3 h-3" />,
    cls:     "bg-yellow-500/10 text-yellow-700 border-yellow-500/25",
    i18nKey: "messaging.status_pending",
  },
  approved: {
    icon:    <CheckCheck className="w-3 h-3" />,
    cls:     "bg-emerald-500/10 text-emerald-700 border-emerald-500/25",
    i18nKey: "messaging.status_approved",
  },
  rejected: {
    icon:    <XCircle   className="w-3 h-3" />,
    cls:     "bg-red-500/10 text-red-600 border-red-500/25",
    i18nKey: "messaging.status_rejected",
  },
};

export function MessageStatusBadge({ status }: MessageStatusBadgeProps) {
  const { t } = useI18n();
  const { icon, cls, i18nKey } = STATUS_BADGE_MAP[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-semibold",
        cls,
      )}
    >
      {icon}
      {t(i18nKey)}
    </span>
  );
}

// ── MessageTypeBadge (internal) ───────────────────────────────────────────

const TYPE_STYLES: Record<MessageType, string> = {
  update:   "bg-blue-500/10   text-blue-700   border-blue-500/25",
  reminder: "bg-teal-500/10   text-teal-700   border-teal-500/25",
  offer:    "bg-orange-500/10 text-orange-700 border-orange-500/25",
  general:  "bg-slate-500/10  text-slate-600  border-slate-500/25",
};

function MsgTypeBadge({ type, label }: { type: MessageType; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide",
        TYPE_STYLES[type],
      )}
    >
      {label}
    </span>
  );
}

// ── MessageComposer ───────────────────────────────────────────────────────

export interface MessageComposerProps {
  /**
   * Called when the user submits a valid draft.
   * The component resets its own fields after calling this.
   * The caller is responsible for assigning id, createdAt, and status.
   */
  onSend: (draft: Omit<InternalMessage, "id" | "createdAt" | "status">) => void;
  senderType: "admin" | "center";
  senderName: string;
  /**
   * When true, the Recipients dropdown shows both
   * all_customers AND all_centers.  Intended for admin senders.
   */
  showAllRecipients?: boolean;
  className?: string;
}

export function MessageComposer({
  onSend,
  senderType,
  senderName,
  showAllRecipients = false,
  className,
}: MessageComposerProps) {
  const { t } = useI18n();

  const [recipientType, setRecipientType] = useState<RecipientType>("all_customers");
  const [msgType,       setMsgType]       = useState<MessageType>("general");
  const [title,         setTitle]         = useState("");
  const [content,       setContent]       = useState("");

  const MSG_TYPES: { value: MessageType; label: string }[] = [
    { value: "update",   label: t("messaging.type_update")   },
    { value: "reminder", label: t("messaging.type_reminder") },
    { value: "offer",    label: t("messaging.type_offer")    },
    { value: "general",  label: t("messaging.type_general")  },
  ];

  const RECIPIENTS: { value: RecipientType; label: string }[] = [
    { value: "all_customers", label: t("messaging.all_customers") },
    ...(showAllRecipients
      ? [{ value: "all_centers" as RecipientType, label: t("messaging.all_centers") }]
      : []),
  ];

  const inputCls =
    "w-full rounded-xl border border-border bg-background px-3.5 py-2.5 " +
    "text-sm text-foreground placeholder:text-muted-foreground " +
    "focus:outline-none focus:ring-1 focus:ring-primary transition";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    const recipientName =
      RECIPIENTS.find((r) => r.value === recipientType)?.label ?? recipientType;

    onSend({
      senderType,
      senderName,
      recipientType,
      recipientName,
      msgType,
      title:   title.trim(),
      content: content.trim(),
    });

    setTitle("");
    setContent("");
  };

  return (
    <div
      className={cn("rounded-2xl border border-border bg-card p-5 shadow-soft", className)}
    >
      {/* header */}
      <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-4">
        <Send className="w-4 h-4 text-primary" />
        {t("messaging.compose")}
      </h3>

      {/* center-sender notice — messages require admin approval */}
      {senderType === "center" && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-400">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>{t("messaging.status_pending")}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* recipients */}
        {showAllRecipients && (
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              {t("messaging.recipients")}
            </label>
            <select
              value={recipientType}
              onChange={(e) => setRecipientType(e.target.value as RecipientType)}
              className={inputCls}
            >
              {RECIPIENTS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* message type grid */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            {t("messaging.msg_type")}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {MSG_TYPES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setMsgType(value)}
                className={cn(
                  "py-2 rounded-xl border text-xs font-semibold transition",
                  msgType === value
                    ? "bg-primary/10 border-primary text-primary"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-primary/40",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* subject */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            {t("messaging.subject")}
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputCls}
          />
        </div>

        {/* body */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            {t("messaging.body")}
          </label>
          <textarea
            required
            rows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className={cn(inputCls, "resize-none")}
          />
        </div>

        <button
          type="submit"
          className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition"
        >
          <Send className="w-4 h-4" />
          {t("messaging.send")}
        </button>
      </form>
    </div>
  );
}

// ── MessageList ───────────────────────────────────────────────────────────

export interface MessageListProps {
  messages: InternalMessage[];
  /** Max-height Tailwind class — defaults to "max-h-[460px]". */
  maxHeight?: string;
  className?: string;
}

/**
 * Scrollable list of InternalMessages with status + type badges.
 *
 * Covers both the admin outbox and the center owner message history
 * from the reference panel.
 */
export function MessageList({
  messages,
  maxHeight = "max-h-[460px]",
  className,
}: MessageListProps) {
  const { t } = useI18n();

  const TYPE_LABELS: Record<MessageType, string> = {
    update:   t("messaging.type_update"),
    reminder: t("messaging.type_reminder"),
    offer:    t("messaging.type_offer"),
    general:  t("messaging.type_general"),
  };

  if (messages.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card p-10 text-center",
          className,
        )}
      >
        <Inbox className="w-8 h-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{t("messaging.empty")}</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3 overflow-y-auto pr-1", maxHeight, className)}>
      {messages.map((msg) => (
        <div
          key={msg.id}
          className="rounded-2xl border border-border bg-card p-4 space-y-2"
        >
          {/* top row: type badge + title + status + time */}
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <MsgTypeBadge type={msg.msgType} label={TYPE_LABELS[msg.msgType]} />
                <span className="text-sm font-semibold text-foreground truncate">
                  {msg.title}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("messaging.to")}: {msg.recipientName}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <MessageStatusBadge status={msg.status} />
              <span className="text-[10px] text-muted-foreground font-mono">
                {new Date(msg.createdAt).toLocaleTimeString(undefined, {
                  hour:   "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>

          {/* content */}
          <p className="text-sm text-foreground/80 leading-relaxed border-t border-border pt-2">
            {msg.content}
          </p>

          {/* sender */}
          <p className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
            <Mail className="w-3 h-3" />
            {msg.senderName}
          </p>
        </div>
      ))}
    </div>
  );
}
