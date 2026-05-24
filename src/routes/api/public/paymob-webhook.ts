import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Paymob processed-transaction callback. Configure in Paymob dashboard:
//   https://project--e5398eca-6f44-41b9-9a96-7d3178db1f63.lovable.app/api/public/paymob-webhook

// Paymob HMAC field order (Accept API processed-transaction callback).
const HMAC_FIELDS = [
  "amount_cents",
  "created_at",
  "currency",
  "error_occured",
  "has_parent_transaction",
  "id",
  "integration_id",
  "is_3d_secure",
  "is_auth",
  "is_capture",
  "is_refunded",
  "is_standalone_payment",
  "is_voided",
  "order.id",
  "owner",
  "pending",
  "source_data.pan",
  "source_data.sub_type",
  "source_data.type",
  "success",
];

function get(obj: Record<string, unknown>, path: string): string {
  return path
    .split(".")
    .reduce<unknown>((a, k) => (a && typeof a === "object" ? (a as Record<string, unknown>)[k] : undefined), obj) === undefined
    ? ""
    : String(
        path
          .split(".")
          .reduce<unknown>(
            (a, k) => (a && typeof a === "object" ? (a as Record<string, unknown>)[k] : undefined),
            obj,
          ),
      );
}

function verifyHmac(payload: Record<string, unknown>, signature: string): boolean {
  const secret = process.env.PAYMOB_HMAC_SECRET;
  if (!secret || !signature) return false;
  const obj = (payload.obj ?? payload) as Record<string, unknown>;
  const concat = HMAC_FIELDS.map((f) => get(obj, f)).join("");
  const expected = createHmac("sha512", secret).update(concat).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export const Route = createFileRoute("/api/public/paymob-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const origin = process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : process.env.PUBLIC_URL ?? "http://localhost:3000";
        const url = new URL(request.url || "/", origin);
        const hmac = url.searchParams.get("hmac") ?? "";
        const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

        if (!verifyHmac(body, hmac)) {
          return new Response("Invalid signature", { status: 401 });
        }

        const obj = (body.obj ?? body) as Record<string, unknown>;
        const success = Boolean(obj.success);
        const orderId = Number((obj as { order?: { id?: number } }).order?.id ?? 0);
        const txId = String(obj.id ?? "");

        if (!orderId) return new Response("ok");

        const { data: booking } = await supabaseAdmin
          .from("bookings")
          .select("id")
          .eq("paymob_order_id", orderId)
          .maybeSingle();

        if (booking) {
          await supabaseAdmin
            .from("bookings")
            .update({
              payment_status: success ? "paid" : "failed",
              payment_ref: txId,
              status: success ? "confirmed" : "pending",
            })
            .eq("id", booking.id);
        }

        return new Response("ok");
      },
    },
  },
});
