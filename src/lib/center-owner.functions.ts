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

export const getMyCenter = () => get('/api/fn/center-my');

export const getCenterDashboard = () => get('/api/fn/center-dashboard');

export const getCenterBookings = ({ data }: { data?: { status?: string; from?: string; to?: string; search?: string } } = {}) =>
  get('/api/fn/center-bookings', { status: data?.status, from: data?.from, to: data?.to, search: data?.search });

// ── Phase 3: Staff ────────────────────────────────────────────────────────
export const getStaffList = (centerId?: string) =>
  get('/api/fn/staff-list', centerId ? { centerId } : undefined);

export const upsertStaff = ({ data }: { data: Record<string, unknown> }) =>
  post('/api/fn/staff-upsert', data);

export const deleteStaff = ({ data }: { data: { id: string } }) =>
  post('/api/fn/staff-delete', data);

export const blockStaffDate = ({ data }: { data: { staffId: string; date: string; reason?: string; remove?: boolean } }) =>
  post('/api/fn/staff-block-date', data);

// ── Phase 3: Center hours ─────────────────────────────────────────────────
export const getCenterHours = (centerId: string) =>
  get('/api/fn/center-hours-get', { centerId });

export const saveCenterHours = ({ data }: { data: Record<string, unknown> }) =>
  post('/api/fn/center-hours-save', data);

// ── Phase 3: Enhanced booking slots ──────────────────────────────────────
export const getBookingSlotsV2 = ({ data }: { data: { serviceId: string; date: string; staffId?: string } }) =>
  get('/api/fn/booking-slots-v2', { serviceId: data.serviceId, date: data.date, staffId: data.staffId });

export const getBookingStaff = ({ data }: { data: { serviceId: string; date?: string } }) =>
  get('/api/fn/booking-staff', { serviceId: data.serviceId, date: data.date });

// ── Phase 3: Coupons ──────────────────────────────────────────────────────
export const getCouponList = () =>
  get('/api/fn/coupon-list');

export const upsertCoupon = ({ data }: { data: Record<string, unknown> }) =>
  post('/api/fn/coupon-upsert', data);

export const deleteCoupon = ({ data }: { data: { id: string } }) =>
  post('/api/fn/coupon-delete', data);

export const validateCoupon = ({ data }: { data: { code: string; centerId?: string; bookingAmount?: number } }) =>
  post('/api/fn/coupon-validate', data);
