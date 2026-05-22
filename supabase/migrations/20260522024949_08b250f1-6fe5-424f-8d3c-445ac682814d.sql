
-- 1. CENTERS: remove broad public read; keep owner/admin access via existing policy.
DROP POLICY IF EXISTS "Active verified centers public" ON public.centers;

-- 2. COMMISSION_TIERS: remove public read; admin policy already exists.
DROP POLICY IF EXISTS "Tiers public read" ON public.commission_tiers;

-- 3. USER_ROLES: restrict role management to super_admin only, and prevent self-modification.
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;

CREATE POLICY "Super admins manage roles - insert"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    AND user_id <> auth.uid()
  );

CREATE POLICY "Super admins manage roles - update"
  ON public.user_roles FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    AND user_id <> auth.uid()
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    AND user_id <> auth.uid()
  );

CREATE POLICY "Super admins manage roles - delete"
  ON public.user_roles FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    AND user_id <> auth.uid()
  );

-- 4. REVIEWS: hide customer_id from anon/authenticated reads; public listing keeps other columns.
REVOKE SELECT (customer_id) ON public.reviews FROM anon, authenticated;

-- 5. STORAGE: drop the broad listing policy on the public bucket. Public URLs still serve files.
DROP POLICY IF EXISTS "Center assets are publicly readable" ON storage.objects;

-- 6. SECURITY DEFINER functions: revoke EXECUTE from public roles for internal triggers.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.calc_booking_commission() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refresh_center_rating() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_booking_currency() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_booking_status_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_center_change() FROM PUBLIC, anon, authenticated;
-- has_role(uuid, app_role) intentionally remains executable; RLS policies depend on it.
