-- ═══════════════════════════════════════════════════════════════════════════
-- Phase 3 — Staff management, center hours, coupons, review moderation
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. STAFF ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.staff (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id    uuid        NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
  name         text        NOT NULL,
  name_ar      text,
  title        text,          -- "Laser Specialist", "Dr.", "Therapist"
  title_ar     text,
  bio          text,
  bio_ar       text,
  avatar_url   text,
  is_active    boolean     NOT NULL DEFAULT true,
  sort_order   integer     NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_staff_center ON public.staff(center_id);

-- Public can see active staff of active centers
CREATE POLICY "Staff public read"
  ON public.staff FOR SELECT
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.centers c
      WHERE c.id = center_id AND c.is_active = true
    )
  );

-- Center owner manages their own staff
CREATE POLICY "Center owner manages staff"
  ON public.staff FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.centers c
      WHERE c.id = center_id AND c.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.centers c
      WHERE c.id = center_id AND c.owner_id = auth.uid()
    )
  );

-- Admins can read all
CREATE POLICY "Admins read all staff"
  ON public.staff FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );


-- ── 2. STAFF WEEKLY SCHEDULES ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.staff_schedules (
  id           uuid       PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id     uuid       NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  day_of_week  smallint   NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  -- 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday
  start_time   time       NOT NULL DEFAULT '09:00',
  end_time     time       NOT NULL DEFAULT '18:00',
  UNIQUE(staff_id, day_of_week)
);

ALTER TABLE public.staff_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff schedules public read"
  ON public.staff_schedules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.staff s
      JOIN public.centers c ON c.id = s.center_id
      WHERE s.id = staff_id AND s.is_active = true AND c.is_active = true
    )
  );

CREATE POLICY "Center owner manages staff schedules"
  ON public.staff_schedules FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff s
      JOIN public.centers c ON c.id = s.center_id
      WHERE s.id = staff_id AND c.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff s
      JOIN public.centers c ON c.id = s.center_id
      WHERE s.id = staff_id AND c.owner_id = auth.uid()
    )
  );


-- ── 3. STAFF BLOCKED DATES (vacations, sick days) ──────────────────────────

CREATE TABLE IF NOT EXISTS public.staff_blocked_dates (
  id           uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id     uuid    NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  blocked_date date    NOT NULL,
  reason       text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(staff_id, blocked_date)
);

ALTER TABLE public.staff_blocked_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff blocked dates — center owner"
  ON public.staff_blocked_dates FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff s
      JOIN public.centers c ON c.id = s.center_id
      WHERE s.id = staff_id AND c.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff s
      JOIN public.centers c ON c.id = s.center_id
      WHERE s.id = staff_id AND c.owner_id = auth.uid()
    )
  );

-- Authenticated users can read to check availability
CREATE POLICY "Staff blocked dates — read for booking"
  ON public.staff_blocked_dates FOR SELECT TO authenticated
  USING (true);


-- ── 4. SERVICE ↔ STAFF (many-to-many assignment) ───────────────────────────

CREATE TABLE IF NOT EXISTS public.service_staff (
  service_id  uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  staff_id    uuid NOT NULL REFERENCES public.staff(id)   ON DELETE CASCADE,
  PRIMARY KEY (service_id, staff_id)
);

ALTER TABLE public.service_staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service-staff public read"
  ON public.service_staff FOR SELECT
  USING (true);

CREATE POLICY "Center owner manages service-staff"
  ON public.service_staff FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff s
      JOIN public.centers c ON c.id = s.center_id
      WHERE s.id = staff_id AND c.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff s
      JOIN public.centers c ON c.id = s.center_id
      WHERE s.id = staff_id AND c.owner_id = auth.uid()
    )
  );


-- ── 5. CENTER WORKING HOURS ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.center_hours (
  id           uuid     PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id    uuid     NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
  day_of_week  smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  is_open      boolean  NOT NULL DEFAULT true,
  open_time    time     NOT NULL DEFAULT '09:00',
  close_time   time     NOT NULL DEFAULT '21:00',
  UNIQUE(center_id, day_of_week)
);

ALTER TABLE public.center_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Center hours public read"
  ON public.center_hours FOR SELECT
  USING (true);

CREATE POLICY "Center owner manages hours"
  ON public.center_hours FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.centers c
      WHERE c.id = center_id AND c.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.centers c
      WHERE c.id = center_id AND c.owner_id = auth.uid()
    )
  );


-- ── 6. CENTER BLOCKED DATES (holidays, renovations) ─────────────────────────

CREATE TABLE IF NOT EXISTS public.center_blocked_dates (
  id           uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id    uuid    NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
  blocked_date date    NOT NULL,
  reason       text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(center_id, blocked_date)
);

ALTER TABLE public.center_blocked_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Center blocked dates public read"
  ON public.center_blocked_dates FOR SELECT
  USING (true);

CREATE POLICY "Center owner manages blocked dates"
  ON public.center_blocked_dates FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.centers c
      WHERE c.id = center_id AND c.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.centers c
      WHERE c.id = center_id AND c.owner_id = auth.uid()
    )
  );


-- ── 7. BOOKINGS: add staff_id + coupon columns ──────────────────────────────

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS staff_id       uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS coupon_id      uuid,
  ADD COLUMN IF NOT EXISTS original_price double precision;

CREATE INDEX IF NOT EXISTS idx_bookings_staff ON public.bookings(staff_id);


-- ── 8. REVIEWS: moderation columns ──────────────────────────────────────────

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS is_visible      boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS moderation_note text;

-- Update the rating refresh trigger to only count visible reviews
CREATE OR REPLACE FUNCTION public.refresh_center_rating()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE c_id uuid;
BEGIN
  c_id := COALESCE(NEW.center_id, OLD.center_id);
  UPDATE public.centers
  SET rating_avg   = COALESCE((
        SELECT AVG(rating)::float
        FROM public.reviews
        WHERE center_id = c_id AND is_visible = true
      ), 0),
      rating_count = (
        SELECT COUNT(*) FROM public.reviews
        WHERE center_id = c_id AND is_visible = true
      )
  WHERE id = c_id;
  RETURN NULL;
END;
$$;


-- ── 9. COUPONS ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.coupons (
  id                  uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id           uuid    REFERENCES public.centers(id) ON DELETE CASCADE,
  -- null = platform-wide coupon (admin-created)
  code                text    NOT NULL,
  description         text,
  discount_type       text    NOT NULL DEFAULT 'percent'
    CHECK (discount_type IN ('percent', 'fixed')),
  discount_value      double precision NOT NULL CHECK (discount_value > 0),
  min_booking_amount  double precision NOT NULL DEFAULT 0,
  max_uses            integer,   -- NULL = unlimited
  uses_count          integer    NOT NULL DEFAULT 0,
  valid_from          timestamptz NOT NULL DEFAULT now(),
  valid_until         timestamptz,
  is_active           boolean    NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE(code, center_id)          -- same code can exist for different centers
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Authenticated users can SELECT to validate
CREATE POLICY "Coupons readable for validation"
  ON public.coupons FOR SELECT TO authenticated
  USING (is_active = true);

-- Center owners manage their own coupons
CREATE POLICY "Center owner manages coupons"
  ON public.coupons FOR ALL TO authenticated
  USING (
    center_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.centers c
      WHERE c.id = center_id AND c.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    center_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.centers c
      WHERE c.id = center_id AND c.owner_id = auth.uid()
    )
  );

-- Admins manage all coupons
CREATE POLICY "Admins manage all coupons"
  ON public.coupons FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );


-- ── 10. COUPON USES ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.coupon_uses (
  id                uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id         uuid    NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  booking_id        uuid    NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  customer_id       uuid    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  discount_applied  double precision NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE(coupon_id, booking_id)
);

ALTER TABLE public.coupon_uses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers see own coupon uses"
  ON public.coupon_uses FOR SELECT TO authenticated
  USING (customer_id = auth.uid());

CREATE POLICY "Admins see all coupon uses"
  ON public.coupon_uses FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

-- System can insert (via service role in API)
CREATE POLICY "Service role inserts coupon uses"
  ON public.coupon_uses FOR INSERT TO authenticated
  WITH CHECK (customer_id = auth.uid());


-- ── 11. INDEXES ─────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_center_hours_center   ON public.center_hours(center_id);
CREATE INDEX IF NOT EXISTS idx_center_blocked_center ON public.center_blocked_dates(center_id);
CREATE INDEX IF NOT EXISTS idx_staff_blocked_staff   ON public.staff_blocked_dates(staff_id);
CREATE INDEX IF NOT EXISTS idx_coupons_code          ON public.coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_center        ON public.coupons(center_id);
CREATE INDEX IF NOT EXISTS idx_coupon_uses_coupon    ON public.coupon_uses(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_uses_customer  ON public.coupon_uses(customer_id);
