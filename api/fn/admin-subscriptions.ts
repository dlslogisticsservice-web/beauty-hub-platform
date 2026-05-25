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
    const { data: centers } = await supabaseAdmin.from('centers').select('id, name, owner_id, subscription_plan, subscription_expires_at, created_at').order('created_at', { ascending: false });
    const ownerIds = Array.from(new Set((centers ?? []).map((c: any) => c.owner_id)));
    const { data: profiles } = ownerIds.length ? await supabaseAdmin.from('profiles').select('id, email').in('id', ownerIds) : { data: [] };
    const pMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
    const enriched = (centers ?? []).map((c: any) => ({ ...c, owner_email: (pMap.get(c.owner_id) as any)?.email || '—' }));
    const counts: Record<string, number> = { free: 0, basic: 0, pro: 0, premium: 0 };
    enriched.forEach((c: any) => { counts[c.subscription_plan] = (counts[c.subscription_plan] ?? 0) + 1; });
    jsonOk(res, { centers: enriched, counts });
  } catch (e) { handleError(res, e); }
}
