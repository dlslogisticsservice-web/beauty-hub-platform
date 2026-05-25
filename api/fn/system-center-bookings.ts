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
    const { centerId } = req.query ?? {};
    if (!centerId) return res.status(400).json({ error: 'Missing centerId' });
    const { data: rows } = await supabaseAdmin.from('bookings').select('id, scheduled_at, price_paid, commission_amount, status, currency, services(name), profiles:customer_id(full_name, email)').eq('center_id', centerId).order('scheduled_at', { ascending: false }).limit(100);
    jsonOk(res, { bookings: rows ?? [] });
  } catch (e) { handleError(res, e); }
}