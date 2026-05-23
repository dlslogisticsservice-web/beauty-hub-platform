-- Two targeted fixes:
--
-- 1. set_booking_currency() and refresh_center_rating() were defined without
--    SECURITY DEFINER, so they execute in the caller's security context and
--    depend on the caller having SELECT/UPDATE on centers under RLS.
--    set_booking_currency() silently fails for customers creating bookings
--    (currency stays at the DEFAULT column value instead of being derived from
--    the center's country). refresh_center_rating() silently fails when a
--    customer posts a review (UPDATE blocked by "Owner manages center" policy),
--    so center rating_avg and rating_count never update from customer reviews.
--    Adding SECURITY DEFINER makes both functions run as their definer (postgres)
--    and bypass RLS, which is the correct pattern for trigger functions that
--    must write to restricted tables.
--
-- 2. The "Public centers are viewable" SELECT policy was restored in migration
--    20260522203912, but PostgREST caches its schema at startup and may not
--    have reloaded after that migration was applied. The NOTIFY below tells
--    PostgREST to re-introspect the database immediately, so the restored
--    policy is visible to embedded-relation resolution in dashboard.tsx.

CREATE OR REPLACE FUNCTION public.set_booking_currency()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE c_country text;
BEGIN
  SELECT country INTO c_country FROM public.centers WHERE id = NEW.center_id;
  IF c_country = 'SA' THEN NEW.currency := 'SAR'; ELSE NEW.currency := 'EGP'; END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.set_booking_currency() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.refresh_center_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE c_id uuid;
BEGIN
  c_id := COALESCE(NEW.center_id, OLD.center_id);
  UPDATE public.centers
  SET rating_avg = COALESCE((SELECT AVG(rating)::float FROM public.reviews WHERE center_id = c_id), 0),
      rating_count = (SELECT COUNT(*) FROM public.reviews WHERE center_id = c_id)
  WHERE id = c_id;
  RETURN NULL;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.refresh_center_rating() FROM PUBLIC, anon, authenticated;

-- Force PostgREST to reload its schema cache.
SELECT pg_notify('pgrst', 'reload schema');
