-- Root-cause fix for "permission denied for table centers".
--
-- The "Customer views own bookings" RLS policy on public.bookings contains:
--
--   USING (
--     customer_id = auth.uid()
--     OR public.has_role(auth.uid(), 'admin')
--     OR EXISTS (SELECT 1 FROM public.centers c
--                WHERE c.id = bookings.center_id AND c.owner_id = auth.uid())
--   )
--
-- PostgreSQL evaluates this USING clause on every SELECT against bookings,
-- including a completely flat select with no embedded relations at all.
-- The EXISTS subquery requires table-level SELECT privilege on centers.
--
-- In "secure by default" Supabase projects (sb_publishable_ key format),
-- anon/authenticated are NOT granted SELECT on tables automatically.
-- No migration in this project ever ran GRANT SELECT ON public.centers.
-- Result: the EXISTS fires, PostgreSQL checks privilege, finds none, and
-- raises "permission denied for table centers" — on every bookings query,
-- regardless of whether centers(...) appears in the select list.
--
-- The "Public centers are viewable" RLS policy controls WHICH rows are
-- visible (is_active = true). The GRANT below controls WHETHER the role
-- may attempt the SELECT at all. Both are required.
--
-- The services "Owner manages service" WITH CHECK also contains
-- EXISTS (SELECT 1 FROM public.centers c WHERE ...) — same issue, same fix.

GRANT SELECT ON public.centers TO anon, authenticated;
GRANT SELECT ON public.services TO anon, authenticated;

-- Reload PostgREST schema cache so the new grants take effect immediately
-- for embedded-relation resolution in dashboard.tsx and elsewhere.
SELECT pg_notify('pgrst', 'reload schema');
