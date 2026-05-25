import { getAuthUserId, handleError, jsonOk } from '../_helpers';
import { supabaseAdmin } from '../_supabase';

export default async function handler(req: any, res: any) {
  try {
    const userId = await getAuthUserId(req.headers.authorization);
    const { data: center } = await supabaseAdmin.from('centers').select('id, owner_id, country').eq('owner_id', userId).maybeSingle();
    if (!center) return jsonOk(res, { center: null, stats: null, todaysBookings: [] });

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

    const { data: monthBookings } = await supabaseAdmin.from('bookings').select('price_paid, commission_amount, status').eq('center_id', center.id).gte('created_at', monthStart);
    const totalBookings = monthBookings?.length ?? 0;
    const completed = (monthBookings ?? []).filter((b: any) => b.status === 'completed');
    const revenue = completed.reduce((s: number, b: any) => s + Number(b.price_paid), 0);
    const payout = completed.reduce((s: number, b: any) => s + (Number(b.price_paid) - Number(b.commission_amount)), 0);
    const pending = (monthBookings ?? []).filter((b: any) => b.status === 'pending').length;

    const { data: todays } = await supabaseAdmin.from('bookings').select('id, scheduled_at, status, price_paid, customer_id, service_id').eq('center_id', center.id).gte('scheduled_at', todayStart).lt('scheduled_at', tomorrowStart).order('scheduled_at', { ascending: true });
    const customerIds = Array.from(new Set((todays ?? []).map((b: any) => b.customer_id)));
    const serviceIds = Array.from(new Set((todays ?? []).map((b: any) => b.service_id)));
    const [{ data: profiles }, { data: services }] = await Promise.all([
      customerIds.length ? supabaseAdmin.from('profiles').select('id, full_name, email').in('id', customerIds) : Promise.resolve({ data: [] }),
      serviceIds.length ? supabaseAdmin.from('services').select('id, name').in('id', serviceIds) : Promise.resolve({ data: [] }),
    ]);
    const pMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
    const sMap = new Map((services ?? []).map((s: any) => [s.id, s]));
    const todaysBookings = (todays ?? []).map((b: any) => ({ ...b, customer_name: (pMap.get(b.customer_id) as any)?.full_name || (pMap.get(b.customer_id) as any)?.email || 'Customer', service_name: (sMap.get(b.service_id) as any)?.name || 'Service' }));

    jsonOk(res, { center: { id: center.id, country: center.country }, stats: { totalBookings, revenue, payout, pending }, todaysBookings });
  } catch (e) { handleError(res, e); }
}
