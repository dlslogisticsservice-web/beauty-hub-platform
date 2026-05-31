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

export const getAdminDashboard = () => get('/api/fn/admin-dashboard');

export const getAdminCenters = () => get('/api/fn/admin-centers');

export const updateCenterAdmin = ({ data }: { data: { id: string; is_verified?: boolean; is_active?: boolean; commission_rate?: number; subscription_plan?: string; subscription_expires_at?: string | null } }) =>
  post('/api/fn/admin-update-center', data);

export const getAdminBookings = ({ data }: { data?: { status?: string; centerId?: string } } = {}) =>
  get('/api/fn/admin-bookings', { status: data?.status, centerId: data?.centerId });

export const getAdminSubscriptions = () => get('/api/fn/admin-subscriptions');

// ── Phase 3: Reviews ──────────────────────────────────────────────────────
export const getAdminReviews = ({ data }: { data?: { centerId?: string; visible?: string } } = {}) =>
  get('/api/fn/admin-reviews', { centerId: data?.centerId, visible: data?.visible });

export const moderateReview = ({ data }: { data: { id: string; is_visible: boolean; moderation_note?: string } }) =>
  post('/api/fn/admin-review-moderate', data);
