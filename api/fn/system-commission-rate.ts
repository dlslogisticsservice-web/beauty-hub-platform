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
    const { centerId, rate } = req.body ?? {};
    if (!centerId || rate === undefined) return res.status(400).json({ error: 'Missing centerId or rate' });
    const { error } = await supabaseAdmin.from('centers').update({ commission_rate: rate }).eq('id', centerId);
    if (error) throw new Error(error.message);
    jsonOk(res, { ok: true });
  } catch (e) { handleError(res, e); }
}