import { supabase } from '@/integrations/supabase/client';

async function authHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
}

async function get(path: string, params?: Record<string, string | undefined>) {
  const headers = await authHeaders();
  const qs = params ? new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v != null) as [string, string][])).toString() : '';
  const url = qs ? `${path}?${qs}` : path;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
  return res.json();
}

async function post(path: string, data: unknown) {
  const headers = await authHeaders();
  const res = await fetch(path, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
  return res.json();
}

export const isPaymobConfiguredFn = () => get('/api/fn/paymob-configured');

export const initiatePaymobPaymentFn = ({ data }: { data: { bookingId: string; paymentMethod: 'card' | 'wallet' } }) =>
  post('/api/fn/paymob-initiate', data);
