import { handleError, jsonOk } from '../_helpers';
import { supabaseAdmin } from '../_supabase';

const CENTER_COLS = 'id, name, name_ar, slug, description, description_ar, city, address, phone, logo_url, cover_url, subscription_plan, country, rating_avg, rating_count, is_verified';

export default async function handler(req: any, res: any) {
  try {
    const { city, country, category, search, sort, limit } = req.query ?? {};
    let q = supabaseAdmin.from('centers').select(CENTER_COLS).eq('is_active', true);
    if (city) q = q.eq('city', city);
    if (country) q = q.eq('country', country);
    if (search) q = q.or(`name.ilike.%${search}%,name_ar.ilike.%${search}%`);
    q = q.order('subscription_plan', { ascending: false });
    const sortBy = sort ?? 'rating';
    if (sortBy === 'rating') q = q.order('rating_avg', { ascending: false }).order('rating_count', { ascending: false });
    else if (sortBy === 'newest') q = q.order('created_at', { ascending: false });
    q = q.limit(Number(limit) || 24);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    let centers = rows ?? [];
    if (category) {
      const { data: svcRows } = await supabaseAdmin.from('services').select('center_id').eq('category', category).eq('is_active', true);
      const ids = new Set((svcRows ?? []).map((r: any) => r.center_id));
      centers = centers.filter((c: any) => ids.has(c.id));
    }
    jsonOk(res, { centers });
  } catch (e) { handleError(res, e); }
}
