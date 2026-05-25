import { createClient } from '@supabase/supabase-js';

function makeAdmin() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

let _admin: ReturnType<typeof makeAdmin> | undefined;
export const supabaseAdmin = new Proxy({} as ReturnType<typeof makeAdmin>, {
  get(_, prop, receiver) {
    if (!_admin) _admin = makeAdmin();
    return Reflect.get(_admin, prop, receiver);
  },
});
