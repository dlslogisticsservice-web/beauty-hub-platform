import { handleError, jsonOk } from '../_helpers';
import { supabaseAdmin } from '../_supabase';

export default async function handler(req: any, res: any) {
  try {
    const { serviceId, date } = req.query ?? {};
    if (!serviceId || !date) return res.status(400).json({ error: 'Missing serviceId or date' });
    const start = new Date(`${date}T00:00:00Z`).toISOString();
    const end = new Date(`${date}T23:59:59Z`).toISOString();
    const { data: rows, error } = await supabaseAdmin.from('bookings').select('scheduled_at').eq('service_id', serviceId).neq('status', 'cancelled').gte('scheduled_at', start).lte('scheduled_at', end);
    if (error) throw new Error(error.message);
    jsonOk(res, { slots: (rows ?? []).map((r: any) => r.scheduled_at) });
  } catch (e) { handleError(res, e); }
}
