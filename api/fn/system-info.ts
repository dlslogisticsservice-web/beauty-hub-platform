import { getAuthUserId, handleError, jsonOk } from '../_helpers';
import { supabaseAdmin } from '../_supabase';

async function ensureSuperAdmin(userId: string) {
  const { data } = await supabaseAdmin.from('user_roles').select('role').eq('user_id', userId);
  if (!(data ?? []).map((r: any) => r.role).includes('super_admin')) throw new Error('Forbidden');
}

export default async function handler(req: any, res: any) {
  try {
    const userId = await getAuthUserId(req.headers.authorization);
    await ensureSuperAdmin(userId);
    const [{ count: usersCount }, { count: centersCount }, { count: bookingsCount }, commRes, flagsRes, adminsRes, auditRes] = await Promise.all([
      supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('centers').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('bookings').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('bookings').select('commission_amount').eq('status', 'completed'),
      supabaseAdmin.from('feature_flags').select('*').order('key'),
      supabaseAdmin.from('user_roles').select('user_id, role, created_at, profiles:user_id(email, full_name)').in('role', ['admin', 'super_admin']),
      supabaseAdmin.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    const totalCommission = (commRes.data ?? []).reduce((s: number, r: any) => s + (Number(r.commission_amount) || 0), 0);
    jsonOk(res, { stats: { users: usersCount ?? 0, centers: centersCount ?? 0, bookings: bookingsCount ?? 0, commission: totalCommission }, flags: flagsRes.data ?? [], admins: adminsRes.data ?? [], auditLogs: auditRes.data ?? [] });
  } catch (e) { handleError(res, e); }
}
