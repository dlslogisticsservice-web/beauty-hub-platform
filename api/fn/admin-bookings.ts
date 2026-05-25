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
    const { status, centerId } = req.query ?? {};
    let q = supabaseAdmin.from('bookings').select('id, scheduled_at, status, price_paid, commission_amount, currency, customer_id, service_id, center_id, created_at').order('scheduled_at', { ascending: false }).limit(200);
    if (status && status !== 'all') q = q.eq('status', status);
    if (centerId && centerId !== 'all') q = q.eq('center_id', centerId);
    const { data: rows } = await q;
    const cIds = Array.from(new Set((rows ?? []).map((r: any) => r.center_id)));
    const uIds = Array.from(new Set((rows ?? []).map((r: any) => r.customer_id)));
    const sIds = Array.from(new Set((rows ?? []).map((r: any) => r.service_id)));
    const [{ data: centers }, { data: profiles }, { data: services }, { data: allCenters }] = await Promise.all([
      cIds.length ? supabaseAdmin.from('centers').select('id, name, slug, country').in('id', cIds) : Promise.resolve({ data: [] }),
      uIds.length ? supabaseAdmin.from('profiles').select('id, full_name, email').in('id', uIds) : Promise.resolve({ data: [] }),
      sIds.length ? supabaseAdmin.from('services').select('id, name').in('id', sIds) : Promise.resolve({ data: [] }),
      supabaseAdmin.from('centers').select('id, name').order('name'),
    ]);
    const cMap = new Map((centers ?? []).map((c: any) => [c.id, c]));
    const pMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
    const sMap = new Map((services ?? []).map((s: any) => [s.id, s]));
    const bookings = (rows ?? []).map((b: any) => ({ ...b, center_name: (cMap.get(b.center_id) as any)?.name || '—', center_slug: (cMap.get(b.center_id) as any)?.slug, country: (cMap.get(b.center_id) as any)?.country ?? 'EG', customer_name: (pMap.get(b.customer_id) as any)?.full_name || (pMap.get(b.customer_id) as any)?.email || 'Customer', service_name: (sMap.get(b.service_id) as any)?.name || '—' }));
    jsonOk(res, { bookings, allCenters: allCenters ?? [] });
  } catch (e) { handleError(res, e); }
}
