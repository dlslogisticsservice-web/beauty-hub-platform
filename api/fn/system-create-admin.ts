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
    const { email, password, role = 'admin' } = req.body ?? {};
    if (!email || !password) return res.status(400).json({ error: 'Missing email or password' });
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) throw new Error(error.message);
    if (created.user) {
      await supabaseAdmin.from('user_roles').delete().eq('user_id', created.user.id);
      await supabaseAdmin.from('user_roles').insert({ user_id: created.user.id, role });
    }
    jsonOk(res, { ok: true });
  } catch (e) { handleError(res, e); }
}