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
    const { data: centers } = await supabaseAdmin.from('centers').select('*').order('created_at', { ascending: false });
    const ownerIds = Array.from(new Set((centers ?? []).map((c: any) => c.owner_id)));
    const { data: profiles } = ownerIds.length ? await supabaseAdmin.from('profiles').select('id, email, full_name').in('id', ownerIds) : { data: [] };
    const pMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
    jsonOk(res, { centers: (centers ?? []).map((c: any) => ({ ...c, owner_email: (pMap.get(c.owner_id) as any)?.email || '—' })) });
  } catch (e) { handleError(res, e); }
}
