import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Server-only Paymob integration. All secret keys are read from process.env
// inside the handler so they are never bundled into the client.

const BASE = "https://accept.paymob.com/api";

function readPaymobEnv() {
  const apiKey = process.env.PAYMOB_API_KEY;
  const iframeId = process.env.PAYMOB_IFRAME_ID;
  const cardEg = process.env.PAYMOB_INTEGRATION_ID_CARD_EG;
  const walletEg = process.env.PAYMOB_INTEGRATION_ID_WALLET_EG;
  const cardSa = process.env.PAYMOB_INTEGRATION_ID_CARD_SA;
  return { apiKey, iframeId, cardEg, walletEg, cardSa };
}

export const isPaymobConfiguredFn = createServerFn({ method: "GET" }).handler(async () => {
  const { apiKey, iframeId } = readPaymobEnv();
  return { configured: Boolean(apiKey && iframeId) };
});

const InitiateInput = z.object({
  bookingId: z.string().uuid(),
  paymentMethod: z.enum(["card", "wallet"]),
});

export const initiatePaymobPaymentFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InitiateInput.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { apiKey, iframeId, cardEg, walletEg, cardSa } = readPaymobEnv();
    if (!apiKey || !iframeId) {
      return { ok: false as const, error: "payment_not_configured" };
    }

    // Load booking and verify ownership server-side.
    const { data: booking, error: bErr } = await supabaseAdmin
      .from("bookings")
      .select("id, customer_id, center_id, price_paid, currency")
      .eq("id", data.bookingId)
      .maybeSingle();
    if (bErr || !booking) return { ok: false as const, error: "booking_not_found" };
    if (booking.customer_id !== userId) return { ok: false as const, error: "forbidden" };

    const { data: center } = await supabaseAdmin
      .from("centers")
      .select("country")
      .eq("id", booking.center_id)
      .maybeSingle();
    const country = (center?.country ?? "EG") as "EG" | "SA";
    const currency = (booking.currency ?? (country === "SA" ? "SAR" : "EGP")) as "EGP" | "SAR";

    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("full_name, email, phone")
      .eq("id", userId)
      .maybeSingle();

    const integrationId =
      data.paymentMethod === "wallet"
        ? Number(walletEg)
        : country === "SA"
          ? Number(cardSa)
          : Number(cardEg);
    if (!integrationId) return { ok: false as const, error: "integration_not_configured" };

    const amountCents = Math.round(Number(booking.price_paid) * 100);

    // 1. auth
    const authRes = await fetch(`${BASE}/auth/tokens`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: apiKey }),
    });
    if (!authRes.ok) return { ok: false as const, error: "paymob_auth_failed" };
    const token = (await authRes.json()).token as string;

    // 2. order
    const orderRes = await fetch(`${BASE}/ecommerce/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        auth_token: token,
        delivery_needed: false,
        amount_cents: amountCents,
        currency,
        items: [],
      }),
    });
    if (!orderRes.ok) return { ok: false as const, error: "paymob_order_failed" };
    const orderId = (await orderRes.json()).id as number;

    // 3. payment key
    const parts = (prof?.full_name || "Customer User").trim().split(/\s+/);
    const billing = {
      apartment: "NA",
      email: prof?.email || "noreply@beautyhub.app",
      floor: "NA",
      first_name: parts[0] || "Customer",
      last_name: parts.slice(1).join(" ") || "User",
      street: "NA",
      building: "NA",
      phone_number: prof?.phone || "+200000000000",
      shipping_method: "NA",
      postal_code: "NA",
      city: "NA",
      country,
      state: "NA",
    };
    const keyRes = await fetch(`${BASE}/acceptance/payment_keys`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        auth_token: token,
        amount_cents: amountCents,
        expiration: 3600,
        order_id: orderId,
        billing_data: billing,
        currency,
        integration_id: integrationId,
      }),
    });
    if (!keyRes.ok) return { ok: false as const, error: "paymob_key_failed" };
    const paymentKey = (await keyRes.json()).token as string;

    // Persist order id server-side (admin bypasses RLS).
    await supabaseAdmin
      .from("bookings")
      .update({ paymob_order_id: orderId })
      .eq("id", booking.id);

    const iframeUrl = `https://accept.paymob.com/api/acceptance/iframes/${iframeId}?payment_token=${paymentKey}`;
    return { ok: true as const, iframeUrl };
  });
