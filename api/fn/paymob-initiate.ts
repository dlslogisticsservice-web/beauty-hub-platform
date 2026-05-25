import { getAuthUserId, handleError, jsonOk } from '../_helpers';
import { supabaseAdmin } from '../_supabase';

const BASE = 'https://accept.paymob.com/api';

export default async function handler(req: any, res: any) {
  try {
    const userId = await getAuthUserId(req.headers.authorization);
    const { bookingId, paymentMethod } = req.body ?? {};
    if (!bookingId || !paymentMethod) return res.status(400).json({ error: 'Missing bookingId or paymentMethod' });

    const apiKey = process.env.PAYMOB_API_KEY;
    const iframeId = process.env.PAYMOB_IFRAME_ID;
    const cardEg = process.env.PAYMOB_INTEGRATION_ID_CARD_EG;
    const walletEg = process.env.PAYMOB_INTEGRATION_ID_WALLET_EG;
    const cardSa = process.env.PAYMOB_INTEGRATION_ID_CARD_SA;
    if (!apiKey || !iframeId) return jsonOk(res, { ok: false, error: 'payment_not_configured' });

    const { data: booking, error: bErr } = await supabaseAdmin.from('bookings').select('id, customer_id, center_id, price_paid, currency').eq('id', bookingId).maybeSingle();
    if (bErr || !booking) return jsonOk(res, { ok: false, error: 'booking_not_found' });
    if (booking.customer_id !== userId) return jsonOk(res, { ok: false, error: 'forbidden' });

    const { data: center } = await supabaseAdmin.from('centers').select('country').eq('id', booking.center_id).maybeSingle();
    const country = (center?.country ?? 'EG') as 'EG' | 'SA';
    const currency = (booking.currency ?? (country === 'SA' ? 'SAR' : 'EGP')) as string;
    const { data: prof } = await supabaseAdmin.from('profiles').select('full_name, email, phone').eq('id', userId).maybeSingle();

    const integrationId = paymentMethod === 'wallet' ? Number(walletEg) : country === 'SA' ? Number(cardSa) : Number(cardEg);
    if (!integrationId) return jsonOk(res, { ok: false, error: 'integration_not_configured' });

    const amountCents = Math.round(Number(booking.price_paid) * 100);

    const authRes = await fetch(`${BASE}/auth/tokens`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ api_key: apiKey }) });
    if (!authRes.ok) return jsonOk(res, { ok: false, error: 'paymob_auth_failed' });
    const token = (await authRes.json()).token as string;

    const orderRes = await fetch(`${BASE}/ecommerce/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ auth_token: token, delivery_needed: false, amount_cents: amountCents, currency, items: [] }) });
    if (!orderRes.ok) return jsonOk(res, { ok: false, error: 'paymob_order_failed' });
    const orderId = (await orderRes.json()).id as number;

    const parts = ((prof as any)?.full_name || 'Customer User').trim().split(/\s+/);
    const billing = { apartment: 'NA', email: (prof as any)?.email || 'noreply@beautyhub.app', floor: 'NA', first_name: parts[0] || 'Customer', last_name: parts.slice(1).join(' ') || 'User', street: 'NA', building: 'NA', phone_number: (prof as any)?.phone || '+200000000000', shipping_method: 'NA', postal_code: 'NA', city: 'NA', country, state: 'NA' };
    const keyRes = await fetch(`${BASE}/acceptance/payment_keys`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ auth_token: token, amount_cents: amountCents, expiration: 3600, order_id: orderId, billing_data: billing, currency, integration_id: integrationId }) });
    if (!keyRes.ok) return jsonOk(res, { ok: false, error: 'paymob_key_failed' });
    const paymentKey = (await keyRes.json()).token as string;

    await supabaseAdmin.from('bookings').update({ paymob_order_id: orderId }).eq('id', booking.id);
    const iframeUrl = `https://accept.paymob.com/api/acceptance/iframes/${iframeId}?payment_token=${paymentKey}`;
    jsonOk(res, { ok: true, iframeUrl });
  } catch (e) { handleError(res, e); }
}
