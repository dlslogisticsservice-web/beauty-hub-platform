-- ═══════════════════════════════════════════════════════════════════════════
-- Phase 3 Stabilization — 2026-05-31
-- Fixes: C2 (coupon enforcement), C4 (duplicate trigger),
--        H4 (reviews RLS), missing indexes, coupon_id FK
-- ═══════════════════════════════════════════════════════════════════════════

-- ── C4: Remove duplicate review rating trigger ───────────────────────────────
-- The initial migration created `review_rating_trg`.
-- A later migration created `trg_refresh_center_rating`.
-- Both call refresh_center_rating() causing a double-write on every review
-- change. Drop the old one; keep the newer trg_refresh_center_rating.
DROP TRIGGER IF EXISTS review_rating_trg ON public.reviews;


-- ── H4: Fix reviews RLS — hidden reviews must not be publicly readable ────────
-- Old policy: USING (true) — exposes is_visible=false rows to everyone.
DROP POLICY IF EXISTS "Reviews public" ON public.reviews;

-- Anon (unauthenticated): only visible reviews
CREATE POLICY "Reviews anon visible"
  ON public.reviews FOR SELECT TO anon
  USING (is_visible = true);

-- Authenticated: visible reviews OR their own (even if hidden)
-- This preserves the dashboard "reviews(id)" join so customers can see
-- that they already submitted a review for a booking.
CREATE POLICY "Reviews authenticated"
  ON public.reviews FOR SELECT TO authenticated
  USING (
    is_visible = true
    OR customer_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );


-- ── C2: Add FK constraint for bookings.coupon_id ──────────────────────────────
-- Phase 3 migration added the column without a FK; add it now safely.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_bookings_coupon'
      AND table_name = 'bookings'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT fk_bookings_coupon
      FOREIGN KEY (coupon_id) REFERENCES public.coupons(id) ON DELETE SET NULL;
  END IF;
END$$;


-- ── C2: Enforce coupon max_uses at DB level (prevents race conditions) ────────
CREATE OR REPLACE FUNCTION public.enforce_coupon_max_uses()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_max_uses  integer;
  v_uses_count integer;
BEGIN
  IF NEW.coupon_id IS NULL THEN RETURN NEW; END IF;

  SELECT max_uses, uses_count
    INTO v_max_uses, v_uses_count
    FROM public.coupons
   WHERE id = NEW.coupon_id
   FOR UPDATE;  -- row-level lock prevents concurrent over-redemption

  IF NOT FOUND THEN RETURN NEW; END IF;

  IF v_max_uses IS NOT NULL AND v_uses_count >= v_max_uses THEN
    RAISE EXCEPTION 'Coupon has reached its maximum number of uses';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_coupon_max_uses ON public.bookings;
CREATE TRIGGER trg_enforce_coupon_max_uses
  BEFORE INSERT ON public.bookings
  FOR EACH ROW
  WHEN (NEW.coupon_id IS NOT NULL)
  EXECUTE FUNCTION public.enforce_coupon_max_uses();


-- ── C2: Record coupon use and increment counter after booking insert ───────────
CREATE OR REPLACE FUNCTION public.record_coupon_use()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_discount double precision;
BEGIN
  IF NEW.coupon_id IS NULL THEN RETURN NEW; END IF;

  -- discount = original_price - price_paid (0 if columns null)
  v_discount := COALESCE(NEW.original_price, NEW.price_paid) - COALESCE(NEW.price_paid, 0);
  IF v_discount < 0 THEN v_discount := 0; END IF;

  INSERT INTO public.coupon_uses (coupon_id, booking_id, customer_id, discount_applied)
  VALUES (NEW.coupon_id, NEW.id, NEW.customer_id, v_discount)
  ON CONFLICT (coupon_id, booking_id) DO NOTHING;

  UPDATE public.coupons
     SET uses_count = uses_count + 1
   WHERE id = NEW.coupon_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_record_coupon_use ON public.bookings;
CREATE TRIGGER trg_record_coupon_use
  AFTER INSERT ON public.bookings
  FOR EACH ROW
  WHEN (NEW.coupon_id IS NOT NULL)
  EXECUTE FUNCTION public.record_coupon_use();


-- ── Missing indexes (performance) ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_bookings_service    ON public.bookings(service_id);
CREATE INDEX IF NOT EXISTS idx_bookings_scheduled  ON public.bookings(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_reviews_visible     ON public.reviews(is_visible);
CREATE INDEX IF NOT EXISTS idx_centers_country     ON public.centers(country);
CREATE INDEX IF NOT EXISTS idx_centers_plan        ON public.centers(subscription_plan);
