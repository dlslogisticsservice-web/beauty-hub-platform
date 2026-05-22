import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// WhatsApp Cloud API template sender. No-op (logs only) until env vars are set
// AND feature_flags.whatsapp_notifications = true.

const WA_API = "https://graph.facebook.com/v20.0";

async function isWhatsappEnabled(): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("feature_flags")
    .select("enabled")
    .eq("key", "whatsapp_notifications")
    .maybeSingle();
  return Boolean(data?.enabled);
}

function isWhatsappConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN);
}

async function sendWhatsappTemplate(args: {
  to: string;
  template: string;
  params: string[];
  lang?: string;
}): Promise<{ ok: boolean; error?: string; messageId?: string }> {
  if (!isWhatsappConfigured()) return { ok: false, error: "not_configured" };
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
  const token = process.env.WHATSAPP_ACCESS_TOKEN!;

  const body = {
    messaging_product: "whatsapp",
    to: args.to,
    type: "template",
    template: {
      name: args.template,
      language: { code: args.lang ?? "ar" },
      components: args.params.length
        ? [
            {
              type: "body",
              parameters: args.params.map((p) => ({ type: "text", text: p })),
            },
          ]
        : [],
    },
  };

  const res = await fetch(`${WA_API}/${phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: JSON.stringify(data) };
  return { ok: true, messageId: data?.messages?.[0]?.id };
}

export const sendBookingNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        bookingId: z.string().uuid(),
        template: z.enum([
          "booking_confirmed",
          "booking_reminder",
          "booking_cancelled",
          "booking_completed",
        ]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: booking } = await supabaseAdmin
      .from("bookings")
      .select("id, customer_id, center_id, scheduled_at, service_id")
      .eq("id", data.bookingId)
      .maybeSingle();
    if (!booking) return { ok: false, error: "booking_not_found" };

    // Authorization: only the booking's customer, the center owner, or an admin
    // may trigger a notification for this booking.
    const [{ data: roleRows }, { data: center }] = await Promise.all([
      supabaseAdmin.from("user_roles").select("role").eq("user_id", userId),
      supabaseAdmin
        .from("centers")
        .select("owner_id")
        .eq("id", booking.center_id)
        .maybeSingle(),
    ]);
    const roles = (roleRows ?? []).map((r) => r.role);
    const isAdmin = roles.includes("admin") || roles.includes("super_admin");
    const isOwner = center?.owner_id === userId;
    const isCustomer = booking.customer_id === userId;
    if (!isAdmin && !isOwner && !isCustomer) {
      return { ok: false, error: "forbidden" };
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, phone, whatsapp_opt_in")
      .eq("id", booking.customer_id)
      .maybeSingle();

    if (!profile?.phone || profile.whatsapp_opt_in === false) {
      await supabaseAdmin.from("notifications_log").insert({
        user_id: booking.customer_id,
        booking_id: booking.id,
        channel: "whatsapp",
        template: data.template,
        recipient: profile?.phone ?? null,
        status: "skipped",
        error: !profile?.phone ? "no_phone" : "opted_out",
      });
      return { ok: false, error: "skipped" };
    }

    const enabled = await isWhatsappEnabled();
    if (!enabled || !isWhatsappConfigured()) {
      await supabaseAdmin.from("notifications_log").insert({
        user_id: booking.customer_id,
        booking_id: booking.id,
        channel: "whatsapp",
        template: data.template,
        recipient: profile.phone,
        status: "disabled",
      });
      return { ok: true, queued: false };
    }

    const { data: center } = await supabaseAdmin
      .from("centers")
      .select("name, name_ar")
      .eq("id", booking.center_id)
      .maybeSingle();

    const when = new Date(booking.scheduled_at).toLocaleString("ar-EG");
    const centerName = center?.name_ar || center?.name || "";

    const result = await sendWhatsappTemplate({
      to: profile.phone,
      template: data.template,
      params: [profile.full_name || "", centerName, when],
    });

    await supabaseAdmin.from("notifications_log").insert({
      user_id: booking.customer_id,
      booking_id: booking.id,
      channel: "whatsapp",
      template: data.template,
      recipient: profile.phone,
      status: result.ok ? "sent" : "failed",
      error: result.error,
      payload: { messageId: result.messageId },
    });

    return { ok: result.ok };
  });
