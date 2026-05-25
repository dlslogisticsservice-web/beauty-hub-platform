import { handleError, jsonOk } from '../_helpers';
import { supabaseAdmin } from '../_supabase';

export default async function handler(req: any, res: any) {
  try {
    const { serviceId } = req.query ?? {};
    if (!serviceId) return res.status(400).json({ error: 'Missing serviceId' });
    const { data: service, error } = await supabaseAdmin.from('services').select('id, name, name_ar, category, price, duration_minutes, center_id').eq('id', serviceId).eq('is_active', true).maybeSingle();
    if (error) throw new Error(error.message);
    if (!service) return jsonOk(res, { service: null, center: null });
    const { data: center } = await supabaseAdmin.from('centers').select('id, name, name_ar, slug, logo_url, city, country, commission_rate').eq('id', service.center_id).maybeSingle();
    jsonOk(res, { service, center });
  } catch (e) { handleError(res, e); }
}
