import { getAuthUserId, handleError, jsonOk } from '../_helpers';
import { supabaseAdmin } from '../_supabase';

export default async function handler(req: any, res: any) {
  try {
    const userId = await getAuthUserId(req.headers.authorization);
    const { data: center } = await supabaseAdmin.from('centers').select('id, owner_id, country').eq('owner_id', userId).maybeSingle();
    if (!center) return jsonOk(res, { bookings: [], country: 'EG' });

    const { status, from, to, search } = req.query ?? {};
    let q = supabaseAdmin.from('bookings').select('id, scheduled_at, status, price_paid, commission_amount, customer_id, service_id, created_at').eq('center_id', center.id).order('scheduled_at', { ascending: false });
    if (status && status !== 'all') q = q.eq('status', status);
    if (from) q = q.gte('scheduled_at', new Date(from).toISOString());
    if (to) q = q.lte('scheduled_at', new Date(to).toISOString());

    const { data: rows } = await q;
    const customerIds = Array.from(new Set((rows ?? []).map((b: any) => b.customer_id)));
    const serviceIds = Array.from(new Set((rows ?? []).map((b: any) => b.service_id)));
    const [{ data: profiles }, { data: services }] = await Promise.all([
      customerIds.length ? supabaseAdmin.from('profiles').select('id, full_name, email').in('id', customerIds) : Promise.resolve({ data: [] }),
      serviceIds.length ? supabaseAdmin.from('services').select('id, name').in('id', serviceIds) : Promise.resolve({ data: [] }),
    ]);
    const pMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
    const sMap = new Map((services ?? []).map((s: any) => [s.id, s]));
    let bookings = (rows ?? []).map((b: any) => ({ id: b.id, scheduled_at: b.scheduled_at, status: b.status, price_paid: b.price_paid, payout: Number(b.price_paid) - Number(b.commission_amount), customer_id: b.customer_id, service_id: b.service_id, created_at: b.created_at, customer_name: (pMap.get(b.customer_id) as any)?.full_name || (pMap.get(b.customer_id) as any)?.email || 'Customer', service_name: (sMap.get(b.service_id) as any)?.name || 'Service' }));
    if (search) { const s = search.toLowerCase(); bookings = bookings.filter((b: any) => b.customer_name.toLowerCase().includes(s)); }
    jsonOk(res, { bookings, country: center.country ?? 'EG' });
  } catch (e) { handleError(res, e); }
}
