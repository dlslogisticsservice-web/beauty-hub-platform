import { getAuthUserId, handleError, jsonOk } from '../_helpers';
import { supabaseAdmin } from '../_supabase';

export default async function handler(req: any, res: any) {
  try {
    const userId = await getAuthUserId(req.headers.authorization);
    const { data, error } = await supabaseAdmin.from('centers').select('*').eq('owner_id', userId).maybeSingle();
    if (error) throw new Error(error.message);
    jsonOk(res, { center: data });
  } catch (e) { handleError(res, e); }
}
