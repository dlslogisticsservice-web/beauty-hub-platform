
CREATE OR REPLACE FUNCTION public.enforce_booking_commission_rate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  center_rate numeric;
BEGIN
  SELECT commission_rate INTO center_rate
  FROM public.centers
  WHERE id = NEW.center_id;

  IF center_rate IS NULL THEN
    RAISE EXCEPTION 'Invalid center for booking';
  END IF;

  NEW.commission_rate := center_rate;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_booking_commission_rate() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS enforce_booking_commission_rate_trg ON public.bookings;
CREATE TRIGGER enforce_booking_commission_rate_trg
BEFORE INSERT OR UPDATE OF commission_rate, center_id ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.enforce_booking_commission_rate();
