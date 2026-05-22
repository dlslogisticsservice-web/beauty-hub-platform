// Paymob Accept API client (browser-safe wrapper).
// Activates only when feature_flags.payment_gateway = true AND env vars are set.

const BASE = "https://accept.paymob.com/api";

async function getToken(): Promise<string> {
  const res = await fetch(`${BASE}/auth/tokens`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: import.meta.env.VITE_PAYMOB_API_KEY }),
  });
  if (!res.ok) throw new Error("Paymob auth failed");
  const data = await res.json();
  return data.token as string;
}

async function createOrder(token: string, amountCents: number, currency: string): Promise<number> {
  const res = await fetch(`${BASE}/ecommerce/orders`, {
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
  if (!res.ok) throw new Error("Paymob order failed");
  const data = await res.json();
  return data.id as number;
}

async function getPaymentKey(
  token: string,
  orderId: number,
  amountCents: number,
  currency: string,
  integrationId: number,
  billing: Record<string, string>,
): Promise<string> {
  const res = await fetch(`${BASE}/acceptance/payment_keys`, {
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
  if (!res.ok) throw new Error("Paymob payment key failed");
  const data = await res.json();
  return data.token as string;
}

export async function initiatePaymobPayment(params: {
  amountCents: number;
  currency: "EGP" | "SAR";
  country: "EG" | "SA";
  paymentMethod: "card" | "wallet";
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  bookingId: string;
}): Promise<{ iframeUrl: string; orderId: number }> {
  const token = await getToken();
  const orderId = await createOrder(token, params.amountCents, params.currency);

  const integrationId =
    params.paymentMethod === "wallet"
      ? Number(import.meta.env.VITE_PAYMOB_INTEGRATION_ID_WALLET_EG)
      : params.country === "SA"
        ? Number(import.meta.env.VITE_PAYMOB_INTEGRATION_ID_CARD_SA)
        : Number(import.meta.env.VITE_PAYMOB_INTEGRATION_ID_CARD_EG);

  const parts = (params.customerName || "Customer User").trim().split(/\s+/);
  const billing = {
    apartment: "NA",
    email: params.customerEmail || "noreply@beautyhub.app",
    floor: "NA",
    first_name: parts[0] || "Customer",
    last_name: parts.slice(1).join(" ") || "User",
    street: "NA",
    building: "NA",
    phone_number: params.customerPhone || "+200000000000",
    shipping_method: "NA",
    postal_code: "NA",
    city: "NA",
    country: params.country,
    state: "NA",
  };

  const paymentKey = await getPaymentKey(
    token,
    orderId,
    params.amountCents,
    params.currency,
    integrationId,
    billing,
  );

  const iframeId = import.meta.env.VITE_PAYMOB_IFRAME_ID;
  const iframeUrl = `https://accept.paymob.com/api/acceptance/iframes/${iframeId}?payment_token=${paymentKey}`;
  return { iframeUrl, orderId };
}

export function isPaymobConfigured(): boolean {
  return Boolean(
    import.meta.env.VITE_PAYMOB_API_KEY &&
      import.meta.env.VITE_PAYMOB_IFRAME_ID &&
      import.meta.env.VITE_PAYMOB_API_KEY !== "your_paymob_api_key",
  );
}
