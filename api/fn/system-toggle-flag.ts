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
    const { key, enabled } = req.body ?? {};
    if (!key || enabled === undefined) return res.status(400).json({ error: 'Missing key or enabled' });
    const { error } = await supabaseAdmin.from('feature_flags').update({ enabled }).eq('key', key);
    if (error) throw new Error(error.message);
    jsonOk(res, { ok: true });
  } catch (e) { handleError(res, e); }
}