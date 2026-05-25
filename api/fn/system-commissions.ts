import { getAuthUserId, handleError, jsonOk } from '../_helpers';
import { supabaseAdmin } from '../_supabase';

async function ensureAnyAdmin(userId: string) {
  const { data } = await supabaseAdmin.from('user_roles').select('role').eq('user_id', userId);
  const roles = (data ?? []).map((r: any) => r.role);
  if (!roles.includes('admin') && !roles.includes('super_admin')) throw new Error('Forbidden');
}

export default async function handler(req: any, res: any) {
  try {
    const userId = await getAuthUserId(req.headers.authorization);
    await ensureAnyAdmin(userId);
    const [{ data: allBookings }, { data: centers }] = await Promise.all([
      supabaseAdmin.from('bookings').select('id, center_id, price_paid, commission_amount, commission_rate, status, created_at, scheduled_at, customer_id, service_id, currency'),
      supabaseAdmin.from('centers').select('id, name, country, subscription_plan, commission_rate'),
    ]);
    const bookings = allBookings ?? [];
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
    const totalCommission = bookings.filter((b: any) => b.status === 'completed').reduce((s: number, b: any) => s + (b.commission_amount || 0), 0);
    const thisMonth = bookings.filter((b: any) => b.status === 'completed' && new Date(b.created_at) >= monthStart).reduce((s: number, b: any) => s + (b.commission_amount || 0), 0);
    const pending = bookings.filter((b: any) => b.status === 'pending' || b.status === 'confirmed').reduce((s: number, b: any) => s + (b.commission_amount || 0), 0);
    const avgRate = (centers ?? []).length ? (centers ?? []).reduce((s: number, c: any) => s + (c.commission_rate || 0), 0) / (centers ?? []).length : 0;
    const byCenter = new Map<string, any>();
    for (const c of centers ?? []) byCenter.set(c.id, { id: c.id, name: c.name, country: c.country, plan: c.subscription_plan, rate: c.commission_rate, totalBookings: 0, totalEarned: 0, pendingAmount: 0 });
    for (const b of bookings) { const row = byCenter.get(b.center_id); if (!row) continue; row.totalBookings += 1; if (b.status === 'completed') row.totalEarned += b.commission_amount || 0; if (b.status === 'pending' || b.status === 'confirmed') row.pendingAmount += b.commission_amount || 0; }
    jsonOk(res, { stats: { totalCommission, thisMonth, pending, avgRate }, centers: Array.from(byCenter.values()).sort((a, b) => b.totalEarned - a.totalEarned) });
  } catch (e) { handleError(res, e); }
}