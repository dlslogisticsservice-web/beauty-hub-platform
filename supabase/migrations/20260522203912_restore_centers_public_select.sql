-- Restore public SELECT on centers.
--
-- Migration 20260522024949 dropped "Active verified centers public" as a
-- security-hardening step, but this broke PostgREST embedded-relation access.
--
-- The customer booking dashboard (dashboard.tsx) queries:
--   supabase.from("bookings").select("..., centers(name, logo_url, slug, country), ...")
--
-- PostgREST resolves centers(...) by running a separate SELECT on the centers table
-- under the calling user's auth context. With no SELECT policy for authenticated
-- customers, PostgreSQL evaluates all policies as false and returns
-- "permission denied for table centers".
--
-- The "Owner manages center" policy (FOR ALL) only covers owners and admins.
-- It does NOT provide SELECT access to customers or anonymous visitors.
--
-- Fix: restore a SELECT-only policy so authenticated users and anon can read
-- active centers. Write operations (INSERT/UPDATE/DELETE) remain protected
-- exclusively by "Owner manages center".

DROP POLICY IF EXISTS "Public centers are viewable" ON public.centers;
CREATE POLICY "Public centers are viewable"
  ON public.centers
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);
