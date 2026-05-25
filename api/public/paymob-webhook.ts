import { createHmac, timingSafeEqual } from 'crypto';
import { createClient } from '@supabase/supabase-js';

function makeAdmin() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
let _admin: ReturnType<typeof makeAdmin> | undefined;
const supabaseAdmin = new Proxy({} as ReturnType<typeof makeAdmin>, {
  get(_, prop, receiver) {
    if (!_admin) _admin = makeAdmin();
    return Reflect.get(_admin, prop, receiver);
  },
});

const HMAC_FIELDS = ['amount_cents','created_at','currency','error_occured','has_parent_transaction','id','integration_id','is_3d_secure','is_auth','is_capture','is_refunded','is_standalone_payment','is_voided','order.id','owner','pending','source_data.pan','source_data.sub_type','source_data.type','success'];

function get(obj: Record<string, unknown>, path: string): string {
  const val = path.split('.').reduce<unknown>((a, k) => (a && typeof a === 'object' ? (a as any)[k] : undefined), obj);
  return val === undefined ? '' : String(val);
}

function verifyHmac(payload: Record<string, unknown>, signature: string): boolean {
  const secret = process.env.PAYMOB_HMAC_SECRET;
  if (!secret || !signature) return false;
  const obj = (payload.obj ?? payload) as Record<string, unknown>;
  const concat = HMAC_FIELDS.map(f => get(obj, f)).join('');
  const expected = createHmac('sha512', secret).update(concat).digest('hex');
  try { return timingSafeEqual(Buffer.from(expected), Buffer.from(signature)); } catch { return false; }
}

export default async function handler(req: any, res: any) {
  try {
    const hmac = req.query?.hmac ?? '';
    const body = req.body ?? {};
    if (!verifyHmac(body, hmac)) return res.status(401).send('Invalid signature');

    const obj = (body.obj ?? body) as any;
    const success = Boolean(obj.success);
    const orderId = Number(obj?.order?.id ?? 0);
    const txId = String(obj.id ?? '');
    if (!orderId) return res.status(200).send('ok');

    const { data: booking } = await supabaseAdmin.from('bookings').select('id').eq('paymob_order_id', orderId).maybeSingle();
    if (booking) {
      await supabaseAdmin.from('bookings').update({ payment_status: success ? 'paid' : 'failed', payment_ref: txId, status: success ? 'confirmed' : 'pending' }).eq('id', booking.id);
    }
    res.status(200).send('ok');
  } catch (e) {
    console.error(e);
    res.status(500).send('error');
  }
}
