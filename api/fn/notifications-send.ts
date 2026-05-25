import { getAuthUserId, handleError, jsonOk } from '../_helpers';
import { supabaseAdmin } from '../_supabase';

const WA_API = 'https://graph.facebook.com/v20.0';

function isConfigured() { return Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN); }

async function isEnabled() {
  const { data } = await supabaseAdmin.from('feature_flags').select('enabled').eq('key', 'whatsapp_notifications').maybeSingle();
  return Boolean(data?.enabled);
}

async function sendTemplate(to: string, template: string, params: string[], lang = 'ar') {
  if (!isConfigured()) return { ok: false, error: 'not_configured' };
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
  const token = process.env.WHATSAPP_ACCESS_TOKEN!;
  const body = { messaging_product: 'whatsapp', to, type: 'template', template: { name: template, language: { code: lang }, components: params.length ? [{ type: 'body', parameters: params.map(p => ({ type: 'text', text: p })) }] : [] } };
  const r = await fetch(`${WA_API}/${phoneId}/messages`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) return { ok: false, error: JSON.stringify(data) };
  return { ok: true, messageId: data?.messages?.[0]?.id };
}

export default async function handler(req: any, res: any) {
  try {
    const userId = await getAuthUserId(req.headers.authorization);
    const { bookingId, template } = req.body ?? {};
    if (!bookingId || !template) return res.status(400).json({ error: 'Missing bookingId or template' });

    const { data: booking } = await supabaseAdmin.from('bookings').select('id, customer_id, center_id, scheduled_at, service_id').eq('id', bookingId).maybeSingle();
    if (!booking) return jsonOk(res, { ok: false, error: 'booking_not_found' });

    const [{ data: roleRows }, { data: center }] = await Promise.all([
      supabaseAdmin.from('user_roles').select('role').eq('user_id', userId),
      supabaseAdmin.from('centers').select('owner_id').eq('id', booking.center_id).maybeSingle(),
    ]);
    const roles = (roleRows ?? []).map((r: any) => r.role);
    const isAdmin = roles.includes('admin') || roles.includes('super_admin');
    const isOwner = (center as any)?.owner_id === userId;
    const isCustomer = booking.customer_id === userId;
    if (!isAdmin && !isOwner && !isCustomer) return jsonOk(res, { ok: false, error: 'forbidden' });

    const { data: profile } = await supabaseAdmin.from('profiles').select('full_name, phone, whatsapp_opt_in').eq('id', booking.customer_id).maybeSingle();
    if (!(profile as any)?.phone || (profile as any)?.whatsapp_opt_in === false) {
      await supabaseAdmin.from('notifications_log').insert({ user_id: booking.customer_id, booking_id: booking.id, channel: 'whatsapp', template, recipient: (profile as any)?.phone ?? null, status: 'skipped', error: !(profile as any)?.phone ? 'no_phone' : 'opted_out' });
      return jsonOk(res, { ok: false, error: 'skipped' });
    }

    const enabled = await isEnabled();
    if (!enabled || !isConfigured()) {
      await supabaseAdmin.from('notifications_log').insert({ user_id: booking.customer_id, booking_id: booking.id, channel: 'whatsapp', template, recipient: (profile as any).phone, status: 'disabled' });
      return jsonOk(res, { ok: true, queued: false });
    }

    const { data: centerInfo } = await supabaseAdmin.from('centers').select('name, name_ar').eq('id', booking.center_id).maybeSingle();
    const when = new Date(booking.scheduled_at).toLocaleString('ar-EG');
    const centerName = (centerInfo as any)?.name_ar || (centerInfo as any)?.name || '';
    const result = await sendTemplate((profile as any).phone, template, [(profile as any).full_name || '', centerName, when]);
    await supabaseAdmin.from('notifications_log').insert({ user_id: booking.customer_id, booking_id: booking.id, channel: 'whatsapp', template, recipient: (profile as any).phone, status: result.ok ? 'sent' : 'failed', error: result.error, payload: { messageId: result.messageId } });
    jsonOk(res, { ok: result.ok });
  } catch (e) { handleError(res, e); }
}
