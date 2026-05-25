import { getAuthUserId, handleError, jsonOk } from '../_helpers';
import { supabaseAdmin } from '../_supabase';

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin.from('user_roles').select('role').eq('user_id', userId).in('role', ['admin', 'super_admin']).maybeSingle();
  if (!data) throw new Error('Forbidden');
}

export default async function handler(req: any, res: any) {
  try {
    const userId = await getAuthUserId(req.headers.authorization);
    await assertAdmin(userId);

    const [{ count: totalBookings }, { data: completed }, { count: activeCenters }] = await Promise.all([
      supabaseAdmin.from('bookings').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('bookings').select('price_paid, commission_amount, created_at').eq('status', 'completed'),
      supabaseAdmin.from('centers').select('id', { count: 'exact', head: true }).eq('is_active', true).eq('is_verified', true),
    ]);

    const revenue = (completed ?? []).reduce((s: number, b: any) => s + Number(b.commission_amount), 0);
    const gross = (completed ?? []).reduce((s: number, b: any) => s + Number(b.price_paid), 0);

    const now = new Date();
    const months: { month: string; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString('en', { month: 'short', year: '2-digit' });
      const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const sum = (completed ?? []).filter((b: any) => { const t = new Date(b.created_at); return t >= d && t < next; }).reduce((s: number, b: any) => s + Number(b.commission_amount), 0);
      months.push({ month: label, revenue: Math.round(sum * 100) / 100 });
    }

    const { data: recent } = await supabaseAdmin.from('bookings').select('id, scheduled_at, status, price_paid, commission_amount, currency, customer_id, service_id, center_id, created_at').order('created_at', { ascending: false }).limit(10);
    const cIds = Array.from(new Set((recent ?? []).map((r: any) => r.center_id)));
    const uIds = Array.from(new Set((recent ?? []).map((r: any) => r.customer_id)));
    const sIds = Array.from(new Set((recent ?? []).map((r: any) => r.service_id)));
    const [{ data: centers }, { data: profiles }, { data: services }] = await Promise.all([
      cIds.length ? supabaseAdmin.from('centers').select('id, name, slug, country').in('id', cIds) : Promise.resolve({ data: [] }),
      uIds.length ? supabaseAdmin.from('profiles').select('id, full_name, email').in('id', uIds) : Promise.resolve({ data: [] }),
      sIds.length ? supabaseAdmin.from('services').select('id, name').in('id', sIds) : Promise.resolve({ data: [] }),
    ]);
    const cMap = new Map((centers ?? []).map((c: any) => [c.id, c]));
    const pMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
    const sMap = new Map((services ?? []).map((s: any) => [s.id, s]));
    const recentBookings = (recent ?? []).map((b: any) => ({ ...b, center_name: cMap.get(b.center_id)?.name || '—', center_slug: (cMap.get(b.center_id) as any)?.slug, country: (cMap.get(b.center_id) as any)?.country ?? 'EG', customer_name: pMap.get(b.customer_id)?.full_name || (pMap.get(b.customer_id) as any)?.email || 'Customer', service_name: (sMap.get(b.service_id) as any)?.name || '—' }));

    jsonOk(res, { stats: { totalBookings: totalBookings ?? 0, revenue, gross, activeCenters: activeCenters ?? 0 }, months, recentBookings });
  } catch (e) { handleError(res, e); }
}
