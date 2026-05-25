import { handleError, jsonOk } from '../_helpers';
import { supabaseAdmin } from '../_supabase';

const CENTER_COLS = 'id, name, name_ar, slug, description, description_ar, city, address, phone, logo_url, cover_url, subscription_plan, country, rating_avg, rating_count, is_verified';

export default async function handler(req: any, res: any) {
  try {
    const { slug } = req.query ?? {};
    if (!slug) return res.status(400).json({ error: 'Missing slug' });
    const { data: center, error } = await supabaseAdmin.from('centers').select(CENTER_COLS).eq('slug', slug).eq('is_active', true).maybeSingle();
    if (error) throw new Error(error.message);
    if (!center) return jsonOk(res, { center: null, services: [], reviews: [] });
    const [{ data: services }, { data: reviews }] = await Promise.all([
      supabaseAdmin.from('services').select('id, name, name_ar, category, description, price, duration_minutes').eq('center_id', center.id).eq('is_active', true).order('price', { ascending: true }),
      supabaseAdmin.from('reviews').select('id, rating, comment, created_at, customer_id').eq('center_id', center.id).order('created_at', { ascending: false }).limit(20),
    ]);
    jsonOk(res, { center, services: services ?? [], reviews: reviews ?? [] });
  } catch (e) { handleError(res, e); }
}
