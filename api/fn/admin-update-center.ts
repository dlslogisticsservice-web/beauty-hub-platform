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
    const { id, ...patch } = req.body ?? {};
    if (!id) return res.status(400).json({ error: 'Missing id' });
    const { error } = await supabaseAdmin.from('centers').update(patch).eq('id', id);
    if (error) throw new Error(error.message);
    jsonOk(res, { ok: true });
  } catch (e) { handleError(res, e); }
}
